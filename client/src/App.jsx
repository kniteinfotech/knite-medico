import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import POSBilling from './components/POSBilling';
import Inventory from './components/Inventory';
import InvoicesList from './components/InvoicesList';
import Reports from './components/Reports';
import CloudSyncModal from './components/CloudSyncModal';
import CloudPage from './components/CloudPage';
import AuthScreen from './components/AuthScreen';
import WhatsAppSetupModal from './components/WhatsAppSetupModal';
import GSTSettingsModal from './components/GSTSettingsModal';
import SuperAdminPortal from './components/SuperAdminPortal';
import PlanSelectionScreen from './components/PlanSelectionScreen';
import PrivacyPolicyPage from './components/PrivacyPolicyPage';
import { seedInitialDataIfEmpty, db } from './db/localDb';
import { SyncService } from './services/syncService';
import { WifiOff, RefreshCw } from 'lucide-react';

export default function App() {
  const [shopOwner, setShopOwner] = useState(null);
  const [isAdminRoute, setIsAdminRoute] = useState(
    window.location.pathname.startsWith('/admin') || window.location.hash.includes('admin')
  );
  const [showPlanSelection, setShowPlanSelection] = useState(false); // Show plan screen for new users
  const [activeTab, setActiveTab] = useState('pos'); // pos, inventory, invoices, reports
  const [isCloudModalOpen, setIsCloudModalOpen] = useState(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [isGSTModalOpen, setIsGSTModalOpen] = useState(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState(null);
  const [theme, setTheme] = useState(localStorage.getItem('knite_theme') || 'light');
  const [isOnline, setIsOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    function handleOnline() { setIsOnline(true); }
    function handleOffline() { setIsOnline(false); }
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  const [showNotifPrompt, setShowNotifPrompt] = useState(() => {
    return typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'default' &&
      !sessionStorage.getItem('dismissed_notification_prompt');
  });

  const handleEnableNotifications = async () => {
    if ('Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
          if ('serviceWorker' in navigator) {
            const reg = await navigator.serviceWorker.ready;
            reg.showNotification('KNITE Medico Live', {
              body: 'Push notifications are now active on your device! 🎉',
              icon: '/logo_icon.png'
            });
          } else {
            new Notification('KNITE Medico Live', {
              body: 'Push notifications are now active on your device! 🎉',
              icon: '/logo_icon.png'
            });
          }
        }
      } catch (e) {
        console.warn('Notification permission request error:', e);
      }
    }
    setShowNotifPrompt(false);
  };

  // Listen to browser navigation changes (/admin)
  useEffect(() => {
    function handleLocationCheck() {
      const isAdm = window.location.pathname.startsWith('/admin') || window.location.hash.includes('admin');
      setIsAdminRoute(isAdm);
    }

    window.addEventListener('popstate', handleLocationCheck);
    window.addEventListener('hashchange', handleLocationCheck);
    return () => {
      window.removeEventListener('popstate', handleLocationCheck);
      window.removeEventListener('hashchange', handleLocationCheck);
    };
  }, []);

  // Check shop owner login status on boot (requires active session so new visits go to login page first)
  useEffect(() => {
    const sessionActive = sessionStorage.getItem('knite_session_active');
    const saved = localStorage.getItem('knite_shop_owner');
    if (sessionActive === 'true' && saved) {
      try {
        setShopOwner(JSON.parse(saved));
      } catch {
        setShopOwner(null);
      }
    } else {
      // First it should go to login page!
      setShopOwner(null);
    }
  }, []);

  // Synchronize theme with DOM
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('knite_theme', theme);
  }, [theme]);

  function toggleTheme() {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  }

  // Initialize Local Database on startup
  useEffect(() => {
    seedInitialDataIfEmpty().catch(console.error);
  }, []);

  // Handle successful login / registration
  function handleAuthSuccess(ownerProfile, isNewRegistration) {
    sessionStorage.setItem('knite_session_active', 'true');
    setShopOwner(ownerProfile);
    if (isNewRegistration) {
      // Show plan selection screen for new registrations
      setShowPlanSelection(true);
    } else {
      const waConfigured = localStorage.getItem('knite_whatsapp_configured');
      if (!waConfigured) {
        setTimeout(() => setIsWhatsAppModalOpen(true), 500);
      }
    }
  }

  // Handle plan selected from PlanSelectionScreen
  async function handlePlanSelected(planData) {
    const updated = { ...shopOwner, ...planData };
    sessionStorage.setItem('knite_session_active', 'true');
    setShopOwner(updated);
    localStorage.setItem('knite_shop_owner', JSON.stringify(updated));
    try { await db.settings.put(updated, 'store_profile'); } catch {}
    setShowPlanSelection(false);
    // Now prompt WhatsApp setup
    setTimeout(() => setIsWhatsAppModalOpen(true), 600);
  }

  // Logout Handler for shop owner
  function handleLogout() {
    if (confirm('Are you sure you want to log out of this medical store session?')) {
      sessionStorage.removeItem('knite_session_active');
      localStorage.removeItem('knite_shop_owner');
      localStorage.removeItem('knite_auth_token');
      localStorage.removeItem('knite_cloud_tenant');
      localStorage.removeItem('knite_last_sync_timestamp');
      setShopOwner(null);
      window.location.reload();
    }
  }

  // Keyboard Navigation Shortcuts (F2 - F5)
  useEffect(() => {
    function handleKeyDown(e) {
      if (!shopOwner || isAdminRoute) return;
      if (e.key === 'F2') {
        e.preventDefault();
        setActiveTab('pos');
      } else if (e.key === 'F3') {
        e.preventDefault();
        setActiveTab('inventory');
      } else if (e.key === 'F4') {
        e.preventDefault();
        setActiveTab('invoices');
      } else if (e.key === 'F5') {
        e.preventDefault();
        setActiveTab('reports');
      } else if (e.key === 'F6') {
        e.preventDefault();
        setActiveTab('cloud');
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shopOwner, isAdminRoute]);

  // Background Auto-Sync every 45 seconds
  useEffect(() => {
    if (!shopOwner || isAdminRoute) return;
    const autoSyncInterval = setInterval(async () => {
      const isOnline = await SyncService.checkCloudHealth();
      if (isOnline) {
        await SyncService.pushSync();
        await SyncService.pullSync();
      }
    }, 45000);

    return () => clearInterval(autoSyncInterval);
  }, [shopOwner, isAdminRoute]);

  async function triggerManualSync() {
    const push = await SyncService.pushSync();
    const pull = await SyncService.pullSync();
    setLastSyncResult({ push, pull, timestamp: new Date().toLocaleTimeString() });
  }

  // Public Compliance Route: Privacy Policy (for Google Play Store & Legal Compliance)
  const isPrivacyRoute = window.location.pathname.startsWith('/privacy') || window.location.hash.includes('privacy');
  if (isPrivacyRoute) {
    return <PrivacyPolicyPage />;
  }

  // Active Internet Requirement: KNITE Medico is a 100% Cloud SaaS platform
  if (!isOnline) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="w-20 h-20 rounded-3xl bg-rose-500/10 border-2 border-rose-500/30 flex items-center justify-center mb-6 shadow-2xl shadow-rose-500/20">
          <WifiOff className="w-10 h-10 text-rose-500 animate-pulse" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight mb-2">Internet Connection Required</h1>
        <p className="text-sm text-slate-400 max-w-md mb-8 leading-relaxed">
          KNITE Medico is an All-In-One Cloud SaaS platform. Please connect to Wi-Fi or mobile data to open your store, sync live inventory, and generate tax invoices.
        </p>
        <button
          onClick={() => setIsOnline(navigator.onLine)}
          className="px-6 py-3 rounded-2xl bg-[#ff2c2c] hover:bg-red-600 text-white font-extrabold text-sm shadow-lg shadow-red-500/30 transition active:scale-95 flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Check Connection Again</span>
        </button>
        <p className="text-[11px] font-mono text-slate-500 mt-8">KNITE Medico Cloud • Online Required</p>
      </div>
    );
  }

  // 1. DEDICATED /admin ROUTE (Protected strictly for kniteinfotech@gmail.com)
  // Admin panel is always light-themed — remove dark class while on this route
  if (isAdminRoute) {
    document.documentElement.classList.remove('dark');
    return (
      <SuperAdminPortal
        onClose={() => {
          // Restore user's original theme when leaving admin
          if (theme === 'dark') document.documentElement.classList.add('dark');
          window.history.pushState({}, '', '/');
          setIsAdminRoute(false);
        }}
        theme="light"
      />
    );
  }

  // 2. Normal Store App: If not logged in, show AuthScreen (Login first)
  if (!shopOwner) {
    return (
      <AuthScreen
        onAuthSuccess={handleAuthSuccess}
        onOpenSuperAdmin={() => {
          window.history.pushState({}, '', '/admin');
          setIsAdminRoute(true);
        }}
        theme={theme}
      />
    );
  }

  const isDevUser = (shopOwner?.email || '').toLowerCase() === 'nitheesh8797@gmail.com';
  const isApproved = shopOwner?.status === 'APPROVED' || isDevUser;

  // 2b. User must select and pay plan (no skip option, strictly free only for nitheesh8797@gmail.com)
  if (showPlanSelection || (!isApproved && !isDevUser)) {
    return (
      <PlanSelectionScreen
        shopOwner={shopOwner}
        onPlanSelected={handlePlanSelected}
        theme={theme}
      />
    );
  }

  // 2c. Subscription expiry blocking logic (1-day grace period for unpaid months)
  const isTrialStore = Boolean(shopOwner?.is_trial);
  const GRACE_DAYS = isTrialStore ? 0 : 1;
  const planExpiry = shopOwner?.plan_expires_at ? new Date(shopOwner.plan_expires_at) : null;
  const now = new Date();
  const isPaidPlan = !isDevUser && shopOwner?.plan_type !== 'free_dev';
  const isExpired = isPaidPlan && planExpiry && now > planExpiry;
  const graceEnd = planExpiry ? new Date(planExpiry.getTime() + GRACE_DAYS * 24 * 60 * 60 * 1000) : null;
  const isInGrace = isExpired && graceEnd && now < graceEnd;
  const isFullyBlocked = isExpired && (!graceEnd || now >= graceEnd);
  const hoursLeft = graceEnd ? Math.max(1, Math.ceil((graceEnd - now) / (1000 * 60 * 60))) : 0;

  // Fully blocked — show renew screen
  if (isFullyBlocked) {
    return (
      <div className={`min-h-screen font-sans flex flex-col items-center justify-center px-4 py-8 ${theme === 'dark' ? 'bg-[#0d0a0b]' : 'bg-gradient-to-br from-[#fff5f6] via-white to-[#f0f4ff]'}`}>
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-400 to-red-700 flex items-center justify-center mx-auto mb-5 shadow-2xl shadow-red-500/30">
            <span className="text-4xl">🔒</span>
          </div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2">
            {isTrialStore ? '1-Day Free Trial Expired' : 'Subscription Expired'}
          </h2>
          <p className="text-slate-500 text-sm mb-2">
            {isTrialStore 
              ? 'Your 1-Day Free Trial has ended.'
              : 'Your monthly cloud subscription has expired and the 1-day grace period has ended.'}
          </p>
          <p className="text-slate-500 text-sm mb-8">Please complete your monthly renewal via Razorpay to keep Cloud Sync, WhatsApp billing, and automated backup active.</p>
          <button
            onClick={() => setShowPlanSelection(true)}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#ff2c2c] to-[#f94449] text-white font-black text-base flex items-center justify-center gap-2 hover:shadow-xl hover:shadow-[#ff2c2c]/40 transition mb-4"
          >
            💳 Pay via Razorpay (₹922/month)
          </button>
          <button
            onClick={handleLogout}
            className={`w-full py-3 rounded-2xl font-bold text-sm transition ${theme === 'dark' ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  // 3. Normal Store App: When logged in as pharmacy shop owner
  return (
    <div className={`min-h-screen transition-colors duration-200 p-2 sm:p-5 pb-20 lg:pb-5 flex flex-col font-sans ${
      theme === 'dark' ? 'bg-[#0d0a0b] text-slate-100' : 'bg-[#fcf9fa] text-slate-900'
    }`}>
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenCloudModal={() => setIsCloudModalOpen(true)}
        onOpenWhatsAppModal={() => setIsWhatsAppModalOpen(true)}
        onOpenGSTModal={() => setIsGSTModalOpen(true)}
        onOpenPhonePeUpgrade={() => setShowPlanSelection(true)}
        onLogout={handleLogout}
        shopOwner={shopOwner}
        syncStatus={lastSyncResult}
        triggerSync={triggerManualSync}
        theme={theme}
        toggleTheme={toggleTheme}
      />

      {/* Main Tab Content */}
      <main className={`flex-1 w-full ${activeTab === 'cloud' ? 'max-w-none' : 'max-w-7xl mx-auto'}`}>

        {/* Push Notification Opt-in Prompt */}
        {showNotifPrompt && (
          <div className="mb-4 p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-between gap-3 text-xs shadow-sm">
            <div className="flex items-center gap-2.5 text-indigo-900 dark:text-indigo-200 min-w-0">
              <span className="text-xl shrink-0">🔔</span>
              <span className="font-bold truncate sm:whitespace-normal">Enable push notifications for real-time WhatsApp & stock expiry alerts on your device.</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleEnableNotifications}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-sm transition active:scale-95 whitespace-nowrap"
              >
                Enable
              </button>
              <button
                onClick={() => {
                  setShowNotifPrompt(false);
                  sessionStorage.setItem('dismissed_notification_prompt', 'true');
                }}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold"
                aria-label="Dismiss notification prompt"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Grace Period Warning Banner */}
        {isInGrace && (
          <div className="mb-4 p-4 rounded-2xl bg-amber-50 border-2 border-amber-400 flex items-start gap-3">
            <span className="text-2xl shrink-0">⚠️</span>
            <div className="flex-1">
              <p className="font-black text-amber-800 text-sm">Monthly Payment Due — 1-Day Grace Period ({hoursLeft > 24 ? '1 day left' : `${hoursLeft} hour${hoursLeft !== 1 ? 's' : ''} left`})!</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Your monthly cloud subscription expired on{' '}
                {planExpiry?.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}.
                You have a 1-day (24-hour) grace period to complete payment before cloud features pause. Local database remains safe and non-erasable.
              </p>
            </div>
            <button
              onClick={() => setShowPlanSelection(true)}
              className="shrink-0 px-4 py-2 rounded-xl bg-amber-500 text-white text-xs font-black hover:bg-amber-600 transition"
            >
              Pay via Razorpay
            </button>
          </div>
        )}


        {activeTab === 'pos' && (
          <POSBilling 
            onSaleComplete={triggerManualSync} 
            theme={theme} 
            onOpenWhatsAppModal={() => setIsWhatsAppModalOpen(true)}
          />
        )}
        {activeTab === 'inventory' && (
          <Inventory onStockModified={triggerManualSync} theme={theme} />
        )}
        {activeTab === 'invoices' && (
          <InvoicesList theme={theme} />
        )}
        {activeTab === 'reports' && (
          <Reports theme={theme} />
        )}
        {activeTab === 'cloud' && (
          <CloudPage
            theme={theme}
            onSyncSuccess={triggerManualSync}
            shopOwner={shopOwner}
          />
        )}
      </main>

      {/* WhatsApp Setup Wizard Modal */}
      <WhatsAppSetupModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        theme={theme}
      />

      {/* Customizable GST Slabs Modal */}
      <GSTSettingsModal
        isOpen={isGSTModalOpen}
        onClose={() => setIsGSTModalOpen(false)}
        onSave={() => {
          setActiveTab(curr => curr);
        }}
        theme={theme}
      />

      {/* Cloud Sync & SaaS License Modal */}
      <CloudSyncModal
        isOpen={isCloudModalOpen}
        onClose={() => setIsCloudModalOpen(false)}
        onSyncSuccess={triggerManualSync}
        theme={theme}
      />

      {/* Plan Selection & Razorpay Subscription Management Modal */}
      {isPlanModalOpen && (
        <PlanSelectionScreen
          shopOwner={shopOwner}
          isModal={true}
          onClose={() => setIsPlanModalOpen(false)}
          onPlanSelected={(planData) => {
            handlePlanSelected(planData);
            setIsPlanModalOpen(false);
          }}
          theme={theme}
        />
      )}

      {/* Footer */}
      <footer className={`mt-8 pt-4 pb-6 lg:pb-0 border-t text-center text-xs no-print flex flex-col sm:flex-row items-center justify-between max-w-7xl mx-auto w-full gap-2 ${
        theme === 'dark' ? 'border-rose-950/40 text-slate-500' : 'border-[#ffd7db] text-slate-500'
      }`}>
        <p className="flex items-center gap-1.5">
          <img src="/logo_icon.png" alt="KNITE Medico" className="w-4 h-4 object-contain inline-block" />
          <strong className={theme === 'dark' ? 'text-rose-300' : 'text-[#ff2c2c]'}>
            {shopOwner.shop_name}
          </strong> • Powered by KNITE Medico SaaS
        </p>

        <div className="flex items-center gap-3 font-mono text-[11px] text-slate-500">
          <span>Owner: <span className="font-bold text-[#ff2c2c]">{shopOwner.owner_name}</span> • Local DB Active</span>
          <span>•</span>
          <a href="/privacy" target="_blank" rel="noopener noreferrer" className="hover:underline text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            Privacy Policy
          </a>
        </div>
      </footer>
    </div>
  );
}
