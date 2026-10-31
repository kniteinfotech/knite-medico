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
import PhonePeModal from './components/PhonePeModal';
import PlanSelectionScreen from './components/PlanSelectionScreen';
import { seedInitialDataIfEmpty, db } from './db/localDb';
import { SyncService } from './services/syncService';

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
  const [isPhonePeModalOpen, setIsPhonePeModalOpen] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState(null);
  const [theme, setTheme] = useState(localStorage.getItem('knite_theme') || 'light');

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
            💳 Pay via Razorpay (₹799/month)
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

        {/* ⚠️ Local Data Loss Warning — shown to non-cloud users */}
        {(() => {
          const hasCloudToken = !!(localStorage.getItem('knite_auth_token'));
          const planType = shopOwner?.plan_type || 'free_local';
          const isCloudPlan = planType === 'pro_cloud' || planType === 'cloud_799' || planType === 'cloud' || planType === 'enterprise' || planType === 'enterprise_1299' || isDevUser;
          const isLocalOnlyUser = !isCloudPlan || !hasCloudToken;
          if (!isLocalOnlyUser) return null;
          return (
            <div className={`mb-4 p-3.5 rounded-2xl border-2 flex flex-col sm:flex-row sm:items-center gap-3 ${
              theme === 'dark'
                ? 'bg-amber-950/30 border-amber-700/60 text-amber-200'
                : 'bg-amber-50 border-amber-400 text-amber-900'
            }`}>
              <div className="flex items-start sm:items-center gap-3 flex-1">
                <span className="text-xl shrink-0">⚠️</span>
                <div>
                  <p className="font-black text-sm">Your data is stored locally only — it may be lost!</p>
                  <p className="text-xs font-semibold mt-0.5 opacity-80">
                    Local data lives in this browser's IndexedDB. Clearing browser data, reinstalling, or switching browsers will erase all invoices and medicines.
                    Upgrade to Cloud to secure all your pharmacy data on our 1 TB server — zero data loss guaranteed.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('cloud')}
                className="shrink-0 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-black shadow-md hover:shadow-lg transition active:scale-95 whitespace-nowrap"
              >
                🔒 Upgrade to Cloud
              </button>
            </div>
          );
        })()}


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

      {/* Plan Selection & Subscription Management Modal */}
      {isPhonePeModalOpen && (
        <PlanSelectionScreen
          shopOwner={shopOwner}
          isModal={true}
          onClose={() => setIsPhonePeModalOpen(false)}
          onPlanSelected={(planData) => {
            handlePlanSelected(planData);
            setIsPhonePeModalOpen(false);
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

        <p className="font-mono text-[11px] text-slate-500">
          Owner: <span className="font-bold text-[#ff2c2c]">{shopOwner.owner_name}</span> • Local DB Active
        </p>
      </footer>
    </div>
  );
}
