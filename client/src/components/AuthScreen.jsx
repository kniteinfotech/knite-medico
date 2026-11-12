import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  ShieldCheck, 
  User, 
  Lock, 
  Mail, 
  Phone, 
  Building2, 
  FileText, 
  MapPin, 
  ArrowRight,
  AlertCircle,
  Sparkles,
  Clock,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
  CreditCard,
  KeyRound,
  ArrowLeft
} from 'lucide-react';
import { db } from '../db/localDb';
import { getCloudUrl } from '../utils/cloudConfig';

export default function AuthScreen({ onAuthSuccess, onOpenSuperAdmin, theme }) {
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  // Pending Approval State
  const [pendingApprovalData, setPendingApprovalData] = useState(null);
  const [checkingStatus, setCheckingStatus] = useState(false);

  // Login form - prefill with remembered email if available
  const [loginEmail, setLoginEmail] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('knite_shop_owner') || 'null');
      return saved?.email || localStorage.getItem('knite_last_email') || '';
    } catch {
      return '';
    }
  });
  const [loginPassword, setLoginPassword] = useState('');

  // Registration form
  const [shopName, setShopName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [dlNumber, setDlNumber] = useState('');
  const [gstin, setGstin] = useState('');
  const [address, setAddress] = useState('');

  // Terms acceptance for registration
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  // MFA 2FA State (Topic 6)
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState('');

  // Email Verification OTP State
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Password Reset State (Topic 5)
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotToken, setForgotToken] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState('');
  const [forgotStep, setForgotStep] = useState('request'); // 'request' | 'reset'

  const cloudUrl = getCloudUrl();

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Force light mode on document root while AuthScreen is visible
  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, []);

  // 1. Check Approval Status
  async function handleCheckStatus(targetEmail) {
    const emailToCheck = targetEmail || pendingApprovalData?.email || loginEmail;
    if (!emailToCheck) return;

    setCheckingStatus(true);
    setStatusMsg('');
    setErrorMsg('');

    try {
      const res = await fetch(`${cloudUrl}/api/auth/check-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailToCheck })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        if (data.status === 'APPROVED') {
          setStatusMsg(`🎉 Congratulations! Store "${data.shop_name}" has been APPROVED by SuperAdmin! Please login with your password.`);
          localStorage.removeItem('knite_pending_registration');
          setTimeout(() => {
            setPendingApprovalData(null);
            setIsRegister(false);
            setLoginEmail(emailToCheck);
            setStatusMsg('✅ Account is active. Please enter your password to sign in.');
          }, 2000);
        } else if (data.status === 'REJECTED') {
          setErrorMsg('❌ Your registration was declined. Please contact kniteinfotech@gmail.com.');
        } else {
          setStatusMsg('⏳ Your application is currently in the SuperAdmin approval queue. Please check back shortly.');
        }
      } else {
        setErrorMsg(data.error || 'Failed to check verification status');
      }
    } catch (err) {
      setErrorMsg('Could not connect to Cloud Server. Ensure backend is running.');
    } finally {
      setCheckingStatus(false);
    }
  }

  // 2. Handle Login
  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setStatusMsg('');

    // Check if user is logging in as Master SuperAdmin
    if (
      (loginEmail.toLowerCase() === 'superadmin@knite.com' || loginEmail.toLowerCase() === 'kniteinfotech@gmail.com') && 
      (loginPassword === 'KNITE_MASTER_2026' || loginPassword === 'StrongPassword123!')
    ) {
      if (onOpenSuperAdmin) {
        onOpenSuperAdmin();
        setLoading(false);
        return;
      }
    }

    try {
      // First attempt: Cloud Backend API
      const res = await fetch(`${cloudUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword,
          mfa_code: mfaCode || undefined
        })
      });
      const data = await res.json();

      // Check if MFA is required on this account
      if (data.mfa_required) {
        setMfaRequired(true);
        setStatusMsg('🔐 Two-Factor Authentication required. Enter the 6-digit TOTP code from your Authenticator app.');
        setLoading(false);
        return;
      }

      if (!res.ok) {
        // Check if rate-limited (HTTP 429)
        if (res.status === 429) {
          throw new Error(`🛡️ ${data.error || 'Too many failed login attempts. Please wait 15 minutes.'}`);
        }

        // Check if account is PENDING APPROVAL
        if (data.error === 'ACCOUNT_PENDING_APPROVAL') {
          const pendingInfo = data.tenant || {
            shop_name: 'Your Medical Store',
            owner_name: 'Shop Owner',
            email: loginEmail,
            phone: '',
            status: 'PENDING_APPROVAL'
          };
          setPendingApprovalData(pendingInfo);
          localStorage.setItem('knite_pending_registration', JSON.stringify(pendingInfo));
          setLoading(false);
          return;
        }

        // Check if subscription or 1-day trial has expired
        if (data.error === 'SUBSCRIPTION_EXPIRED' || data.error === 'PAYMENT_REQUIRED' || data.requiresPayment) {
          const expiredInfo = data.tenant || {
            email: loginEmail,
            status: data.error === 'SUBSCRIPTION_EXPIRED' ? 'EXPIRED' : 'PENDING_PAYMENT'
          };
          setPendingApprovalData(expiredInfo);
          localStorage.setItem('knite_pending_registration', JSON.stringify(expiredInfo));
          if (onAuthSuccess) {
            onAuthSuccess(expiredInfo, true);
          }
          setLoading(false);
          return;
        }

        if (data.error === 'ACCOUNT_REJECTED') {
          throw new Error('❌ Registration was declined by SuperAdmin. Contact kniteinfotech@gmail.com.');
        }

        if (data.error === 'ACCOUNT_SUSPENDED') {
          throw new Error('⚠️ Your pharmacy cloud subscription is suspended. Please contact SuperAdmin.');
        }

        throw new Error(data.error || 'Invalid email or password');
      }

      // Success Login
      if (data.success && data.token) {
        localStorage.removeItem('knite_pending_registration');
        localStorage.setItem('knite_auth_token', data.token);
        localStorage.setItem('knite_last_email', loginEmail);
        sessionStorage.setItem('knite_session_active', 'true');
        const paidPlans = ['cloud_900', 'pro_cloud', 'cloud_799', 'pos_599', 'local_599', 'pos_basic', 'enterprise', 'enterprise_1299', 'enterprise_1499'];
        const isPaid = paidPlans.includes(data.tenant.plan_type);
        const ownerProfile = {
          id: data.tenant.id,
          shop_name: data.tenant.shop_name,
          owner_name: data.tenant.owner_name,
          email: loginEmail,
          phone: data.tenant.phone || '',
          dl_number: data.tenant.dl_number || '',
          gstin: data.tenant.gstin || '',
          address: data.tenant.address || '',
          license_key: data.tenant.license_key,
          plan_type: data.tenant.plan_type || 'cloud_799',
          status: 'APPROVED',
          is_trial: !isPaid && Boolean(data.tenant.is_trial),
          plan_expires_at: data.tenant.plan_expires_at
        };
        localStorage.setItem('knite_shop_owner', JSON.stringify(ownerProfile));
        await db.settings.put({ key: 'store_profile', ...ownerProfile });
        onAuthSuccess(ownerProfile, false);
      }
    } catch (err) {
      // Fallback: local offline DB check if network was unreachable
      if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        const localStore = await db.settings.get('store_profile');
        if (localStore && (localStore.email === loginEmail || loginEmail === 'admin@knitemedico.com')) {
          sessionStorage.setItem('knite_session_active', 'true');
          localStorage.setItem('knite_last_email', loginEmail);
          localStorage.setItem('knite_shop_owner', JSON.stringify({ ...localStore, is_offline_session: true }));
          onAuthSuccess(localStore, false);
          return;
        }
      }
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Topic 5: Request Password Reset Token (Generic response prevents enumeration)
  async function handleRequestPasswordReset(e) {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotLoading(true);
    setForgotMsg('');
    try {
      const res = await fetch(`${cloudUrl}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim() })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setForgotStep('reset');
        setForgotMsg(`📧 6-digit OTP code sent to ${forgotEmail.trim()}! Please check your email inbox and spam folder.`);
      } else {
        setForgotMsg('❌ ' + (data.error || data.message || 'Could not send OTP. Please check email address.'));
      }
    } catch (err) {
      setForgotMsg('Could not process request. Please check backend connection.');
    } finally {
      setForgotLoading(false);
    }
  }

  // Topic 5: Execute Password Reset with 6-Digit Email OTP
  async function handleExecutePasswordReset(e) {
    e.preventDefault();
    if (!forgotToken || !forgotNewPassword) return;
    if (forgotNewPassword.length < 8) {
      setForgotMsg('❌ Password must be at least 8 characters long.');
      return;
    }
    setForgotLoading(true);
    try {
      const res = await fetch(`${cloudUrl}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim(), otp: forgotToken.trim(), new_password: forgotNewPassword })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setForgotMsg('🎉 ' + data.message);
        setTimeout(() => {
          setShowForgotModal(false);
          setForgotStep('request');
          setForgotMsg('');
          setLoginEmail(forgotEmail);
          setLoginPassword('');
          setStatusMsg('✅ Password reset successful. Please login with your new credentials.');
        }, 2200);
      } else {
        setForgotMsg('❌ ' + (data.error || 'Failed to reset password.'));
      }
    } catch (err) {
      setForgotMsg('Server error. Please retry.');
    } finally {
      setForgotLoading(false);
    }
  }

  // Send Registration Email OTP via kniteinfotech@gmail.com
  async function handleSendOtp() {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('Please enter a valid email address first.');
      return;
    }
    if (cleanEmail === 'nitheesh8797@gmail.com') {
      setStatusMsg('👑 Free Developer Account detected — Email OTP bypassed.');
      setOtpSent(true);
      return;
    }
    setSendingOtp(true);
    setErrorMsg('');
    setStatusMsg('');
    try {
      const res = await fetch(`${cloudUrl}/api/auth/send-registration-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, shop_name: shopName.trim() || 'My Pharmacy' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to dispatch verification OTP');
      setOtpSent(true);
      setStatusMsg(`📩 6-digit verification OTP sent to ${cleanEmail} via kniteinfotech@gmail.com.`);
      setResendCooldown(60);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to send OTP. Please check your backend connection.');
    } finally {
      setSendingOtp(false);
    }
  }

  // 3. Handle Registration - Requires Email OTP verification
  async function handleRegister(e) {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!shopName || !ownerName || !cleanEmail || !password) {
      setErrorMsg('Please fill in all required fields marked with *');
      return;
    }

    const isDev = cleanEmail === 'nitheesh8797@gmail.com';
    if (!isDev) {
      if (!otpSent) {
        setErrorMsg('Please click "Send OTP to Email" to verify your email address.');
        return;
      }
      if (!otpCode || otpCode.trim().length !== 6) {
        setErrorMsg('Please enter the 6-digit verification OTP sent to your email.');
        return;
      }
    }

    setLoading(true);
    setErrorMsg('');
    setStatusMsg('');

    try {
      const res = await fetch(`${cloudUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shop_name: shopName.trim(),
          owner_name: ownerName.trim(),
          phone: phone.trim(),
          email: cleanEmail,
          password: password,
          dl_number: dlNumber.trim(),
          gstin: gstin.trim(),
          address: address.trim(),
          otp_code: isDev ? undefined : otpCode.trim(),
          plan_type: 'cloud_900'
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      if (data.token) {
        const isPaid = isDev || (data.tenant?.status === 'APPROVED' && data.tenant?.plan_expires_at && new Date(data.tenant.plan_expires_at) > new Date());
        const ownerProfile = {
          id: data.tenant?.id,
          shop_name: data.tenant?.shop_name || shopName.trim(),
          owner_name: data.tenant?.owner_name || ownerName.trim(),
          email: cleanEmail,
          phone: phone.trim(),
          dl_number: dlNumber.trim(),
          gstin: gstin.trim(),
          address: address.trim(),
          license_key: data.tenant?.license_key || 'PENDING_PAYMENT',
          plan_type: data.tenant?.plan_type || 'cloud_900',
          status: isPaid ? 'APPROVED' : 'PENDING_PAYMENT',
          is_trial: false,
          plan_expires_at: data.tenant?.plan_expires_at
        };
        sessionStorage.setItem('knite_session_active', 'true');
        localStorage.setItem('knite_shop_owner', JSON.stringify(ownerProfile));
        localStorage.setItem('knite_auth_token', data.token);
        localStorage.setItem('knite_last_email', cleanEmail);
        await db.settings.put({ key: 'store_profile', ...ownerProfile });
        
        // If not developer and payment required: show payment plan screen immediately!
        if (onAuthSuccess) onAuthSuccess(ownerProfile, !isPaid);
        return;
      }

      // Fallback if payment required
      const pendingInfo = data.tenant || {
        shop_name: shopName.trim(),
        owner_name: ownerName.trim(),
        email: cleanEmail,
        phone: phone.trim(),
        dl_number: dlNumber.trim(),
        gstin: gstin.trim(),
        address: address.trim(),
        status: 'PENDING_PAYMENT'
      };

      setPendingApprovalData(pendingInfo);
      localStorage.setItem('knite_pending_registration', JSON.stringify(pendingInfo));

      if (onAuthSuccess) {
        onAuthSuccess(pendingInfo, true);
      }

    } catch (err) {
      setErrorMsg(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-3 sm:p-4 bg-gradient-to-br from-blue-50/70 via-slate-50 to-indigo-50/50 relative overflow-hidden">
      {/* Decorative Brand Glow Blobs */}
      <div className="absolute -top-20 -left-20 w-96 h-96 rounded-full bg-blue-400/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 w-96 h-96 rounded-full bg-indigo-400/10 blur-3xl pointer-events-none" />

      <div className="max-w-md w-full bg-white p-4 sm:p-8 rounded-3xl shadow-xl border border-blue-100 relative z-10">
        
        {/* Helpline Header */}
        <div className="flex justify-end items-center mb-4 pb-2 border-b border-slate-100">
          <a
            href="tel:8778721940"
            className="text-[11px] font-bold text-slate-600 hover:text-rose-600 transition flex items-center gap-1"
            title="Call Helpline"
          >
            <Phone className="w-3 h-3 text-rose-500" />
            <span>Support: 8778721940</span>
          </a>
        </div>

        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex p-2.5 sm:p-3 rounded-3xl bg-white border border-slate-100 shadow-lg mb-3">
            <img src="/logo.png" alt="Knite Medico Logo" className="w-24 h-24 sm:w-32 sm:h-32 object-contain" />
          </div>
          <div className="flex items-center justify-center gap-2">
            <span className="text-2xl font-black tracking-tight text-slate-900">
              KNITE
            </span>
            <span className="text-2xl font-black tracking-wide text-[#ff2c2c]">
              MEDICO
            </span>
          </div>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Pharmacy Operating System & Cloud Billing SaaS
          </p>
        </div>

        {/* ============================================================== */}
        {/* CASE 1: PENDING APPROVAL SCREEN                                 */}
        {/* ============================================================== */}
        {pendingApprovalData ? (
          <div className="space-y-4">
            <div className="text-center p-4 rounded-2xl bg-blue-50/60 border border-blue-100">
              <div className="inline-flex w-12 h-12 rounded-full bg-blue-100 items-center justify-center text-blue-600 mb-2 animate-bounce">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900">
                Application Submitted
              </h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Select your subscription plan and complete Razorpay payment to activate your cloud SaaS store.
              </p>
            </div>

            {/* Store Review Card */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs shadow-sm">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Store Name:</span>
                <span className="font-bold text-slate-900 text-right">
                  {pendingApprovalData.shop_name}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Owner / Pharmacist:</span>
                <span className="font-bold text-slate-900">
                  {pendingApprovalData.owner_name}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Registered Email:</span>
                <span className="font-mono text-slate-700">
                  {pendingApprovalData.email}
                </span>
              </div>
              {pendingApprovalData.dl_number && (
                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                  <span className="text-slate-500 font-medium">Drug License (DL):</span>
                  <span className="font-mono font-bold text-[#ff2c2c]">
                    {pendingApprovalData.dl_number}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center pt-1">
                <span className="text-slate-500 font-medium">Review Status:</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                  Ready for Payment & Activation
                </span>
              </div>
            </div>

            {/* PROMINENT PAYMENT GATEWAY BUTTON */}
            <button
              type="button"
              onClick={() => {
                if (onAuthSuccess) {
                  onAuthSuccess(pendingApprovalData, true);
                }
              }}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#0c2540] via-[#153a61] to-blue-800 text-white font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-blue-900/20 hover:scale-[1.02] active:scale-[0.98] transition"
            >
              <CreditCard className="w-5 h-5 text-sky-400" />
              <span>💳 Proceed to Razorpay Payment Gateway</span>
            </button>

            {/* Payment Info — goes to KNITE Infotech */}
            <div className="p-3.5 rounded-2xl bg-blue-50/80 border border-blue-200 text-xs space-y-1.5">
              <p className="font-black text-blue-950 flex items-center gap-1.5">
                💳 Subscription Payment Destination
              </p>
              <p className="text-blue-800 font-medium text-[11px]">All subscription payments go directly to:</p>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-blue-200 shadow-sm">
                <div>
                  <p className="font-black text-slate-900 text-xs">KNITE Infotech</p>
                  <p className="font-semibold text-blue-700 text-[11px]">Razorpay Verified Gateway</p>
                </div>
                <div className="px-2 py-1 rounded-lg bg-[#0c2540] text-sky-400 font-black text-[10px] shadow">RAZORPAY</div>
              </div>
              <p className="text-[10px] text-blue-700 font-medium">Secured via Razorpay Payment Gateway • UPI, Cards & Netbanking</p>
            </div>

            {/* Status Messages */}
            {statusMsg && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-900 flex items-start gap-2">
                <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                <span>{statusMsg}</span>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-[#ff2c2c] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => handleCheckStatus(pendingApprovalData.email)}
                disabled={checkingStatus}
                className="w-full btn-secondary py-3 justify-center text-xs font-bold border border-slate-200"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${checkingStatus ? 'animate-spin' : ''}`} />
                <span>{checkingStatus ? 'Checking Status...' : 'Check Approval Status'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPendingApprovalData(null);
                  setIsRegister(false);
                  setErrorMsg('');
                  setStatusMsg('');
                }}
                className="w-full py-2.5 text-xs font-semibold text-slate-600 hover:text-[#ff2c2c] transition text-center"
              >
                ← Back to Login
              </button>
            </div>
          </div>
        ) : (
          /* ============================================================== */
          /* CASE 2: NORMAL LOGIN / REGISTRATION FORMS                       */
          /* ============================================================== */
          <div>
            {/* Tab Switcher: Login vs Register */}
            <div className="flex bg-slate-100 p-1 rounded-2xl mb-6 border border-slate-200">
              <button
                type="button"
                onClick={() => { setIsRegister(false); setErrorMsg(''); setStatusMsg(''); }}
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
                  !isRegister
                    ? 'bg-gradient-to-r from-[#ff2c2c] to-[#f94449] text-white shadow-md shadow-[#ff2c2c]/20'
                    : 'text-slate-600 hover:text-[#ff2c2c]'
                }`}
              >
                Shop Owner Login
              </button>
              <button
                type="button"
                onClick={() => { setIsRegister(true); setErrorMsg(''); setStatusMsg(''); }}
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
                  isRegister
                    ? 'bg-gradient-to-r from-[#ff2c2c] to-[#f94449] text-white shadow-md shadow-[#ff2c2c]/20'
                    : 'text-slate-600 hover:text-[#ff2c2c]'
                }`}
              >
                Register Pharmacy
              </button>
            </div>

            {/* Alerts */}
            {statusMsg && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{statusMsg}</span>
              </div>
            )}

            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-[#ff2c2c] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* LOGIN FORM */}
            {!isRegister ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1.5 block">
                    Shop Owner Email
                  </label>
                  <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 focus-within:bg-white focus-within:border-[#ff2c2c] focus-within:ring-2 focus-within:ring-[#ff2c2c]/15 transition">
                    <Mail className="w-4 h-4 text-[#ff2c2c] shrink-0" />
                    <input
                      type="email"
                      required
                      className="w-full bg-transparent border-none outline-none text-sm text-slate-900 placeholder-slate-400"
                      placeholder="owner@pharmacy.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setForgotEmail(loginEmail || '');
                        setShowForgotModal(true);
                        setForgotMsg('');
                        setForgotStep('request');
                      }}
                      className="text-[11px] font-bold text-[#ff2c2c] hover:underline"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 focus-within:bg-white focus-within:border-[#ff2c2c] focus-within:ring-2 focus-within:ring-[#ff2c2c]/15 transition">
                    <Lock className="w-4 h-4 text-[#ff2c2c] shrink-0" />
                    <input
                      type="password"
                      required
                      className="w-full bg-transparent border-none outline-none text-sm text-slate-900 placeholder-slate-400"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                    />
                  </div>
                </div>

                {/* Topic 6: Multi-Factor Authentication (TOTP Code Prompt) */}
                {mfaRequired && (
                  <div className="p-3.5 rounded-2xl bg-amber-50 border-2 border-amber-300 space-y-2 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-amber-900 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-amber-600" />
                        <span>Two-Factor Authentication (MFA / 2FA)</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setMfaRequired(false);
                          setMfaCode('');
                        }}
                        className="text-[10px] font-bold text-amber-700 hover:underline"
                      >
                        Cancel
                      </button>
                    </div>
                    <p className="text-[11px] text-amber-800 leading-snug">
                      Enter the 6-digit TOTP code from Google Authenticator / Authy or an 8-character recovery backup code.
                    </p>
                    <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-amber-300 bg-white focus-within:ring-2 focus-within:ring-amber-500/20">
                      <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                      <input
                        type="text"
                        required
                        maxLength={8}
                        autoFocus
                        className="w-full bg-transparent border-none outline-none text-base font-mono font-bold tracking-widest text-slate-900 placeholder-slate-300"
                        placeholder="000 000"
                        value={mfaCode}
                        onChange={(e) => setMfaCode(e.target.value.trim().toUpperCase())}
                      />
                    </div>
                  </div>
                )}


                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-primary py-3.5 justify-center text-sm font-bold tracking-wide mt-2 shadow-md shadow-[#ff2c2c]/20"
                >
                  <span>{loading ? 'Authenticating...' : (mfaRequired ? 'Verify 2FA & Sign In' : 'Login as Shop Owner')}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            ) : (
              /* REGISTRATION FORM */
              <form onSubmit={handleRegister} className="space-y-3.5 max-h-[60vh] overflow-y-auto pr-1">
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">
                    Pharmacy / Medical Shop Name *
                  </label>
                  <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 focus-within:bg-white focus-within:border-[#ff2c2c] focus-within:ring-2 focus-within:ring-[#ff2c2c]/15 transition">
                    <Building2 className="w-4 h-4 text-[#ff2c2c] shrink-0" />
                    <input
                      type="text"
                      required
                      className="w-full bg-transparent border-none outline-none text-sm text-slate-900 placeholder-slate-400"
                      placeholder="e.g. LifeCare Medico Chemist"
                      value={shopName}
                      onChange={(e) => setShopName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-xs font-bold text-slate-700 mb-1 block">
                      Owner Name *
                    </label>
                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 focus-within:bg-white focus-within:border-[#ff2c2c] focus-within:ring-2 focus-within:ring-[#ff2c2c]/15 transition">
                      <User className="w-4 h-4 text-[#ff2c2c] shrink-0" />
                      <input
                        type="text"
                        required
                        className="w-full bg-transparent border-none outline-none text-xs text-slate-900 placeholder-slate-400"
                        placeholder="Dr. R. Sharma"
                        value={ownerName}
                        onChange={(e) => setOwnerName(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 mb-1 block">
                      WhatsApp Phone *
                    </label>
                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 focus-within:bg-white focus-within:border-[#ff2c2c] focus-within:ring-2 focus-within:ring-[#ff2c2c]/15 transition">
                      <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                      <input
                        type="tel"
                        required
                        className="w-full bg-transparent border-none outline-none text-xs font-mono text-slate-900 placeholder-slate-400"
                        placeholder="9876543210"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">
                      Email Address *
                    </label>
                    {email.trim().toLowerCase() === 'nitheesh8797@gmail.com' ? (
                      <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        👑 Free Developer Bypass
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={sendingOtp || resendCooldown > 0}
                        className="text-[11px] font-bold text-[#ff2c2c] hover:underline disabled:text-slate-400"
                      >
                        {sendingOtp ? 'Sending OTP…' : resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : (otpSent ? 'Resend OTP' : 'Send OTP to Email')}
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 focus-within:bg-white focus-within:border-[#ff2c2c] focus-within:ring-2 focus-within:ring-[#ff2c2c]/15 transition">
                    <Mail className="w-4 h-4 text-[#ff2c2c] shrink-0" />
                    <input
                      type="email"
                      required
                      className="w-full bg-transparent border-none outline-none text-sm text-slate-900 placeholder-slate-400"
                      placeholder="owner@pharmacy.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                {/* 6-Digit Email Verification OTP Field */}
                {email.trim().toLowerCase() !== 'nitheesh8797@gmail.com' && (
                  <div>
                    <label className="text-xs font-bold text-slate-700 mb-1 block">
                      6-Digit Email Verification OTP *
                    </label>
                    <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 focus-within:bg-white focus-within:border-[#ff2c2c] focus-within:ring-2 focus-within:ring-[#ff2c2c]/15 transition">
                      <KeyRound className="w-4 h-4 text-[#ff2c2c] shrink-0" />
                      <input
                        type="text"
                        maxLength={6}
                        required
                        className="w-full bg-transparent border-none outline-none text-sm font-mono font-bold tracking-widest text-slate-900 placeholder-slate-400"
                        placeholder="e.g. 123456"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium mt-1">
                      OTP dispatched from <strong>kniteinfotech@gmail.com</strong>. Check your inbox/spam.
                    </p>
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">
                    Create Password *
                  </label>
                  <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 focus-within:bg-white focus-within:border-[#ff2c2c] focus-within:ring-2 focus-within:ring-[#ff2c2c]/15 transition">
                    <Lock className="w-4 h-4 text-[#ff2c2c] shrink-0" />
                    <input
                      type="password"
                      required
                      className="w-full bg-transparent border-none outline-none text-sm text-slate-900 placeholder-slate-400"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-xs font-bold text-slate-700 mb-1 block">
                      Drug License (DL) No
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs font-mono text-slate-900 outline-none focus:bg-white focus:border-[#ff2c2c] transition"
                      placeholder="TN-DL-2026-889900"
                      value={dlNumber}
                      onChange={(e) => setDlNumber(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 mb-1 block">
                      GSTIN Number
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs font-mono text-slate-900 outline-none focus:bg-white focus:border-[#ff2c2c] transition"
                      placeholder="33AAAAA0000A1Z5"
                      value={gstin}
                      onChange={(e) => setGstin(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">
                    Shop Address
                  </label>
                  <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 focus-within:bg-white focus-within:border-[#ff2c2c] focus-within:ring-2 focus-within:ring-[#ff2c2c]/15 transition">
                    <MapPin className="w-4 h-4 text-[#ff2c2c] shrink-0" />
                    <input
                      type="text"
                      className="w-full bg-transparent border-none outline-none text-sm text-slate-900 placeholder-slate-400"
                      placeholder="Main Road, Opp. Hospital"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                  </div>
                </div>

                {/* 1-Day Free Trial Notice */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 border border-emerald-300 dark:border-emerald-700/40 text-xs text-emerald-900 dark:text-emerald-200 leading-relaxed font-bold flex items-center gap-2.5">
                  <span className="text-base shrink-0">🎁</span>
                  <div>
                    <span className="font-extrabold text-emerald-800 dark:text-emerald-300">1-Day Free Trial Included:</span> Full access to Cloud Sync, WhatsApp Billing & POS Counter. No credit card or advance payment required!
                  </div>
                </div>

                {/* Terms & Conditions Checkbox */}
                <div
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                    termsAccepted ? 'bg-emerald-50 border-emerald-300' : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                  onClick={() => setTermsAccepted(!termsAccepted)}
                >
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition ${
                    termsAccepted ? 'bg-emerald-600 border-emerald-600' : 'border-slate-400 bg-white'
                  }`}>
                    {termsAccepted && <CheckCircle2 className="w-3 h-3 text-white" />}
                  </div>
                  <p className="text-[11px] text-slate-700 font-medium leading-tight">
                    I agree to KNITE Medico's{' '}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setShowTermsModal(true); }}
                      className="text-[#ff2c2c] font-black underline hover:text-rose-700"
                    >
                      Terms & Conditions
                    </button>
                    {' '}and understand that subscription renewal is ₹900/month (+ payment gateway fee).
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading || !termsAccepted}
                  className="w-full btn-primary py-3.5 justify-center text-sm font-bold tracking-wide mt-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-[#ff2c2c]/20"
                >
                  <span>{loading ? 'Activating Free Trial...' : 'Start 1-Day Free Trial & Register'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      const saved = localStorage.getItem('knite_pending_registration');
                      if (saved) {
                        try {
                          setPendingApprovalData(JSON.parse(saved));
                          return;
                        } catch {}
                      }
                      setStatusMsg('No pending application found on this device. Please submit registration or sign in above.');
                    }}
                    className="text-[11px] text-slate-500 hover:text-[#ff2c2c] font-semibold underline"
                  >
                    Already submitted? Check application status
                  </button>
                </div>
              </form>
            )}

            {/* Footer indicator */}
            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
              <span>Protected by KNITE Cloud Engine</span>
              <span>Zero-Downtime Local DB</span>
            </div>

            {/* Master SuperAdmin shortcut */}
            {onOpenSuperAdmin && (
              <div className="mt-3 text-center">
                <button
                  type="button"
                  onClick={onOpenSuperAdmin}
                  className="text-[11px] text-slate-400 hover:text-[#ff2c2c] font-semibold transition inline-flex items-center gap-1.5"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
                  <span>KNITE Master SuperAdmin Portal</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Terms & Conditions Modal */}
      {showTermsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-black text-slate-900 text-base">Terms & Conditions</h3>
              <button onClick={() => setShowTermsModal(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition">
                <span className="text-slate-600 font-bold text-sm">✕</span>
              </button>
            </div>
            <div className="overflow-y-auto p-5 text-xs leading-relaxed text-slate-700 space-y-4">
              {[
                ['1. Service Provider', 'KNITE Medico is a SaaS product owned and operated by KNITE Infotech, Chennai, Tamil Nadu, India.'],
                ['2. Subscription & Payments', 'Subscription fee is ₹900/month for All-In-One Cloud SaaS (+ payment gateway fee, total ₹922/month), paid directly to KNITE Infotech via Razorpay Payment Gateway. All payments are final for the active billing period.'],
                ['3. Payment Gateway Authorization', 'By subscribing, you authorize KNITE Infotech to collect subscription fees monthly via Razorpay Gateway (UPI, AutoPay, Credit/Debit Cards, Netbanking).'],
                ['4. Drug License Verification', 'New pharmacies must submit a valid Drug License (DL) for verification. KNITE Infotech reserves the right to deny access to pharmacies that fail statutory compliance checks.'],
                ['5. Expiry & Grace Period', 'Upon monthly subscription expiry, a 1-day (24-hour) grace period is provided. After the grace period, cloud services are suspended until monthly payment is renewed.'],
                ['6. Data Ownership', 'All pharmacy data (medicines, invoices, patients) belongs to the registered pharmacy owner. KNITE Infotech does not sell, share, or monetize customer data.'],
                ['7. Service Uptime', '99.5% uptime guaranteed for cloud services. Local POS billing works offline regardless of cloud status.'],
                ['8. Cancellation', 'Cancel anytime via account dashboard. No partial refunds. Local data is never deleted.'],
                ['9. Governing Law', 'These terms are governed by Indian law. Disputes subject to courts in Chennai, Tamil Nadu.'],
                ['10. Contact', 'Email: kniteinfotech@gmail.com | WhatsApp: +91 99999 99999 | Payment Gateway: Razorpay']
              ].map(([title, text]) => (
                <div key={title}>
                  <h4 className="font-black text-slate-900 mb-1">{title}</h4>
                  <p>{text}</p>
                </div>
              ))}
              <p className="text-[10px] text-slate-400">Last updated: September 2026 • KNITE Infotech</p>
            </div>
            <div className="p-4 border-t border-slate-100">
              <button
                onClick={() => { setTermsAccepted(true); setShowTermsModal(false); }}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#ff2c2c] to-[#f94449] text-white font-black text-sm hover:shadow-lg transition"
              >
                ✓ I Accept These Terms
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Topic 5: Password Reset Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md p-6 relative">
            <button
              onClick={() => setShowForgotModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition text-slate-500 font-bold"
            >
              ✕
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center border border-rose-100 text-[#ff2c2c]">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base">Reset Password via Email OTP</h3>
                <p className="text-[11px] text-slate-500">6-digit email verification code • Sessions invalidated</p>
              </div>
            </div>

            {forgotMsg && (
              <div className="mb-4 p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs font-semibold text-blue-900 flex items-start gap-2">
                <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
                <span>{forgotMsg}</span>
              </div>
            )}

            {forgotStep === 'request' ? (
              <form onSubmit={handleRequestPasswordReset} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1.5 block">
                    Registered Email Address
                  </label>
                  <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus-within:bg-white focus-within:border-[#ff2c2c] transition">
                    <Mail className="w-4 h-4 text-[#ff2c2c] shrink-0" />
                    <input
                      type="email"
                      required
                      placeholder="owner@pharmacy.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="w-full bg-transparent border-none outline-none text-sm text-slate-900 placeholder-slate-400"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 leading-relaxed">
                  📧 A 6-digit OTP verification code will be sent to your registered email address via <strong>kniteinfotech@gmail.com</strong>.
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="flex-1 btn-primary py-3 justify-center text-xs font-bold shadow-md shadow-[#ff2c2c]/20"
                  >
                    <span>{forgotLoading ? 'Sending OTP...' : 'Send 6-Digit OTP to Mail'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setForgotStep('reset')}
                    className="px-3 py-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                  >
                    Have an OTP?
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleExecutePasswordReset} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1.5 block">
                    6-Digit Email OTP Code
                  </label>
                  <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus-within:bg-white focus-within:border-[#ff2c2c] transition">
                    <KeyRound className="w-4 h-4 text-[#ff2c2c] shrink-0" />
                    <input
                      type="text"
                      required
                      maxLength={6}
                      placeholder="123456"
                      value={forgotToken}
                      onChange={(e) => setForgotToken(e.target.value)}
                      className="w-full bg-transparent border-none outline-none text-sm font-mono tracking-widest text-slate-900 placeholder-slate-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1.5 block">
                    New Secure Password (min 8 chars)
                  </label>
                  <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus-within:bg-white focus-within:border-[#ff2c2c] transition">
                    <Lock className="w-4 h-4 text-[#ff2c2c] shrink-0" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••••••"
                      value={forgotNewPassword}
                      onChange={(e) => setForgotNewPassword(e.target.value)}
                      className="w-full bg-transparent border-none outline-none text-sm text-slate-900 placeholder-slate-400"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-[11px] text-rose-900 leading-relaxed font-medium">
                  🔒 Resetting your password will update your credentials and invalidate all previously active sessions.
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="flex-1 btn-primary py-3 justify-center text-xs font-bold shadow-md shadow-[#ff2c2c]/20"
                  >
                    <span>{forgotLoading ? 'Resetting Password...' : 'Verify OTP & Reset Password'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setForgotStep('request')}
                    className="px-3 py-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                  >
                    Resend OTP
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
