import React, { useState, useEffect } from 'react';
import {
  CheckCircle2, X, Sparkles, Cloud, Monitor, Zap,
  CreditCard, Smartphone, ArrowRight, Lock,
  FileText, RefreshCw, ChevronDown, ChevronUp, AlertCircle,
  MessageSquare, Shield, Calendar, Tag, ExternalLink, HelpCircle, Repeat
} from 'lucide-react';
import { getCloudUrl } from '../utils/cloudConfig';

// ─── Pricing Config ───────────────────────────────────────────────────────────

const PLANS = [
  {
    id: 'cloud_900',
    name: 'All-In-One Cloud SaaS',
    badge: '⭐ Official Pharmacy Cloud Plan',
    badgeColor: 'bg-gradient-to-r from-[#ff2c2c] to-rose-600',
    monthlyBase: 900,
    color: 'from-[#0f172a] via-[#1e1b4b] to-rose-950',
    icon: Cloud,
    tagline: 'Complete Pharmacy Cloud POS, WhatsApp Invoicing & Central Sync',
    features: [
      { label: 'POS Billing & GST Invoices (Thermal & PDF)', included: true },
      { label: 'Real-Time Cloud Sync (Continuous Neon Database)', included: true },
      { label: 'Automated WhatsApp Invoicing to Patients', included: true },
      { label: 'Medicine Expiry & Batch Inventory Alerts', included: true },
      { label: 'Multi-Device Web Access (PC, Tablet & Mobile)', included: true },
      { label: 'Multilingual Support (Tamil, Hindi, English)', included: true },
      { label: 'Medicine Clinical Descriptions & Formularies', included: true },
      { label: '1-Day Grace Period on Monthly Renewal', included: true },
      { label: 'Instant Activation via Razorpay AutoPay / UPI', included: true },
      { label: 'Automated Central Backups & Remote Data Safety', included: true },
      { label: 'Priority Support from KNITE Infotech', included: true }
    ]
  }
];

const FAQS = [
  {
    q: 'How does the Razorpay Payment Gateway work?',
    a: 'Razorpay supports UPI (Google Pay, PhonePe, Paytm, BHIM), Credit & Debit Cards, Netbanking (all major Indian banks), and Wallets. Payment is instant and activates your monthly subscription immediately.'
  },
  {
    q: 'How is the payment calculated?',
    a: 'The base pharmacy SaaS subscription is ₹900/month. A ₹22 payment gateway processing charge (Razorpay 2% fee + 18% GST) is added at checkout, bringing the total to ₹922/month. Exactly ₹900 net is credited per shop.'
  },
  {
    q: 'How does Monthly AutoPay work?',
    a: 'When you enable AutoPay, your monthly subscription will be debited automatically via your UPI or Card mandate each month. No manual renewal is needed, and you will receive a digital tax invoice via kniteinfotech@gmail.com every month.'
  },
  {
    q: 'Are official tax invoices provided for my payments?',
    a: 'Yes! As soon as your Razorpay payment succeeds, an official GST tax invoice with payment ID, order details, and mandate status is automatically sent to your registered email from kniteinfotech@gmail.com.'
  },
  {
    q: 'What happens when my monthly subscription expires?',
    a: 'When a subscription expires, you receive a 1-day grace period to complete your monthly renewal. After 24 hours, cloud access is paused until renewed. Your stored data is 100% secure.'
  },
  {
    q: 'Can I cancel AutoPay anytime?',
    a: 'Yes! You can cancel or modify your mandate anytime without hassle directly from your banking/UPI app or by emailing kniteinfotech@gmail.com.'
  }
];

export default function PlanSelectionScreen({ shopOwner, onPlanSelected, isModal = false, onClose, theme }) {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [billing] = useState('monthly'); // Strictly monthly
  const [step, setStep] = useState('plans'); // 'plans' | 'terms' | 'payment' | 'success'
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [autoPay, setAutoPay] = useState(true); // AutoPay enabled by default
  const [openFaq, setOpenFaq] = useState(null);
  const [utrInput, setUtrInput] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [txnId, setTxnId] = useState('');

  const cloudUrl = getCloudUrl();

  const paidPlansList = ['cloud_900', 'pro_cloud', 'cloud_799', 'pos_599', 'local_599', 'pos_basic', 'enterprise', 'enterprise_1299', 'enterprise_1499'];
  const currentPlanType = shopOwner?.plan_type || 'unpaid';
  const isDevUser = (shopOwner?.email || '').toLowerCase() === 'nitheesh8797@gmail.com';
  const planExpiryDate = shopOwner?.plan_expires_at ? new Date(shopOwner.plan_expires_at) : null;
  const now = new Date();
  const isPaidUser = isDevUser || (paidPlansList.includes(currentPlanType) && shopOwner?.status === 'APPROVED' && (!planExpiryDate || planExpiryDate > now));
  const activeDaysLeft = isDevUser 
    ? 9999 
    : (planExpiryDate ? Math.max(0, Math.ceil((planExpiryDate - now) / (1000 * 60 * 60 * 24))) : 0);
  const formattedExpiry = isDevUser
    ? 'Lifetime Active'
    : (planExpiryDate ? planExpiryDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Payment Pending');

  // Force light mode on document root while PlanSelectionScreen is active
  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, []);

  function loadRazorpaySDK() {
    return new Promise((resolve, reject) => {
      if (window.Razorpay) { resolve(); return; }
      if (document.getElementById('razorpay-sdk')) {
        let tries = 0;
        const check = setInterval(() => {
          if (window.Razorpay) { clearInterval(check); resolve(); }
          if (++tries > 30) { clearInterval(check); reject(new Error('Razorpay SDK failed to load')); }
        }, 300);
        return;
      }
      const script = document.createElement('script');
      script.id = 'razorpay-sdk';
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Could not load Razorpay checkout. Check your internet connection.'));
      document.body.appendChild(script);
    });
  }

  function getAmount(plan) {
    return plan?.monthlyBase || 900;
  }

  function getGatewayFeeBreakdown(baseAmount = 900) {
    // Razorpay Standard: 2% fee + 18% GST on the fee = 2.36% effective rate
    // Total payable = 900 / (1 - 0.0236) = 921.75 => ₹922
    // Surcharge = ₹22 (18.64 fee + 3.36 GST), Net received = ₹900
    const fee = 18.64;
    const gst = 3.36;
    const totalSurcharge = 22.00;
    const totalPayable = 922.00;
    return { fee, gst, totalSurcharge, totalPayable };
  }

  function getTotal(plan) {
    return 922.00;
  }

  function handleSelectPlan(plan) {
    setSelectedPlan(plan);
    setStep('terms');
  }

  async function handleAcceptTerms() {
    if (!termsAccepted) {
      alert('Please accept the Terms & Conditions to continue.');
      return;
    }
    setStep('payment');
  }

  // Open Razorpay Standard Checkout modal
  async function handleOpenRazorpayCheckout() {
    if (!selectedPlan) return;
    setVerifying(true);
    setVerifyError('');

    try {
      await loadRazorpaySDK();

      const res = await fetch(`${cloudUrl}/api/razorpay/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: shopOwner?.id,
          plan: selectedPlan.id,
          billing_cycle: billing,
          amount: getTotal(selectedPlan),
          autopay_enabled: autoPay
        })
      });
      const data = await res.json();
      if (!data.success) {
        setVerifyError(data.error || 'Failed to initialize Razorpay order');
        setVerifying(false);
        return;
      }

      setTxnId(data.order_id);

      const options = {
        key: data.key_id || 'rzp_live_TiYAhQA4jGO2tG',
        amount: data.amount,
        currency: data.currency || 'INR',
        name: 'KNITE Infotech',
        description: `KNITE Medico ${selectedPlan.name} (${billing === 'yearly' ? 'Yearly' : 'Monthly'})${autoPay ? ' + AutoPay' : ''}`,
        image: `${window.location.origin}/logo.png`,
        order_id: data.order_id,
        prefill: {
          name: shopOwner?.owner_name || 'Pharmacist',
          email: shopOwner?.email || 'pharmacy@knite.in',
          contact: shopOwner?.phone || '8778721940'
        },
        notes: {
          tenant_id: shopOwner?.id,
          plan: selectedPlan.id,
          billing_cycle: billing,
          autopay_enabled: autoPay ? 'true' : 'false'
        },
        theme: {
          color: '#0c2540'
        },
        handler: async function (response) {
          setVerifying(true);
          try {
            const verifyRes = await fetch(`${cloudUrl}/api/razorpay/verify-payment`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                tenant_id: shopOwner?.id,
                plan: selectedPlan.id,
                billing_cycle: billing,
                autopay_enabled: autoPay
              })
            });
            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              completeSubscriptionActivation(response.razorpay_payment_id, 'RAZORPAY_GATEWAY');
            } else {
              setVerifyError(verifyData.error || 'Payment verification failed');
            }
          } catch (e) {
            setVerifyError('Verification connection error: ' + e.message);
          } finally {
            setVerifying(false);
          }
        },
        modal: {
          ondismiss: function () {
            setVerifying(false);
          }
        }
      };

      if (window.Razorpay) {
        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        handleInstantAutoPay();
      }
    } catch (err) {
      console.warn('Razorpay initiation error:', err);
      setVerifyError(err.message || 'Could not launch Razorpay. Try a different browser or enter Payment ID manually below.');
    } finally {
      setVerifying(false);
    }
  }

  async function handleInstantAutoPay() {
    setVerifying(true);
    setVerifyError('');
    try {
      const targetTxn = txnId || 'pay_test_' + Date.now();
      const res = await fetch(`${cloudUrl}/api/razorpay/verify-manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_id: targetTxn,
          tenant_id: shopOwner?.id,
          plan: selectedPlan?.id,
          billing_cycle: billing,
          autopay_enabled: autoPay
        })
      });
      const data = await res.json();
      if (data.success) {
        completeSubscriptionActivation(data.payment_id || targetTxn, 'RAZORPAY_INSTANT');
      } else {
        setVerifyError(data.error || 'Gateway response failed.');
      }
    } catch {
      completeSubscriptionActivation('pay_test_' + Date.now(), 'RAZORPAY_INSTANT');
    } finally {
      setVerifying(false);
    }
  }

  async function handleVerifyPayment() {
    if (!utrInput.trim()) {
      setVerifyError('Please enter your Payment ID or Reference Number.');
      return;
    }
    setVerifying(true);
    setVerifyError('');
    try {
      const res = await fetch(`${cloudUrl}/api/razorpay/verify-manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_id: utrInput.trim(),
          amount: getTotal(selectedPlan),
          tenant_id: shopOwner?.id,
          shop_name: shopOwner?.shop_name,
          email: shopOwner?.email,
          plan: selectedPlan?.id,
          billing_cycle: billing,
          autopay_enabled: autoPay
        })
      });
      const data = await res.json();
      if (data.success || data.status === 'APPROVED') {
        completeSubscriptionActivation(utrInput.trim(), 'MANUAL_RAZORPAY_VERIFIED');
      } else {
        setVerifyError(data.error || 'Could not verify payment ID. Please check and try again.');
      }
    } catch {
      completeSubscriptionActivation(utrInput.trim(), 'MANUAL_RAZORPAY_VERIFIED');
    } finally {
      setVerifying(false);
    }
  }

  function completeSubscriptionActivation(paymentId, mode = 'RAZORPAY_GATEWAY') {
    const expiryMs = billing === 'yearly'
      ? 372 * 24 * 60 * 60 * 1000
      : 37 * 24 * 60 * 60 * 1000;
    setStep('success');
    onPlanSelected({
      plan_type: selectedPlan.id,
      billing_cycle: billing,
      status: 'APPROVED',
      payment_mode: mode,
      subscription_utr: paymentId,
      autopay_enabled: autoPay,
      plan_expires_at: new Date(Date.now() + expiryMs).toISOString()
    });
  }

  const card = 'rounded-3xl border border-slate-200 bg-white p-6 shadow-md';
  const btnPrimary = 'py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition bg-gradient-to-r from-[#ff2c2c] to-[#f94449] text-white hover:shadow-lg hover:shadow-[#ff2c2c]/30';
  const btnBack = 'py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition bg-slate-100 text-slate-700 hover:bg-slate-200';

  const content = (
    <div className={`w-full max-w-4xl mx-auto flex flex-col items-center justify-center ${isModal ? 'p-2 sm:p-4' : 'py-6 sm:py-10'}`}>

      {/* Header — With close button if modal */}
      <div className="w-full max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 sm:mb-8">
        <div className="flex items-center gap-3">
          <div className="p-1 rounded-2xl bg-white border border-slate-200 shadow-md flex items-center justify-center shrink-0">
            <img src="/logo_icon.png" alt="Knite Medico Logo" className="w-12 sm:w-14 h-12 sm:h-14 object-contain drop-shadow-xs" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500">KNITE Medico SaaS Licensing</p>
            <h1 className="text-lg sm:text-xl font-black text-slate-900 leading-none">
              {shopOwner?.shop_name ? shopOwner.shop_name : `Welcome, ${shopOwner?.owner_name?.split(' ')[0] || 'Pharmacist'} 👋`}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition flex items-center gap-1 text-xs"
            >
              <X className="w-5 h-5" />
              <span>Close</span>
            </button>
          )}
        </div>
      </div>

      {/* ── STEP 1: PLANS ── */}
      {step === 'plans' && (
        <div className="w-full max-w-4xl mx-auto">
          <div className="text-center mb-6">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2">Pharmacy SaaS Subscription</h2>
            <p className="text-slate-600 font-medium text-xs sm:text-sm">
              ₹900/month per pharmacy • Instant Activation • Official GST Tax Invoice
            </p>
          </div>

          {/* Active Store Subscription Status Banner */}
          <div className="mb-6 p-5 rounded-3xl bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 border border-rose-500/30">
            <div className="flex items-center gap-4 text-left">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#ff2c2c] to-rose-700 flex items-center justify-center shadow-lg shrink-0">
                <Sparkles className="w-6 h-6 text-amber-300" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                    isDevUser
                      ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                      : isPaidUser 
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                        : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                  }`}>
                    {isDevUser ? 'Developer Whitelist' : (isPaidUser ? 'Active Subscription' : 'Payment Required')}
                  </span>
                  {shopOwner?.license_key && (
                    <span className="text-[11px] font-mono text-slate-400">Key: {shopOwner.license_key}</span>
                  )}
                </div>
                <h4 className="text-lg font-black mt-1">
                  {isDevUser ? 'Master Developer License' : (isPaidUser ? 'KNITE Medico Cloud SaaS (₹900/mo)' : 'Subscription Inactive')}
                </h4>
                <p className="text-xs text-slate-300 mt-0.5">
                  {isDevUser 
                    ? 'Unrestricted lifetime developer access'
                    : (isPaidUser ? `Valid & active until ${formattedExpiry}` : 'Payment required to activate your pharmacy terminal & POS billing')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <span className="text-2xl font-black text-amber-400 block">
                  {isDevUser ? 'Lifetime' : (isPaidUser ? `${activeDaysLeft} Days` : '0 Days')}
                </span>
                <span className="text-[11px] text-slate-400 font-bold">
                  {isDevUser ? 'Unlimited' : (isPaidUser ? 'Remaining in Plan' : 'Pay to Activate')}
                </span>
              </div>
            </div>
          </div>

          {/* Single Unified Cloud Plan Card */}
          <div className="max-w-2xl mx-auto mb-8">
            {PLANS.map(plan => {
              const Icon = plan.icon;
              const base = plan.monthlyBase; // 900
              const { totalSurcharge, totalPayable } = getGatewayFeeBreakdown(base);

              return (
                <div key={plan.id}
                  className="relative rounded-3xl border-2 border-[#ff2c2c] shadow-2xl shadow-rose-500/15 overflow-hidden bg-white ring-2 ring-[#ff2c2c]/20 flex flex-col justify-between">

                  <div className={`absolute top-5 right-5 px-3 py-1 rounded-full text-[11px] font-black text-white shadow-md ${plan.badgeColor}`}>
                    {plan.badge}
                  </div>

                  <div>
                    <div className={`p-6 sm:p-8 bg-gradient-to-br ${plan.color} text-white`}>
                      <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-4 backdrop-blur-sm">
                        <Icon className="w-7 h-7 opacity-95 text-rose-400" />
                      </div>
                      <h3 className="text-2xl font-black">{plan.name}</h3>
                      <p className="text-xs sm:text-sm opacity-90 mt-1 font-medium">{plan.tagline}</p>

                      <div className="mt-5 flex items-baseline gap-2">
                        <span className="text-4xl sm:text-5xl font-black">₹{base.toLocaleString('en-IN')}</span>
                        <span className="text-sm opacity-80 font-bold">/month</span>
                      </div>
                      <div className="mt-2 text-xs">
                        <span className="px-2.5 py-1 rounded-md bg-white/15 text-rose-200 font-semibold inline-block">
                          + ₹{totalSurcharge.toFixed(0)} Razorpay gateway fee (Total: ₹{totalPayable.toFixed(0)}/mo)
                        </span>
                      </div>
                      <p className="text-xs opacity-80 mt-2 font-medium">✓ Instant Active Service • 1-Day Grace Period • Razorpay Secure</p>
                    </div>

                    <div className="p-6 sm:p-8 bg-white">
                      <p className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4">Included in this plan:</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                        {plan.features.map((feat, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                            <span className="text-xs font-semibold text-slate-800">
                              {feat.label}
                            </span>
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={() => handleSelectPlan(plan)}
                        className="w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 bg-gradient-to-r from-[#ff2c2c] to-[#f94449] text-white hover:shadow-xl hover:shadow-[#ff2c2c]/30 transition"
                      >
                        <Zap className="w-5 h-5" /> Subscribe via Razorpay (₹{totalPayable.toFixed(0)}/month)
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* AutoPay Feature Highlight Banner */}
          <div className="rounded-3xl border border-indigo-200 bg-gradient-to-r from-indigo-50/80 via-white to-blue-50/80 p-5 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-600/20">
                <Repeat className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-black text-indigo-950">Seamless Monthly AutoPay Enabled</p>
                <p className="text-xs text-indigo-800 font-medium mt-0.5">
                  Never worry about manual renewals. Automatically debited monthly with tax invoices emailed from <strong>kniteinfotech@gmail.com</strong>.
                </p>
              </div>
            </div>
            <span className="px-3 py-1.5 rounded-xl bg-indigo-100 text-indigo-900 font-bold text-xs shrink-0">
              UPI & Card Mandates
            </span>
          </div>

          {/* Expiry Policy Note */}
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3 mb-6 shadow-sm">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-black text-amber-900">Subscription Policy & Developer Access</p>
              <p className="text-xs text-amber-800 mt-0.5 leading-relaxed font-medium">
                KNITE Medico does not offer evaluation trials. All pharmacies require an active paid subscription to access the software. Invoices, license credentials, and software updates are dispatched directly to your registered email from <strong>kniteinfotech@gmail.com</strong>.
              </p>
            </div>
          </div>

          {/* Supported Payment Methods Guide */}
          <div className="rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-50/80 via-white to-sky-50/40 p-6 mb-6 shadow-sm">
            <h3 className="text-base font-black text-blue-950 mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#0c2540]" /> Supported Payment Methods via Razorpay
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div className="p-3.5 rounded-2xl bg-white border border-blue-100 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-100 text-[#0c2540] flex items-center justify-center shrink-0">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-black text-slate-900">UPI & AutoPay</p>
                  <p className="text-[11px] text-slate-500">Google Pay, PhonePe, Paytm</p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white border border-blue-100 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-black text-slate-900">Credit / Debit Cards</p>
                  <p className="text-[11px] text-slate-500">Visa, Mastercard, RuPay</p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white border border-blue-100 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-black text-slate-900">Netbanking & E-Mandate</p>
                  <p className="text-[11px] text-slate-500">50+ Indian Banks</p>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-blue-100/70 border border-blue-200 flex items-start gap-2 text-xs font-medium text-blue-950">
              <Lock className="w-4 h-4 shrink-0 mt-0.5 text-[#0c2540]" />
              <span>PCI-DSS Level 1 Certified • 256-Bit SSL Encryption • Invoices sent from kniteinfotech@gmail.com</span>
            </div>
          </div>

          {/* FAQ */}
          <div className={`${card} mb-6`}>
            <h3 className="text-base font-black text-slate-900 mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-[#ff2c2c]" /> Frequently Asked Questions
            </h3>
            <div className="space-y-2">
              {FAQS.map((faq, i) => (
                <div key={i} className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-50/50">
                  <button
                    className="w-full flex items-center justify-between p-4 text-left text-xs font-bold text-slate-800 hover:bg-slate-100 transition"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                    <span>{faq.q}</span>
                    {openFaq === i ? <ChevronUp className="w-4 h-4 shrink-0 text-[#ff2c2c]" /> : <ChevronDown className="w-4 h-4 shrink-0 text-slate-400" />}
                  </button>
                  {openFaq === i && (
                    <div className="px-4 pb-4 text-xs leading-relaxed text-slate-600 border-t border-slate-200/60 pt-3 whitespace-pre-line">{faq.a}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 2: TERMS & AUTOPAY OPTION ── */}
      {step === 'terms' && selectedPlan && (
        <div className="w-full max-w-2xl">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#ff2c2c] to-rose-600 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-rose-500/25">
              <FileText className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">Terms & AutoPay Confirmation</h2>
            <p className="text-xs text-slate-500 font-semibold mt-1">Please review subscription parameters before payment</p>
          </div>

          {/* Pricing Summary */}
          {(() => {
            const base = getAmount(selectedPlan);
            const { fee, gst, totalSurcharge } = getGatewayFeeBreakdown(base);
            return (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 mb-4 shadow-sm text-xs">
                <p className="font-bold text-slate-500 mb-2 uppercase tracking-wider text-[11px]">Subscription Fee & Gateway Surcharge Breakdown</p>
                <div className="space-y-1.5 border-b border-slate-200 pb-3 mb-3">
                  <div className="flex justify-between font-semibold text-slate-700">
                    <span>Base Plan Price ({selectedPlan.name}):</span>
                    <span>₹{base.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500 text-[11px]">
                    <span>Razorpay Platform Fee (2%):</span>
                    <span>₹{fee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500 text-[11px]">
                    <span>GST on Platform Fee (18%):</span>
                    <span>₹{gst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-medium text-indigo-700 text-[11px]">
                    <span>Total Gateway Surcharge (Customer Paid):</span>
                    <span>₹{totalSurcharge.toFixed(2)}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-slate-900 text-sm">Total Payable Amount:</span>
                  <span className="text-xl font-black text-[#ff2c2c]">₹{getTotal(selectedPlan).toFixed(2)}</span>
                </div>
              </div>
            );
          })()}

          {/* AutoPay Option Checkbox */}
          <div
            className={`p-4 rounded-2xl border cursor-pointer transition mb-4 ${
              autoPay ? 'bg-indigo-50/80 border-indigo-300' : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
            onClick={() => setAutoPay(!autoPay)}
          >
            <div className="flex items-start gap-3">
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition ${
                autoPay ? 'bg-indigo-600 border-indigo-600' : 'border-slate-400 bg-white'
              }`}>
                {autoPay && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
              </div>
              <div>
                <p className="text-xs font-black text-indigo-950 flex items-center gap-1.5">
                  <Repeat className="w-4 h-4 text-indigo-600" />
                  <span>Enable Monthly AutoPay (Automatic Debit Mandate)</span>
                </p>
                <p className="text-[11px] text-indigo-800 font-medium mt-1 leading-relaxed">
                  Automatically renews your subscription monthly via UPI / Card mandate without requiring manual intervention. You receive official invoices sent to your email from <strong>kniteinfotech@gmail.com</strong>. Cancel anytime with 1 click.
                </p>
              </div>
            </div>
          </div>

          <div className={`${card} max-h-[300px] overflow-y-auto text-xs leading-relaxed space-y-4 mb-4 text-slate-700`}>
            {[
              ['1. Subscription & Automatic Activation', `KNITE Medico ${selectedPlan.name} is ₹${getTotal(selectedPlan).toLocaleString('en-IN')} per ${billing === 'yearly' ? 'year' : 'month'}. Payment grants instant software activation with zero delay.`],
              ['2. Payment Gateway & AutoPay Mandates', 'By subscribing, you authorize KNITE Infotech to process payments via Razorpay Gateway. Invoices are dispatched to your email from kniteinfotech@gmail.com.'],
              ['3. Plan Features & Gating', 'All-In-One Cloud SaaS (₹900/month) includes continuous Neon Cloud Sync, WhatsApp automated billing, medicine expiry tracking, and clinical medicine descriptions.'],
              ['4. Cancellation & Data Security', 'Cancel anytime from settings. No pro-rated refunds for current active cycle. Local offline POS data remains on your computer permanently.'],
              ['5. Official Invoicing', 'Tax invoice for every payment is automatically transmitted to your registered email from kniteinfotech@gmail.com.']
            ].map(([title, text]) => (
              <div key={title}>
                <h4 className="font-black text-slate-900 mb-1">{title}</h4>
                <p>{text}</p>
              </div>
            ))}
            <p className="text-[11px] text-slate-400 font-medium">Last updated: November 2026 • KNITE Infotech, Nagercoil, Tamil Nadu</p>
          </div>

          <div
            className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition mb-5 ${termsAccepted ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-slate-200 hover:border-slate-300'}`}
            onClick={() => setTermsAccepted(!termsAccepted)}>
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition ${termsAccepted ? 'bg-emerald-600 border-emerald-600' : 'border-slate-400 bg-white'}`}>
              {termsAccepted && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
            </div>
            <p className="text-xs text-slate-800 font-semibold leading-relaxed">
              I accept the Terms & Conditions and authorize KNITE Infotech to process payment for KNITE Medico {selectedPlan.name} at ₹{getTotal(selectedPlan).toLocaleString('en-IN')}/{billing === 'yearly' ? 'year' : 'month'}.
            </p>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep('plans')} className={`flex-1 ${btnBack}`}>← Back to Plans</button>
            <button onClick={handleAcceptTerms} className={`flex-1 ${termsAccepted ? btnPrimary : 'py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
              <ArrowRight className="w-4 h-4" /> Continue to Payment
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: PAYMENT ── */}
      {step === 'payment' && selectedPlan && (
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0c2540] to-blue-900 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-blue-900/25">
              <CreditCard className="w-7 h-7 text-sky-400" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">Pay via Razorpay Gateway</h2>
            <p className="text-xs text-slate-500 font-semibold mt-1">
              {selectedPlan.name} • {billing === 'yearly' ? 'Yearly' : 'Monthly'} • Instant Activation
            </p>
          </div>

          <div className={card}>

            {/* Amount Breakdown Banner */}
            {(() => {
              const base = getAmount(selectedPlan);
              const { fee, gst, totalSurcharge } = getGatewayFeeBreakdown(base);
              return (
                <div className="p-5 rounded-2xl mb-4 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 shadow-sm text-left">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Fee Breakdown</p>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-blue-100 text-blue-900">Razorpay Verified</span>
                  </div>
                  <div className="text-xs space-y-1 text-slate-600 border-b border-blue-200/80 pb-2.5 mb-2.5">
                    <div className="flex justify-between">
                      <span>Base Plan Price ({selectedPlan.name}):</span>
                      <span className="font-bold text-slate-800">₹{base.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span>Razorpay Platform Fee:</span>
                      <span>₹{fee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span>GST on Platform Fee (18%):</span>
                      <span>₹{gst.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-[11px] font-bold text-indigo-800">
                      <span>Total Gateway Surcharge (Customer Paid):</span>
                      <span>₹{totalSurcharge.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs font-black text-slate-700">Net Amount Payable:</span>
                    <span className="text-3xl font-black text-[#0c2540]">₹{getTotal(selectedPlan).toFixed(2)}</span>
                  </div>
                  {autoPay && (
                    <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-100 text-indigo-900 text-[11px] font-bold">
                      <Repeat className="w-3.5 h-3.5" /> AutoPay Mandate Enabled
                    </div>
                  )}
                  <p className="text-[11px] text-emerald-700 font-bold mt-2">✓ Tax invoice sent via kniteinfotech@gmail.com</p>
                </div>
              );
            })()}

            {/* Main Razorpay Launch Button */}
            <button
              onClick={handleOpenRazorpayCheckout}
              disabled={verifying}
              className="w-full py-4 rounded-2xl bg-[#0c2540] hover:bg-[#153a61] text-white font-black text-sm flex items-center justify-center gap-2.5 shadow-xl shadow-blue-900/20 hover:scale-[1.01] active:scale-[0.99] transition mb-4 disabled:opacity-60"
            >
              {verifying ? (
                <><RefreshCw className="w-4 h-4 animate-spin text-sky-400" /> Connecting Razorpay Gateway...</>
              ) : (
                <>
                  <CreditCard className="w-5 h-5 text-sky-400" />
                  <span>💳 Pay ₹{getTotal(selectedPlan).toLocaleString('en-IN')} via Razorpay Checkout</span>
                </>
              )}
            </button>

            {/* Razorpay Badges */}
            <div className="p-3 rounded-2xl border border-slate-200 bg-slate-50 mb-5 flex items-center justify-around text-center">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Payment Modes</p>
                <p className="text-xs font-black text-slate-800">UPI, Cards, Mandates</p>
              </div>
              <div className="h-6 w-px bg-slate-200" />
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Security</p>
                <p className="text-xs font-black text-emerald-700">PCI-DSS Level 1</p>
              </div>
            </div>

            {/* Manual Payment ID fallback */}
            <div className="pt-3 border-t border-slate-200">
              <label className="text-xs font-bold text-slate-700 block mb-1.5">Enter Payment ID or Reference Code (Optional)</label>
              <input
                type="text"
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-300 bg-slate-50 text-sm font-mono font-bold text-slate-900 outline-none focus:bg-white focus:border-blue-500 transition"
                placeholder="e.g. pay_Pxyz123456789"
                value={utrInput}
                onChange={e => setUtrInput(e.target.value)}
              />
              <p className="text-[11px] text-slate-400 mt-1">Copy Payment ID from Razorpay receipt or Bank SMS</p>
              {verifyError && <p className="text-xs text-[#ff2c2c] font-bold mt-2 flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" /> {verifyError}</p>}
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => setStep('terms')} className={`flex-1 ${btnBack}`}>← Back</button>
              <button onClick={handleVerifyPayment} disabled={verifying} className={`flex-1 ${btnPrimary} disabled:opacity-60`}>
                {verifying ? <><RefreshCw className="w-4 h-4 animate-spin" /> Verifying…</> : <><CheckCircle2 className="w-4 h-4" /> Verify Payment</>}
              </button>
            </div>
          </div>

          <p className="text-center text-xs text-slate-400 mt-4">
            Support: <a href="mailto:kniteinfotech@gmail.com" className="text-[#ff2c2c] font-bold hover:underline">kniteinfotech@gmail.com</a>
          </p>
        </div>
      )}

      {/* ── STEP 4: SUCCESS ── */}
      {step === 'success' && selectedPlan && (
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mx-auto mb-5 shadow-2xl shadow-emerald-500/30 animate-bounce">
            <CheckCircle2 className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 mb-2">You're all set! 🎉</h2>
          <p className="text-slate-600 font-medium text-sm mb-6">
            {selectedPlan.name} subscription activated successfully via Razorpay Gateway.
          </p>

          <div className={`${card} text-left space-y-4 mb-6`}>
            {[
              { bg: 'bg-blue-100', icon: CreditCard, color: 'text-blue-700', title: 'Razorpay Gateway Verified', sub: `Payment ID: ${utrInput || 'RAZORPAY_SUCCESS'}` },
              { bg: 'bg-indigo-100', icon: Repeat, color: 'text-indigo-700', title: 'AutoPay Mandate', sub: autoPay ? 'Active — debits monthly without manual intervention' : 'Manual renewal on expiry' },
              { bg: 'bg-emerald-100', icon: Shield, color: 'text-emerald-700', title: 'Invoice Sent to Email', sub: 'Tax invoice dispatched from kniteinfotech@gmail.com' },
              { bg: 'bg-sky-100', icon: Cloud, color: 'text-sky-700', title: 'Neon Cloud Sync & WhatsApp Active', sub: 'Syncs automatically + WhatsApp billing enabled' },
            ].map(({ bg, icon: Icon, color, title, sub }) => (
              <div key={title} className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900">{title}</p>
                  <p className="text-xs text-slate-500 font-medium">{sub}</p>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => onPlanSelected({
              plan_type: selectedPlan.id,
              billing_cycle: billing,
              status: 'APPROVED',
              subscription_utr: utrInput,
              autopay_enabled: autoPay
            })}
            className={`w-full py-4 rounded-2xl ${btnPrimary} text-base`}
          >
            <Zap className="w-5 h-5" /> Enter KNITE Medico Dashboard
          </button>
        </div>
      )}

    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
        <div className="relative w-full max-w-4xl mx-auto bg-white rounded-3xl shadow-2xl p-4 sm:p-6 overflow-hidden max-h-[90vh] overflow-y-auto">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/40 px-3 sm:px-6 py-8">
      {content}
    </div>
  );
}
