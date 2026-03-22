const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const path = require('path');
const os = require('os');
const logger = require('../utils/logger');
const { getIO } = require('../websocket/socket');

const SESSION_PATH = path.join(os.homedir(), '.whatsapp-bot-session');
const MAX_RECONNECT_ATTEMPTS = 5;
const BASE_RECONNECT_DELAY = 5000;

class WhatsAppService {
  constructor() {
    this.client = null;
    this.status = 'disconnected';
    this.qrCode = null;
    this._onMessageCallback = null;
    this._reconnectAttempt = 0;
    this._initialized = false;
  }

  async initialize() {
    if (this._initialized && this.client) {
      logger.info('WhatsApp client already initialized');
      return;
    }

    this.client = new Client({
      authStrategy: new LocalAuth({ dataPath: SESSION_PATH }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-extensions',
          '--disable-default-apps',
          '--no-first-run',
          '--disable-background-networking',
          '--disable-sync',
          '--disable-translate',
        ],
      },
      webVersionCache: {
        type: 'local',
        path: path.join(SESSION_PATH, 'wwebjs_cache'),
      },
    });

    this.client.on('qr', async (qr) => {
      try {
        this.qrCode = await qrcode.toDataURL(qr, { width: 300 });
      } catch {
        this.qrCode = qr;
      }
      logger.info('WhatsApp QR code received');
      this._emit('whatsapp:qr', { qr: this.qrCode });
    });

    this.client.on('ready', () => {
      this.status = 'connected';
      this.qrCode = null;
      this._reconnectAttempt = 0;
      logger.info('WhatsApp client is ready');
      this._emit('whatsapp:status', { status: this.status });
    });

    this.client.on('authenticated', () => {
      logger.info('WhatsApp client authenticated (session restored)');
    });

    this.client.on('auth_failure', (msg) => {
      this.status = 'disconnected';
      this._initialized = false;
      logger.error(`WhatsApp authentication failure: ${msg}`);
      this._emit('whatsapp:status', { status: this.status });
    });

    this.client.on('disconnected', (reason) => {
      this.status = 'disconnected';
      this._initialized = false;
      logger.warn(`WhatsApp disconnected: ${reason}`);
      this._emit('whatsapp:status', { status: this.status });
      this._reconnect();
    });

    this.client.on('message', (message) => {
      if (this._onMessageCallback) {
        this._onMessageCallback(message);
      }
    });

    this._initialized = true;
  }

  async connect() {
    if (this.status === 'connected') {
      logger.info('WhatsApp already connected');
      return;
    }
    this.status = 'connecting';
    this._emit('whatsapp:status', { status: this.status });
    await this.client.initialize();
  }

  async disconnect() {
    if (this.client) {
      await this.client.destroy();
      this.client = null;
      this._initialized = false;
    }
    this.status = 'disconnected';
    this.qrCode = null;
    this._emit('whatsapp:status', { status: this.status });
  }

  getStatus() {
    return { status: this.status, qrCode: this.qrCode };
  }

  getQR() {
    return this.qrCode;
  }

  async sendMessage(chatId, content, options = {}) {
    return this.client.sendMessage(chatId, content, options);
  }

  async sendImage(chatId, imagePath, caption) {
    const media = MessageMedia.fromFilePath(imagePath);
    return this.sendMessage(chatId, media, { caption });
  }

  async getContacts() {
    return this.client.getContacts();
  }

  async getChats() {
    return this.client.getChats();
  }

  onMessage(callback) {
    this._onMessageCallback = callback;
  }

  _emit(event, data) {
    try {
      getIO().emit(event, data);
    } catch {
      // Socket not initialized yet
    }
  }

  async _reconnect() {
    if (this._reconnectAttempt >= MAX_RECONNECT_ATTEMPTS) {
      logger.error(`WhatsApp reconnect failed after ${MAX_RECONNECT_ATTEMPTS} attempts`);
      return;
    }

    this._reconnectAttempt++;
    const delay = BASE_RECONNECT_DELAY * Math.pow(2, this._reconnectAttempt - 1);
    logger.info(`WhatsApp reconnecting in ${delay}ms (attempt ${this._reconnectAttempt}/${MAX_RECONNECT_ATTEMPTS})`);

    await new Promise((resolve) => setTimeout(resolve, delay));

    try {
      await this.initialize();
      await this.connect();
    } catch (err) {
      logger.error(`WhatsApp reconnect attempt ${this._reconnectAttempt} failed: ${err.message}`);
      this._reconnect();
    }
  }
}

module.exports = new WhatsAppService();
