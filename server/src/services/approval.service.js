const { db } = require('../config/database');
const logger = require('../utils/logger');

class ApprovalService {
  constructor(whatsappService, senderService) {
    this.whatsappService = whatsappService;
    this.senderService = senderService;
  }

  async create(data) {
    const [id] = await db('pending_approvals').insert({
      contact_id: data.contactId,
      trigger_type: data.triggerType,
      incoming_body: data.incomingBody,
      incoming_timestamp: data.incomingTimestamp,
      incoming_has_media: data.incomingHasMedia,
      image_path: data.imagePath,
      image_source: data.imageSource,
      caption: data.caption,
      template_id: data.templateId,
      status: 'pending',
      expires_at: data.expiresAt,
      created_at: new Date(),
      updated_at: new Date(),
    });

    await this._notifyAdmin(id, data);
    this._notifyWebSocket(id, data);

    return id;
  }

  async approve(approvalId, via = 'ui') {
    const approval = await db('pending_approvals').where({ id: approvalId }).first();
    if (!approval || approval.status !== 'pending') {
      logger.warn(`Approval ${approvalId} not found or not pending (status: ${approval?.status})`);
      return null;
    }

    await db('pending_approvals').where({ id: approvalId }).update({
      status: 'approved',
      admin_decision: 'approve',
      admin_responded_at: new Date(),
      admin_responded_via: via,
      updated_at: new Date(),
    });

    // Send the message to the contact
    const contact = await db('contacts').where({ id: approval.contact_id }).first();
    if (contact && this.senderService) {
      try {
        const content = {};
        if (approval.image_path) {
          content.imagePath = approval.image_path;
          content.caption = approval.admin_edited_caption || approval.caption;
        } else {
          content.text = approval.admin_edited_caption || approval.caption;
        }

        await this.senderService.send(
          { id: contact.id, phone: contact.phone },
          content,
          { triggerType: 'auto_reply', approvalId }
        );

        await db('pending_approvals').where({ id: approvalId }).update({
          status: 'sent',
          sent_at: new Date(),
          updated_at: new Date(),
        });

        logger.info(`Approved message ${approvalId} sent to ${contact.phone}`);
      } catch (err) {
        await db('pending_approvals').where({ id: approvalId }).update({
          status: 'failed',
          updated_at: new Date(),
        });
        logger.error(`Failed to send approved message ${approvalId}: ${err.message}`);
      }
    }

    this._notifyWebSocket(approvalId, { status: 'approved' });
    return approval;
  }

  async reject(approvalId, via = 'ui') {
    const approval = await db('pending_approvals').where({ id: approvalId }).first();
    if (!approval || approval.status !== 'pending') {
      logger.warn(`Approval ${approvalId} not found or not pending (status: ${approval?.status})`);
      return null;
    }

    await db('pending_approvals').where({ id: approvalId }).update({
      status: 'rejected',
      admin_decision: 'reject',
      admin_responded_at: new Date(),
      admin_responded_via: via,
      updated_at: new Date(),
    });

    logger.info(`Approval ${approvalId} rejected via ${via}`);
    this._notifyWebSocket(approvalId, { status: 'rejected' });
    return approval;
  }

  async expirePending() {
    const expired = await db('pending_approvals')
      .where('status', 'pending')
      .where('expires_at', '<', new Date())
      .update({
        status: 'expired',
        updated_at: new Date(),
      });

    if (expired > 0) {
      logger.info(`Expired ${expired} pending approvals`);
    }
    return expired;
  }

  async _notifyAdmin(approvalId, data) {
    const settings = await db('settings').where({ key_: 'global' }).first();
    const raw = settings?.data;
    const config = typeof raw === 'string' ? JSON.parse(raw) : (raw || {});
    const adminPhone = config.autoReply?.adminPhone;

    if (!adminPhone || !this.whatsappService || this.whatsappService.status !== 'connected') {
      return;
    }

    const contact = await db('contacts').where({ id: data.contactId }).first();
    const contactName = contact?.display_name || contact?.phone || 'Unknown';

    const message =
      `\ud83d\udce9 New message from *${contactName}*\n` +
      `\ud83d\udcf1 ${contact?.phone}\n` +
      `\ud83d\udcac "${data.incomingBody || '(media)'}"\n\n` +
      `\ud83c\udfa8 Greeting ready: ${data.caption || '(no caption)'}\n` +
      `[#${approvalId}]\n\n` +
      `Reply \u2705 to approve, \u274c to reject`;

    try {
      const chatId = adminPhone.replace('+', '') + '@c.us';
      await this.whatsappService.sendMessage(chatId, message);
      logger.info(`Admin notified about approval ${approvalId}`);
    } catch (err) {
      logger.error(`Failed to notify admin about approval ${approvalId}: ${err.message}`);
    }
  }

  _notifyWebSocket(approvalId, data) {
    try {
      const { getIO } = require('../websocket/socket');
      getIO().emit('approval:new', {
        approvalId,
        contactId: data.contactId,
        caption: data.caption,
        status: data.status,
      });
    } catch {
      // Socket not initialized yet
    }
  }
}

module.exports = ApprovalService;
