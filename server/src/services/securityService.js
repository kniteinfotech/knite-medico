const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const QRCode = require('qrcode');
const { pool } = require('../db');

// Dummy hash for constant-time comparison against timing attacks
const DUMMY_HASH = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

// ── In-Memory Rate Limiter for Login Protection ───────────────────────────────
// Window: 15 minutes (900,000 ms), Max attempts: 5 per IP / Email
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS_BEFORE_THROTTLE = 5;
const MAX_ATTEMPTS_BEFORE_LOCKOUT = 10;
const LOCKOUT_DURATION_MINUTES = 15;

const ipAttempts = new Map();     // ip -> { count, firstAttempt, lockedUntil }
const emailAttempts = new Map();  // email -> { count, firstAttempt, lockedUntil }

// Periodic cleanup of expired rate limit buckets (every 10 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of ipAttempts.entries()) {
    if (now - data.firstAttempt > RATE_LIMIT_WINDOW_MS && (!data.lockedUntil || now > data.lockedUntil)) {
      ipAttempts.delete(ip);
    }
  }
  for (const [email, data] of emailAttempts.entries()) {
    if (now - data.firstAttempt > RATE_LIMIT_WINDOW_MS && (!data.lockedUntil || now > data.lockedUntil)) {
      emailAttempts.delete(email);
    }
  }
}, 10 * 60 * 1000);

// Helper to extract clean client IP
function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.socket?.remoteAddress || '127.0.0.1';
}

// Helper to mask email for audit logs
function maskEmail(email) {
  if (!email || typeof email !== 'string') return 'anonymous';
  const parts = email.split('@');
  if (parts.length !== 2) return '***';
  const [user, domain] = parts;
  const maskedUser = user.length <= 2 ? user[0] + '***' : user[0] + '***' + user[user.length - 1];
  return `${maskedUser}@${domain}`;
}

const { sendAlert } = require('./telegramService');

// ── Topic 8: Structured Security Logging & Telegram Dispatch ─────────────────
async function logSecurityEvent({ eventType, email, req, metadata = {} }) {
  const ip = req ? getClientIp(req) : 'internal';
  const userAgent = req?.headers['user-agent'] || 'unknown';
  const masked = maskEmail(email);

  try {
    await pool.query(
      `INSERT INTO medico.security_logs (event_type, email_masked, ip_address, user_agent, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [eventType, masked, ip, userAgent, JSON.stringify(metadata)]
    );

    // Send instant Telegram alert for critical security threats
    const alertEvents = ['ACCOUNT_LOCKED', 'RATE_LIMITED', 'PERMISSION_DENIED', 'MFA_FAILED', 'DUPLICATE_REGISTRATION_ATTEMPT'];
    if (alertEvents.includes(eventType)) {
      sendAlert({
        title: `🚨 SECURITY ALERT: ${eventType}`,
        message: `Account protection triggered for email: ${masked}`,
        level: 'SECURITY',
        req,
        metadata: { event: eventType, email: masked, ...metadata }
      }).catch(e => console.warn('Telegram security alert failure:', e.message));
    }
  } catch (err) {
    console.error('Failed to log security event:', err.message);
  }
}

// ── Topic 1: Login Protection (Rate Limiting & Lockout Check) ─────────────────
function checkLoginRateLimit(req, email) {
  const ip = getClientIp(req);
  const cleanEmail = (email || '').toLowerCase().trim();
  const now = Date.now();

  // Check IP-level throttle
  const ipData = ipAttempts.get(ip) || { count: 0, firstAttempt: now, lockedUntil: null };
  if (ipData.lockedUntil && now < ipData.lockedUntil) {
    const remainingSec = Math.ceil((ipData.lockedUntil - now) / 1000);
    return {
      blocked: true,
      statusCode: 429,
      retryAfter: remainingSec,
      message: `Too many failed login attempts from this network. Please retry in ${Math.ceil(remainingSec / 60)} minute(s).`
    };
  }

  // Check Email-level throttle
  if (cleanEmail) {
    const mailData = emailAttempts.get(cleanEmail) || { count: 0, firstAttempt: now, lockedUntil: null };
    if (mailData.lockedUntil && now < mailData.lockedUntil) {
      const remainingSec = Math.ceil((mailData.lockedUntil - now) / 1000);
      return {
        blocked: true,
        statusCode: 429,
        retryAfter: remainingSec,
        message: `Account is temporarily protected. Please retry in ${Math.ceil(remainingSec / 60)} minute(s).`
      };
    }

    if (mailData.count >= MAX_ATTEMPTS_BEFORE_THROTTLE) {
      const windowRemaining = Math.max(1, Math.ceil((RATE_LIMIT_WINDOW_MS - (now - mailData.firstAttempt)) / 1000));
      return {
        blocked: true,
        statusCode: 429,
        retryAfter: windowRemaining,
        message: `Too many login attempts. Please wait ${Math.ceil(windowRemaining / 60)} minute(s) before retrying.`
      };
    }
  }

  return { blocked: false };
}

// Record a failed login attempt
async function recordFailedLogin(req, email, userRecord = null) {
  const ip = getClientIp(req);
  const cleanEmail = (email || '').toLowerCase().trim();
  const now = Date.now();

  // Update IP counter
  let ipData = ipAttempts.get(ip) || { count: 0, firstAttempt: now, lockedUntil: null };
  ipData.count += 1;
  if (ipData.count >= MAX_ATTEMPTS_BEFORE_LOCKOUT) {
    ipData.lockedUntil = now + (LOCKOUT_DURATION_MINUTES * 60 * 1000);
  }
  ipAttempts.set(ip, ipData);

  // Update Email counter
  let mailData = emailAttempts.get(cleanEmail) || { count: 0, firstAttempt: now, lockedUntil: null };
  mailData.count += 1;
  if (mailData.count >= MAX_ATTEMPTS_BEFORE_LOCKOUT) {
    mailData.lockedUntil = now + (LOCKOUT_DURATION_MINUTES * 60 * 1000);
  }
  emailAttempts.set(cleanEmail, mailData);

  // Database-backed lockout for registered accounts
  if (userRecord && userRecord.id) {
    const newFailCount = (userRecord.failed_login_attempts || 0) + 1;
    let lockUntilDate = null;
    if (newFailCount >= MAX_ATTEMPTS_BEFORE_LOCKOUT) {
      lockUntilDate = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000);
      await logSecurityEvent({
        eventType: 'ACCOUNT_LOCKED',
        email,
        req,
        metadata: { failed_attempts: newFailCount, lock_minutes: LOCKOUT_DURATION_MINUTES }
      });
    }

    await pool.query(
      `UPDATE medico.users 
       SET failed_login_attempts = $1, locked_until = $2 
       WHERE id = $3`,
      [newFailCount, lockUntilDate, userRecord.id]
    );
  }

  await logSecurityEvent({
    eventType: 'LOGIN_FAILED',
    email,
    req,
    metadata: { ip_attempts: ipData.count, email_attempts: mailData.count }
  });
}

// Clear attempts on successful login
async function recordSuccessfulLogin(req, userRecord) {
  const ip = getClientIp(req);
  const cleanEmail = (userRecord.username || '').toLowerCase().trim();

  ipAttempts.delete(ip);
  if (cleanEmail) emailAttempts.delete(cleanEmail);

  if (userRecord.id) {
    await pool.query(
      `UPDATE medico.users 
       SET failed_login_attempts = 0, locked_until = NULL 
       WHERE id = $1`,
      [userRecord.id]
    );
  }

  await logSecurityEvent({
    eventType: 'LOGIN_SUCCESS',
    email: userRecord.username,
    req,
    metadata: { user_id: userRecord.id, role: userRecord.role }
  });
}

// ── Topic 4: Timing-Safe Password Check ───────────────────────────────────────
async function timingSafePasswordCheck(plainPassword, userPasswordHash) {
  if (!userPasswordHash) {
    await bcrypt.compare(plainPassword, DUMMY_HASH);
    return false;
  }
  return await bcrypt.compare(plainPassword, userPasswordHash);
}

// ── Topic 5: Cryptographically Secure Tokens ─────────────────────────────────
function generateCryptoToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

function hashCryptoToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// ── Topic 6: Multi-Factor Authentication (RFC 6238 TOTP Native Engine) ───────
// Base32 helper for authenticator apps (Google Authenticator, Authy, Microsoft Authenticator)
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buffer) {
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

function base32Decode(str) {
  const cleanStr = str.replace(/=+$/, '').toUpperCase();
  let bits = 0;
  let value = 0;
  const bytes = [];

  for (let i = 0; i < cleanStr.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(cleanStr[i]);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

// Generate TOTP for timestamp and secret
function generateTOTP(secretBase32, timeStepSeconds = 30, timeOffset = 0) {
  const key = base32Decode(secretBase32);
  const epoch = Math.floor(Date.now() / 1000) + (timeOffset * timeStepSeconds);
  const counter = Math.floor(epoch / timeStepSeconds);

  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigInt64BE(BigInt(counter));

  const hmac = crypto.createHmac('sha1', key);
  hmac.update(counterBuf);
  const digest = hmac.digest();

  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  const otp = (binary % 1000000).toString().padStart(6, '0');
  return otp;
}

// Verify TOTP within ±1 time window (30-second leeway for clock drift)
function verifyTOTP(secretBase32, token) {
  if (!secretBase32 || !token) return false;
  const cleanToken = token.trim();
  if (cleanToken.length !== 6) return false;

  for (let offset = -1; offset <= 1; offset++) {
    const validCode = generateTOTP(secretBase32, 30, offset);
    if (crypto.timingSafeEqual(Buffer.from(cleanToken), Buffer.from(validCode))) {
      return true;
    }
  }
  return false;
}

// Generate new MFA setup payload
async function generateMFASetup(userEmail, issuer = 'KNITE Medico') {
  const randomSecretBytes = crypto.randomBytes(20);
  const secretBase32 = base32Encode(randomSecretBytes);
  const otpauthUrl = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(userEmail)}?secret=${secretBase32}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

  // Generate 8 single-use backup recovery codes
  const backupCodes = [];
  for (let i = 0; i < 8; i++) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    backupCodes.push(code.slice(0, 4) + '-' + code.slice(4));
  }

  return {
    secret: secretBase32,
    otpauthUrl,
    qrCodeDataUrl,
    backupCodes
  };
}

// ── Topic 9: Role-Based Access Control (RBAC) Middleware ─────────────────────
function requireRole(allowedRoles = []) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Verify session revocation via token_version check in DB
    try {
      const dbUserRes = await pool.query(
        'SELECT id, role, token_version FROM medico.users WHERE id = $1',
        [req.user.user_id]
      );

      if (dbUserRes.rows.length === 0) {
        return res.status(401).json({ error: 'User account not found' });
      }

      const dbUser = dbUserRes.rows[0];
      if (req.user.token_version && dbUser.token_version !== req.user.token_version) {
        return res.status(401).json({ error: 'Session has been invalidated. Please log in again.' });
      }

      const userRole = (dbUser.role || req.user.role || 'user').toLowerCase();
      const normalizedAllowed = allowedRoles.map(r => r.toLowerCase());

      if (normalizedAllowed.length > 0 && !normalizedAllowed.includes(userRole)) {
        await logSecurityEvent({
          eventType: 'PERMISSION_DENIED',
          email: req.user.email,
          req,
          metadata: { user_role: userRole, required_roles: allowedRoles, url: req.originalUrl }
        });
        return res.status(403).json({ error: 'Access forbidden: Insufficient administrative privileges' });
      }

      req.currentUser = dbUser;
      next();
    } catch (err) {
      console.error('RBAC error:', err);
      return res.status(500).json({ error: 'Authorization verification failed' });
    }
  };
}

module.exports = {
  getClientIp,
  maskEmail,
  logSecurityEvent,
  checkLoginRateLimit,
  recordFailedLogin,
  recordSuccessfulLogin,
  timingSafePasswordCheck,
  generateCryptoToken,
  hashCryptoToken,
  generateMFASetup,
  verifyTOTP,
  requireRole,
};
