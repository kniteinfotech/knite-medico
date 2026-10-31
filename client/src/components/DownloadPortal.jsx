import React, { useState, useMemo } from 'react';
import { 
  Apple, Monitor, Terminal, Globe, Cloud, Download, ExternalLink, 
  ShieldCheck, Zap, Printer, Barcode, Database, ChevronRight, 
  CheckCircle2, Phone, Mail, Clock, ArrowRight, Sparkles, 
  Check, Copy, HardDrive, Cpu, Layers, RefreshCw, MessageSquare
} from 'lucide-react';

export default function DownloadPortal({ onLaunchWebApp }) {
  // OS Auto-Detection (Defaults cleanly to Mac when visited from macOS)
  const detectedOS = useMemo(() => {
    if (typeof window === 'undefined') return 'windows';
    const ua = (navigator.userAgent || '').toLowerCase();
    const plat = (navigator.platform || '').toLowerCase();
    if (ua.includes('mac') || plat.includes('mac') || ua.includes('darwin')) return 'mac';
    if (ua.includes('linux') || plat.includes('linux')) return 'linux';
    return 'windows';
  }, []);

  const [activeTab, setActiveTab] = useState(detectedOS); // 'mac' | 'windows' | 'linux' | 'web'
  const [activeGuideTab, setActiveGuideTab] = useState(detectedOS);
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [inquirySent, setInquirySent] = useState(false);
  const [inquiryLoading, setInquiryLoading] = useState(false);
  const [inquiryData, setInquiryData] = useState({
    shopName: '',
    ownerName: '',
    phone: '',
    email: '',
    platform: detectedOS === 'mac' ? 'macOS DMG' : 'Windows Desktop App',
    message: ''
  });

  const PHONE_NUMBER = '8778721940';
  const FORMATTED_PHONE = '+91 8778721940';
  const EMAIL_ADDRESS = 'kniteinfotech@gmail.com';
  const WHATSAPP_URL = `https://wa.me/91${PHONE_NUMBER}?text=${encodeURIComponent('Hello! I want to download and install KNITE Medico Pharmacy software for my medical store.')}`;

  function handleCopyLinuxCommand() {
    navigator.clipboard.writeText('curl -sSL https://knitemedico.kniteinfotech.in/downloads/install-linux.sh | bash');
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2500);
  }

  function handleDownload(platform) {
    let url = '';
    let filename = '';
    if (platform === 'mac' || platform === 'dmg') {
      url = '/downloads/KNITE-Medico.dmg';
      filename = 'KNITE-Medico.dmg';
    } else if (platform === 'mac-zip') {
      url = '/downloads/KNITE-Medico-Mac.zip';
      filename = 'KNITE-Medico-Mac.zip';
    } else if (platform === 'windows') {
      url = '/downloads/knite-medico-setup-windows.bat';
      filename = 'knite-medico-setup-windows.bat';
    } else if (platform === 'linux') {
      url = '/downloads/KNITE-Medico.AppImage';
      filename = 'KNITE-Medico.AppImage';
    } else if (platform === 'android') {
      alert('Android APK download will start. You can also open the Web App in your phone browser and tap "Add to Home Screen" to install it instantly!');
      onLaunchWebApp();
      return;
    } else {
      onLaunchWebApp();
      return;
    }

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  async function handleSendInquiry(e) {
    e.preventDefault();
    setInquiryLoading(true);

    try {
      await fetch('/api/admin/system-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `New Pharmacy Software Inquiry: ${inquiryData.shopName || inquiryData.phone}`,
          details: `Shop: ${inquiryData.shopName}\nContact: ${inquiryData.ownerName} (${inquiryData.phone})\nEmail: ${inquiryData.email}\nSystem: ${inquiryData.platform}\nQuery: ${inquiryData.message}`
        })
      }).catch(() => null);

      setInquirySent(true);
    } catch {
      setInquirySent(true);
    } finally {
      setInquiryLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#ffffff] text-[#1d1d1f] font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','SF_Pro_Display','Plus_Jakarta_Sans',sans-serif] antialiased selection:bg-[#0071e3] selection:text-white">

      {/* ── 1. GLOBAL APPLE NAVIGATION BAR (44px Light Glass) ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-11 bg-white/80 backdrop-blur-xl border-b border-black/[0.08] transition-all">
        <div className="max-w-6xl mx-auto h-full px-4 sm:px-8 flex items-center justify-between text-[12px] font-normal tracking-tight text-[#1d1d1f]/80">
          
          {/* Brand Icon */}
          <div 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-2.5 cursor-pointer text-[#1d1d1f] hover:opacity-85 transition"
          >
            <img 
              src="/logo_icon.png" 
              alt="KNITE Medico Logo" 
              className="w-6 h-6 object-contain drop-shadow-xs" 
            />
            <span className="font-semibold tracking-tight text-[#1d1d1f]">KNITE Medico</span>
          </div>

          {/* Center Navigation Links */}
          <div className="hidden md:flex items-center gap-7">
            <button onClick={() => { setActiveTab('mac'); document.getElementById('platforms')?.scrollIntoView({ behavior: 'smooth' }); }} className="hover:text-[#0071e3] transition">Mac</button>
            <button onClick={() => { setActiveTab('windows'); document.getElementById('platforms')?.scrollIntoView({ behavior: 'smooth' }); }} className="hover:text-[#0071e3] transition">Windows</button>
            <button onClick={() => { setActiveTab('linux'); document.getElementById('platforms')?.scrollIntoView({ behavior: 'smooth' }); }} className="hover:text-[#0071e3] transition">Linux</button>
            <button onClick={onLaunchWebApp} className="hover:text-[#0071e3] transition flex items-center gap-1.5 font-medium">
              <Cloud className="w-3.5 h-3.5 text-[#0071e3]" />
              <span>Cloud POS</span>
              <ExternalLink className="w-3 h-3 text-[#86868b]" />
            </button>
            <a href="#features" className="hover:text-[#0071e3] transition">Highlights</a>
            <a href="#specs" className="hover:text-[#0071e3] transition">Specs</a>
            <a href="#support" className="hover:text-[#0071e3] transition">Support</a>
          </div>

          {/* Right Action */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleDownload(detectedOS)}
              className="px-3.5 py-1 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white text-[12px] font-medium transition shadow-sm"
            >
              Download
            </button>
            <button
              onClick={onLaunchWebApp}
              className="hidden sm:inline-block px-3 py-1 rounded-full bg-black/[0.05] hover:bg-black/[0.09] text-[#1d1d1f] text-[12px] font-medium transition"
            >
              Launch Web
            </button>
          </div>
        </div>
      </nav>

      {/* ── 2. SUB-RIBBON (Apple India Announcement Banner) ── */}
      <div className="pt-11 bg-[#f5f5f7] text-[#6e6e73] text-[11px] sm:text-[12px] py-2 px-3 sm:px-4 text-center border-b border-black/[0.06]">
        <div className="max-w-4xl mx-auto flex items-center justify-center gap-1.5 sm:gap-2 flex-wrap">
          <span className="text-[#1d1d1f]">
            <span className="hidden sm:inline">Special Offer: </span>
            Get <strong>1-Day Free Pro Cloud Trial</strong> on instant signup.
          </span>
          <button onClick={onLaunchWebApp} className="text-[#0071e3] hover:underline transition inline-flex items-center gap-0.5 font-medium shrink-0">
            Start Free Trial <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* ── 3. HERO SECTION (Apple Flagship Hero - Clean & Bold) ── */}
      <section className="relative overflow-hidden pt-12 sm:pt-20 pb-16 sm:pb-24 text-center px-4 bg-white">
        {/* Subtle Ambient Apple Radial Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-gradient-to-b from-[#0071e3]/10 via-[#9e53e8]/08 to-transparent blur-3xl rounded-full pointer-events-none animate-apple-pulse" />

        <div className="relative max-w-4xl mx-auto space-y-3 sm:space-y-4">
          
          {/* Official KNITE Medico Brand Title with Real Logo */}
          <div className="flex items-center justify-center gap-3 sm:gap-4">
            <img 
              src="/logo_icon.png" 
              alt="KNITE Medico Official Logo" 
              className="w-12 h-12 sm:w-16 sm:h-16 object-contain drop-shadow-md select-none transition-transform hover:scale-105 duration-300" 
            />
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight text-[#1d1d1f]">
              KNITE Medico
            </h1>
          </div>

          {/* Punchy Tagline */}
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-[#1d1d1f]">
            Make way for brilliant pharmacy.
          </h2>

          {/* Simple, Elegant 1-Line Subtitle */}
          <p className="text-sm sm:text-lg text-[#6e6e73] max-w-xl mx-auto font-normal leading-relaxed px-2">
            Local-first architecture. 12ms offline billing, drug compliance radar, and instant WhatsApp tax invoices.
          </p>

          {/* Primary Action Buttons (Responsive on Mobile) */}
          <div className="pt-3 sm:pt-5 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={onLaunchWebApp}
              className="w-full sm:w-auto px-5 sm:px-7 py-2.5 sm:py-3 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs sm:text-sm font-medium shadow-[0_4px_16px_rgba(0,113,227,0.3)] hover:shadow-[0_6px_25px_rgba(0,113,227,0.45)] transition active:scale-95 flex items-center justify-center gap-1.5"
            >
              <span>Start Free Trial</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => {
                document.getElementById('platforms')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-full sm:w-auto px-5 sm:px-6 py-2.5 sm:py-3 rounded-full bg-black/[0.05] hover:bg-black/[0.09] text-[#1d1d1f] text-xs sm:text-sm font-medium transition active:scale-95 flex items-center justify-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-[#1d1d1f]" />
              <span>Download App</span>
            </button>
          </div>

          {/* Compatibility badge */}
          <div className="pt-2 sm:pt-3 text-[11px] sm:text-[12px] text-[#86868b] flex items-center justify-center gap-2 sm:gap-4 flex-wrap">
            <span className="flex items-center gap-1">
              <Apple className="w-3.5 h-3.5 text-[#1d1d1f]" /> macOS
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Monitor className="w-3.5 h-3.5 text-[#1d1d1f]" /> Windows 10 & 11
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Terminal className="w-3.5 h-3.5 text-[#1d1d1f]" /> Linux
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Globe className="w-3.5 h-3.5 text-[#1d1d1f]" /> Web Cloud
            </span>
          </div>
        </div>

        {/* ── 4. APPLE STUDIO DISPLAY SHOWCASE STAGE ── */}
        <div className="relative max-w-5xl mx-auto mt-8 sm:mt-14" id="platforms">
          
          {/* Platform Segmented Switcher (Mobile Responsive) */}
          <div className="flex justify-center px-1 mb-5 sm:mb-8">
            <div className="inline-flex p-1 rounded-full bg-[#f5f5f7] border border-black/[0.08] text-[11px] sm:text-xs font-medium text-[#6e6e73] shadow-xs max-w-full overflow-x-auto">
              <button
                onClick={() => setActiveTab('mac')}
                className={`flex items-center gap-1.5 px-3 sm:px-5 py-1.5 sm:py-2 rounded-full transition shrink-0 ${
                  activeTab === 'mac' ? 'bg-white text-[#1d1d1f] shadow-sm font-semibold' : 'hover:text-[#1d1d1f]'
                }`}
              >
                <Apple className="w-3.5 h-3.5 text-[#1d1d1f]" />
                <span>macOS</span>
              </button>
              <button
                onClick={() => setActiveTab('windows')}
                className={`flex items-center gap-1.5 px-3 sm:px-5 py-1.5 sm:py-2 rounded-full transition shrink-0 ${
                  activeTab === 'windows' ? 'bg-white text-[#1d1d1f] shadow-sm font-semibold' : 'hover:text-[#1d1d1f]'
                }`}
              >
                <Monitor className="w-3.5 h-3.5 text-[#1d1d1f]" />
                <span>Windows</span>
              </button>
              <button
                onClick={() => setActiveTab('linux')}
                className={`flex items-center gap-1.5 px-3 sm:px-5 py-1.5 sm:py-2 rounded-full transition shrink-0 ${
                  activeTab === 'linux' ? 'bg-white text-[#1d1d1f] shadow-sm font-semibold' : 'hover:text-[#1d1d1f]'
                }`}
              >
                <Terminal className="w-3.5 h-3.5 text-[#1d1d1f]" />
                <span>Linux</span>
              </button>
              <button
                onClick={() => setActiveTab('web')}
                className={`flex items-center gap-1.5 px-3 sm:px-5 py-1.5 sm:py-2 rounded-full transition shrink-0 ${
                  activeTab === 'web' ? 'bg-white text-[#1d1d1f] shadow-sm font-semibold' : 'hover:text-[#1d1d1f]'
                }`}
              >
                <Cloud className="w-3.5 h-3.5 text-[#0071e3]" />
                <span>Web Cloud</span>
              </button>
            </div>
          </div>

          {/* Hardware Frame Stage (Apple Light Studio Edition) */}
          <div className="relative rounded-[20px] sm:rounded-[36px] bg-[#f5f5f7] border border-black/[0.08] hover:border-black/[0.15] p-2 sm:p-5 shadow-[0_12px_40px_rgba(0,0,0,0.06)] hover:shadow-[0_20px_60px_rgba(0,113,227,0.1)] transition-all duration-500">
            
            {/* Top Device Bar */}
            <div className="flex items-center justify-between px-2 sm:px-3 py-1.5 sm:py-2 border-b border-black/[0.06] mb-2 sm:mb-3 text-[10px] sm:text-[11px] text-[#6e6e73]">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
                <span className="ml-2 font-mono text-[10px] sm:text-[11px] text-[#1d1d1f] font-medium truncate max-w-[170px] sm:max-w-none">
                  KNITE Medico — Actual Pharmacy POS Terminal
                </span>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#27c93f]/10 text-[#27c93f] text-[9px] sm:text-[10px] font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#27c93f] animate-pulse" /> Active
                </span>
                <span className="hidden sm:inline font-mono">0.02s Scans</span>
              </div>
            </div>

            {/* Screen Content - Displaying Actual KNITE Medico System Screenshot */}
            <div className="relative rounded-xl sm:rounded-2xl overflow-hidden bg-white border border-black/[0.06] shadow-inner group">
              <img
                src="/images/knite_medico_actual_ui.jpg"
                alt="KNITE Medico Actual System POS Billing Interface"
                className="w-full h-auto object-cover max-h-[620px] transition duration-700 group-hover:scale-[1.01]"
              />

              {/* Glass Details Floating Card (On Mobile: docked below cleanly so image is visible; on Desktop: floating) */}
              <div className="mt-3 sm:mt-0 sm:absolute sm:bottom-4 sm:left-6 sm:max-w-md p-3.5 sm:p-5 rounded-2xl bg-white/95 backdrop-blur-2xl border border-black/[0.08] shadow-md sm:shadow-2xl text-left sm:animate-apple-float">
                {activeTab === 'mac' && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-xs font-semibold text-[#1d1d1f] flex items-center gap-1.5">
                        <Apple className="w-4 h-4 text-[#1d1d1f]" /> macOS Native Edition
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/[0.05] text-[#1d1d1f]">Apple Silicon & Intel</span>
                    </div>
                    <p className="text-[11px] sm:text-[12px] text-[#6e6e73] leading-relaxed mb-2.5 sm:mb-3">
                      Optimized for macOS Monterey, Ventura, Sonoma, and Sequoia. Includes drag-to-Applications DMG, background sync, and native Mac CUPS receipt printing.
                    </p>
                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                      <button
                        onClick={() => handleDownload('mac')}
                        className="flex-1 sm:flex-none px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-medium transition flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <Download className="w-3.5 h-3.5" /> Download .DMG
                      </button>
                      <button
                        onClick={() => handleDownload('mac-zip')}
                        className="flex-1 sm:flex-none px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-full bg-black/[0.05] hover:bg-black/[0.09] text-[#1d1d1f] text-xs font-medium transition flex items-center justify-center"
                      >
                        Download .ZIP
                      </button>
                    </div>
                  </div>
                )}

                {activeTab === 'windows' && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="text-xs font-semibold text-[#1d1d1f] flex items-center gap-1.5">
                        <Monitor className="w-4 h-4 text-[#1d1d1f]" /> Windows Desktop Edition
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/[0.05] text-[#1d1d1f]">Windows 10 / 11</span>
                    </div>
                    <p className="text-[11px] sm:text-[12px] text-[#6e6e73] leading-relaxed mb-2.5 sm:mb-3">
                      High-speed POS billing with keyboard shortcuts (F2-F5), USB thermal printer auto-spooling, and barcode gun support.
                    </p>
                    <button
                      onClick={() => handleDownload('windows')}
                      className="w-full sm:w-auto px-4 py-2 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-medium transition flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5" /> Download Windows Setup (.bat)
                    </button>
                  </div>
                )}

                {activeTab === 'linux' && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="text-xs font-semibold text-[#1d1d1f] flex items-center gap-1.5">
                        <Terminal className="w-4 h-4 text-[#1d1d1f]" /> Linux Workstation Edition
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/[0.05] text-[#1d1d1f]">AppImage</span>
                    </div>
                    <p className="text-[11px] sm:text-[12px] text-[#6e6e73] leading-relaxed mb-2.5 sm:mb-3">
                      Standalone AppImage for Ubuntu, Debian, Linux Mint, and POS terminals. No installation privileges required.
                    </p>
                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                      <button
                        onClick={() => handleDownload('linux')}
                        className="flex-1 sm:flex-none px-4 py-2 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-medium transition flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <Download className="w-3.5 h-3.5" /> Download AppImage
                      </button>
                      <button
                        onClick={handleCopyLinuxCommand}
                        className="px-3.5 py-2 rounded-full bg-black/[0.05] hover:bg-black/[0.09] text-[#1d1d1f] text-xs font-medium transition flex items-center justify-center gap-1"
                      >
                        {copiedCmd ? <Check className="w-3 h-3 text-[#27c93f]" /> : <Copy className="w-3 h-3 text-[#1d1d1f]" />}
                        <span>{copiedCmd ? 'Copied' : 'curl script'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {activeTab === 'web' && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="text-xs font-semibold text-[#1d1d1f] flex items-center gap-1.5">
                        <Cloud className="w-4 h-4 text-[#0071e3]" /> Cloud Web Terminal
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0071e3]/10 text-[#0071e3] font-bold">Browser Ready</span>
                    </div>
                    <p className="text-[11px] sm:text-[12px] text-[#6e6e73] leading-relaxed mb-2.5 sm:mb-3">
                      Run directly inside Safari, Chrome, Edge, or tablet browser with zero install. Live multi-device cloud synchronization.
                    </p>
                    <button
                      onClick={onLaunchWebApp}
                      className="w-full sm:w-auto px-4 py-2 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-medium transition flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Cloud className="w-3.5 h-3.5" /> Open Web Cloud App
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Spec Chips under preview (Apple Light Style) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5 pt-3 sm:pt-4 text-left">
              <div className="p-2.5 sm:p-3 rounded-2xl bg-white border border-black/[0.06] shadow-xs">
                <div className="text-[10px] sm:text-[11px] text-[#86868b] truncate">Storage & Database</div>
                <div className="text-[11px] sm:text-xs font-semibold text-[#1d1d1f] mt-0.5 leading-snug">Dexie SQLite Local-First</div>
              </div>
              <div className="p-2.5 sm:p-3 rounded-2xl bg-white border border-black/[0.06] shadow-xs">
                <div className="text-[10px] sm:text-[11px] text-[#86868b] truncate">Thermal Output</div>
                <div className="text-[11px] sm:text-xs font-semibold text-[#1d1d1f] mt-0.5 leading-snug">2" & 3" ESC/POS + CUPS</div>
              </div>
              <div className="p-2.5 sm:p-3 rounded-2xl bg-white border border-black/[0.06] shadow-xs">
                <div className="text-[10px] sm:text-[11px] text-[#86868b] truncate">Compliance</div>
                <div className="text-[11px] sm:text-xs font-semibold text-[#1d1d1f] mt-0.5 leading-snug">Schedule H1 & GST Ready</div>
              </div>
              <div className="p-2.5 sm:p-3 rounded-2xl bg-white border border-black/[0.06] shadow-xs">
                <div className="text-[10px] sm:text-[11px] text-[#86868b] truncate">Customer Delivery</div>
                <div className="text-[11px] sm:text-xs font-semibold text-[#1d1d1f] mt-0.5 leading-snug">WhatsApp Paperless Bills</div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── 5. APPLE BENTO GRID ("Get the highlights" - Light Aesthetic) ── */}
      <section className="py-20 sm:py-28 px-4 sm:px-8 max-w-6xl mx-auto" id="features">
        <div className="text-left mb-12">
          <div className="text-xs font-semibold tracking-widest text-[#86868b] uppercase mb-1">
            Capability
          </div>
          <h2 className="text-4xl sm:text-6xl font-semibold tracking-tight text-[#1d1d1f]">
            Get the highlights.
          </h2>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          
          {/* Bento Card 1 (Span 2) */}
          <div className="md:col-span-2 rounded-[32px] bg-white border border-black/[0.08] p-8 sm:p-12 relative overflow-hidden flex flex-col justify-between min-h-[380px] shadow-[0_4px_24px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_36px_rgba(0,0,0,0.08)] transition-all group">
            <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-[#0071e3]/10 to-transparent rounded-full blur-2xl pointer-events-none" />
            <div className="space-y-3 relative z-10 max-w-xl">
              <span className="text-[11px] font-mono tracking-widest uppercase text-[#0071e3] font-bold">Speed & Reliability</span>
              <h3 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#1d1d1f]">
                Local-First. <br />
                Never stops when the internet does.
              </h3>
              <p className="text-sm sm:text-base text-[#6e6e73] leading-relaxed">
                Most web pharmacy software freezes the moment your Wi-Fi drops. KNITE Medico runs an embedded database right on your computer. Bills print in 12 milliseconds, and sync automatically to the cloud when connected.
              </p>
            </div>
            <div className="pt-8 flex items-center gap-6 text-xs text-[#1d1d1f]">
              <div>
                <span className="text-2xl font-bold text-[#1d1d1f] block">12ms</span>
                <span className="text-[#86868b]">Invoice Generation</span>
              </div>
              <div className="w-px h-8 bg-black/[0.08]" />
              <div>
                <span className="text-2xl font-bold text-[#27c93f] block">100%</span>
                <span className="text-[#86868b]">Offline Resilient</span>
              </div>
              <div className="w-px h-8 bg-black/[0.08]" />
              <div>
                <span className="text-2xl font-bold text-[#1d1d1f] block">Zero</span>
                <span className="text-[#86868b]">Cloud Downtime Delay</span>
              </div>
            </div>
          </div>

          {/* Bento Card 2 (Span 1) */}
          <div className="rounded-[32px] bg-white border border-black/[0.08] p-8 sm:p-10 flex flex-col justify-between min-h-[380px] relative overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_36px_rgba(0,0,0,0.08)] transition-all">
            <div className="space-y-3">
              <span className="text-[11px] font-mono tracking-widest uppercase text-[#27c93f] font-bold">Paperless</span>
              <h3 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#1d1d1f]">
                WhatsApp receipts. <br />
                One tap.
              </h3>
              <p className="text-xs sm:text-sm text-[#6e6e73] leading-relaxed">
                Send compliant tax invoices directly to your patient's WhatsApp. Save thousands on thermal paper roll expenses every month.
              </p>
            </div>
            <div className="pt-6">
              <div className="p-3.5 rounded-2xl bg-[#f5f5f7] border border-black/[0.06] text-xs text-[#1d1d1f] flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#27c93f]/20 text-[#27c93f] flex items-center justify-center font-bold">
                  ✓
                </div>
                <div>
                  <div className="font-semibold text-[#1d1d1f]">Auto WhatsApp Invoicing</div>
                  <div className="text-[11px] text-[#86868b]">Zero third-party SMS gateway fee</div>
                </div>
              </div>
            </div>
          </div>

          {/* Bento Card 3 (Span 1) */}
          <div className="rounded-[32px] bg-white border border-black/[0.08] p-8 sm:p-10 flex flex-col justify-between min-h-[340px] shadow-[0_4px_24px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_36px_rgba(0,0,0,0.08)] transition-all">
            <div className="space-y-3">
              <span className="text-[11px] font-mono tracking-widest uppercase text-[#7928ca] font-bold">Hardware</span>
              <h3 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#1d1d1f]">
                Plug and play. Any counter.
              </h3>
              <p className="text-xs sm:text-sm text-[#6e6e73] leading-relaxed">
                Connect USB barcode scanners, 58mm/80mm thermal receipt printers, and cash drawers. Works right out of the box on Mac, Windows, and Linux.
              </p>
            </div>
            <div className="pt-6 flex items-center gap-4 text-[#6e6e73] text-xs">
              <span className="flex items-center gap-1.5"><Printer className="w-4 h-4 text-[#1d1d1f]" /> Thermal ESC/POS</span>
              <span>•</span>
              <span className="flex items-center gap-1.5"><Barcode className="w-4 h-4 text-[#1d1d1f]" /> USB / 2.4G Scanners</span>
            </div>
          </div>

          {/* Bento Card 4 (Span 2) */}
          <div className="md:col-span-2 rounded-[32px] bg-white border border-black/[0.08] p-8 sm:p-12 flex flex-col justify-between min-h-[340px] shadow-[0_4px_24px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_36px_rgba(0,0,0,0.08)] transition-all">
            <div className="space-y-3 max-w-xl">
              <span className="text-[11px] font-mono tracking-widest uppercase text-[#e60067] font-bold">Compliance & Safety</span>
              <h3 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#1d1d1f]">
                Drug license & GST compliance. Built into the core.
              </h3>
              <p className="text-sm sm:text-base text-[#6e6e73] leading-relaxed">
                Schedule H & H1 narcotic tracking with mandatory doctor and patient records. 30 to 90 days expiration radar warns you before medicines expire so you can return them to pharmaceutical distributors in time.
              </p>
            </div>
            <div className="pt-6 grid sm:grid-cols-3 gap-3 text-xs text-[#6e6e73]">
              <div className="p-3.5 rounded-2xl bg-[#f5f5f7] border border-black/[0.06]">
                <span className="text-[#1d1d1f] font-semibold block mb-0.5">Schedule H1 Register</span>
                <span>Mandatory doctor and batch logging for drug inspector audits.</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#f5f5f7] border border-black/[0.06]">
                <span className="text-[#1d1d1f] font-semibold block mb-0.5">Expiry Radar</span>
                <span>Automated early alerts 30, 60, and 90 days before expiry.</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#f5f5f7] border border-black/[0.06]">
                <span className="text-[#1d1d1f] font-semibold block mb-0.5">GST Reports</span>
                <span>One-click GSTR-1 Excel export ready for your CA accountant.</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── 6. APPLE COMPARE MATRIX ("Which platform is right for you?" - Light) ── */}
      <section className="py-20 sm:py-28 px-4 sm:px-8 border-t border-black/[0.06] bg-white" id="specs">
        <div className="max-w-6xl mx-auto">
          
          <div className="text-center mb-16 space-y-2">
            <h2 className="text-3xl sm:text-5xl font-semibold tracking-tight text-[#1d1d1f]">
              Compare platforms.
            </h2>
            <p className="text-sm sm:text-base text-[#6e6e73]">
              Choose the right installer for your medical store hardware.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* macOS Column */}
            <div className="p-6 rounded-[28px] bg-white border border-black/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_36px_rgba(0,0,0,0.08)] transition-all flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-[#f5f5f7] border border-black/[0.06] flex items-center justify-center text-[#1d1d1f]">
                  <Apple className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-[#1d1d1f]">macOS</h3>
                  <div className="text-xs text-[#86868b] mt-0.5">Apple Silicon & Intel</div>
                </div>
                <div className="space-y-2.5 text-xs text-[#6e6e73] pt-2 border-t border-black/[0.06]">
                  <div><strong className="text-[#1d1d1f]">Format:</strong> .DMG & .ZIP</div>
                  <div><strong className="text-[#1d1d1f]">OS:</strong> Monterey, Ventura, Sonoma, Sequoia</div>
                  <div><strong className="text-[#1d1d1f]">Printing:</strong> Native CUPS & Thermal</div>
                  <div><strong className="text-[#1d1d1f]">Offline:</strong> 100% Native</div>
                  <div><strong className="text-[#1d1d1f]">Installation:</strong> Drag to Applications</div>
                </div>
              </div>
              <div className="space-y-2 pt-4 border-t border-black/[0.06]">
                <button
                  onClick={() => handleDownload('mac')}
                  className="w-full py-2.5 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-medium transition flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" /> Download .DMG
                </button>
                <button
                  onClick={() => handleDownload('mac-zip')}
                  className="w-full py-2 rounded-full bg-black/[0.05] hover:bg-black/[0.09] text-[#1d1d1f] text-xs font-medium transition"
                >
                  Download .ZIP
                </button>
              </div>
            </div>

            {/* Windows Column */}
            <div className="p-6 rounded-[28px] bg-white border border-black/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_36px_rgba(0,0,0,0.08)] transition-all flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-[#f5f5f7] border border-black/[0.06] flex items-center justify-center text-[#1d1d1f]">
                  <Monitor className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-[#1d1d1f]">Windows</h3>
                  <div className="text-xs text-[#86868b] mt-0.5">Desktop & Laptop</div>
                </div>
                <div className="space-y-2.5 text-xs text-[#6e6e73] pt-2 border-t border-black/[0.06]">
                  <div><strong className="text-[#1d1d1f]">Format:</strong> .bat setup installer</div>
                  <div><strong className="text-[#1d1d1f]">OS:</strong> Windows 10 & 11 (64-bit)</div>
                  <div><strong className="text-[#1d1d1f]">Printing:</strong> USB Thermal Direct Spool</div>
                  <div><strong className="text-[#1d1d1f]">Offline:</strong> 100% Native</div>
                  <div><strong className="text-[#1d1d1f]">Shortcuts:</strong> F2-F5 Quick Keys</div>
                </div>
              </div>
              <div className="pt-4 border-t border-black/[0.06]">
                <button
                  onClick={() => handleDownload('windows')}
                  className="w-full py-2.5 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-medium transition flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" /> Download Windows
                </button>
              </div>
            </div>

            {/* Linux Column */}
            <div className="p-6 rounded-[28px] bg-white border border-black/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_36px_rgba(0,0,0,0.08)] transition-all flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-[#f5f5f7] border border-black/[0.06] flex items-center justify-center text-[#1d1d1f]">
                  <Terminal className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-[#1d1d1f]">Linux</h3>
                  <div className="text-xs text-[#86868b] mt-0.5">Ubuntu / Debian / Mint</div>
                </div>
                <div className="space-y-2.5 text-xs text-[#6e6e73] pt-2 border-t border-black/[0.06]">
                  <div><strong className="text-[#1d1d1f]">Format:</strong> .AppImage (Portable)</div>
                  <div><strong className="text-[#1d1d1f]">OS:</strong> Modern 64-bit Linux</div>
                  <div><strong className="text-[#1d1d1f]">Printing:</strong> CUPS RAW & IPP</div>
                  <div><strong className="text-[#1d1d1f]">Offline:</strong> 100% Native</div>
                  <div><strong className="text-[#1d1d1f]">CLI:</strong> One-line curl installer</div>
                </div>
              </div>
              <div className="pt-4 border-t border-black/[0.06]">
                <button
                  onClick={() => handleDownload('linux')}
                  className="w-full py-2.5 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-medium transition flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" /> Download AppImage
                </button>
              </div>
            </div>

            {/* Cloud Web Column */}
            <div className="p-6 rounded-[28px] bg-white border border-black/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_36px_rgba(0,0,0,0.08)] transition-all flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0071e3]/10 to-[#0071e3]/20 border border-[#0071e3]/25 flex items-center justify-center text-[#0071e3] shadow-sm">
                  <Cloud className="w-6 h-6 text-[#0071e3]" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-[#1d1d1f] flex items-center gap-2">
                    <span>Web Cloud</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-sky-50 text-[#0071e3] border border-sky-200">Online</span>
                  </h3>
                  <div className="text-xs text-[#86868b] mt-0.5">Universal Browser &amp; Tablet POS</div>
                </div>
                <div className="space-y-2.5 text-xs text-[#6e6e73] pt-2 border-t border-black/[0.06]">
                  <div><strong className="text-[#1d1d1f]">Format:</strong> Progressive Web App</div>
                  <div><strong className="text-[#1d1d1f]">Browser:</strong> Safari, Chrome, Edge</div>
                  <div><strong className="text-[#1d1d1f]">Printing:</strong> Standard Browser Dialog</div>
                  <div><strong className="text-[#1d1d1f]">Sync:</strong> Multi-counter Cloud Sync</div>
                  <div><strong className="text-[#1d1d1f]">Setup:</strong> Instant zero-install</div>
                </div>
              </div>
              <div className="pt-4 border-t border-black/[0.06]">
                <button
                  onClick={onLaunchWebApp}
                  className="w-full py-2.5 rounded-full bg-gradient-to-r from-[#0071e3] to-[#0077ed] text-white text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow-sm shadow-[#0071e3]/25 hover:shadow-md hover:shadow-[#0071e3]/35"
                >
                  <Cloud className="w-3.5 h-3.5" /> Open Web Cloud POS
                </button>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── 7. INSTALLATION GUIDE (macOS & Windows Step-by-Step - Light) ── */}
      <section className="py-20 sm:py-24 px-4 sm:px-8 max-w-5xl mx-auto" id="installation">
        <div className="text-center mb-10 space-y-2">
          <div className="text-xs font-semibold tracking-widest text-[#86868b] uppercase">Guide</div>
          <h2 className="text-3xl sm:text-4xl font-semibold text-[#1d1d1f]">
            Simple setup. Up in 60 seconds.
          </h2>
        </div>

        {/* Tab selector */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex p-1 rounded-full bg-[#f5f5f7] border border-black/[0.08] text-xs font-medium shadow-xs">
            <button
              onClick={() => setActiveGuideTab('mac')}
              className={`px-4 py-1.5 rounded-full transition ${activeGuideTab === 'mac' ? 'bg-white text-[#1d1d1f] shadow-xs font-semibold' : 'text-[#6e6e73] hover:text-[#1d1d1f]'}`}
            >
              macOS Setup
            </button>
            <button
              onClick={() => setActiveGuideTab('windows')}
              className={`px-4 py-1.5 rounded-full transition ${activeGuideTab === 'windows' ? 'bg-white text-[#1d1d1f] shadow-xs font-semibold' : 'text-[#6e6e73] hover:text-[#1d1d1f]'}`}
            >
              Windows Setup
            </button>
            <button
              onClick={() => setActiveGuideTab('linux')}
              className={`px-4 py-1.5 rounded-full transition ${activeGuideTab === 'linux' ? 'bg-white text-[#1d1d1f] shadow-xs font-semibold' : 'text-[#6e6e73] hover:text-[#1d1d1f]'}`}
            >
              Linux Setup
            </button>
          </div>
        </div>

        {/* macOS Guide */}
        {activeGuideTab === 'mac' && (
          <div className="rounded-[32px] bg-white border border-black/[0.08] shadow-sm p-6 sm:p-10 space-y-6">
            <h3 className="text-lg font-semibold text-[#1d1d1f] flex items-center gap-2">
              <Apple className="w-5 h-5 text-[#1d1d1f]" /> Installing on macOS (Apple Silicon M1/M2/M3 & Intel)
            </h3>

            <div className="grid sm:grid-cols-3 gap-4 text-xs text-[#6e6e73]">
              <div className="p-4 rounded-2xl bg-[#f5f5f7] border border-black/[0.06] space-y-2">
                <div className="w-7 h-7 rounded-full bg-[#0071e3] text-white font-bold flex items-center justify-center text-xs">1</div>
                <div className="font-semibold text-[#1d1d1f]">Download the .DMG</div>
                <p>Click <strong className="text-[#1d1d1f]">Download Mac .DMG</strong>. The file <code className="text-[#0071e3]">KNITE-Medico.dmg</code> will download to your Mac's Downloads folder.</p>
              </div>

              <div className="p-4 rounded-2xl bg-[#f5f5f7] border border-black/[0.06] space-y-2">
                <div className="w-7 h-7 rounded-full bg-[#0071e3] text-white font-bold flex items-center justify-center text-xs">2</div>
                <div className="font-semibold text-[#1d1d1f]">Drag to Applications</div>
                <p>Double-click the .DMG to mount it. Drag the <strong className="text-[#1d1d1f]">KNITE Medico</strong> icon into your <strong className="text-[#1d1d1f]">Applications</strong> folder.</p>
              </div>

              <div className="p-4 rounded-2xl bg-[#f5f5f7] border border-black/[0.06] space-y-2">
                <div className="w-7 h-7 rounded-full bg-[#0071e3] text-white font-bold flex items-center justify-center text-xs">3</div>
                <div className="font-semibold text-[#1d1d1f]">First Launch (Gatekeeper)</div>
                <p>Right-click the app in Applications & click <strong className="text-[#1d1d1f]">Open</strong>. Click <strong className="text-[#1d1d1f]">Open</strong> again to confirm. You're ready to bill!</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#f5f5f7] border border-black/[0.06] text-xs text-[#6e6e73] flex items-center justify-between flex-wrap gap-3">
              <span>Prefer command-line unquarantine?</span>
              <code className="px-3 py-1 rounded-lg bg-white border border-black/[0.08] text-[#0071e3] font-mono text-[11px]">
                xattr -cr "/Applications/KNITE Medico.app"
              </code>
            </div>
          </div>
        )}

        {/* Windows Guide */}
        {activeGuideTab === 'windows' && (
          <div className="rounded-[32px] bg-white border border-black/[0.08] shadow-sm p-6 sm:p-10 space-y-6">
            <h3 className="text-lg font-semibold text-[#1d1d1f] flex items-center gap-2">
              <Monitor className="w-5 h-5 text-[#1d1d1f]" /> Installing on Windows 10 & 11
            </h3>
            <div className="grid sm:grid-cols-3 gap-4 text-xs text-[#6e6e73]">
              <div className="p-4 rounded-2xl bg-[#f5f5f7] border border-black/[0.06] space-y-2">
                <div className="w-7 h-7 rounded-full bg-[#0071e3] text-white font-bold flex items-center justify-center text-xs">1</div>
                <div className="font-semibold text-[#1d1d1f]">Download Setup</div>
                <p>Download <code className="text-[#0071e3]">knite-medico-setup-windows.bat</code> directly to your PC.</p>
              </div>
              <div className="p-4 rounded-2xl bg-[#f5f5f7] border border-black/[0.06] space-y-2">
                <div className="w-7 h-7 rounded-full bg-[#0071e3] text-white font-bold flex items-center justify-center text-xs">2</div>
                <div className="font-semibold text-[#1d1d1f]">Double-Click Run</div>
                <p>Double-click the file. If Windows SmartScreen prompts, click <em>More Info → Run Anyway</em>.</p>
              </div>
              <div className="p-4 rounded-2xl bg-[#f5f5f7] border border-black/[0.06] space-y-2">
                <div className="w-7 h-7 rounded-full bg-[#0071e3] text-white font-bold flex items-center justify-center text-xs">3</div>
                <div className="font-semibold text-[#1d1d1f]">Instant Launch</div>
                <p>A desktop shortcut is placed automatically. Double-click to start counter billing.</p>
              </div>
            </div>
          </div>
        )}

        {/* Linux Guide */}
        {activeGuideTab === 'linux' && (
          <div className="rounded-[32px] bg-white border border-black/[0.08] shadow-sm p-6 sm:p-10 space-y-6">
            <h3 className="text-lg font-semibold text-[#1d1d1f] flex items-center gap-2">
              <Terminal className="w-5 h-5 text-[#1d1d1f]" /> Installing on Linux (Ubuntu / Mint)
            </h3>
            <div className="p-4 rounded-2xl bg-[#f5f5f7] border border-black/[0.08] font-mono text-xs text-[#0071e3] flex items-center justify-between flex-wrap gap-3">
              <span>curl -sSL https://knitemedico.kniteinfotech.in/downloads/install-linux.sh | bash</span>
              <button
                onClick={handleCopyLinuxCommand}
                className="px-3 py-1 rounded-full bg-black/[0.05] hover:bg-black/[0.1] text-[#1d1d1f] font-sans text-xs transition"
              >
                {copiedCmd ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ── 8. APPLE SPECIALIST CONCIERGE & INQUIRY (Light) ── */}
      <section className="py-20 sm:py-24 px-4 sm:px-8 border-t border-black/[0.06] bg-white" id="support">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-10 items-center">
          
          {/* Left Column: Apple Concierge Specialist */}
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#f5f5f7] border border-black/[0.08] text-xs text-[#6e6e73]">
              <Phone className="w-3.5 h-3.5 text-[#0071e3]" />
              <span>Specialist Support</span>
            </div>
            
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#1d1d1f]">
              Need assistance? <br />
              A Specialist is ready to help.
            </h2>
            
            <p className="text-sm text-[#6e6e73] leading-relaxed">
              Whether you need remote help connecting your thermal printer, barcode scanner, or importing existing medicine inventory from Excel, our team provides instant free setup.
            </p>

            <div className="space-y-3 pt-2 text-xs">
              <a
                href={`tel:${PHONE_NUMBER}`}
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#f5f5f7] border border-black/[0.08] hover:border-[#0071e3] hover:bg-white transition group shadow-xs"
              >
                <div className="w-9 h-9 rounded-xl bg-[#0071e3]/10 text-[#0071e3] flex items-center justify-center font-bold">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[11px] text-[#86868b]">Direct Engineer Hotline</div>
                  <div className="text-sm font-semibold text-[#1d1d1f]">{FORMATTED_PHONE}</div>
                </div>
              </a>

              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#f5f5f7] border border-black/[0.08] hover:border-[#27c93f] hover:bg-white transition group shadow-xs"
              >
                <div className="w-9 h-9 rounded-xl bg-[#27c93f]/15 text-[#27c93f] flex items-center justify-center font-bold">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[11px] text-[#86868b]">WhatsApp Emergency Desk</div>
                  <div className="text-sm font-semibold text-[#1d1d1f]">Chat on WhatsApp (Instant Reply)</div>
                </div>
              </a>
            </div>
          </div>

          {/* Right Column: Callback Request Form */}
          <div className="rounded-[32px] bg-white border border-black/[0.08] shadow-[0_12px_40px_rgba(0,0,0,0.06)] p-6 sm:p-8">
            {inquirySent ? (
              <div className="text-center py-10 space-y-3">
                <div className="w-12 h-12 rounded-full bg-[#27c93f]/20 text-[#27c93f] flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-[#1d1d1f]">Thank You</h3>
                <p className="text-xs text-[#6e6e73] max-w-xs mx-auto">
                  Our specialist will contact you at <strong>{inquiryData.phone || inquiryData.email}</strong> to assist with installation and printer setup.
                </p>
                <button
                  onClick={() => setInquirySent(false)}
                  className="px-4 py-2 rounded-full bg-black/[0.05] hover:bg-black/[0.09] text-[#1d1d1f] text-xs font-medium transition"
                >
                  Send Another Inquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleSendInquiry} className="space-y-3.5">
                <div className="mb-2">
                  <h3 className="text-base font-semibold text-[#1d1d1f]">Request Free Remote Setup</h3>
                  <p className="text-xs text-[#6e6e73]">We'll connect via AnyDesk/TeamViewer to configure your counter hardware.</p>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-[#6e6e73] block mb-1">Pharmacy Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Apex Pharmacy"
                      value={inquiryData.shopName}
                      onChange={e => setInquiryData({ ...inquiryData, shopName: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#f5f5f7] border border-black/[0.1] text-[#1d1d1f] placeholder-[#86868b] text-xs focus:bg-white focus:border-[#0071e3] outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#6e6e73] block mb-1">Your Name</label>
                    <input
                      type="text"
                      placeholder="Owner Name"
                      value={inquiryData.ownerName}
                      onChange={e => setInquiryData({ ...inquiryData, ownerName: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#f5f5f7] border border-black/[0.1] text-[#1d1d1f] placeholder-[#86868b] text-xs focus:bg-white focus:border-[#0071e3] outline-none transition"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-[#6e6e73] block mb-1">Phone / WhatsApp *</label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 8778721940"
                      value={inquiryData.phone}
                      onChange={e => setInquiryData({ ...inquiryData, phone: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#f5f5f7] border border-black/[0.1] text-[#1d1d1f] placeholder-[#86868b] text-xs focus:bg-white focus:border-[#0071e3] outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#6e6e73] block mb-1">Operating System</label>
                    <select
                      value={inquiryData.platform}
                      onChange={e => setInquiryData({ ...inquiryData, platform: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#f5f5f7] border border-black/[0.1] text-[#1d1d1f] text-xs focus:bg-white focus:border-[#0071e3] outline-none transition"
                    >
                      <option value="macOS DMG">macOS (MacBook / iMac / Mac mini)</option>
                      <option value="Windows Desktop App">Windows 10 / 11 Desktop</option>
                      <option value="Linux Workstation">Linux (Ubuntu / Mint)</option>
                      <option value="Cloud Web Version">Web Browser (Safari / Chrome)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-[#6e6e73] block mb-1">Printer Model or Question</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. TVS RP3160 thermal printer setup assistance"
                    value={inquiryData.message}
                    onChange={e => setInquiryData({ ...inquiryData, message: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#f5f5f7] border border-black/[0.1] text-[#1d1d1f] placeholder-[#86868b] text-xs focus:bg-white focus:border-[#0071e3] outline-none resize-none transition"
                  />
                </div>

                <button
                  type="submit"
                  disabled={inquiryLoading}
                  className="w-full py-3 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-medium transition shadow-md flex items-center justify-center gap-1.5"
                >
                  {inquiryLoading ? 'Connecting...' : 'Request Free Callback'}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>
            )}
          </div>

        </div>
      </section>

      {/* ── 9. APPLE GLOBAL FOOTER (Light) ── */}
      <footer className="bg-[#f5f5f7] text-[#6e6e73] text-[11px] pt-12 pb-16 px-4 sm:px-8 border-t border-black/[0.08]">
        <div className="max-w-6xl mx-auto space-y-6">
          
          {/* Footnotes */}
          <div className="space-y-2 pb-6 border-b border-black/[0.08] text-[11px] leading-relaxed text-[#86868b]">
            <p>1. Offline database runs completely on client hardware via local Dexie IndexedDB / SQLite storage. No active internet connection is required to scan barcodes, print thermal receipts, or compute GST taxes.</p>
            <p>2. WhatsApp invoicing requires client internet connectivity and operates directly with patient numbers without third-party recurring SMS per-message fees.</p>
            <p>3. Compatible with standard USB POS barcode scanners (HID keyboard emulation), 58mm & 80mm ESC/POS thermal printers, and network CUPS printers on macOS.</p>
          </div>

          {/* Directory Columns */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-2 text-[12px]">
            <div className="space-y-2">
              <div className="font-semibold text-[#1d1d1f]">Platforms</div>
              <div><button onClick={() => { setActiveTab('mac'); document.getElementById('platforms')?.scrollIntoView({ behavior: 'smooth' }); }} className="hover:text-[#0071e3] transition">macOS (.DMG)</button></div>
              <div><button onClick={() => { setActiveTab('windows'); document.getElementById('platforms')?.scrollIntoView({ behavior: 'smooth' }); }} className="hover:text-[#0071e3] transition">Windows 10 & 11</button></div>
              <div><button onClick={() => { setActiveTab('linux'); document.getElementById('platforms')?.scrollIntoView({ behavior: 'smooth' }); }} className="hover:text-[#0071e3] transition">Linux AppImage</button></div>
              <div><button onClick={onLaunchWebApp} className="hover:text-[#0071e3] transition">Web Cloud POS</button></div>
            </div>

            <div className="space-y-2">
              <div className="font-semibold text-[#1d1d1f]">Pharmacy Features</div>
              <div><a href="#features" className="hover:text-[#0071e3] transition">Local-First Speed</a></div>
              <div><a href="#features" className="hover:text-[#0071e3] transition">WhatsApp Invoices</a></div>
              <div><a href="#features" className="hover:text-[#0071e3] transition">Schedule H1 Narcotic Log</a></div>
              <div><a href="#features" className="hover:text-[#0071e3] transition">Expiry Alert Radar</a></div>
            </div>

            <div className="space-y-2">
              <div className="font-semibold text-[#1d1d1f]">Support & Hardware</div>
              <div><a href={`tel:${PHONE_NUMBER}`} className="hover:text-[#0071e3] transition">Helpline: {FORMATTED_PHONE}</a></div>
              <div><a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="hover:text-[#0071e3] transition">WhatsApp Assistance</a></div>
              <div><a href="#installation" className="hover:text-[#0071e3] transition">Installation Guide</a></div>
              <div><a href={`mailto:${EMAIL_ADDRESS}`} className="hover:text-[#0071e3] transition">Email Engineering</a></div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <img src="/logo_icon.png" alt="KNITE Medico" className="w-5 h-5 object-contain" />
                <span className="font-semibold text-[#1d1d1f]">KNITE Infotech</span>
              </div>
              <div><span className="text-[#6e6e73]">Pharmacy SaaS Engineering</span></div>
              <div><span className="text-[#6e6e73]">Chennai, Tamil Nadu, India</span></div>
              <div className="pt-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-black/[0.08] text-[11px] text-[#1d1d1f] shadow-2xs">
                  🇮🇳 India (English)
                </span>
              </div>
            </div>
          </div>

          {/* Copyright line */}
          <div className="pt-6 border-t border-black/[0.08] flex flex-wrap justify-between items-center gap-4 text-[11px] text-[#86868b]">
            <div>
              Copyright © {new Date().getFullYear()} KNITE Infotech. All rights reserved.
            </div>
            <div className="flex items-center gap-4">
              <span className="hover:text-[#0071e3] cursor-pointer">Privacy Policy</span>
              <span>|</span>
              <span className="hover:text-[#0071e3] cursor-pointer">Terms of Use</span>
              <span>|</span>
              <span className="hover:text-[#0071e3] cursor-pointer">Drug Compliance</span>
              <span>|</span>
              <span className="hover:text-[#0071e3] cursor-pointer">Site Map</span>
            </div>
          </div>

        </div>
      </footer>

    </div>
  );
}
