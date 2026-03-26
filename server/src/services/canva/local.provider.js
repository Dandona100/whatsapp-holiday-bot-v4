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

  async personalize(templateId, nameOnDesign, eventType) {
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

    // Route to SVG template mode or image overlay mode
    if (template.svg_template_path) {
      return this._personalizeSvgTemplate(template, nameOnDesign, eventType);
    }
    return this._personalizeImageOverlay(template, nameOnDesign);
  }

  /**
   * Full SVG template mode — replace {{placeholders}} in SVG, render to PNG.
   * Supports: {{name}}, {{occasion}}, {{date}}, {{greeting}}, and any custom placeholder.
   */
  async _personalizeSvgTemplate(template, nameOnDesign, eventType) {
    if (!fs.existsSync(template.svg_template_path)) {
      throw new Error(`SVG template not found at ${template.svg_template_path}`);
    }

    let svg = fs.readFileSync(template.svg_template_path, 'utf-8');

    // Build replacement map
    const { EVENT_TYPES } = require('../../config/constants');
    const eventInfo = EVENT_TYPES[eventType] || EVENT_TYPES.custom;
    const now = new Date();

    const replacements = {
      name: nameOnDesign,
      occasion: eventInfo.greeting || '',
      greeting: eventInfo.greeting || '',
      emoji: eventInfo.emoji || '',
      date: now.toLocaleDateString('he-IL'),
      year: String(now.getFullYear()),
    };

    // Escape XML special characters in replacement values
    for (const [key, value] of Object.entries(replacements)) {
      const escaped = String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
      // Replace {{key}} and {{ key }} (with optional spaces)
      const pattern = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi');
      svg = svg.replace(pattern, escaped);
    }

    // Convert SVG to PNG via sharp
    fs.mkdirSync(TEMP_DIR, { recursive: true });
    const rawPath = path.join(TEMP_DIR, `svg_${template.id}_${Date.now()}_raw.png`);
    const optimizedPath = path.join(TEMP_DIR, `svg_${template.id}_${Date.now()}.webp`);

    await sharp(Buffer.from(svg))
      .png()
      .toFile(rawPath);

    await imageService.optimize(rawPath, optimizedPath);
    fs.unlinkSync(rawPath);

    const cachedPath = cacheService.set(template.id, nameOnDesign, optimizedPath);

    await db('templates').where({ id: template.id }).update({
      usage_count: db.raw('usage_count + 1'),
      last_used: new Date(),
    });

    logger.info(`SVG template personalized: template=${template.id}, name="${nameOnDesign}"`);
    return { imagePath: cachedPath, source: 'local-svg' };
  }

  /**
   * Image overlay mode — composite text SVG layer on a base image.
   */
  async _personalizeImageOverlay(template, nameOnDesign) {
    if (!template.local_fallback_path) {
      throw new Error(`Template ${template.id} has no local_fallback_path or svg_template_path — upload a base image or SVG first`);
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
    const rawPath = path.join(TEMP_DIR, `local_${template.id}_${Date.now()}_raw.png`);
    const optimizedPath = path.join(TEMP_DIR, `local_${template.id}_${Date.now()}.webp`);

    // Composite text overlay on base image
    await sharp(template.local_fallback_path)
      .composite([{ input: textOverlay, top: 0, left: 0 }])
      .png()
      .toFile(rawPath);

    await imageService.optimize(rawPath, optimizedPath);
    fs.unlinkSync(rawPath);

    const cachedPath = cacheService.set(template.id, nameOnDesign, optimizedPath);

    await db('templates').where({ id: template.id }).update({
      usage_count: db.raw('usage_count + 1'),
      last_used: new Date(),
    });

    logger.info(`Local provider personalized: template=${template.id}, name="${nameOnDesign}"`);
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
