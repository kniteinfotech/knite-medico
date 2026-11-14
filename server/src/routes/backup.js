const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authenticateToken } = require('./auth');
const {
  saveBackupToHdd,
  listHddBackups,
  getHddBackupData,
  ensureShopHddFolder
} = require('../services/backupStorageService');

router.use(authenticateToken);

// Middleware to enforce paid cloud subscription with 2-day grace period
async function requirePaidCloudSubscription(req, res, next) {
  const tenantId = req.user.tenant_id;
  const userEmail = (req.user.email || '').toLowerCase().trim();

  // Whitelist exception: strictly nitheesh8797@gmail.com
  if (userEmail === 'nitheesh8797@gmail.com') {
    return next();
  }

  try {
    const result = await pool.query(
      `SELECT shop_name, plan_type, plan_expires_at, status, email 
       FROM medico.tenants WHERE id = $1`,
      [tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tenant record not found' });
    }

    const tenant = result.rows[0];
    const tenantEmail = (tenant.email || '').toLowerCase().trim();

    if (tenantEmail === 'nitheesh8797@gmail.com') {
      return next();
    }

    const isPaid = tenant.plan_type === 'cloud_900' || tenant.plan_type === 'pro_cloud' || tenant.plan_type === 'cloud_799' || tenant.plan_type === 'cloud' || tenant.plan_type === 'enterprise' || tenant.plan_type === 'enterprise_1299';
    // 1-day grace period for cloud backup if monthly payment is pending
    const gracePeriodMs = 1 * 24 * 60 * 60 * 1000;
    const notExpired = tenant.plan_expires_at && (new Date(tenant.plan_expires_at).getTime() + gracePeriodMs) > Date.now();

    if (tenant.status === 'APPROVED' && isPaid && notExpired) {
      req.tenantShopName = tenant.shop_name;
      return next();
    }

    return res.status(403).json({
      error: 'PAID_SUBSCRIPTION_REQUIRED',
      isLocalOnly: true,
      message: 'Cloud backup requires an active paid Pro Cloud subscription or valid 1-day grace period. Your local database operates offline.'
    });
  } catch (err) {
    console.error('Subscription verification error in backup:', err);
    res.status(500).json({ error: 'Failed to verify subscription status' });
  }
}

router.use(requirePaidCloudSubscription);

// Helper to get shop name for current tenant
async function getTenantShopName(tenantId, reqShopName) {
  if (reqShopName) return reqShopName;
  try {
    const res = await pool.query('SELECT shop_name FROM medico.tenants WHERE id = $1', [tenantId]);
    return res.rows[0]?.shop_name || 'My Pharmacy Store';
  } catch {
    return 'My Pharmacy Store';
  }
}

// 1. Upload Cloud Snapshot Backup (Saved both to DB and 1 TB HDD at /data/backups/<shop_name>/)
router.post('/upload', async (req, res) => {
  const tenantId = req.user.tenant_id;
  const { backup_name, data } = req.body;

  if (!data) return res.status(400).json({ error: 'Backup payload required' });

  const backupId = 'bkp_' + Date.now();
  const name = backup_name || `Backup-${new Date().toISOString().split('T')[0]}-${Date.now().toString().slice(-4)}`;
  const jsonStr = typeof data === 'string' ? data : JSON.stringify(data);
  const sizeBytes = Buffer.byteLength(jsonStr, 'utf8');

  try {
    // 1. Save in PostgreSQL
    await pool.query(
      `INSERT INTO medico.cloud_backups (id, tenant_id, backup_name, backup_data, size_bytes)
       VALUES ($1, $2, $3, $4, $5)`,
      [backupId, tenantId, name, jsonStr, sizeBytes]
    );

    // 2. Save on 1 TB Hard Disk HDD under /data/backups/<shop_name>/ (e.g. nitheesh kadai)
    const shopName = await getTenantShopName(tenantId, req.tenantShopName);
    const hddResult = saveBackupToHdd(shopName, data, name);

    res.json({
      success: true,
      backup_id: backupId,
      backup_name: name,
      size_kb: Math.round(sizeBytes / 1024),
      shop_name: shopName,
      hdd_saved: hddResult.success,
      hdd_path: hddResult.filePath || null,
      created_at: new Date().toISOString()
    });
  } catch (err) {
    console.error('Backup upload error:', err);
    res.status(500).json({ error: 'Failed to save cloud backup: ' + err.message });
  }
});

// 2. List backups (Aggregating DB backups and 1 TB HDD backups)
router.get('/list', async (req, res) => {
  const tenantId = req.user.tenant_id;
  try {
    const shopName = await getTenantShopName(tenantId, req.tenantShopName);

    const [dbResult, hddBackups] = await Promise.all([
      pool.query(
        `SELECT id, backup_name, size_bytes, created_at 
         FROM medico.cloud_backups 
         WHERE tenant_id = $1 
         ORDER BY created_at DESC LIMIT 30`,
        [tenantId]
      ),
      Promise.resolve(listHddBackups(shopName))
    ]);

    const dbBackups = dbResult.rows.map(r => ({
      ...r,
      storage: 'PostgreSQL_Cloud'
    }));

    // Merge list, showing HDD backups alongside DB backups
    res.json({
      success: true,
      shop_name: shopName,
      backups: dbBackups,
      hdd_backups: hddBackups,
      total_count: dbBackups.length + hddBackups.length
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to list backups: ' + err.message });
  }
});

// 3. Restore backup
router.get('/restore/:id', async (req, res) => {
  const tenantId = req.user.tenant_id;
  const { id } = req.params;

  try {
    const shopName = await getTenantShopName(tenantId, req.tenantShopName);

    // Check if restoring from HDD file (id format: hdd_<filename>)
    if (id.startsWith('hdd_')) {
      const filename = id.replace('hdd_', '');
      const hddData = getHddBackupData(shopName, filename);
      if (hddData) {
        return res.json({ success: true, data: hddData, source: '1TB_HDD' });
      }
    }

    const result = await pool.query(
      `SELECT backup_data FROM medico.cloud_backups WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Backup not found' });
    }

    res.json({ success: true, data: result.rows[0].backup_data, source: 'PostgreSQL_Cloud' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to restore backup: ' + err.message });
  }
});

// 4. Delete backup
router.delete('/:id', async (req, res) => {
  const tenantId = req.user.tenant_id;
  const { id } = req.params;
  try {
    const result = await pool.query(
      `DELETE FROM medico.cloud_backups WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );
    res.json({ success: true, deleted: result.rowCount > 0 });
  } catch (err) {
    console.error('Delete backup error:', err);
    res.status(500).json({ error: 'Failed to delete backup' });
  }
});

// 5. Download Entire Store Data (Complete Snapshot Export + 1 TB HDD Archive)
router.get('/export-full', async (req, res) => {
  const tenantId = req.user.tenant_id;
  try {
    const [storeRes, medsRes, invsRes, itemsRes] = await Promise.all([
      pool.query(`SELECT * FROM medico.tenants WHERE id = $1`, [tenantId]),
      pool.query(`SELECT * FROM medico.medicines WHERE tenant_id = $1 AND is_deleted = false`, [tenantId]),
      pool.query(`SELECT * FROM medico.invoices WHERE tenant_id = $1`, [tenantId]),
      pool.query(`SELECT it.* FROM medico.invoice_items it JOIN medico.invoices i ON it.invoice_id = i.id WHERE i.tenant_id = $1`, [tenantId])
    ]);

    const shopName = storeRes.rows[0]?.shop_name || 'My Pharmacy Store';

    const fullPayload = {
      product: 'KNITE Medico SaaS',
      version: '1.0.0',
      exported_at: new Date().toISOString(),
      store: storeRes.rows[0] || {},
      medicines: medsRes.rows,
      invoices: invsRes.rows,
      invoice_items: itemsRes.rows,
      meta: {
        total_medicines: medsRes.rows.length,
        total_invoices: invsRes.rows.length,
        shop_name: shopName
      }
    };

    // Save full snapshot onto 1 TB HDD under /data/backups/<shop_name>/
    try {
      saveBackupToHdd(shopName, fullPayload, `FullExport_${tenantId}`);
    } catch (hddErr) {
      console.warn('Failed to save export to HDD:', hddErr.message);
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=KniteMedico_FullBackup_${encodeURIComponent(shopName)}_${new Date().toISOString().slice(0,10)}.json`);
    res.json(fullPayload);
  } catch (err) {
    console.error('Full export error:', err);
    res.status(500).json({ error: 'Failed to generate full export: ' + err.message });
  }
});

module.exports = router;

