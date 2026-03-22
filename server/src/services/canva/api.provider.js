const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const logger = require('../../utils/logger');
const canvaConfig = require('../../config/canva');
const { db } = require('../../config/database');
const imageService = require('../image.service');

const TEMP_DIR = path.join(__dirname, '../../../temp');
const POLL_INTERVAL_MS = 2000;
const POLL_MAX_ATTEMPTS = 30;

class ApiProvider {
  constructor() {
    this.baseUrl = canvaConfig.api.baseUrl;
    this.clientId = canvaConfig.oauth.clientId;
    this.clientSecret = canvaConfig.oauth.clientSecret;
    this.accessToken = null;
    this.refreshTokenValue = null;
  }

  get name() {
    return 'api';
  }

  isAvailable() {
    return Boolean(this.clientId && (this.accessToken || this.refreshTokenValue));
  }

  async personalize(templateId, nameOnDesign, eventType) {
    await this._ensureToken();

    const template = await db('templates').where({ id: templateId }).first();
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    const brandTemplateId = template.canva_brand_template_id;
    if (!brandTemplateId) {
      throw new Error(`Template ${templateId} has no canva_brand_template_id`);
    }

    // Step 1: Create autofill job
    const autofillResult = await this._request('POST', '/autofills', {
      brand_template_id: brandTemplateId,
      data: {
        NAME: { type: 'text', text: nameOnDesign },
      },
    });

    const jobId = autofillResult.job.id;
    logger.info(`Canva API autofill job created: ${jobId} for "${nameOnDesign}"`);

    // Step 2: Poll autofill job until complete
    const autofillJob = await this._pollJob(
      `/autofills/${jobId}`,
      (result) => result.job.status
    );

    const newDesignId = autofillJob.job.result.design.id;
    logger.info(`Canva API autofill complete, design: ${newDesignId}`);

    // Step 3: Export design as PNG
    const exportResult = await this._request('POST', `/designs/${newDesignId}/exports`, {
      type: template.export_format || 'png',
    });

    const exportId = exportResult.job.id;
    logger.info(`Canva API export job created: ${exportId}`);

    // Step 4: Poll export job until ready
    const exportJob = await this._pollJob(
      `/exports/${exportId}`,
      (result) => result.job.status
    );

    const downloadUrl = exportJob.job.result.urls[0];

    // Step 5: Download and optimize image
    fs.mkdirSync(TEMP_DIR, { recursive: true });
    const rawPath = path.join(TEMP_DIR, `canva_${templateId}_${Date.now()}_raw.png`);
    const optimizedPath = path.join(TEMP_DIR, `canva_${templateId}_${Date.now()}.webp`);

    await this._downloadFile(downloadUrl, rawPath);
    await imageService.optimize(rawPath, optimizedPath);
    fs.unlinkSync(rawPath);

    // Update usage stats
    await db('templates').where({ id: templateId }).update({
      usage_count: db.raw('usage_count + 1'),
      last_used: new Date(),
    });

    logger.info(`Canva API personalization complete: ${optimizedPath}`);
    return { imagePath: optimizedPath, source: 'api' };
  }

  async listTemplates() {
    await this._ensureToken();
    const result = await this._request('GET', '/brand-templates');
    return result.items || [];
  }

  async previewTemplate(templateId, sampleName) {
    return this.personalize(templateId, sampleName, null);
  }

  async refreshToken() {
    if (!this.refreshTokenValue) {
      const settings = await db('settings').where({ key_: 'canva_oauth' }).first();
      if (settings) {
        const data = typeof settings.data === 'string' ? JSON.parse(settings.data) : settings.data;
        this.refreshTokenValue = data.refresh_token;
        this.accessToken = data.access_token;
      }
    }

    if (!this.refreshTokenValue) {
      throw new Error('No refresh token available — complete OAuth flow first');
    }

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: this.refreshTokenValue,
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });

    const response = await this._rawRequest('POST', '/oauth/token', params.toString(), {
      'Content-Type': 'application/x-www-form-urlencoded',
    });

    this.accessToken = response.access_token;
    this.refreshTokenValue = response.refresh_token || this.refreshTokenValue;

    // Persist tokens
    const tokenData = JSON.stringify({
      access_token: this.accessToken,
      refresh_token: this.refreshTokenValue,
      updated_at: new Date().toISOString(),
    });

    const existing = await db('settings').where({ key_: 'canva_oauth' }).first();
    if (existing) {
      await db('settings').where({ key_: 'canva_oauth' }).update({ data: tokenData });
    } else {
      await db('settings').insert({ key_: 'canva_oauth', data: tokenData });
    }

    logger.info('Canva OAuth token refreshed');
  }

  async _ensureToken() {
    if (this.accessToken) return;

    const settings = await db('settings').where({ key_: 'canva_oauth' }).first();
    if (settings) {
      const data = typeof settings.data === 'string' ? JSON.parse(settings.data) : settings.data;
      this.accessToken = data.access_token;
      this.refreshTokenValue = data.refresh_token;
    }

    if (!this.accessToken && this.refreshTokenValue) {
      await this.refreshToken();
    }

    if (!this.accessToken) {
      throw new Error('No Canva access token — complete OAuth flow first');
    }
  }

  async _request(method, urlPath, body) {
    return this._rawRequest(method, urlPath, body ? JSON.stringify(body) : null, {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.accessToken}`,
    });
  }

  _rawRequest(method, urlPath, bodyStr, headers) {
    return new Promise((resolve, reject) => {
      const url = new URL(urlPath, this.baseUrl);
      const transport = url.protocol === 'https:' ? https : http;

      const options = {
        method,
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        headers: headers || {},
      };

      const req = transport.request(options, (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString();
          if (res.statusCode === 401) {
            reject(new Error('Canva API: Unauthorized — token may be expired'));
            return;
          }
          if (res.statusCode >= 400) {
            reject(new Error(`Canva API ${res.statusCode}: ${raw}`));
            return;
          }
          try {
            resolve(JSON.parse(raw));
          } catch {
            resolve(raw);
          }
        });
      });

      req.on('error', reject);
      if (bodyStr) req.write(bodyStr);
      req.end();
    });
  }

  async _pollJob(urlPath, statusExtractor) {
    for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt++) {
      const result = await this._request('GET', urlPath);
      const status = statusExtractor(result);

      if (status === 'success') return result;
      if (status === 'failed') {
        throw new Error(`Canva job failed: ${JSON.stringify(result)}`);
      }

      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }
    throw new Error(`Canva job timed out after ${POLL_MAX_ATTEMPTS * POLL_INTERVAL_MS}ms`);
  }

  _downloadFile(url, destPath) {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);
      const transport = parsedUrl.protocol === 'https:' ? https : http;
      const file = fs.createWriteStream(destPath);

      transport.get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          file.close();
          fs.unlinkSync(destPath);
          return this._downloadFile(res.headers.location, destPath).then(resolve, reject);
        }
        res.pipe(file);
        file.on('finish', () => {
          file.close(resolve);
        });
      }).on('error', (err) => {
        fs.unlink(destPath, () => {});
        reject(err);
      });
    });
  }

  getStatus() {
    return {
      name: this.name,
      available: this.isAvailable(),
      hasClientId: Boolean(this.clientId),
      hasAccessToken: Boolean(this.accessToken),
      hasRefreshToken: Boolean(this.refreshTokenValue),
    };
  }
}

module.exports = ApiProvider;
