const logger = require('../utils/logger');

class AdminHandler {
  constructor(approvalService, whatsappService) {
    this.approvalService = approvalService;
    this.whatsappService = whatsappService;
  }

  async process(msg) {
    const body = msg.body.trim().toLowerCase();

    // Check if it's a reply to an approval notification
    if (msg.hasQuotedMsg) {
      try {
        const quoted = await msg.getQuotedMessage();
        const match = quoted.body.match(/\[#(\d+)\]/);
        if (match) {
          const approvalId = parseInt(match[1], 10);

          if (body === '\u2705' || body === 'approve' || body === 'yes' || body === '1') {
            await this.approvalService.approve(approvalId, 'whatsapp');
            await msg.reply('\u2705 Approved and sent!');
            return true;
          }

          if (body === '\u274c' || body === 'reject' || body === 'no' || body === '0') {
            await this.approvalService.reject(approvalId, 'whatsapp');
            await msg.reply('\u274c Rejected.');
            return true;
          }
        }
      } catch (err) {
        logger.error(`Failed to process quoted approval message: ${err.message}`);
      }
    }

    // Direct commands: "approve 123", "reject 123"
    const approveMatch = body.match(/^(?:approve|\u2705)\s*(\d+)$/);
    if (approveMatch) {
      const approvalId = parseInt(approveMatch[1], 10);
      await this.approvalService.approve(approvalId, 'whatsapp');
      await msg.reply('\u2705 Approved and sent!');
      return true;
    }

    const rejectMatch = body.match(/^(?:reject|\u274c)\s*(\d+)$/);
    if (rejectMatch) {
      const approvalId = parseInt(rejectMatch[1], 10);
      await this.approvalService.reject(approvalId, 'whatsapp');
      await msg.reply('\u274c Rejected.');
      return true;
    }

    return false;
  }
}

module.exports = AdminHandler;
