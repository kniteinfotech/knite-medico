const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authenticateToken } = require('./auth');
const { saveBackupToHdd } = require('../services/backupStorageService');

router.use(authenticateToken);

// Middleware to enforce paid cloud subscription (with exception for nitheesh8797@gmail.com)
async function requirePaidCloudSubscription(req, res, next) {
  const tenantId = req.user.tenant_id;
  const userEmail = (req.user.email || '').toLowerCase().trim();

  // Whitelist exception: nitheesh8797@gmail.com / nitheesh has lifetime free cloud
  if (userEmail.includes('nitheesh')) {
    return next();
  }

  try {
    const result = await pool.query(
      `SELECT plan_type, plan_expires_at, status, owner_name 
       FROM medico.tenants WHERE id = $1`,
      [tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tenant record not found' });
    }

    const tenant = result.rows[0];
    const ownerName = (tenant.owner_name || '').toLowerCase();

    if (ownerName.includes('nitheesh') || userEmail.includes('nitheesh')) {
      return next();
    }

    const isPaid = tenant.plan_type === 'pro_cloud' || tenant.plan_type === 'cloud_799' || tenant.plan_type === 'cloud' || tenant.plan_type === 'enterprise' || tenant.plan_type === 'enterprise_1299';
    // 1-day grace period for cloud sync if monthly payment is pending
    const gracePeriodMs = 1 * 24 * 60 * 60 * 1000;
    const notExpired = tenant.plan_expires_at && (new Date(tenant.plan_expires_at).getTime() + gracePeriodMs) > Date.now();

    if (tenant.status === 'APPROVED' && isPaid && notExpired) {
      return next();
    }

    return res.status(403).json({
      error: 'PAID_SUBSCRIPTION_REQUIRED',
      isLocalOnly: true,
      message: 'Cloud sync requires an active paid Pro Cloud subscription. Free Local Tier data remains saved locally on your device.'
    });
  } catch (err) {
    console.error('Subscription verification error:', err);
    res.status(500).json({ error: 'Failed to verify subscription status' });
  }
}

router.use(requirePaidCloudSubscription);

// 1. PUSH local changes to Cloud Server
router.post('/push', async (req, res) => {
  const tenantId = req.user.tenant_id;
  const { medicines = [], invoices = [], customers = [] } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let medicinesSynced = 0;
    let invoicesSynced = 0;
    let customersSynced = 0;

    // Sync Medicines (Upsert strictly scoped by tenant_id)
    for (const med of medicines) {
      await client.query(
        `INSERT INTO medico.medicines (
          id, tenant_id, name, generic_name, batch_number, expiry_date,
          rack, hsn_code, mrp, purchase_price, sale_price, gst_rate,
          stock_qty, min_stock, description, is_deleted, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW())
        ON CONFLICT (tenant_id, id) DO UPDATE SET
          name = EXCLUDED.name,
          generic_name = EXCLUDED.generic_name,
          batch_number = EXCLUDED.batch_number,
          expiry_date = EXCLUDED.expiry_date,
          rack = EXCLUDED.rack,
          hsn_code = EXCLUDED.hsn_code,
          mrp = EXCLUDED.mrp,
          purchase_price = EXCLUDED.purchase_price,
          sale_price = EXCLUDED.sale_price,
          gst_rate = EXCLUDED.gst_rate,
          stock_qty = EXCLUDED.stock_qty,
          min_stock = EXCLUDED.min_stock,
          description = EXCLUDED.description,
          is_deleted = EXCLUDED.is_deleted,
          updated_at = NOW()`,
        [
          med.id, tenantId, med.name, med.generic_name || '', med.batch_number || '',
          med.expiry_date || null, med.rack || '', med.hsn_code || '',
          med.mrp || 0, med.purchase_price || 0, med.sale_price || 0, med.gst_rate || 12,
          med.stock_qty || 0, med.min_stock || 10, med.description || '', !!med.is_deleted
        ]
      );
      medicinesSynced++;
    }

    // Sync Invoices & Line Items
    for (const inv of invoices) {
      await client.query(
        `INSERT INTO medico.invoices (
          id, tenant_id, invoice_number, customer_name, customer_phone,
          doctor_name, payment_mode, subtotal, tax_amount, discount_amount,
          grand_total, items_count, notes, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
        ON CONFLICT (tenant_id, invoice_number) DO UPDATE SET
          customer_name = EXCLUDED.customer_name,
          customer_phone = EXCLUDED.customer_phone,
          doctor_name = EXCLUDED.doctor_name,
          payment_mode = EXCLUDED.payment_mode,
          grand_total = EXCLUDED.grand_total,
          updated_at = NOW()`,
        [
          inv.id, tenantId, inv.invoice_number, inv.customer_name || 'Walk-in Customer',
          inv.customer_phone || '', inv.doctor_name || '', inv.payment_mode || 'CASH',
          inv.subtotal || 0, inv.tax_amount || 0, inv.discount_amount || 0,
          inv.grand_total || 0, inv.items ? inv.items.length : 0, inv.notes || '',
          inv.created_at || new Date().toISOString()
        ]
      );

      // Insert line items if present
      if (inv.items && inv.items.length > 0) {
        await client.query('DELETE FROM medico.invoice_items WHERE invoice_id = $1', [inv.id]);
        for (const item of inv.items) {
          const itemId = item.id || 'item_' + Math.random().toString(36).substring(2, 9);
          await client.query(
            `INSERT INTO medico.invoice_items (
              id, tenant_id, invoice_id, medicine_id, medicine_name,
              batch_number, expiry_date, quantity, unit_price, gst_rate, total_amount
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [
              itemId, tenantId, inv.id, item.medicine_id || null, item.medicine_name,
              item.batch_number || '', item.expiry_date || null, item.quantity,
              item.unit_price, item.gst_rate || 12, item.total_amount
            ]
          );
        }
      }
      invoicesSynced++;
    }

    // Sync Customers
    for (const cust of customers) {
      if (!cust.id || !cust.name) continue;
      await client.query(
        `INSERT INTO medico.customers (
          id, tenant_id, name, phone, email, address, pending_credit, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        ON CONFLICT (tenant_id, id) DO UPDATE SET
          name = EXCLUDED.name,
          phone = EXCLUDED.phone,
          email = EXCLUDED.email,
          address = EXCLUDED.address,
          pending_credit = EXCLUDED.pending_credit,
          updated_at = NOW()`,
        [
          cust.id, tenantId, cust.name, cust.phone || '', cust.email || '',
          cust.address || '', cust.pending_credit || 0, cust.created_at || new Date().toISOString()
        ]
      );
      customersSynced++;
    }

    await client.query('COMMIT');

    // Automatically mirror shop snapshot to 1 TB HDD backup directory (/data/backups/<shop_name>/)
    try {
      const shopName = req.user.shop_name || ('shop_' + tenantId);
      saveBackupToHdd(shopName, {
        tenant_id: tenantId,
        shop_name: shopName,
        synced_at: new Date().toISOString(),
        medicines,
        invoices,
        customers
      }, 'cloud_push_snapshot');
    } catch (hddErr) {
      console.warn('1TB HDD backup mirror warning:', hddErr.message);
    }

    res.json({
      success: true,
      medicines_synced: medicinesSynced,
      invoices_synced: invoicesSynced,
      customers_synced: customersSynced,
      synced_at: new Date().toISOString()
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Push sync error:', err);
    res.status(500).json({ error: 'Failed to push synchronization payload' });
  } finally {
    client.release();
  }
});

// 2. PULL remote updates from Cloud to Local App
router.get('/pull', async (req, res) => {
  const tenantId = req.user.tenant_id;
  const since = req.query.since || '1970-01-01T00:00:00.000Z';

  try {
    const medResult = await pool.query(
      `SELECT * FROM medico.medicines 
       WHERE tenant_id = $1 AND updated_at > $2
       ORDER BY updated_at ASC`,
      [tenantId, since]
    );

    const invResult = await pool.query(
      `SELECT * FROM medico.invoices 
       WHERE tenant_id = $1 AND updated_at > $2
       ORDER BY updated_at ASC LIMIT 500`,
      [tenantId, since]
    );

    const custResult = await pool.query(
      `SELECT * FROM medico.customers 
       WHERE tenant_id = $1 AND updated_at > $2
       ORDER BY updated_at ASC`,
      [tenantId, since]
    );

    res.json({
      success: true,
      medicines: medResult.rows,
      invoices: invResult.rows,
      customers: custResult.rows,
      current_timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Pull sync error:', err);
    res.status(500).json({ error: 'Failed to pull cloud updates' });
  }
});

// 3. SECURE STORE CLOUD DATA (Strictly Tenant-Isolated: Never exposes other users' data)
router.get('/store-cloud-data', async (req, res) => {
  const tenantId = req.user.tenant_id;

  try {
    // 1. Current Store Profile & License
    const tenantRes = await pool.query(
      `SELECT id, shop_name, owner_name, email, phone, dl_number, gstin, address, 
              plan_type, plan_expires_at, license_key, status, trial_used, created_at, updated_at
       FROM medico.tenants WHERE id = $1`,
      [tenantId]
    );

    if (tenantRes.rows.length === 0) {
      return res.status(404).json({ error: 'Tenant record not found' });
    }
    const store = tenantRes.rows[0];

    // 2. Customer Purchases & Detailed Invoices for THIS store only
    const invoicesRes = await pool.query(
      `SELECT 
        i.id, i.invoice_number, i.customer_name, i.customer_phone, 
        i.payment_mode, i.subtotal, i.discount_amount, i.tax_amount, 
        i.grand_total, i.created_at,
        COALESCE(
          json_agg(
            json_build_object(
              'medicine_name', it.medicine_name,
              'quantity', it.quantity,
              'unit_price', it.unit_price,
              'total_amount', it.total_amount
            )
          ) FILTER (WHERE it.id IS NOT NULL),
          '[]'::json
        ) as items
       FROM medico.invoices i
       LEFT JOIN medico.invoice_items it ON i.id = it.invoice_id
       WHERE i.tenant_id = $1
       GROUP BY i.id
       ORDER BY i.created_at DESC
       LIMIT 100`,
      [tenantId]
    );

    // 3. Medicine Lifecycle, Stock Additions & Restocks for THIS store only
    const medicinesRes = await pool.query(
      `SELECT 
        id, name, generic_name, batch_number, mrp, purchase_price, sale_price, 
        stock_qty, min_stock, expiry_date, rack, created_at, updated_at
       FROM medico.medicines
       WHERE tenant_id = $1 AND is_deleted = false
       ORDER BY updated_at DESC
       LIMIT 300`,
      [tenantId]
    );

    // 4. Customers List
    const customersRes = await pool.query(
      `SELECT id, name, phone, email, address, pending_credit, created_at, updated_at
       FROM medico.customers
       WHERE tenant_id = $1
       ORDER BY updated_at DESC`,
      [tenantId]
    );

    // 5. Compute Store KPIs
    const statsRes = await pool.query(
      `SELECT 
        COALESCE(SUM(i.grand_total), 0) as total_revenue,
        COUNT(DISTINCT i.id) as total_invoices,
        COUNT(DISTINCT m.id) as total_medicines,
        COUNT(DISTINCT c.id) as total_customers,
        COUNT(DISTINCT CASE WHEN m.stock_qty = 0 THEN m.id END) as out_of_stock_count,
        COUNT(DISTINCT CASE WHEN m.stock_qty > 0 AND m.stock_qty <= COALESCE(m.min_stock, 10) THEN m.id END) as low_stock_count
       FROM medico.tenants t
       LEFT JOIN medico.invoices i ON t.id = i.tenant_id
       LEFT JOIN medico.medicines m ON t.id = m.tenant_id AND m.is_deleted = false
       LEFT JOIN medico.customers c ON t.id = c.tenant_id
       WHERE t.id = $1`,
      [tenantId]
    );

    res.json({
      success: true,
      store,
      purchases: invoicesRes.rows,
      medicines: medicinesRes.rows,
      customers: customersRes.rows,
      stats: statsRes.rows[0] || {}
    });
  } catch (err) {
    console.error('Store cloud data fetch error:', err);
    res.status(500).json({ error: 'Failed to retrieve cloud data: ' + err.message });
  }
});

module.exports = router;
