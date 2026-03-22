require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');
const fs = require('fs');
const path = require('path');

const cron = require('node-cron');
const database = require('./config/database');
const logger = require('./utils/logger');
const { setupSocket } = require('./websocket/socket');
const { apiLimiter } = require('./middleware/rateLimit');

const { createCanvaAdapter } = require('./services/canva/canva.adapter');

const authRoutes = require('./routes/auth');
const whatsappRoutes = require('./routes/whatsapp');
const contactRoutes = require('./routes/contacts');
const groupRoutes = require('./routes/groups');
const templateRoutes = require('./routes/templates');
const scheduleRoutes = require('./routes/schedules');
const approvalRoutes = require('./routes/approvals');
const logRoutes = require('./routes/logs');
const settingsRoutes = require('./routes/settings');

const app = express();

// Ensure required directories exist
fs.mkdirSync(path.join(__dirname, '../uploads/templates'), { recursive: true });
fs.mkdirSync(path.join(__dirname, '../temp'), { recursive: true });

// Security and parsing middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(apiLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/settings', settingsRoutes);

// Error handler
app.use((err, req, res, _next) => {
  logger.error(`${err.message}\n${err.stack}`);
  res.status(500).json({ error: 'Internal server error' });
});

// Create HTTP server and attach Socket.io
const server = http.createServer(app);
setupSocket(server);

const PORT = process.env.PORT || 3001;

database.connect()
  .then(async () => {
    // Initialize Canva adapter and make it available to routes
    const canvaAdapter = createCanvaAdapter();
    app.set('canvaAdapter', canvaAdapter);

    server.listen(PORT, () => {
      logger.info(`Server listening on port ${PORT}`);
    });

    // Auto-connect WhatsApp on startup
    const whatsappService = require('./services/whatsapp.service');
    try {
      await whatsappService.initialize();
      await whatsappService.connect();
      logger.info('WhatsApp auto-connect initiated');
    } catch (err) {
      logger.warn(`WhatsApp auto-connect failed: ${err.message}`);
    }

    // Wire up Auto-Reply system
    const SenderService = require('./services/sender.service');
    const ApprovalService = require('./services/approval.service');
    const IncomingHandler = require('./services/incoming.handler');
    const AdminHandler = require('./services/admin.handler');
    const contactService = require('./services/contact.service');

    const senderService = new SenderService(whatsappService);
    const approvalService = new ApprovalService(whatsappService, senderService);
    const incomingHandler = new IncomingHandler(canvaAdapter, approvalService, contactService);
    const adminHandler = new AdminHandler(approvalService, whatsappService);

    // Set up incoming message handler
    const adminPhoneWid = (process.env.ADMIN_PHONE || '').replace('+', '') + '@c.us';
    whatsappService.onMessage(async (msg) => {
      try {
        if (msg.from === adminPhoneWid) {
          const handled = await adminHandler.process(msg);
          if (handled) return;
        }
        await incomingHandler.process(msg);
      } catch (err) {
        logger.error(`Message handler error: ${err.message}`);
      }
    });

    // Expire pending approvals every hour
    cron.schedule('0 * * * *', () => {
      approvalService.expirePending().catch((err) => {
        logger.error(`Approval expiry cron failed: ${err.message}`);
      });
    });

    logger.info('Auto-reply system initialized');
  })
  .catch((err) => {
    logger.error(`Failed to connect to database: ${err.message}`);
    process.exit(1);
  });

module.exports = { app, server };
