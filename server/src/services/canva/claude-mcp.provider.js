const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const logger = require('../../utils/logger');
const { db } = require('../../config/database');
const imageService = require('../image.service');
const cacheService = require('../cache.service');

const TEMP_DIR = path.join(__dirname, '../../../temp');
const CLAUDE_PATH = '/Users/dannibshiri/.local/bin/claude';

class ClaudeMcpProvider {
  get name() {
    return 'claude-mcp';
  }

  isAvailable() {
    return fs.existsSync(CLAUDE_PATH);
  }

  async personalize(templateId, nameOnDesign, _eventType) {
    const cached = cacheService.get(templateId, nameOnDesign);
    if (cached) {
      logger.info(`Claude MCP cache hit: template=${templateId}, name="${nameOnDesign}"`);
      return { imagePath: cached, source: 'claude-mcp' };
    }

    const template = await db('templates').where({ id: templateId }).first();
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    const designId = template.canva_design_id;
    if (!designId) {
      throw new Error(`Template ${templateId} has no canva_design_id`);
    }

    const placeholder = template.placeholder_field || '{NAME}';
    fs.mkdirSync(TEMP_DIR, { recursive: true });
    const outputPath = path.join(TEMP_DIR, `mcp_${templateId}_${Date.now()}.png`);

    const prompt = `Do this silently with no explanation:
1. Use start-editing-transaction on Canva design ${designId}
2. Find the text element containing "${placeholder}"
3. Use find_and_replace_text to replace "${placeholder}" with "${nameOnDesign}"
4. Use export-design as PNG (design_id: ${designId}, format: {type: "png"})
5. Use cancel-editing-transaction to revert the design
6. Download the exported PNG using curl to: ${outputPath}
7. Output ONLY the text: DONE:${outputPath}`;

    logger.info(`Claude MCP: personalizing "${nameOnDesign}" on design ${designId}`);

    const result = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Claude MCP timed out after 120s'));
      }, 120000);

      execFile(CLAUDE_PATH, ['-p', prompt, '--output-format', 'text', '--allowedTools', 'mcp__claude_ai_Canva__start-editing-transaction,mcp__claude_ai_Canva__perform-editing-operations,mcp__claude_ai_Canva__cancel-editing-transaction,mcp__claude_ai_Canva__export-design,mcp__claude_ai_Canva__get-design,Bash'], {
        timeout: 120000,
        maxBuffer: 1024 * 1024,
        env: { ...process.env, HOME: '/Users/dannibshiri' },
      }, (err, stdout, stderr) => {
        clearTimeout(timeout);
        if (err) {
          logger.error(`Claude MCP error: ${err.message}`);
          reject(err);
          return;
        }
        resolve(stdout.trim());
      });
    });

    if (!fs.existsSync(outputPath)) {
      logger.error(`Claude MCP output not found at ${outputPath}. Output: ${result.substring(0, 200)}`);
      throw new Error('Claude MCP did not produce output file');
    }

    // Optimize
    const optimizedPath = outputPath.replace('.png', '.webp');
    await imageService.optimize(outputPath, optimizedPath);
    fs.unlinkSync(outputPath);

    const cachedPath = cacheService.set(templateId, nameOnDesign, optimizedPath);

    await db('templates').where({ id: templateId }).update({
      usage_count: db.raw('usage_count + 1'),
      last_used: new Date(),
    });

    logger.info(`Claude MCP personalized: template=${templateId}, name="${nameOnDesign}"`);
    return { imagePath: cachedPath, source: 'claude-mcp' };
  }

  async listTemplates() {
    return db('templates')
      .whereNotNull('canva_design_id')
      .where('canva_design_id', '!=', '')
      .orderBy('name', 'asc');
  }

  async previewTemplate(templateId, sampleName) {
    return this.personalize(templateId, sampleName || 'ישראל ישראלי', null);
  }

  getStatus() {
    return {
      name: this.name,
      available: this.isAvailable(),
      claudePath: CLAUDE_PATH,
    };
  }
}

module.exports = ClaudeMcpProvider;
