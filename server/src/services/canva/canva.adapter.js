const logger = require('../../utils/logger');
const ClaudeMcpProvider = require('./claude-mcp.provider');
const ApiProvider = require('./api.provider');
const LocalProvider = require('./local.provider');

class CanvaAdapter {
  constructor(...providers) {
    this.providers = providers.filter(Boolean);
  }

  async personalize(templateId, nameOnDesign, eventType) {
    for (const provider of this.providers) {
      if (!provider.isAvailable()) continue;
      try {
        const result = await provider.personalize(templateId, nameOnDesign, eventType);
        logger.info(`Personalization succeeded via ${provider.name}`);
        return result;
      } catch (err) {
        logger.warn(`${provider.name} failed: ${err.message}, trying next`);
      }
    }
    throw new Error('All personalization providers failed');
  }

  async listTemplates() {
    for (const provider of this.providers) {
      if (!provider.isAvailable()) continue;
      try {
        return await provider.listTemplates();
      } catch (err) {
        logger.warn(`${provider.name} listTemplates failed: ${err.message}, trying next`);
      }
    }
    throw new Error('All template listing providers failed');
  }

  async previewTemplate(templateId, sampleName) {
    for (const provider of this.providers) {
      if (!provider.isAvailable()) continue;
      try {
        return await provider.previewTemplate(templateId, sampleName);
      } catch (err) {
        logger.warn(`${provider.name} previewTemplate failed: ${err.message}, trying next`);
      }
    }
    throw new Error('All preview providers failed');
  }

  getStatus() {
    return this.providers.map((p) => p.getStatus());
  }
}

function createCanvaAdapter() {
  const claudeMcpProvider = new ClaudeMcpProvider();
  const apiProvider = new ApiProvider();
  const localProvider = new LocalProvider();

  // Priority: Claude MCP (real text replacement) → API (export only) → Local (Sharp overlay)
  const adapter = new CanvaAdapter(claudeMcpProvider, apiProvider, localProvider);
  logger.info('Canva adapter initialized with providers: ' +
    adapter.providers.map((p) => `${p.name}(${p.isAvailable() ? 'available' : 'unavailable'})`).join(', '));

  return adapter;
}

module.exports = { CanvaAdapter, createCanvaAdapter };
