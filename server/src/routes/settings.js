const express = require('express');
const Joi = require('joi');
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');
const { db } = require('../config/database');
const logger = require('../utils/logger');
const { sendTelegram } = require('../services/notification.service');

const router = express.Router();

router.use(authenticate);

// --- Validation Schemas ---

const updateSettingsSchema = Joi.object({
  whatsapp: Joi.object({
    rateLimit: Joi.number().integer().positive().optional(),
    delayMin: Joi.number().integer().min(0).optional(),
    delayMax: Joi.number().integer().min(0).optional(),
    maxRetries: Joi.number().integer().min(0).optional(),
  }).optional(),
  autoReply: Joi.object({
    enabled: Joi.boolean().optional(),
    adminPhone: Joi.string().allow('').optional(),
    approvalTimeout: Joi.number().integer().positive().optional(),
    cooldownHours: Joi.number().integer().min(0).optional(),
    activeWindow: Joi.object({
      start: Joi.string().pattern(/^\d{2}:\d{2}$/).optional(),
      end: Joi.string().pattern(/^\d{2}:\d{2}$/).optional(),
    }).optional(),
    autoAddContacts: Joi.boolean().optional(),
    notifyVia: Joi.array().items(Joi.string()).optional(),
  }).optional(),
  sending: Joi.object({
    defaultSendTime: Joi.string().pattern(/^\d{2}:\d{2}$/).optional(),
  }).optional(),
  telegram: Joi.object({
    botToken: Joi.string().allow('').optional(),
    chatId: Joi.string().allow('').optional(),
  }).optional(),
});

// --- Helpers ---

async function getSettings() {
  const row = await db('settings').where({ key_: 'global' }).first();
  if (!row) return null;
  return typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
}

// --- Routes ---

// GET / — get settings
router.get('/', async (req, res, next) => {
  try {
    const settings = await getSettings();
    res.json({ settings: settings || {} });
  } catch (err) {
    next(err);
  }
});

// PUT / — update settings
router.put('/', validate(updateSettingsSchema), async (req, res, next) => {
  try {
    const settings = await getSettings() || {};

    if (req.body.whatsapp) {
      settings.whatsapp = settings.whatsapp || {};
      Object.assign(settings.whatsapp, req.body.whatsapp);
    }
    if (req.body.autoReply) {
      settings.autoReply = settings.autoReply || {};
      if (req.body.autoReply.activeWindow) {
        settings.autoReply.activeWindow = settings.autoReply.activeWindow || {};
        Object.assign(settings.autoReply.activeWindow, req.body.autoReply.activeWindow);
        delete req.body.autoReply.activeWindow;
      }
      Object.assign(settings.autoReply, req.body.autoReply);
    }
    if (req.body.sending) {
      settings.sending = settings.sending || {};
      Object.assign(settings.sending, req.body.sending);
    }
    if (req.body.telegram) {
      settings.telegram = settings.telegram || {};
      Object.assign(settings.telegram, req.body.telegram);
    }

    await db('settings')
      .where({ key_: 'global' })
      .update({ data: JSON.stringify(settings) });

    res.json({ settings });
  } catch (err) {
    next(err);
  }
});

// POST /backup — create DB backup
router.post('/backup', async (req, res, next) => {
  try {
    logger.info('Database backup requested');
    res.json({
      message: 'Backup initiated',
      timestamp: new Date().toISOString(),
      status: 'pending',
    });
  } catch (err) {
    next(err);
  }
});

// GET /backup/download — download backup
router.get('/backup/download', async (req, res, next) => {
  try {
    res.json({
      message: 'Backup download not yet implemented',
      status: 'pending',
    });
  } catch (err) {
    next(err);
  }
});

// POST /telegram/test — send a test message to Telegram
router.post('/telegram/test', async (req, res, next) => {
  try {
    const settings = await getSettings() || {};
    const token = (settings.telegram && settings.telegram.botToken) || process.env.TELEGRAM_BOT_TOKEN;
    const chatId = (settings.telegram && settings.telegram.chatId) || process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
      return res.status(400).json({ error: 'Telegram bot token and chat ID are required' });
    }

    // Temporarily override env vars for sendTelegram
    const origToken = process.env.TELEGRAM_BOT_TOKEN;
    const origChatId = process.env.TELEGRAM_CHAT_ID;
    process.env.TELEGRAM_BOT_TOKEN = token;
    process.env.TELEGRAM_CHAT_ID = chatId;

    try {
      await sendTelegram('WhatsApp Holiday Bot - Test message. If you see this, Telegram integration is working!');
      res.json({ success: true, message: 'Test message sent successfully' });
    } finally {
      process.env.TELEGRAM_BOT_TOKEN = origToken;
      process.env.TELEGRAM_CHAT_ID = origChatId;
    }
  } catch (err) {
    logger.error(`Telegram test failed: ${err.message}`);
    res.status(500).json({ error: `Telegram test failed: ${err.message}` });
  }
});

module.exports = router;
