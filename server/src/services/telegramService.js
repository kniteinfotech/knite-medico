/**
 * Telegram Instant Alerting Service for KNITE Medico SaaS
 * Sends real-time error notifications, security alerts, and system crash reports to Admin Telegram.
 */

const https = require('https');

// Helper to send HTTP POST request to Telegram Bot API (No extra npm dependencies needed)
function sendTelegramMessage(botToken, chatId, textMessage) {
  return new Promise((resolve, reject) => {
    if (!botToken || !chatId) {
      return resolve({ success: false, reason: 'TELEGRAM_NOT_CONFIGURED' });
    }

    const payload = JSON.stringify({
      chat_id: chatId,
      text: textMessage,
      parse_mode: 'HTML',
      disable_web_page_preview: true
    });

    const options = {
      hostname: 'api.telegram.org',
      port: 443,
      path: `/bot${botToken}/sendMessage`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      },
      timeout: 8000
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (json.ok) {
            resolve({ success: true, result: json.result });
          } else {
            console.warn('⚠️ Telegram API returned error:', json.description);
            resolve({ success: false, reason: json.description });
          }
        } catch (e) {
          resolve({ success: false, reason: 'JSON_PARSE_ERROR' });
        }
      });
    });

    req.on('error', (err) => {
      console.warn('⚠️ Telegram dispatch connection error:', err.message);
      resolve({ success: false, reason: err.message });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ success: false, reason: 'TIMEOUT' });
    });

    req.write(payload);
    req.end();
  });
}

/**
 * Dispatch real-time alert to Telegram Chat
 * @param {Object} options
 * @param {string} options.title - Alert headline (e.g., "🔴 CRITICAL SERVER ERROR")
 * @param {string} options.message - Main message or stack trace
 * @param {string} [options.level='ERROR'] - 'INFO', 'WARN', 'ERROR', 'SECURITY', 'PAYMENT'
 * @param {Object} [options.req] - Express request object (optional)
 * @param {Object} [options.metadata] - Key-value pair details
 */
async function sendAlert({ title, message, level = 'ERROR', req = null, metadata = {} }) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    // Graceful fallback when Telegram bot token is not configured yet
    return { success: false, reason: 'TELEGRAM_NOT_CONFIGURED' };
  }

  const emoji = level === 'SECURITY' ? '🚨' : level === 'PAYMENT' ? '💳' : level === 'WARN' ? '⚠️' : '🔴';
  const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  let text = `${emoji} <b>[KNITE Medico SaaS Alert]</b>\n`;
  text += `<b>Type:</b> ${title}\n`;
  text += `<b>Time:</b> ${timestamp}\n`;

  if (req) {
    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket?.remoteAddress || '127.0.0.1';
    text += `<b>Endpoint:</b> <code>${req.method} ${req.originalUrl || req.url}</code>\n`;
    text += `<b>IP Address:</b> <code>${ip}</code>\n`;
  }

  if (metadata && Object.keys(metadata).length > 0) {
    text += `<b>Details:</b>\n`;
    for (const [k, v] of Object.entries(metadata)) {
      text += ` • <b>${k}:</b> <code>${typeof v === 'object' ? JSON.stringify(v) : v}</code>\n`;
    }
  }

  if (message) {
    const cleanMsg = String(message).replace(/</g, '&lt;').replace(/>/g, '&gt;').slice(0, 800);
    text += `\n<b>Error Message:</b>\n<pre>${cleanMsg}</pre>`;
  }

  return await sendTelegramMessage(botToken, chatId, text);
}

module.exports = {
  sendAlert,
  sendTelegramMessage
};
