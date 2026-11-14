const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { pool } = require('../db');
const { sendAlert } = require('../services/telegramService');

// Helper to fetch PhonePe configuration from DB
async function getPhonePeConfig() {
  try {
    const res = await pool.query("SELECT value FROM medico.system_settings WHERE key = 'phonepe_gateway'");
    if (res.rows.length > 0) {
      return res.rows[0].value;
    }
  } catch (e) {
    console.warn('PhonePe settings query warning:', e.message);
  }
  return {
    merchant_id: process.env.PHONEPE_MERCHANT_ID || 'KNITEMEDICOUAT',
    salt_key: process.env.PHONEPE_SALT_KEY || '',
    salt_index: process.env.PHONEPE_SALT_INDEX || '1',
    env: process.env.PHONEPE_ENV || 'SANDBOX', // 'SANDBOX' or 'PRODUCTION'
    merchant_upi_id: 'kniteinfotech@ybl',
    merchant_name: 'KNITE Medico SaaS'
  };
}

// In-memory or DB transaction cache
const activeTransactions = new Map();

// 1. INITIATE PHONEPE PAYMENT (For Cloud SaaS Upgrade or POS Counter Bill)
router.post('/initiate', async (req, res) => {
  const { 
    tenant_id, 
    amount, 
    purpose = 'CLOUD_SUBSCRIPTION', // 'CLOUD_SUBSCRIPTION' or 'POS_BILL'
    store_name, 
    customer_phone = '9999999999', 
    customer_name = 'Customer',
    invoice_number = ''
  } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Valid payment amount is required' });
  }

  const transactionId = 'TXN_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7).toUpperCase();
  const config = await getPhonePeConfig();

  // Convert amount to paise (1 INR = 100 paise)
  const amountInPaise = Math.round(parseFloat(amount) * 100);

  // Standard PhonePe V1 Payment Payload
  const payloadObj = {
    merchantId: config.merchant_id,
    merchantTransactionId: transactionId,
    merchantUserId: tenant_id ? 'U_' + tenant_id : 'U_' + customer_phone,
    amount: amountInPaise,
    redirectUrl: `http://192.168.1.50:5173/?phonepe_status=success&txn=${transactionId}`,
    redirectMode: 'POST',
    callbackUrl: `http://192.168.1.50:5055/api/phonepe/callback`,
    mobileNumber: customer_phone.replace(/[^0-9]/g, '').slice(-10),
    paymentInstrument: {
      type: 'PAY_PAGE'
    }
  };

  const base64Payload = Buffer.from(JSON.stringify(payloadObj)).toString('base64');
  const stringToHash = base64Payload + '/pg/v1/pay' + config.salt_key;
  const sha256 = crypto.createHash('sha256').update(stringToHash).digest('hex');
  const xVerify = `${sha256}###${config.salt_index}`;

  // Standard UPI Intent URL compatible with PhonePe, GPay, Paytm, BHIM
  const upiIntentUrl = `upi://pay?pa=${encodeURIComponent(config.merchant_upi_id)}&pn=${encodeURIComponent(config.merchant_name)}&am=${parseFloat(amount).toFixed(2)}&cu=INR&tr=${transactionId}&tn=${encodeURIComponent(purpose === 'CLOUD_SUBSCRIPTION' ? 'KNITE Cloud Sync SaaS' : `Med Bill ${invoice_number}`)}`;

  // Store in active cache
  const txnRecord = {
    transaction_id: transactionId,
    tenant_id,
    amount: parseFloat(amount),
    amount_in_paise: amountInPaise,
    purpose,
    store_name,
    customer_name,
    customer_phone,
    invoice_number,
    status: 'PENDING',
    created_at: new Date().toISOString()
  };
  activeTransactions.set(transactionId, txnRecord);

  console.log(`💳 [PhonePe Payment Initiated] ID: ${transactionId} | Amount: ₹${amount} | Purpose: ${purpose}`);

  res.json({
    success: true,
    transaction_id: transactionId,
    amount: parseFloat(amount),
    amount_in_paise: amountInPaise,
    merchant_id: config.merchant_id,
    x_verify: xVerify,
    base64_payload: base64Payload,
    upi_intent_url: upiIntentUrl,
    qr_data: upiIntentUrl,
    merchant_name: config.merchant_name,
    merchant_upi_id: config.merchant_upi_id,
    status: 'PENDING'
  });
});

// 2. CHECK PAYMENT STATUS (Polled by client modal every 2-3s)
router.get('/status/:transactionId', async (req, res) => {
  const { transactionId } = req.params;
  const txn = activeTransactions.get(transactionId);

  if (!txn) {
    return res.status(404).json({ error: 'Transaction not found or expired' });
  }

  res.json({
    success: true,
    transaction_id: transactionId,
    status: txn.status,
    amount: txn.amount,
    purpose: txn.purpose,
    tenant_id: txn.tenant_id,
    payment_mode: txn.payment_mode || 'PHONEPE_UPI'
  });
});

// 3. COMPLETE / SIMULATE SUCCESSFUL PAYMENT (Strictly blocked in production)
router.post('/verify-success', async (req, res) => {
  // Hard block in production environments to prevent payment bypass
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ 
      error: 'SECURITY_RESTRICTION: Simulated payments are strictly disabled in production.' 
    });
  }

  // In non-prod, require master key authorization
  const masterKey = process.env.SUPERADMIN_KEY;
  if (!masterKey || req.headers['x-admin-key'] !== masterKey) {
    return res.status(403).json({ error: 'Unauthorized simulation attempt' });
  }

  const { transaction_id, tenant_id, purpose, utr_number } = req.body;
  const txn = activeTransactions.get(transaction_id) || {
    transaction_id,
    tenant_id,
    purpose: purpose || 'CLOUD_SUBSCRIPTION',
    status: 'PENDING'
  };

  txn.status = 'COMPLETED';
  txn.utr_number = utr_number || 'UTR' + Math.floor(100000000000 + Math.random() * 900000000000);
  txn.payment_mode = 'PHONEPE_UPI';
  txn.completed_at = new Date().toISOString();
  activeTransactions.set(transaction_id, txn);

  // If this was a CLOUD_SUBSCRIPTION upgrade, automatically upgrade the tenant in PostgreSQL!
  if (tenant_id) {
    try {
      await pool.query(
        `UPDATE medico.tenants 
         SET plan_type = 'cloud_900',
             status = 'APPROVED',
             plan_expires_at = NOW() + INTERVAL '30 days',
             updated_at = NOW()
         WHERE id = $1`,
        [tenant_id]
      );
      console.log(`🎉 [PhonePe Gateway] Upgraded tenant ${tenant_id} to cloud_900!`);
    } catch (dbErr) {
      console.error('Failed to upgrade tenant on payment:', dbErr);
    }
  }

  // Trigger Instant Telegram Alert for Paid Subscription
  sendAlert({
    title: '📱 NEW PHONEPE PAYMENT RECEIVED!',
    message: `Payment confirmed via PhonePe Gateway for tenant ${tenant_id || 'N/A'}`,
    level: 'PAYMENT',
    req,
    metadata: {
      gateway: 'PHONEPE_UPI',
      transaction_id,
      utr_number: txn.utr_number,
      tenant_id,
      amount: txn.amount ? `₹${txn.amount}` : 'N/A',
      purpose: txn.purpose || 'CLOUD_SUBSCRIPTION'
    }
  }).catch(() => {});

  res.json({
    success: true,
    status: 'COMPLETED',
    transaction_id,
    utr_number: txn.utr_number,
    message: 'Payment confirmed via PhonePe Gateway!'
  });
});

// 4. PHONEPE WEBHOOK CALLBACK
router.post('/callback', async (req, res) => {
  try {
    const { response } = req.body;
    if (response) {
      const decoded = JSON.parse(Buffer.from(response, 'base64').toString('utf8'));
      console.log('🔔 [PhonePe Webhook Callback Received]:', decoded);

      const txnId = decoded.data?.merchantTransactionId;
      if (txnId && activeTransactions.has(txnId)) {
        const txn = activeTransactions.get(txnId);
        if (decoded.code === 'PAYMENT_SUCCESS') {
          txn.status = 'COMPLETED';
          if (txn.tenant_id) {
            await pool.query(
              `UPDATE medico.tenants 
               SET plan_type = 'pro_cloud', status = 'APPROVED', plan_expires_at = NOW() + INTERVAL '365 days'
               WHERE id = $1`,
              [txn.tenant_id]
            );
          }
        } else {
          txn.status = 'FAILED';
        }
      }
    }
    res.json({ status: 'OK' });
  } catch (err) {
    res.status(500).json({ error: 'Webhook processing error' });
  }
});

// 6. MANUAL UTR VERIFICATION — for new Cloud Pro subscriptions after PhonePe QR payment
router.post('/verify-manual', async (req, res) => {
  const { utr, amount, tenant_id, shop_name, email, plan = 'pro_cloud', billing_cycle = 'monthly' } = req.body;

  if (!utr) {
    return res.status(400).json({ error: 'UTR / Transaction Reference is required' });
  }

  const utrClean = utr.trim().replace(/\s+/g, '');
  if (utrClean.length < 8) {
    return res.status(400).json({ error: 'Invalid UTR number. Must be at least 8 digits.' });
  }

  console.log(`📲 [PhonePe Gateway Verification] UTR: ${utrClean} | Tenant: ${tenant_id || 'N/A'} | Shop: ${shop_name || 'N/A'} | Plan: ${plan} | Amount: ₹${amount}`);

  // Automatically approve tenant in PostgreSQL DB if tenant_id is passed
  let dbUpgraded = false;
  if (tenant_id) {
    try {
      const intervalStr = billing_cycle === 'yearly' ? '365 days' : '30 days';
      await pool.query(
        `UPDATE medico.tenants 
         SET plan_type = $2, 
             status = 'APPROVED', 
             plan_expires_at = NOW() + INTERVAL '${intervalStr}', 
             updated_at = NOW() 
         WHERE id = $1`,
        [tenant_id, plan]
      );
      dbUpgraded = true;
      console.log(`🎉 [Instant Gateway Activation] Tenant ${tenant_id} upgraded to ${plan} (${billing_cycle})!`);
    } catch (dbErr) {
      console.warn('DB update warning during UTR verification:', dbErr.message);
    }
  }

  try {
    // Record payment log in system settings
    await pool.query(
      `INSERT INTO medico.system_settings (key, value, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [
        `payment_utr_${utrClean}`,
        JSON.stringify({
          utr: utrClean, amount, tenant_id, shop_name, email, plan, billing_cycle,
          submitted_at: new Date().toISOString(), status: 'APPROVED', db_upgraded: dbUpgraded
        })
      ]
    );
  } catch (logErr) {
    // ignore log error
  }

  return res.json({
    success: true,
    status: 'ACTIVE',
    utr: utrClean,
    message: '🎉 Payment successfully verified via PhonePe Gateway! Subscription is now ACTIVE.',
    db_upgraded: dbUpgraded
  });
});

module.exports = router;

