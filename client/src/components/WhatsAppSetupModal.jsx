import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Send, 
  Check, 
  X, 
  Smartphone, 
  CheckCircle2, 
  ShieldCheck, 
  Zap, 
  QrCode, 
  RefreshCw, 
  LogOut, 
  AlertCircle,
  Building2,
  Languages,
  Copy,
  Bell
} from 'lucide-react';
import { db, getActiveStoreId } from '../db/localDb';
import { useLanguage } from '../i18n/languageContext';
import { getCloudUrl } from '../utils/cloudConfig';

export default function WhatsAppSetupModal({ isOpen, onClose, onSave, theme }) {
  const { whatsappLanguage, setWhatsappLanguage, availableLanguages, t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [status, setStatus] = useState('DISCONNECTED'); // 'DISCONNECTED' | 'CONNECTING' | 'QR_READY' | 'PAIRING_CODE_READY' | 'CONNECTED'
  const [qrCode, setQrCode] = useState(null);
  const [pairingCode, setPairingCode] = useState('');
  const [pairingMode, setPairingMode] = useState('phone'); // 'phone' (default for mobile) | 'qr' (for desktop)
  const [mobilePhone, setMobilePhone] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [userPhone, setUserPhone] = useState(null);
  const [lastError, setLastError] = useState(null);
  const [testPhone, setTestPhone] = useState('');
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState('');
  const [shopName, setShopName] = useState('');

  const pollIntervalRef = useRef(null);
  const cloudUrl = getCloudUrl();
  const storeId = getActiveStoreId();
  const isDark = theme === 'dark';

  useEffect(() => {
    if (!isOpen) {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      return;
    }

    db.settings.get('store_profile').then(profile => {
      if (profile) {
        if (profile.shop_name) setShopName(profile.shop_name);
        if (profile.phone) {
          setTestPhone(profile.phone);
          setMobilePhone(profile.phone);
        }
      }
    });

    fetchStatus();

    // Auto-poll status while modal is open
    pollIntervalRef.current = setInterval(() => {
      fetchStatus(true);
    }, 2500);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [isOpen, storeId]);

  async function fetchStatus(isSilent = false) {
    if (!isSilent) setLoading(true);
    try {
      const res = await fetch(`${cloudUrl}/api/whatsapp/status?store_id=${encodeURIComponent(storeId)}`);
      const data = await res.json();
      if (data.success) {
        setStatus(data.status);
        setQrCode(data.qrCode);
        if (data.pairingCode) setPairingCode(data.pairingCode);
        setUserPhone(data.userPhone);

        // If newly connected and browser notifications permitted, alert the user
        if (data.status === 'CONNECTED' && status !== 'CONNECTED' && 'Notification' in window && Notification.permission === 'granted') {
          new Notification('KNITE Medico WhatsApp Connected! 🎉', {
            body: `Your store (+${data.userPhone || ''}) is now linked for automatic background billing.`,
            icon: '/logo_icon.png'
          });
        }
      }
    } catch (err) {
      console.warn('WhatsApp status check failed:', err.message);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }

  async function handleStartPairing(forceNew = false) {
    setConnecting(true);
    setLastError(null);
    try {
      const res = await fetch(`${cloudUrl}/api/whatsapp/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store_id: storeId, force_new: forceNew })
      });
      const data = await res.json();
      if (data.success) {
        setStatus(data.status);
        setQrCode(data.qrCode);
        setUserPhone(data.userPhone);
      } else {
        setLastError(data.error || 'Failed to start WhatsApp pairing');
      }
    } catch (err) {
      setLastError('Failed to reach backend server: ' + err.message);
    } finally {
      setConnecting(false);
    }
  }

  async function handleRequestPairingCode() {
    if (!mobilePhone || mobilePhone.replace(/\D/g, '').length < 10) {
      setLastError('Please enter a valid 10-digit WhatsApp mobile number');
      return;
    }
    setConnecting(true);
    setLastError(null);
    setPairingCode('');

    // Request notification permission if not yet granted
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    try {
      const res = await fetch(`${cloudUrl}/api/whatsapp/pairing-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store_id: storeId, phone: mobilePhone.trim() })
      });
      const data = await res.json();
      if (data.success && data.pairingCode) {
        setPairingCode(data.pairingCode);
        setStatus('PAIRING_CODE_READY');
      } else {
        setLastError(data.error || 'Could not generate pairing code. Please retry.');
      }
    } catch (err) {
      setLastError('Connection error: ' + err.message);
    } finally {
      setConnecting(false);
    }
  }

  function handleCopyCode() {
    if (!pairingCode) return;
    navigator.clipboard.writeText(pairingCode.replace(/-/g, ''));
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 3000);
  }

  async function handleDisconnect() {
    if (!window.confirm('Are you sure you want to unlink WhatsApp for this pharmacy?')) return;
    setLoading(true);
    try {
      await fetch(`${cloudUrl}/api/whatsapp/disconnect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store_id: storeId })
      });
      setStatus('DISCONNECTED');
      setQrCode(null);
      setPairingCode('');
      setUserPhone(null);
      setTestResult('');
    } catch (err) {
      alert('Failed to disconnect: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleTestSend() {
    if (!testPhone) {
      alert('Please enter a phone number to test');
      return;
    }
    setTestSending(true);
    setTestResult('');
    try {
      const res = await fetch(`${cloudUrl}/api/whatsapp/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: storeId,
          phone: testPhone,
          test_message: `🔔 *${(shopName || 'KNITE MEDICO PHARMACY').toUpperCase()}*\n\n✅ Your store's automated WhatsApp bill dispatch is *ACTIVE*!\nPrescription bills will now arrive automatically without opening browser tabs.`
        })
      });
      const data = await res.json();
      if (data.success) {
        setTestResult(`✅ Message delivered successfully to +${data.recipient || testPhone}`);
      } else {
        setTestResult(`❌ Failed: ${data.error || 'Message dispatch failed'}`);
      }
    } catch (err) {
      setTestResult(`❌ Error: ${err.message}`);
    } finally {
      setTestSending(false);
    }
  }

  if (!isOpen) return null;

  const isConnected = status === 'CONNECTED';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className={`w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-3xl shadow-2xl border transition-all ${
        isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {/* Header */}
        <div className="relative p-5 sm:p-6 pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#25D366] to-[#128C7E] flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>WhatsApp Automated Invoicing</span>
                {isConnected && (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Linked
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                Direct background bill dispatch to customer WhatsApp numbers
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 sm:p-6 space-y-5">
          {isConnected ? (
            /* CONNECTED VIEW */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700/60 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-black text-base shadow">
                    <Check className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-black text-emerald-900 dark:text-emerald-100 text-sm">
                      WhatsApp Gateway Active
                    </h3>
                    <p className="text-xs text-emerald-800 dark:text-emerald-300 font-semibold">
                      Connected: <span className="font-mono font-bold">+{userPhone || 'Registered Pharmacy Mobile'}</span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleDisconnect}
                  className="px-3 py-1.5 rounded-xl border border-rose-300 dark:border-rose-800 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition flex items-center gap-1 shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Unlink</span>
                </button>
              </div>

              {/* Language Preference */}
              <div className={`p-4 rounded-2xl border ${isDark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-slate-50'}`}>
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                  <Languages className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Default WhatsApp Bill Language:</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {availableLanguages.map(l => (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => setWhatsappLanguage(l.code)}
                      className={`p-2.5 rounded-xl text-xs font-bold border transition text-center ${
                        whatsappLanguage === l.code
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                          : isDark
                          ? 'border-slate-700 bg-slate-800/80 text-slate-300 hover:border-slate-600'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div>{l.name}</div>
                      <div className="text-[10px] opacity-75 font-normal">{l.nativeName}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Test Dispatch Box */}
              <div className={`p-4 rounded-2xl border ${isDark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-slate-50'}`}>
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Send Live Test Bill</span>
                </h4>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    placeholder="Enter phone with code (e.g. 9876543210)"
                    className={`flex-1 px-3.5 py-2.5 rounded-xl border text-xs font-mono font-bold outline-none ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                  <button
                    onClick={handleTestSend}
                    disabled={testSending}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 shrink-0 shadow-md shadow-emerald-600/20"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{testSending ? 'Sending…' : 'Send Test'}</span>
                  </button>
                </div>
                {testResult && (
                  <p className="mt-2 text-xs font-semibold text-slate-700 dark:text-slate-300">{testResult}</p>
                )}
              </div>
            </div>
          ) : (
            /* NOT CONNECTED: TABBED PAIRING (MOBILE PAIRING CODE OR PC QR SCAN) */
            <div className="space-y-4">
              {/* Tab Selector */}
              <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setPairingMode('phone')}
                  className={`py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition ${
                    pairingMode === 'phone'
                      ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm border border-slate-200 dark:border-slate-700'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Smartphone className="w-4 h-4 text-emerald-600" />
                  <span>📱 Phone Code (Mobile)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPairingMode('qr');
                    if (!qrCode) handleStartPairing(true);
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition ${
                    pairingMode === 'qr'
                      ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm border border-slate-200 dark:border-slate-700'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <QrCode className="w-4 h-4 text-emerald-600" />
                  <span>💻 Scan QR (PC / Laptop)</span>
                </button>
              </div>

              {/* MODE 1: MOBILE PHONE PAIRING CODE (NO CAMERA SCANNING NEEDED!) */}
              {pairingMode === 'phone' ? (
                <div className={`p-5 rounded-2xl border space-y-4 ${
                  isDark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-slate-50'
                }`}>
                  <div className="text-center space-y-1">
                    <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center justify-center gap-2">
                      <Zap className="w-4 h-4 text-amber-500" />
                      <span>Link Directly on this Phone (No QR Scan)</span>
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                      Enter your pharmacy WhatsApp number to receive an 8-character pairing code
                    </p>
                  </div>

                  {pairingCode ? (
                    /* Display Pairing Code */
                    <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border-2 border-emerald-500/50 shadow-lg text-center space-y-3">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                        Your WhatsApp Pairing Code
                      </p>
                      <div className="text-3xl sm:text-4xl font-mono font-black tracking-widest text-emerald-600 dark:text-emerald-400 select-all">
                        {pairingCode}
                      </div>

                      <div className="flex items-center justify-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handleCopyCode}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition shadow"
                        >
                          {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedCode ? 'Code Copied!' : 'Copy Code'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleRequestPairingCode}
                          disabled={connecting}
                          className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${connecting ? 'animate-spin' : ''}`} />
                        </button>
                      </div>

                      <div className="text-left p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs space-y-1.5 text-emerald-950 dark:text-emerald-100">
                        <p className="font-black flex items-center gap-1">
                          <Bell className="w-3.5 h-3.5 text-emerald-600" /> What to do now on your phone:
                        </p>
                        <ol className="list-decimal list-inside space-y-1 font-medium">
                          <li>Check your phone notifications for: <strong>"Enter code to link new device"</strong>.</li>
                          <li>Or open <strong>WhatsApp</strong> &gt; <strong>Linked Devices</strong> &gt; <strong>Link with phone number</strong>.</li>
                          <li>Enter code: <strong className="font-mono text-emerald-700 dark:text-emerald-300">{pairingCode}</strong>.</li>
                        </ol>
                      </div>
                    </div>
                  ) : (
                    /* Phone Number Input Form */
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-extrabold text-slate-700 dark:text-slate-200 block mb-1">
                          Your Pharmacy WhatsApp Mobile Number:
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="tel"
                            value={mobilePhone}
                            onChange={(e) => setMobilePhone(e.target.value)}
                            placeholder="e.g. 9876543210 (10 digits)"
                            className={`flex-1 px-4 py-3 rounded-xl border text-sm font-mono font-bold outline-none ${
                              isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={handleRequestPairingCode}
                            disabled={connecting}
                            className="px-5 py-3 bg-gradient-to-r from-[#25D366] to-[#128C7E] hover:from-emerald-500 hover:to-emerald-700 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 transition shrink-0"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${connecting ? 'animate-spin' : ''}`} />
                            <span>{connecting ? 'Generating Code…' : 'Get Pairing Code'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* MODE 2: PC / LAPTOP QR SCAN */
                <div className={`flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed space-y-4 text-center ${
                  isDark ? 'border-slate-800 bg-slate-900/40' : 'border-slate-200 bg-slate-50'
                }`}>
                  {qrCode ? (
                    <div className="space-y-3 flex flex-col items-center">
                      <div className="p-3.5 bg-white rounded-2xl shadow-xl border border-slate-200 inline-block">
                        <img 
                          src={qrCode} 
                          alt="WhatsApp Pairing QR Code" 
                          className="w-56 h-56 object-contain"
                        />
                      </div>
                      <div className="inline-flex items-center gap-2 text-xs font-black px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 shadow-sm animate-pulse">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600 dark:text-emerald-400" />
                        <span>Point your phone camera at this QR code...</span>
                      </div>
                    </div>
                  ) : (
                    <div className="py-6 space-y-3">
                      <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto text-[#25D366]">
                        <QrCode className="w-9 h-9" />
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold max-w-xs">
                        Click the button below to generate a pairing QR code on this computer.
                      </p>
                      <button
                        type="button"
                        onClick={() => handleStartPairing(true)}
                        disabled={connecting}
                        className="px-5 py-2.5 bg-gradient-to-r from-[#25D366] to-[#128C7E] hover:from-emerald-500 hover:to-emerald-700 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-500/20 flex items-center gap-2 mx-auto transition"
                      >
                        <RefreshCw className={`w-4 h-4 ${connecting ? 'animate-spin' : ''}`} />
                        <span>{connecting ? 'Generating QR Code...' : 'Generate Pairing QR Code'}</span>
                      </button>
                    </div>
                  )}

                  {/* Step-by-step instructions */}
                  <div className={`text-left p-4 rounded-xl border w-full text-xs space-y-2 ${
                    isDark ? 'bg-slate-800/80 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                  }`}>
                    <p className="font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4 text-[#ff2c2c]" /> 3 Quick Steps to Scan:
                    </p>
                    <ol className="list-decimal list-inside space-y-1.5 text-xs font-medium leading-relaxed text-slate-700 dark:text-slate-300">
                      <li>Open <strong className="text-slate-900 dark:text-white">WhatsApp</strong> on your pharmacy mobile phone</li>
                      <li>Tap <strong className="text-slate-900 dark:text-white">Settings</strong> (or <strong className="text-slate-900 dark:text-white">⋮ Menu</strong>) &gt; <strong className="text-slate-900 dark:text-white">Linked Devices</strong></li>
                      <li>Tap <strong className="text-slate-900 dark:text-white">Link a Device</strong> and point your camera at the QR code above</li>
                    </ol>
                  </div>
                </div>
              )}

              {lastError && (
                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-[#ff2c2c] border border-rose-300 dark:border-rose-800 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{lastError}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white transition"
          >
            Close
          </button>
          {isConnected && (
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-600/20 transition"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
