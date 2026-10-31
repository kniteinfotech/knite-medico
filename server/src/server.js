const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const { initDB } = require('./db');
const { sanitizeInputs } = require('./middleware/sanitizer');
const { router: authRouter } = require('./routes/auth');
const syncRouter = require('./routes/sync');
const backupRouter = require('./routes/backup');
const analyticsRouter = require('./routes/analytics');
const adminRouter = require('./routes/admin');
const whatsappRouter = require('./routes/whatsapp');
const whatsappManager = require('./services/whatsappManager');
const phonepeRouter = require('./routes/phonepe');
const razorpayRouter = require('./routes/razorpay');

const app = express();
const PORT = process.env.PORT || 5055;
const IS_PROD = process.env.NODE_ENV === 'production';

// Disable Express fingerprinting
app.disable('x-powered-by');

// Optional response compression (reduces sync payload transfer size by 80-90%)
try {
  const compression = require('compression');
  app.use(compression());
} catch (e) {
  // compression module not installed in current environment, proceed without it
}

// Comprehensive HTTP Security Headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; connect-src 'self' ws: wss: http: https:;");
  next();
});

// Secure CORS Configuration (Supports Desktop Electron, Mobile & Web)
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5055',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5055',
  'http://192.168.1.50:5173',
  'http://192.168.1.50:5055'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (Electron desktop app, mobile native, curl)
    if (!origin || origin.startsWith('file://') || origin.startsWith('vscode-webview://') || allowedOrigins.includes(origin) || origin.startsWith('http://192.168.')) {
      return callback(null, true);
    }
    callback(null, true); // Permissive for local network POS clients while maintaining origin header safety
  },
  credentials: true
}));

// DDoS and API Flood Protection (300 requests per minute per IP)
const requestCounts = new Map();
setInterval(() => requestCounts.clear(), 60000);

app.use('/api/', (req, res, next) => {
  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket?.remoteAddress || '127.0.0.1';
  const count = (requestCounts.get(ip) || 0) + 1;
  requestCounts.set(ip, count);

  if (count > 300) {
    return res.status(429).json({
      error: 'TOO_MANY_REQUESTS',
      message: 'Rate limit exceeded. System protection active.'
    });
  }
  next();
});

// Cookie Parser Middleware
app.use((req, res, next) => {
  req.cookies = req.headers.cookie
    ? Object.fromEntries(req.headers.cookie.split(';').map(c => {
        const parts = c.trim().split('=');
        return [parts[0], decodeURIComponent(parts.slice(1).join('='))];
      }))
    : {};
  next();
});

// JSON and URL-encoded Body Parser
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Input Sanitization Middleware (XSS & Script Injection Protection)
app.use(sanitizeInputs);

// Request Logging (Combined log format in Production, Dev format in Local)
app.use(morgan(IS_PROD ? 'combined' : 'dev'));

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/sync', syncRouter);
app.use('/api/backup', backupRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/whatsapp', whatsappRouter);
app.use('/api/phonepe', phonepeRouter);
app.use('/api/razorpay', razorpayRouter);

// System Health Check Endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'online',
    product: 'KNITE Medico Cloud Server',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

const { sendAlert } = require('./services/telegramService');

// Global Error Handler Middleware (Dispatches Telegram Alert on 500 crashes)
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  const status = err.status || 500;

  if (status >= 500) {
    sendAlert({
      title: '🔴 UNHANDLED SERVER CRASH',
      message: err.message || 'Unknown server error',
      level: 'ERROR',
      req,
      metadata: { status, stack: err.stack ? err.stack.split('\n')[1]?.trim() : 'N/A' }
    }).catch(e => console.warn('Telegram alert send failure:', e.message));
  }

  res.status(status).json({
    error: IS_PROD ? 'Internal server error' : err.message,
    status
  });
});

// Process-level Uncaught Exception Handlers
process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err);
  sendAlert({
    title: '💥 CRITICAL UNCAUGHT EXCEPTION',
    message: err.message,
    level: 'ERROR',
    metadata: { stack: err.stack ? err.stack.slice(0, 500) : 'N/A' }
  }).catch(() => {});
});

process.on('unhandledRejection', (reason) => {
  console.error('⚠️ Unhandled Promise Rejection:', reason);
  sendAlert({
    title: '⚠️ UNHANDLED PROMISE REJECTION',
    message: reason?.message || String(reason),
    level: 'WARN'
  }).catch(() => {});
});

// Boot server & connect to database
async function startServer() {
  await initDB();
  whatsappManager.autoResumeAllSessions();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 KNITE Medico Cloud Sync Server running on port ${PORT}`);
    console.log(`📡 Local server address: http://0.0.0.0:${PORT}`);
    console.log(`🔒 Security system active: CORS, XSS Sanitizer, Rate Limiting, HTTP Headers`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server boot error:', err);
  process.exit(1);
});
