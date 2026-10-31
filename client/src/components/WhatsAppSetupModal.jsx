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
  Languages
} from 'lucide-react';
import { db, getActiveStoreId } from '../db/localDb';
import { useLanguage } from '../i18n/languageContext';
import { getCloudUrl } from '../utils/cloudConfig';

export default function WhatsAppSetupModal({ isOpen, onClose, onSave, theme }) {
  const { whatsappLanguage, setWhatsappLanguage, availableLanguages, t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [status, setStatus] = useState('DISCONNECTED'); // 'DISCONNECTED' | 'CONNECTING' | 'QR_READY' | 'CONNECTED'
  const [qrCode, setQrCode] = useState(null);
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
        if (profile.phone) setTestPhone(profile.phone);
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
        setUserPhone(data.userPhone);
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
        setTestResult(`✅ Message delivered successfully to +${data.recipient || testPhone}! Check your phone.`);
      } else {
        setTestResult(`❌ Send failed: ${data.error || 'Could not send test'}`);
      }
    } catch (err) {
      setTestResult(`⚠️ Server error: ${err.message}`);
    } finally {
      setTestSending(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className={`border rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto ${
        isDark ? 'bg-[#121115] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-[#25D366] border border-emerald-500/30 flex items-center justify-center shadow-sm shrink-0">
              <MessageSquare className="w-6 h-6 text-[#25D366]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base tracking-tight text-slate-900 dark:text-white">
                  WhatsApp Invoicing Gateway
                </h3>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                  status === 'CONNECTED' 
                    ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700' 
                    : 'bg-amber-100 text-amber-950 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                }`}>
                  {status === 'CONNECTED' ? '● Linked & Active' : '● Not Linked'}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs font-semibold">
                <Building2 className="w-3.5 h-3.5 text-[#ff2c2c]" />
                <span className="font-extrabold text-slate-900 dark:text-white">{shopName || 'My Medical Store'}</span>
                <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-md bg-rose-100 text-rose-900 border border-rose-300 dark:bg-rose-950/70 dark:text-rose-200 dark:border-rose-800">
                  ID: {storeId}
                </span>
              </div>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ALREADY CONNECTED STATE */}
        {status === 'CONNECTED' ? (
          <div className="space-y-4">
            
            {/* Status Highlight Banner */}
            <div className={`p-4 rounded-2xl border-2 transition ${
              isDark 
                ? 'bg-gradient-to-br from-emerald-950/40 via-slate-900/60 to-emerald-950/30 border-emerald-500/40' 
                : 'bg-gradient-to-br from-emerald-50 via-teal-50/40 to-emerald-50 border-emerald-300 shadow-sm'
            }`}>
              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/30">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-black text-sm text-emerald-950 dark:text-white">
                      WhatsApp Connected
                    </p>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-600 text-white font-mono font-black text-xs shadow-sm">
                      <Smartphone className="w-3.5 h-3.5" /> +{userPhone || 'Store Number'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-semibold">
                    Automated background bill dispatch is active. Bills will send instantly to customers without opening browser tabs or popups.
                  </p>
                </div>
              </div>
            </div>

            {/* Default WhatsApp Bill Language */}
            <div className={`p-4 rounded-2xl border-2 space-y-2 ${
              isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-300'
            }`}>
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase tracking-wide text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Languages className="w-3.5 h-3.5 text-[#25D366]" />
                  <span>Default WhatsApp Bill Language</span>
                </label>
                <span className="text-[10px] font-bold text-slate-500">
                  Multilingual Prescription
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                {availableLanguages.map(l => (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => setWhatsappLanguage(l.code)}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-black flex items-center justify-center gap-1.5 transition ${
                      whatsappLanguage === l.code
                        ? 'bg-gradient-to-r from-[#25D366] to-[#128C7E] text-white border-[#25D366] shadow-sm'
                        : isDark
                          ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>{l.flag}</span>
                    <span>{l.nativeName}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Test Send Section */}
            <div className={`p-4 rounded-2xl border-2 space-y-3 ${
              isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-300'
            }`}>
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase tracking-wide text-slate-900 dark:text-slate-100">
                  Verify Setup: Send a Live Test Bill
                </label>
                <span className="text-[11px] text-emerald-800 dark:text-emerald-400 font-extrabold flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-emerald-600" /> Real-time Dispatch
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3.5 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-xs font-mono font-black text-slate-900 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
                  +91
                </span>
                <input
                  type="tel"
                  className={`flex-1 px-3.5 py-2.5 rounded-xl border-2 text-xs font-mono font-black outline-none transition ${
                    isDark 
                      ? 'bg-slate-800 border-slate-700 text-white focus:border-[#25D366]' 
                      : 'bg-white border-slate-300 text-slate-900 focus:border-[#25D366] placeholder:text-slate-400'
                  }`}
                  placeholder="Recipient Mobile Number"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                />
                <button
                  type="button"
                  onClick={handleTestSend}
                  disabled={testSending}
                  className="px-4 py-2.5 bg-gradient-to-r from-[#25D366] to-[#128C7E] hover:from-emerald-500 hover:to-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition disabled:opacity-50 shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{testSending ? 'Sending...' : 'Send Test'}</span>
                </button>
              </div>

              {testResult && (
                <div className={`p-3 rounded-xl text-xs font-bold ${
                  testResult.includes('✅') 
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700' 
                    : 'bg-rose-50 dark:bg-rose-950/60 text-rose-900 dark:text-rose-200 border border-rose-300 dark:border-rose-700'
                }`}>
                  {testResult}
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={loading}
                className="px-3.5 py-2 rounded-xl border-2 border-rose-300 dark:border-rose-900/60 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-black flex items-center gap-1.5 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Unlink Device</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 bg-[#ff2c2c] hover:bg-rose-600 text-white rounded-xl text-xs font-black shadow-md shadow-rose-500/20 transition"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* NOT CONNECTED: QR PAIRING UI */
          <div className="space-y-4">
            
            {/* Instruction banner */}
            <div className={`p-4 rounded-2xl border flex items-start gap-3.5 shadow-sm ${
              isDark ? 'bg-amber-950/40 border-amber-500/40 text-amber-100' : 'bg-amber-50 border-amber-300 text-amber-950'
            }`}>
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-black text-sm text-amber-950 dark:text-amber-100">
                  Scan QR with WhatsApp to Enable Automatic Billing
                </p>
                <p className="mt-1 leading-relaxed text-amber-900 dark:text-amber-200/90 font-semibold">
                  Link your phone once. All subsequent customer prescription bills will send headlessly in the background.
                </p>
              </div>
            </div>

            {/* QR Code Display Card */}
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
                    <span>Point your phone camera to pair now...</span>
                  </div>
                </div>
              ) : (
                <div className="py-6 space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto text-[#25D366]">
                    <QrCode className="w-9 h-9" />
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold max-w-xs">
                    Click the button below to generate a pairing QR code for this pharmacy.
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
                  <Smartphone className="w-4 h-4 text-[#ff2c2c]" /> 3 Quick Steps to Link:
                </p>
                <ol className="list-decimal list-inside space-y-1.5 text-xs font-medium leading-relaxed text-slate-700 dark:text-slate-300">
                  <li>Open <strong className="text-slate-900 dark:text-white">WhatsApp</strong> on your pharmacy mobile phone</li>
                  <li>Tap <strong className="text-slate-900 dark:text-white">Settings</strong> (or <strong className="text-slate-900 dark:text-white">⋮ Menu</strong>) &gt; <strong className="text-slate-900 dark:text-white">Linked Devices</strong></li>
                  <li>Tap <strong className="text-slate-900 dark:text-white">Link a Device</strong> and scan the QR code above</li>
                </ol>
              </div>

              {qrCode && (
                <button
                  type="button"
                  onClick={() => handleStartPairing(true)}
                  disabled={connecting}
                  className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center gap-1 underline pt-1 font-semibold"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reload / Refresh QR Code</span>
                </button>
              )}
            </div>

            {lastError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-[#ff2c2c] border border-rose-300 dark:border-rose-800 text-xs font-bold">
                ⚠️ {lastError}
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white"
              >
                Close
              </button>

              <button
                type="button"
                onClick={() => handleStartPairing(true)}
                disabled={connecting}
                className="px-5 py-2.5 bg-[#ff2c2c] hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-rose-500/20"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${connecting ? 'animate-spin' : ''}`} />
                <span>{connecting ? 'Connecting...' : 'Check Status'}</span>
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
