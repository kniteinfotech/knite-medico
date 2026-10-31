import React, { useState, useEffect } from 'react';
import { 
  Cloud, 
  ShieldCheck, 
  Key, 
  Server, 
  UploadCloud, 
  DownloadCloud, 
  CheckCircle2, 
  X, 
  RefreshCw,
  Sparkles,
  Lock,
  ArrowRight,
  Zap,
  CreditCard,
  AlertTriangle,
  HardDrive,
  Repeat
} from 'lucide-react';
import { SyncService } from '../services/syncService';
import { db } from '../db/localDb';
import { getCloudUrl } from '../utils/cloudConfig';
import PhonePeModal from './PhonePeModal';

export default function CloudSyncModal({ isOpen, onClose, onSyncSuccess, theme }) {
  const [activeTab, setActiveTab] = useState('status'); // status | upgrade | backup
  const [cloudUrl, setCloudUrl] = useState(() => getCloudUrl());
  const [authToken, setAuthToken] = useState(localStorage.getItem('knite_auth_token') || '');
  const [shopProfile, setShopProfile] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [showPhonePeModal, setShowPhonePeModal] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    db.settings.get('store_profile').then(p => {
      if (p) setShopProfile(p);
    });
  }, [isOpen]);

  if (!isOpen) return null;

  async function handleSaveUrl() {
    localStorage.setItem('knite_cloud_url', cloudUrl);
    setMsg({ text: 'Cloud Server URL updated!', type: 'success' });
  }

  async function handleManualSyncNow() {
    setIsSyncing(true);
    setMsg({ text: '', type: '' });

    const res = await SyncService.pushSync();
    if (res.isLocalOnly) {
      setMsg({ 
        text: '⚠️ You are on the Basic POS Plan (₹599/mo). Upgrade to Pro Cloud (₹799/mo) via Razorpay to enable automated cloud backup.', 
        type: 'error' 
      });
      setIsSyncing(false);
      return;
    }

    if (res.success) {
      setMsg({ text: '✅ Synchronized with KNITE Cloud Server!', type: 'success' });
      if (onSyncSuccess) onSyncSuccess();
    } else {
      setMsg({ text: res.reason || 'Sync failed. Ensure server is running.', type: 'error' });
    }
    setIsSyncing(false);
  }

  async function handleCreateCloudBackup() {
    setIsSyncing(true);
    setMsg({ text: '', type: '' });

    try {
      const res = await SyncService.createSnapshotBackup('Manual Cloud Snapshot');
      if (res.success) {
        setMsg({ text: '💾 Cloud Snapshot Backup created successfully on server!', type: 'success' });
      } else {
        setMsg({ text: res.reason || 'Backup failed', type: 'error' });
      }
    } catch (err) {
      setMsg({ text: 'Backup error: ' + err.message, type: 'error' });
    } finally {
      setIsSyncing(false);
    }
  }

  // Handle Razorpay Payment Success Callback
  async function handlePaymentSuccess(paymentData) {
    const updated = {
      ...shopProfile,
      plan_type: 'cloud_799',
      status: 'APPROVED',
      plan_expires_at: new Date(Date.now() + 37 * 24 * 60 * 60 * 1000).toISOString()
    };
    await db.settings.put({ key: 'store_profile', ...updated });
    localStorage.setItem('knite_shop_owner', JSON.stringify(updated));
    setShopProfile(updated);
    setShowPhonePeModal(false);
    setMsg({ 
      text: '🎉 Payment confirmed! Your store is now upgraded to PRO CLOUD (₹799/mo). Invoice dispatched from kniteinfotech@gmail.com.', 
      type: 'success' 
    });
    if (onSyncSuccess) onSyncSuccess();
  }

  const isDark = theme === 'dark';
  const isDevUser = (shopProfile?.email || '').toLowerCase() === 'nitheesh8797@gmail.com';
  const isProCloud = isDevUser || shopProfile?.plan_type === 'cloud_799' || shopProfile?.plan_type === 'pro_cloud' || shopProfile?.plan_type === 'enterprise';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className={`border rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-4 ${
        isDark ? 'bg-[#140c0e] border-rose-900/40 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-rose-950/60 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center shrink-0">
              <img src="/logo_icon.png" alt="Knite Medico Logo" className="w-10 h-10 object-contain drop-shadow-xs" />
            </div>
            <div>
              <h3 className="font-black text-base text-slate-900 dark:text-white">KNITE Medico Cloud Sync</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">PostgreSQL Server Sync & Auto-Backup</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message Banner */}
        {msg.text && (
          <div className={`p-3.5 rounded-2xl text-xs font-semibold ${
            msg.type === 'success' 
              ? 'bg-emerald-50 border border-emerald-300 text-emerald-900' 
              : 'bg-rose-50 border border-rose-300 text-[#ff2c2c]'
          }`}>
            {msg.text}
          </div>
        )}

        {/* CASE 1: USER HAS NOT PAID FOR PRO CLOUD (On ₹599 or Unpaid) */}
        {!isProCloud ? (
          <div className="space-y-4">
            <div className="p-5 rounded-3xl bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-[#0c2540] text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#0c2540] text-sky-400 flex items-center justify-center mx-auto shadow-md">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#ff2c2c] text-white">
                  UPGRADE REQUIRED
                </span>
                <h4 className="text-lg font-black text-slate-900 mt-1">
                  Cloud Sync Requires Pro Cloud Plan
                </h4>
                <p className="text-xs text-slate-600 font-medium leading-relaxed mt-1">
                  Your store is currently on the <strong>Basic POS Plan (₹599/mo)</strong> which stores data locally. Upgrade to <strong>Pro Cloud (₹799/mo)</strong> to enable automated central server backup and multi-device access.
                </p>
              </div>

              {/* What Pro Cloud Includes */}
              <div className="p-3 rounded-2xl bg-white/90 border border-blue-200 text-left space-y-2 text-xs">
                <div className="flex items-center gap-2 text-slate-800 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Real-Time Cloud Sync (Every 45 seconds)</span>
                </div>
                <div className="flex items-center gap-2 text-slate-800 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Central PostgreSQL Multi-Store Backup</span>
                </div>
                <div className="flex items-center gap-2 text-slate-800 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>WhatsApp Billing (Tamil, Malayalam, Hindi, Eng)</span>
                </div>
                <div className="flex items-center gap-2 text-slate-800 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Medicine Clinical Descriptions in Bills & WhatsApp</span>
                </div>
                <div className="flex items-center gap-2 text-slate-800 font-semibold">
                  <Repeat className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>Monthly AutoPay Enabled (Auto-debits monthly)</span>
                </div>
              </div>

              {/* Razorpay Upgrade Action Button */}
              <button
                type="button"
                onClick={() => setShowPhonePeModal(true)}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#ff2c2c] to-rose-600 hover:bg-rose-700 text-white font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-rose-500/25 transition hover:scale-[1.01] active:scale-[0.99]"
              >
                <CreditCard className="w-5 h-5 text-white" />
                <span>💳 Upgrade to Pro Cloud (₹799/mo) via Razorpay</span>
              </button>

              <p className="text-[11px] text-slate-500 font-medium">
                Official tax invoice will be sent via <strong>kniteinfotech@gmail.com</strong> upon payment.
              </p>
            </div>
          </div>
        ) : (
          /* CASE 2: USER IS PAID PRO CLOUD SUBSCRIBER (OR nitheesh8797@gmail.com) */
          <div className="space-y-4">
            
            {/* Active Cloud Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-300 space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-700 text-white">
                  PRO CLOUD ACTIVE
                </span>
                <ShieldCheck className="w-6 h-6 text-emerald-600" />
              </div>
              <h4 className="text-base font-black text-slate-900">
                Continuous Server Sync Active
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                All sales, batches, and patient ledgers are backed up continuously to the central PostgreSQL server. Zero data loss guarantee active.
              </p>
            </div>

            {/* Cloud Server Address */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200">Central Server Address</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-rose-900/40 bg-slate-50 dark:bg-[#1f1418] text-xs font-mono font-bold text-slate-900 dark:text-white outline-none focus:bg-white focus:border-[#ff2c2c] transition"
                  value={cloudUrl}
                  onChange={e => setCloudUrl(e.target.value)}
                  placeholder="http://localhost:5055"
                />
                <button onClick={handleSaveUrl} className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition">
                  Save
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                onClick={handleManualSyncNow}
                disabled={isSyncing}
                className="py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#ff2c2c] to-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-md shadow-rose-500/20 flex items-center justify-center gap-2 transition disabled:opacity-60"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
              </button>

              <button
                onClick={handleCreateCloudBackup}
                disabled={isSyncing}
                className="py-3.5 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs shadow-md flex items-center justify-center gap-2 transition disabled:opacity-60"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Cloud Snapshot</span>
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Razorpay Upgrade Modal */}
      <PhonePeModal
        isOpen={showPhonePeModal}
        onClose={() => setShowPhonePeModal(false)}
        amount={799}
        purpose="CLOUD_SUBSCRIPTION"
        storeInfo={shopProfile}
        onPaymentSuccess={handlePaymentSuccess}
        theme={theme}
      />
    </div>
  );
}
