import React, { useState, useEffect, useCallback } from 'react';
import {
  Cloud, ShieldCheck, Server, UploadCloud, CheckCircle2,
  RefreshCw, Zap, CreditCard, HardDrive, Database,
  Lock, Activity, ArrowUpRight, Calendar, Package, 
  DownloadCloud, Trash2, FileArchive, IndianRupee, 
  BadgeCheck, Clock, ChevronRight, Eye, Building2, 
  User, Mail, Phone, MapPin, FileText, Search, 
  ArrowRight, Tag, Layers, Check, ShoppingCart, 
  AlertTriangle, Download, ChevronDown, ChevronUp,
  X, LogOut, CheckCircle
} from 'lucide-react';
import { SyncService } from '../services/syncService';
import { db } from '../db/localDb';
import { getCloudUrl } from '../utils/cloudConfig';
import PhonePeModal from './PhonePeModal';
import Pagination from './Pagination';

const SIDEBAR_NAV = [
  { id: 'dashboard', label: 'Cloud Dashboard',     icon: Activity,      desc: 'Live sync & store metrics' },
  { id: 'purchases', label: 'Customer Purchases',  icon: ShoppingCart,  desc: 'Bills & patient transactions' },
  { id: 'medicines', label: 'Medicine & Restocks', icon: Package,       desc: 'Add dates, empty & restocks' },
  { id: 'customers', label: 'Customers Directory', icon: User,          desc: 'Patient profiles & credits' },
  { id: 'backups',   label: 'Cloud Backups',       icon: DownloadCloud, desc: 'Full snapshot download' },
  { id: 'plans',     label: 'Subscription & Plan', icon: Zap,           desc: 'License & expiry dates' }
];

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function fmtBytes(b) {
  if (!b || b === 0) return '0 KB';
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(2)} MB`;
}

function fmtExpiry(d) {
  if (!d) return '—';
  const dt = new Date(d);
  const year = dt.getFullYear();
  if (year > 2100) return 'Lifetime Access (Free)';
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
}

export default function CloudPage({ theme, onSyncSuccess }) {
  const [cloudUrl]    = useState(() => getCloudUrl());
  const [authToken,   setAuthToken]   = useState(localStorage.getItem('knite_auth_token') || '');
  const [cloudTenant, setCloudTenant] = useState(() => {
    try { return JSON.parse(localStorage.getItem('knite_cloud_tenant') || 'null'); } catch { return null; }
  });

  // UI state
  const [activeTab,   setActiveTab]   = useState('dashboard');
  const [isSyncing,   setIsSyncing]   = useState(false);
  const [msg,         setMsg]         = useState({ text: '', type: '' });
  const [isOnline,    setIsOnline]    = useState(false);
  const [lastSync,    setLastSync]    = useState(null);

  // Authenticated Store Data (strictly scoped to this tenant)
  const [storeData,   setStoreData]   = useState(null);
  const [purchases,   setPurchases]   = useState([]);
  const [medicines,   setMedicines]   = useState([]);
  const [customers,   setCustomers]   = useState([]);
  const [stats,       setStats]       = useState({});
  const [loadingData, setLoadingData] = useState(false);

  // Filters & Search
  const [purchaseSearch, setPurchaseSearch] = useState('');
  const [medSearch, setMedSearch]           = useState('');
  const [medFilter, setMedFilter]           = useState('ALL'); // ALL, IN_STOCK, LOW_STOCK, OUT_OF_STOCK
  const [custSearch, setCustSearch]         = useState('');
  const [expandedInvoice, setExpandedInvoice] = useState(null);

  // Backups
  const [backups,     setBackups]     = useState([]);
  const [loadingBkps, setLoadingBkps] = useState(false);
  const [downloadingFull, setDownloadingFull] = useState(false);
  const [hddLocation, setHddLocation] = useState('');
  const [purchasesPage, setPurchasesPage] = useState(1);
  const [medsPage, setMedsPage] = useState(1);
  const [custsPage, setCustsPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Login form
  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [loggingIn,   setLoggingIn]   = useState(false);

  // Payment
  const [showPayModal, setShowPayModal] = useState(false);
  const [shopProfile,  setShopProfile]  = useState(null);

  const isDark = theme === 'dark';
  const isLoggedIn = !!(authToken && cloudTenant);
  const isLifetime = cloudTenant?.plan_expires_at && new Date(cloudTenant.plan_expires_at).getFullYear() > 2100;
  const isProCloud = cloudTenant?.plan_type === 'pro_cloud' || cloudTenant?.plan_type === 'cloud_799' || cloudTenant?.plan_type === 'enterprise';

  // Load local profile & check online
  useEffect(() => {
    db.settings.get('store_profile').then(p => {
      if (p) {
        setShopProfile(p);
        if (p.email) setEmail(prev => prev || p.email);
      }
    });
    SyncService.checkCloudHealth().then(setIsOnline);
  }, []);

  // Fetch strictly tenant-isolated store cloud data
  const fetchStoreCloudData = useCallback(async () => {
    if (!authToken) return;
    setLoadingData(true);
    try {
      const res = await fetch(`${cloudUrl}/api/sync/store-cloud-data`, {
        headers: { 
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (res.status === 401 || res.status === 403) {
        setAuthToken('');
        localStorage.removeItem('knite_auth_token');
        return;
      }

      const data = await res.json();
      if (data.success) {
        setStoreData(data.store || {});
        setPurchases(data.purchases || []);
        setMedicines(data.medicines || []);
        setCustomers(data.customers || []);
        setStats(data.stats || {});
        if (data.store) {
          const updatedTenant = { ...cloudTenant, ...data.store };
          setCloudTenant(updatedTenant);
          localStorage.setItem('knite_cloud_tenant', JSON.stringify(updatedTenant));
        }
      }
    } catch (err) {
      console.warn('Failed to load store cloud data:', err.message);
    } finally {
      setLoadingData(false);
    }
  }, [authToken, cloudUrl, cloudTenant]);

  // Fetch backups
  const fetchBackups = useCallback(async () => {
    if (!authToken) return;
    setLoadingBkps(true);
    try {
      const r = await fetch(`${cloudUrl}/api/backup/list`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const d = await r.json();
      if (d.success) {
        const merged = [...(d.backups || []), ...(d.hdd_backups || [])];
        setBackups(merged);
        if (d.shop_name) setHddLocation(d.shop_name);
      }
    } catch {
      setBackups([]);
    } finally {
      setLoadingBkps(false);
    }
  }, [authToken, cloudUrl]);

  useEffect(() => {
    if (isLoggedIn) {
      fetchStoreCloudData();
      fetchBackups();
    }
  }, [isLoggedIn, authToken, fetchStoreCloudData, fetchBackups]);

  // Handle Login
  async function handleLogin(e) {
    e.preventDefault();
    setLoggingIn(true);
    setMsg({ text: '', type: '' });
    try {
      const res = await fetch(`${cloudUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Authentication failed');

      if (data.token) {
        localStorage.setItem('knite_auth_token', data.token);
        localStorage.setItem('knite_cloud_tenant', JSON.stringify(data.tenant));
        setAuthToken(data.token);
        setCloudTenant(data.tenant);
        setMsg({ text: `🎉 Welcome back, ${data.tenant.shop_name}!`, type: 'success' });
        setActiveTab('dashboard');
        if (onSyncSuccess) onSyncSuccess();
      }
    } catch (err) {
      setMsg({ text: err.message, type: 'error' });
    } finally {
      setLoggingIn(false);
    }
  }

  // Handle Logout
  function handleLogout() {
    localStorage.removeItem('knite_auth_token');
    localStorage.removeItem('knite_cloud_tenant');
    setAuthToken('');
    setCloudTenant(null);
    setStoreData(null);
    setPurchases([]);
    setMedicines([]);
    setCustomers([]);
    setActiveTab('dashboard');
  }

  // Manual Push & Pull Sync
  async function handleSyncNow() {
    setIsSyncing(true);
    setMsg({ text: '', type: '' });
    try {
      const pushRes = await SyncService.pushSync();
      const pullRes = await SyncService.pullSync();
      if (pushRes.isLocalOnly || pullRes.isLocalOnly) {
        setMsg({ text: '⚠️ Free Local Tier — active local database operates offline.', type: 'error' });
      } else if (pushRes.success || pullRes.success) {
        setLastSync(new Date().toLocaleTimeString());
        setMsg({ 
          text: `✅ Cloud Sync Complete! Pushed: ${pushRes.medicines_synced || 0} Meds, ${pushRes.invoices_synced || 0} Invoices, ${pushRes.customers_synced || 0} Customers. Pulled: ${pullRes.pulled_medicines || 0} Meds, ${pullRes.pulled_invoices || 0} Invoices.`, 
          type: 'success' 
        });
        await fetchStoreCloudData();
        if (onSyncSuccess) onSyncSuccess();
      } else {
        setMsg({ text: pushRes.reason || pullRes.reason || 'Sync failed.', type: 'error' });
      }
    } catch (err) {
      setMsg({ text: err.message, type: 'error' });
    } finally {
      setIsSyncing(false);
    }
  }

  // Create Snapshot
  async function handleCreateSnapshot() {
    setIsSyncing(true);
    try {
      const res = await SyncService.createSnapshotBackup('Cloud Snapshot');
      if (res.success) {
        setMsg({ text: '💾 Cloud Snapshot created successfully!', type: 'success' });
        await fetchBackups();
      } else {
        setMsg({ text: res.reason || 'Snapshot creation failed', type: 'error' });
      }
    } catch (err) {
      setMsg({ text: err.message, type: 'error' });
    } finally {
      setIsSyncing(false);
    }
  }

  // Download entire backup payload as standalone JSON ("backups download as entire thing")
  async function handleDownloadEntireBackup() {
    setDownloadingFull(true);
    try {
      const res = await fetch(`${cloudUrl}/api/backup/export-full`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (!res.ok) throw new Error('Failed to generate full cloud export');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `KniteMedico_FullBackup_${cloudTenant?.id || 'store'}_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setMsg({ text: '✅ Complete backup downloaded to your computer!', type: 'success' });
    } catch (err) {
      setMsg({ text: 'Export error: ' + err.message, type: 'error' });
    } finally {
      setDownloadingFull(false);
    }
  }

  // Filtered customer purchases
  const filteredPurchases = purchases.filter(p => {
    if (!purchaseSearch.trim()) return true;
    const q = purchaseSearch.toLowerCase();
    return (
      (p.invoice_number || '').toLowerCase().includes(q) ||
      (p.customer_name || '').toLowerCase().includes(q) ||
      (p.customer_phone || '').includes(q)
    );
  });

  const paginatedPurchases = filteredPurchases.slice((purchasesPage - 1) * ITEMS_PER_PAGE, purchasesPage * ITEMS_PER_PAGE);

  useEffect(() => {
    setPurchasesPage(1);
  }, [purchaseSearch]);

  // Filtered medicines
  const filteredMedicines = medicines.filter(m => {
    const matchesSearch = !medSearch.trim() || 
      (m.name || '').toLowerCase().includes(medSearch.toLowerCase()) ||
      (m.generic_name || '').toLowerCase().includes(medSearch.toLowerCase()) ||
      (m.batch_number || '').toLowerCase().includes(medSearch.toLowerCase());

    if (!matchesSearch) return false;

    const qty = parseInt(m.stock_qty || 0, 10);
    const min = parseInt(m.min_stock || 10, 10);

    if (medFilter === 'OUT_OF_STOCK') return qty === 0;
    if (medFilter === 'LOW_STOCK') return qty > 0 && qty <= min;
    if (medFilter === 'IN_STOCK') return qty > min;
    return true;
  });

  const paginatedMedicines = filteredMedicines.slice((medsPage - 1) * ITEMS_PER_PAGE, medsPage * ITEMS_PER_PAGE);

  useEffect(() => {
    setMedsPage(1);
  }, [medSearch, medFilter]);

  return (
    <div className="font-sans transition-colors w-full">
      
      {/* NOT LOGGED IN / UNPAID STATE */}
      {!isLoggedIn ? (
        <div className="max-w-md mx-auto py-12 px-4 space-y-6">
          
          {/* Razorpay Upgrade Card for ₹799 */}
          <div className={`p-8 rounded-3xl border-2 shadow-2xl space-y-5 text-center ${
            isDark ? 'bg-[#181115] border-rose-900/40 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="w-20 h-20 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-rose-950/60 p-2.5 flex items-center justify-center mx-auto shadow-xl shadow-rose-500/10">
              <img src="/logo_icon.png" alt="KNITE Medico" className="w-full h-full object-contain" />
            </div>

            <div>
              <span className="px-3 py-1 rounded-full text-[10px] font-black bg-[#ff2c2c] text-white">
                PRO CLOUD UPGRADE
              </span>
              <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white mt-2">
                Cloud Sync Requires ₹799 Plan
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-bold mt-1 leading-relaxed">
                Your store requires the <strong>Pro Cloud Plan (₹799/mo)</strong> to enable continuous cloud synchronization, PostgreSQL backup, and multi-device access.
              </p>
            </div>

            {/* Features Included */}
            <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-slate-800/60 border border-blue-200 dark:border-slate-700 text-left space-y-2 text-xs">
              <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Continuous Cloud Sync (every 45 seconds)</span>
              </div>
              <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>PostgreSQL Multi-Store Backup & Snapshot</span>
              </div>
              <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>WhatsApp Billing (Tamil, Malayalam, Hindi, Eng)</span>
              </div>
              <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Medicine Clinical Descriptions in Bills & WhatsApp</span>
              </div>
            </div>

            {/* Direct Razorpay Upgrade Button */}
            <button
              type="button"
              onClick={() => setShowPayModal(true)}
              className="w-full py-4 rounded-2xl bg-[#0c2540] hover:bg-[#153a61] text-white font-black text-sm flex items-center justify-center gap-2.5 shadow-xl shadow-blue-900/20 hover:scale-[1.01] active:scale-[0.99] transition"
            >
              <CreditCard className="w-5 h-5 text-sky-400" />
              <span>💳 Upgrade to Pro Cloud (₹799/mo) via Razorpay</span>
            </button>

            <p className="text-[11px] text-slate-500 font-medium">
              Tax invoice dispatched from <strong>kniteinfotech@gmail.com</strong>
            </p>

            {/* Divider */}
            <div className="flex items-center gap-2 text-slate-400 text-xs my-2">
              <div className="h-px bg-slate-200 dark:bg-slate-700 flex-1" />
              <span className="font-bold text-[10px] uppercase">Or Sign In to Existing Account</span>
              <div className="h-px bg-slate-200 dark:bg-slate-700 flex-1" />
            </div>

            <form onSubmit={handleLogin} className="space-y-3.5 text-left">
              <div>
                <label className="text-xs font-black block mb-1 text-slate-900 dark:text-slate-300">Registered Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border-2 text-xs font-bold outline-none focus:border-[#ff2c2c] transition bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  placeholder="nitheesh8797@gmail.com"
                />
              </div>
              <div>
                <label className="text-xs font-black block mb-1 text-slate-900 dark:text-slate-300">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border-2 text-xs font-bold outline-none focus:border-[#ff2c2c] transition bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loggingIn}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#ff2c2c] to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white font-black text-xs shadow-md shadow-rose-500/25 transition disabled:opacity-60 flex items-center justify-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${loggingIn ? 'animate-spin' : ''}`} />
                <span>{loggingIn ? 'Authenticating...' : 'Sign In with Existing Account'}</span>
              </button>
            </form>
          </div>
        </div>
      ) : (
        /* LOGGED IN: SIDEBAR ON ENTIRE LEFT + MAIN CONTENT */
        <div className="flex flex-col lg:flex-row gap-5 min-h-[calc(100vh-140px)]">
          
          {/* ══════════════════════════════════════════════════════════════════
             LEFT SIDEBAR NAVIGATION (Docked on the Entire Left)
          ══════════════════════════════════════════════════════════════════ */}
          <aside className={`w-full lg:w-72 xl:w-80 p-5 rounded-3xl border-2 flex flex-col justify-between shrink-0 shadow-sm ${
            isDark ? 'bg-[#150f13] border-rose-950/60' : 'bg-white border-slate-200'
          }`}>
            <div className="space-y-6">
              
              {/* Store & Cloud Profile Card */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#ff2c2c] to-rose-600 text-white flex items-center justify-center font-black shadow-md shadow-rose-500/20 shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-black text-xs truncate text-slate-900 dark:text-white">
                    {cloudTenant?.shop_name || 'My Pharmacy'}
                  </h4>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400">
                      {isLifetime ? 'Lifetime Free Cloud' : 'PRO Cloud Sync'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Navigation Items */}
              <nav className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 gap-1.5">
                {SIDEBAR_NAV.map(item => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => { setActiveTab(item.id); setMsg({ text: '', type: '' }); }}
                      className={`w-full p-2.5 sm:p-3 rounded-2xl text-left transition flex items-center gap-2.5 ${
                        isActive
                          ? 'bg-gradient-to-r from-[#ff2c2c] to-rose-600 text-white font-black shadow-lg shadow-rose-500/25'
                          : isDark
                            ? 'text-slate-300 hover:bg-slate-800/60 font-bold'
                            : 'text-slate-800 hover:bg-slate-100 font-extrabold'
                      }`}
                    >
                      <div className={`p-1.5 sm:p-2 rounded-xl shrink-0 ${
                        isActive ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs truncate">{item.label}</p>
                        <p className={`hidden sm:block lg:block text-[10px] truncate ${isActive ? 'text-white/90' : 'text-slate-500 dark:text-slate-400 font-semibold'}`}>
                          {item.desc}
                        </p>
                      </div>
                      {isActive && <ChevronRight className="hidden lg:block w-4 h-4 shrink-0 text-white/90" />}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Sidebar Footer */}
            <div className="pt-6 mt-6 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs px-1">
                <span className="text-[11px] font-extrabold text-slate-600 dark:text-slate-400">Connection</span>
                <span className="text-[11px] font-black text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Encrypted TLS
                </span>
              </div>

              <button
                onClick={handleLogout}
                className="w-full py-2.5 px-3 rounded-xl border-2 border-slate-300 dark:border-slate-700 text-xs font-black flex items-center justify-center gap-2 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-600 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Disconnect Cloud</span>
              </button>
            </div>
          </aside>

          {/* ══════════════════════════════════════════════════════════════════
             MAIN CONTENT AREA (Right of the Sidebar)
          ══════════════════════════════════════════════════════════════════ */}
          <main className={`flex-1 p-6 lg:p-8 space-y-6 overflow-y-auto rounded-3xl border-2 shadow-sm ${
            isDark ? 'bg-[#120d10] border-rose-950/60 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>

            {/* Header Alert Notification */}
            {msg.text && (
              <div className={`p-4 rounded-2xl text-xs font-black border-2 flex items-center justify-between animate-in fade-in duration-200 ${
                msg.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                  : 'bg-rose-50 dark:bg-rose-950/60 text-rose-900 dark:text-rose-300 border-rose-300 dark:border-rose-700'
              }`}>
                <span>{msg.text}</span>
                <button onClick={() => setMsg({ text: '', type: '' })} className="p-1 hover:opacity-70">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* ─────────────────────────────────────────────────────────────
               1. DASHBOARD VIEW (Strictly THIS Store's Data Only)
            ───────────────────────────────────────────────────────────── */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                
                {/* Top Action Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                      Pharmacy Cloud Dashboard
                    </h2>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold mt-0.5">
                      Real-time synchronized data for <strong className="text-[#ff2c2c]">{cloudTenant?.shop_name}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSyncNow}
                      disabled={isSyncing}
                      className="px-5 py-2.5 bg-gradient-to-r from-[#ff2c2c] to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white rounded-xl text-xs font-black shadow-md shadow-rose-500/25 flex items-center gap-2 transition disabled:opacity-60"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                      <span>{isSyncing ? 'Syncing...' : 'Sync Cloud Now'}</span>
                    </button>
                  </div>
                </div>

                {/* 4 Metric KPI Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Cloud Revenue',  value: `₹${parseFloat(stats.total_revenue || 0).toFixed(2)}`, icon: IndianRupee, color: 'text-emerald-600', valColor: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
                    { label: 'Invoices Generated',    value: `${stats.total_invoices || purchases.length}`, icon: FileText, color: 'text-blue-600', valColor: 'text-blue-700 dark:text-blue-400', bg: 'bg-blue-500/10' },
                    { label: 'Medicines Tracked',    value: `${stats.total_medicines || medicines.length}`, icon: Package, color: 'text-purple-600', valColor: 'text-purple-700 dark:text-purple-400', bg: 'bg-purple-500/10' },
                    { label: 'Empty / Low Stock',     value: `${stats.out_of_stock_count || 0} empty · ${stats.low_stock_count || 0} low`, icon: AlertTriangle, color: 'text-amber-600', valColor: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-500/10' }
                  ].map((kpi, i) => {
                    const Icon = kpi.icon;
                    return (
                      <div key={i} className={`p-4 rounded-2xl border-2 shadow-sm ${
                        isDark ? 'bg-[#181115] border-rose-950/60' : 'bg-slate-50/80 border-slate-200'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">{kpi.label}</span>
                          <div className={`w-8 h-8 rounded-xl ${kpi.bg} ${kpi.color} flex items-center justify-center shrink-0`}>
                            <Icon className="w-4 h-4" />
                          </div>
                        </div>
                        <p className={`text-xl sm:text-2xl font-black font-mono truncate ${kpi.valColor}`}>
                          {kpi.value}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Pharmacy Credentials Card */}
                <div className={`p-6 rounded-3xl border-2 shadow-sm space-y-4 ${
                  isDark ? 'bg-[#181115] border-rose-950/60' : 'bg-slate-50/50 border-slate-200'
                }`}>
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                    <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-[#ff2c2c]" />
                      <span>Pharmacy Store Profile & Credentials</span>
                    </h3>
                    <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-rose-100 text-rose-900 font-black border border-rose-300 dark:bg-rose-950/60 dark:text-rose-200">
                      ID: {cloudTenant?.id}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {[
                      { icon: Building2, label: 'Store Name',   value: storeData?.shop_name || cloudTenant?.shop_name },
                      { icon: User,      label: 'Owner Name',   value: storeData?.owner_name || cloudTenant?.owner_name },
                      { icon: Mail,      label: 'Email Address',value: storeData?.email || cloudTenant?.email },
                      { icon: Phone,     label: 'Phone Contact',value: storeData?.phone || cloudTenant?.phone },
                      { icon: FileText,  label: 'GSTIN Number', value: storeData?.gstin || cloudTenant?.gstin || '33AAAA0000A1Z5' },
                      { icon: ShieldCheck,label: 'Drug License',value: storeData?.dl_number || cloudTenant?.dl_number || 'TN-DL-2026-889900' },
                      { icon: MapPin,    label: 'Address',      value: storeData?.address || cloudTenant?.address || 'Thovalai', full: true }
                    ].map((item, idx) => {
                      const Icon = item.icon;
                      return (
                        <div key={idx} className={`p-3.5 rounded-2xl border-2 flex items-start gap-3 ${
                          item.full ? 'sm:col-span-2 lg:col-span-3' : ''
                        } ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                          <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-[#ff2c2c] flex items-center justify-center shrink-0">
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] text-slate-600 dark:text-slate-400 font-extrabold uppercase tracking-wide">{item.label}</p>
                            <p className="text-xs sm:text-sm font-black truncate mt-0.5 text-slate-900 dark:text-white">
                              {item.value || '—'}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Quick Navigation Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div 
                    onClick={() => setActiveTab('purchases')}
                    className={`p-5 rounded-3xl border cursor-pointer hover:border-[#ff2c2c] transition shadow-sm space-y-2 ${
                      isDark ? 'bg-[#181115] border-rose-950/60' : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                        <ShoppingCart className="w-4 h-4 text-emerald-500" />
                        <span>Recent Customer Purchases</span>
                      </span>
                      <ArrowRight className="w-4 h-4 text-slate-400" />
                    </div>
                    <p className="text-xs text-slate-500 font-medium">
                      {purchases.length} customer billing transactions stored safely in the cloud.
                    </p>
                  </div>

                  <div 
                    onClick={() => setActiveTab('medicines')}
                    className={`p-5 rounded-3xl border cursor-pointer hover:border-[#ff2c2c] transition shadow-sm space-y-2 ${
                      isDark ? 'bg-[#181115] border-rose-950/60' : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                        <Package className="w-4 h-4 text-purple-500" />
                        <span>Medicine Stock & Restocks</span>
                      </span>
                      <ArrowRight className="w-4 h-4 text-slate-400" />
                    </div>
                    <p className="text-xs text-slate-500 font-medium">
                      Audit creation dates, restock records, and low/empty stock warnings.
                    </p>
                  </div>
                </div>

              </div>
            )}

            {/* ─────────────────────────────────────────────────────────────
               2. CUSTOMER PURCHASES & DETAILS ("users purchase and their details")
            ───────────────────────────────────────────────────────────── */}
            {activeTab === 'purchases' && (
              <div className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                      Customer Purchases & Transactions
                    </h2>
                    <p className="text-xs text-slate-500 font-medium">
                      Detailed prescription sales history for your pharmacy
                    </p>
                  </div>

                  {/* Search Bar */}
                  <div className="relative w-full sm:w-72">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search bill number, patient..."
                      value={purchaseSearch}
                      onChange={e => setPurchaseSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border-2 text-xs font-bold outline-none focus:border-[#ff2c2c] transition bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div className={`rounded-3xl border-2 shadow-sm overflow-hidden ${
                  isDark ? 'bg-[#181115] border-rose-950/60' : 'bg-white border-slate-200'
                }`}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b-2 text-[11px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-200 border-slate-200 dark:border-slate-700">
                          <th className="py-3 px-4">Invoice No</th>
                          <th className="py-3 px-4">Date & Time</th>
                          <th className="py-3 px-4">Patient / Customer</th>
                          <th className="py-3 px-4 text-center">Items</th>
                          <th className="py-3 px-4 text-center">Mode</th>
                          <th className="py-3 px-4 text-right">Total Amount</th>
                          <th className="py-3 px-4 text-center">Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y-2 divide-slate-100 dark:divide-slate-800">
                        {filteredPurchases.length === 0 ? (
                          <tr>
                            <td colSpan="7" className="py-12 text-center text-slate-500 font-bold">
                              No customer purchases found.
                            </td>
                          </tr>
                        ) : (
                          paginatedPurchases.map(inv => {
                            const isExpanded = expandedInvoice === inv.id;
                            const itemsList = inv.items || [];
                            return (
                              <React.Fragment key={inv.id}>
                                <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                                  <td className="py-3.5 px-4 font-mono font-black text-[#ff2c2c]">
                                    {inv.invoice_number}
                                  </td>
                                  <td className="py-3.5 px-4 text-slate-900 dark:text-slate-200 font-bold whitespace-nowrap">
                                    {fmtDate(inv.created_at)}
                                  </td>
                                  <td className="py-3.5 px-4">
                                    <p className="font-extrabold text-slate-900 dark:text-white">
                                      {inv.customer_name || 'General Customer'}
                                    </p>
                                    {inv.customer_phone && (
                                      <p className="text-[11px] text-slate-600 dark:text-slate-400 font-mono font-bold">
                                        {inv.customer_phone}
                                      </p>
                                    )}
                                  </td>
                                  <td className="py-3.5 px-4 text-center">
                                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-black text-slate-900 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                                      {itemsList.length} items
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-4 text-center">
                                    <span className="px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-900 font-black text-[11px] border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300">
                                      {inv.payment_mode || 'CASH'}
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-4 text-right font-mono font-black text-slate-900 dark:text-white text-sm">
                                    ₹{parseFloat(inv.grand_total || 0).toFixed(2)}
                                  </td>
                                  <td className="py-3.5 px-4 text-center">
                                    <button
                                      onClick={() => setExpandedInvoice(isExpanded ? null : inv.id)}
                                      className="p-1.5 rounded-lg border-2 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                      title="Toggle item details"
                                    >
                                      {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-800 dark:text-slate-200" /> : <ChevronDown className="w-4 h-4 text-slate-800 dark:text-slate-200" />}
                                    </button>
                                  </td>
                                </tr>

                                {/* Expanded Item Breakdown */}
                                {isExpanded && (
                                  <tr className="bg-slate-50 dark:bg-slate-900/60">
                                    <td colSpan="7" className="p-4">
                                      <div className="space-y-2">
                                        <p className="font-black text-xs text-slate-800 dark:text-slate-300 uppercase tracking-wider">
                                          Prescribed Items Breakdown:
                                        </p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                          {itemsList.map((item, idx) => (
                                            <div key={idx} className="p-3 rounded-xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 flex justify-between items-center text-xs shadow-sm">
                                              <div>
                                                <p className="font-extrabold text-slate-900 dark:text-white">{item.medicine_name}</p>
                                                <p className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold">Qty: {item.quantity} × ₹{parseFloat(item.unit_price || 0).toFixed(2)}</p>
                                              </div>
                                              <span className="font-mono font-black text-emerald-700 dark:text-emerald-400 text-sm">
                                                ₹{parseFloat(item.total_amount || 0).toFixed(2)}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {filteredPurchases.length > 0 && (
                    <div className="p-3 border-t-2 border-slate-100 dark:border-slate-800">
                      <Pagination
                        currentPage={purchasesPage}
                        totalItems={filteredPurchases.length}
                        itemsPerPage={ITEMS_PER_PAGE}
                        onPageChange={setPurchasesPage}
                        theme={theme}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ─────────────────────────────────────────────────────────────
               3. MEDICINE LIFECYCLE, EMPTY & RESTOCKS ("medcine when rthey add and when it empy and restocks")
            ───────────────────────────────────────────────────────────── */}
            {activeTab === 'medicines' && (
              <div className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                      Medicine Stock & Lifecycle Audit
                    </h2>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold mt-0.5">
                      Audit when medicines were added, track empty stocks, and verify restock history
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Filter buttons */}
                    <div className="flex rounded-xl border-2 border-slate-300 dark:border-slate-700 p-1 bg-slate-100 dark:bg-slate-800 text-xs font-black">
                      {[
                        { id: 'ALL', label: 'All' },
                        { id: 'IN_STOCK', label: 'In Stock' },
                        { id: 'LOW_STOCK', label: 'Low Stock' },
                        { id: 'OUT_OF_STOCK', label: 'Empty' }
                      ].map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => setMedFilter(tab.id)}
                          className={`px-3 py-1 rounded-lg transition ${
                            medFilter === tab.id
                              ? 'bg-white dark:bg-slate-900 text-[#ff2c2c] shadow-sm font-black'
                              : 'text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    <div className="relative w-52">
                      <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                      <input
                        type="text"
                        placeholder="Search medicines..."
                        value={medSearch}
                        onChange={e => setMedSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-xl border-2 text-xs font-bold outline-none focus:border-[#ff2c2c] transition bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400"
                      />
                    </div>
                  </div>
                </div>

                <div className={`rounded-3xl border-2 shadow-sm overflow-hidden ${
                  isDark ? 'bg-[#181115] border-rose-950/60' : 'bg-white border-slate-200'
                }`}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b-2 text-[11px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-200 border-slate-200 dark:border-slate-700">
                          <th className="py-3 px-4">Medicine Name</th>
                          <th className="py-3 px-4">Batch No</th>
                          <th className="py-3 px-4">Date Added</th>
                          <th className="py-3 px-4">Last Restocked</th>
                          <th className="py-3 px-4 text-right">Units</th>
                          <th className="py-3 px-4 text-right">Price</th>
                          <th className="py-3 px-4 text-center">Stock Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y-2 divide-slate-100 dark:divide-slate-800">
                        {filteredMedicines.length === 0 ? (
                          <tr>
                            <td colSpan="7" className="py-12 text-center text-slate-500 font-bold">
                              No medicines match your filter.
                            </td>
                          </tr>
                        ) : (
                          paginatedMedicines.map(med => {
                            const qty = parseInt(med.stock_qty || 0, 10);
                            const min = parseInt(med.min_stock || 10, 10);
                            const isEmpty = qty === 0;
                            const isLow = qty > 0 && qty <= min;

                            return (
                              <tr key={med.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                                <td className="py-3.5 px-4">
                                  <p className="font-extrabold text-slate-900 dark:text-white">{med.name}</p>
                                  {med.generic_name && (
                                    <p className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold truncate max-w-xs">{med.generic_name}</p>
                                  )}
                                </td>
                                <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-slate-200">
                                  {med.batch_number || '—'}
                                </td>
                                <td className="py-3.5 px-4 text-slate-900 dark:text-slate-200 font-bold whitespace-nowrap">
                                  {fmtDate(med.created_at)}
                                </td>
                                <td className="py-3.5 px-4 text-slate-900 dark:text-slate-200 font-bold whitespace-nowrap">
                                  {fmtDate(med.updated_at)}
                                </td>
                                <td className="py-3.5 px-4 text-right font-mono font-black text-slate-900 dark:text-white text-sm">
                                  {qty}
                                </td>
                                <td className="py-3.5 px-4 text-right font-mono font-black text-emerald-700 dark:text-emerald-400 text-sm">
                                  ₹{parseFloat(med.sale_price || 0).toFixed(2)}
                                </td>
                                <td className="py-3.5 px-4 text-center">
                                  {isEmpty ? (
                                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-600 text-white uppercase tracking-wider shadow-sm shadow-rose-600/20">
                                      🚨 EMPTY
                                    </span>
                                  ) : isLow ? (
                                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-500 text-white uppercase tracking-wider shadow-sm shadow-amber-500/20">
                                      ⚠️ LOW STOCK
                                    </span>
                                  ) : (
                                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                      ✅ IN STOCK
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {filteredMedicines.length > 0 && (
                    <div className="p-3 border-t-2 border-slate-100 dark:border-slate-800">
                      <Pagination
                        currentPage={medsPage}
                        totalItems={filteredMedicines.length}
                        itemsPerPage={ITEMS_PER_PAGE}
                        onPageChange={setMedsPage}
                        theme={theme}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ─────────────────────────────────────────────────────────────
               4. CLOUD BACKUPS & DOWNLOAD ENTIRE THING ("backups download as entire thing")
            ───────────────────────────────────────────────────────────── */}
            {activeTab === 'backups' && (
              <div className="space-y-6">
                
                {/* Download as Entire Thing Banner */}
                <div className="p-6 rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-xl shadow-indigo-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full">
                      FULL OFFLINE ARCHIVE
                    </span>
                    <h3 className="text-xl font-black mt-1">Download Entire Store Backup</h3>
                    <p className="text-xs text-blue-100 font-medium max-w-lg">
                      Export your entire store database (all medicines, sales, customers, and settings) as a standalone JSON backup file to your computer.
                    </p>
                  </div>

                  <button
                    onClick={handleDownloadEntireBackup}
                    disabled={downloadingFull}
                    className="px-6 py-3.5 bg-white text-indigo-900 hover:bg-blue-50 rounded-2xl text-xs font-black shadow-lg flex items-center justify-center gap-2 transition disabled:opacity-60 shrink-0"
                  >
                    <Download className={`w-4 h-4 ${downloadingFull ? 'animate-bounce' : ''}`} />
                    <span>{downloadingFull ? 'Exporting...' : 'Download as Entire Thing'}</span>
                  </button>
                </div>

                {/* Cloud Snapshots List */}
                <div className={`p-6 rounded-3xl border shadow-sm space-y-4 ${
                  isDark ? 'bg-[#181115] border-rose-950/60' : 'bg-white border-slate-200'
                }`}>
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div>
                      <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                        <span>Central 1 TB HDD &amp; Cloud Snapshots</span>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300">
                          1 TB HDD Active
                        </span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Backups stored in <code className="font-mono text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">/data/backups/{hddLocation || cloudTenant?.shop_name || 'nitheesh kadai'}</code> ({backups.length} archives)
                      </p>
                    </div>

                    <button
                      onClick={handleCreateSnapshot}
                      disabled={isSyncing}
                      className="px-4 py-2 bg-[#ff2c2c] hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                    >
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>Take Cloud Snapshot</span>
                    </button>
                  </div>

                  {backups.length === 0 ? (
                    <div className="text-center py-10 text-xs text-slate-400">
                      No cloud snapshots yet. Click "Take Cloud Snapshot" to capture your store state.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {backups.map((bkp, i) => (
                        <div key={bkp.id} className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                          <div>
                            <p className="font-black text-slate-900 dark:text-white flex items-center gap-2">
                              <span>{bkp.backup_name}</span>
                              {i === 0 && <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.2 rounded font-bold">Latest</span>}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {fmtDate(bkp.created_at)} · {fmtBytes(bkp.size_bytes)}
                            </p>
                          </div>

                          <button
                            onClick={async () => {
                              if (!confirm(`Restore "${bkp.backup_name}"? This will update your local store records.`)) return;
                              const r = await fetch(`${cloudUrl}/api/backup/restore/${bkp.id}`, {
                                headers: { 'Authorization': `Bearer ${authToken}` }
                              });
                              const d = await r.json();
                              if (d.success) {
                                await SyncService.restoreSnapshot(d.data);
                                setMsg({ text: '✅ Snapshot restored successfully!', type: 'success' });
                                if (onSyncSuccess) onSyncSuccess();
                              }
                            }}
                            className="px-3 py-1.5 rounded-xl border border-emerald-500 text-emerald-600 hover:bg-emerald-50 font-bold transition flex items-center gap-1"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>Restore</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* ─────────────────────────────────────────────────────────────
               5. PLANS AND EXPIRY DATE ("plans and expiry date")
            ───────────────────────────────────────────────────────────── */}
            {activeTab === 'plans' && (
              <div className="max-w-2xl mx-auto space-y-6">
                
                {/* Plan Status Banner */}
                <div className="p-8 rounded-3xl border-2 border-emerald-400 bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-emerald-950/20 dark:via-slate-900 dark:to-teal-950/20 text-center space-y-3 shadow-lg">
                  <div className="w-14 h-14 rounded-3xl bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-md shadow-emerald-500/30">
                    <ShieldCheck className="w-8 h-8" />
                  </div>

                  <span className="inline-block text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white px-3 py-1 rounded-full">
                    {isLifetime ? '🎁 LIFETIME FREE CLOUD' : 'PRO CLOUD ACTIVE'}
                  </span>

                  <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                    {cloudTenant?.shop_name || 'My Pharmacy'}
                  </h3>

                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-800 text-xs space-y-1.5 max-w-sm mx-auto">
                    <p className="text-slate-500 font-semibold">Subscription Expiry Date:</p>
                    <p className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">
                      {fmtExpiry(cloudTenant?.plan_expires_at)}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono mt-1">
                      License Key: {cloudTenant?.license_key || 'KNITE-MIV2-1MUE-61KV'}
                    </p>
                  </div>
                </div>

                {/* Plan Inclusions */}
                <div className={`p-6 rounded-3xl border shadow-sm space-y-3 ${
                  isDark ? 'bg-[#181115] border-rose-950/60' : 'bg-white border-slate-200'
                }`}>
                  <h4 className="font-black text-sm text-slate-900 dark:text-white">Active Plan Privileges:</h4>
                  <div className="space-y-2 text-xs">
                    {[
                      'Automatic Real-Time Cloud Sync (Every 45 seconds)',
                      'Zero Data Loss Multi-Device Synchronization',
                      'Full Database Snapshot Downloads ("Download as Entire Thing")',
                      'Strict Tenant Privacy — 100% Isolated Database Storage',
                      'Headless Automated WhatsApp Prescription Billing'
                    ].map((feature, i) => (
                      <div key={i} className="flex items-center gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}

          </main>
        </div>
      )}

      {/* Payment Modal */}
      <PhonePeModal
        isOpen={showPayModal}
        onClose={() => setShowPayModal(false)}
        amount={799}
        purpose="CLOUD_SUBSCRIPTION"
        storeInfo={shopProfile}
        onPaymentSuccess={() => {
          setShowPayModal(false);
          fetchStoreCloudData();
        }}
        theme={theme}
      />
    </div>
  );
}
