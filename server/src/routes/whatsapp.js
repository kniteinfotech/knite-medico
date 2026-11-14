const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const whatsappManager = require('../services/whatsappManager');

// Helper to get global WhatsApp config (legacy Meta fallback)
async function getWhatsAppGatewayConfig() {
  try {
    const res = await pool.query("SELECT value FROM medico.system_settings WHERE key = 'whatsapp_gateway'");
    if (res.rows.length > 0) {
      return res.rows[0].value;
    }
  } catch (e) {
    console.warn('System settings query warning:', e.message);
  }
  return {
    provider: 'BAILEYS_QR',
    auto_send: true,
    meta_api_token: '',
    meta_phone_id: ''
  };
}

// 1. Get WhatsApp Connection Status & Pairing QR for a Store
router.get('/status', async (req, res) => {
  const storeId = req.query.store_id || req.query.tenant_id || 'default';
  try {
    const status = whatsappManager.getStoreStatus(storeId);
    res.json({ success: true, ...status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Request / Initialize WhatsApp QR Pairing Session for a Store
router.post('/connect', async (req, res) => {
  const { store_id, force_new } = req.body;
  const storeId = store_id || 'default';
  try {
    const status = await whatsappManager.startStoreSession(storeId, !!force_new);
    res.json({ success: true, ...status });
  } catch (err) {
    console.error(`WhatsApp connect error for ${storeId}:`, err);
    res.status(500).json({ error: 'Failed to initiate WhatsApp session: ' + err.message });
  }
});

// 3. Disconnect / Unlink WhatsApp Session for a Store
router.post('/disconnect', async (req, res) => {
  const { store_id } = req.body;
  const storeId = store_id || 'default';
  try {
    const result = await whatsappManager.disconnectStore(storeId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Rate limit tracking to prevent WhatsApp spam / flooding attacks
const waRateLimits = new Map();

// 4. Send Automated Bill via WhatsApp (Headless Server Dispatch)
router.post('/send-bill', async (req, res) => {
  const { 
    store_id,
    phone, 
    customer_name, 
    shop_name, 
    invoice_number, 
    grand_total, 
    payment_mode, 
    items = [],
    language = 'en',
    include_description = false,
    custom_message
  } = req.body;

  const storeId = (store_id || 'default').replace(/[^a-zA-Z0-9_-]/g, '');

  // Rate Limiting: Max 40 messages per minute per store to prevent carrier blocks
  const now = Date.now();
  const storeLimit = waRateLimits.get(storeId) || { count: 0, resetAt: now + 60000 };
  if (now > storeLimit.resetAt) {
    storeLimit.count = 1;
    storeLimit.resetAt = now + 60000;
  } else {
    storeLimit.count += 1;
    if (storeLimit.count > 40) {
      return res.status(429).json({ error: 'WhatsApp dispatch rate limit exceeded. Please wait a minute.' });
    }
  }
  waRateLimits.set(storeId, storeLimit);

  if (!phone) {
    return res.status(400).json({ error: 'Customer phone number required' });
  }

  let cleanPhone = whatsappManager.cleanPhoneNumber(phone);
  if (!cleanPhone) {
    return res.status(400).json({ error: 'Invalid phone number format' });
  }

  const itemsSummary = items
    .slice(0, 8)
    .map(it => {
      let line = `• ${it.medicine_name || it.name} (x${it.quantity}) - ₹${parseFloat(it.total_amount || 0).toFixed(2)}`;
      if (include_description && it.description) {
        line += `\n   ↳ _${it.description}_`;
      }
      return line;
    })
    .join('\n');

  const moreItemsText = items.length > 8 ? `\n_...and ${items.length - 8} more items_` : '';
  const dateFormatted = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  let messageText = custom_message;

  if (!messageText) {
    const sName = (shop_name || 'KNITE MEDICO PHARMACY').toUpperCase();
    const cName = customer_name || 'Valued Customer';
    const grandFormatted = parseFloat(grand_total || 0).toFixed(2);
    const pMode = payment_mode || 'CASH';

    if (language === 'ta') {
      // Tamil (தமிழ்)
      messageText =
        `*${sName}* 💊\n` +
        `_அங்கீகரிக்கப்பட்ட மருத்துவ ரசீது & கட்டண விவரம்_\n\n` +
        `வணக்கம் *${customer_name || 'அன்பார்ந்த வாடிக்கையாளர்'}*! 👋\n` +
        `உங்கள் மருத்துவ ரசீது வெற்றிகரமாக உருவாக்கப்பட்டுள்ளது.\n\n` +
        `📄 *ரசீது எண்:* ${invoice_number}\n` +
        `💰 *மொத்தத் தொகை:* ₹${grandFormatted}\n` +
        `💳 *செலுத்தும் முறை:* ${pMode}\n` +
        `📅 *தேதி:* ${dateFormatted}\n\n` +
        (itemsSummary ? `*மருந்துகள் விவரம்:*\n${itemsSummary}${moreItemsText}\n\n` : '') +
        `🙏 *${(shop_name || 'எங்கள் மருந்தகத்தை')} அணுகியமைக்கு நன்றி! விரைவில் நலம்பெற வாழ்த்துகிறோம்.*\n` +
        `_KNITE Medico மூலம் இயக்கப்படுகிறது_`;
    } else if (language === 'ml') {
      // Malayalam (മലയാളം)
      messageText =
        `*${sName}* 💊\n` +
        `_ഔദ്യോഗിക മെഡിക്കൽ ബില്ലും പേയ്‌മെന്റ് രസീതും_\n\n` +
        `നമസ്കാരം *${customer_name || 'പ്രിയ ഉപഭോക്താവേ'}*! 👋\n` +
        `താങ്കളുടെ മെഡിക്കൽ ബിൽ വിജയകരമായി പൂർത്തിയായി.\n\n` +
        `📄 *ഇൻവോയ്സ് നമ്പർ:* ${invoice_number}\n` +
        `💰 *ആകെ തുക:* ₹${grandFormatted}\n` +
        `💳 *പേയ്‌മെന്റ് രീതി:* ${pMode}\n` +
        `📅 *തീയതി:* ${dateFormatted}\n\n` +
        (itemsSummary ? `*മരുന്നുകളുടെ വിവരങ്ങൾ:*\n${itemsSummary}${moreItemsText}\n\n` : '') +
        `🙏 *${(shop_name || 'ഞങ്ങളുടെ ഫാർമസി')} തിരഞ്ഞെടുത്തതിന് നന്ദി! ആയുരാരോഗ്യം നേരുന്നു.*\n` +
        `_Powered by KNITE Medico SaaS_`;
    } else if (language === 'hi') {
      // Hindi (हिन्दी)
      messageText =
        `*${sName}* 💊\n` +
        `_आधिकारिक दवा बिल एवं भुगतान रசீद_\n\n` +
        `नमस्ते *${customer_name || 'प्रिय ग्राहक'}*! 👋\n` +
        `आपका मेडिकल बिल सफलतापूर्वक तैयार हो गया है।\n\n` +
        `📄 *बिल संख्या:* ${invoice_number}\n` +
        `💰 *कुल राशि:* ₹${grandFormatted}\n` +
        `💳 *भुगतान माध्यम:* ${pMode}\n` +
        `📅 *दिनांक:* ${dateFormatted}\n\n` +
        (itemsSummary ? `*दवाओं का विवरण:*\n${itemsSummary}${moreItemsText}\n\n` : '') +
        `🙏 *${(shop_name || 'हमारी फार्मेसी')} पर भरोसा करने के लिए धन्यवाद! आपके उत्तम स्वास्थ्य की कामना करते हैं।*\n` +
        `_KNITE Medico द्वारा संचालित_`;
    } else {
      // English (Default)
      messageText = 
        `*${sName}* 💊\n` +
        `_Official Prescription Bill & Payment Receipt_\n\n` +
        `Hello *${cName}*! 👋\n` +
        `Your prescription bill has been processed successfully.\n\n` +
        `📄 *Invoice No:* ${invoice_number}\n` +
        `💰 *Grand Total:* ₹${grandFormatted}\n` +
        `💳 *Payment Method:* ${pMode}\n` +
        `📅 *Date:* ${dateFormatted}\n\n` +
        (itemsSummary ? `*Prescription Items:*\n${itemsSummary}${moreItemsText}\n\n` : '') +
        `🙏 *Thank you for choosing ${(shop_name || 'our pharmacy')}! Wishing you good health.*\n` +
        `_Powered by KNITE Medico SaaS_`;
    }
  }

  try {
    // Check if Meta Cloud API is explicitly configured
    const config = await getWhatsAppGatewayConfig();
    if (config.provider === 'META_CLOUD_API' && config.meta_api_token && config.meta_phone_id) {
      const metaRes = await fetch(`https://graph.facebook.com/v19.0/${config.meta_phone_id}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.meta_api_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: cleanPhone,
          type: 'text',
          text: { body: messageText }
        })
      });
      const metaData = await metaRes.json();
      console.log('✅ Meta Cloud API WhatsApp dispatched:', metaData);

      return res.json({
        success: true,
        mode: 'META_CLOUD_API',
        status: 'DELIVERED',
        recipient: cleanPhone,
        timestamp: new Date().toISOString()
      });
    }

    // Default & Preferred: Send directly via Store's Linked Baileys Session
    const sendResult = await whatsappManager.sendBillWhatsApp(storeId, cleanPhone, messageText);

    if (!sendResult.success) {
      if (sendResult.notLinked) {
        return res.status(400).json({
          success: false,
          notLinked: true,
          error: sendResult.error,
          message_text: messageText,
          recipient: cleanPhone
        });
      }
      return res.status(500).json({ success: false, error: sendResult.error });
    }

    return res.json({
      success: true,
      mode: 'LINKED_DEVICE',
      status: 'DELIVERED',
      messageId: sendResult.messageId,
      sender: sendResult.senderPhone,
      recipient: cleanPhone,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error('WhatsApp send error:', err);
    res.status(500).json({ error: 'WhatsApp dispatch failed: ' + err.message });
  }
});

// 5. Test Endpoint
router.post('/test', async (req, res) => {
  const { store_id, phone, test_message } = req.body;
  const storeId = store_id || 'default';
  if (!phone) return res.status(400).json({ error: 'Phone number required' });

  const msg = test_message || '🔔 KNITE Medico WhatsApp test message: your pharmacy WhatsApp is connected and active!';
  const result = await whatsappManager.sendBillWhatsApp(storeId, phone, msg);
  
  if (!result.success) {
    return res.status(400).json(result);
  }

  res.json({
    success: true,
    status: 'TEST_DISPATCHED_SUCCESSFULLY',
    ...result
  });
});

// 6. SuperAdmin Legacy Config
router.get('/config', async (req, res) => {
  const config = await getWhatsAppGatewayConfig();
  res.json({ success: true, config });
});

router.post('/config', async (req, res) => {
  const { config } = req.body;
  try {
    await pool.query(
      `INSERT INTO medico.system_settings (key, value, updated_at)
       VALUES ('whatsapp_gateway', $1, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [config]
    );
    res.json({ success: true, message: 'WhatsApp Gateway settings saved' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save config: ' + err.message });
  }
});

module.exports = router;
