const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const {
  getClientIp,
  logSecurityEvent,
  checkLoginRateLimit,
  recordFailedLogin,
  recordSuccessfulLogin,
  timingSafePasswordCheck,
  generateCryptoToken,
  hashCryptoToken,
  generateMFASetup,
  verifyTOTP,
  requireRole
} = require('../services/securityService');
const { ensureShopHddFolder } = require('../services/backupStorageService');

const JWT_SECRET = process.env.JWT_SECRET || 'KNITE_MEDICO_SUPER_SECRET_KEY_2026';

// ─── Free User Whitelist (Strictly nitheesh8797@gmail.com) ───────────────────
function isFreeUser(email) {
  const mail = (email || '').toLowerCase().trim();
  return mail === 'nitheesh8797@gmail.com';
}

// ── Helper to extract cookie token or Bearer header ──────────────────────────
function extractToken(req) {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }
  // Check cookie (HttpOnly session cookie)
  if (req.headers.cookie) {
    const cookies = Object.fromEntries(
      req.headers.cookie.split(';').map(c => {
        const parts = c.trim().split('=');
        return [parts[0], decodeURIComponent(parts.slice(1).join('='))];
      })
    );
    if (cookies.knite_session) return cookies.knite_session;
  }
  return null;
}

// ── Topic 3: Session Authentication Middleware ───────────────────────────────
async function authenticateToken(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  jwt.verify(token, JWT_SECRET, async (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Session expired or invalid token' });
    }

    try {
      // Validate that session has not been revoked via token_version
      const userRes = await pool.query(
        'SELECT id, tenant_id, username, role, token_version, locked_until FROM medico.users WHERE id = $1',
        [decoded.user_id]
      );

      if (userRes.rows.length === 0) {
        return res.status(401).json({ error: 'User account no longer exists' });
      }

      const user = userRes.rows[0];

      // Session revocation check (e.g. password changed)
      if (decoded.token_version && user.token_version !== decoded.token_version) {
        return res.status(401).json({ error: 'Session invalidated due to password change. Please log in again.' });
      }

      // Check account lockout
      if (user.locked_until && new Date() < new Date(user.locked_until)) {
        return res.status(429).json({ error: 'Account is temporarily locked. Please try again later.' });
      }

      req.user = {
        ...decoded,
        role: user.role,
        token_version: user.token_version
      };
      next();
    } catch (dbErr) {
      console.error('Session verification error:', dbErr);
      return res.status(500).json({ error: 'Session verification failure' });
    }
  });
}

const crypto = require('crypto');

// In-memory rate limiting & attempt tracking for OTP security
const otpRateLimits = new Map(); // ip_email -> { count, firstAttempt }
const otpFailedAttempts = new Map(); // email -> count

// ── Topic 2: Send Registration OTP from kniteinfotech@gmail.com ─────────────
router.post('/send-registration-otp', async (req, res) => {
  const { email, shop_name } = req.body;
  if (!email) return res.status(400).json({ error: 'Email address is required' });

  const cleanEmail = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    return res.status(400).json({ error: 'Please enter a valid email address' });
  }

  // Rate Limiting: Max 3 OTP requests per 10 minutes per IP/Email
  const clientIp = getClientIp(req);
  const rateLimitKey = `${clientIp}_${cleanEmail}`;
  const now = Date.now();
  const limitData = otpRateLimits.get(rateLimitKey) || { count: 0, firstAttempt: now };

  if (now - limitData.firstAttempt < 10 * 60 * 1000) {
    if (limitData.count >= 3) {
      return res.status(429).json({ 
        error: 'Too many OTP requests. For security, please wait 10 minutes before requesting a new code.' 
      });
    }
    limitData.count += 1;
    otpRateLimits.set(rateLimitKey, limitData);
  } else {
    otpRateLimits.set(rateLimitKey, { count: 1, firstAttempt: now });
  }

  // If already free whitelist user
  if (isFreeUser(cleanEmail)) {
    return res.json({
      success: true,
      message: 'Master developer bypass active for ' + cleanEmail,
      is_free_user: true
    });
  }

  try {
    // Check if email already registered
    const existing = await pool.query('SELECT id FROM medico.tenants WHERE LOWER(email) = $1', [cleanEmail]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists. Please login instead.' });
    }

    // Cryptographically secure 6-digit numeric OTP (CSPRNG)
    const otpCode = crypto.randomInt(100000, 1000000).toString();
    const tokenHash = hashCryptoToken(otpCode);

    // Save in email_verifications with 10-minute expiry
    await pool.query(
      `INSERT INTO medico.email_verifications (email, token_hash, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '10 minutes')`,
      [cleanEmail, tokenHash]
    );

    // Reset failed attempt counter for fresh OTP
    otpFailedAttempts.delete(cleanEmail);

    const emailService = require('../services/emailService');
    await emailService.sendRegistrationOTP(cleanEmail, otpCode, shop_name);

    console.log(`🔐 [Registration OTP] Sent secure OTP to ${cleanEmail} from kniteinfotech@gmail.com`);

    res.json({
      success: true,
      message: `Verification OTP has been sent from kniteinfotech@gmail.com to ${cleanEmail}. Check your inbox or spam folder.`
    });
  } catch (err) {
    console.error('Error sending registration OTP:', err);
    res.status(500).json({ error: 'Failed to send OTP. Please try again.' });
  }
});

// ── Topic 2 & 7: Signup / Registration (Anti-Enumeration, OTP & Validation) ──
router.post('/register', async (req, res) => {
  const { shop_name, owner_name, email, phone, password, dl_number, gstin, address, plan_type, otp_code } = req.body;

  // Server-side strict input validation
  if (!shop_name || !owner_name || !email || !password) {
    return res.status(400).json({ error: 'Shop name, proprietor name, email, and password are required' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    return res.status(400).json({ error: 'Please provide a valid email address' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long for security' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Anti-Enumeration Check
    const existing = await client.query('SELECT id, status FROM medico.tenants WHERE LOWER(email) = $1', [cleanEmail]);
    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      await logSecurityEvent({
        eventType: 'DUPLICATE_REGISTRATION_ATTEMPT',
        email: cleanEmail,
        req,
        metadata: { shop_name }
      });
      return res.status(409).json({
        error: 'An account with this email address already exists. Please log in or contact support.'
      });
    }

    // OTP Verification (Strict requirement for all users except nitheesh8797@gmail.com)
    if (!isFreeUser(cleanEmail)) {
      if (!otp_code) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Email verification OTP is required. Click "Send OTP" to receive your code.' });
      }

      // Check anti-brute-force limit (Max 5 failed attempts per email)
      const currentFails = otpFailedAttempts.get(cleanEmail) || 0;
      if (currentFails >= 5) {
        await client.query('DELETE FROM medico.email_verifications WHERE email = $1', [cleanEmail]);
        await client.query('ROLLBACK');
        return res.status(429).json({ 
          error: 'Maximum OTP verification attempts exceeded. Your verification code has been revoked. Please request a new OTP.' 
        });
      }

      const otpHash = hashCryptoToken(otp_code.trim());
      const verRes = await client.query(
        `SELECT id FROM medico.email_verifications
         WHERE email = $1 AND token_hash = $2 AND expires_at > NOW() AND verified = false
         ORDER BY created_at DESC LIMIT 1`,
        [cleanEmail, otpHash]
      );

      if (verRes.rows.length === 0) {
        otpFailedAttempts.set(cleanEmail, currentFails + 1);
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          error: `Invalid or expired OTP (${4 - currentFails} attempts remaining). Please check the code sent from kniteinfotech@gmail.com.` 
        });
      }

      // Mark OTP as verified & reset failed counter
      otpFailedAttempts.delete(cleanEmail);
      await client.query('UPDATE medico.email_verifications SET verified = true WHERE id = $1', [verRes.rows[0].id]);
    }

    const tenantId = 'store_' + generateCryptoToken(6);
    const userId = 'usr_' + generateCryptoToken(6);
    const licenseKey = 'KNITE-' + generateCryptoToken(3).toUpperCase() + '-' + generateCryptoToken(3).toUpperCase() + '-' + generateCryptoToken(3).toUpperCase();
    const passwordHash = await bcrypt.hash(password, 12);

    const isWhitelistedFree = isFreeUser(cleanEmail);
    const initialStatus = isWhitelistedFree ? 'APPROVED' : 'PENDING_PAYMENT';
    const chosenPlan = 'cloud_900';
    const planExpiresAt = isWhitelistedFree 
      ? new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString()
      : null; // Must pay monthly subscription to activate

    // Create Tenant record
    await client.query(
      `INSERT INTO medico.tenants (
        id, shop_name, owner_name, email, phone, dl_number, gstin, address, license_key, plan_type, status, plan_expires_at, trial_used
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true)`,
      [
        tenantId,
        shop_name.trim().slice(0, 255),
        owner_name.trim().slice(0, 255),
        cleanEmail,
        phone ? phone.trim().slice(0, 32) : '',
        dl_number ? dl_number.trim().slice(0, 100) : '',
        gstin ? gstin.trim().slice(0, 100) : '',
        address ? address.trim().slice(0, 1000) : '',
        licenseKey,
        chosenPlan,
        initialStatus,
        planExpiresAt
      ]
    );

    // Create User record
    await client.query(
      `INSERT INTO medico.users (id, tenant_id, username, password_hash, role, token_version, email_verified)
       VALUES ($1, $2, $3, $4, 'admin', 1, true)`,
      [userId, tenantId, cleanEmail, passwordHash]
    );

    await client.query('COMMIT');

    // Create dedicated shop folder on 1 TB HDD (e.g. /data/backups/nitheesh kadai)
    try {
      ensureShopHddFolder(shop_name.trim(), {
        tenant_id: tenantId,
        owner_name: owner_name.trim(),
        email: cleanEmail,
        phone: phone ? phone.trim() : '',
        plan_type: chosenPlan,
        registered_at: new Date().toISOString()
      });
    } catch (hddErr) {
      console.warn('HDD folder creation warning:', hddErr.message);
    }

    await logSecurityEvent({
      eventType: 'REGISTRATION_SUCCESS',
      email: cleanEmail,
      req,
      metadata: { tenant_id: tenantId, shop_name, isWhitelistedFree, is_trial: !isWhitelistedFree }
    });

    // Send Store Registration Confirmation Email with Trial Notice
    try {
      const emailService = require('../services/emailService');
      emailService.sendRegistrationConfirmationEmail({
        toEmail: cleanEmail,
        shopName: shop_name.trim(),
        ownerName: owner_name.trim(),
        status: initialStatus,
        licenseKey: licenseKey,
        isTrial: !isWhitelistedFree,
        trialExpiresAt
      }).catch(e => console.warn('Registration confirmation email dispatch warning:', e.message));
    } catch (e) {}

    // Issue JWT Token immediately so user can enter dashboard with 1-Day Free Trial
    const token = jwt.sign(
      { tenant_id: tenantId, user_id: userId, email: cleanEmail, shop_name, token_version: 1 },
      JWT_SECRET,
      { expiresIn: isWhitelistedFree ? '30d' : '1d' }
    );

    res.cookie('knite_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: isWhitelistedFree ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000
    });

    return res.status(201).json({
      success: true,
      token,
      requiresPayment: !isWhitelistedFree,
      message: isWhitelistedFree 
        ? 'Welcome! Store activated with developer lifetime access.'
        : 'Welcome! Account created successfully. Complete your ₹900/mo subscription payment to activate POS.',
      tenant: {
        id: tenantId,
        shop_name,
        owner_name,
        email: cleanEmail,
        phone,
        dl_number,
        gstin,
        address,
        license_key: licenseKey,
        plan_type: chosenPlan,
        status: initialStatus,
        is_trial: false,
        plan_expires_at: planExpiresAt
      }
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Registration server error:', err);
    res.status(500).json({ error: 'Unable to process registration at this time. Please try again.' });
  } finally {
    client.release();
  }
});

// ── Topic 2: Email Verification Endpoint ─────────────────────────────────────
router.post('/verify-email', async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Verification token required' });

  try {
    const tokenHash = hashCryptoToken(token);
    const verRes = await pool.query(
      `SELECT id, email FROM medico.email_verifications 
       WHERE token_hash = $1 AND expires_at > NOW() AND verified = false`,
      [tokenHash]
    );

    if (verRes.rows.length === 0) {
      return res.status(400).json({ error: 'Verification link is invalid or has expired (24h limit).' });
    }

    const { email } = verRes.rows[0];
    await pool.query('UPDATE medico.email_verifications SET verified = true WHERE id = $1', [verRes.rows[0].id]);
    await pool.query('UPDATE medico.users SET email_verified = true WHERE LOWER(username) = LOWER($1)', [email]);

    await logSecurityEvent({ eventType: 'EMAIL_VERIFIED', email, req });

    res.json({ success: true, message: 'Email verified successfully! You may now sign in.' });
  } catch (err) {
    console.error('Email verification error:', err);
    res.status(500).json({ error: 'Failed to verify email' });
  }
});

// ── Topic 1 & 4: Login Protection with Rate Limiting, Lockout & Generic Errors ─
router.post('/login', async (req, res) => {
  const { email, password, mfa_code } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  const cleanEmail = email.trim().toLowerCase();

  // 1. Check Rate Limit (5 attempts / 15m)
  const rateLimitStatus = checkLoginRateLimit(req, cleanEmail);
  if (rateLimitStatus.blocked) {
    res.setHeader('Retry-After', rateLimitStatus.retryAfter);
    await logSecurityEvent({
      eventType: 'RATE_LIMITED',
      email: cleanEmail,
      req,
      metadata: { retry_after: rateLimitStatus.retryAfter }
    });
    return res.status(429).json({ error: rateLimitStatus.message });
  }

  try {
    const userRes = await pool.query(
      `SELECT u.id, u.tenant_id, u.username, u.password_hash, u.role, u.token_version,
              u.failed_login_attempts, u.locked_until, u.mfa_enabled, u.mfa_secret, u.mfa_backup_codes,
              t.shop_name, t.owner_name, t.phone, t.dl_number, t.gstin, t.address,
              t.license_key, t.plan_type, t.plan_expires_at, t.status, t.trial_used
       FROM medico.users u
       JOIN medico.tenants t ON u.tenant_id = t.id
       WHERE LOWER(u.username) = LOWER($1)`,
      [cleanEmail]
    );

    const user = userRes.rows[0];

    // Check if account is locked in DB
    if (user && user.locked_until && new Date() < new Date(user.locked_until)) {
      const waitMinutes = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
      return res.status(429).json({
        error: `Account is locked due to consecutive failed attempts. Please retry in ${waitMinutes} minute(s).`
      });
    }

    // 2. Timing-safe password verification (constant-time response)
    const isPasswordValid = await timingSafePasswordCheck(password, user ? user.password_hash : null);

    if (!user || !isPasswordValid) {
      await recordFailedLogin(req, cleanEmail, user || null);
      // Strictly generic message: never disclose if email or password was wrong
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // 3. Multi-Factor Authentication Check (Topic 6)
    if (user.mfa_enabled) {
      if (!mfa_code) {
        return res.status(200).json({
          mfa_required: true,
          message: 'Two-factor authentication code required. Please enter 6-digit TOTP code.'
        });
      }

      // Check TOTP code
      const isMfaValid = verifyTOTP(user.mfa_secret, mfa_code);
      let isBackupCodeValid = false;

      // Check backup codes if TOTP fails
      if (!isMfaValid && user.mfa_backup_codes) {
        const backupCodes = Array.isArray(user.mfa_backup_codes) ? user.mfa_backup_codes : JSON.parse(user.mfa_backup_codes);
        const codeIndex = backupCodes.indexOf(mfa_code.trim().toUpperCase());
        if (codeIndex !== -1) {
          isBackupCodeValid = true;
          // Consume single-use backup code
          backupCodes.splice(codeIndex, 1);
          await pool.query('UPDATE medico.users SET mfa_backup_codes = $1 WHERE id = $2', [JSON.stringify(backupCodes), user.id]);
        }
      }

      if (!isMfaValid && !isBackupCodeValid) {
        await logSecurityEvent({ eventType: 'MFA_FAILED', email: cleanEmail, req });
        return res.status(401).json({ error: 'Invalid 2FA authentication code' });
      }
    }

    // 4. Auto-upgrade whitelisted user (Strictly nitheesh8797@gmail.com)
    if (isFreeUser(user.username)) {
      await pool.query(
        `UPDATE medico.tenants
         SET plan_type = 'pro_cloud',
             status = 'APPROVED',
             plan_expires_at = NOW() + INTERVAL '100 years',
             cloud_storage_limit_mb = 999999,
             updated_at = NOW()
         WHERE id = $1`,
        [user.tenant_id]
      );
      user.plan_type = 'pro_cloud';
      user.status = 'APPROVED';
      user.plan_expires_at = new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString();
    } else {
      // 5. Payment & Access Control
      if (user.status === 'PENDING_PAYMENT') {
        return res.status(403).json({
          error: 'PAYMENT_REQUIRED',
          requiresPayment: true,
          tenant: {
            id: user.tenant_id,
            shop_name: user.shop_name,
            owner_name: user.owner_name,
            email: user.username,
            phone: user.phone,
            dl_number: user.dl_number,
            gstin: user.gstin,
            plan_type: user.plan_type || 'cloud_799',
            status: 'PENDING_PAYMENT',
            is_trial: Boolean(user.trial_used)
          },
          message: 'Subscription payment required to access KNITE Medico SaaS. Please subscribe to continue (₹799/month).'
        });
      }

      // Check subscription / 1-Day Trial expiration with 1-day grace period
      if (user.plan_expires_at) {
        const expiryTime = new Date(user.plan_expires_at).getTime();
        const nowTime = Date.now();
        const isPaid = ['cloud_900', 'pro_cloud', 'cloud_799', 'pos_599', 'local_599', 'pos_basic', 'enterprise', 'enterprise_1299', 'enterprise_1499'].includes(user.plan_type);
        const isTrialExpired = !isPaid;

        if (nowTime > expiryTime) {
          // 1 day (24 hours) grace period for paid monthly subscriptions (0 for 1-day free trial)
          const GRACE_PERIOD_MS = isTrialExpired ? 0 : 1 * 24 * 60 * 60 * 1000;
          const graceEndTime = expiryTime + GRACE_PERIOD_MS;

          if (nowTime < graceEndTime) {
            // User is currently within the 1-day grace period! Allow login with warning
            const daysRemaining = Math.max(1, Math.ceil((graceEndTime - nowTime) / (1000 * 60 * 60 * 24)));
            user.in_grace_period = true;
            user.grace_days_left = daysRemaining;
            user.grace_end = new Date(graceEndTime).toISOString();
            console.log(`⏳ User ${cleanEmail} logged in during 1-day grace period (${daysRemaining} day left)`);
          } else {
            // Past 1-day grace period — access blocked
            return res.status(403).json({
              error: 'SUBSCRIPTION_EXPIRED',
              requiresPayment: true,
              isTrialExpired,
              inGracePeriod: false,
              tenant: {
                id: user.tenant_id,
                shop_name: user.shop_name,
                owner_name: user.owner_name,
                email: user.username,
                phone: user.phone,
                plan_type: user.plan_type || 'cloud_799',
                status: 'EXPIRED',
                is_trial: isTrialExpired,
                plan_expires_at: user.plan_expires_at
              },
              message: isTrialExpired
                ? 'Your 1-day free trial has expired. Please subscribe to Pro Cloud (₹799/month) to keep cloud services active.'
                : 'Your monthly subscription has expired and the 1-day grace period has ended. Please renew via Razorpay to continue access.'
            });
          }
        }
      }
    }

    // 6. Check Approval Status
    if (user.status === 'PENDING_APPROVAL') {
      return res.status(403).json({
        error: 'ACCOUNT_PENDING_APPROVAL',
        pendingApproval: true,
        message: 'Your pharmacy store registration is currently awaiting verification by KNITE Infotech.'
      });
    }

    if (user.status === 'REJECTED') {
      return res.status(403).json({
        error: 'ACCOUNT_REJECTED',
        message: 'Registration was declined by compliance administration. Contact kniteinfotech@gmail.com.'
      });
    }

    if (user.status === 'SUSPENDED') {
      return res.status(403).json({
        error: 'ACCOUNT_SUSPENDED',
        message: 'Account suspended. Please renew subscription or contact kniteinfotech@gmail.com.'
      });
    }

    // 6. Record Successful Login
    await recordSuccessfulLogin(req, user);

    // 7. Topic 3: Issue Secure JWT & Set HttpOnly Cookie
    const tokenVersion = user.token_version || 1;
    const token = jwt.sign(
      {
        tenant_id: user.tenant_id,
        user_id: user.id,
        email: user.username,
        shop_name: user.shop_name,
        role: user.role,
        token_version: tokenVersion
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Set HttpOnly, Secure, SameSite=Strict cookie
    res.cookie('knite_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000
    });

    const PAID_PLANS = ['cloud_900', 'pro_cloud', 'cloud_799', 'pos_599', 'local_599', 'pos_basic', 'enterprise', 'enterprise_1299', 'enterprise_1499'];
    const isPaidPlan = PAID_PLANS.includes(user.plan_type);
    const isTrialUser = !isPaidPlan && (user.plan_type === 'trial' || user.plan_type === 'free_trial' || Boolean(user.trial_used));

    res.json({
      success: true,
      token,
      tenant: {
        id: user.tenant_id,
        shop_name: user.shop_name,
        owner_name: user.owner_name,
        email: user.username,
        phone: user.phone,
        dl_number: user.dl_number,
        gstin: user.gstin,
        address: user.address,
        license_key: user.license_key,
        plan_type: user.plan_type,
        status: user.status,
        mfa_enabled: !!user.mfa_enabled,
        is_trial: isTrialUser,
        plan_expires_at: user.plan_expires_at,
        in_grace_period: Boolean(user.in_grace_period),
        grace_days_left: user.grace_days_left || 0,
        grace_end: user.grace_end || null
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Authentication service temporarily unavailable' });
  }
});

// ── Topic 5: Password Reset Security with 6-Digit Email OTP ─────────────────
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  const cleanEmail = email.trim().toLowerCase();

  try {
    const userRes = await pool.query(
      `SELECT id FROM medico.users WHERE LOWER(username) = LOWER($1)`,
      [cleanEmail]
    );

    // Generic response for anti-enumeration security
    const genericResponse = {
      success: true,
      message: `If an account is associated with ${cleanEmail}, a 6-digit OTP code has been dispatched to your email address.`
    };

    if (userRes.rows.length === 0) {
      return res.json(genericResponse);
    }

    const userId = userRes.rows[0].id;

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const tokenHash = hashCryptoToken(otpCode);

    // Invalidate previous unused reset OTPs for this user
    await pool.query(
      `UPDATE medico.password_resets SET used = true WHERE user_id = $1 AND used = false`,
      [userId]
    );

    // Store hashed OTP with strict 15-minute expiry
    await pool.query(
      `INSERT INTO medico.password_resets (user_id, token_hash, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '15 minutes')`,
      [userId, tokenHash]
    );

    // Dispatch 6-Digit OTP Email asynchronously (non-blocking)
    const emailService = require('../services/emailService');
    emailService.sendPasswordResetOTP(cleanEmail, otpCode).catch(err => {
      console.error('Failed to send Password Reset OTP email:', err);
    });

    await logSecurityEvent({
      eventType: 'PASSWORD_RESET_OTP_SENT',
      email: cleanEmail,
      req,
      metadata: { user_id: userId }
    });

    return res.json({
      ...genericResponse,
      otp_sent: true,
      expires_in_minutes: 15
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Password recovery request failed' });
  }
});

router.post('/reset-password', async (req, res) => {
  const { email, otp, token, new_password } = req.body;
  const otpCode = (otp || token || '').trim();

  if (!otpCode || !new_password) {
    return res.status(400).json({ error: '6-digit OTP code and new password are required' });
  }

  if (new_password.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters long' });
  }

  const tokenHash = hashCryptoToken(otpCode);

  try {
    let sql = `SELECT pr.id, pr.user_id 
               FROM medico.password_resets pr
               JOIN medico.users u ON pr.user_id = u.id
               WHERE pr.token_hash = $1 AND pr.expires_at > NOW() AND pr.used = false`;
    const params = [tokenHash];

    if (email && email.trim()) {
      params.push(email.trim().toLowerCase());
      sql += ` AND LOWER(u.username) = LOWER($2)`;
    }

    const resetRes = await pool.query(sql, params);

    if (resetRes.rows.length === 0) {
      return res.status(400).json({
        error: 'Invalid or expired 6-digit OTP code. Please request a new OTP.'
      });
    }

    const { id: resetId, user_id: userId } = resetRes.rows[0];
    const newHash = await bcrypt.hash(new_password, 12);

    // 1. Mark OTP used immediately
    await pool.query('UPDATE medico.password_resets SET used = true WHERE id = $1', [resetId]);

    // 2. Update password AND increment token_version (Invalidate all existing sessions!)
    const userRes = await pool.query(
      `UPDATE medico.users 
       SET password_hash = $1, 
           token_version = token_version + 1,
           failed_login_attempts = 0,
           locked_until = NULL
       WHERE id = $2 
       RETURNING username`,
      [newHash, userId]
    );

    const updatedUser = userRes.rows[0];
    await logSecurityEvent({
      eventType: 'PASSWORD_RESET_SUCCESS',
      email: updatedUser ? updatedUser.username : 'user',
      req,
      metadata: { user_id: userId, sessions_invalidated: true }
    });

    res.json({
      success: true,
      message: 'Password successfully updated! All existing sessions have been terminated. Please log in with your new password.'
    });
  } catch (err) {
    console.error('Password reset execution error:', err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// ── Topic 6: Multi-Factor Authentication (TOTP Setup & Verification) ──────────
router.post('/mfa/setup', authenticateToken, async (req, res) => {
  try {
    const userEmail = req.user.email;
    const mfaSetup = await generateMFASetup(userEmail, 'KNITE Medico');

    // Save temporary secret to user record
    await pool.query(
      `UPDATE medico.users 
       SET mfa_secret = $1, mfa_backup_codes = $2 
       WHERE id = $3`,
      [mfaSetup.secret, JSON.stringify(mfaSetup.backupCodes), req.user.user_id]
    );

    await logSecurityEvent({
      eventType: 'MFA_SETUP_INITIATED',
      email: userEmail,
      req
    });

    res.json({
      success: true,
      secret: mfaSetup.secret,
      qr_code: mfaSetup.qrCodeDataUrl,
      backup_codes: mfaSetup.backupCodes,
      instructions: 'Scan this QR code with Google Authenticator or Microsoft Authenticator, then enter the 6-digit code to activate.'
    });
  } catch (err) {
    console.error('MFA setup error:', err);
    res.status(500).json({ error: 'Failed to initiate MFA setup' });
  }
});

router.post('/mfa/activate', authenticateToken, async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: '6-digit code required' });

  try {
    const userRes = await pool.query(
      'SELECT mfa_secret FROM medico.users WHERE id = $1',
      [req.user.user_id]
    );

    const secret = userRes.rows[0]?.mfa_secret;
    if (!secret) {
      return res.status(400).json({ error: 'MFA setup not initialized. Run /mfa/setup first.' });
    }

    const isValid = verifyTOTP(secret, code);
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid verification code. Please check your authenticator clock.' });
    }

    await pool.query('UPDATE medico.users SET mfa_enabled = true WHERE id = $1', [req.user.user_id]);

    await logSecurityEvent({
      eventType: 'MFA_ACTIVATED',
      email: req.user.email,
      req
    });

    res.json({
      success: true,
      message: '✅ Two-factor authentication activated! Your account is now protected.'
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to activate MFA' });
  }
});

router.post('/mfa/disable', authenticateToken, async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Current password required to disable 2FA' });

  try {
    const userRes = await pool.query('SELECT password_hash FROM medico.users WHERE id = $1', [req.user.user_id]);
    const isValid = await bcrypt.compare(password, userRes.rows[0]?.password_hash || '');
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    await pool.query(
      `UPDATE medico.users 
       SET mfa_enabled = false, mfa_secret = NULL, mfa_backup_codes = '[]' 
       WHERE id = $1`,
      [req.user.user_id]
    );

    await logSecurityEvent({
      eventType: 'MFA_DISABLED',
      email: req.user.email,
      req
    });

    res.json({ success: true, message: 'Two-factor authentication disabled' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to disable MFA' });
  }
});

// ── Topic: Activate 1-Day Free Trial On Demand ──────────────────────────────
router.post('/start-trial', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email address is required' });

  const cleanEmail = email.trim().toLowerCase();

  try {
    const userRes = await pool.query(
      `SELECT u.id, u.tenant_id, u.username,
              t.shop_name, t.owner_name, t.phone, t.dl_number, t.gstin, t.address,
              t.license_key, t.plan_type, t.plan_expires_at, t.status, t.trial_used
       FROM medico.users u
       JOIN medico.tenants t ON u.tenant_id = t.id
       WHERE LOWER(u.username) = LOWER($1)`,
      [cleanEmail]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'Account not found for this email address' });
    }

    const user = userRes.rows[0];

    // Check if free trial was already used and is expired
    if (user.trial_used && user.plan_expires_at && new Date(user.plan_expires_at) < new Date()) {
      return res.status(400).json({ 
        error: 'Free trial has already been used for this account. Please select a subscription plan.' 
      });
    }

    const trialExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await pool.query(
      `UPDATE medico.tenants
       SET plan_type = 'cloud_799',
           status = 'APPROVED',
           plan_expires_at = $1,
           trial_used = true,
           updated_at = NOW()
       WHERE id = $2`,
      [trialExpiresAt, user.tenant_id]
    );

    const token = jwt.sign(
      {
        tenant_id: user.tenant_id,
        user_id: user.id,
        email: user.username,
        shop_name: user.shop_name,
        token_version: 1
      },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.cookie('knite_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000
    });

    res.json({
      success: true,
      token,
      message: '1-Day Free Trial activated! You have 24 hours of full Pro Cloud access.',
      tenant: {
        id: user.tenant_id,
        shop_name: user.shop_name,
        owner_name: user.owner_name,
        email: user.username,
        phone: user.phone,
        dl_number: user.dl_number,
        gstin: user.gstin,
        address: user.address,
        license_key: user.license_key,
        plan_type: 'cloud_799',
        status: 'APPROVED',
        is_trial: true,
        plan_expires_at: trialExpiresAt
      }
    });
  } catch (err) {
    console.error('Start trial error:', err);
    res.status(500).json({ error: 'Failed to activate free trial at this time' });
  }
});

// ── Logout Endpoint ─────────────────────────────────────────────────────────
router.post('/logout', (req, res) => {
  res.clearCookie('knite_session');
  res.json({ success: true, message: 'Logged out successfully' });
});

module.exports = {
  router,
  authenticateToken,
  requireRole
};
