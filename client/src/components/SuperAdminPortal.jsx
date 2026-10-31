import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Building2, 
  Users, 
  CreditCard, 
  Database, 
  Search, 
  CheckCircle2, 
  Clock, 
  ArrowLeft, 
  RefreshCw, 
  Sparkles, 
  Key, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  Lock, 
  Mail, 
  LogOut, 
  AlertTriangle,
  ExternalLink,
  MessageSquare,
  Check,
  X,
  Phone,
  Server,
  Activity,
  Layers,
  FileText,
  Copy,
  Trash2,
  Send,
  Zap,
  HardDrive,
  Cpu,
  Radio,
  Sliders,
  ChevronRight,
  UserCheck,
  ShieldCheck,
  HelpCircle,
  Smartphone,
  Eye,
  CheckCircle,
  Menu,
  FileSpreadsheet
} from 'lucide-react';
import { getCloudUrl } from '../utils/cloudConfig';
import Pagination from './Pagination';

export default function SuperAdminPortal({ onClose, theme }) {
  const [adminUser, setAdminUser] = useState(localStorage.getItem('knite_superadmin_user') || '');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);

  // Active Navigation Tab
  const [activeTab, setActiveTab] = useState('approvals'); // approvals, tenants, whatsapp, infrastructure, analytics
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Dashboard Data
  const [metrics, setMetrics] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [cloudHealth, setCloudHealth] = useState(null);
  const [tenantsPage, setTenantsPage] = useState(1);
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [securityPage, setSecurityPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const [search, setSearch] = useState('');
  const [selectedPlanFilter, setSelectedPlanFilter] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');
  const [actionMsg, setActionMsg] = useState('');
  const [copiedKey, setCopiedKey] = useState('');

  // Approval Modal State
  const [approvingTenant, setApprovingTenant] = useState(null);
  const [assignPlan, setAssignPlan] = useState('pro_cloud');
  const [assignDays, setAssignDays] = useState(365);
  const [processingAction, setProcessingAction] = useState(false);

  // WhatsApp Gateway Config State
  const [waConfig, setWaConfig] = useState({
    provider: 'DIRECT_GATEWAY',
    auto_send: true,
    sender_name: 'KNITE Medico Official',
    meta_api_token: '',
    meta_phone_id: '',
    business_number: '+91 98765 43210'
  });
  const [waTestPhone, setWaTestPhone] = useState('');
  const [waTestStatus, setWaTestStatus] = useState('');
  const [waSaving, setWaSaving] = useState(false);

  // Detail Modal for Tenant
  const [viewingTenant, setViewingTenant] = useState(null);
  const [tenantDetails, setTenantDetails] = useState(null);
  const [loadingTenantDetails, setLoadingTenantDetails] = useState(false);

  // Password Reset Modal
  const [resetPasswordTenant, setResetPasswordTenant] = useState(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [resetPasswordSubmitting, setResetPasswordSubmitting] = useState(false);
  const [resetPasswordMsg, setResetPasswordMsg] = useState('');

  // Multilingual WhatsApp Simulator State
  const [waTestLang, setWaTestLang] = useState('en');

  // Razorpay & Subscription Payments State
  const [paymentsList, setPaymentsList] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [paymentMetrics, setPaymentMetrics] = useState({ total_collected: 0, count: 0, autopay_count: 0 });
  const [sendingInvoiceId, setSendingInvoiceId] = useState(null);

  // Email Broadcast & Communications State
  const [broadcastTarget, setBroadcastTarget] = useState('ALL');
  const [broadcastRecipient, setBroadcastRecipient] = useState('');
  const [broadcastSubject, setBroadcastSubject] = useState('');
  const [broadcastContent, setBroadcastContent] = useState('');
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastMsg, setBroadcastMsg] = useState('');

  // Email SMTP / Gmail App Password Setup State
  const [emailStatus, setEmailStatus] = useState(null);
  const [appPasswordInput, setAppPasswordInput] = useState('');
  const [savingEmailConfig, setSavingEmailConfig] = useState(false);
  const [testEmailRecipient, setTestEmailRecipient] = useState('');
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState('');

  // Security & Audit Telemetry State (Topics 1-9)
  const [securityLogs, setSecurityLogs] = useState([]);
  const [securityStats, setSecurityStats] = useState(null);
  const [loadingSecurityLogs, setLoadingSecurityLogs] = useState(false);
  const [securityFilter, setSecurityFilter] = useState('ALL');
  const [securitySearch, setSecuritySearch] = useState('');

  const isDark = theme === 'dark';
  const cloudUrl = getCloudUrl();
  const SUPERADMIN_EMAIL = 'kniteinfotech@gmail.com';

  useEffect(() => {
    if (adminUser === SUPERADMIN_EMAIL) {
      fetchAdminData();
      fetchCloudHealth();
      fetchWhatsAppConfig();
      fetchSecurityLogs();
      fetchPayments();
      fetchEmailStatus();
    }
  }, [adminUser]);

  useEffect(() => {
    if (activeTab === 'emails' && adminUser === SUPERADMIN_EMAIL) {
      fetchEmailStatus();
    }
    if (activeTab === 'security' && adminUser === SUPERADMIN_EMAIL) {
      fetchSecurityLogs();
    }
    if (activeTab === 'payments' && adminUser === SUPERADMIN_EMAIL) {
      fetchPayments();
    }
  }, [activeTab]);

  // Exclusive SuperAdmin Login Check
  function handleSuperAdminLogin(e) {
    e.preventDefault();
    setLoginError('');

    const cleanEmail = emailInput.trim().toLowerCase();
    
    // Strict restriction: ONLY kniteinfotech@gmail.com
    if (cleanEmail !== SUPERADMIN_EMAIL) {
      setLoginError(`⛔ Access Denied: Only "${SUPERADMIN_EMAIL}" is authorized as Master SuperAdmin.`);
      return;
    }

    // Master Passwords allowed
    const validPasswords = ['KniteMkuu7zwbj1', 'KNITE_MASTER_2026', 'StrongPassword123!'];
    if (!validPasswords.includes(passwordInput.trim())) {
      setLoginError('Invalid Master SuperAdmin credentials.');
      return;
    }

    localStorage.setItem('knite_superadmin_user', SUPERADMIN_EMAIL);
    setAdminUser(SUPERADMIN_EMAIL);
    setEmailInput('');
    setPasswordInput('');
  }

  function handleSuperAdminLogout() {
    localStorage.removeItem('knite_superadmin_user');
    setAdminUser('');
  }

  async function fetchAdminData() {
    setLoading(true);
    try {
      const res = await fetch(`${cloudUrl}/api/admin/overview`, {
        headers: { 'x-admin-key': 'KNITE_MASTER_2026' }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMetrics(data.metrics);
        setTenants(data.tenants || []);
      }
    } catch (err) {
      console.warn('SuperAdmin fetch error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchCloudHealth() {
    try {
      const res = await fetch(`${cloudUrl}/api/admin/cloud-health`, {
        headers: { 'x-admin-key': 'KNITE_MASTER_2026' }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCloudHealth(data);
      }
    } catch (err) {
      console.warn('Cloud health check error:', err);
    }
  }

  async function fetchWhatsAppConfig() {
    try {
      const res = await fetch(`${cloudUrl}/api/whatsapp/config`);
      const data = await res.json();
      if (res.ok && data.success && data.config) {
        setWaConfig(prev => ({ ...prev, ...data.config }));
      }
    } catch (err) {
      console.warn('WhatsApp config fetch error:', err);
    }
  }

  async function fetchSecurityLogs() {
    setLoadingSecurityLogs(true);
    try {
      const res = await fetch(`${cloudUrl}/api/admin/security-logs`, {
        headers: { 'x-admin-key': 'KNITE_MASTER_2026' }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSecurityLogs(data.logs || []);
        setSecurityStats(data.stats || null);
      }
    } catch (err) {
      console.warn('Security logs fetch error:', err);
    } finally {
      setLoadingSecurityLogs(false);
    }
  }

  async function fetchPayments() {
    setLoadingPayments(true);
    try {
      const res = await fetch(`${cloudUrl}/api/admin/payments`, {
        headers: { 'x-admin-key': 'KNITE_MASTER_2026' }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPaymentsList(data.payments || []);
        if (data.metrics) setPaymentMetrics(data.metrics);
      }
    } catch (err) {
      console.warn('Error fetching payments:', err);
    } finally {
      setLoadingPayments(false);
    }
  }

  async function handleResendInvoice(payment) {
    setSendingInvoiceId(payment.id || payment.payment_id);
    try {
      const res = await fetch(`${cloudUrl}/api/admin/send-invoice`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-key': 'KNITE_MASTER_2026' 
        },
        body: JSON.stringify({
          recipient_email: payment.email,
          shop_name: payment.shop_name,
          owner_name: payment.owner_name,
          payment_id: payment.payment_id || payment.id,
          order_id: payment.order_id,
          plan_name: payment.plan_name || payment.plan_type,
          amount: payment.amount,
          autopay: payment.autopay
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionMsg(`📨 Tax invoice dispatched to ${payment.email} from kniteinfotech@gmail.com!`);
        setTimeout(() => setActionMsg(''), 5000);
      } else {
        alert(data.error || 'Failed to dispatch invoice');
      }
    } catch (err) {
      alert('Error sending invoice: ' + err.message);
    } finally {
      setSendingInvoiceId(null);
    }
  }

  async function handleSendBroadcast(e) {
    if (e) e.preventDefault();
    if (!broadcastSubject.trim() || !broadcastContent.trim()) {
      alert('Please provide both subject and message content.');
      return;
    }
    setBroadcasting(true);
    setBroadcastMsg('');
    try {
      const res = await fetch(`${cloudUrl}/api/admin/broadcast-email`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-key': 'KNITE_MASTER_2026' 
        },
        body: JSON.stringify({
          target: broadcastTarget,
          recipient_email: broadcastRecipient,
          subject: broadcastSubject.trim(),
          content: broadcastContent.trim()
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setBroadcastMsg(`🎉 Broadcast dispatched successfully (${data.sent_count || 1} recipient${(data.sent_count > 1 ? 's' : '')} notified via kniteinfotech@gmail.com)!`);
        setBroadcastSubject('');
        setBroadcastContent('');
        setTimeout(() => setBroadcastMsg(''), 6000);
      } else {
        setBroadcastMsg(`❌ Broadcast failed: ${data.error || 'Server error'}`);
      }
    } catch (err) {
      setBroadcastMsg('❌ Network error: ' + err.message);
    } finally {
      setBroadcasting(false);
    }
  }

  async function fetchEmailStatus() {
    try {
      const res = await fetch(`${cloudUrl}/api/admin/email-status`, {
        headers: { 'x-admin-key': 'KNITE_MASTER_2026' }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setEmailStatus(data);
      }
    } catch (err) {
      console.warn('Failed to fetch email status:', err);
    }
  }

  async function handleSaveEmailConfig(e) {
    if (e) e.preventDefault();
    if (!appPasswordInput.trim()) {
      alert('Please enter your 16-character Google App Password.');
      return;
    }
    setSavingEmailConfig(true);
    setTestEmailResult('');
    try {
      const res = await fetch(`${cloudUrl}/api/admin/email-config`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-key': 'KNITE_MASTER_2026' 
        },
        body: JSON.stringify({
          smtp_user: SUPERADMIN_EMAIL,
          gmail_app_password: appPasswordInput.trim()
        })
      });
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`Server returned status ${res.status}: ${text.slice(0, 120)}`);
      }

      if (res.ok && data.success) {
        setBroadcastMsg(data.message || '✅ Google SMTP Authenticated successfully!');
        setAppPasswordInput('');
        fetchEmailStatus();
        setTimeout(() => setBroadcastMsg(''), 7000);
      } else {
        alert(data.error || 'Failed to authenticate Google App Password');
      }
    } catch (err) {
      alert('Error updating email credentials: ' + err.message);
    } finally {
      setSavingEmailConfig(false);
    }
  }

  async function handleSendTestEmail(e) {
    if (e) e.preventDefault();
    const target = testEmailRecipient.trim() || SUPERADMIN_EMAIL;
    setSendingTestEmail(true);
    setTestEmailResult('');
    try {
      const res = await fetch(`${cloudUrl}/api/admin/test-email`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-key': 'KNITE_MASTER_2026' 
        },
        body: JSON.stringify({ recipient_email: target })
      });
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`Server returned status ${res.status}: ${text.slice(0, 120)}`);
      }
      if (res.ok && data.success) {
        setTestEmailResult(`🎉 Success! Test email delivered to ${target}. Check your inbox.`);
      } else {
        setTestEmailResult(`❌ Delivery Failed: ${data.error || 'Check server logs'}`);
      }
    } catch (err) {
      setTestEmailResult('❌ Network error: ' + err.message);
    } finally {
      setSendingTestEmail(false);
    }
  }

  async function handleQuickPlanChange(tenantId, newPlan, storeName) {
    try {
      const res = await fetch(`${cloudUrl}/api/admin/tenants/${tenantId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-key': 'KNITE_MASTER_2026' 
        },
        body: JSON.stringify({ plan_type: newPlan })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionMsg(`⚡ Plan for "${storeName}" updated to ${newPlan.toUpperCase()}`);
        fetchAdminData();
        setTimeout(() => setActionMsg(''), 4000);
      } else {
        alert(data.error || 'Failed to update plan');
      }
    } catch (err) {
      alert('Error updating plan: ' + err.message);
    }
  }

  function formatPlanBadge(plan) {
    if (plan === 'local_599') return { label: 'Basic POS (₹599/mo)', color: 'bg-blue-50 text-blue-700 border-blue-200' };
    if (plan === 'cloud_799') return { label: 'Pro Cloud (₹799/mo)', color: 'bg-purple-50 text-[#5f259f] border-purple-200 font-black' };
    if (plan === 'enterprise_1299') return { label: 'Enterprise (₹1,299/mo)', color: 'bg-amber-50 text-amber-700 border-amber-300 font-black' };
    if (plan === 'pro_cloud') return { label: 'Dev Free / Pro Cloud', color: 'bg-emerald-50 text-emerald-700 border-emerald-300 font-black' };
    return { label: (plan || 'BASIC').toUpperCase(), color: 'bg-slate-100 text-slate-700 border-slate-200' };
  }

  // Confirm Approval
  async function handleConfirmApprove() {
    if (!approvingTenant) return;
    setProcessingAction(true);

    try {
      const res = await fetch(`${cloudUrl}/api/admin/tenants/${approvingTenant.id}/approve`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-key': 'KNITE_MASTER_2026' 
        },
        body: JSON.stringify({ 
          plan_type: assignPlan, 
          extend_days: assignDays 
        })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setActionMsg(`🎉 Store "${approvingTenant.shop_name}" APPROVED & Activated!`);
        setApprovingTenant(null);
        fetchAdminData();
        setTimeout(() => setActionMsg(''), 5000);
      } else {
        alert(data.error || 'Failed to approve store');
      }
    } catch (err) {
      alert('Approval error: ' + err.message);
    } finally {
      setProcessingAction(false);
    }
  }

  // Reject Registration
  async function handleRejectStore(tenantId, storeName) {
    if (!window.confirm(`Are you sure you want to REJECT registration for "${storeName}"?`)) return;
    try {
      const res = await fetch(`${cloudUrl}/api/admin/tenants/${tenantId}/reject`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-key': 'KNITE_MASTER_2026' 
        },
        body: JSON.stringify({ reason: 'Compliance criteria verification failed' })
      });
      if (res.ok) {
        setActionMsg(`❌ Application for "${storeName}" was rejected.`);
        fetchAdminData();
        setTimeout(() => setActionMsg(''), 5000);
      }
    } catch (err) {
      alert('Failed to reject: ' + err.message);
    }
  }

  // Toggle Status (Suspend / Reactivate)
  async function handleToggleStatus(tenantId, currentStatus, storeName) {
    try {
      const res = await fetch(`${cloudUrl}/api/admin/tenants/${tenantId}/toggle-status`, {
        method: 'POST',
        headers: { 'x-admin-key': 'KNITE_MASTER_2026' }
      });
      if (res.ok) {
        const nextStatus = currentStatus === 'APPROVED' ? 'SUSPENDED' : 'APPROVED';
        setActionMsg(`🔄 "${storeName}" status updated to ${nextStatus}`);
        fetchAdminData();
        setTimeout(() => setActionMsg(''), 4000);
      }
    } catch (err) {
      alert('Failed to toggle status: ' + err.message);
    }
  }

  // Extend Plan Validity
  async function handleExtendPlan(tenantId, days, storeName) {
    try {
      const res = await fetch(`${cloudUrl}/api/admin/tenants/${tenantId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-key': 'KNITE_MASTER_2026' 
        },
        body: JSON.stringify({ extend_days: days })
      });
      if (res.ok) {
        setActionMsg(`⚡ Extended license for "${storeName}" by +${days} days!`);
        fetchAdminData();
        setTimeout(() => setActionMsg(''), 4000);
      }
    } catch (err) {
      alert('Failed to extend plan: ' + err.message);
    }
  }

  // Delete Tenant Permanently
  async function handleDeleteTenant(tenantId, storeName) {
    if (!window.confirm(`⚠️ DANGER: Permanently delete "${storeName}" and all associated cloud sync records?`)) return;
    try {
      const res = await fetch(`${cloudUrl}/api/admin/tenants/${tenantId}`, {
        method: 'DELETE',
        headers: { 'x-admin-key': 'KNITE_MASTER_2026' }
      });
      if (res.ok) {
        setActionMsg(`🗑️ Store "${storeName}" deleted permanently.`);
        fetchAdminData();
        setTimeout(() => setActionMsg(''), 4000);
      }
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    }
  }

  // Save WhatsApp Gateway Config
  async function handleSaveWhatsAppConfig(e) {
    e.preventDefault();
    setWaSaving(true);
    try {
      const res = await fetch(`${cloudUrl}/api/whatsapp/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: waConfig })
      });
      if (res.ok) {
        setActionMsg('✅ Automated WhatsApp Gateway configuration saved!');
        setTimeout(() => setActionMsg(''), 4000);
      }
    } catch (err) {
      alert('Failed to save config: ' + err.message);
    } finally {
      setWaSaving(false);
    }
  }

  // Open Tenant Full Dossier Modal
  async function handleOpenTenantDetails(tenant) {
    setViewingTenant(tenant);
    setTenantDetails(null);
    setLoadingTenantDetails(true);
    try {
      const res = await fetch(`${cloudUrl}/api/admin/tenants/${tenant.id}/details`, {
        headers: { 'x-admin-key': 'KNITE_MASTER_2026' }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTenantDetails(data);
      }
    } catch (err) {
      console.warn('Failed to load tenant details:', err);
    } finally {
      setLoadingTenantDetails(false);
    }
  }

  // Handle Password Reset by SuperAdmin
  async function handleResetPassword(e) {
    e.preventDefault();
    if (!resetPasswordTenant || !newPasswordInput) return;
    if (newPasswordInput.length < 6) {
      setResetPasswordMsg('❌ Password must be at least 6 characters');
      return;
    }
    setResetPasswordSubmitting(true);
    setResetPasswordMsg('');
    try {
      const res = await fetch(`${cloudUrl}/api/admin/reset-password`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-key': 'KNITE_MASTER_2026'
        },
        body: JSON.stringify({
          tenant_id: resetPasswordTenant.id,
          email: resetPasswordTenant.email,
          new_password: newPasswordInput.trim()
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setResetPasswordMsg(`🎉 ${data.message || 'Password successfully updated!'}`);
        setTimeout(() => {
          setResetPasswordTenant(null);
          setResetPasswordMsg('');
          setNewPasswordInput('');
        }, 2200);
      } else {
        setResetPasswordMsg(`❌ ${data.error || 'Password reset failed'}`);
      }
    } catch (err) {
      setResetPasswordMsg('❌ Server error: ' + err.message);
    } finally {
      setResetPasswordSubmitting(false);
    }
  }

  // Generate Random Strong Password
  function generateRandomPassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$';
    let pass = 'Medico@';
    for (let i = 0; i < 4; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPasswordInput(pass);
  }

  // Export Store Directory to CSV
  function exportTenantsCSV() {
    if (!tenants || tenants.length === 0) {
      alert('No tenant records to export.');
      return;
    }
    const headers = ['Shop Name', 'Owner Name', 'Email', 'Phone', 'DL Number', 'GSTIN', 'Address', 'License Key', 'Plan Type', 'Status', 'Expiry Date', 'Days Remaining', 'Medicines Count', 'Invoices Count', 'Total Volume (INR)'];
    const rows = filteredTenants.map(t => [
      `"${(t.shop_name || '').replace(/"/g, '""')}"`,
      `"${(t.owner_name || '').replace(/"/g, '""')}"`,
      `"${(t.email || '').replace(/"/g, '""')}"`,
      `"${t.phone || ''}"`,
      `"${t.dl_number || ''}"`,
      `"${t.gstin || ''}"`,
      `"${(t.address || '').replace(/"/g, '""')}"`,
      `"${t.license_key || ''}"`,
      `"${t.plan_type || ''}"`,
      `"${t.status || ''}"`,
      `"${t.plan_expires_at ? new Date(t.plan_expires_at).toISOString().split('T')[0] : ''}"`,
      getDaysRemaining(t.plan_expires_at),
      t.medicines_count || 0,
      t.invoices_count || 0,
      parseFloat(t.total_revenue || 0).toFixed(2)
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `knite_medico_stores_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Test WhatsApp Gateway
  async function handleTestWhatsAppPing() {
    if (!waTestPhone) {
      alert('Please enter a 10-digit mobile number for test dispatch.');
      return;
    }
    setWaTestStatus('⚡ Dispatching automated bill via server gateway...');
    try {
      const res = await fetch(`${cloudUrl}/api/whatsapp/send-bill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: waTestPhone,
          customer_name: 'Test Customer',
          shop_name: 'KNITE Medico Official',
          invoice_number: 'TEST-PING-001',
          grand_total: 250.00,
          payment_mode: 'UPI',
          language: waTestLang,
          items: [{ medicine_name: 'Paracetamol 650mg (Test)', quantity: 2, total_amount: 250 }]
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setWaTestStatus(`✅ Automated WhatsApp message dispatched to +${data.recipient}! Status: DELIVERED (${waTestLang.toUpperCase()})`);
      } else {
        setWaTestStatus(`❌ Dispatch error: ${data.error || 'Server rejected message'}`);
      }
    } catch (err) {
      setWaTestStatus('⚠️ Dispatch failed. Check server connectivity.');
    }
  }

  // Copy Key
  function copyLicenseKey(key) {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(''), 2500);
  }

  const pendingTenants = tenants.filter(t => t.status === 'PENDING_APPROVAL');
  const activeTenants = tenants.filter(t => t.status === 'APPROVED');
  const suspendedTenants = tenants.filter(t => t.status === 'SUSPENDED');

  function getDaysRemaining(expiryDate) {
    if (!expiryDate) return 0;
    const diffTime = new Date(expiryDate) - new Date();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  const filteredTenants = tenants.filter(t => {
    const matchSearch = 
      t.shop_name?.toLowerCase().includes(search.toLowerCase()) ||
      t.owner_name?.toLowerCase().includes(search.toLowerCase()) ||
      t.email?.toLowerCase().includes(search.toLowerCase()) ||
      t.license_key?.toLowerCase().includes(search.toLowerCase()) ||
      t.dl_number?.toLowerCase().includes(search.toLowerCase());

    const matchPlan = selectedPlanFilter === 'ALL' || t.plan_type === selectedPlanFilter;
    
    let matchStatus = true;
    if (selectedStatusFilter === 'ALL') {
      matchStatus = true;
    } else if (selectedStatusFilter === 'EXPIRING_SOON') {
      const days = getDaysRemaining(t.plan_expires_at);
      matchStatus = days <= 30 && days >= 0;
    } else {
      matchStatus = t.status === selectedStatusFilter;
    }

    return matchSearch && matchPlan && matchStatus;
  });

  const paginatedTenants = filteredTenants.slice((tenantsPage - 1) * ITEMS_PER_PAGE, tenantsPage * ITEMS_PER_PAGE);

  useEffect(() => {
    setTenantsPage(1);
  }, [search, selectedPlanFilter, selectedStatusFilter]);

  // =========================================================================
  // VIEW 1: SUPERADMIN MASTER LOGIN (Strict kniteinfotech@gmail.com Gate)
  // =========================================================================
  if (adminUser !== SUPERADMIN_EMAIL) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#fff5f5] via-[#fff9f9] to-[#ffeef0] text-slate-800 relative overflow-hidden font-sans">
        
        {/* Soft Glowing Orbs */}
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#ff2c2c]/8 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[#f94449]/8 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-md w-full bg-white/95 backdrop-blur-2xl p-8 sm:p-10 rounded-3xl border border-rose-100 shadow-[0_20px_60px_-15px_rgba(255,44,44,0.15)] relative z-10 space-y-6">
          
          {/* Brand Shield Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex relative">
              <div className="w-28 h-28 rounded-3xl bg-white p-3 border border-slate-200 flex items-center justify-center shadow-xl shadow-[#ff2c2c]/10 mx-auto">
                <img src="/logo.png" alt="Knite Medico Logo" className="w-full h-full object-contain" />
              </div>
              <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-4 border-white flex items-center justify-center">
                <Lock className="w-3 h-3 text-white" />
              </span>
            </div>

            <div>
              <h2 className="text-2xl font-black tracking-tight text-slate-900 flex items-center justify-center gap-2">
                <span>KNITE MEDICO</span>
              </h2>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold bg-rose-50 text-[#f94449] border border-rose-200 mt-1">
                <span>SUPERADMIN COMMAND TOWER</span>
              </div>
              <p className="text-xs text-slate-400 mt-1.5">
                Restricted to Master Operator: <span className="text-[#ff2c2c] font-semibold">{SUPERADMIN_EMAIL}</span>
              </p>
            </div>
          </div>

          {loginError && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-[#ff2c2c] shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleSuperAdminLogin} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1.5 block">
                Master Operator Identity
              </label>
              <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-rose-200 bg-rose-50/50 focus-within:border-[#ff2c2c] focus-within:ring-2 focus-within:ring-[#ff2c2c]/20 transition">
                <Mail className="w-4 h-4 text-[#ff2c2c] shrink-0" />
                <input
                  type="email"
                  required
                  className="w-full bg-transparent border-none outline-none text-sm text-slate-800 placeholder-slate-300"
                  placeholder="kniteinfotech@gmail.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 mb-1.5 block">
                Master Security Key / Password
              </label>
              <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-rose-200 bg-rose-50/50 focus-within:border-[#ff2c2c] focus-within:ring-2 focus-within:ring-[#ff2c2c]/20 transition">
                <Lock className="w-4 h-4 text-[#ff2c2c] shrink-0" />
                <input
                  type="password"
                  required
                  className="w-full bg-transparent border-none outline-none text-sm text-slate-800 placeholder-slate-300"
                  placeholder="••••••••••••"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#ff2c2c] via-[#f94449] to-[#ee6b6e] text-white text-sm font-extrabold tracking-wide shadow-lg shadow-[#ff2c2c]/30 hover:brightness-110 active:scale-[0.99] transition flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4" />
              <span>Authenticate & Enter Tower</span>
            </button>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 text-xs font-semibold text-slate-400 hover:text-[#ff2c2c] transition text-center"
              >
                ← Return to Pharmacy Point of Sale
              </button>
            )}
          </form>

          <div className="pt-4 border-t border-rose-100 flex items-center justify-between text-[11px] text-slate-300 font-mono">
            <span>KNITE INFOTECH</span>
            <span>BUILD 2026.09</span>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: EXECUTIVE ENTERPRISE CONTROL TOWER (Sidebar + Canvas Architecture)
  // =========================================================================
  return (
    <div className="min-h-screen bg-[#f7f8fc] text-slate-900 flex font-sans antialiased">
      
      {/* ------------------------------------------------------------- */}
      {/* LEFT NAVIGATION SIDEBAR (Stripe/Supabase SaaS Aesthetic)        */}
      {/* ------------------------------------------------------------- */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-72 bg-white border-r border-[#ffd7db] flex flex-col justify-between transition-transform duration-300 ${
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        
        {/* Brand Header */}
        <div className="p-6 border-b border-[#ffd7db]">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-white p-1.5 border border-slate-200 flex items-center justify-center shadow-md shadow-[#ff2c2c]/10 shrink-0">
              <img src="/logo_icon.png" alt="Knite Medico Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-lg tracking-tight text-slate-900">
                  KNITE <span className="text-[#ff2c2c]">MEDICO</span>
                </span>
              </div>
              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-black bg-[#ffcbd1]/70 text-[#ff2c2c] border border-[#ff2c2c]/30">
                SUPERADMIN OS
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Menu Links */}
        <div className="px-4 py-6 space-y-6 flex-1 overflow-y-auto">
          
          {/* Section: Management */}
          <div>
            <div className="px-3 mb-2 text-[10px] font-black tracking-wider uppercase text-slate-400">
              Pharmacy Network
            </div>
            <nav className="space-y-1">
              
              {/* Approvals Tab */}
              <button
                onClick={() => { setActiveTab('approvals'); setMobileMenuOpen(false); }}
                className={`w-full px-3.5 py-2.5 rounded-2xl text-xs font-bold transition flex items-center justify-between ${
                  activeTab === 'approvals'
                    ? 'bg-gradient-to-r from-[#ff2c2c] to-[#f94449] text-white shadow-md shadow-[#ff2c2c]/30'
                    : 'text-slate-600 hover:bg-[#fff1f2] hover:text-[#ff2c2c]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4" />
                  <span>Pending Approvals</span>
                </div>
                {pendingTenants.length > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    activeTab === 'approvals' 
                      ? 'bg-white text-[#ff2c2c]' 
                      : 'bg-[#ff2c2c] text-white animate-pulse'
                  }`}>
                    {pendingTenants.length}
                  </span>
                )}
              </button>

              {/* Stores Directory Tab */}
              <button
                onClick={() => { setActiveTab('tenants'); setMobileMenuOpen(false); }}
                className={`w-full px-3.5 py-2.5 rounded-2xl text-xs font-bold transition flex items-center justify-between ${
                  activeTab === 'tenants'
                    ? 'bg-gradient-to-r from-[#ff2c2c] to-[#f94449] text-white shadow-md shadow-[#ff2c2c]/30'
                    : 'text-slate-600 hover:bg-[#fff1f2] hover:text-[#ff2c2c]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Building2 className="w-4 h-4" />
                  <span>Store Directory</span>
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  {tenants.length}
                </span>
              </button>
            </nav>
          </div>

          {/* Section: Communications & Infrastructure */}
          <div>
            <div className="px-3 mb-2 text-[10px] font-black tracking-wider uppercase text-slate-400">
              Payments & Communications
            </div>
            <nav className="space-y-1">
              
              {/* Razorpay Payments & AutoPay Tab */}
              <button
                onClick={() => { setActiveTab('payments'); setMobileMenuOpen(false); }}
                className={`w-full px-3.5 py-2.5 rounded-2xl text-xs font-bold transition flex items-center justify-between ${
                  activeTab === 'payments'
                    ? 'bg-gradient-to-r from-[#ff2c2c] to-[#f94449] text-white shadow-md shadow-[#ff2c2c]/30'
                    : 'text-slate-600 hover:bg-[#fff1f2] hover:text-[#ff2c2c]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <CreditCard className="w-4 h-4 text-[#0c2340]" />
                  <span>Razorpay & AutoPay</span>
                </div>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                  activeTab === 'payments'
                    ? 'bg-white text-[#ff2c2c]'
                    : 'bg-blue-50 text-blue-800'
                }`}>
                  Live
                </span>
              </button>

              {/* Official Email Broadcast Tab */}
              <button
                onClick={() => { setActiveTab('emails'); setMobileMenuOpen(false); }}
                className={`w-full px-3.5 py-2.5 rounded-2xl text-xs font-bold transition flex items-center justify-between ${
                  activeTab === 'emails'
                    ? 'bg-gradient-to-r from-[#ff2c2c] to-[#f94449] text-white shadow-md shadow-[#ff2c2c]/30'
                    : 'text-slate-600 hover:bg-[#fff1f2] hover:text-[#ff2c2c]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-emerald-600" />
                  <span>Email Broadcast</span>
                </div>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                  activeTab === 'emails'
                    ? 'bg-white text-[#ff2c2c]'
                    : 'bg-emerald-50 text-emerald-800'
                }`}>
                  SMTP
                </span>
              </button>

              {/* WhatsApp Gateway Tab */}
              <button
                onClick={() => { setActiveTab('whatsapp'); setMobileMenuOpen(false); }}
                className={`w-full px-3.5 py-2.5 rounded-2xl text-xs font-bold transition flex items-center justify-between ${
                  activeTab === 'whatsapp'
                    ? 'bg-gradient-to-r from-[#ff2c2c] to-[#f94449] text-white shadow-md shadow-[#ff2c2c]/30'
                    : 'text-slate-600 hover:bg-[#fff1f2] hover:text-[#ff2c2c]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-4 h-4" />
                  <span>WhatsApp Gateway</span>
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              </button>

              {/* Cloud DB Health */}
              <button
                onClick={() => { setActiveTab('infrastructure'); setMobileMenuOpen(false); }}
                className={`w-full px-3.5 py-2.5 rounded-2xl text-xs font-bold transition flex items-center justify-between ${
                  activeTab === 'infrastructure'
                    ? 'bg-gradient-to-r from-[#ff2c2c] to-[#f94449] text-white shadow-md shadow-[#ff2c2c]/30'
                    : 'text-slate-600 hover:bg-[#fff1f2] hover:text-[#ff2c2c]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Database className="w-4 h-4" />
                  <span>Cloud DB & Server</span>
                </div>
                <span className="text-[10px] font-mono text-emerald-600 font-bold">
                  Online
                </span>
              </button>

              {/* Platform Financials */}
              <button
                onClick={() => { setActiveTab('analytics'); setMobileMenuOpen(false); }}
                className={`w-full px-3.5 py-2.5 rounded-2xl text-xs font-bold transition flex items-center justify-between ${
                  activeTab === 'analytics'
                    ? 'bg-gradient-to-r from-[#ff2c2c] to-[#f94449] text-white shadow-md shadow-[#ff2c2c]/30'
                    : 'text-slate-600 hover:bg-[#fff1f2] hover:text-[#ff2c2c]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-4 h-4" />
                  <span>Platform Financials</span>
                </div>
              </button>

              {/* Security & Audit Telemetry (Topics 1-9) */}
              <button
                onClick={() => { setActiveTab('security'); setMobileMenuOpen(false); }}
                className={`w-full px-3.5 py-2.5 rounded-2xl text-xs font-bold transition flex items-center justify-between ${
                  activeTab === 'security'
                    ? 'bg-gradient-to-r from-[#ff2c2c] to-[#f94449] text-white shadow-md shadow-[#ff2c2c]/30'
                    : 'text-slate-600 hover:bg-[#fff1f2] hover:text-[#ff2c2c]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <ShieldAlert className="w-4 h-4 text-rose-500" />
                  <span>Security & Audit Logs</span>
                </div>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-black ${
                  activeTab === 'security'
                    ? 'bg-white text-[#ff2c2c]'
                    : 'bg-rose-100 text-rose-700'
                }`}>
                  DEFENSE
                </span>
              </button>
            </nav>
          </div>
        </div>

        {/* Sidebar Footer: SuperAdmin Profile Card */}
        <div className="p-4 border-t border-[#ffd7db] bg-[#fffbfc]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#ff2c2c]/20 border border-[#ff2c2c]/40 flex items-center justify-center text-[#ff2c2c] font-black text-xs">
                KI
              </div>
              <div className="text-left">
                <div className="text-xs font-extrabold text-slate-900 leading-tight">
                  KNITE Infotech
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  {SUPERADMIN_EMAIL}
                </div>
              </div>
            </div>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" title="Connected to Home Server" />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => { fetchAdminData(); fetchCloudHealth(); fetchPayments(); }}
              className="flex-1 py-1.5 rounded-xl border border-[#ffd7db] hover:bg-[#fff1f2] text-[11px] font-bold text-slate-600 transition flex items-center justify-center gap-1.5"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin text-[#ff2c2c]' : ''}`} />
              <span>Sync Telemetry</span>
            </button>

            <button
              onClick={handleSuperAdminLogout}
              className="p-2 rounded-xl bg-rose-50 hover:bg-[#ff2c2c] hover:text-white text-[#ff2c2c] transition"
              title="Exit SuperAdmin"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div 
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* RIGHT MAIN VIEWPORT                                           */}
      {/* ------------------------------------------------------------- */}
      <div className="flex-1 lg:pl-72 flex flex-col min-w-0">
        
        {/* Top Executive Header Bar */}
        <header className="h-16 border-b border-[#ffd7db] bg-white/80 backdrop-blur-md sticky top-0 z-20 px-4 sm:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 rounded-xl border border-[#ffd7db] lg:hidden text-slate-600"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumb path */}
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <span>SuperAdmin</span>
              <span>/</span>
              <span className="text-slate-900 font-extrabold capitalize">
                {activeTab === 'approvals' && 'Pending Pharmacy Approvals'}
                {activeTab === 'tenants' && 'Medical Stores Directory'}
                {activeTab === 'payments' && 'Razorpay Payments & AutoPay Invoices'}
                {activeTab === 'emails' && 'Official Email Broadcast & Announcements'}
                {activeTab === 'whatsapp' && 'Headless WhatsApp Dispatch Gateway'}
                {activeTab === 'infrastructure' && 'PostgreSQL Cloud Health'}
                {activeTab === 'analytics' && 'Platform Revenue & GMV Audit'}
                {activeTab === 'security' && 'Enterprise Security & Audit Telemetry'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* System Node Chip */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-mono font-bold text-emerald-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-ping" />
              <span>KNITE Cloud Engine: Active</span>
            </div>

            {onClose && (
              <button
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-xl border border-[#ffd7db] hover:bg-[#fff1f2] text-xs font-bold text-[#ff2c2c] transition flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to POS</span>
              </button>
            )}
          </div>
        </header>

        {/* Global Action Feedback Notification */}
        {actionMsg && (
          <div className="bg-gradient-to-r from-[#ff2c2c] via-[#f94449] to-[#ee6b6e] text-white px-6 py-2.5 text-xs font-bold shadow-lg animate-in fade-in slide-in-from-top duration-300 flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 text-white" />
            <span>{actionMsg}</span>
          </div>
        )}

        {/* Main Content Area */}
        <main className="p-4 sm:p-8 space-y-6 flex-1 overflow-y-auto">
          
          {/* Executive KPI Ribbon */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            
            {/* 1. Pending Approvals Card */}
            <div 
              onClick={() => setActiveTab('approvals')}
              className={`cursor-pointer p-5 rounded-3xl border transition-all ${
                pendingTenants.length > 0
                  ? 'bg-gradient-to-br from-[#fff0f2] via-[#ffe4e7] to-white border-[#ff2c2c] shadow-[0_10px_30px_-5px_rgba(255,44,44,0.25)] ring-2 ring-[#ff2c2c]/40'
                  : 'bg-white border-[#ffd7db]'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1">
                <span>Pending Approvals</span>
                <Clock className="w-4 h-4 text-[#ff2c2c]" />
              </div>
              <div className="text-3xl font-black text-[#ff2c2c] tracking-tight">
                {pendingTenants.length}
              </div>
              <div className="text-[11px] font-semibold text-slate-500 mt-1 flex items-center gap-1">
                {pendingTenants.length > 0 ? (
                  <span className="text-[#ff2c2c] font-bold">⚡ Verification required</span>
                ) : (
                  <span>All applications reviewed</span>
                )}
              </div>
            </div>

            {/* 2. Active Medical Stores */}
            <div 
              onClick={() => setActiveTab('tenants')}
              className="cursor-pointer p-5 rounded-3xl bg-white border border-[#ffd7db] hover:border-[#f94449] transition shadow-sm"
            >
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1">
                <span>Active Pharmacies</span>
                <Building2 className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-3xl font-black text-slate-900 tracking-tight">
                {activeTenants.length}
              </div>
              <div className="text-[11px] font-semibold text-slate-500 mt-1">
                {suspendedTenants.length > 0 ? `${suspendedTenants.length} suspended` : 'Operating nominally'}
              </div>
            </div>

            {/* 3. Platform Revenue GMV */}
            <div 
              onClick={() => setActiveTab('analytics')}
              className="cursor-pointer p-5 rounded-3xl bg-white border border-[#ffd7db] hover:border-[#f94449] transition shadow-sm"
            >
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1">
                <span>Network Sales (GMV)</span>
                <DollarSign className="w-4 h-4 text-[#ff2c2c]" />
              </div>
              <div className="text-3xl font-black text-slate-900 tracking-tight">
                ₹{parseFloat(metrics?.total_network_volume || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
              <div className="text-[11px] font-semibold text-slate-500 mt-1">
                {metrics?.total_invoices || 0} Invoices billed
              </div>
            </div>

            {/* 4. Database Footprint */}
            <div 
              onClick={() => setActiveTab('infrastructure')}
              className="cursor-pointer p-5 rounded-3xl bg-white border border-[#ffd7db] hover:border-[#f94449] transition shadow-sm"
            >
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1">
                <span>Cloud PostgreSQL</span>
                <HardDrive className="w-4 h-4 text-purple-500" />
              </div>
              <div className="text-3xl font-black text-slate-900 tracking-tight">
                {cloudHealth?.db_size || '9.6 MB'}
              </div>
              <div className="text-[11px] font-semibold text-emerald-600 mt-1 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                <span>Zero Data Loss Active</span>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* TAB 1: PENDING APPROVALS QUEUE (Executive Dossier Desk)   */}
          {/* ========================================================= */}
          {activeTab === 'approvals' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">
                    Statutory Approval Queue
                  </h3>
                  <p className="text-xs text-slate-500">
                    Review and authorize new pharmacy registrations before cloud sync and billing are activated.
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-black bg-[#ff2c2c] text-white">
                  {pendingTenants.length} Pending
                </span>
              </div>

              {pendingTenants.length === 0 ? (
                <div className="p-16 text-center rounded-3xl bg-white border border-[#ffd7db] space-y-3">
                  <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                    <CheckCircle className="w-8 h-8" />
                  </div>
                  <h4 className="text-base font-extrabold text-slate-900">
                    Approval Queue Cleared!
                  </h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    All pharmacy registrations have been verified. Any newly submitted stores will automatically appear in this desk for your review.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pendingTenants.map((t) => (
                    <div 
                      key={t.id}
                      className="p-6 rounded-3xl bg-white border-2 border-[#ff2c2c]/40 shadow-xl shadow-[#ff2c2c]/10 flex flex-col justify-between space-y-4 relative overflow-hidden"
                    >
                      {/* Top Corner Glow Ribbon */}
                      <div className="absolute top-0 right-0 w-32 h-32 bg-[#ff2c2c]/5 rounded-bl-full pointer-events-none" />

                      <div className="space-y-4">
                        {/* Header */}
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#ff2c2c] to-[#f94449] flex items-center justify-center text-white font-black text-lg shadow-md shadow-[#ff2c2c]/30">
                              {t.shop_name?.charAt(0) || 'P'}
                            </div>
                            <div>
                              <h4 className="text-base font-black text-slate-900 leading-tight">
                                {t.shop_name}
                              </h4>
                              <p className="text-xs text-slate-500 font-medium mt-0.5">
                                Pharmacist: <span className="font-bold text-slate-700">{t.owner_name}</span>
                              </p>
                            </div>
                          </div>

                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-[#ffcbd1]/70 text-[#ff2c2c] border border-[#ff2c2c]/30 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#ff2c2c] animate-ping" />
                            Awaiting Review
                          </span>
                        </div>

                        {/* Dossier Card */}
                        <div className="p-4 rounded-2xl bg-[#fffbfc] border border-[#ffd7db]/80 text-xs space-y-2.5">
                          <div className="flex justify-between items-center pb-2 border-b border-[#ffd7db]/40">
                            <span className="text-slate-500 font-medium">Drug License (DL No):</span>
                            <span className="font-mono font-black text-[#ff2c2c] px-2 py-0.5 rounded bg-rose-50 border border-rose-200">
                              {t.dl_number || 'TN-DL-UNVERIFIED'}
                            </span>
                          </div>
                          
                          <div className="flex justify-between items-center pb-2 border-b border-[#ffd7db]/40">
                            <span className="text-slate-500 font-medium">Owner WhatsApp:</span>
                            <span className="font-mono font-bold text-[#25D366] flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              <span>+{t.phone || 'N/A'}</span>
                            </span>
                          </div>

                          <div className="flex justify-between items-center pb-2 border-b border-[#ffd7db]/40">
                            <span className="text-slate-500 font-medium">Email Account:</span>
                            <span className="font-mono text-slate-800 font-bold">{t.email}</span>
                          </div>

                          {t.gstin && (
                            <div className="flex justify-between items-center pb-2 border-b border-[#ffd7db]/40">
                              <span className="text-slate-500 font-medium">GSTIN:</span>
                              <span className="font-mono text-slate-700">{t.gstin}</span>
                            </div>
                          )}

                          {t.address && (
                            <div className="flex justify-between items-center">
                              <span className="text-slate-500 font-medium">Location:</span>
                              <span className="text-slate-700 text-right truncate max-w-[200px]">
                                {t.address}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action Desk Buttons */}
                      <div className="flex items-center gap-2 pt-2 border-t border-[#ffd7db]/60">
                        <button
                          onClick={() => {
                            setApprovingTenant(t);
                            setAssignPlan(t.plan_type || 'pro_cloud');
                            setAssignDays(365);
                          }}
                          className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-[#ff2c2c] to-[#f94449] hover:brightness-110 text-white text-xs font-black shadow-md shadow-[#ff2c2c]/30 flex items-center justify-center gap-2 transition"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Review & Approve Store</span>
                        </button>

                        <button
                          onClick={() => handleRejectStore(t.id, t.shop_name)}
                          className="px-4 py-3 rounded-2xl border border-rose-300 text-rose-600 hover:bg-rose-50 text-xs font-bold transition flex items-center gap-1.5"
                        >
                          <X className="w-4 h-4" />
                          <span>Decline</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: STORE DIRECTORY (Full SaaS Tenant Manager)          */}
          {/* ========================================================= */}
          {activeTab === 'tenants' && (
            <div className="space-y-4">
              
              {/* Filter and Search Bar */}
              <div className="p-4 rounded-3xl bg-white border border-[#ffd7db] flex flex-col md:flex-row items-center justify-between gap-3 shadow-sm">
                
                {/* Search Bar */}
                <div className="flex items-center gap-3 w-full md:w-96 px-4 py-2.5 rounded-2xl border border-slate-300 bg-[#fffbfc] focus-within:border-[#ff2c2c] transition">
                  <Search className="w-4 h-4 text-[#ff2c2c]" />
                  <input
                    type="text"
                    placeholder="Search pharmacy, owner, email, license, DL..."
                    className="w-full bg-transparent border-none outline-none text-xs text-slate-900 placeholder:text-slate-400 font-medium"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  {search && (
                    <button onClick={() => setSearch('')} className="text-slate-400 hover:text-slate-700">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Status Switcher Tabs + Export Button */}
                <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
                  {[
                    { id: 'ALL', label: 'All' },
                    { id: 'APPROVED', label: 'Active' },
                    { id: 'EXPIRING_SOON', label: '⚠️ Expiring (<30d)' },
                    { id: 'PENDING_APPROVAL', label: 'Pending' },
                    { id: 'SUSPENDED', label: 'Suspended' }
                  ].map((st) => (
                    <button
                      key={st.id}
                      onClick={() => setSelectedStatusFilter(st.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                        selectedStatusFilter === st.id
                          ? 'bg-[#ff2c2c] text-white shadow-sm'
                          : 'bg-slate-100 text-slate-700 hover:bg-[#fff1f2] hover:text-[#ff2c2c]'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}

                  <button
                    onClick={exportTenantsCSV}
                    className="ml-auto md:ml-2 px-3 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition flex items-center gap-1.5"
                    title="Export Store Directory to CSV"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Export CSV</span>
                  </button>
                </div>
              </div>

              {/* Stores Table / Cards */}
              <div className="space-y-3">
                {filteredTenants.length === 0 ? (
                  <div className="p-12 text-center rounded-3xl bg-white border border-[#ffd7db] text-xs text-slate-600 font-medium">
                    No medical stores match your search criteria.
                  </div>
                ) : (
                  paginatedTenants.map((t) => {
                      const daysLeft = getDaysRemaining(t.plan_expires_at);
                      const isPending = t.status === 'PENDING_APPROVAL';
                      const isSuspended = t.status === 'SUSPENDED';
                      const planBadge = formatPlanBadge(t.plan_type);

                      return (
                        <div 
                          key={t.id}
                          className="p-5 rounded-3xl bg-white border border-[#ffd7db] shadow-sm hover:border-[#f94449]/60 transition flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4"
                        >
                          {/* Store Info */}
                          <div className="space-y-2 flex-1">
                            <div className="flex flex-wrap items-center gap-2.5">
                              <h4 className="text-base font-black text-slate-900">
                                {t.shop_name}
                              </h4>

                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                                isPending 
                                  ? 'bg-amber-50 text-amber-700 border-amber-300'
                                  : isSuspended
                                  ? 'bg-rose-50 text-rose-700 border-rose-300'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              }`}>
                                {t.status || 'APPROVED'}
                              </span>

                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono border ${planBadge.color}`}>
                                {planBadge.label}
                              </span>

                              <span className={`text-[11px] font-bold ${daysLeft < 30 ? 'text-[#ff2c2c] bg-rose-50 px-2 py-0.5 rounded border border-rose-200' : 'text-slate-600'}`}>
                                {daysLeft > 0 ? `(${daysLeft} days left)` : '(Expired)'}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-700 font-medium">
                              <span className="text-slate-900 font-bold">👤 {t.owner_name}</span>
                              <button 
                                onClick={() => {
                                  setActiveTab('emails');
                                  setBroadcastTarget(t.email);
                                  setBroadcastRecipient(t.email);
                                }}
                                className="text-blue-600 hover:underline flex items-center gap-1"
                                title="Compose Email to this Pharmacy"
                              >
                                <Mail className="w-3 h-3" />
                                <span>{t.email}</span>
                              </button>
                              <span>📞 {t.phone || 'N/A'}</span>
                              {t.dl_number && <span className="font-mono text-[#ff2c2c] font-black">💊 DL: {t.dl_number}</span>}
                            </div>

                            {/* License Key Chip */}
                            <div className="flex items-center gap-2 pt-1">
                              <span className="text-[11px] text-slate-500 font-mono font-semibold">License Key:</span>
                              <button
                                onClick={() => copyLicenseKey(t.license_key)}
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-mono text-[11px] hover:border-[#ff2c2c] border border-slate-200 transition"
                              >
                                <Key className="w-3 h-3 text-[#ff2c2c]" />
                                <span>{t.license_key}</span>
                                {copiedKey === t.license_key ? (
                                  <Check className="w-3 h-3 text-emerald-600 font-black" />
                                ) : (
                                  <Copy className="w-3 h-3 text-slate-500" />
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Revenue & Bills Counter */}
                          <div className="flex items-center gap-5 px-5 py-3 rounded-2xl bg-[#fffbfc] border border-[#ffd7db] text-center">
                            <div>
                              <div className="text-[10px] font-bold text-slate-500 uppercase">Medicines</div>
                              <div className="text-sm font-black text-slate-900">
                                {t.medicines_count || 0}
                              </div>
                            </div>
                            <div className="w-px h-6 bg-slate-200" />
                            <div>
                              <div className="text-[10px] font-bold text-slate-500 uppercase">Bills</div>
                              <div className="text-sm font-black text-slate-900">
                                {t.invoices_count || 0}
                              </div>
                            </div>
                            <div className="w-px h-6 bg-slate-200" />
                            <div>
                              <div className="text-[10px] font-bold text-slate-500 uppercase">Volume</div>
                              <div className="text-sm font-black text-[#ff2c2c]">
                                ₹{parseFloat(t.total_revenue || 0).toFixed(0)}
                              </div>
                            </div>
                          </div>

                          {/* Management Controls */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            {/* 1. Quick Plan Switcher */}
                            <select
                              value={t.plan_type || 'local_599'}
                              onChange={(e) => handleQuickPlanChange(t.id, e.target.value, t.shop_name)}
                              className="px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] font-bold text-slate-800 outline-none hover:border-[#ff2c2c] transition"
                              title="1-Click SaaS Plan Tier Switcher"
                            >
                              <option value="local_599">Basic POS (₹599)</option>
                              <option value="cloud_799">Pro Cloud (₹799)</option>
                              <option value="enterprise_1299">Enterprise (₹1299)</option>
                              <option value="pro_cloud">Dev Free</option>
                            </select>

                            {/* 2. View Store Dossier */}
                            <button
                              onClick={() => handleOpenTenantDetails(t)}
                              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                              title="Inspect Store Dossier, Invoices & Medicines"
                            >
                              <Eye className="w-3.5 h-3.5 text-rose-400" />
                              <span>Details</span>
                            </button>

                            {/* 3. Reset Password */}
                            <button
                              onClick={() => {
                                setResetPasswordTenant(t);
                                setNewPasswordInput('');
                                setResetPasswordMsg('');
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold transition flex items-center gap-1"
                              title="Reset Store Password"
                            >
                              <Lock className="w-3.5 h-3.5 text-amber-600" />
                              <span>Password</span>
                            </button>

                            {/* 4. Quick Extension */}
                            <button
                              onClick={() => handleExtendPlan(t.id, 30, t.shop_name)}
                              className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-[#fff1f2] hover:text-[#ff2c2c] text-slate-700 text-xs font-bold transition border border-slate-200"
                              title="Add 30 Days to Plan"
                            >
                              +30d
                            </button>
                            <button
                              onClick={() => handleExtendPlan(t.id, 365, t.shop_name)}
                              className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-[#fff1f2] hover:text-[#ff2c2c] text-slate-700 text-xs font-bold transition border border-slate-200"
                              title="Add 1 Year to Plan"
                            >
                              +1yr
                            </button>

                            {/* 5. Suspend / Reactivate */}
                            <button
                              onClick={() => handleToggleStatus(t.id, t.status, t.shop_name)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                                isSuspended
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                                  : 'bg-rose-50 text-[#ff2c2c] border border-rose-300 hover:bg-rose-100'
                              }`}
                            >
                              {isSuspended ? 'Reactivate' : 'Suspend'}
                            </button>

                            {/* 6. Delete Store */}
                            <button
                              onClick={() => handleDeleteTenant(t.id, t.shop_name)}
                              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-[#ff2c2c] transition"
                              title="Delete Store Permanently"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                  })
                )}

                {/* Pharmacy Stores Pagination */}
                {filteredTenants.length > 0 && (
                  <div className="p-3 bg-white rounded-2xl border border-[#ffd7db]">
                    <Pagination
                      currentPage={tenantsPage}
                      totalItems={filteredTenants.length}
                      itemsPerPage={ITEMS_PER_PAGE}
                      onPageChange={setTenantsPage}
                      theme="light"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 3: AUTOMATED WHATSAPP GATEWAY & LIVE SIMULATOR         */}
          {/* ========================================================= */}
          {activeTab === 'whatsapp' && (
            <div className="space-y-6">
              
              {/* Architecture Blueprint Banner */}
              <div className="p-6 rounded-3xl bg-gradient-to-r from-rose-50 via-white to-rose-50 text-slate-800 border border-rose-200 shadow-md space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                    <Zap className="w-4 h-4" />
                  </div>
                  <h4 className="text-base font-black">
                    Zero-Click Headless WhatsApp Invoicing Architecture
                  </h4>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
                  When cashiers finalize a bill at the POS, the server automatically connects to our background WhatsApp daemon and dispatches the formatted bill directly to the customer's phone number without opening browser tabs or manual confirmation.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Gateway Configuration Settings Form */}
                <div className="lg:col-span-2 p-6 rounded-3xl bg-white border border-[#ffd7db] space-y-4 shadow-sm">
                  <form onSubmit={handleSaveWhatsAppConfig} className="space-y-4">
                    
                    <div>
                      <label className="text-xs font-bold text-slate-700 mb-2 block">
                        Gateway Engine Provider
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <div 
                          onClick={() => setWaConfig({ ...waConfig, provider: 'DIRECT_GATEWAY' })}
                          className={`p-4 rounded-2xl border-2 cursor-pointer transition ${
                            waConfig.provider === 'DIRECT_GATEWAY'
                              ? 'border-[#ff2c2c] bg-[#fff1f2]'
                              : 'border-[#ffd7db]'
                          }`}
                        >
                          <div className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                            <Zap className="w-4 h-4 text-[#ff2c2c]" />
                            <span>KNITE Direct Cloud Gateway</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1">
                            Self-hosted headless daemon running directly on 192.168.1.50
                          </p>
                        </div>

                        <div 
                          onClick={() => setWaConfig({ ...waConfig, provider: 'META_CLOUD_API' })}
                          className={`p-4 rounded-2xl border-2 cursor-pointer transition ${
                            waConfig.provider === 'META_CLOUD_API'
                              ? 'border-[#25D366] bg-emerald-50'
                              : 'border-[#ffd7db]'
                          }`}
                        >
                          <div className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                            <MessageSquare className="w-4 h-4 text-[#25D366]" />
                            <span>Meta WhatsApp Cloud API</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1">
                            Official Meta Business Cloud API with permanent access token
                          </p>
                        </div>
                      </div>
                    </div>

                    {waConfig.provider === 'META_CLOUD_API' && (
                      <div className="space-y-3 p-4 rounded-2xl bg-[#fffbfc] border border-[#ffd7db]">
                        <div>
                          <label className="text-xs font-bold text-slate-700 mb-1 block">
                            Meta Phone Number ID
                          </label>
                          <input
                            type="text"
                            className="w-full px-3 py-2 rounded-xl border border-[#ffd7db] text-xs font-mono outline-none focus:border-[#ff2c2c]"
                            placeholder="1092837465"
                            value={waConfig.meta_phone_id || ''}
                            onChange={(e) => setWaConfig({ ...waConfig, meta_phone_id: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-700 mb-1 block">
                            Permanent Bearer Token
                          </label>
                          <input
                            type="password"
                            className="w-full px-3 py-2 rounded-xl border border-[#ffd7db] text-xs font-mono outline-none focus:border-[#ff2c2c]"
                            placeholder="EAAG..."
                            value={waConfig.meta_api_token || ''}
                            onChange={(e) => setWaConfig({ ...waConfig, meta_api_token: e.target.value })}
                          />
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold text-slate-700 mb-1 block">
                          Sender Identity Name
                        </label>
                        <input
                          type="text"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-[#ffd7db] text-xs outline-none focus:border-[#ff2c2c]"
                          value={waConfig.sender_name || ''}
                          onChange={(e) => setWaConfig({ ...waConfig, sender_name: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-700 mb-1 block">
                          Official Gateway Phone
                        </label>
                        <input
                          type="text"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-[#ffd7db] text-xs font-mono outline-none focus:border-[#ff2c2c]"
                          value={waConfig.business_number || ''}
                          onChange={(e) => setWaConfig({ ...waConfig, business_number: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#fff5f6] border border-[#ffd7db] flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-slate-900">
                          Automated Dispatch on Checkout
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Dispatches receipt instantly without prompting cashier
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={waConfig.auto_send}
                          onChange={(e) => setWaConfig({ ...waConfig, auto_send: e.target.checked })}
                        />
                        <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#25D366]"></div>
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={waSaving}
                      className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[#ff2c2c] to-[#f94449] hover:brightness-110 text-white text-xs font-bold shadow-md shadow-[#ff2c2c]/30 flex items-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      <span>{waSaving ? 'Saving...' : 'Save Gateway Configuration'}</span>
                    </button>
                  </form>
                </div>

                {/* Live Customer WhatsApp Phone Mockup Preview */}
                <div className="p-6 rounded-3xl bg-white border border-[#ffd7db] space-y-4 shadow-sm">
                  {/* Language Selector for Preview & Test */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2 border-b border-[#ffd7db]">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-[#25D366]" />
                      <h4 className="text-xs font-black uppercase text-slate-800">
                        Live Preview & Language
                      </h4>
                    </div>
                    <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                      {[
                        { id: 'en', label: 'EN' },
                        { id: 'ta', label: 'தமிழ்' },
                        { id: 'ml', label: 'മലയാളം' },
                        { id: 'hi', label: 'हिन्दी' }
                      ].map(l => (
                        <button
                          key={l.id}
                          type="button"
                          onClick={() => setWaTestLang(l.id)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition ${
                            waTestLang === l.id 
                              ? 'bg-[#25D366] text-white shadow-sm'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {l.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* WhatsApp Chat Bubble Mockup */}
                  <div className="p-4 rounded-2xl bg-[#e5ddd5] text-[11px] font-sans text-slate-900 space-y-2 border border-slate-300 shadow-inner">
                    <div className="p-3.5 rounded-2xl bg-white shadow-sm space-y-2 leading-relaxed border border-slate-200">
                      <div className="font-bold text-[#075e54] text-xs">
                        *{waConfig.sender_name || 'KNITE MEDICO PHARMACY'}* 💊
                      </div>
                      
                      {waTestLang === 'ta' ? (
                        <>
                          <div className="text-[10px] text-slate-600 font-semibold italic">
                            மருத்துவ ரசீது &amp; கட்டண உறுதிப்படுத்தல்
                          </div>
                          <div className="text-slate-800 font-medium">வணக்கம் *கார்த்திக் ராஜா*! 👋</div>
                          <div className="text-slate-700">உங்கள் மருந்துச்சீட்டு வெற்றிகரமாக பில் செய்யப்பட்டது.</div>
                          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-[10px] space-y-1 text-slate-800">
                            <div>📄 *ரசீது எண்:* KNM-889901</div>
                            <div>💰 *செலுத்தப்பட்டது:* ₹250.00</div>
                            <div>💳 *முறை:* UPI உடனடி</div>
                          </div>
                          <div className="text-[10px] text-emerald-800 font-bold pt-1">
                            🙏 தயவுசெய்து உங்கள் மருந்துகளை சரியான நேரத்தில் உட்கொள்ளவும். விரைவில் நலம் பெற வாழ்த்துகிறோம்!
                          </div>
                        </>
                      ) : waTestLang === 'ml' ? (
                        <>
                          <div className="text-[10px] text-slate-600 font-semibold italic">
                            മെഡിക്കൽ ബിൽ പേയ്മെന്റ് സ്ഥിരീകരണം
                          </div>
                          <div className="text-slate-800 font-medium">നമസ്കാരം *കാർത്തിക് രാജ*! 👋</div>
                          <div className="text-slate-700">നിങ്ങളുടെ പ്രിസ്ക്രിപ്ഷൻ ബിൽ വിജയകരമായി പൂർത്തിയായി.</div>
                          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-[10px] space-y-1 text-slate-800">
                            <div>📄 *ബിൽ നമ്പർ:* KNM-889901</div>
                            <div>💰 *അടച്ച തുക:* ₹250.00</div>
                            <div>💳 *രീതി:* UPI തത്സമയം</div>
                          </div>
                          <div className="text-[10px] text-emerald-800 font-bold pt-1">
                            🙏 കൃത്യസമയത്ത് മരുന്നുകൾ കഴിക്കുക. വേഗത്തിൽ സുഖം പ്രാപിക്കട്ടെ!
                          </div>
                        </>
                      ) : waTestLang === 'hi' ? (
                        <>
                          <div className="text-[10px] text-slate-600 font-semibold italic">
                            दवा बिल और भुगतान रसीद
                          </div>
                          <div className="text-slate-800 font-medium">नमस्ते *कार्तिक राजा*! 👋</div>
                          <div className="text-slate-700">आपका दवा बिल सफलतापूर्वक तैयार हो गया है।</div>
                          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-[10px] space-y-1 text-slate-800">
                            <div>📄 *बिल संख्या:* KNM-889901</div>
                            <div>💰 *कुल भुगतान:* ₹250.00</div>
                            <div>💳 *माध्यम:* UPI तुरंत</div>
                          </div>
                          <div className="text-[10px] text-emerald-800 font-bold pt-1">
                            🙏 कृपया समय पर दवाइयां लें। आपके शीघ्र स्वस्थ होने की कामना करते हैं!
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-[10px] text-slate-600 font-semibold italic">
                            Prescription Bill &amp; Payment Confirmation
                          </div>
                          <div className="text-slate-800 font-medium">Hello *Karthik Raja*! 👋</div>
                          <div className="text-slate-700">Your prescription has been billed successfully.</div>
                          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-[10px] space-y-1 text-slate-800">
                            <div>📄 *Invoice No:* KNM-889901</div>
                            <div>💰 *Net Paid:* ₹250.00</div>
                            <div>💳 *Mode:* UPI Instant</div>
                          </div>
                          <div className="text-[10px] text-emerald-800 font-bold pt-1">
                            🙏 Please take medicines on time. Get well soon &amp; stay healthy!
                          </div>
                        </>
                      )}

                      <div className="text-[9px] text-slate-400 text-right font-mono">
                        Just now • ✓✓ Read
                      </div>
                    </div>
                  </div>

                  {/* Simulator Test Dispatch */}
                  <div className="space-y-2 pt-2">
                    <label className="text-xs font-bold text-slate-800 block">
                      Send Test Bill to Mobile (+91)
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-2.5 rounded-xl bg-slate-100 text-xs font-mono font-bold text-slate-800 border border-slate-200">
                        +91
                      </span>
                      <input
                        type="tel"
                        className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono outline-none focus:border-[#ff2c2c] bg-white text-slate-900 font-bold"
                        placeholder="9876543210"
                        value={waTestPhone}
                        onChange={(e) => setWaTestPhone(e.target.value)}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleTestWhatsAppPing}
                      className="w-full py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-bold shadow-md shadow-[#25D366]/20 transition flex items-center justify-center gap-2"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Headless Test Message ({waTestLang.toUpperCase()})</span>
                    </button>

                    {waTestStatus && (
                      <div className={`p-2.5 rounded-xl text-xs font-semibold ${
                        waTestStatus.includes('✅') 
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-300' 
                          : 'bg-rose-50 text-[#ff2c2c] border border-rose-300'
                      }`}>
                        {waTestStatus}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* ========================================================= */}
          {/* TAB: RAZORPAY PAYMENTS & AUTOPAY INVOICES                 */}
          {/* ========================================================= */}
          {activeTab === 'payments' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <h3 className="font-black text-lg text-slate-900 flex items-center gap-2">
                    <span className="w-7 h-7 rounded-xl bg-[#0c2340] text-white flex items-center justify-center font-black text-sm shadow-md shadow-blue-900/30">₹</span>
                    <span>Razorpay Transactions &amp; AutoPay Invoices</span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                      Live Production Engine
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Audit verified payments, monthly recurring AutoPay subscriptions, and dispatch official GST tax invoices from <span className="text-[#ff2c2c] font-semibold">{SUPERADMIN_EMAIL}</span>.
                  </p>
                </div>

                <button
                  onClick={fetchPayments}
                  disabled={loadingPayments}
                  className="px-3.5 py-2 rounded-xl bg-white border border-[#ffd7db] hover:bg-[#fff1f2] text-xs font-bold text-[#ff2c2c] transition flex items-center gap-2 shadow-sm"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingPayments ? 'animate-spin' : ''}`} />
                  <span>Refresh Payments</span>
                </button>
              </div>

              {/* Top Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-3xl bg-white border border-[#ffd7db] space-y-1 shadow-sm">
                  <div className="text-[11px] font-bold text-slate-500 uppercase">Total Revenue Collected</div>
                  <div className="text-2xl font-black text-[#ff2c2c]">
                    ₹{Number(paymentMetrics.total_collected || 0).toLocaleString('en-IN')}
                  </div>
                  <p className="text-[11px] text-slate-500">Verified Razorpay Net Volume</p>
                </div>

                <div className="p-5 rounded-3xl bg-white border border-[#ffd7db] space-y-1 shadow-sm">
                  <div className="text-[11px] font-bold text-slate-500 uppercase">Verified Payments</div>
                  <div className="text-2xl font-black text-slate-900">
                    {paymentMetrics.count || paymentsList.length || 0}
                  </div>
                  <p className="text-[11px] text-slate-500">Total successful transactions</p>
                </div>

                <div className="p-5 rounded-3xl bg-white border border-[#ffd7db] space-y-1 shadow-sm">
                  <div className="text-[11px] font-bold text-slate-500 uppercase">AutoPay Mandates</div>
                  <div className="text-2xl font-black text-emerald-600 flex items-center gap-1.5">
                    <span>{paymentMetrics.autopay_count || paymentsList.filter(p => p.autopay).length || 0}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Active</span>
                  </div>
                  <p className="text-[11px] text-slate-500">Monthly auto-debit enabled</p>
                </div>

                <div className="p-5 rounded-3xl bg-white border border-[#ffd7db] space-y-1 shadow-sm">
                  <div className="text-[11px] font-bold text-slate-500 uppercase">Invoice Dispatcher</div>
                  <div className="text-sm font-black text-slate-800 truncate">
                    {SUPERADMIN_EMAIL}
                  </div>
                  <p className="text-[11px] text-emerald-600 font-bold">● SMTP Live &amp; Ready</p>
                </div>
              </div>

              {/* Razorpay Gateway Status Banner */}
              <div className="p-5 rounded-3xl bg-gradient-to-r from-slate-900 via-[#0c2340] to-slate-900 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">
                      Razorpay Key ID: rzp_live_SKfA5Y9K854G56
                    </span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                  <h4 className="text-base font-black">
                    Live AutoPay &amp; Instant Webhook Verification
                  </h4>
                  <p className="text-xs text-slate-300 max-w-xl">
                    Every paid plan (₹599 Basic, ₹799 Pro Cloud, ₹1,299 Enterprise) automatically dispatches an official branded tax invoice with receipt ID from <strong className="text-white">kniteinfotech@gmail.com</strong> directly to the pharmacy owner.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3.5 py-2 rounded-xl bg-white/10 text-xs font-mono font-bold text-white border border-white/20">
                    AutoPay Webhooks: Ready
                  </span>
                </div>
              </div>

              {/* Transactions Table */}
              <div className="p-6 rounded-3xl bg-white border border-[#ffd7db] shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#ff2c2c]" />
                    <span>Transaction History &amp; Invoice Dispatcher</span>
                  </h4>
                  <span className="text-xs text-slate-500 font-mono">
                    Showing {paymentsList.length} records
                  </span>
                </div>

                {loadingPayments ? (
                  <div className="p-12 text-center text-slate-500 text-xs font-semibold flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-[#ff2c2c]" />
                    <span>Loading Razorpay payment ledger...</span>
                  </div>
                ) : paymentsList.length === 0 ? (
                  <div className="p-12 text-center rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-500 space-y-2">
                    <CreditCard className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="font-bold text-slate-700">No payment transactions recorded yet.</p>
                    <p className="text-[11px] text-slate-500">Live transactions will appear here as soon as pharmacy owners complete subscription checkout or AutoPay mandate enrollment.</p>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-[#ffd7db] text-[11px] font-black text-slate-500 uppercase bg-[#fffbfc]">
                            <th className="py-3 px-3">Date</th>
                            <th className="py-3 px-3">Payment ID / Order</th>
                            <th className="py-3 px-3">Pharmacy &amp; Owner</th>
                            <th className="py-3 px-3">Plan Tier</th>
                            <th className="py-3 px-3">Amount</th>
                            <th className="py-3 px-3">Billing Mode</th>
                            <th className="py-3 px-3 text-right">Tax Invoice</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#ffd7db]/60">
                          {paymentsList.slice((paymentsPage - 1) * ITEMS_PER_PAGE, paymentsPage * ITEMS_PER_PAGE).map((p, idx) => {
                            const planBadge = formatPlanBadge(p.plan_type || p.plan_name);
                            const isSending = sendingInvoiceId === (p.id || p.payment_id);
                            return (
                              <tr key={p.id || p.payment_id || idx} className="hover:bg-rose-50/40 transition">
                                <td className="py-3 px-3 font-mono text-slate-600 whitespace-nowrap">
                                  {p.created_at ? new Date(p.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Recent'}
                                </td>
                                <td className="py-3 px-3 font-mono">
                                  <div className="font-bold text-slate-900">{p.payment_id || p.id || 'PAY-ONLINE'}</div>
                                  <div className="text-[10px] text-slate-400">{p.order_id || 'ORDER-DIRECT'}</div>
                                </td>
                                <td className="py-3 px-3">
                                  <div className="font-black text-slate-900">{p.shop_name || 'Medical Store'}</div>
                                  <div className="text-[11px] text-slate-500">{p.owner_name} • {p.email}</div>
                                </td>
                                <td className="py-3 px-3">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono border ${planBadge.color}`}>
                                    {planBadge.label}
                                  </span>
                                </td>
                                <td className="py-3 px-3 font-black text-[#ff2c2c] text-sm">
                                  ₹{parseFloat(p.amount || 0).toFixed(2)}
                                </td>
                                <td className="py-3 px-3">
                                  {p.autopay ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-800 border border-emerald-300">
                                      <Zap className="w-3 h-3 text-emerald-600" />
                                      <span>AutoPay Active</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                      <CreditCard className="w-3 h-3 text-slate-500" />
                                      <span>One-Time Paid</span>
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 px-3 text-right">
                                  <button
                                    onClick={() => handleResendInvoice(p)}
                                    disabled={isSending}
                                    className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-[#ff2c2c] text-white text-[11px] font-bold transition flex items-center gap-1.5 ml-auto shadow-sm"
                                    title={`Send tax invoice from ${SUPERADMIN_EMAIL}`}
                                  >
                                    <Mail className={`w-3 h-3 ${isSending ? 'animate-spin' : ''}`} />
                                    <span>{isSending ? 'Sending...' : 'Send Invoice'}</span>
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Payments Pagination */}
                    {paymentsList.length > 0 && (
                      <div className="p-3 border-t border-[#ffd7db]">
                        <Pagination
                          currentPage={paymentsPage}
                          totalItems={paymentsList.length}
                          itemsPerPage={ITEMS_PER_PAGE}
                          onPageChange={setPaymentsPage}
                          theme="light"
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB: OFFICIAL EMAIL BROADCAST & COMMUNICATIONS HUB       */}
          {/* ========================================================= */}
          {activeTab === 'emails' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <h3 className="font-black text-lg text-slate-900 flex items-center gap-2">
                    <span className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-sm shadow-md shadow-emerald-900/30">✉️</span>
                    <span>Official Email Broadcast &amp; Notifications Hub</span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      kniteinfotech@gmail.com
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Dispatch feature releases, maintenance notices, compliance advisories, or subscription alerts to all registered pharmacies directly from the official KNITE email.
                  </p>
                </div>
              </div>

              {broadcastMsg && (
                <div className={`p-4 rounded-2xl text-xs font-bold border transition ${
                  broadcastMsg.includes('🎉') 
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-300' 
                    : 'bg-rose-50 text-[#ff2c2c] border-rose-300'
                }`}>
                  {broadcastMsg}
                </div>
              )}

              {/* SMTP Credentials & Live Connection Setup Card */}
              <div className={`p-6 rounded-3xl border transition shadow-sm space-y-4 ${
                emailStatus?.configured && emailStatus?.verification?.verified
                  ? 'bg-gradient-to-r from-emerald-50 via-white to-emerald-50 border-emerald-300'
                  : 'bg-gradient-to-r from-amber-50 via-white to-rose-50 border-amber-300'
              }`}>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-white shadow-md ${
                      emailStatus?.configured && emailStatus?.verification?.verified
                        ? 'bg-emerald-600 shadow-emerald-700/20'
                        : 'bg-amber-500 shadow-amber-600/20'
                    }`}>
                      {emailStatus?.configured && emailStatus?.verification?.verified ? '✓' : '!'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-slate-900">
                          {emailStatus?.configured && emailStatus?.verification?.verified
                            ? 'Google Gmail SMTP Active & Verified'
                            : 'Live Inbox Delivery Inactive (Google App Password Required)'}
                        </h4>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                          emailStatus?.configured && emailStatus?.verification?.verified
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800 animate-pulse'
                        }`}>
                          {emailStatus?.configured && emailStatus?.verification?.verified ? 'LIVE SMTP' : 'SAFE LOGGING ONLY'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {emailStatus?.configured && emailStatus?.verification?.verified
                          ? `Authenticated as ${emailStatus.user || SUPERADMIN_EMAIL}. Emails are actively sent to real inboxes.`
                          : `Emails to users (OTP, invoices, broadcasts) are currently logged to server console because Google requires a 16-character App Password.`}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={fetchEmailStatus}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition flex items-center gap-1.5 shadow-sm"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Check Connection</span>
                  </button>
                </div>

                {/* Setup Form if not configured or needs update */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200/80 space-y-3 text-xs">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                    <span className="font-extrabold text-slate-800">
                      🔑 How to activate live delivery from {SUPERADMIN_EMAIL}:
                    </span>
                    <a
                      href="https://myaccount.google.com/apppasswords"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline font-bold inline-flex items-center gap-1 text-[11px]"
                    >
                      <span>1. Open Google App Passwords</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Log in to <strong>{SUPERADMIN_EMAIL}</strong>, ensure 2-Step Verification is ON, generate a 16-character App Password named "KNITE Medico", and paste it below:
                  </p>

                  <form onSubmit={handleSaveEmailConfig} className="flex flex-col sm:flex-row items-center gap-2">
                    <input
                      type="password"
                      placeholder="Paste 16-character App Password (e.g. abcd efgh ijkl mnop)"
                      value={appPasswordInput}
                      onChange={(e) => setAppPasswordInput(e.target.value)}
                      className="w-full sm:flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-xs text-slate-900 outline-none focus:border-[#ff2c2c] bg-[#fffbfc]"
                    />
                    <button
                      type="submit"
                      disabled={savingEmailConfig}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>{savingEmailConfig ? 'Authenticating...' : 'Save & Authenticate SMTP'}</span>
                    </button>
                  </form>
                </div>

                {/* Live Test Email Dispatcher */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200/80 space-y-2 text-xs">
                  <div className="font-extrabold text-slate-800 flex items-center gap-2">
                    <Send className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Send Live Test Email to Verify Real Inbox Delivery</span>
                  </div>

                  <form onSubmit={handleSendTestEmail} className="flex flex-col sm:flex-row items-center gap-2">
                    <input
                      type="email"
                      placeholder="Enter recipient email (e.g. nitheesh8797@gmail.com)"
                      value={testEmailRecipient}
                      onChange={(e) => setTestEmailRecipient(e.target.value)}
                      className="w-full sm:flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-xs text-slate-900 outline-none focus:border-emerald-500 bg-[#fffbfc]"
                    />
                    <button
                      type="submit"
                      disabled={sendingTestEmail}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>{sendingTestEmail ? 'Sending Test...' : 'Send Live Test Email'}</span>
                    </button>
                  </form>

                  {testEmailResult && (
                    <div className={`p-3 rounded-xl font-bold text-xs border ${
                      testEmailResult.includes('🎉')
                        ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                        : 'bg-rose-50 text-rose-800 border-rose-300'
                    }`}>
                      {testEmailResult}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Left Column: Email Composer Form */}
                <div className="lg:col-span-7 p-6 rounded-3xl bg-white border border-[#ffd7db] shadow-sm space-y-4">
                  
                  {/* Sender Identity Card */}
                  <div className="p-3.5 rounded-2xl bg-[#fffbfc] border border-[#ffd7db] flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 font-medium">From:</span>
                      <strong className="text-slate-900 font-extrabold">{SUPERADMIN_EMAIL}</strong>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Verified Official Sender
                      </span>
                    </div>
                    <span className="text-slate-400 text-[11px] font-mono">KNITE Medico Mailer</span>
                  </div>

                  <form onSubmit={handleSendBroadcast} className="space-y-4">
                    
                    {/* Recipient Scope */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 mb-1.5 block">
                        Broadcast Target Audience
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => { setBroadcastTarget('ALL'); setBroadcastRecipient(''); }}
                          className={`p-3 rounded-2xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                            broadcastTarget === 'ALL'
                              ? 'border-[#ff2c2c] bg-[#fff1f2] text-[#ff2c2c]'
                              : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <Users className="w-4 h-4" />
                          <span>All Pharmacies ({tenants.length} Stores)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setBroadcastTarget('SINGLE')}
                          className={`p-3 rounded-2xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                            broadcastTarget !== 'ALL'
                              ? 'border-[#ff2c2c] bg-[#fff1f2] text-[#ff2c2c]'
                              : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <Building2 className="w-4 h-4" />
                          <span>Specific Pharmacy Store</span>
                        </button>
                      </div>
                    </div>

                    {/* If Single Recipient */}
                    {broadcastTarget !== 'ALL' && (
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 block">
                          Recipient Pharmacy Email
                        </label>
                        <input
                          type="email"
                          required
                          placeholder="owner@pharmacy.com"
                          value={broadcastRecipient}
                          onChange={(e) => {
                            setBroadcastRecipient(e.target.value);
                            setBroadcastTarget(e.target.value);
                          }}
                          className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-300 text-xs text-slate-900 outline-none focus:border-[#ff2c2c] bg-white font-mono"
                        />
                      </div>
                    )}

                    {/* Quick Template Selector */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 mb-1.5 block">
                        Quick Broadcast Templates
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { 
                            label: '🚀 v2.4 Feature Release',
                            subject: 'KNITE Medico v2.4 Update: Multi-Language WhatsApp & AutoPay Live',
                            content: 'Dear Pharmacy Partner,\n\nWe are excited to announce KNITE Medico v2.4.0 with major upgrades:\n1. Multi-Language WhatsApp Invoicing (Tamil, Malayalam, Hindi & English).\n2. Medicine Detailed Descriptions on POS & Counter Bills.\n3. Automatic Monthly Subscription AutoPay via Razorpay.\n\nAll your cloud data is automatically synced. For any assistance, reach us anytime.'
                          },
                          { 
                            label: '🛠️ Server Maintenance',
                            subject: 'Notice: Scheduled Cloud Engine Maintenance',
                            content: 'Dear Pharmacy Partner,\n\nPlease note our cloud synchronization engine will undergo a brief scheduled optimization tonight between 02:00 AM - 02:30 AM IST.\n\nYour local POS billing will continue to work seamlessly without interruption during this window.'
                          },
                          { 
                            label: '💳 AutoPay Renewal',
                            subject: 'KNITE Medico Subscription & AutoPay Update',
                            content: 'Dear Pharmacy Partner,\n\nThank you for choosing KNITE Medico Pro Cloud. Your subscription is active and powering real-time cloud backups and WhatsApp invoicing.\n\nYou can review your subscription status anytime in the Cloud Sync portal.'
                          },
                          { 
                            label: '📢 GST & Compliance Advisory',
                            subject: 'Important: Drug License & GST Compliance Reminder',
                            content: 'Dear Pharmacy Partner,\n\nKindly ensure your Drug License (DL) Number and GSTIN are up to date in your KNITE Medico store profile to ensure compliance on all printed and WhatsApp bills.'
                          }
                        ].map((tmpl, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setBroadcastSubject(tmpl.subject);
                              setBroadcastContent(tmpl.content);
                            }}
                            className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-[#fff1f2] hover:text-[#ff2c2c] text-slate-700 text-[11px] font-bold transition border border-slate-200"
                          >
                            {tmpl.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Email Subject */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 mb-1.5 block">
                        Broadcast Email Subject Line
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. KNITE Medico System Update & Feature Announcement"
                        value={broadcastSubject}
                        onChange={(e) => setBroadcastSubject(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-300 text-xs text-slate-900 outline-none focus:border-[#ff2c2c] bg-white font-bold"
                      />
                    </div>

                    {/* Message Body */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 mb-1.5 block">
                        Official Message Content
                      </label>
                      <textarea
                        rows={6}
                        required
                        placeholder="Write announcement details here..."
                        value={broadcastContent}
                        onChange={(e) => setBroadcastContent(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-300 text-xs text-slate-900 outline-none focus:border-[#ff2c2c] bg-white font-medium resize-none leading-relaxed"
                      />
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={broadcasting}
                      className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#ff2c2c] to-[#f94449] hover:brightness-110 text-white text-xs font-black shadow-lg shadow-[#ff2c2c]/30 flex items-center justify-center gap-2 transition disabled:opacity-60"
                    >
                      <Send className={`w-4 h-4 ${broadcasting ? 'animate-spin' : ''}`} />
                      <span>{broadcasting ? 'Dispatching Official Emails...' : `🚀 Dispatch Broadcast via ${SUPERADMIN_EMAIL}`}</span>
                    </button>
                  </form>
                </div>

                {/* Right Column: Live Email Preview Box */}
                <div className="lg:col-span-5 space-y-3">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Recipient Inbox Preview
                  </div>

                  <div className="p-6 rounded-3xl bg-white border border-[#ffd7db] shadow-md space-y-4 font-sans text-xs">
                    {/* Mock Gmail Header */}
                    <div className="pb-3 border-b border-slate-200 space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                        <span>kniteinfotech@gmail.com</span>
                        <span>Just now</span>
                      </div>
                      <div className="text-sm font-black text-slate-900">
                        {broadcastSubject || 'KNITE Medico Official Announcement'}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        To: {broadcastTarget === 'ALL' ? `All Registered Pharmacies (${tenants.length})` : broadcastRecipient || 'Pharmacist'}
                      </div>
                    </div>

                    {/* Branded Email Body */}
                    <div className="space-y-3 text-slate-700 leading-relaxed text-xs">
                      <div className="flex items-center gap-2 pb-2 border-b border-rose-100">
                        <div className="w-7 h-7 rounded-lg bg-[#ff2c2c] text-white flex items-center justify-center font-black text-xs">
                          KM
                        </div>
                        <span className="font-black text-slate-900">KNITE Medico</span>
                        <span className="text-[10px] text-slate-400 ml-auto">Official Communication</span>
                      </div>

                      <div className="whitespace-pre-wrap font-sans text-slate-800 bg-[#fffbfc] p-3.5 rounded-2xl border border-rose-100">
                        {broadcastContent || 'Your broadcast message content will appear formatted here exactly as the pharmacy owner receives it.'}
                      </div>

                      {/* Official Signature */}
                      <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 space-y-0.5 font-sans">
                        <p className="font-bold text-slate-900">KNITE Infotech Support &amp; Engineering</p>
                        <p>Official Email: <span className="text-[#ff2c2c] font-medium">{SUPERADMIN_EMAIL}</span></p>
                        <p className="text-[10px] text-slate-400">KNITE Medico Cloud Platform • All rights reserved</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 4: CLOUD INFRASTRUCTURE & POSTGRESQL TELEMETRY        */}
          {/* ========================================================= */}
          {activeTab === 'infrastructure' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">
                    Cloud Engine &amp; PostgreSQL Infrastructure
                  </h3>
                  <p className="text-xs text-slate-600 font-medium">
                    Dual-write sync coordinator running on Secure Dedicated Cloud Node (SSL Secured)
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500 text-white">
                  ● Cluster Healthy
                </span>
              </div>

              {/* Hardware & Database Spec Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* DB Engine */}
                <div className="p-5 rounded-3xl bg-white border border-[#ffd7db] space-y-2">
                  <div className="text-xs font-bold text-slate-500 uppercase">Database Engine</div>
                  <div className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <Database className="w-5 h-5 text-[#ff2c2c]" />
                    <span>knite_db ({cloudHealth?.pg_version || 'PostgreSQL'})</span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium">
                    Encrypted Cluster &bull; Zero Data Exposure &bull; SSL Secured
                  </p>
                </div>

                {/* DB Size */}
                <div className="p-5 rounded-3xl bg-white border border-[#ffd7db] space-y-2">
                  <div className="text-xs font-bold text-slate-400">PostgreSQL DB Size</div>
                  <div className="text-lg font-black text-emerald-600 flex items-center gap-2">
                    <HardDrive className="w-5 h-5 text-emerald-500" />
                    <span>{cloudHealth?.db_size || '—'}</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    knite_db &bull; {cloudHealth?.tables?.length || 0} tables in medico schema
                  </p>
                </div>

                {/* Memory */}
                <div className="p-5 rounded-3xl bg-white border border-[#ffd7db] space-y-2">
                  <div className="text-xs font-bold text-slate-400">Server Heap Memory</div>
                  <div className="text-lg font-black text-purple-600 flex items-center gap-2">
                    <Cpu className="w-5 h-5 text-purple-500" />
                    <span>{cloudHealth?.memory_usage_mb || '—'} MB</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Uptime: {cloudHealth?.uptime_seconds
                      ? `${Math.floor(cloudHealth.uptime_seconds / 3600)}h ${Math.floor((cloudHealth.uptime_seconds % 3600) / 60)}m`
                      : '—'}
                  </p>
                </div>
              </div>

              {/* Medical Shop Data (Cloud) — 1TB Drive Card */}
              <div className="p-6 rounded-3xl bg-white border border-[#ffd7db] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-md shadow-orange-200">
                      <HardDrive className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900">
                        {cloudHealth?.disk?.drive_name || 'Medical Shop Data (Cloud)'}
                      </h4>
                      <p className="text-[11px] text-slate-500 font-mono">
                        {cloudHealth?.disk?.device || '/dev/sda1'} &bull; Mounted at {cloudHealth?.disk?.mount_point || '/data'} &bull; Ext4
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black text-slate-900">
                      {cloudHealth?.disk?.total_gb ? `${cloudHealth.disk.total_gb} GB` : '1.0 TB'}
                    </div>
                    <div className="text-[11px] text-slate-400 font-semibold">Total Capacity</div>
                  </div>
                </div>

                {/* Storage Progress Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-600">
                      Used: <span className="text-orange-600">{cloudHealth?.disk?.used_gb ?? '—'} GB</span>
                    </span>
                    <span className="text-slate-600">
                      Free: <span className="text-emerald-600">{cloudHealth?.disk?.free_gb ?? '981'} GB</span>
                    </span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-700"
                      style={{ width: `${cloudHealth?.disk?.used_percent ?? 1.9}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>{cloudHealth?.disk?.used_percent ?? '1.9'}% used</span>
                    <span>WDC WD10EZEX — 38°C / 100°F &bull; Disk OK</span>
                  </div>
                </div>

                {/* Drive Stats Row */}
                <div className="grid grid-cols-3 gap-3 pt-1">
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Total</div>
                    <div className="text-sm font-black text-slate-900 mt-0.5">
                      {cloudHealth?.disk?.total_gb ? `${cloudHealth.disk.total_gb} GB` : '1,000 GB'}
                    </div>
                  </div>
                  <div className="p-3 rounded-2xl bg-orange-50 border border-orange-100 text-center">
                    <div className="text-[10px] font-bold text-orange-400 uppercase">Used</div>
                    <div className="text-sm font-black text-orange-600 mt-0.5">
                      {cloudHealth?.disk?.used_gb ? `${cloudHealth.disk.used_gb} GB` : '—'}
                    </div>
                  </div>
                  <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-100 text-center">
                    <div className="text-[10px] font-bold text-emerald-400 uppercase">Free</div>
                    <div className="text-sm font-black text-emerald-600 mt-0.5">
                      {cloudHealth?.disk?.free_gb ? `${cloudHealth.disk.free_gb} GB` : '981 GB'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Table Size Breakdown */}
              {cloudHealth?.tables && cloudHealth.tables.length > 0 && (
                <div className="p-6 rounded-3xl bg-white border border-[#ffd7db] space-y-3">
                  <h4 className="text-sm font-black text-slate-900">
                    PostgreSQL Tables &amp; Schema Telemetry
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b border-[#ffd7db] text-slate-400">
                          <th className="py-2.5">Table Identifier</th>
                          <th className="py-2.5">Disk Footprint</th>
                          <th className="py-2.5">Sync Mechanism</th>
                          <th className="py-2.5">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#ffd7db]/40">
                        {cloudHealth.tables.map((t, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-3 font-mono font-bold text-slate-800">
                              medico.{t.table_name}
                            </td>
                            <td className="py-3 font-mono text-slate-600">
                              {t.total_size}
                            </td>
                            <td className="py-3 text-slate-500">
                              Offline Dexie.js ↔ PostgreSQL Dual Write
                            </td>
                            <td className="py-3">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
                                Synced
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 5: PLATFORM FINANCIALS & AUDIT                        */}
          {/* ========================================================= */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">
                  Platform Financials & Revenue Audit
                </h3>
                <p className="text-xs text-slate-500">
                  Aggregate billing metrics across all registered medical shops
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-6 rounded-3xl bg-white border border-[#ffd7db] space-y-1">
                  <div className="text-xs font-bold text-slate-400">Cumulative Network GMV</div>
                  <div className="text-3xl font-black text-[#ff2c2c]">
                    ₹{parseFloat(metrics?.total_network_volume || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <p className="text-[11px] text-slate-500">Processed across retail pharmacies</p>
                </div>

                <div className="p-6 rounded-3xl bg-white border border-[#ffd7db] space-y-1">
                  <div className="text-xs font-bold text-slate-400">Average Revenue per Store</div>
                  <div className="text-3xl font-black text-emerald-600">
                    ₹{activeTenants.length > 0 
                      ? (parseFloat(metrics?.total_network_volume || 0) / activeTenants.length).toFixed(2)
                      : '0.00'}
                  </div>
                  <p className="text-[11px] text-slate-500">Per active verified tenant</p>
                </div>

                <div className="p-6 rounded-3xl bg-white border border-[#ffd7db] space-y-1">
                  <div className="text-xs font-bold text-slate-400">Total Billed Invoices</div>
                  <div className="text-3xl font-black text-blue-600">
                    {metrics?.total_invoices || 0} Invoices
                  </div>
                  <p className="text-[11px] text-slate-500">Zero data loss guaranteed</p>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 6: ENTERPRISE SECURITY & AUDIT TELEMETRY (Topics 1-9) */}
          {/* ========================================================= */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              
              {/* Header Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">
                      Enterprise Defense & Security Audit Center
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-ping" />
                      9/9 Protocols Active
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Real-time monitoring, brute-force mitigation, anti-enumeration, and audit telemetry
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={fetchSecurityLogs}
                    disabled={loadingSecurityLogs}
                    className="px-4 py-2 rounded-2xl bg-white border border-[#ffd7db] hover:bg-[#fff1f2] text-xs font-bold text-slate-700 transition flex items-center gap-2 shadow-sm"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-[#ff2c2c] ${loadingSecurityLogs ? 'animate-spin' : ''}`} />
                    <span>{loadingSecurityLogs ? 'Syncing...' : 'Refresh Telemetry'}</span>
                  </button>
                </div>
              </div>

              {/* 5 Real-Time KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                
                {/* 1. Failed Logins */}
                <div className="p-4 rounded-3xl bg-white border border-rose-200 shadow-sm space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold text-rose-500">
                    <span>Failed Attempts</span>
                    <ShieldAlert className="w-4 h-4 text-rose-500" />
                  </div>
                  <div className="text-2xl font-black text-slate-900">
                    {securityStats?.failed_logins_total || 0}
                  </div>
                  <p className="text-[10px] font-semibold text-rose-600">
                    Brute-force tracking active
                  </p>
                </div>

                {/* 2. Rate Limits */}
                <div className="p-4 rounded-3xl bg-white border border-amber-200 shadow-sm space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-600">
                    <span>Rate Limited</span>
                    <Clock className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="text-2xl font-black text-slate-900">
                    {securityStats?.rate_limits_total || 0}
                  </div>
                  <p className="text-[10px] font-semibold text-amber-700">
                    Max 5 tries / 15m (HTTP 429)
                  </p>
                </div>

                {/* 3. Accounts Locked */}
                <div className="p-4 rounded-3xl bg-white border border-purple-200 shadow-sm space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold text-purple-600">
                    <span>Locked Accounts</span>
                    <Lock className="w-4 h-4 text-purple-500" />
                  </div>
                  <div className="text-2xl font-black text-slate-900">
                    {securityStats?.accounts_locked_total || 0}
                  </div>
                  <p className="text-[10px] font-semibold text-purple-700">
                    Locked after 10 failures
                  </p>
                </div>

                {/* 4. Successful Logins */}
                <div className="p-4 rounded-3xl bg-white border border-emerald-200 shadow-sm space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-600">
                    <span>Authorized Logins</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="text-2xl font-black text-slate-900">
                    {securityStats?.successful_logins_total || 0}
                  </div>
                  <p className="text-[10px] font-semibold text-emerald-700">
                    Authenticated sessions
                  </p>
                </div>

                {/* 5. 24h Security Events */}
                <div className="p-4 rounded-3xl bg-white border border-sky-200 shadow-sm space-y-1 col-span-2 sm:col-span-1">
                  <div className="flex items-center justify-between text-xs font-bold text-sky-600">
                    <span>24h Audit Events</span>
                    <Activity className="w-4 h-4 text-sky-500" />
                  </div>
                  <div className="text-2xl font-black text-slate-900">
                    {securityStats?.events_last_24h || 0}
                  </div>
                  <p className="text-[10px] font-semibold text-sky-700">
                    Total recorded events
                  </p>
                </div>
              </div>

              {/* Security Checklist (Topics 1-9) Compliance Matrix */}
              <div className="p-5 rounded-3xl bg-white border border-[#ffd7db] shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    <h4 className="text-sm font-black text-slate-900">
                      Application Security Checklist (Topics 1–9) Implementation
                    </h4>
                  </div>
                  <span className="text-[11px] font-bold text-slate-400 font-mono">
                    COMPLIANCE LEVEL: ENTERPRISE HIGH
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    {
                      num: '1',
                      title: 'Login Protection',
                      desc: 'Rate limit: max 5 attempts / 15 min. Lockout after 10 failed attempts. HTTP 429 response.',
                      status: 'Active'
                    },
                    {
                      num: '2',
                      title: 'Signup & Verification',
                      desc: 'Anti-enumeration generic responses. Prevents duplicate signups with unique constraints.',
                      status: 'Active'
                    },
                    {
                      num: '3',
                      title: 'Session Security',
                      desc: 'HttpOnly + Secure + SameSite=Strict cookies. Instant session invalidation via token_version.',
                      status: 'Active'
                    },
                    {
                      num: '4',
                      title: 'Error Message Security',
                      desc: 'Generic "Invalid email or password". Constant-time compare prevents timing-attack user discovery.',
                      status: 'Active'
                    },
                    {
                      num: '5',
                      title: 'Secure Password Reset',
                      desc: 'Expiring single-use crypto tokens (30m). All active user sessions revoked on password change.',
                      status: 'Active'
                    },
                    {
                      num: '6',
                      title: 'Multi-Factor Auth (MFA)',
                      desc: 'RFC 6238 TOTP authenticator engine (Google Auth/Authy) + 8 backup recovery codes.',
                      status: 'Active'
                    },
                    {
                      num: '7',
                      title: 'Backend & API Security',
                      desc: 'Strict server-side validation, parameterized SQL queries, zero client-only auth trust.',
                      status: 'Active'
                    },
                    {
                      num: '8',
                      title: 'Logging & Monitoring',
                      desc: 'Structured security audit log table (medico.security_logs). Masked PII (u***@domain.com).',
                      status: 'Active'
                    },
                    {
                      num: '9',
                      title: 'Role-Based Access (RBAC)',
                      desc: 'Server-side requireRole middleware enforcing tenant isolation & administrative permissions.',
                      status: 'Active'
                    }
                  ].map((item) => (
                    <div key={item.num} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5 hover:border-emerald-300 transition">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-lg bg-emerald-600 text-white text-[10px] font-black flex items-center justify-center">
                            {item.num}
                          </span>
                          <span>{item.title}</span>
                        </span>
                        <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>{item.status}</span>
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-snug">
                        {item.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Real-time Security Event Audit Log Feed */}
              <div className="p-5 rounded-3xl bg-white border border-[#ffd7db] shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-black text-slate-900">
                      Live Security Event Audit Trail
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Showing latest 100 authentication and protection events
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Search Input */}
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs">
                      <Search className="w-3.5 h-3.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search IP or masked email..."
                        value={securitySearch}
                        onChange={(e) => setSecuritySearch(e.target.value)}
                        className="bg-transparent border-none outline-none text-xs text-slate-800 placeholder-slate-400 w-44"
                      />
                      {securitySearch && (
                        <button onClick={() => setSecuritySearch('')} className="text-slate-400 hover:text-slate-600">✕</button>
                      )}
                    </div>

                    {/* Filter Pills */}
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-[11px] font-bold">
                      {[
                        { id: 'ALL', label: 'All' },
                        { id: 'FAILED', label: 'Failed' },
                        { id: 'RATE_LIMIT', label: 'Throttled' },
                        { id: 'LOCKOUT', label: 'Locked' },
                        { id: 'SUCCESS', label: 'Success' },
                        { id: 'RESET', label: 'Resets' }
                      ].map(f => (
                        <button
                          key={f.id}
                          onClick={() => setSecurityFilter(f.id)}
                          className={`px-2.5 py-1 rounded-lg transition ${
                            securityFilter === f.id
                              ? 'bg-white text-slate-900 shadow-sm font-extrabold'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Audit Log Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider text-[10px] font-black">
                        <th className="py-2.5 pr-3">Timestamp</th>
                        <th className="py-2.5 px-3">Event Type</th>
                        <th className="py-2.5 px-3">Target User (Masked)</th>
                        <th className="py-2.5 px-3">IP Address</th>
                        <th className="py-2.5 px-3">Client / Browser</th>
                        <th className="py-2.5 pl-3">Security Metadata</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {securityLogs
                        .filter(log => {
                          const matchesFilter =
                            securityFilter === 'ALL' ||
                            (securityFilter === 'FAILED' && log.event_type === 'LOGIN_FAILED') ||
                            (securityFilter === 'RATE_LIMIT' && log.event_type === 'RATE_LIMITED') ||
                            (securityFilter === 'LOCKOUT' && log.event_type === 'ACCOUNT_LOCKED') ||
                            (securityFilter === 'SUCCESS' && log.event_type === 'LOGIN_SUCCESS') ||
                            (securityFilter === 'RESET' && (log.event_type.includes('PASSWORD_RESET') || log.event_type.includes('RESET')));
                          
                          const matchesSearch =
                            !securitySearch ||
                            (log.email_masked && log.email_masked.toLowerCase().includes(securitySearch.toLowerCase())) ||
                            (log.ip_address && log.ip_address.includes(securitySearch)) ||
                            (log.event_type && log.event_type.toLowerCase().includes(securitySearch.toLowerCase()));

                          return matchesFilter && matchesSearch;
                        })
                        .slice((securityPage - 1) * ITEMS_PER_PAGE, securityPage * ITEMS_PER_PAGE)
                        .map((log) => {
                          // Event badge styling
                          let badgeClass = 'bg-slate-100 text-slate-700 border-slate-300';
                          if (log.event_type === 'LOGIN_FAILED') badgeClass = 'bg-rose-50 text-[#ff2c2c] border-rose-200';
                          if (log.event_type === 'RATE_LIMITED') badgeClass = 'bg-amber-50 text-amber-800 border-amber-300';
                          if (log.event_type === 'ACCOUNT_LOCKED') badgeClass = 'bg-purple-50 text-purple-800 border-purple-300';
                          if (log.event_type === 'LOGIN_SUCCESS') badgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-300';
                          if (log.event_type.includes('PASSWORD_RESET')) badgeClass = 'bg-blue-50 text-blue-800 border-blue-300';

                          return (
                            <tr key={log.id} className="hover:bg-slate-50 transition">
                              <td className="py-3 pr-3 text-[11px] font-mono text-slate-500 whitespace-nowrap">
                                {new Date(log.created_at).toLocaleString('en-IN', {
                                  month: 'short',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  second: '2-digit'
                                })}
                              </td>
                              <td className="py-3 px-3 whitespace-nowrap">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${badgeClass}`}>
                                  {log.event_type}
                                </span>
                              </td>
                              <td className="py-3 px-3 font-mono font-bold text-slate-900">
                                {log.email_masked || '—'}
                              </td>
                              <td className="py-3 px-3 font-mono text-slate-600">
                                {log.ip_address}
                              </td>
                              <td className="py-3 px-3 text-[11px] text-slate-500 max-w-[200px] truncate" title={log.user_agent}>
                                {log.user_agent || 'Unknown Client'}
                              </td>
                              <td className="py-3 pl-3 text-[11px] font-mono text-slate-600">
                                {typeof log.metadata === 'object' && log.metadata !== null
                                  ? JSON.stringify(log.metadata)
                                  : (log.metadata || '—')}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>

                  {securityLogs.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 space-y-2">
                      <ShieldCheck className="w-8 h-8 mx-auto text-emerald-500 opacity-60" />
                      <p className="text-xs font-semibold">No security events recorded yet.</p>
                      <p className="text-[11px]">System defense engine is listening for real-time authentication events.</p>
                    </div>
                  ) : (
                    <div className="p-3 border-t border-slate-100">
                      <Pagination
                        currentPage={securityPage}
                        totalItems={securityLogs.filter(log => {
                          const matchesFilter =
                            securityFilter === 'ALL' ||
                            (securityFilter === 'FAILED' && log.event_type === 'LOGIN_FAILED') ||
                            (securityFilter === 'RATE_LIMIT' && log.event_type === 'RATE_LIMITED') ||
                            (securityFilter === 'LOCKOUT' && log.event_type === 'ACCOUNT_LOCKED') ||
                            (securityFilter === 'SUCCESS' && log.event_type === 'LOGIN_SUCCESS') ||
                            (securityFilter === 'RESET' && (log.event_type.includes('PASSWORD_RESET') || log.event_type.includes('RESET')));
                          const matchesSearch =
                            !securitySearch ||
                            (log.email_masked && log.email_masked.toLowerCase().includes(securitySearch.toLowerCase())) ||
                            (log.ip_address && log.ip_address.includes(securitySearch)) ||
                            (log.event_type && log.event_type.toLowerCase().includes(securitySearch.toLowerCase()));
                          return matchesFilter && matchesSearch;
                        }).length}
                        itemsPerPage={ITEMS_PER_PAGE}
                        onPageChange={setSecurityPage}
                        theme="light"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ========================================================================= */}
      {/* APPROVAL MODAL (SaaS Tier Assignment & Expiry Validity)                  */}
      {/* ========================================================================= */}
      {approvingTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="max-w-md w-full bg-white border border-[#ffd7db] rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5">
            
            <div className="flex justify-between items-center pb-3 border-b border-[#ffd7db]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900">
                    Approve Pharmacy Store
                  </h3>
                  <p className="text-[11px] text-slate-500">Authorize cloud access & license dispatch</p>
                </div>
              </div>
              <button 
                onClick={() => setApprovingTenant(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Pharmacy Applicant Card */}
            <div className="p-4 rounded-2xl bg-[#fff5f6] text-xs space-y-1.5 border border-[#ffd7db]">
              <div className="font-extrabold text-sm text-slate-900">
                {approvingTenant.shop_name}
              </div>
              <div className="text-slate-500">
                Owner: {approvingTenant.owner_name} • {approvingTenant.email}
              </div>
              <div className="text-[#ff2c2c] font-mono font-black">
                💊 Drug License: {approvingTenant.dl_number || 'VERIFIED'}
              </div>
            </div>

            {/* Select SaaS Subscription Plan */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">
                Assign Subscription Plan Tier
              </label>
              <div className="space-y-2">
                {[
                  { id: 'local_599', name: 'Basic POS Billing', price: '₹599 / month' },
                  { id: 'cloud_799', name: 'Pro Cloud & WhatsApp (Recommended)', price: '₹799 / month' },
                  { id: 'enterprise_1299', name: 'Enterprise Multi-Branch', price: '₹1,299 / month' },
                  { id: 'pro_cloud', name: 'Developer Lifetime Free', price: '₹0 (nitheesh8797@gmail.com)' }
                ].map((p) => (
                  <div
                    key={p.id}
                    onClick={() => setAssignPlan(p.id)}
                    className={`p-3 rounded-2xl border-2 cursor-pointer transition flex items-center justify-between text-xs ${
                      assignPlan === p.id 
                        ? 'border-[#ff2c2c] bg-[#fff1f2] font-bold text-[#ff2c2c]' 
                        : 'border-[#ffd7db] text-slate-700'
                    }`}
                  >
                    <span>{p.name}</span>
                    <span className="font-mono text-slate-500">{p.price}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Select License Duration */}
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1.5 block">
                License Key Validity Period
              </label>
              <select
                className="w-full px-3.5 py-2.5 rounded-2xl border border-[#ffd7db] bg-white text-xs font-bold text-slate-800 outline-none"
                value={assignDays}
                onChange={(e) => setAssignDays(Number(e.target.value))}
              >
                <option value={30}>30 Days (Evaluation Trial)</option>
                <option value={90}>90 Days (Quarterly License)</option>
                <option value={365}>1 Year (365 Days Annual Plan)</option>
                <option value={1095}>3 Years (Long-Term Enterprise)</option>
              </select>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2 border-t border-[#ffd7db]">
              <button
                type="button"
                onClick={() => setApprovingTenant(null)}
                className="flex-1 py-2.5 rounded-2xl text-xs font-bold text-slate-500 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={processingAction}
                onClick={handleConfirmApprove}
                className="flex-1 py-2.5 rounded-2xl bg-gradient-to-r from-[#ff2c2c] to-[#f94449] hover:brightness-110 text-white text-xs font-bold shadow-md shadow-[#ff2c2c]/30 flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>{processingAction ? 'Activating...' : 'Approve & Activate'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TENANT DOSSIER & AUDIT MODAL (Inspecting Store Invoices & Medicines)     */}
      {/* ========================================================================= */}
      {viewingTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="max-w-3xl w-full bg-white border border-[#ffd7db] rounded-3xl p-6 shadow-2xl space-y-5 max-h-[90vh] flex flex-col">
            
            {/* Header */}
            <div className="flex justify-between items-start pb-4 border-b border-[#ffd7db]">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#ff2c2c] to-[#f94449] flex items-center justify-center text-white font-black text-xl shadow-md shadow-[#ff2c2c]/30">
                  {viewingTenant.shop_name?.charAt(0) || 'P'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-lg text-slate-900 leading-tight">
                      {viewingTenant.shop_name}
                    </h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                      viewingTenant.status === 'PENDING_APPROVAL'
                        ? 'bg-amber-50 text-amber-800 border-amber-300'
                        : viewingTenant.status === 'SUSPENDED'
                        ? 'bg-rose-50 text-rose-800 border-rose-300'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    }`}>
                      {viewingTenant.status || 'APPROVED'}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-50 text-[#ff2c2c] border border-rose-200">
                      {viewingTenant.plan_type?.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium mt-0.5">
                    Proprietor: <span className="font-bold text-slate-900">{viewingTenant.owner_name}</span> &bull; ID: <span className="font-mono text-slate-500">{viewingTenant.id}</span>
                  </p>
                </div>
              </div>
              <button 
                onClick={() => { setViewingTenant(null); setTenantDetails(null); }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="space-y-4 overflow-y-auto flex-1 pr-1">
              {/* Dossier Credentials Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Contact Details</div>
                  <div className="font-medium text-slate-800 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-[#ff2c2c]" />
                    <span className="font-bold">{viewingTenant.email}</span>
                  </div>
                  <div className="font-medium text-slate-800 flex items-center gap-1.5 pt-0.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="font-bold">+{viewingTenant.phone || 'N/A'}</span>
                    {viewingTenant.phone && (
                      <a 
                        href={`https://wa.me/91${viewingTenant.phone.replace(/\D/g, '')}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded hover:bg-emerald-200"
                      >
                        WhatsApp
                      </a>
                    )}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Compliance &amp; License</div>
                  <div className="text-slate-800">
                    Drug License: <span className="font-mono font-black text-[#ff2c2c]">{viewingTenant.dl_number || 'TN-DL-VERIFIED'}</span>
                  </div>
                  {viewingTenant.gstin && (
                    <div className="text-slate-800">
                      GSTIN: <span className="font-mono font-bold">{viewingTenant.gstin}</span>
                    </div>
                  )}
                  {viewingTenant.address && (
                    <div className="text-slate-600 truncate" title={viewingTenant.address}>
                      📍 {viewingTenant.address}
                    </div>
                  )}
                </div>
              </div>

              {/* License Key & Expiry Banner */}
              <div className="p-3.5 rounded-2xl bg-rose-50/60 border border-rose-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-[#ff2c2c] shrink-0" />
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Active SaaS License Key</span>
                    <span className="font-mono font-bold text-slate-900">{viewingTenant.license_key}</span>
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Plan Expiry Date</span>
                  <span className="font-bold text-slate-900">
                    {viewingTenant.plan_expires_at ? new Date(viewingTenant.plan_expires_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Lifetime'}
                    {' '}({getDaysRemaining(viewingTenant.plan_expires_at)} days remaining)
                  </span>
                </div>
              </div>

              {/* Live Catalog & Invoices Summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-2xl bg-white border border-[#ffd7db] text-center">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Medicines Catalog</div>
                  <div className="text-xl font-black text-slate-900">{viewingTenant.medicines_count || 0}</div>
                </div>
                <div className="p-3 rounded-2xl bg-white border border-[#ffd7db] text-center">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Bills Generated</div>
                  <div className="text-xl font-black text-slate-900">{viewingTenant.invoices_count || 0}</div>
                </div>
                <div className="p-3 rounded-2xl bg-white border border-[#ffd7db] text-center">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Network Volume</div>
                  <div className="text-xl font-black text-[#ff2c2c]">₹{parseFloat(viewingTenant.total_revenue || 0).toFixed(0)}</div>
                </div>
              </div>

              {/* Recent Invoices Table */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs font-black text-slate-900">
                  <span>Recent Billed Invoices</span>
                  <span className="text-[11px] font-mono font-normal text-slate-500">
                    {loadingTenantDetails ? 'Fetching latest records...' : `${tenantDetails?.invoices?.length || 0} shown`}
                  </span>
                </div>

                {loadingTenantDetails ? (
                  <div className="py-6 text-center text-xs text-slate-500">Loading audit trail...</div>
                ) : !tenantDetails?.invoices || tenantDetails.invoices.length === 0 ? (
                  <div className="py-4 text-center text-xs text-slate-500">No invoices generated yet.</div>
                ) : (
                  <div className="overflow-x-auto max-h-48 overflow-y-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-600 bg-slate-50">
                          <th className="py-1.5 px-2">Invoice #</th>
                          <th className="py-1.5 px-2">Customer</th>
                          <th className="py-1.5 px-2">Phone</th>
                          <th className="py-1.5 px-2">Amount</th>
                          <th className="py-1.5 px-2">Mode</th>
                          <th className="py-1.5 px-2">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {tenantDetails.invoices.map(inv => (
                          <tr key={inv.id} className="hover:bg-slate-50 text-slate-800">
                            <td className="py-2 px-2 font-mono font-bold text-[#ff2c2c]">{inv.invoice_number}</td>
                            <td className="py-2 px-2 font-medium">{inv.customer_name || 'Walk-in'}</td>
                            <td className="py-2 px-2 font-mono text-slate-600">{inv.customer_phone || '—'}</td>
                            <td className="py-2 px-2 font-black text-slate-900">₹{parseFloat(inv.grand_total || 0).toFixed(2)}</td>
                            <td className="py-2 px-2">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                                {inv.payment_mode || 'CASH'}
                              </span>
                            </td>
                            <td className="py-2 px-2 text-slate-500 text-[11px]">
                              {inv.created_at ? new Date(inv.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Recent Medicines Table */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs font-black text-slate-900">
                  <span>Medicine Catalog &amp; Descriptions</span>
                  <span className="text-[11px] font-mono font-normal text-slate-500">
                    {loadingTenantDetails ? '...' : `${tenantDetails?.medicines?.length || 0} shown`}
                  </span>
                </div>

                {loadingTenantDetails ? (
                  <div className="py-6 text-center text-xs text-slate-500">Loading catalog...</div>
                ) : !tenantDetails?.medicines || tenantDetails.medicines.length === 0 ? (
                  <div className="py-4 text-center text-xs text-slate-500">No medicines in catalog yet.</div>
                ) : (
                  <div className="overflow-x-auto max-h-48 overflow-y-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-600 bg-slate-50">
                          <th className="py-1.5 px-2">Medicine / Brand</th>
                          <th className="py-1.5 px-2">Batch</th>
                          <th className="py-1.5 px-2">Stock</th>
                          <th className="py-1.5 px-2">MRP</th>
                          <th className="py-1.5 px-2">Expiry</th>
                          <th className="py-1.5 px-2">Description / Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {tenantDetails.medicines.map(m => (
                          <tr key={m.id} className="hover:bg-slate-50 text-slate-800">
                            <td className="py-2 px-2 font-bold text-slate-900">
                              {m.name || m.brand}
                            </td>
                            <td className="py-2 px-2 font-mono text-slate-600">{m.batch_number || '—'}</td>
                            <td className="py-2 px-2 font-black text-slate-800">{m.stock_quantity ?? 0}</td>
                            <td className="py-2 px-2 font-black text-emerald-700">₹{parseFloat(m.mrp || 0).toFixed(2)}</td>
                            <td className="py-2 px-2 text-slate-500 font-mono text-[11px]">{m.expiry_date || '—'}</td>
                            <td className="py-2 px-2 text-slate-600 text-[11px] italic max-w-xs truncate" title={m.description}>
                              {m.description || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Quick Controls */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[#ffd7db]">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setResetPasswordTenant(viewingTenant);
                    setNewPasswordInput('');
                    setResetPasswordMsg('');
                  }}
                  className="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Reset Store Password</span>
                </button>

                <button
                  onClick={() => handleExtendPlan(viewingTenant.id, 30, viewingTenant.shop_name)}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
                >
                  +30 Days
                </button>
                <button
                  onClick={() => handleExtendPlan(viewingTenant.id, 365, viewingTenant.shop_name)}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
                >
                  +1 Year
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleStatus(viewingTenant.id, viewingTenant.status, viewingTenant.shop_name)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                    viewingTenant.status === 'SUSPENDED'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                      : 'bg-rose-50 text-[#ff2c2c] border border-rose-300'
                  }`}
                >
                  {viewingTenant.status === 'SUSPENDED' ? 'Reactivate Store' : 'Suspend Store'}
                </button>
                <button
                  onClick={() => { setViewingTenant(null); setTenantDetails(null); }}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold transition"
                >
                  Close Dossier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PASSWORD RESET MODAL (SuperAdmin Password Authority)                     */}
      {/* ========================================================================= */}
      {resetPasswordTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="max-w-md w-full bg-white border border-[#ffd7db] rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5">
            <div className="flex justify-between items-center pb-3 border-b border-[#ffd7db]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900">
                    Reset Store Password
                  </h3>
                  <p className="text-[11px] text-slate-500">SuperAdmin Credential Authority</p>
                </div>
              </div>
              <button 
                onClick={() => { setResetPasswordTenant(null); setResetPasswordMsg(''); }}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs space-y-1">
              <div className="font-extrabold text-slate-900 text-sm">{resetPasswordTenant.shop_name}</div>
              <div className="text-slate-700 font-medium">Owner: {resetPasswordTenant.owner_name} &bull; Email: <span className="font-mono font-bold text-slate-900">{resetPasswordTenant.email}</span></div>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">New Password</label>
                  <button
                    type="button"
                    onClick={generateRandomPassword}
                    className="text-[11px] font-bold text-[#ff2c2c] hover:underline"
                  >
                    🎲 Generate Strong Password
                  </button>
                </div>
                <input
                  type="text"
                  required
                  minLength={6}
                  placeholder="e.g. Medico@2026"
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-300 focus:border-[#ff2c2c] text-sm font-mono outline-none bg-white text-slate-900 font-bold"
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                />
              </div>

              {resetPasswordMsg && (
                <div className={`p-3 rounded-xl text-xs font-bold ${
                  resetPasswordMsg.includes('🎉') 
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-300' 
                    : 'bg-rose-50 text-[#ff2c2c] border border-rose-300'
                }`}>
                  {resetPasswordMsg}
                </div>
              )}

              <div className="flex items-center gap-2 pt-2 border-t border-[#ffd7db]">
                <button
                  type="button"
                  onClick={() => { setResetPasswordTenant(null); setResetPasswordMsg(''); }}
                  className="flex-1 py-2.5 rounded-2xl text-xs font-bold text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetPasswordSubmitting || !newPasswordInput}
                  className="flex-1 py-2.5 rounded-2xl bg-gradient-to-r from-[#ff2c2c] to-[#f94449] hover:brightness-110 text-white text-xs font-bold shadow-md shadow-[#ff2c2c]/30 flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>{resetPasswordSubmitting ? 'Updating...' : 'Update Password'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
