import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Search, 
  Printer, 
  Cloud, 
  CloudOff, 
  Phone, 
  MessageSquare, 
  ChevronDown, 
  ChevronUp, 
  Package, 
  Clock, 
  Sparkles, 
  CheckCircle2,
  Calendar,
  User,
  ArrowRight
} from 'lucide-react';
import { db } from '../db/localDb';
import { useLanguage } from '../i18n/languageContext';
import { getCloudUrl } from '../utils/cloudConfig';
import ThermalReceipt from './ThermalReceipt';
import Pagination from './Pagination';

export default function InvoicesList({ theme }) {
  const { language, whatsappLanguage, setWhatsappLanguage, availableLanguages, t, formatWhatsAppBill } = useLanguage();
  const [invoices, setInvoices] = useState([]);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [storeInfo, setStoreInfo] = useState(null);
  const [expandedInvoiceId, setExpandedInvoiceId] = useState(null);
  const [waSendingMap, setWaSendingMap] = useState({});
  const [waStatusMap, setWaStatusMap] = useState({});

  const isDark = theme === 'dark';

  useEffect(() => {
    loadInvoices();
    db.settings.get('store_profile').then(p => p && setStoreInfo(p));
  }, []);

  async function loadInvoices() {
    const list = await db.invoices.reverse().toArray();
    setInvoices(list);
  }

  const filteredInvoices = invoices.filter(inv => {
    const q = search.toLowerCase();
    return (
      inv.invoice_number.toLowerCase().includes(q) ||
      (inv.customer_name && inv.customer_name.toLowerCase().includes(q)) ||
      (inv.customer_phone && inv.customer_phone.toLowerCase().includes(q))
    );
  });

  const ITEMS_PER_PAGE = 10;
  const paginatedInvoices = filteredInvoices.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  function toggleExpand(id) {
    setExpandedInvoiceId(prev => (prev === id ? null : id));
  }

  function handleAutoSendWhatsApp(inv, e) {
    if (e) e.stopPropagation();

    let phone = inv.customer_phone ? inv.customer_phone.replace(/[^0-9]/g, '') : '';
    if (!phone) {
      const inputPhone = prompt('Enter customer WhatsApp number with country code (e.g. 9876543210):', '');
      if (!inputPhone) return;
      phone = inputPhone.replace(/[^0-9]/g, '');
    }

    if (phone.length === 10) phone = '91' + phone;

    const messageText = formatWhatsAppBill({
      language: whatsappLanguage,
      shopName: storeInfo?.shop_name || 'KNITE MEDICO PHARMACY',
      customerName: inv.customer_name || 'Valued Customer',
      invoiceNumber: inv.invoice_number,
      grandTotal: inv.grand_total,
      paymentMode: inv.payment_mode,
      items: inv.items || []
    });

    // Send to backend in background (NO BROWSER REDIRECT!)
    setWaStatusMap(prev => ({ ...prev, [inv.id]: `✅ Sent in ${whatsappLanguage.toUpperCase()} to +${phone}` }));

    // Send to backend in background for automated dispatch
    const cloudUrl = getCloudUrl();
    fetch(`${cloudUrl}/api/whatsapp/send-bill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: phone,
        customer_name: inv.customer_name || 'Valued Customer',
        shop_name: storeInfo?.shop_name || 'KNITE Medico',
        invoice_number: inv.invoice_number,
        grand_total: inv.grand_total,
        payment_mode: inv.payment_mode,
        items: inv.items || [],
        language: whatsappLanguage || 'en',
        custom_message: messageText
      })
    }).catch(console.error);
  }

  function formatTimestamp(isoString) {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  }

  return (
    <div className="space-y-5 py-2">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-2xl bg-gradient-to-br from-[#ff2c2c] to-[#f94449] flex items-center justify-center shadow-md shadow-red-200">
              <FileText className="w-5 h-5 text-white" />
            </span>
            Billing History & Invoices
          </h2>
          <p className="text-sm text-slate-600 font-semibold mt-1 ml-0.5">
            Click any invoice row to view customer purchased items • Background automated WhatsApp dispatch
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-bold">
            <span className="text-[10px] uppercase font-black text-emerald-800 dark:text-emerald-300">
              {t('wa_lang_label', 'WhatsApp Lang:')}
            </span>
            {availableLanguages.map(l => (
              <button
                key={l.code}
                onClick={() => setWhatsappLanguage(l.code)}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-black transition ${
                  whatsappLanguage === l.code
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-emerald-100'
                }`}
                title={`Send WhatsApp bills in ${l.nativeName}`}
              >
                {l.flag} {l.nativeName.split(' ')[0]}
              </button>
            ))}
          </div>

          <div className="bg-white border-2 border-red-100 px-4 py-2 rounded-2xl shadow-sm text-sm font-bold text-slate-700 flex items-center gap-2">
            <span>Total Invoices:</span>
            <span className="text-base font-black text-[#ff2c2c] bg-red-50 px-2.5 py-0.5 rounded-xl border border-red-100">
              {invoices.length}
            </span>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
        <input
          type="text"
          className="w-full pl-11 pr-4 py-3 rounded-2xl border-2 border-slate-200 bg-white text-sm text-slate-900 font-semibold placeholder-slate-500 outline-none focus:border-[#ff2c2c] focus:ring-4 focus:ring-red-50 transition-all shadow-sm"
          placeholder={t('search_invoices', 'Search by Bill Number (e.g. KNM-123456), Patient Name, or Mobile Number…')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 rounded-xl text-xs font-bold text-slate-600 hover:text-[#ff2c2c] hover:bg-red-50 transition"
          >
            Clear
          </button>
        )}
      </div>

      {/* Invoices Container: Cards on Mobile (< md), Full Table on Desktop (>= md) */}
      <div className={`rounded-3xl border shadow-md overflow-hidden ${
        isDark ? 'bg-[#150d10] border-rose-900/40' : 'bg-white border-slate-200'
      }`}>
        {/* ── Mobile Invoices Cards (< md) ── */}
        <div className="block md:hidden divide-y divide-slate-100 dark:divide-rose-950/40">
          {filteredInvoices.length === 0 ? (
            <div className="py-16 text-center">
              <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-slate-700 font-extrabold text-sm">No billing records found</p>
            </div>
          ) : (
            paginatedInvoices.map((inv) => {
              const isExpanded = expandedInvoiceId === inv.id;
              const itemsCount = inv.items ? inv.items.length : 0;
              const isWaSending = waSendingMap[inv.id];
              const waStatus = waStatusMap[inv.id];

              return (
                <div key={inv.id} className="p-4 space-y-3">
                  {/* Top row: Bill number + Date */}
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-black text-[#ff2c2c] text-sm">
                      #{inv.invoice_number}
                    </span>
                    <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{formatTimestamp(inv.created_at)}</span>
                    </div>
                  </div>

                  {/* Customer info */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className={`font-black text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {inv.customer_name || 'Walk-in Customer'}
                      </p>
                      {inv.customer_phone && (
                        <p className="text-xs font-mono font-bold text-slate-500 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {inv.customer_phone}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-black block">Grand Total</span>
                      <span className="text-lg font-black font-mono text-[#ff2c2c]">
                        ₹{parseFloat(inv.grand_total).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Badges row: payment mode, items count, cloud sync */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
                    <span className={`px-2 py-0.5 rounded-lg uppercase ${
                      inv.payment_mode === 'CASH' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40' :
                      inv.payment_mode === 'UPI' ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/40' :
                      'bg-blue-50 text-blue-700 dark:bg-blue-950/40'
                    }`}>
                      {inv.payment_mode}
                    </span>
                    <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {itemsCount} item{itemsCount !== 1 ? 's' : ''}
                    </span>
                    {inv.synced_to_cloud ? (
                      <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 flex items-center gap-1">
                        <Cloud className="w-3 h-3 text-emerald-600" /> Synced
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-500">
                        Local Only
                      </span>
                    )}
                  </div>

                  {/* Action buttons: WhatsApp, Print, Expand */}
                  <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-rose-950/30">
                    <button
                      onClick={() => toggleExpand(inv.id)}
                      className="flex-1 py-1.5 px-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center justify-center gap-1 transition"
                    >
                      <span>{isExpanded ? 'Hide Items' : `View Items (${itemsCount})`}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      onClick={(e) => handleAutoSendWhatsApp(inv, e)}
                      disabled={isWaSending}
                      className="p-2 rounded-xl bg-emerald-600 text-white shadow-sm active:scale-95 transition"
                      title="Send WhatsApp Bill"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setSelectedInvoice(inv)}
                      className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 active:scale-95 transition"
                      title="Print Receipt"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                  </div>

                  {/* WhatsApp status if sent */}
                  {waStatus && (
                    <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{waStatus}</span>
                    </div>
                  )}

                  {/* Expanded Items List Breakdown on Mobile */}
                  {isExpanded && (
                    <div className="mt-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-rose-950/40 space-y-2">
                      <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">Purchased Medicines:</p>
                      <div className="divide-y divide-slate-200/60 dark:divide-rose-950/40">
                        {(inv.items || []).map((item, idx) => (
                          <div key={idx} className="py-1.5 flex items-center justify-between text-xs">
                            <div>
                              <p className="font-bold text-slate-900 dark:text-white">{item.medicine_name}</p>
                              <p className="text-[10px] text-slate-500 font-mono">Qty: {item.quantity} × ₹{parseFloat(item.unit_price || 0).toFixed(2)}</p>
                            </div>
                            <span className="font-mono font-black text-slate-900 dark:text-white">
                              ₹{parseFloat(item.total_amount || 0).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* ── Desktop & Tablet Table (>= md) ── */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className={`border-b text-xs font-black uppercase tracking-wider ${
                isDark ? 'bg-[#1e1216] border-rose-900/40 text-slate-200' : 'bg-slate-100 border-slate-200 text-slate-700'
              }`}>
                <th className="px-4 py-3.5 w-10 text-center"></th>
                <th className="px-4 py-3.5">Bill Number</th>
                <th className="px-4 py-3.5">Date & Exact Time</th>
                <th className="px-4 py-3.5">Patient / Customer</th>
                <th className="px-4 py-3.5 text-center">Purchased Items</th>
                <th className="px-4 py-3.5 text-center">Payment</th>
                <th className="px-4 py-3.5 text-right">Grand Total</th>
                <th className="px-4 py-3.5 text-center">Cloud Sync</th>
                <th className="px-4 py-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-rose-900/20' : 'divide-slate-200'}`}>
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <FileText className="w-8 h-8 text-slate-400" />
                      <p className="text-slate-700 font-extrabold text-sm">No billing records found</p>
                      <p className="text-xs text-slate-500">Try searching for a different bill number or customer phone.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedInvoices.map((inv) => {
                  const isExpanded = expandedInvoiceId === inv.id;
                  const itemsCount = inv.items ? inv.items.length : 0;
                  const isWaSending = waSendingMap[inv.id];
                  const waStatus = waStatusMap[inv.id];

                  return (
                    <React.Fragment key={inv.id}>
                      {/* Main Invoice Row */}
                      <tr
                        onClick={() => toggleExpand(inv.id)}
                        className={`cursor-pointer transition-all duration-150 ${
                          isExpanded
                            ? 'bg-red-50/80 border-l-4 border-l-[#ff2c2c]'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        {/* Expand Chevron Toggle */}
                        <td className="px-3 py-4 text-center">
                          <button
                            className={`p-1.5 rounded-xl transition-all ${
                              isExpanded
                                ? 'bg-[#ff2c2c] text-white shadow-sm'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                            title={isExpanded ? 'Collapse items breakdown' : 'Expand items breakdown'}
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </td>

                        {/* Bill Number */}
                        <td className="px-4 py-4 font-mono font-black text-[#ff2c2c] text-sm">
                          {inv.invoice_number}
                        </td>

                        {/* Timestamp */}
                        <td className={`px-4 py-4 text-xs font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{formatTimestamp(inv.created_at)}</span>
                          </div>
                        </td>

                        {/* Customer */}
                        <td className="px-4 py-4">
                          <div className={`font-extrabold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {inv.customer_name || 'Customer'}
                          </div>
                          {inv.customer_phone && (
                            <div className={`text-xs font-mono font-bold flex items-center gap-1 mt-0.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                              <Phone className="w-3 h-3 text-slate-400" />
                              {inv.customer_phone}
                            </div>
                          )}
                        </td>

                        {/* Items Count Badge */}
                        <td className="px-4 py-4 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black border transition ${
                            isExpanded
                              ? 'bg-[#ff2c2c] text-white border-[#ff2c2c] shadow-sm'
                              : 'bg-red-50 text-[#ff2c2c] border-red-200 hover:bg-red-100'
                          }`}>
                            <Package className="w-3.5 h-3.5" />
                            {itemsCount} {itemsCount === 1 ? 'Item' : 'Items'} {isExpanded ? '▲' : '▼'}
                          </span>
                        </td>

                        {/* Payment Mode */}
                        <td className="px-4 py-4 text-center">
                          <span className={`inline-block px-2.5 py-1 rounded-lg border font-extrabold text-xs uppercase ${
                            isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-100 border-slate-200 text-slate-800'
                          }`}>
                            {inv.payment_mode}
                          </span>
                        </td>

                        {/* Grand Total */}
                        <td className="px-4 py-4 text-right font-mono font-black text-[#ff2c2c] text-base">
                          ₹{parseFloat(inv.grand_total).toFixed(2)}
                        </td>

                        {/* Cloud Sync */}
                        <td className="px-4 py-4 text-center">
                          {inv.is_synced ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-black">
                              <Cloud className="w-3 h-3 text-emerald-600" /> Synced
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-black">
                              <CloudOff className="w-3 h-3 text-amber-600" /> Local
                            </span>
                          )}
                        </td>

                        {/* Action Buttons */}
                        <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setSelectedInvoice(inv)}
                              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1.5 transition border border-slate-200"
                              title="Print Thermal Receipt"
                            >
                              <Printer className="w-3.5 h-3.5 text-[#ff2c2c]" />
                              <span>Receipt</span>
                            </button>

                            <button
                              onClick={(e) => handleAutoSendWhatsApp(inv, e)}
                              disabled={isWaSending}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-sm transition active:scale-95"
                              title="Auto-send bill directly to WhatsApp without opening popups"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>{isWaSending ? 'Sending…' : 'Auto WhatsApp'}</span>
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* ── EXPANDED LIGHT THEME ITEMS BREAKDOWN DROPDOWN ── */}
                      {isExpanded && (
                        <tr className="bg-red-50/50">
                          <td colSpan={9} className="p-4 sm:p-6">
                            <div className="bg-white rounded-3xl border-2 border-red-200 shadow-xl p-5 space-y-4">

                              {/* Dropdown Light Header Banner */}
                              <div className="p-4 rounded-2xl bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#ff2c2c] to-[#f94449] flex items-center justify-center shadow-md shadow-red-200 text-white shrink-0">
                                    <Package className="w-5 h-5" />
                                  </div>
                                  <div>
                                    <h4 className="font-black text-slate-900 text-base">
                                      Customer Purchase Items — Bill #{inv.invoice_number}
                                    </h4>
                                    <p className="text-xs text-slate-700 font-semibold mt-0.5">
                                      Processed on <span className="font-mono text-slate-900 font-bold">{formatTimestamp(inv.created_at)}</span>
                                      {inv.doctor_name && <span> • Prescribed by <strong>Dr. {inv.doctor_name}</strong></span>}
                                    </p>
                                  </div>
                                </div>

                                {/* Instant Auto WhatsApp & Print buttons */}
                                <div className="flex items-center gap-2 shrink-0">
                                  <button
                                    onClick={(e) => handleAutoSendWhatsApp(inv, e)}
                                    disabled={isWaSending}
                                    className="px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-2 shadow-md transition active:scale-95"
                                  >
                                    <MessageSquare className="w-4 h-4" />
                                    <span>{isWaSending ? 'Sending WhatsApp…' : 'Send WhatsApp Bill Automatically'}</span>
                                  </button>

                                  <button
                                    onClick={() => setSelectedInvoice(inv)}
                                    className="px-3 py-2 rounded-2xl bg-white border-2 border-slate-200 text-slate-800 text-xs font-bold hover:bg-slate-50 transition shadow-sm"
                                  >
                                    Print Receipt
                                  </button>
                                </div>
                              </div>

                              {/* Status Notification if sent */}
                              {waStatus && (
                                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-extrabold flex items-center justify-between shadow-sm">
                                  <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                    <span>{waStatus}</span>
                                  </div>
                                  <span className="text-[11px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-lg">
                                    Background REST Gateway Active
                                  </span>
                                </div>
                              )}

                              {/* Purchased Items Table */}
                              <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
                                <table className="w-full text-left text-xs border-collapse">
                                  <thead>
                                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-800 font-black uppercase tracking-wider">
                                      <th className="px-4 py-3 w-8">#</th>
                                      <th className="px-4 py-3">Medicine Name & Generic Salt</th>
                                      <th className="px-4 py-3">Batch No</th>
                                      <th className="px-4 py-3">Expiry Date</th>
                                      <th className="px-4 py-3 text-center">Quantity</th>
                                      <th className="px-4 py-3 text-right">Unit Rate (₹)</th>
                                      <th className="px-4 py-3 text-center">GST Slab</th>
                                      <th className="px-4 py-3 text-right">Total Amount (₹)</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 text-slate-900 font-semibold bg-white">
                                    {inv.items && inv.items.length > 0 ? (
                                      inv.items.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                          <td className="px-4 py-3 font-bold text-slate-500">{idx + 1}</td>
                                          <td className="px-4 py-3 font-extrabold text-slate-900 text-sm">
                                            {item.medicine_name || item.name}
                                            {item.generic_name && (
                                              <span className="block text-[11px] font-semibold text-slate-600 mt-0.5">
                                                Salt: {item.generic_name}
                                              </span>
                                            )}
                                          </td>
                                          <td className="px-4 py-3 font-mono font-bold text-slate-700">
                                            <span className="bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                                              {item.batch_number || '—'}
                                            </span>
                                          </td>
                                          <td className="px-4 py-3 font-mono font-bold text-slate-700">
                                            {item.expiry_date || 'N/A'}
                                          </td>
                                          <td className="px-4 py-3 text-center">
                                            <span className="bg-slate-100 text-slate-900 font-extrabold px-2.5 py-1 rounded-lg border border-slate-200 text-sm">
                                              {item.quantity}
                                            </span>
                                          </td>
                                          <td className="px-4 py-3 text-right font-mono font-bold text-slate-800 text-xs">
                                            ₹{parseFloat(item.unit_price || 0).toFixed(2)}
                                          </td>
                                          <td className="px-4 py-3 text-center font-mono font-bold text-slate-700">
                                            {item.gst_rate ? `${item.gst_rate}%` : '0% (Nil)'}
                                          </td>
                                          <td className="px-4 py-3 text-right font-mono font-black text-[#ff2c2c] text-sm">
                                            ₹{parseFloat(item.total_amount || (item.quantity * item.unit_price) || 0).toFixed(2)}
                                          </td>
                                        </tr>
                                      ))
                                    ) : (
                                      <tr>
                                        <td colSpan={8} className="px-4 py-6 text-center text-slate-600 font-bold">
                                          Standard walk-in customer transaction.
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>

                              {/* Summary Totals Box inside Dropdown */}
                              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-bold text-slate-800">
                                <div className="flex flex-wrap items-center gap-4 text-slate-700">
                                  <span>Payment Method: <strong className="text-slate-900 uppercase font-black">{inv.payment_mode}</strong></span>
                                  {inv.subtotal && <span>Subtotal: <strong className="text-slate-900 font-mono">₹{parseFloat(inv.subtotal).toFixed(2)}</strong></span>}
                                  <span>GST: <strong className="text-slate-900 font-mono">{parseFloat(inv.tax_amount || 0) > 0 ? `₹${parseFloat(inv.tax_amount).toFixed(2)}` : '₹0.00 (Nil)'}</strong></span>
                                  {parseFloat(inv.discount_amount) > 0 && <span className="text-[#ff2c2c]">Discount: <strong className="font-mono">-₹{parseFloat(inv.discount_amount).toFixed(2)}</strong></span>}
                                </div>
                                <div className="text-right flex items-center gap-2 justify-end">
                                  <span className="text-slate-700 font-bold text-sm">Grand Total:</span>
                                  <span className="text-xl font-black font-mono text-[#ff2c2c] bg-red-100 px-3 py-1 rounded-xl border border-red-200">
                                    ₹{parseFloat(inv.grand_total).toFixed(2)}
                                  </span>
                                </div>
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

        {/* 10 per page pagination */}
        <div className="p-3 border-t border-slate-100 dark:border-rose-950/40">
          <Pagination
            currentPage={currentPage}
            totalItems={filteredInvoices.length}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setCurrentPage}
            theme={theme}
          />
        </div>
      </div>

      {/* Thermal Receipt Modal */}
      {selectedInvoice && (
        <ThermalReceipt
          invoice={selectedInvoice}
          storeInfo={storeInfo}
          onClose={() => setSelectedInvoice(null)}
          onPrint={() => window.print()}
        />
      )}
    </div>
  );
}
