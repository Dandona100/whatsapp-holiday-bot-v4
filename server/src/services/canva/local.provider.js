const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const logger = require('../../utils/logger');
const { db } = require('../../config/database');
const imageService = require('../image.service');
const cacheService = require('../cache.service');

const TEMP_DIR = path.join(__dirname, '../../../temp');

class LocalProvider {
  get name() {
    return 'local';
  }

  isAvailable() {
    return true;
  }

  async personalize(templateId, nameOnDesign, _eventType) {
    // Check cache first
    const cached = cacheService.get(templateId, nameOnDesign);
    if (cached) {
      logger.info(`Local provider cache hit: template=${templateId}, name="${nameOnDesign}"`);
      return { imagePath: cached, source: 'local' };
    }

    const template = await db('templates').where({ id: templateId }).first();
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }
    if (!template.local_fallback_path) {
      throw new Error(`Template ${templateId} has no local_fallback_path — upload a base image first`);
    }
    if (!fs.existsSync(template.local_fallback_path)) {
      throw new Error(`Base image not found at ${template.local_fallback_path}`);
    }

    const fontFamily = template.font_family || 'Arial';
    const fontSize = template.font_size || 48;
    const fontColor = template.font_color || '#FFFFFF';
    const nameX = template.name_x || 540;
    const nameY = template.name_y || 900;

    // Determine text direction for Hebrew/Arabic support
    const isRtl = /[\u0590-\u05FF\u0600-\u06FF]/.test(nameOnDesign);
    const direction = isRtl ? 'rtl' : 'ltr';
    const anchor = isRtl ? 'end' : 'middle';

    // Get base image dimensions for SVG overlay sizing
    const baseMeta = await sharp(template.local_fallback_path).metadata();
    const svgWidth = baseMeta.width || 1080;
    const svgHeight = baseMeta.height || 1080;

    // Escape XML special characters in the name
    const escapedName = nameOnDesign
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

    const svgText = `<svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg">
  <text
    x="${nameX}"
    y="${nameY}"
    font-family="${fontFamily}"
    font-size="${fontSize}"
    fill="${fontColor}"
    text-anchor="${anchor}"
    direction="${direction}"
    dominant-baseline="middle"
  >${escapedName}</text>
</svg>`;

    const textOverlay = Buffer.from(svgText);

    fs.mkdirSync(TEMP_DIR, { recursive: true });
    const rawPath = path.join(TEMP_DIR, `local_${templateId}_${Date.now()}_raw.png`);
    const optimizedPath = path.join(TEMP_DIR, `local_${templateId}_${Date.now()}.webp`);

    // Composite text overlay on base image
    await sharp(template.local_fallback_path)
      .composite([{ input: textOverlay, top: 0, left: 0 }])
      .png()
      .toFile(rawPath);

    await imageService.optimize(rawPath, optimizedPath);
    fs.unlinkSync(rawPath);

    // Cache the result
    const cachedPath = cacheService.set(templateId, nameOnDesign, optimizedPath);

    // Update usage stats
    await db('templates').where({ id: templateId }).update({
      usage_count: db.raw('usage_count + 1'),
      last_used: new Date(),
    });

    logger.info(`Local provider personalized: template=${templateId}, name="${nameOnDesign}"`);
    return { imagePath: cachedPath, source: 'local' };
  }

  async listTemplates() {
    const templates = await db('templates')
      .whereNotNull('local_fallback_path')
      .where('local_fallback_path', '!=', '')
      .orderBy('name', 'asc');
    return templates;
  }

  async previewTemplate(templateId, sampleName) {
    return this.personalize(templateId, sampleName || 'Israel Israeli', null);
  }

  getStatus() {
    return {
      name: this.name,
      available: this.isAvailable(),
      tempDir: TEMP_DIR,
    };
  }
}

module.exports = LocalProvider;
