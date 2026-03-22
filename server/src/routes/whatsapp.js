const express = require('express');
const Joi = require('joi');
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');
const whatsappService = require('../services/whatsapp.service');
const logger = require('../utils/logger');
const { db } = require('../config/database');

const router = express.Router();

router.use(authenticate);

// --- Validation Schemas ---

const sendSchema = Joi.object({
  phone: Joi.string().pattern(/^\+\d{7,15}$/).required(),
  message: Joi.string().required(),
  imagePath: Joi.string().optional(),
});

const sendBulkSchema = Joi.object({
  contactIds: Joi.array().items(Joi.string()).min(1).required(),
  message: Joi.string().required(),
  imagePath: Joi.string().optional(),
});

// --- Routes ---

// GET /status
router.get('/status', (req, res) => {
  res.json(whatsappService.getStatus());
});

// POST /connect
router.post('/connect', async (req, res, next) => {
  try {
    if (whatsappService.status === 'connected') {
      return res.json({ message: 'Already connected' });
    }
    if (whatsappService.status === 'connecting') {
      return res.json({ message: 'Already connecting' });
    }
    if (!whatsappService.client) {
      await whatsappService.initialize();
    }
    await whatsappService.connect();
    res.json({ message: 'WhatsApp connection initiated' });
  } catch (err) {
    next(err);
  }
});

// POST /disconnect
router.post('/disconnect', async (req, res, next) => {
  try {
    await whatsappService.disconnect();
    res.json({ message: 'WhatsApp disconnected' });
  } catch (err) {
    next(err);
  }
});

// GET /qr — SSE stream for QR code events, with fallback to JSON
router.get('/qr', (req, res) => {
  const accept = req.headers.accept || '';

  if (accept.includes('text/event-stream')) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    const qr = whatsappService.getQR();
    if (qr) {
      res.write(`data: ${JSON.stringify({ qr })}\n\n`);
    }

    const { getIO } = require('../websocket/socket');
    try {
      const io = getIO();
      const handler = (data) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      };
      io.on('whatsapp:qr', handler);

      req.on('close', () => {
        io.off('whatsapp:qr', handler);
      });
    } catch {
      res.write(`data: ${JSON.stringify({ error: 'Socket not initialized' })}\n\n`);
      res.end();
    }
  } else {
    const qr = whatsappService.getQR();
    res.json({ qr: qr || null });
  }
});

// POST /sync-contacts — Import contacts from WhatsApp
router.post('/sync-contacts', async (req, res, next) => {
  try {
    if (whatsappService.status !== 'connected') {
      return res.status(400).json({ error: 'WhatsApp is not connected' });
    }

    const waContacts = await whatsappService.getContacts();
    const validContacts = waContacts.filter(
      (c) => c.isUser && !c.isGroup && !c.isMe && c.number
    );

    let imported = 0;
    let skipped = 0;
    let updated = 0;

    for (const wc of validContacts) {
      const phone = '+' + wc.number;
      const displayName = wc.pushname || wc.name || wc.shortName || phone;

      const existing = await db('contacts').where({ phone }).first();
      if (existing) {
        if (!existing.display_name || existing.display_name === existing.phone) {
          await db('contacts').where({ id: existing.id }).update({
            display_name: displayName,
            updated_at: new Date(),
          });
          updated++;
        } else {
          skipped++;
        }
      } else {
        await db('contacts').insert({
          phone,
          display_name: displayName,
          name_on_design: wc.pushname || wc.shortName || null,
          source: 'whatsapp',
          active: true,
          auto_reply_enabled: true,
          language: 'he',
        });
        imported++;
      }
    }

    res.json({
      message: 'Sync complete',
      total: validContacts.length,
      imported,
      updated,
      skipped,
    });
  } catch (err) {
    logger.error(`Failed to sync contacts: ${err.message}`);
    next(err);
  }
});

// POST /sync-groups — Import groups from WhatsApp
router.post('/sync-groups', async (req, res, next) => {
  try {
    if (whatsappService.status !== 'connected') {
      return res.status(400).json({ error: 'WhatsApp is not connected' });
    }

    const waChats = await whatsappService.getChats();
    const waGroups = waChats.filter((c) => c.isGroup);

    let imported = 0;
    let skipped = 0;

    for (const wg of waGroups) {
      const existing = await db('groups').where({ name: wg.name }).first();
      if (existing) {
        skipped++;
        continue;
      }

      const [groupId] = await db('groups').insert({
        name: wg.name,
        description: `WhatsApp group (${wg.participants?.length || 0} members)`,
        auto_send_shabbat: true,
        auto_send_holiday: true,
        auto_reply_enabled: true,
      });

      // Add group participants as contacts and link them
      if (wg.participants) {
        for (const p of wg.participants) {
          const phone = '+' + p.id._serialized.replace('@c.us', '');
          let contact = await db('contacts').where({ phone }).first();
          if (!contact) {
            const [contactId] = await db('contacts').insert({
              phone,
              display_name: phone,
              source: 'whatsapp',
              active: true,
              auto_reply_enabled: true,
              language: 'he',
            });
            contact = { id: contactId };
          }
          await db('contact_groups').insert({ contact_id: contact.id, group_id: groupId }).catch(() => {});
        }
      }

      imported++;
    }

    res.json({
      message: 'Group sync complete',
      total: waGroups.length,
      imported,
      skipped,
    });
  } catch (err) {
    logger.error(`Failed to sync groups: ${err.message}`);
    next(err);
  }
});

// GET /chats — List recent WhatsApp chats
router.get('/chats', async (req, res, next) => {
  try {
    if (whatsappService.status !== 'connected') {
      return res.status(400).json({ error: 'WhatsApp is not connected' });
    }

    const waChats = await whatsappService.getChats();
    const chats = waChats.map((c) => ({
      id: c.id._serialized,
      name: c.name || c.pushname || c.id.user,
      isGroup: c.isGroup,
      unreadCount: c.unreadCount,
      lastMessage: c.lastMessage ? {
        body: c.lastMessage.body,
        timestamp: c.lastMessage.timestamp,
        fromMe: c.lastMessage.fromMe,
      } : null,
      participantCount: c.participants?.length || null,
    }));

    res.json({ chats });
  } catch (err) {
    logger.error(`Failed to get chats: ${err.message}`);
    next(err);
  }
});

// POST /send — Send single message
router.post('/send', validate(sendSchema), async (req, res, next) => {
  try {
    const { phone, message, imagePath } = req.body;
    const chatId = phone.replace('+', '') + '@c.us';

    if (imagePath) {
      await whatsappService.sendImage(chatId, imagePath, message);
    } else {
      await whatsappService.sendMessage(chatId, message);
    }

    // Log the message
    const contact = await db('contacts').where({ phone }).first();
    await db('message_logs').insert({
      contact_id: contact?.id || null,
      direction: 'outgoing',
      trigger_type: 'manual',
      message_type: imagePath ? 'image' : 'text',
      status: 'sent',
      caption: message,
      image_path: imagePath || null,
      sent_at: new Date(),
    }).catch(() => {});

    if (contact) {
      await db('contacts').where({ id: contact.id }).update({
        total_sent: db.raw('total_sent + 1'),
        last_message_sent: new Date(),
        last_message_status: 'sent',
      }).catch(() => {});
    }

    res.json({ message: 'Message sent', phone });
  } catch (err) {
    logger.error(`Failed to send message: ${err.message}`);
    next(err);
  }
});

// POST /send-bulk
router.post('/send-bulk', validate(sendBulkSchema), async (req, res, next) => {
  try {
    const { contactIds, message, imagePath } = req.body;

    const contacts = await db('contacts')
      .whereIn('id', contactIds.map(Number))
      .where({ active: true });

    const results = { sent: 0, failed: 0, errors: [] };

    for (const contact of contacts) {
      const logData = {
        contact_id: contact.id,
        direction: 'outgoing',
        trigger_type: 'manual',
        message_type: imagePath ? 'image' : 'text',
        status: 'sending',
        caption: message,
        image_path: imagePath || null,
      };

      try {
        const chatId = contact.phone.replace('+', '') + '@c.us';
        if (imagePath) {
          await whatsappService.sendImage(chatId, imagePath, message);
        } else {
          await whatsappService.sendMessage(chatId, message);
        }

        logData.status = 'sent';
        logData.sent_at = new Date();
        results.sent++;

        // Update contact stats
        await db('contacts').where({ id: contact.id }).update({
          total_sent: db.raw('total_sent + 1'),
          last_message_sent: new Date(),
          last_message_status: 'sent',
        });
      } catch (err) {
        logData.status = 'failed';
        logData.error_message = err.message;
        results.failed++;
        results.errors.push({ contactId: contact.id, error: err.message });
      }

      // Save log
      await db('message_logs').insert(logData).catch((e) => {
        logger.error(`Failed to save message log: ${e.message}`);
      });
    }

    res.json(results);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
