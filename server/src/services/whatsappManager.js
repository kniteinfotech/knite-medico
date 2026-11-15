const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers } = require('@whiskeysockets/baileys');
const pino = require('pino');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

// Root directory for storing per-store WhatsApp sessions
const SESSIONS_BASE_DIR = path.join(__dirname, '../../whatsapp_sessions');

if (!fs.existsSync(SESSIONS_BASE_DIR)) {
  fs.mkdirSync(SESSIONS_BASE_DIR, { recursive: true });
}

// In-memory active store sessions
// storeId -> { sock, status: 'IDLE'|'CONNECTING'|'QR_READY'|'CONNECTED'|'DISCONNECTED', qrDataUrl, userPhone, lastError }
const sessions = new Map();

function getSessionDir(storeId) {
  const safeId = String(storeId || 'default').replace(/[^a-zA-Z0-9_-]/g, '_');
  const dir = path.join(SESSIONS_BASE_DIR, safeId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function cleanPhoneNumber(phone) {
  if (!phone) return null;
  let cleaned = String(phone).replace(/\D/g, '');
  while (cleaned.startsWith('0')) {
    cleaned = cleaned.slice(1);
  }
  if (cleaned.length === 10) {
    cleaned = '91' + cleaned; // Standard 10-digit Indian numbers
  }
  return cleaned;
}

/**
 * Get current connection status for a store
 */
function getStoreStatus(storeId) {
  const session = sessions.get(storeId);
  if (!session) {
    // Check if credentials exist on disk
    const sessionDir = getSessionDir(storeId);
    const hasCreds = fs.existsSync(path.join(sessionDir, 'creds.json'));
    return {
      storeId,
      status: hasCreds ? 'SAVED_OFFLINE' : 'DISCONNECTED',
      isConnected: false,
      hasSavedSession: hasCreds,
      userPhone: null,
      qrCode: null
    };
  }

  return {
    storeId,
    status: session.status,
    isConnected: session.status === 'CONNECTED',
    hasSavedSession: true,
    userPhone: session.userPhone,
    qrCode: session.qrDataUrl,
    pairingCode: session.pairingCode,
    lastError: session.lastError
  };
}

/**
 * Request an 8-character pairing code for mobile phone WhatsApp linking
 * (Allows pharmacists on mobile phones to link without scanning a QR on their own screen)
 */
async function requestPairingCodeForStore(storeId, phoneNumber) {
  const cleanPhone = cleanPhoneNumber(phoneNumber);
  if (!cleanPhone) throw new Error('Valid 10-digit mobile phone number required');

  // Always start a fresh clean session for pairing code to reset WhatsApp handshake state
  await startStoreSession(storeId, true);
  const session = sessions.get(storeId);

  if (session && session.sock) {
    if (session.sock.authState.creds.registered) {
      throw new Error('This pharmacy WhatsApp account is already linked.');
    }

    // Wait until socket is actively connected to WhatsApp servers
    let waited = 0;
    while ((!session.sock.ws || !session.sock.ws.isOpen) && waited < 8000) {
      await new Promise(r => setTimeout(r, 200));
      waited += 200;
    }
    // Small extra pause for WhatsApp connection verification
    await new Promise(r => setTimeout(r, 1000));

    try {
      const rawCode = await session.sock.requestPairingCode(cleanPhone);
      const formattedCode = rawCode?.match(/.{1,4}/g)?.join('-') || rawCode;
      session.pairingCode = formattedCode;
      session.status = 'PAIRING_CODE_READY';
      console.log(`📲 [WA-${storeId}] Mobile Pairing Code generated for +${cleanPhone}: ${formattedCode}`);
      return {
        success: true,
        pairingCode: formattedCode,
        phone: cleanPhone,
        message: 'Pairing code generated! Open WhatsApp notification on this phone to link.'
      };
    } catch (pairErr) {
      console.error(`[WA-${storeId}] Pairing code request failed:`, pairErr);
      throw new Error(pairErr.message || 'WhatsApp rejected pairing code request. Check your phone number.');
    }
  }
  throw new Error('Failed to initialize WhatsApp connection socket');
}

/**
 * Start or resume WhatsApp connection for a store
 */
async function startStoreSession(storeId, forceNew = false) {
  if (!storeId) throw new Error('storeId is required');

  const sessionDir = getSessionDir(storeId);

  const existing = sessions.get(storeId);

  // If forceNew is requested, wipe old credentials
  if (forceNew) {
    if (existing?.sock) {
      try {
        existing.sock.ev.removeAllListeners();
        existing.sock.end();
      } catch (e) {}
    }
    sessions.delete(storeId);
    try {
      fs.rmSync(sessionDir, { recursive: true, force: true });
      fs.mkdirSync(sessionDir, { recursive: true });
    } catch (err) {
      console.warn(`[WA-${storeId}] Error clearing session dir:`, err.message);
    }
  } else if (existing?.sock) {
    // If not forceNew but reconnecting, close old socket cleanly without wiping creds
    try {
      existing.sock.ev.removeAllListeners();
      existing.sock.end();
    } catch (e) {}
  }

  // If already connected, return current status
  if (!forceNew && existing && existing.status === 'CONNECTED') {
    return getStoreStatus(storeId);
  }

  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

  const sessionData = {
    sock: null,
    status: existing?.pairingCode ? 'PAIRING_CODE_READY' : 'CONNECTING',
    qrDataUrl: existing?.qrDataUrl || null,
    pairingCode: existing?.pairingCode || null,
    userPhone: existing?.userPhone || null,
    lastError: null
  };
  sessions.set(storeId, sessionData);

  try {
    const sock = makeWASocket({
      auth: state,
      logger: pino({ level: 'silent' }),
      printQRInTerminal: false,
      browser: Browsers.macOS('Chrome'),
      syncFullHistory: false,
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
      keepAliveIntervalMs: 15000
    });

    sessionData.sock = sock;

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        try {
          const qrDataUrl = await QRCode.toDataURL(qr, { margin: 2, scale: 7 });
          sessionData.qrDataUrl = qrDataUrl;
          // Protect pairing code state if pharmacist requested pairing code
          if (sessionData.status !== 'PAIRING_CODE_READY') {
            sessionData.status = 'QR_READY';
          }
          console.log(`📲 [WA-${storeId}] QR Code ready (status: ${sessionData.status})`);
        } catch (qrErr) {
          console.error(`[WA-${storeId}] QR generation failed:`, qrErr);
        }
      }

      if (connection === 'open') {
        sessionData.status = 'CONNECTED';
        sessionData.qrDataUrl = null;
        sessionData.pairingCode = null;
        sessionData.lastError = null;
        const userJid = sock.user?.id || '';
        const phone = userJid.split(':')[0].replace(/[^0-9]/g, '');
        sessionData.userPhone = phone;
        console.log(`✅ [WA-${storeId}] WhatsApp Linked & Connected! Phone: +${phone}`);
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const isLoggedOut = statusCode === DisconnectReason.loggedOut;
        const isRestart = statusCode === DisconnectReason.restartRequired || statusCode === 515;

        console.warn(`⚠️ [WA-${storeId}] WhatsApp disconnected (code: ${statusCode}, isRestart: ${isRestart}, isLoggedOut: ${isLoggedOut})`);

        if (isLoggedOut) {
          sessionData.status = 'DISCONNECTED';
          sessionData.qrDataUrl = null;
          sessionData.userPhone = null;
          sessionData.pairingCode = null;
          sessions.delete(storeId);
          try {
            fs.rmSync(sessionDir, { recursive: true, force: true });
          } catch (e) {}
        } else if (isRestart) {
          // CRITICAL: Code 515 (restartRequired) is sent by WhatsApp immediately after the user enters the pairing code!
          // Reconnect IMMEDIATELY (within 300ms) with the saved credentials so the phone's handshake doesn't timeout!
          console.log(`⚡ [WA-${storeId}] Pairing code accepted! Reconnecting immediately to complete device link...`);
          sessionData.status = 'CONNECTING';
          setTimeout(() => {
            startStoreSession(storeId, false).catch(err => {
              console.warn(`[WA-${storeId}] Immediate restart reconnect failed:`, err.message);
            });
          }, 300);
        } else {
          sessionData.status = sessionData.pairingCode ? 'PAIRING_CODE_READY' : 'CONNECTING';
          sessionData.lastError = lastDisconnect?.error?.message || 'Connection closed';
          // Auto reconnect for normal network drops
          setTimeout(() => {
            if (sessions.has(storeId)) {
              startStoreSession(storeId, false).catch(err => {
                console.warn(`[WA-${storeId}] Auto reconnect failed:`, err.message);
              });
            }
          }, 2000);
        }
      }
    });

    return getStoreStatus(storeId);
  } catch (err) {
    sessionData.status = 'DISCONNECTED';
    sessionData.lastError = err.message;
    console.error(`[WA-${storeId}] Initialization error:`, err);
    throw err;
  }
}

/**
 * Disconnect and unlink WhatsApp for a store
 */
async function disconnectStore(storeId) {
  const session = sessions.get(storeId);
  if (session?.sock) {
    try {
      await session.sock.logout();
    } catch (e) {
      try { session.sock.end(); } catch (e2) {}
    }
  }
  sessions.delete(storeId);

  const sessionDir = getSessionDir(storeId);
  try {
    fs.rmSync(sessionDir, { recursive: true, force: true });
  } catch (e) {}

  console.log(`🔌 [WA-${storeId}] Disconnected & unlinked WhatsApp device.`);
  return { success: true, message: 'WhatsApp session unlinked successfully.' };
}

/**
 * Send bill message headlessly through the store's linked WhatsApp
 */
async function sendBillWhatsApp(storeId, rawPhone, messageText) {
  const cleanPhone = cleanPhoneNumber(rawPhone);
  if (!cleanPhone) {
    return { success: false, error: 'Invalid customer phone number' };
  }

  let session = sessions.get(storeId);

  // If not in memory but credentials exist on disk, attempt background connect
  if (!session || session.status !== 'CONNECTED') {
    const sessionDir = getSessionDir(storeId);
    if (fs.existsSync(path.join(sessionDir, 'creds.json'))) {
      try {
        console.log(`🔄 [WA-${storeId}] Resuming saved session for bill dispatch...`);
        await startStoreSession(storeId, false);
        // Wait up to 4 seconds for socket to open
        for (let i = 0; i < 8; i++) {
          await new Promise(r => setTimeout(r, 500));
          session = sessions.get(storeId);
          if (session?.status === 'CONNECTED') break;
        }
      } catch (err) {
        console.warn(`[WA-${storeId}] Could not auto-resume session:`, err.message);
      }
    }
  }

  if (!session || session.status !== 'CONNECTED' || !session.sock) {
    return {
      success: false,
      notLinked: true,
      error: 'WhatsApp is not linked for this pharmacy. Please link your phone in WhatsApp Settings to enable automatic background sending.'
    };
  }

  const jid = `${cleanPhone}@s.whatsapp.net`;

  try {
    const sent = await session.sock.sendMessage(jid, { text: messageText });
    console.log(`🚀 [WA-${storeId}] Real WhatsApp message dispatched to +${cleanPhone}, msgId: ${sent?.key?.id}`);
    return {
      success: true,
      messageId: sent?.key?.id,
      senderPhone: session.userPhone,
      recipient: cleanPhone
    };
  } catch (err) {
    console.error(`❌ [WA-${storeId}] Failed to send WhatsApp message to +${cleanPhone}:`, err);
    return {
      success: false,
      error: `Failed to deliver message: ${err.message}`
    };
  }
}

// Auto-resume existing saved sessions on server start
function autoResumeAllSessions() {
  try {
    if (!fs.existsSync(SESSIONS_BASE_DIR)) return;
    const dirs = fs.readdirSync(SESSIONS_BASE_DIR, { withFileTypes: true });
    for (const d of dirs) {
      if (d.isDirectory()) {
        const credsFile = path.join(SESSIONS_BASE_DIR, d.name, 'creds.json');
        if (fs.existsSync(credsFile)) {
          console.log(`🔌 [WA] Found saved credentials for store: ${d.name}, connecting...`);
          startStoreSession(d.name, false).catch(err => {
            console.warn(`[WA] Failed to auto-resume ${d.name}:`, err.message);
          });
        }
      }
    }
  } catch (e) {
    console.warn('[WA] autoResumeAllSessions error:', e.message);
  }
}

module.exports = {
  getStoreStatus,
  startStoreSession,
  requestPairingCodeForStore,
  disconnectStore,
  sendBillWhatsApp,
  autoResumeAllSessions,
  cleanPhoneNumber
};
