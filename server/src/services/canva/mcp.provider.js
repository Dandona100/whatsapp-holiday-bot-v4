const logger = require('../../utils/logger');
const canvaConfig = require('../../config/canva');

class McpProvider {
  constructor() {
    this.endpoint = canvaConfig.mcp.endpoint;
  }

  get name() {
    return 'mcp';
  }

  isAvailable() {
    return false;
  }

  async personalize(_templateId, _nameOnDesign, _eventType) {
    throw new Error('MCP provider is not configured — requires Anthropic API integration');
  }

  async listTemplates() {
    throw new Error('MCP provider is not configured — requires Anthropic API integration');
  }

  async previewTemplate(_templateId, _sampleName) {
    throw new Error('MCP provider is not configured — requires Anthropic API integration');
  }

  getStatus() {
    return {
      name: this.name,
      available: this.isAvailable(),
      endpoint: this.endpoint,
      reason: 'MCP requires Anthropic API integration — will be enabled later',
    };
  }
}

module.exports = McpProvider;
