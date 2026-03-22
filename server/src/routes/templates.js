const express = require('express');
const Joi = require('joi');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');
const { db } = require('../config/database');
const logger = require('../utils/logger');

const crypto = require('crypto');

// PKCE store — shared between /canva/auth and /canva/auth/callback
const _pkceStore = {};

const UPLOADS_DIR = path.join(__dirname, '../../uploads/templates');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
    filename: (_req, file, cb) => {
      const uniqueName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      cb(null, uniqueName);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(png|jpg|jpeg|webp)$/i;
    if (allowed.test(path.extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error('Only PNG, JPG, and WebP images are allowed'));
    }
  },
});

const router = express.Router();

// Canva OAuth callback — BEFORE auth middleware (Canva redirects without JWT)
router.get('/canva/auth/callback', async (req, res) => {
  const { code, error, state } = req.query;

  if (error) {
    logger.error(`Canva OAuth error: ${error}`);
    return res.redirect('http://localhost:3000/settings?canva=error');
  }

  if (!code) {
    return res.redirect('http://localhost:3000/settings?canva=no_code');
  }

  const codeVerifier = state ? _pkceStore[state] : undefined;
  if (state) delete _pkceStore[state];

  try {
    const canvaConfig = require('../config/canva');
    const httpsModule = require('https');

    const tokenParams = {
      grant_type: 'authorization_code',
      code,
      redirect_uri: canvaConfig.oauth.redirectUri,
      client_id: canvaConfig.oauth.clientId,
      client_secret: canvaConfig.oauth.clientSecret,
    };
    if (codeVerifier) {
      tokenParams.code_verifier = codeVerifier;
    }
    const params = new URLSearchParams(tokenParams);

    const tokenData = await new Promise((resolve, reject) => {
      const postReq = httpsModule.request('https://api.canva.com/rest/v1/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(params.toString()),
        },
      }, (tokenRes) => {
        let body = '';
        tokenRes.on('data', (chunk) => { body += chunk; });
        tokenRes.on('end', () => {
          try { resolve(JSON.parse(body)); }
          catch { reject(new Error('Invalid token response')); }
        });
      });
      postReq.on('error', reject);
      postReq.write(params.toString());
      postReq.end();
    });

    if (tokenData.error) {
      logger.error(`Canva token error: ${tokenData.error} — ${tokenData.error_description || ''}`);
      return res.redirect('http://localhost:3000/settings?canva=token_error');
    }

    const data = JSON.stringify({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_in: tokenData.expires_in,
      updated_at: new Date().toISOString(),
    });

    const existing = await db('settings').where({ key_: 'canva_oauth' }).first();
    if (existing) {
      await db('settings').where({ key_: 'canva_oauth' }).update({ data });
    } else {
      await db('settings').insert({ key_: 'canva_oauth', data });
    }

    const canvaAdapter = req.app.get('canvaAdapter');
    if (canvaAdapter) {
      const apiProvider = canvaAdapter.providers.find((p) => p.name === 'api');
      if (apiProvider) {
        apiProvider.accessToken = tokenData.access_token;
        apiProvider.refreshTokenValue = tokenData.refresh_token;
      }
    }

    logger.info('Canva OAuth connected successfully');
    res.redirect('http://localhost:3000/settings?canva=success');
  } catch (err) {
    logger.error(`Canva OAuth callback failed: ${err.message}`);
    res.redirect('http://localhost:3000/settings?canva=error');
  }
});

router.use(authenticate);

// --- Validation Schemas ---

const createTemplateSchema = Joi.object({
  name: Joi.string().required(),
  eventType: Joi.string().required(),
  canvaDesignId: Joi.string().allow('').optional(),
  canvaBrandTemplateId: Joi.string().allow('').optional(),
  placeholderField: Joi.string().optional(),
  previewUrl: Joi.string().uri().allow('').optional(),
  exportFormat: Joi.string().valid('png', 'jpg').optional(),
  exportWidth: Joi.number().integer().positive().optional(),
  exportHeight: Joi.number().integer().positive().optional(),
  localFallbackPath: Joi.string().allow('').optional(),
  fontFamily: Joi.string().optional(),
  fontSize: Joi.number().integer().positive().optional(),
  fontColor: Joi.string().optional(),
  nameX: Joi.number().integer().optional(),
  nameY: Joi.number().integer().optional(),
  active: Joi.boolean().optional(),
});

const updateTemplateSchema = createTemplateSchema.fork(
  ['name', 'eventType'],
  (field) => field.optional()
);

// --- Helpers ---

function mapTemplateBody(body) {
  const mapped = {};
  if (body.name !== undefined) mapped.name = body.name;
  if (body.eventType !== undefined) mapped.event_type = body.eventType;
  if (body.canvaDesignId !== undefined) mapped.canva_design_id = body.canvaDesignId;
  if (body.canvaBrandTemplateId !== undefined) mapped.canva_brand_template_id = body.canvaBrandTemplateId;
  if (body.placeholderField !== undefined) mapped.placeholder_field = body.placeholderField;
  if (body.previewUrl !== undefined) mapped.preview_url = body.previewUrl;
  if (body.exportFormat !== undefined) mapped.export_format = body.exportFormat;
  if (body.exportWidth !== undefined) mapped.export_width = body.exportWidth;
  if (body.exportHeight !== undefined) mapped.export_height = body.exportHeight;
  if (body.localFallbackPath !== undefined) mapped.local_fallback_path = body.localFallbackPath;
  if (body.fontFamily !== undefined) mapped.font_family = body.fontFamily;
  if (body.fontSize !== undefined) mapped.font_size = body.fontSize;
  if (body.fontColor !== undefined) mapped.font_color = body.fontColor;
  if (body.nameX !== undefined) mapped.name_x = body.nameX;
  if (body.nameY !== undefined) mapped.name_y = body.nameY;
  if (body.active !== undefined) mapped.active = body.active;
  return mapped;
}

function formatTemplate(row) {
  if (!row) return row;
  return {
    id: row.id,
    name: row.name,
    eventType: row.event_type,
    canvaDesignId: row.canva_design_id,
    canvaBrandTemplateId: row.canva_brand_template_id,
    placeholderField: row.placeholder_field,
    previewUrl: row.preview_url,
    exportFormat: row.export_format,
    exportWidth: row.export_width,
    exportHeight: row.export_height,
    localFallbackPath: row.local_fallback_path,
    fontFamily: row.font_family,
    fontSize: row.font_size,
    fontColor: row.font_color,
    nameX: row.name_x,
    nameY: row.name_y,
    active: row.active,
    usageCount: row.usage_count,
    lastUsed: row.last_used,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// --- Routes ---

// GET /canva/auth — Start Canva OAuth flow with PKCE
router.get('/canva/auth', (req, res) => {
  const canvaConfig = require('../config/canva');
  if (!canvaConfig.oauth.clientId) {
    return res.status(400).json({ error: 'CANVA_CLIENT_ID not configured' });
  }

  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  const state = crypto.randomBytes(16).toString('hex');
  _pkceStore[state] = verifier;

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: canvaConfig.oauth.clientId,
    redirect_uri: canvaConfig.oauth.redirectUri,
    scope: canvaConfig.oauth.scopes.join(' '),
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state,
  });

  const authUrl = `https://www.canva.com/api/oauth/authorize?${params.toString()}`;
  res.json({ authUrl });
});

// GET /canva/status — Canva adapter provider status (must be before /:id routes)
router.get('/canva/status', (req, res) => {
  const canvaAdapter = req.app.get('canvaAdapter');
  if (!canvaAdapter) {
    return res.status(503).json({ error: 'Canva adapter not initialized' });
  }
  res.json({ providers: canvaAdapter.getStatus() });
});

// POST /upload — upload a local fallback base image for a template (must be before /:id routes)
router.post('/upload', upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const templateId = req.body.templateId ? Number(req.body.templateId) : null;
    const filePath = req.file.path;

    if (templateId) {
      const template = await db('templates').where({ id: templateId }).first();
      if (!template) {
        fs.unlinkSync(filePath);
        return res.status(404).json({ error: 'Template not found' });
      }

      await db('templates').where({ id: templateId }).update({
        local_fallback_path: filePath,
        updated_at: new Date(),
      });

      const updated = await db('templates').where({ id: templateId }).first();
      logger.info(`Uploaded fallback image for template ${templateId}: ${filePath}`);
      return res.json({ template: formatTemplate(updated), filePath });
    }

    logger.info(`Uploaded template image: ${filePath}`);
    res.json({ filePath });
  } catch (err) {
    next(err);
  }
});

// GET / — list templates with optional filters
router.get('/', async (req, res, next) => {
  try {
    let query = db('templates');
    if (req.query.eventType) query = query.where({ event_type: req.query.eventType });
    if (req.query.active !== undefined) query = query.where({ active: req.query.active === 'true' });

    const templates = await query.orderBy('name', 'asc');
    res.json({ templates: templates.map(formatTemplate) });
  } catch (err) {
    next(err);
  }
});

// POST / — create template
router.post('/', validate(createTemplateSchema), async (req, res, next) => {
  try {
    const mapped = mapTemplateBody(req.body);
    const [id] = await db('templates').insert(mapped);
    const template = await db('templates').where({ id }).first();
    res.status(201).json({ template: formatTemplate(template) });
  } catch (err) {
    next(err);
  }
});

// PUT /:id — update template
router.put('/:id', validate(updateTemplateSchema), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const mapped = mapTemplateBody(req.body);

    const updated = await db('templates').where({ id }).update(mapped);
    if (!updated) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const template = await db('templates').where({ id }).first();
    res.json({ template: formatTemplate(template) });
  } catch (err) {
    next(err);
  }
});

// DELETE /:id — delete template
router.delete('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const deleted = await db('templates').where({ id }).del();
    if (!deleted) {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.json({ message: 'Template deleted' });
  } catch (err) {
    next(err);
  }
});

// POST /:id/preview — generate preview using Canva adapter
router.post('/:id/preview', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const template = await db('templates').where({ id }).first();
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const sampleName = req.body.sampleName || 'Israel Israeli';
    const canvaAdapter = req.app.get('canvaAdapter');
    if (!canvaAdapter) {
      return res.status(503).json({ error: 'Canva adapter not initialized' });
    }

    const result = await canvaAdapter.previewTemplate(id, sampleName);
    const formatted = formatTemplate(template);

    res.json({
      template: formatted,
      preview: {
        imagePath: result.imagePath,
        source: result.source,
      },
    });
  } catch (err) {
    logger.error(`Preview generation failed: ${err.message}`);
    next(err);
  }
});

module.exports = router;
