import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, 
  ShoppingCart, 
  Package, 
  FileText, 
  BarChart3, 
  Cloud, 
  CloudOff, 
  RefreshCw, 
  ShieldCheck, 
  Sun,
  Moon,
  MessageSquare,
  Percent,
  LogOut,
  User,
  Zap,
  Languages,
  Check,
  Menu,
  X,
  ChevronRight,
  Store,
  Sparkles,
  Download
} from 'lucide-react';
import { SyncService } from '../services/syncService';
import { useLanguage } from '../i18n/languageContext';

export default function Navbar({ 
  activeTab, 
  setActiveTab, 
  onOpenCloudModal, 
  onOpenWhatsAppModal,
  onOpenGSTModal,
  onOpenPhonePeUpgrade,
  onOpenDownloadPortal,
  onLogout,
  shopOwner,
  syncStatus, 
  triggerSync, 
  theme, 
  toggleTheme 
}) {
  const { language, setLanguage, availableLanguages, t } = useLanguage();
  const [isCloudOnline, setIsCloudOnline] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [time, setTime] = useState(new Date().toLocaleTimeString());
  const langMenuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target)) {
        setIsLangMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 15000);
    return () => clearInterval(interval);
  }, []);

  async function checkConnection() {
    const online = await SyncService.checkCloudHealth();
    setIsCloudOnline(online);
  }

  async function handleManualSync() {
    setIsSyncing(true);
    await triggerSync();
    setIsSyncing(false);
  }

  const paidPlans = ['pro_cloud', 'cloud_799', 'pos_599', 'local_599', 'pos_basic', 'enterprise', 'enterprise_1299', 'enterprise_1499'];
  const userPlan = shopOwner?.plan_type || 'trial';
  const isPaidPlan = paidPlans.includes(userPlan);
  const isTrial = !isPaidPlan;

  const planExpiry = shopOwner?.plan_expires_at ? new Date(shopOwner.plan_expires_at) : null;
  const daysLeft = planExpiry 
    ? Math.max(0, Math.ceil((planExpiry - new Date()) / (1000 * 60 * 60 * 24)))
    : (isTrial ? 1 : 30);

  const planName = isPaidPlan 
    ? (userPlan.includes('pos') || userPlan.includes('599') ? 'Basic POS' : userPlan.includes('enterprise') ? 'Enterprise' : 'Pro Cloud')
    : 'Free Trial';

  const currentLangObj = availableLanguages.find(l => l.code === language) || availableLanguages[0];

  const tabs = [
    { id: 'pos',       label: t('pos_billing', 'POS Billing'),      shortLabel: 'Billing',   icon: ShoppingCart, hotkey: 'F2' },
    { id: 'inventory', label: t('inventory', 'Medicines & Stock'),  shortLabel: 'Stock',     icon: Package,      hotkey: 'F3' },
    { id: 'invoices',  label: t('invoices', 'Bills & History'),    shortLabel: 'Invoices',  icon: FileText,     hotkey: 'F4' },
    { id: 'reports',   label: t('reports', 'Analytics & GST'),    shortLabel: 'Reports',   icon: BarChart3,    hotkey: 'F5' },
    { id: 'cloud',     label: t('cloud_sync', 'Cloud & Sync'),       shortLabel: 'Cloud',     icon: Cloud,        hotkey: 'F6' },
  ];

  const isDark = theme === 'dark';

  return (
    <>
      {/* ── Top Header Bar (Desktop & Mobile) ── */}
      <header className={`sticky top-0 z-40 px-3 sm:px-5 py-2.5 sm:py-3 mb-3 sm:mb-5 border rounded-2xl shadow-sm transition-colors ${
        isDark 
          ? 'bg-[#140e10]/95 border-[#f94449]/25 backdrop-blur-md' 
          : 'bg-white/95 border-[#ffd7db] shadow-sm backdrop-blur-md'
      }`}>
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          
          {/* Logo and Brand Title */}
          <div className="flex items-center min-w-0 cursor-pointer" onClick={() => setActiveTab('pos')}>
            <div className="flex items-center justify-center pr-2.5 sm:pr-3 shrink-0">
              <img 
                src="/logo_icon.png" 
                alt="Knite Medico Official Logo" 
                className="h-9 sm:h-12 w-auto object-contain drop-shadow-sm select-none transition-transform hover:scale-105 duration-200" 
              />
            </div>
            <div className="border-l-2 border-slate-200 dark:border-rose-950/60 pl-2.5 sm:pl-3.5 min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className={`font-black text-xs sm:text-base tracking-tight truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  KNITE MEDICO
                </span>
                <span className="hidden xs:inline-block badge badge-brand text-[8px] sm:text-[9px] py-0.5 px-1 font-black uppercase">
                  v1.0 SaaS
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 font-bold truncate max-w-[130px] sm:max-w-[220px]">
                {shopOwner?.shop_name || 'Pharmacy Cloud POS'}
              </p>
            </div>
          </div>

          {/* Desktop Navigation Tabs (Hidden on Mobile/Tablet < lg) */}
          <nav className={`hidden lg:flex items-center gap-1 p-1 rounded-xl border ${
            isDark ? 'bg-[#180f12] border-rose-950/60' : 'bg-slate-100/80 border-slate-200/80'
          }`}>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-[#ff2c2c] to-[#f94449] text-white shadow-md shadow-[#ff2c2c]/30'
                      : isDark 
                        ? 'text-slate-300 hover:text-white hover:bg-rose-950/40'
                        : 'text-slate-600 hover:text-[#ff2c2c] hover:bg-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                    isActive 
                      ? 'bg-white/20 text-white' 
                      : isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {tab.hotkey}
                  </span>
                </button>
              );
            })}
          </nav>

          {/* Desktop Controls (Hidden on Mobile < lg) */}
          <div className="hidden lg:flex items-center gap-2">
            {/* Customizable GST Button */}
            <button
              onClick={onOpenGSTModal}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition ${
                isDark 
                  ? 'bg-[#1d1215] border-rose-900/40 text-rose-200 hover:bg-[#2b171c]' 
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
              title="Configure Custom GST Tax Slabs"
            >
              <Percent className="w-3.5 h-3.5 text-[#ff2c2c]" />
              <span>Custom GST</span>
            </button>

            {/* WhatsApp Automated Setup Button */}
            <button
              onClick={onOpenWhatsAppModal}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/30 text-[#128C7E] dark:text-[#25D366] rounded-xl text-xs font-bold transition"
              title="Configure Automated WhatsApp Billing"
            >
              <MessageSquare className="w-3.5 h-3.5 text-[#25D366]" />
              <span>WhatsApp</span>
            </button>

            {/* Subscription & Days Left Badge */}
            <button
              onClick={onOpenPhonePeUpgrade}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-black shadow-sm transition border ${
                isPaidPlan 
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-800 dark:text-emerald-300 hover:brightness-110' 
                  : 'bg-amber-500/15 border-amber-400/50 text-amber-800 dark:text-amber-300 hover:brightness-105'
              }`}
              title={`Active Plan: ${planName}. Click to view subscription plans & payment options.`}
            >
              <Sparkles className={`w-3.5 h-3.5 ${isPaidPlan ? 'text-emerald-500' : 'text-amber-500 animate-pulse'}`} />
              <span>{planName} • {daysLeft} {daysLeft === 1 ? 'Day' : 'Days'} Left</span>
            </button>

            {/* Cloud Status Indicator */}
            {shopOwner?.plan_type === 'pro_cloud' || shopOwner?.plan_type === 'cloud' || isCloudOnline ? (
              <button
                onClick={() => setActiveTab('cloud')}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-black shadow-sm hover:bg-emerald-100 transition"
                title="Cloud Sync Active — click to open Cloud page"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <Cloud className="w-3.5 h-3.5 text-emerald-600" />
                <span>Cloud</span>
              </button>
            ) : (
              <button
                onClick={() => setActiveTab('cloud')}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-[#5f259f] to-[#7b2cbf] text-white text-xs font-black shadow-md shadow-purple-900/20 hover:brightness-110 active:scale-[0.98] transition"
                title="Click to upgrade or manage Cloud Sync"
              >
                <Zap className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                <span>Cloud</span>
                <span className="px-1 py-0.5 rounded bg-white/20 text-[10px]">₹999</span>
              </button>
            )}

            {/* Light / Dark Mode Toggle */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-xl border flex items-center justify-center transition-all ${
                isDark 
                  ? 'bg-slate-800 border-slate-700 text-amber-300 hover:bg-slate-700' 
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Multilingual Selector */}
            <div className="relative" ref={langMenuRef}>
              <button
                onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-black transition-all ${
                  isDark 
                    ? 'bg-[#1d1215] border-rose-900/40 text-rose-200 hover:bg-[#2b171c]' 
                    : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100 shadow-sm'
                }`}
                title="Change Language"
              >
                <Languages className="w-3.5 h-3.5 text-[#ff2c2c]" />
                <span className="text-[11px] font-extrabold uppercase">{currentLangObj.code}</span>
              </button>

              {isLangMenuOpen && (
                <div className={`absolute right-0 mt-2 w-48 rounded-2xl border shadow-xl p-1.5 z-50 ${
                  isDark ? 'bg-[#181115] border-rose-950/80 text-white shadow-2xl' : 'bg-white border-slate-200 text-slate-800 shadow-xl'
                }`}>
                  <div className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Select Language
                  </div>
                  {availableLanguages.map(l => (
                    <button
                      key={l.code}
                      onClick={() => {
                        setLanguage(l.code);
                        setIsLangMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-bold transition ${
                        language === l.code
                          ? 'bg-gradient-to-r from-[#ff2c2c] to-[#f94449] text-white shadow-sm'
                          : isDark ? 'hover:bg-rose-950/40 text-slate-200' : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-base">{l.flag}</span>
                        <span>{l.nativeName}</span>
                      </span>
                      {language === l.code && <Check className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Download Desktop App Button */}
            {onOpenDownloadPortal && (
              <button
                onClick={onOpenDownloadPortal}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-500/30 bg-blue-50/80 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-xs font-bold transition shadow-sm"
                title="Download Windows / Linux Desktop App & Guidelines"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden xl:inline">Download App</span>
              </button>
            )}

            {/* Logout */}
            <div className="flex items-center pl-1 border-l border-[#ffd7db] dark:border-rose-950/40">
              <button
                onClick={onLogout}
                className="p-2 rounded-xl text-slate-400 hover:text-[#ff2c2c] hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                title="Logout / Switch Pharmacy Store"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ── Mobile Right Quick Header (Visible on Mobile/Tablet < lg) ── */}
          <div className="flex lg:hidden items-center gap-1 sm:gap-2">
            {/* Quick Plan Badge on Mobile */}
            <button
              onClick={onOpenPhonePeUpgrade}
              className={`flex items-center gap-1 px-2 py-1 rounded-xl border text-[10px] font-black ${
                isPaidPlan 
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-800 dark:text-emerald-300' 
                  : 'bg-amber-500/20 border-amber-400/40 text-amber-700 dark:text-amber-300'
              }`}
              title={`Active Plan: ${planName}`}
            >
              <Sparkles className={`w-3 h-3 ${isPaidPlan ? 'text-emerald-500' : 'text-amber-500 animate-pulse'}`} />
              <span>{daysLeft}d left</span>
            </button>

            {/* Quick Dark/Light Toggle */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-xl border flex items-center justify-center transition-all ${
                isDark 
                  ? 'bg-slate-800 border-slate-700 text-amber-300' 
                  : 'bg-slate-100 border-slate-200 text-slate-700'
              }`}
              aria-label="Toggle Theme"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Mobile Menu / Drawer Toggle */}
            <button
              onClick={() => setIsMobileDrawerOpen(true)}
              className="p-2 rounded-xl bg-gradient-to-r from-[#ff2c2c] to-[#f94449] text-white shadow-md shadow-[#ff2c2c]/30 active:scale-95 transition"
              aria-label="Open Store Menu"
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>

        </div>
      </header>

      {/* ── Fixed Mobile Bottom Navigation Bar (Ultra-responsive on all phones) ── */}
      <nav className={`fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t px-1 py-1.5 backdrop-blur-xl transition-all shadow-[0_-4px_24px_rgba(0,0,0,0.12)] ${
        isDark 
          ? 'bg-[#120a0d]/95 border-rose-950/70 text-slate-300' 
          : 'bg-white/95 border-[#ffd7db] text-slate-700'
      }`}>
        <div className="grid grid-cols-5 gap-0.5 max-w-md mx-auto items-center">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all relative ${
                  isActive
                    ? 'text-[#ff2c2c] font-black'
                    : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <div className={`p-1 rounded-xl transition-all ${
                  isActive 
                    ? 'bg-rose-100 dark:bg-rose-950/80 text-[#ff2c2c] scale-110 shadow-sm' 
                    : 'bg-transparent'
                }`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] mt-0.5 tracking-tight font-extrabold truncate w-full text-center">
                  {tab.shortLabel || tab.label}
                </span>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#ff2c2c] absolute -top-0.5" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* ── Mobile Slide-Over Drawer Sheet ── */}
      {isMobileDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex justify-end">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileDrawerOpen(false)}
          />

          {/* Drawer Body */}
          <div className={`relative w-full max-w-xs h-full shadow-2xl flex flex-col z-10 transition-transform ${
            isDark ? 'bg-[#140e10] text-slate-100 border-l border-rose-950/60' : 'bg-white text-slate-900 border-l border-slate-200'
          }`}>
            
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-200 dark:border-rose-950/60 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <img src="/logo_icon.png" alt="KNITE Medico" className="w-7 h-7 object-contain drop-shadow-xs" />
                <div>
                  <h3 className="font-black text-sm">{shopOwner?.shop_name || 'My Pharmacy'}</h3>
                  <p className="text-[11px] text-slate-500 font-bold truncate">Owner: {shopOwner?.owner_name || 'Admin'}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsMobileDrawerOpen(false)}
                className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              
              {/* Cloud Sync Status Card */}
              <div className={`p-3.5 rounded-2xl border ${
                isDark ? 'bg-[#1f1216] border-rose-950/50' : 'bg-rose-50/70 border-rose-100'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black uppercase text-[#ff2c2c] flex items-center gap-1.5">
                    <Cloud className="w-3.5 h-3.5" /> Cloud Sync
                  </span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    isCloudOnline ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {isCloudOnline ? 'Online' : 'Local Only'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
                  Automatic background synchronization to server for safe medical data backup.
                </p>
                <button
                  onClick={() => {
                    setIsMobileDrawerOpen(false);
                    setActiveTab('cloud');
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-[#ff2c2c] to-[#f94449] text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-md shadow-[#ff2c2c]/30"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Open Cloud Portal</span>
                </button>
              </div>

              {/* Action Buttons */}
              <div className="space-y-1.5">
                <button
                  onClick={() => {
                    setIsMobileDrawerOpen(false);
                    onOpenWhatsAppModal();
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-[#25D366]/10 text-[#128C7E] dark:text-[#25D366] font-bold text-xs hover:bg-[#25D366]/20 transition"
                >
                  <span className="flex items-center gap-2.5">
                    <MessageSquare className="w-4 h-4 text-[#25D366]" />
                    <span>WhatsApp Automated Billing</span>
                  </span>
                  <ChevronRight className="w-4 h-4 opacity-50" />
                </button>

                <button
                  onClick={() => {
                    setIsMobileDrawerOpen(false);
                    onOpenGSTModal();
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 font-bold text-xs hover:bg-slate-200 transition"
                >
                  <span className="flex items-center gap-2.5">
                    <Percent className="w-4 h-4 text-[#ff2c2c]" />
                    <span>Configure GST Slabs</span>
                  </span>
                  <ChevronRight className="w-4 h-4 opacity-50" />
                </button>

                <button
                  onClick={() => {
                    setIsMobileDrawerOpen(false);
                    onOpenPhonePeUpgrade();
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 font-bold text-xs hover:bg-purple-100 transition"
                >
                  <span className="flex items-center gap-2.5">
                    <Zap className="w-4 h-4 text-purple-600" />
                    <span>Upgrade Cloud Tier</span>
                  </span>
                  <ChevronRight className="w-4 h-4 opacity-50" />
                </button>

                {onOpenDownloadPortal && (
                  <button
                    onClick={() => {
                      setIsMobileDrawerOpen(false);
                      onOpenDownloadPortal();
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 font-bold text-xs hover:bg-blue-100 transition"
                  >
                    <span className="flex items-center gap-2.5">
                      <Download className="w-4 h-4 text-blue-600" />
                      <span>Download Desktop App & Guides</span>
                    </span>
                    <ChevronRight className="w-4 h-4 opacity-50" />
                  </button>
                )}
              </div>

              {/* Multilingual Selector */}
              <div className="pt-2 border-t border-slate-200 dark:border-rose-950/60">
                <p className="text-[11px] font-black uppercase text-slate-400 mb-2">App Language</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {availableLanguages.map(l => (
                    <button
                      key={l.code}
                      onClick={() => setLanguage(l.code)}
                      className={`p-2 rounded-xl text-xs font-bold flex items-center justify-between transition ${
                        language === l.code 
                          ? 'bg-[#ff2c2c] text-white shadow-sm' 
                          : isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      <span>{l.flag} {l.name}</span>
                      {language === l.code && <Check className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-rose-950/60">
              <button
                onClick={() => {
                  setIsMobileDrawerOpen(false);
                  onLogout();
                }}
                className="w-full py-3 px-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-[#ff2c2c] font-black text-xs flex items-center justify-center gap-2 hover:bg-rose-100 transition"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout Pharmacy Account</span>
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
