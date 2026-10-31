const express = require('express');
const router = express.Router();
const { pool } = require('../db');

const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'KNITE_MEDICO_SUPER_SECRET_KEY_2026';
const ADMIN_EMAILS = ['kniteinfotech@gmail.com', 'nitheesh8797@gmail.com'];

// SuperAdmin Authentication Middleware (Strict Authorization)
function authenticateSuperAdmin(req, res, next) {
  const secretKey = req.headers['x-admin-key'] || req.query.admin_key;
  const masterKey = process.env.SUPERADMIN_KEY || 'KNITE_MASTER_2026';
  
  // 1. Verify Master Secret Key if provided
  if (secretKey && secretKey === masterKey) {
    return next();
  }
  
  // 2. Alternatively verify Bearer JWT token and check SuperAdmin privileges
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const email = (decoded.email || '').toLowerCase().trim();
      const role = (decoded.role || '').toLowerCase().trim();

      if (ADMIN_EMAILS.includes(email) || role === 'superadmin') {
        req.user = decoded;
        return next();
      }
    } catch (jwtErr) {
      return res.status(401).json({ error: 'Invalid or expired SuperAdmin token' });
    }
  }

  return res.status(403).json({ error: 'SuperAdmin access denied: Insufficient administrative privileges' });
}

router.use(authenticateSuperAdmin);

// 1. Get Master SaaS Overview & All Tenants
router.get('/overview', async (req, res) => {
  try {
    // Global metrics across all pharmacies
    const statsRes = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM medico.tenants) as total_tenants,
        (SELECT COUNT(*) FROM medico.tenants WHERE status = 'PENDING_APPROVAL') as pending_approvals,
        (SELECT COUNT(*) FROM medico.tenants WHERE status = 'APPROVED') as active_tenants,
        (SELECT COUNT(*) FROM medico.tenants WHERE status = 'SUSPENDED') as suspended_tenants,
        (SELECT COUNT(*) FROM medico.invoices) as total_invoices,
        (SELECT COALESCE(SUM(grand_total), 0) FROM medico.invoices) as total_network_volume,
        (SELECT COUNT(*) FROM medico.medicines WHERE is_deleted = false) as total_medicines,
        (SELECT COUNT(*) FROM medico.cloud_backups) as total_backups
    `);

    // List all pharmacy stores with their live stats & license info
    const tenantsRes = await pool.query(`
      SELECT 
        t.id, t.shop_name, t.owner_name, t.email, t.phone, 
        t.dl_number, t.gstin, t.address,
        t.license_key, t.plan_type, t.status, 
        t.plan_expires_at, t.created_at, t.updated_at,
        COUNT(DISTINCT m.id) as medicines_count,
        COUNT(DISTINCT i.id) as invoices_count,
        COALESCE(SUM(i.grand_total), 0) as total_revenue
      FROM medico.tenants t
      LEFT JOIN medico.medicines m ON t.id = m.tenant_id AND m.is_deleted = false
      LEFT JOIN medico.invoices i ON t.id = i.tenant_id
      GROUP BY t.id
      ORDER BY 
        CASE WHEN t.status = 'PENDING_APPROVAL' THEN 0 ELSE 1 END,
        t.created_at DESC
    `);

    res.json({
      success: true,
      metrics: statsRes.rows[0],
      tenants: tenantsRes.rows
    });
  } catch (err) {
    console.error('SuperAdmin overview error:', err);
    res.status(500).json({ error: 'Failed to fetch SuperAdmin overview' });
  }
});

// 2. Approve Pharmacy Registration & Assign Plan
router.post('/tenants/:id/approve', async (req, res) => {
  const { id } = req.params;
  const { plan_type = 'pro_cloud', extend_days = 365 } = req.body;

  try {
    const result = await pool.query(
      `UPDATE medico.tenants 
       SET status = 'APPROVED',
           plan_type = $1,
           plan_expires_at = NOW() + INTERVAL '${parseInt(extend_days, 10)} days',
           updated_at = NOW()
       WHERE id = $2 
       RETURNING *`,
      [plan_type, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const tenant = result.rows[0];

    // Dispatch Store Approval Confirmation Email
    try {
      const emailService = require('../services/emailService');
      await emailService.sendStoreApprovalEmail({
        toEmail: tenant.email,
        shopName: tenant.shop_name,
        ownerName: tenant.owner_name,
        planType: tenant.plan_type,
        expiresAt: tenant.plan_expires_at,
        licenseKey: tenant.license_key
      });
      console.log(`✉️ [Store Approved Email] Confirmation dispatched to ${tenant.email} for store ${tenant.shop_name}`);
    } catch (mailErr) {
      console.error('Warning: Failed to dispatch store approval email:', mailErr.message);
    }

    res.json({ 
      success: true, 
      message: `Store "${tenant.shop_name}" approved successfully! Confirmation email sent to ${tenant.email}`, 
      tenant 
    });
  } catch (err) {
    console.error('Approval error:', err);
    res.status(500).json({ error: 'Failed to approve tenant: ' + err.message });
  }
});

// 3. Reject Pharmacy Registration
router.post('/tenants/:id/reject', async (req, res) => {
  const { id } = req.params;
  const { reason = 'Registration details did not meet compliance criteria' } = req.body;

  try {
    const result = await pool.query(
      `UPDATE medico.tenants 
       SET status = 'REJECTED',
           updated_at = NOW()
       WHERE id = $1 
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const tenant = result.rows[0];

    // Dispatch Rejection Notice Email
    try {
      const emailService = require('../services/emailService');
      await emailService.sendStoreRejectionEmail({
        toEmail: tenant.email,
        shopName: tenant.shop_name,
        reason
      });
      console.log(`✉️ [Store Rejected Email] Notification dispatched to ${tenant.email} for store ${tenant.shop_name}`);
    } catch (mailErr) {
      console.error('Warning: Failed to dispatch store rejection email:', mailErr.message);
    }

    res.json({ 
      success: true, 
      message: `Store "${tenant.shop_name}" registration rejected and notice emailed.`, 
      tenant 
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reject tenant' });
  }
});

// 4. Toggle Status (Suspend / Reactivate)
router.post('/tenants/:id/toggle-status', async (req, res) => {
  const { id } = req.params;

  try {
    const cur = await pool.query('SELECT status, shop_name FROM medico.tenants WHERE id = $1', [id]);
    if (cur.rows.length === 0) return res.status(404).json({ error: 'Tenant not found' });

    const newStatus = cur.rows[0].status === 'APPROVED' ? 'SUSPENDED' : 'APPROVED';

    const result = await pool.query(
      `UPDATE medico.tenants SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [newStatus, id]
    );

    res.json({
      success: true,
      message: `Store "${result.rows[0].shop_name}" status set to ${newStatus}`,
      tenant: result.rows[0]
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle status' });
  }
});

// 5. Update Tenant Plan / Expiry / License Key
router.put('/tenants/:id', async (req, res) => {
  const { id } = req.params;
  const { plan_type, extend_days, license_key } = req.body;

  try {
    let query = 'UPDATE medico.tenants SET updated_at = NOW()';
    const params = [];
    let pIdx = 1;

    if (plan_type) {
      query += `, plan_type = $${pIdx++}`;
      params.push(plan_type);
    }

    if (license_key) {
      query += `, license_key = $${pIdx++}`;
      params.push(license_key);
    }

    if (extend_days) {
      query += `, plan_expires_at = plan_expires_at + INTERVAL '${parseInt(extend_days, 10)} days'`;
    }

    query += ` WHERE id = $${pIdx} RETURNING *`;
    params.push(id);

    const result = await pool.query(query, params);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    res.json({ success: true, tenant: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update tenant' });
  }
});

// 6. Delete Tenant Permanently
router.delete('/tenants/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const resDel = await pool.query('DELETE FROM medico.tenants WHERE id = $1 RETURNING shop_name', [id]);
    if (resDel.rows.length === 0) return res.status(404).json({ error: 'Tenant not found' });
    res.json({ success: true, message: `Store "${resDel.rows[0].shop_name}" permanently deleted.` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete tenant' });
  }
});

// 6b. Get Tenant Full Dossier (recent invoices & medicines)
router.get('/tenants/:id/details', async (req, res) => {
  const { id } = req.params;
  try {
    const tenantRes = await pool.query(`SELECT * FROM medico.tenants WHERE id = $1`, [id]);
    if (tenantRes.rows.length === 0) return res.status(404).json({ error: 'Tenant not found' });
    const tenant = tenantRes.rows[0];

    // Recent invoices
    const invoicesRes = await pool.query(
      `SELECT id, invoice_number, customer_name, customer_phone, grand_total, payment_mode, created_at 
       FROM medico.invoices WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 15`,
      [id]
    );

    // Recent medicines
    const medicinesRes = await pool.query(
      `SELECT id, name, brand, batch_number, stock_quantity, mrp, expiry_date, description
       FROM medico.medicines WHERE tenant_id = $1 AND is_deleted = false ORDER BY updated_at DESC LIMIT 15`,
      [id]
    );

    res.json({
      success: true,
      tenant,
      invoices: invoicesRes.rows,
      medicines: medicinesRes.rows
    });
  } catch (err) {
    console.error('Tenant details error:', err);
    res.status(500).json({ error: 'Failed to fetch tenant details' });
  }
});

// 7. Cloud Infrastructure Health Check & Database Statistics
router.get('/cloud-health', async (req, res) => {
  const { execSync } = require('child_process');
  const os = require('os');

  try {
    // Real PostgreSQL version
    const versionRes = await pool.query(`SELECT version() as pg_version`);
    const pgVersionFull = versionRes.rows[0]?.pg_version || '';
    // Extract just "PostgreSQL X.Y" from full version string
    const pgVersionMatch = pgVersionFull.match(/PostgreSQL [\d.]+/);
    const pgVersion = pgVersionMatch ? pgVersionMatch[0] : 'PostgreSQL';

    // Real database size (pretty + raw bytes)
    const dbSizeRes = await pool.query(`
      SELECT 
        pg_size_pretty(pg_database_size('knite_db')) as db_size,
        pg_database_size('knite_db') as db_size_bytes
    `);

    // Real table sizes
    const tableSizesRes = await pool.query(`
      SELECT 
        relname as table_name,
        pg_size_pretty(pg_total_relation_size(c.oid)) as total_size,
        pg_total_relation_size(c.oid) as total_size_bytes,
        c.reltuples::bigint as estimated_rows
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'medico' AND c.relkind = 'r'
      ORDER BY pg_total_relation_size(c.oid) DESC
    `);

    // Real disk usage for the 1TB /data drive (Medical Shop Data Cloud)
    let diskInfo = {
      drive_name: 'Medical Shop Data (Cloud)',
      mount_point: '/data',
      total_gb: 1000,
      used_gb: 0,
      free_gb: 981,
      used_percent: 0,
      device: '/dev/sda1'
    };
    try {
      const dfOutput = execSync("df -B1 /data 2>/dev/null | tail -1", { timeout: 3000 }).toString().trim();
      if (dfOutput) {
        const parts = dfOutput.split(/\s+/);
        const totalBytes = parseInt(parts[1]) || 0;
        const usedBytes = parseInt(parts[2]) || 0;
        const freeBytes = parseInt(parts[3]) || 0;
        diskInfo.total_gb = Math.round(totalBytes / 1e9);
        diskInfo.used_gb = parseFloat((usedBytes / 1e9).toFixed(2));
        diskInfo.free_gb = parseFloat((freeBytes / 1e9).toFixed(2));
        diskInfo.used_percent = totalBytes > 0 ? parseFloat(((usedBytes / totalBytes) * 100).toFixed(1)) : 0;
        diskInfo.device = parts[0] || '/dev/sda1';
      }
    } catch (_) {
      // /data not available in Docker; use defaults
    }

    // Real server local IP
    let serverIp = '192.168.1.50';
    try {
      const nets = os.networkInterfaces();
      for (const iface of Object.values(nets)) {
        for (const net of iface) {
          if (net.family === 'IPv4' && !net.internal && net.address.startsWith('192.168.')) {
            serverIp = net.address;
            break;
          }
        }
      }
    } catch (_) {}

    // Real system memory
    const totalMemMB = Math.round(os.totalmem() / 1024 / 1024);
    const freeMemMB = Math.round(os.freemem() / 1024 / 1024);

    res.json({
      success: true,
      status: 'HEALTHY',
      server_ip: serverIp,
      database: `knite_db (${pgVersion})`,
      pg_version: pgVersion,
      db_size: dbSizeRes.rows[0]?.db_size || 'Unknown',
      db_size_bytes: parseInt(dbSizeRes.rows[0]?.db_size_bytes || 0),
      disk: diskInfo,
      uptime_seconds: process.uptime(),
      memory_usage_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      system_total_mem_mb: totalMemMB,
      system_free_mem_mb: freeMemMB,
      tables: tableSizesRes.rows,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Health check error:', err);
    res.status(500).json({ error: 'Health check failed: ' + err.message });
  }
});

// ── Password Reset (Admin-only) ─────────────────────────────────────────────
// POST /api/admin/reset-password
// Body: { email: "user@example.com", tenant_id?: "t-123", new_password: "NewPass@123" }
// Header: x-admin-key: KNITE_MASTER_2026
router.post('/reset-password', async (req, res) => {
  const { email, tenant_id, new_password } = req.body;
  if ((!email && !tenant_id) || !new_password) {
    return res.status(400).json({ error: 'email or tenant_id, and new_password are required' });
  }
  if (new_password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash(new_password, 10);

    let result;
    if (tenant_id) {
      result = await pool.query(
        `UPDATE medico.users 
         SET password_hash = $1, token_version = token_version + 1, failed_login_attempts = 0, locked_until = NULL
         WHERE tenant_id = $2 RETURNING username`,
        [hash, tenant_id]
      );
    } else {
      result = await pool.query(
        `UPDATE medico.users 
         SET password_hash = $1, token_version = token_version + 1, failed_login_attempts = 0, locked_until = NULL
         WHERE LOWER(username) = LOWER($2) 
            OR tenant_id IN (SELECT id FROM medico.tenants WHERE LOWER(email) = LOWER($2)) 
         RETURNING username`,
        [hash, email.trim()]
      );
    }

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'No user account found for this store' });
    }

    console.log(`✅ Password reset by admin for user: ${result.rows[0].username} (all active sessions revoked)`);
    res.json({ success: true, message: `Password reset successfully for ${result.rows[0].username}` });
  } catch (err) {
    console.error('Password reset error:', err);
    res.status(500).json({ error: 'Password reset failed: ' + err.message });
  }
});

// ── 9. Security Audit & Monitoring Telemetry ─────────────────────────────────
// GET /api/admin/security-logs
// Returns live feed of security events: brute-force attempts, throttles, locks, password resets
router.get('/security-logs', async (req, res) => {
  try {
    const logsRes = await pool.query(
      `SELECT id, event_type, email_masked, ip_address, user_agent, metadata, created_at
       FROM medico.security_logs
       ORDER BY created_at DESC
       LIMIT 100`
    );

    // Summary stats for SuperAdmin dashboard
    const statsRes = await pool.query(
      `SELECT 
         COUNT(*) FILTER (WHERE event_type = 'LOGIN_FAILED') as failed_logins_total,
         COUNT(*) FILTER (WHERE event_type = 'RATE_LIMITED') as rate_limits_total,
         COUNT(*) FILTER (WHERE event_type = 'ACCOUNT_LOCKED') as accounts_locked_total,
         COUNT(*) FILTER (WHERE event_type = 'LOGIN_SUCCESS') as successful_logins_total,
         COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as events_last_24h
       FROM medico.security_logs`
    );

    res.json({
      success: true,
      stats: statsRes.rows[0],
      logs: logsRes.rows
    });
  } catch (err) {
    console.error('Security logs error:', err);
    res.status(500).json({ error: 'Failed to retrieve security logs' });
  }
});

// ── 10. Razorpay Payments & Subscriptions Audit ──────────────────────────────
// GET /api/admin/payments
router.get('/payments', async (req, res) => {
  try {
    const paymentsRes = await pool.query(
      `SELECT key, value, updated_at 
       FROM medico.system_settings 
       WHERE key LIKE 'razorpay_payment_%' 
       ORDER BY updated_at DESC`
    );

    const payments = paymentsRes.rows.map(r => {
      let data = {};
      try {
        data = typeof r.value === 'string' ? JSON.parse(r.value) : r.value;
      } catch (e) {}
      return {
        key: r.key,
        ...data,
        updated_at: r.updated_at
      };
    });

    // Compute metrics
    const totalCollected = payments.reduce((acc, p) => acc + (parseFloat(p.amount) || (p.plan === 'cloud_799' || p.plan === 'pro_cloud' ? 799 : p.plan === 'enterprise_1299' ? 1299 : 599)), 0);

    res.json({
      success: true,
      total_count: payments.length,
      total_collected: totalCollected,
      payments
    });
  } catch (err) {
    console.error('Admin payments query error:', err);
    res.status(500).json({ error: 'Failed to retrieve payment records' });
  }
});

// ── 11. Broadcast Email / Announcement Dispatches via kniteinfotech@gmail.com ─
// POST /api/admin/broadcast-email
// Body: { title/subject, details/content, target: 'all' | 'single', recipient_email?: string }
router.post('/broadcast-email', async (req, res) => {
  const title = req.body.title || req.body.subject;
  const details = req.body.details || req.body.content;
  const target = (req.body.target || 'all').toLowerCase();
  const recipient_email = req.body.recipient_email;

  if (!title || !details) {
    return res.status(400).json({ error: 'Title and details/content are required' });
  }

  try {
    const emailService = require('../services/emailService');
    let targetEmails = [];

    if (target !== 'all' && (recipient_email || req.body.target)) {
      const singleEmail = recipient_email || (target.includes('@') ? req.body.target : null);
      if (singleEmail) {
        targetEmails = [singleEmail.trim().toLowerCase()];
      }
    }
    
    if (targetEmails.length === 0) {
      const tenantsRes = await pool.query(`SELECT email FROM medico.tenants WHERE email IS NOT NULL AND email != ''`);
      targetEmails = [...new Set(tenantsRes.rows.map(r => r.email.trim().toLowerCase()))];
    }

    let dispatchedCount = 0;
    for (const em of targetEmails) {
      try {
        await emailService.sendSystemUpdate(em, title, details);
        dispatchedCount++;
      } catch (e) {
        console.warn(`Failed to dispatch broadcast to ${em}:`, e.message);
      }
    }

    res.json({
      success: true,
      message: `📢 Broadcast dispatched from kniteinfotech@gmail.com to ${dispatchedCount} pharmacy recipients.`,
      dispatched_count: dispatchedCount,
      sent_count: dispatchedCount
    });
  } catch (err) {
    console.error('Broadcast error:', err);
    res.status(500).json({ error: 'Failed to send broadcast email: ' + err.message });
  }
});

// ── 12. Resend / Dispatch Official Tax Invoice Email ──────────────────────────
// POST /api/admin/send-invoice
router.post('/send-invoice', async (req, res) => {
  const recipient_email = req.body.recipient_email;
  const shop_name = req.body.shop_name || 'Medical Store';
  const payment_id = req.body.payment_id;
  const order_id = req.body.order_id || 'ORDER_' + Date.now();
  const amount = req.body.amount || 799;
  const plan = req.body.plan || req.body.plan_name || 'cloud_799';
  const billing_cycle = req.body.billing_cycle || 'monthly';
  const autopay_enabled = req.body.autopay !== undefined ? req.body.autopay : (req.body.autopay_enabled || false);

  if (!recipient_email || !payment_id) {
    return res.status(400).json({ error: 'recipient_email and payment_id are required' });
  }

  try {
    const emailService = require('../services/emailService');
    await emailService.sendPaymentInvoice({
      recipient_email: recipient_email.trim(),
      shop_name: shop_name || 'Medical Store',
      payment_id,
      order_id: order_id || 'ORDER_' + Date.now(),
      amount: amount || (plan === 'cloud_799' || plan === 'pro_cloud' ? 799 : plan === 'enterprise_1299' ? 1299 : 599),
      plan,
      billing_cycle,
      autopay_enabled: !!autopay_enabled
    });

    res.json({
      success: true,
      message: `🧾 Official tax invoice dispatched from kniteinfotech@gmail.com to ${recipient_email}`
    });
  } catch (err) {
    console.error('Invoice dispatch error:', err);
    res.status(500).json({ error: 'Failed to dispatch invoice: ' + err.message });
  }
});

// ── 13. SMTP / Gmail App Password Status & Diagnostics ───────────────────────
// GET /api/admin/email-status
router.get('/email-status', async (req, res) => {
  try {
    const emailService = require('../services/emailService');
    const configured = emailService.isEmailConfigured();
    const user = process.env.SMTP_USER || 'kniteinfotech@gmail.com';
    const pass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || '';
    const maskedPass = pass ? pass.slice(0, 3) + '••••••••' + pass.slice(-3) : '';

    const verifyResult = await emailService.verifyConnection();

    res.json({
      success: true,
      configured,
      user,
      masked_pass: maskedPass,
      verification: verifyResult
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── 14. Save SMTP / Gmail App Password Configuration ─────────────────────────
// POST /api/admin/email-config
router.post('/email-config', async (req, res) => {
  const { smtp_user, gmail_app_password, smtp_host, smtp_port } = req.body;

  if (!gmail_app_password || !gmail_app_password.trim()) {
    return res.status(400).json({ error: 'Google App Password (16 characters) is required' });
  }

  const cleanPass = gmail_app_password.trim().replace(/\s+/g, '');
  const cleanUser = (smtp_user || 'kniteinfotech@gmail.com').trim().toLowerCase();

  try {
    const fs = require('fs');
    const path = require('path');
    const emailService = require('../services/emailService');

    // Update in-memory runtime environment
    process.env.SMTP_USER = cleanUser;
    process.env.GMAIL_APP_PASSWORD = cleanPass;
    process.env.SMTP_PASS = cleanPass;
    if (smtp_host) process.env.SMTP_HOST = smtp_host.trim();
    if (smtp_port) process.env.SMTP_PORT = smtp_port.toString();

    // Persist to .env files (local and Docker container /app/.env)
    const envPaths = [
      path.resolve(process.cwd(), '.env'),
      path.resolve(process.cwd(), '../server/.env'),
      '/app/.env'
    ];

    for (const envPath of envPaths) {
      try {
        let envContent = '';
        if (fs.existsSync(envPath)) {
          envContent = fs.readFileSync(envPath, 'utf8');
        }

        const lines = envContent.split('\n').filter(l => 
          !l.startsWith('SMTP_USER=') && 
          !l.startsWith('GMAIL_APP_PASSWORD=') && 
          !l.startsWith('SMTP_PASS=') &&
          !l.startsWith('SMTP_HOST=') &&
          !l.startsWith('SMTP_PORT=')
        );

        lines.push(`SMTP_USER=${cleanUser}`);
        lines.push(`GMAIL_APP_PASSWORD=${cleanPass}`);
        lines.push(`SMTP_PASS=${cleanPass}`);
        if (smtp_host) lines.push(`SMTP_HOST=${smtp_host.trim()}`);
        if (smtp_port) lines.push(`SMTP_PORT=${smtp_port}`);

        fs.writeFileSync(envPath, lines.join('\n').trim() + '\n', 'utf8');
      } catch (e) {
        // Ignore file access errors on non-existent paths
      }
    }

    emailService.resetTransporter();
    const verification = await emailService.verifyConnection();

    res.json({
      success: true,
      message: verification.verified 
        ? `🎉 SMTP Authenticated successfully! Live emails will now be delivered to real inboxes from ${cleanUser}.`
        : `⚠️ Credentials saved, but Google returned: ${verification.error || verification.message}`,
      verification
    });
  } catch (err) {
    console.error('Email config error:', err);
    res.status(500).json({ error: 'Failed to update email credentials: ' + err.message });
  }
});

// ── 15. Send Live Test Email ─────────────────────────────────────────────────
// POST /api/admin/test-email
router.post('/test-email', async (req, res) => {
  const { recipient_email } = req.body;
  if (!recipient_email || !recipient_email.includes('@')) {
    return res.status(400).json({ error: 'Valid recipient_email is required' });
  }

  try {
    const emailService = require('../services/emailService');
    const result = await emailService.sendTestEmail(recipient_email.trim());

    if (result.live_delivery) {
      res.json({
        success: true,
        message: `✅ Test email successfully dispatched to ${recipient_email} via Google Gmail SMTP! Check inbox.`,
        details: result
      });
    } else {
      res.status(400).json({
        success: false,
        error: '⚠️ Email was NOT delivered to inbox because GMAIL_APP_PASSWORD is not configured. Please enter your 16-character Google App Password in the setup card.',
        details: result
      });
    }
  } catch (err) {
    console.error('Test email failure:', err);
    res.status(500).json({ 
      success: false, 
      error: `❌ Google SMTP Error: ${err.message}. If using Gmail, make sure 2-Step Verification is ON and generate an App Password from https://myaccount.google.com/apppasswords.` 
    });
  }
});

// ── 16. Telegram Alerting Configuration & Diagnostics ────────────────────────
// GET /api/admin/telegram-status
router.get('/telegram-status', (req, res) => {
  const botToken = process.env.TELEGRAM_BOT_TOKEN || '';
  const chatId = process.env.TELEGRAM_CHAT_ID || '';
  const configured = Boolean(botToken && chatId);
  const maskedToken = botToken ? botToken.slice(0, 5) + '••••••••' + botToken.slice(-4) : '';
  const maskedChatId = chatId ? chatId.slice(0, 3) + '••••' + chatId.slice(-2) : '';

  res.json({
    success: true,
    configured,
    bot_token: maskedToken,
    chat_id: maskedChatId
  });
});

// POST /api/admin/telegram-config
// Body: { bot_token, chat_id }
router.post('/telegram-config', async (req, res) => {
  const { bot_token, chat_id } = req.body;
  if (!bot_token || !chat_id) {
    return res.status(400).json({ error: 'bot_token and chat_id are required' });
  }

  const cleanToken = bot_token.trim();
  const cleanChatId = chat_id.trim();

  try {
    const fs = require('fs');
    const path = require('path');
    const { sendTelegramMessage } = require('../services/telegramService');

    // Test sending test message to Telegram first
    const testRes = await sendTelegramMessage(
      cleanToken,
      cleanChatId,
      '🎉 <b>[KNITE Medico SaaS]</b>\nTelegram Instant Alert System connected successfully! Server errors, security threats, and payment failures will be reported here in real time.'
    );

    if (!testRes.success) {
      return res.status(400).json({
        error: `Failed to connect Telegram Bot: ${testRes.reason}. Please verify Bot Token and Chat ID.`
      });
    }

    // Update in-memory process environment
    process.env.TELEGRAM_BOT_TOKEN = cleanToken;
    process.env.TELEGRAM_CHAT_ID = cleanChatId;

    // Save to .env files
    const envPaths = [
      path.resolve(process.cwd(), '.env'),
      path.resolve(process.cwd(), '../server/.env'),
      '/app/.env'
    ];

    for (const envPath of envPaths) {
      try {
        let envContent = '';
        if (fs.existsSync(envPath)) {
          envContent = fs.readFileSync(envPath, 'utf8');
        }

        const lines = envContent.split('\n').filter(l => 
          !l.startsWith('TELEGRAM_BOT_TOKEN=') && 
          !l.startsWith('TELEGRAM_CHAT_ID=')
        );

        lines.push(`TELEGRAM_BOT_TOKEN=${cleanToken}`);
        lines.push(`TELEGRAM_CHAT_ID=${cleanChatId}`);

        fs.writeFileSync(envPath, lines.join('\n').trim() + '\n', 'utf8');
      } catch (e) {}
    }

    res.json({
      success: true,
      message: '🚀 Telegram Bot connected! Test notification sent to your Telegram chat.'
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update Telegram settings: ' + err.message });
  }
});

// POST /api/admin/test-telegram
router.post('/test-telegram', async (req, res) => {
  const { sendAlert } = require('../services/telegramService');
  try {
    const result = await sendAlert({
      title: '🧪 TEST TELEGRAM NOTIFICATION',
      message: 'This is a test alert from KNITE Medico SaaS server. System error reporting is ACTIVE.',
      level: 'INFO',
      req
    });

    if (result.success) {
      res.json({ success: true, message: '✅ Test notification sent to Telegram!' });
    } else {
      res.status(400).json({ success: false, error: 'Telegram alert failed: ' + (result.reason || 'Check credentials') });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
