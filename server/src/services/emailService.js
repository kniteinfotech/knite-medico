require('dotenv').config();
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const SENDER_EMAIL = process.env.SMTP_USER || 'kniteinfotech@gmail.com';
const SENDER_NAME = 'KNITE Medico';

// Create Nodemailer Transporter
let transporter = null;

function isEmailConfigured() {
  const pass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || '';
  return Boolean(pass && pass.trim());
}

function resetTransporter() {
  transporter = null;
}

function getTransporter() {
  if (transporter) return transporter;

  const user = process.env.SMTP_USER || 'kniteinfotech@gmail.com';
  const pass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || '';
  const host = process.env.SMTP_HOST || '';
  const port = process.env.SMTP_PORT || 465;

  if (pass) {
    if (host) {
      transporter = nodemailer.createTransport({
        host,
        port: parseInt(port, 10),
        secure: parseInt(port, 10) === 465,
        auth: { user, pass }
      });
      console.log(`📧 [EmailService] Configured custom SMTP transporter (${host}:${port}) with ${user}`);
    } else {
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass }
      });
      console.log(`📧 [EmailService] Configured live Gmail transporter with ${user}`);
    }
  } else {
    // Development / Logging fallback transport (prevents app crashes when no App Password is set)
    transporter = {
      sendMail: async (mailOptions) => {
        console.warn('⚠️ [EmailService] LIVE DELIVERY INACTIVE: GMAIL_APP_PASSWORD is not set.');
        console.warn(`   Email to <${mailOptions.to}> was NOT sent over the internet.`);
        console.log('────────────────────────────────────────────────────────────────────────');
        console.log(`📧 [SIMULATED EMAIL LOG VIA ${mailOptions.from || SENDER_EMAIL}]`);
        console.log(`   To: ${mailOptions.to}`);
        console.log(`   Subject: ${mailOptions.subject}`);
        console.log('   Content:');
        console.log(mailOptions.text || '(HTML Body provided)');
        console.log('────────────────────────────────────────────────────────────────────────');
        return { messageId: 'simulated_' + Date.now(), simulated: true, delivered: false };
      }
    };
    console.log(`ℹ️ [EmailService] Running in safe transport mode (emails logged to server console). Set GMAIL_APP_PASSWORD in server/.env for live inbox delivery.`);
  }

  return transporter;
}

async function verifyConnection() {
  if (!isEmailConfigured()) {
    return {
      configured: false,
      message: 'GMAIL_APP_PASSWORD is not configured. Google requires a 16-character App Password for kniteinfotech@gmail.com.'
    };
  }
  try {
    const mailer = getTransporter();
    if (typeof mailer.verify === 'function') {
      await mailer.verify();
      return { configured: true, verified: true, message: `SMTP connection active and authenticated for ${process.env.SMTP_USER || 'kniteinfotech@gmail.com'}` };
    }
    return { configured: true, verified: false, message: 'Transporter does not support verify()' };
  } catch (err) {
    console.error('SMTP Verify Error:', err);
    return { configured: true, verified: false, error: err.message };
  }
}

async function sendTestEmail(toEmail) {
  const mailer = getTransporter();
  const configured = isEmailConfigured();

  const res = await mailer.sendMail({
    from: `"${SENDER_NAME}" <${process.env.SMTP_USER || 'kniteinfotech@gmail.com'}>`,
    to: toEmail,
    subject: '🧪 KNITE Medico SMTP Live Test Delivery',
    text: `This is a test email from KNITE Medico. If you received this, live inbox delivery from kniteinfotech@gmail.com is operating perfectly! Timestamp: ${new Date().toISOString()}`,
    html: `
      <div style="font-family: sans-serif; padding: 20px; background: #f8fafc;">
        <div style="max-width: 500px; margin: auto; background: white; border-radius: 16px; padding: 25px; border: 1px solid #e2e8f0;">
          <h2 style="color: #0c2540; margin-top: 0;">✅ KNITE Medico Live SMTP Test</h2>
          <p style="color: #10b981; font-weight: bold; font-size: 16px;">Live delivery is operational!</p>
          <p style="font-size: 13px; color: #475569;">
            This email confirms that <strong>${process.env.SMTP_USER || 'kniteinfotech@gmail.com'}</strong> is authenticated and actively dispatching emails to real user inboxes.
          </p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 11px; color: #94a3b8;">KNITE Infotech Engineering • Chennai, India</p>
        </div>
      </div>
    `
  });

  return {
    ...res,
    live_delivery: configured && !res.simulated
  };
}

/**
 * Send 6-Digit Registration OTP from kniteinfotech@gmail.com
 */
async function sendRegistrationOTP(toEmail, otpCode, shopName) {
  const mailer = getTransporter();

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
        .card { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
        .header { background: linear-gradient(135deg, #0c2540 0%, #153a61 50%, #ff2c2c 100%); padding: 30px; text-align: center; color: white; }
        .header h1 { margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
        .header p { margin: 6px 0 0; font-size: 13px; opacity: 0.9; }
        .content { padding: 30px 25px; text-align: center; }
        .otp-box { background: #fff1f2; border: 2px dashed #ff2c2c; border-radius: 16px; padding: 20px; margin: 25px 0; display: inline-block; width: 85%; }
        .otp-code { font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 900; letter-spacing: 8px; color: #ff2c2c; margin: 0; }
        .badge { display: inline-block; background: #0c2540; color: #38bdf8; font-size: 11px; font-weight: 700; padding: 4px 10px; rounded-radius: 6px; border-radius: 6px; margin-bottom: 12px; }
        .notice { font-size: 12px; color: #64748b; line-height: 1.6; margin-top: 20px; }
        .footer { background: #f1f5f9; padding: 15px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <div class="badge">SECURITY VERIFICATION</div>
          <h1>KNITE MEDICO PHARMACY SAAS</h1>
          <p>Registration OTP for <strong>${shopName || 'Your Pharmacy Store'}</strong></p>
        </div>
        <div class="content">
          <p style="font-size: 14px; margin-top: 0;">Use the following One-Time Password (OTP) to verify your registered email address:</p>
          <div class="otp-box">
            <div class="otp-code">${otpCode}</div>
          </div>
          <p style="font-size: 13px; font-weight: 600; color: #0f172a;">Valid for 10 minutes only • Single-use</p>
          <div class="notice">
            🔒 <strong>Security Notice:</strong> Never share this OTP with anyone. KNITE Infotech representatives will never ask for your verification code.
          </div>
        </div>
        <div class="footer">
          Sent by <strong>KNITE Infotech</strong> (kniteinfotech@gmail.com) • Chennai, Tamil Nadu, India
        </div>
      </div>
    </body>
    </html>
  `;

  return await mailer.sendMail({
    from: `"${SENDER_NAME}" <${SENDER_EMAIL}>`,
    to: toEmail,
    subject: `🔐 ${otpCode} is your KNITE Medico Registration OTP`,
    text: `Your KNITE Medico Registration OTP is ${otpCode}. It is valid for 10 minutes. Sent by KNITE Infotech (kniteinfotech@gmail.com).`,
    html
  });
}

/**
 * Send 6-Digit Password Reset OTP from kniteinfotech@gmail.com
 */
async function sendPasswordResetOTP(toEmail, otpCode) {
  const mailer = getTransporter();

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
        .card { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
        .header { background: linear-gradient(135deg, #0c2540 0%, #153a61 50%, #ff2c2c 100%); padding: 30px; text-align: center; color: white; }
        .header h1 { margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
        .header p { margin: 6px 0 0; font-size: 13px; opacity: 0.9; }
        .content { padding: 30px 25px; text-align: center; }
        .otp-box { background: #fff1f2; border: 2px dashed #ff2c2c; border-radius: 16px; padding: 20px; margin: 25px 0; display: inline-block; width: 85%; }
        .otp-code { font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 900; letter-spacing: 8px; color: #ff2c2c; margin: 0; }
        .badge { display: inline-block; background: #0c2540; color: #38bdf8; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 6px; margin-bottom: 12px; }
        .notice { font-size: 12px; color: #64748b; line-height: 1.6; margin-top: 20px; }
        .footer { background: #f1f5f9; padding: 15px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <div class="badge">PASSWORD RESET SECURITY</div>
          <h1>KNITE MEDICO PHARMACY SAAS</h1>
          <p>Password Reset Request for <strong>${toEmail}</strong></p>
        </div>
        <div class="content">
          <p style="font-size: 14px; margin-top: 0;">Use the following 6-digit One-Time Password (OTP) to reset your account password:</p>
          <div class="otp-box">
            <div class="otp-code">${otpCode}</div>
          </div>
          <p style="font-size: 13px; font-weight: 600; color: #0f172a;">Valid for 15 minutes only • Single-use</p>
          <div class="notice">
            🔒 <strong>Security Notice:</strong> Never share this OTP with anyone. If you did not request a password reset, please ignore this message.
          </div>
        </div>
        <div class="footer">
          Sent by <strong>KNITE Infotech</strong> (${SENDER_EMAIL}) • Chennai, Tamil Nadu, India
        </div>
      </div>
    </body>
    </html>
  `;

  return await mailer.sendMail({
    from: `"${SENDER_NAME}" <${SENDER_EMAIL}>`,
    to: toEmail,
    subject: `🔑 ${otpCode} is your KNITE Medico Password Reset OTP`,
    text: `Your KNITE Medico Password Reset OTP is ${otpCode}. Valid for 15 minutes. Sent by KNITE Infotech (${SENDER_EMAIL}).`,
    html
  });
}

/**
 * Send Subscription Tax Invoice & Receipt from kniteinfotech@gmail.com
 */
async function sendPaymentInvoice(paymentData) {
  const mailer = getTransporter();

  const {
    recipient_email,
    shop_name = 'Pharmacy Store',
    owner_name = 'Store Owner',
    payment_id = 'pay_' + Date.now(),
    order_id = 'order_' + Date.now(),
    amount = 799,
    plan = 'pro_cloud_799',
    billing_cycle = 'monthly',
    autopay_enabled = false
  } = paymentData;

  const invoiceNumber = `INV-KNITE-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
  const invoiceDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const validUntil = new Date(Date.now() + (billing_cycle === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const planTitle = plan.includes('799') || plan === 'cloud' || plan === 'pro_cloud'
    ? 'Pro Cloud & WhatsApp Plan (₹799/mo)'
    : plan.includes('599') || plan === 'local'
      ? 'Basic POS Billing Plan (₹599/mo)'
      : 'Enterprise Multi-Store SaaS';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
        .invoice-card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
        .invoice-head { background: #0c2540; color: white; padding: 28px 30px; }
        .brand { font-size: 20px; font-weight: 900; letter-spacing: -0.5px; }
        .brand span { color: #ff2c2c; }
        .invoice-details { display: flex; justify-content: space-between; margin-top: 15px; font-size: 12px; }
        .body-content { padding: 30px; }
        .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px; font-size: 12px; }
        .meta-box h4 { margin: 0 0 5px; color: #64748b; font-size: 11px; text-transform: uppercase; }
        .meta-box p { margin: 0; font-weight: 700; color: #0f172a; }
        .invoice-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
        .invoice-table th { background: #f8fafc; text-align: left; padding: 12px; font-size: 11px; text-transform: uppercase; color: #64748b; border-bottom: 2px solid #e2e8f0; }
        .invoice-table td { padding: 14px 12px; font-size: 13px; border-bottom: 1px solid #f1f5f9; }
        .total-box { background: #f8fafc; border-radius: 12px; padding: 15px; margin-top: 10px; }
        .total-row { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px; }
        .grand-total { font-size: 18px; font-weight: 900; color: #ff2c2c; border-top: 2px dashed #cbd5e1; padding-top: 10px; margin-top: 6px; }
        .autopay-badge { background: #ecfdf5; border: 1px solid #10b981; color: #047857; padding: 6px 12px; border-radius: 10px; font-size: 11px; font-weight: 800; display: inline-block; margin-top: 15px; }
        .footer { background: #f1f5f9; padding: 18px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="invoice-card">
        <div class="invoice-head">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div class="brand">KNITE <span>MEDICO</span></div>
            <div style="text-align: right; font-size: 11px; font-weight: 700; color: #38bdf8;">OFFICIAL TAX INVOICE</div>
          </div>
          <div style="font-size: 12px; opacity: 0.8; margin-top: 5px;">Payment Verified & Activated via Razorpay Gateway</div>
        </div>

        <div class="body-content">
          <table style="width: 100%; margin-bottom: 20px; font-size: 12px;">
            <tr>
              <td style="width: 50%;">
                <div style="color: #64748b; font-size: 10px; font-weight: 800; text-transform: uppercase;">BILLED TO:</div>
                <div style="font-size: 14px; font-weight: 800; color: #0f172a; margin-top: 3px;">${shop_name}</div>
                <div style="color: #475569;">Owner: ${owner_name}</div>
                <div style="color: #475569;">Email: ${recipient_email}</div>
              </td>
              <td style="width: 50%; text-align: right;">
                <div style="color: #64748b; font-size: 10px; font-weight: 800; text-transform: uppercase;">INVOICE DETAILS:</div>
                <div style="font-weight: 800; color: #0f172a; margin-top: 3px;">${invoiceNumber}</div>
                <div style="color: #475569;">Date: ${invoiceDate}</div>
                <div style="color: #475569;">Valid Until: ${validUntil}</div>
              </td>
            </tr>
          </table>

          <table class="invoice-table">
            <thead>
              <tr>
                <th>Subscription Plan Description</th>
                <th style="text-align: center;">Cycle</th>
                <th style="text-align: right;">Amount (INR)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>${planTitle}</strong><br/>
                  <span style="font-size: 11px; color: #64748b;">
                    ${plan.includes('799') ? 'Includes Cloud Sync, Headless WhatsApp Billing & Medicine Descriptions in Bills' : 'Standard Local POS Billing & GST Management'}
                  </span>
                </td>
                <td style="text-align: center; text-transform: capitalize; font-weight: 700;">${billing_cycle}</td>
                <td style="text-align: right; font-weight: 800;">₹${parseFloat(amount).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          <div class="total-box">
            <div class="total-row">
              <span>Subtotal:</span>
              <span>₹${parseFloat(amount).toFixed(2)}</span>
            </div>
            <div class="total-row">
              <span>GST (Included):</span>
              <span>₹0.00</span>
            </div>
            <div class="total-row grand-total">
              <span>Total Paid:</span>
              <span>₹${parseFloat(amount).toFixed(2)}</span>
            </div>
          </div>

          <div style="margin-top: 20px; font-size: 11px; color: #475569;">
            <p><strong>Razorpay Payment ID:</strong> <code style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">${payment_id}</code></p>
            <p><strong>Order ID:</strong> <code style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">${order_id}</code></p>
          </div>

          ${autopay_enabled ? `
            <div class="autopay-badge">
              ✓ AutoPay Mandate Active (Monthly Auto-Debit Enabled)
            </div>
          ` : ''}
        </div>

        <div class="footer">
          Payment Processed by <strong>KNITE Infotech</strong> • kniteinfotech@gmail.com • Razorpay Verified Gateway<br/>
          Thank you for choosing KNITE Medico. This is an electronic invoice and does not require a physical signature.
        </div>
      </div>
    </body>
    </html>
  `;

  return await mailer.sendMail({
    from: `"${SENDER_NAME}" <${SENDER_EMAIL}>`,
    to: recipient_email,
    subject: `🧾 Tax Invoice: KNITE Medico SaaS Subscription (${planTitle})`,
    text: `Payment Receipt for ${shop_name}. Plan: ${planTitle}. Amount: ₹${amount}. Payment ID: ${payment_id}. Sent by KNITE Infotech (kniteinfotech@gmail.com).`,
    html
  });
}

/**
 * Send System Update / Notification from kniteinfotech@gmail.com
 */
async function sendSystemUpdate(toEmail, updateTitle, updateDetails) {
  const mailer = getTransporter();

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: sans-serif; background: #f8fafc; padding: 20px;">
      <div style="max-width: 520px; margin: auto; background: white; border-radius: 16px; padding: 25px; border: 1px solid #e2e8f0;">
        <h2 style="color: #0c2540; margin-top: 0;">KNITE Medico System Update</h2>
        <h3 style="color: #ff2c2c;">${updateTitle}</h3>
        <p style="font-size: 14px; line-height: 1.6; color: #334155;">${updateDetails}</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 11px; color: #94a3b8;">KNITE Infotech • kniteinfotech@gmail.com</p>
      </div>
    </body>
    </html>
  `;

  return await mailer.sendMail({
    from: `"${SENDER_NAME}" <${SENDER_EMAIL}>`,
    to: toEmail,
    subject: `📢 KNITE Medico Update: ${updateTitle}`,
    text: `${updateTitle}: ${updateDetails}\n\nKNITE Infotech (kniteinfotech@gmail.com)`,
    html
  });
}

/**
 * Send Store Approval Confirmation Email from kniteinfotech@gmail.com
 */
async function sendStoreApprovalEmail({ toEmail, shopName, ownerName, planType = 'pro_cloud', expiresAt, licenseKey }) {
  const mailer = getTransporter();
  const loginUrl = 'https://knitemedico.kniteinfotech.in';
  const formattedExpiry = expiresAt 
    ? new Date(expiresAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '1 Year from Activation';

  const planTitle = planType.includes('799') || planType === 'cloud' || planType === 'pro_cloud'
    ? 'Pro Cloud & Headless WhatsApp Plan (₹799/mo)'
    : planType.includes('599') || planType === 'local'
      ? 'Basic POS Billing Plan (₹599/mo)'
      : 'Enterprise Multi-Store SaaS';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
        .card { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
        .header { background: linear-gradient(135deg, #064e3b 0%, #047857 50%, #10b981 100%); padding: 32px 25px; text-align: center; color: white; }
        .header h1 { margin: 8px 0 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
        .badge { display: inline-block; background: rgba(255,255,255,0.2); color: #ecfdf5; font-size: 11px; font-weight: 800; padding: 5px 12px; border-radius: 999px; text-transform: uppercase; letter-spacing: 1px; }
        .content { padding: 32px 28px; }
        .success-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 14px; padding: 18px; margin-bottom: 24px; }
        .details-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
        .details-table td { padding: 10px 12px; font-size: 13px; border-bottom: 1px solid #f1f5f9; }
        .details-table td.label { color: #64748b; font-weight: 600; width: 38%; }
        .details-table td.value { color: #0f172a; font-weight: 700; }
        .cta-btn { display: inline-block; background: linear-gradient(135deg, #ff2c2c 0%, #dc2626 100%); color: #ffffff !important; font-weight: 800; font-size: 15px; padding: 14px 32px; border-radius: 12px; text-decoration: none; margin: 15px 0 25px; box-shadow: 0 4px 15px rgba(220,38,38,0.3); }
        .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <div class="badge">STORE ACTIVATION CONFIRMED</div>
          <h1>Congratulations! Store Approved</h1>
          <p style="margin: 6px 0 0; font-size: 13px; opacity: 0.95;">Your pharmacy store is now live and activated on KNITE Medico</p>
        </div>
        <div class="content">
          <div class="success-box">
            <p style="margin: 0; font-size: 14px; color: #166534; font-weight: 600;">
              Dear <strong>${ownerName || 'Store Owner'}</strong>, your pharmacy application for <strong>${shopName}</strong> has been officially reviewed and <span style="text-decoration: underline;">APPROVED</span>!
            </p>
          </div>

          <table class="details-table">
            <tr>
              <td class="label">Store Name:</td>
              <td class="value">${shopName}</td>
            </tr>
            <tr>
              <td class="label">Registered Email:</td>
              <td class="value">${toEmail}</td>
            </tr>
            <tr>
              <td class="label">Subscription Plan:</td>
              <td class="value" style="color: #047857;">${planTitle}</td>
            </tr>
            <tr>
              <td class="label">Account Status:</td>
              <td class="value" style="color: #10b981;">✅ ACTIVE / APPROVED</td>
            </tr>
            <tr>
              <td class="label">Valid Until:</td>
              <td class="value">${formattedExpiry}</td>
            </tr>
            ${licenseKey ? `
            <tr>
              <td class="label">License Key:</td>
              <td class="value" style="font-family: monospace; color: #0284c7;">${licenseKey}</td>
            </tr>
            ` : ''}
          </table>

          <div style="text-align: center;">
            <a href="${loginUrl}" class="cta-btn" target="_blank">Access Pharmacy Portal Now &rarr;</a>
            <p style="font-size: 12px; color: #64748b; margin-top: 5px;">
              Portal URL: <a href="${loginUrl}" style="color: #ff2c2c;">${loginUrl}</a>
            </p>
          </div>

          <div style="margin-top: 25px; padding: 15px; background: #f8fafc; border-radius: 12px; font-size: 12px; color: #475569; line-height: 1.6;">
            <strong>Next Steps:</strong>
            <ul style="margin: 6px 0 0; padding-left: 20px;">
              <li>Log in with your registered email and the password you created.</li>
              <li>Setup your medicine inventory or connect your barcode scanner.</li>
              <li>Connect Headless WhatsApp billing in Settings to send automated invoices.</li>
            </ul>
          </div>
        </div>
        <div class="footer">
          Sent by <strong>KNITE Infotech</strong> (${SENDER_EMAIL}) • Official Pharmacy SaaS Platform<br/>
          If you have any questions, reply directly to this email or contact support.
        </div>
      </div>
    </body>
    </html>
  `;

  return await mailer.sendMail({
    from: `"${SENDER_NAME}" <${SENDER_EMAIL}>`,
    to: toEmail,
    subject: `🎉 Store Approved & Activated: Welcome to KNITE Medico (${shopName})`,
    text: `Congratulations ${ownerName || ''}! Your pharmacy store "${shopName}" has been approved and activated on KNITE Medico. Plan: ${planTitle}. Login at ${loginUrl}. Sent by KNITE Infotech (${SENDER_EMAIL}).`,
    html
  });
}

/**
 * Send Store Registration Confirmation Email from kniteinfotech@gmail.com
 */
async function sendRegistrationConfirmationEmail({ toEmail, shopName, ownerName, status = 'APPROVED', licenseKey, isTrial = false, trialExpiresAt }) {
  const mailer = getTransporter();
  const isApproved = status === 'APPROVED';
  const expiresFormatted = trialExpiresAt ? new Date(trialExpiresAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '24 Hours';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
        .card { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
        .header { background: linear-gradient(135deg, #0c2540 0%, #1e3a8a 100%); padding: 30px; text-align: center; color: white; }
        .header h1 { margin: 6px 0 0; font-size: 22px; font-weight: 800; }
        .content { padding: 30px 25px; }
        .trial-badge { background: #dcfce7; border: 1px solid #86efac; color: #166534; padding: 10px 16px; border-radius: 12px; font-size: 13px; font-weight: 700; margin: 15px 0; text-align: center; }
        .details-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin: 20px 0; }
        .footer { background: #f1f5f9; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #38bdf8;">
            ${isTrial ? '🎉 1-DAY FREE TRIAL ACTIVATED' : 'Registration Confirmation'}
          </div>
          <h1>Welcome to KNITE Medico</h1>
          <p style="margin: 6px 0 0; font-size: 13px; opacity: 0.9;">Store: ${shopName}</p>
        </div>
        <div class="content">
          <p style="font-size: 14px; margin-top: 0; line-height: 1.6;">
            Hello <strong>${ownerName || 'Pharmacy Partner'}</strong>,
          </p>
          <p style="font-size: 14px; line-height: 1.6; color: #334155;">
            Thank you for registering your pharmacy store <strong>${shopName}</strong> on KNITE Medico SaaS.
            ${isTrial 
              ? 'Your store account has been activated with a <strong>1-Day Free Trial</strong> of Pro Cloud & POS Billing!' 
              : isApproved 
                ? 'Your store account is active and ready to use.' 
                : 'Your store registration has been recorded successfully.'}
          </p>

          ${isTrial ? `
          <div class="trial-badge">
            🎁 1-Day Free Trial Active Until: <strong>${expiresFormatted}</strong>
            <div style="font-size: 11px; font-weight: normal; margin-top: 4px; color: #15803d;">
              Includes full access to POS Billing, Cloud Sync, and Local Offline DB.
            </div>
          </div>
          ` : ''}

          <div class="details-box">
            <div style="font-size: 13px; margin-bottom: 8px;"><strong>Store Name:</strong> ${shopName}</div>
            <div style="font-size: 13px; margin-bottom: 8px;"><strong>Login Email:</strong> ${toEmail}</div>
            <div style="font-size: 13px; margin-bottom: 8px;"><strong>Account Status:</strong> <span style="font-weight: 800; color: #10b981;">${isTrial ? 'FREE TRIAL ACTIVE' : status}</span></div>
            ${licenseKey ? `<div style="font-size: 13px;"><strong>License:</strong> <code>${licenseKey}</code></div>` : ''}
          </div>

          <p style="font-size: 13px; color: #64748b; line-height: 1.6;">
            Portal Login: <a href="https://knitemedico.kniteinfotech.in" style="color: #ff2c2c; font-weight: bold;">https://knitemedico.kniteinfotech.in</a>
          </p>
        </div>
        <div class="footer">
          Sent by <strong>KNITE Infotech</strong> (${SENDER_EMAIL}) • Chennai, India
        </div>
      </div>
    </body>
    </html>
  `;

  return await mailer.sendMail({
    from: `"${SENDER_NAME}" <${SENDER_EMAIL}>`,
    to: toEmail,
    subject: isTrial 
      ? `🎉 1-Day Free Trial Activated: ${shopName} (KNITE Medico)` 
      : `📋 Store Registration Confirmation: ${shopName} (KNITE Medico)`,
    text: `Hello ${ownerName || ''}!\nYour store registration for "${shopName}" is confirmed. ${isTrial ? 'Your 1-Day Free Trial is active until ' + expiresFormatted : 'Account status: ' + status}.\nPortal: https://knitemedico.kniteinfotech.in\nSent by KNITE Infotech (${SENDER_EMAIL})`,
    html
  });
}

/**
 * Send Store Rejection / Update Notice
 */
async function sendStoreRejectionEmail({ toEmail, shopName, reason }) {
  const mailer = getTransporter();
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: sans-serif; background: #f8fafc; padding: 20px; color: #1e293b;">
      <div style="max-width: 520px; margin: auto; background: white; border-radius: 16px; padding: 25px; border: 1px solid #e2e8f0;">
        <h2 style="color: #b91c1c; margin-top: 0;">Store Registration Update: ${shopName}</h2>
        <p style="font-size: 14px; line-height: 1.6;">Your pharmacy store application could not be approved at this time.</p>
        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 15px; margin: 15px 0; font-size: 13px; color: #991b1b;">
          <strong>Reason:</strong> ${reason || 'Details provided did not meet compliance verification.'}
        </div>
        <p style="font-size: 13px; color: #64748b;">If you believe this was an error or wish to provide corrected documents, please reply directly to this email.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 11px; color: #94a3b8;">KNITE Infotech Support • ${SENDER_EMAIL}</p>
      </div>
    </body>
    </html>
  `;

  return await mailer.sendMail({
    from: `"${SENDER_NAME}" <${SENDER_EMAIL}>`,
    to: toEmail,
    subject: `Notice: Store Registration Update for ${shopName}`,
    text: `Store registration update for ${shopName}: ${reason || 'Application not approved.'}\nKNITE Infotech (${SENDER_EMAIL})`,
    html
  });
}

module.exports = {
  sendRegistrationOTP,
  sendPasswordResetOTP,
  sendPaymentInvoice,
  sendSystemUpdate,
  sendStoreApprovalEmail,
  sendRegistrationConfirmationEmail,
  sendStoreRejectionEmail,
  isEmailConfigured,
  verifyConnection,
  sendTestEmail,
  resetTransporter
};

