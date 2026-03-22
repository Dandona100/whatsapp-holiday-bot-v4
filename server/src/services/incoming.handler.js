const { db } = require('../config/database');
const logger = require('../utils/logger');
const { getCurrentEventType } = require('../utils/hebrewCalendar');
const { buildCaption } = require('../utils/caption');

class IncomingHandler {
  constructor(canvaAdapter, approvalService, contactService) {
    this.canvaAdapter = canvaAdapter;
    this.approvalService = approvalService;
    this.contactService = contactService;
  }

  async process(msg) {
    // Filter: skip groups, status broadcasts, own messages
    if (msg.fromMe) return;
    if (!msg.from || !msg.from.endsWith('@c.us')) return;
    if (msg.from.includes('@g.us') || msg.from.includes('@broadcast')) return;
    if (msg.isGroupMsg || msg.isStatus) return;

    // Extract phone and validate
    const phone = '+' + msg.from.replace('@c.us', '');
    if (phone.length > 16 || phone.length < 8) return; // Invalid phone number

    let contact = await this.contactService.findByPhone(phone);
    if (!contact) {
      contact = await this.contactService.autoCreate(phone, msg);
    }

    // Update incoming stats
    await db('contacts').where({ id: contact.id }).update({
      total_incoming: db.raw('total_incoming + 1'),
      last_message_received: new Date(),
      updated_at: new Date(),
    });

    // Log incoming message
    await db('message_logs').insert({
      contact_id: contact.id,
      direction: 'incoming',
      trigger_type: 'auto_reply',
      message_type: 'text',
      status: 'received',
      caption: msg.body,
      created_at: new Date(),
      updated_at: new Date(),
    });

    // Check if auto-reply is enabled (global settings + contact level)
    const settings = await db('settings').where({ key_: 'global' }).first();
    const raw = settings?.data;
    const config = typeof raw === 'string' ? JSON.parse(raw) : (raw || {});
    if (!config.autoReply?.enabled) return;
    if (contact.autoReplyEnabled === false) return;

    // Check active window (parse start/end times, compare with current Israel time)
    if (!this._isInActiveWindow(config.autoReply.activeWindow)) return;

    // Get current event type from Hebrew calendar
    const eventType = getCurrentEventType();
    if (!eventType) return;

    // Check cooldown (don't re-trigger within cooldown period for same contact)
    const cooldownHours = config.autoReply.cooldownHours || 24;
    const recentApproval = await db('pending_approvals')
      .where({ contact_id: contact.id })
      .where('created_at', '>', new Date(Date.now() - cooldownHours * 60 * 60 * 1000))
      .first();
    if (recentApproval) return;

    // Find template for this event type
    const template = await db('templates')
      .where({ event_type: eventType, active: true })
      .first();
    if (!template) return;

    // Prepare personalized greeting using canvaAdapter (if available)
    let imagePath = null;
    let imageSource = null;
    const nameOnDesign = contact.nameOnDesign || contact.displayName;

    if (this.canvaAdapter) {
      try {
        const result = await this.canvaAdapter.personalize(template.id, nameOnDesign, eventType);
        imagePath = result.imagePath;
        imageSource = result.source;
      } catch (err) {
        logger.warn(`Personalization failed for ${nameOnDesign}: ${err.message}`);
      }
    }

    // Build caption
    const caption = buildCaption(
      template.caption_template,
      { nameOnDesign, displayName: contact.displayName }
    );

    // Create PendingApproval and notify admin
    const approvalTimeout = config.autoReply.approvalTimeout || 240;
    await this.approvalService.create({
      contactId: contact.id,
      triggerType: 'incoming_message',
      incomingBody: msg.body,
      incomingTimestamp: new Date(),
      incomingHasMedia: msg.hasMedia || false,
      imagePath,
      imageSource,
      caption,
      templateId: template.id,
      expiresAt: new Date(Date.now() + approvalTimeout * 60 * 1000),
    });

    logger.info(`Auto-reply approval created for contact ${contact.id} (${contact.displayName})`);
  }

  _isInActiveWindow(window) {
    if (!window) return true;

    const now = new Date();
    const israelTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' }));
    const hours = israelTime.getHours();
    const minutes = israelTime.getMinutes();
    const currentMinutes = hours * 60 + minutes;

    const [startH, startM] = (window.start || '07:00').split(':').map(Number);
    const [endH, endM] = (window.end || '22:00').split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  }
}

module.exports = IncomingHandler;
