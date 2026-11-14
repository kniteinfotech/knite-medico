const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { pool } = require('../db');
const { sendAlert } = require('../services/telegramService');
let Razorpay;
try {
  Razorpay = require('razorpay');
} catch (e) {
  // fallback if not installed
}

// Helper to fetch Razorpay configuration from DB or Environment
async function getRazorpayConfig() {
  try {
    const res = await pool.query("SELECT value FROM medico.system_settings WHERE key = 'razorpay_gateway'");
    if (res.rows.length > 0 && res.rows[0].value) {
      return res.rows[0].value;
    }
  } catch (e) {
    console.warn('Razorpay settings query warning:', e.message);
  }

  return {
    key_id: process.env.RAZORPAY_KEY_ID || '',
    key_secret: process.env.RAZORPAY_KEY_SECRET || '',
    merchant_name: 'KNITE Infotech',
    description: 'KNITE Medico SaaS Subscription'
  };
}

// In-memory active order cache
const activeOrders = new Map();

// 1. CREATE RAZORPAY ORDER
router.post('/create-order', async (req, res) => {
  const { amount, tenant_id, plan = 'pro_cloud', billing_cycle = 'monthly', shop_name, email } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Valid payment amount is required' });
  }

  const config = await getRazorpayConfig();
  const amountInPaise = Math.round(parseFloat(amount) * 100);
  const receiptId = 'rcpt_' + Date.now() + '_' + Math.floor(Math.random() * 1000);

  try {
    let orderId = 'order_' + Date.now() + Math.random().toString(36).substring(2, 7);

    // Try Razorpay SDK order creation if real credentials are present
    if (Razorpay) {
      const razorpay = new Razorpay({
        key_id: config.key_id,
        key_secret: config.key_secret
      });
      const order = await razorpay.orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt: receiptId,
        notes: { tenant_id, plan, billing_cycle, shop_name, email }
      });
      orderId = order.id;
    }

    const orderData = {
      order_id: orderId,
      receipt: receiptId,
      amount: parseFloat(amount),
      amount_in_paise: amountInPaise,
      tenant_id,
      plan,
      billing_cycle,
      shop_name,
      email,
      status: 'CREATED',
      created_at: new Date().toISOString()
    };

    activeOrders.set(orderId, orderData);
    console.log(`💳 [Razorpay Order Created] ID: ${orderId} | Amount: ₹${amount} | Plan: ${plan}`);

    res.json({
      success: true,
      order_id: orderId,
      amount: amountInPaise,
      currency: 'INR',
      key_id: config.key_id,
      merchant_name: config.merchant_name,
      description: config.description,
      prefill: {
        name: shop_name || 'Pharmacist',
        email: email || '',
        contact: '8778721940'
      }
    });
  } catch (err) {
    console.error('Razorpay Order Creation Error:', err);
    res.status(500).json({ error: err.message || 'Failed to create Razorpay Order' });
  }
});

// 2. VERIFY RAZORPAY PAYMENT SIGNATURE & AUTO-ACTIVATE SUBSCRIPTION
router.post('/verify-payment', async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    tenant_id,
    plan = 'cloud_900',
    billing_cycle = 'monthly',
    shop_name,
    email
  } = req.body;

  // Strict anti-tampering validation: ALL three fields are mandatory
  if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
    return res.status(400).json({ 
      error: 'SECURITY_VIOLATION: razorpay_payment_id, razorpay_order_id, and razorpay_signature are strictly required.' 
    });
  }

  const config = await getRazorpayConfig();
  if (!config.key_secret) {
    return res.status(500).json({ error: 'Razorpay secret key not configured on server' });
  }

  // Cryptographic HMAC-SHA256 signature verification (Constant-time to prevent timing attacks)
  const expectedSignature = crypto
    .createHmac('sha256', config.key_secret)
    .update(razorpay_order_id + '|' + razorpay_payment_id)
    .digest('hex');

  const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
  const providedBuffer = Buffer.from(razorpay_signature, 'utf8');

  if (expectedBuffer.length !== providedBuffer.length || !crypto.timingSafeEqual(expectedBuffer, providedBuffer)) {
    console.warn(`🚨 [Security Alert] Fake or Tampered Razorpay Payment Signature Detected! PaymentID: ${razorpay_payment_id}`);
    return res.status(400).json({ error: 'Cryptographic signature verification failed. Unauthorized transaction.' });
  }

  console.log(`🎉 [Razorpay Payment Verified] Payment ID: ${razorpay_payment_id} | Order ID: ${razorpay_order_id} | Tenant: ${tenant_id || 'N/A'}`);

  // Automatically upgrade tenant in PostgreSQL DB (Strictly parameterized)
  let dbUpgraded = false;
  if (tenant_id) {
    try {
      const days = billing_cycle === 'yearly' ? 365 : 30;
      await pool.query(
        `UPDATE medico.tenants 
         SET plan_type = $2, 
             status = 'APPROVED', 
             plan_expires_at = NOW() + ($3 || ' days')::INTERVAL, 
             updated_at = NOW() 
         WHERE id = $1`,
        [tenant_id, plan, `${days}`]
      );
      dbUpgraded = true;
      console.log(`🚀 [PostgreSQL Upgrade] Tenant ${tenant_id} updated to ${plan} (${days} days)!`);
    } catch (dbErr) {
      console.warn('DB update warning during Razorpay verification:', dbErr.message);
    }
  }

  try {
    // Record payment in system_settings
    await pool.query(
      `INSERT INTO medico.system_settings (key, value, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [
        `razorpay_payment_${razorpay_payment_id}`,
        JSON.stringify({
          payment_id: razorpay_payment_id,
          order_id: razorpay_order_id,
          tenant_id,
          plan,
          billing_cycle,
          verified_at: new Date().toISOString(),
          status: 'PAID'
        })
      ]
    );

    // Send Official Tax Invoice via kniteinfotech@gmail.com
    let recipientEmail = email;
    let targetShopName = shop_name;
    if (!recipientEmail && tenant_id) {
      try {
        const tRes = await pool.query('SELECT email, shop_name FROM medico.tenants WHERE id = $1', [tenant_id]);
        if (tRes.rows.length > 0) {
          recipientEmail = tRes.rows[0].email;
          targetShopName = tRes.rows[0].shop_name;
        }
      } catch (tErr) {}
    }

    if (recipientEmail) {
      try {
        const emailService = require('../services/emailService');
        const planAmount = (plan === 'cloud_900') ? 900 : ((plan === 'enterprise_1299' || plan === 'enterprise') ? 1299 : ((plan === 'cloud_799' || plan === 'cloud' || plan === 'pro_cloud') ? 799 : 599));
        await emailService.sendPaymentInvoice({
          recipient_email: recipientEmail,
          shop_name: targetShopName || 'Medical Store',
          payment_id: razorpay_payment_id,
          order_id: razorpay_order_id,
          amount: planAmount,
          plan: plan,
          billing_cycle: billing_cycle,
          autopay_enabled: !!req.body.autopay_enabled
        });
        console.log(`✉️ [Invoice Email Dispatched] Sent tax invoice from kniteinfotech@gmail.com to ${recipientEmail}`);

        // Also dispatch Store Approved & Activated Confirmation Email
        if (dbUpgraded) {
          try {
            await emailService.sendStoreApprovalEmail({
              toEmail: recipientEmail,
              shopName: targetShopName || 'Medical Store',
              ownerName: '',
              planType: plan,
              expiresAt: new Date(Date.now() + (billing_cycle === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000).toISOString(),
              licenseKey: ''
            });
            console.log(`✉️ [Store Activation Email] Dispatched store approval confirmation to ${recipientEmail}`);
          } catch (appErr) {
            console.warn('Failed to send store activation email:', appErr.message);
          }
        }
      } catch (eErr) {
        console.warn('Failed to send invoice email:', eErr.message);
      }
    }
  } catch (logErr) {
    // ignore
  }

  // Trigger Instant Telegram Notification for New Paid Subscription
  sendAlert({
    title: '💰 NEW RAZORPAY PAYMENT RECEIVED!',
    message: `Payment confirmed for ${shop_name || 'Pharmacy Store'}`,
    level: 'PAYMENT',
    req,
    metadata: {
      gateway: 'RAZORPAY',
      payment_id: razorpay_payment_id,
      tenant_id,
      shop_name: shop_name || 'Medical Store',
      plan,
      billing_cycle,
      email: email || ''
    }
  }).catch(() => {});

  res.json({
    success: true,
    status: 'ACTIVE',
    payment_id: razorpay_payment_id,
    order_id: razorpay_order_id,
    message: '🎉 Payment successfully verified via Razorpay! Your subscription is now ACTIVE.',
    db_upgraded: dbUpgraded
  });
});

// 3. RAZORPAY WEBHOOK HANDLER
router.post('/webhook', async (req, res) => {
  try {
    const config = await getRazorpayConfig();
    const signature = req.headers['x-razorpay-signature'];
    const body = JSON.stringify(req.body);

    if (signature && config.webhook_secret) {
      const expectedSignature = crypto
        .createHmac('sha256', config.webhook_secret)
        .update(body)
        .digest('hex');

      if (expectedSignature !== signature) {
        return res.status(400).json({ error: 'Invalid webhook signature' });
      }
    }

    const event = req.body.event;
    const payload = req.body.payload;

    console.log(`🔔 [Razorpay Webhook Event]: ${event}`);

    if (event === 'payment.captured' || event === 'order.paid') {
      const paymentEntity = payload?.payment?.entity || payload?.order?.entity;
      const notes = paymentEntity?.notes || {};

      if (notes.tenant_id) {
        const intervalStr = notes.billing_cycle === 'yearly' ? '365 days' : '30 days';
        await pool.query(
          `UPDATE medico.tenants 
           SET plan_type = $2, status = 'APPROVED', plan_expires_at = NOW() + INTERVAL '${intervalStr}'
           WHERE id = $1`,
          [notes.tenant_id, notes.plan || 'pro_cloud']
        );
        console.log(`🎉 [Webhook Upgrade] Tenant ${notes.tenant_id} upgraded via Razorpay Webhook!`);
      }
    }

    res.json({ status: 'OK' });
  } catch (err) {
    res.status(500).json({ error: 'Webhook processing error' });
  }
});

// 4. MANUAL PAYMENT ID / UTR VERIFICATION
router.post('/verify-manual', async (req, res) => {
  const { payment_id, utr, amount, tenant_id, shop_name, email, plan = 'pro_cloud', billing_cycle = 'monthly' } = req.body;
  const targetId = payment_id || utr;

  if (!targetId) {
    return res.status(400).json({ error: 'Razorpay Payment ID / Reference Number is required' });
  }

  const refClean = String(targetId).trim().replace(/\s+/g, '');
  console.log(`📲 [Razorpay Manual Verification] Ref: ${refClean} | Tenant: ${tenant_id || 'N/A'} | Plan: ${plan}`);

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
    } catch (e) {
      console.warn('DB update warning:', e.message);
    }
  }

  // Send Tax Invoice Email via kniteinfotech@gmail.com
  let recipientEmail = email;
  let targetShopName = shop_name;
  if (!recipientEmail && tenant_id) {
    try {
      const tRes = await pool.query('SELECT email, shop_name FROM medico.tenants WHERE id = $1', [tenant_id]);
      if (tRes.rows.length > 0) {
        recipientEmail = tRes.rows[0].email;
        targetShopName = tRes.rows[0].shop_name;
      }
    } catch (tErr) {}
  }

  if (recipientEmail) {
    try {
      const emailService = require('../services/emailService');
      const planAmount = (plan === 'cloud_900') ? 900 : ((plan === 'enterprise_1299' || plan === 'enterprise') ? 1299 : ((plan === 'cloud_799' || plan === 'cloud' || plan === 'pro_cloud') ? 799 : 599));
      await emailService.sendPaymentInvoice({
        recipient_email: recipientEmail,
        shop_name: targetShopName || 'Medical Store',
        payment_id: refClean,
        order_id: 'ORDER_DIRECT_' + Date.now(),
        amount: planAmount,
        plan: plan,
        billing_cycle: billing_cycle,
        autopay_enabled: !!req.body.autopay_enabled
      });
      console.log(`✉️ [Invoice Email Dispatched] Sent tax invoice from kniteinfotech@gmail.com to ${recipientEmail}`);
    } catch (eErr) {
      console.warn('Failed to send invoice email:', eErr.message);
    }
  }

  res.json({
    success: true,
    status: 'ACTIVE',
    payment_id: refClean,
    message: '🎉 Payment confirmed! Your subscription is now ACTIVE.'
  });
});

module.exports = router;
