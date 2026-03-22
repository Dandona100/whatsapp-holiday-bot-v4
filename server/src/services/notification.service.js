const https = require('https');
const logger = require('../utils/logger');

function sendTelegram(message) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    logger.warn('Telegram notification skipped: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not configured');
    return Promise.resolve(null);
  }

  const payload = JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' });

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'api.telegram.org',
        path: `/bot${token}/sendMessage`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(JSON.parse(data));
          } else {
            logger.error(`Telegram API error ${res.statusCode}: ${data}`);
            reject(new Error(`Telegram API error: ${res.statusCode}`));
          }
        });
      }
    );

    req.on('error', (err) => {
      logger.error(`Telegram notification failed: ${err.message}`);
      reject(err);
    });

    req.write(payload);
    req.end();
  });
}

function notifyDisconnect() {
  return sendTelegram('⚠️ <b>WhatsApp Disconnected</b>\nThe WhatsApp client has lost connection. Please check the server.');
}

function notifyError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return sendTelegram(`🔴 <b>Error</b>\n<pre>${message}</pre>`);
}

module.exports = { sendTelegram, notifyDisconnect, notifyError };
