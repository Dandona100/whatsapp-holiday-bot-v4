const logger = require('../utils/logger');
const { formatWhatsAppId } = require('../utils/phoneFormat');
const { RATE_LIMITS } = require('../config/constants');
const { db } = require('../config/database');
const { getIO } = require('../websocket/socket');

class SenderService {
  constructor(whatsappService) {
    this.whatsappService = whatsappService;
  }

  async send(contact, content, options = {}) {
    const chatId = formatWhatsAppId(contact.phone);
    const [logId] = await db('message_logs').insert({
      contact_id: contact.id,
      direction: 'outgoing',
      trigger_type: options.triggerType || 'manual',
      schedule_id: options.scheduleId || null,
      event_type: options.eventType || null,
      message_type: content.imagePath ? 'image' : 'text',
      status: 'sending',
      caption: content.caption || null,
      image_path: content.imagePath || null,
      created_at: new Date(),
      updated_at: new Date(),
    });

    const log = { id: logId, status: 'sending' };

    try {
      if (content.imagePath) {
        await this.whatsappService.sendImage(chatId, content.imagePath, content.caption);
      } else {
        await this.whatsappService.sendMessage(chatId, content.text);
      }

      log.status = 'sent';
      await db('message_logs').where({ id: logId }).update({
        status: 'sent',
        sent_at: new Date(),
        updated_at: new Date(),
      });

      await db('contacts').where({ id: contact.id }).update({
        total_sent: db.raw('total_sent + 1'),
        last_message_sent: new Date(),
        last_message_status: 'sent',
        updated_at: new Date(),
      });

      return log;
    } catch (err) {
      log.status = 'failed';
      log.errorMessage = err.message;
      await db('message_logs').where({ id: logId }).update({
        status: 'failed',
        error_message: err.message,
        updated_at: new Date(),
      });

      await db('contacts').where({ id: contact.id }).update({
        total_failed: db.raw('total_failed + 1'),
        last_message_status: 'failed',
        updated_at: new Date(),
      });

      logger.error(`Failed to send to ${contact.phone}: ${err.message}`);
      return log;
    }
  }

  async sendBulk(contacts, contentFn, options = {}) {
    const total = contacts.length;
    let sent = 0;
    let failed = 0;
    const results = [];

    for (let i = 0; i < total; i++) {
      const contact = contacts[i];
      const content = contentFn(contact);
      let log = null;
      let success = false;

      for (let attempt = 0; attempt < RATE_LIMITS.waMaxRetries; attempt++) {
        log = await this.send(contact, content, options);
        if (log.status === 'sent') {
          success = true;
          break;
        }

        if (attempt < RATE_LIMITS.waMaxRetries - 1) {
          const backoff = Math.pow(2, attempt) * 1000;
          logger.warn(`Retry ${attempt + 1} for ${contact.phone} in ${backoff}ms`);
          await this._delay(backoff, backoff);
        }
      }

      if (success) {
        sent++;
      } else {
        failed++;
      }

      results.push({ contactId: contact.id, phone: contact.phone, status: log.status });

      try {
        getIO().emit('send:progress', { total, sent, failed, current: i + 1 });
      } catch {
        // Socket not initialized
      }

      if (i < total - 1) {
        await this._delay(RATE_LIMITS.waDelayMin, RATE_LIMITS.waDelayMax);
      }
    }

    const summary = { total, sent, failed, results };

    try {
      getIO().emit('send:complete', summary);
    } catch {
      // Socket not initialized
    }

    logger.info(`Bulk send complete: ${sent}/${total} sent, ${failed} failed`);
    return summary;
  }

  _delay(min, max) {
    const ms = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

module.exports = SenderService;
