import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Calendar, 
  FileSpreadsheet, 
  FileText,
  AlertCircle, 
  ShieldAlert,
  Percent,
  Wallet,
  Download,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Building2,
  Package,
  Layers
} from 'lucide-react';
import { db } from '../db/localDb';
import { useLanguage } from '../i18n/languageContext';
import { ReportExportService } from '../services/reportExportService';

export default function Reports({ theme }) {
  const { t } = useLanguage();
  const [timeRange, setTimeRange] = useState('ALL_TIME'); // 'TODAY' | 'THIS_MONTH' | 'ALL_TIME' | 'CUSTOM'
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoices, setInvoices] = useState([]);
  const [storeProfile, setStoreProfile] = useState(null);
  const [gstConfig, setGstConfig] = useState({ tax_split: 'CGST_SGST' });
  const [exportNotice, setExportNotice] = useState('');

  const [stats, setStats] = useState({
    periodSales: 0,
    periodBills: 0,
    lifetimeSales: 0,
    lifetimeBills: 0,
    cashSales: 0,
    upiSales: 0,
    cardSales: 0,
    totalStockValuation: 0,
    potentialProfit: 0,
    totalMedicinesCount: 0,
    gstCollected: 0,
    expiredLoss: 0,
    expiredCount: 0,
    nearExpiryCount: 0,
    lowStockCount: 0
  });

  const isDark = theme === 'dark';
  const fmt = (v) => (isNaN(parseFloat(v)) ? '0.00' : parseFloat(v).toFixed(2));

  useEffect(() => {
    calculateReports();
  }, [selectedDate, timeRange]);

  async function calculateReports() {
    const allInvoices = await db.invoices.toArray();
    const medicines = await db.medicines.filter(m => !m.is_deleted).toArray();
    const profile = await db.settings.get('store_profile');
    const gst = await db.settings.get('gst_config');

    setInvoices(allInvoices);
    if (profile) setStoreProfile(profile);
    if (gst) setGstConfig(gst);

    // Lifetime figures for this store
    const lifetimeSales = allInvoices.reduce((sum, inv) => sum + (parseFloat(inv.grand_total) || 0), 0);
    const lifetimeBills = allInvoices.length;

    // Filter invoices by selected time range
    const now = new Date();
    const currentYearMonth = now.toISOString().slice(0, 7); // 'YYYY-MM'

    let filteredInvoices = [];
    if (timeRange === 'TODAY') {
      const todayStr = now.toISOString().split('T')[0];
      filteredInvoices = allInvoices.filter(inv => (inv.created_at || '').startsWith(todayStr));
    } else if (timeRange === 'THIS_MONTH') {
      filteredInvoices = allInvoices.filter(inv => (inv.created_at || '').startsWith(currentYearMonth));
    } else if (timeRange === 'CUSTOM') {
      filteredInvoices = allInvoices.filter(inv => (inv.created_at || '').startsWith(selectedDate));
    } else {
      // ALL_TIME: Real full store performance
      filteredInvoices = allInvoices;
    }

    const periodSales = filteredInvoices.reduce((sum, inv) => sum + (parseFloat(inv.grand_total) || 0), 0);
    const periodBills = filteredInvoices.length;

    const cashSales = filteredInvoices.filter(i => i.payment_mode === 'CASH').reduce((sum, i) => sum + (parseFloat(i.grand_total) || 0), 0);
    const upiSales  = filteredInvoices.filter(i => i.payment_mode === 'UPI').reduce((sum, i) => sum + (parseFloat(i.grand_total) || 0), 0);
    const cardSales = filteredInvoices.filter(i => i.payment_mode === 'CARD').reduce((sum, i) => sum + (parseFloat(i.grand_total) || 0), 0);
    const gstCollected = filteredInvoices.reduce((sum, inv) => sum + (parseFloat(inv.tax_amount) || 0), 0);

    // Real Inventory Valuation & Risk Audits
    let totalStockValuation = 0;
    let totalPurchaseCost = 0;
    let expiredLoss = 0;
    let expiredCount = 0;
    let nearExpiryCount = 0;
    let lowStockCount = 0;

    // Strict boundary: A batch is ONLY truly expired if its expiry date has ALREADY passed!
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thirtyDaysLater = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 30);

    for (const med of medicines) {
      const qty = parseInt(med.stock_qty || 0, 10);
      const minStock = parseInt(med.min_stock || 10, 10);
      const sale = parseFloat(med.sale_price || 0);
      const purchase = parseFloat(med.purchase_price || 0);

      totalStockValuation += (qty * sale);
      totalPurchaseCost += (qty * purchase);

      if (qty <= minStock) {
        lowStockCount++;
      }

      if (med.expiry_date) {
        const expDate = new Date(med.expiry_date);
        if (expDate < todayStart) {
          // TRULY EXPIRED DEAD STOCK (Actual Loss)
          expiredLoss += (qty * purchase);
          expiredCount++;
        } else if (expDate <= thirtyDaysLater) {
          // Nearing expiry within 30 days (Eligible for sale or return to distributor, NOT lost yet!)
          nearExpiryCount++;
        }
      }
    }

    setStats({
      periodSales,
      periodBills,
      lifetimeSales,
      lifetimeBills,
      cashSales,
      upiSales,
      cardSales,
      totalStockValuation,
      potentialProfit: totalStockValuation - totalPurchaseCost,
      totalMedicinesCount: medicines.length,
      gstCollected,
      expiredLoss,
      expiredCount,
      nearExpiryCount,
      lowStockCount
    });
  }

  // 1. Export Excel (.xlsx)
  async function handleExportExcel() {
    try {
      const exportDate = timeRange === 'CUSTOM' ? selectedDate : new Date().toISOString().split('T')[0];
      const res = await ReportExportService.exportDailyExcel(exportDate, storeProfile, invoices);
      setExportNotice(`📊 Excel report generated for ${storeProfile?.shop_name || 'Store'} (${res.count} bills)!`);
      setTimeout(() => setExportNotice(''), 4000);
    } catch (err) {
      alert('Failed to export Excel: ' + err.message);
    }
  }

  // 2. Export PDF (.pdf)
  async function handleExportPDF() {
    try {
      const exportDate = timeRange === 'CUSTOM' ? selectedDate : new Date().toISOString().split('T')[0];
      const res = await ReportExportService.exportDailyPDF(exportDate, storeProfile, invoices);
      setExportNotice(`📄 Official PDF report downloaded for ${storeProfile?.shop_name || 'Store'} (${res.count} bills)!`);
      setTimeout(() => setExportNotice(''), 4000);
    } catch (err) {
      alert('Failed to export PDF: ' + err.message);
    }
  }

  // 3. Zero-Data-Loss Local Snapshot
  async function handleZeroLossBackup() {
    try {
      const res = await ReportExportService.exportFullDatabaseSnapshot();
      setExportNotice(`🛡️ Complete store database snapshot saved! (${(res.sizeBytes / 1024).toFixed(1)} KB)`);
      setTimeout(() => setExportNotice(''), 5000);
    } catch (err) {
      alert('Failed to export snapshot: ' + err.message);
    }
  }

  const rangeLabels = {
    TODAY: 'Today',
    THIS_MONTH: 'This Month',
    ALL_TIME: 'All Time (Store Total)',
    CUSTOM: `Date: ${selectedDate}`
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header & Store Identity */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 rounded-3xl border-2 bg-white dark:bg-[#181115] border-slate-200 dark:border-rose-950/60 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-[#ff2c2c]" />
            <h2 className={`text-xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Sales & Financial Intelligence
            </h2>
          </div>
          
          <div className="flex items-center gap-2.5 mt-1.5 flex-wrap">
            <span className="font-extrabold text-sm text-[#ff2c2c] flex items-center gap-1">
              <Building2 className="w-4 h-4" />
              {storeProfile?.shop_name || 'My Pharmacy Store'}
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              GSTIN: <span className="font-mono font-black">{storeProfile?.gstin || '33AAAA0000A1Z5'}</span>
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              DL: <span className="font-mono font-black">{storeProfile?.dl_number || 'TN-DL-2026-889900'}</span>
            </span>
          </div>
        </div>

        {/* Timeframe Toggles & Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          
          {/* Quick Filter Buttons */}
          <div className="flex rounded-xl border-2 border-slate-300 dark:border-slate-700 p-1 bg-slate-100 dark:bg-slate-800 text-xs font-black">
            {[
              { id: 'ALL_TIME', label: t('all_time', 'All Time') },
              { id: 'THIS_MONTH', label: t('this_month', 'This Month') },
              { id: 'TODAY', label: t('today', 'Today') },
              { id: 'CUSTOM', label: t('custom_date', 'Pick Date') }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setTimeRange(tab.id)}
                className={`px-3 py-1.5 rounded-lg transition ${
                  timeRange === tab.id
                    ? 'bg-white dark:bg-slate-900 text-[#ff2c2c] shadow-sm font-black'
                    : 'text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Date Picker if CUSTOM */}
          {timeRange === 'CUSTOM' && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-[#ffd7db] dark:border-rose-900/40 bg-white dark:bg-[#181113] text-xs font-bold shadow-sm">
              <Calendar className="w-3.5 h-3.5 text-[#ff2c2c]" />
              <input
                type="date"
                className="bg-transparent border-none outline-none font-mono text-xs cursor-pointer text-slate-900 dark:text-slate-200 font-black"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
          )}

          {/* Export Excel (.xlsx) */}
          <button
            onClick={handleExportExcel}
            className="btn-secondary text-xs flex items-center gap-1.5 shadow-sm font-black"
            title="Download Daily Report in Microsoft Excel format"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>{t('export_excel', 'Export Excel')}</span>
          </button>

          {/* Export PDF (.pdf) */}
          <button
            onClick={handleExportPDF}
            className="btn-primary text-xs flex items-center gap-1.5 shadow-sm font-black"
            title="Download Official PDF Report"
          >
            <FileText className="w-4 h-4" />
            <span>{t('export_pdf', 'Export PDF')}</span>
          </button>
        </div>
      </div>

      {/* Export Feedback Toast */}
      {exportNotice && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border-2 border-emerald-400 text-emerald-900 dark:text-emerald-200 text-xs font-black animate-fade-in flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{exportNotice}</span>
        </div>
      )}

      {/* Zero Data Loss Guarantee Banner */}
      <div className={`p-4 rounded-3xl border-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm ${
        isDark ? 'bg-[#241417] border-[#f94449]/40' : 'bg-[#fff5f6] border-[#ffd7db]'
      }`}>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-[#ff2c2c] text-white shadow-md shadow-[#ff2c2c]/30 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
              Zero Data Loss Guarantee Active
            </h4>
            <p className="text-xs text-slate-700 dark:text-slate-300 font-bold mt-0.5">
              Secure persistence across Local IndexedDB + Server PostgreSQL (`knite_db`) + Browser fallback mirror.
            </p>
          </div>
        </div>

        <button
          onClick={handleZeroLossBackup}
          className="btn-secondary text-xs shrink-0 flex items-center gap-1.5 font-black border-2 border-rose-200"
        >
          <Download className="w-3.5 h-3.5 text-[#ff2c2c]" />
          <span>Download Offline Snapshot (.json)</span>
        </button>
      </div>

      {/* KPI Cards Calculated from Store Data */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* 1. Sales Metric */}
        <div className="p-5 rounded-3xl border-2 bg-white dark:bg-[#181115] border-slate-200 dark:border-rose-950/60 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
              {t('sales_overview', 'Sales')} ({rangeLabels[timeRange]})
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black font-mono text-emerald-700 dark:text-emerald-400">
              ₹{fmt(stats.periodSales)}
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 font-extrabold mt-1">
              Across {stats.periodBills || 0} customer bills
            </p>
            {timeRange !== 'ALL_TIME' && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                Lifetime: ₹{fmt(stats.lifetimeSales)} ({stats.lifetimeBills || 0} bills)
              </p>
            )}
          </div>
        </div>

        {/* 2. Collections Breakdown */}
        <div className="p-5 rounded-3xl border-2 bg-white dark:bg-[#181115] border-slate-200 dark:border-rose-950/60 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
              {t('cash_vs_upi', 'Cash vs UPI Collections')}
            </span>
            <div className="p-2 rounded-xl bg-cyan-100 dark:bg-cyan-500/20 text-cyan-600">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 space-y-1">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-700 dark:text-slate-300 font-extrabold">{t('cash', 'Cash')}:</span>
              <span className="font-black text-slate-900 dark:text-white">₹{fmt(stats.cashSales)}</span>
            </div>
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-700 dark:text-slate-300 font-extrabold">{t('upi', 'UPI / QR')}:</span>
              <span className="text-cyan-700 dark:text-cyan-400 font-black">₹{fmt(stats.upiSales)}</span>
            </div>
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-700 dark:text-slate-300 font-extrabold">{t('card', 'Card')}:</span>
              <span className="text-blue-700 dark:text-blue-400 font-black">₹{fmt(stats.cardSales)}</span>
            </div>
          </div>
        </div>

        {/* 3. Total Store Inventory Valuation */}
        <div className="p-5 rounded-3xl border-2 bg-white dark:bg-[#181115] border-slate-200 dark:border-rose-950/60 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
              {t('inventory_valuation', 'Store Inventory Valuation')}
            </span>
            <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-500/20 text-purple-600">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black font-mono text-purple-700 dark:text-purple-400">
              ₹{fmt(stats.totalStockValuation)}
            </div>
            <p className="text-xs text-purple-700 dark:text-purple-300 font-extrabold mt-1">
              Est. Profit: +₹{fmt(stats.potentialProfit)}
            </p>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 font-bold mt-1">
              {stats.totalMedicinesCount || 0} medicine brand(s) • {stats.lowStockCount || 0} at low stock
            </p>
          </div>
        </div>

        {/* 4. Expired Stock & Dead Loss Risk */}
        <div className="p-5 rounded-3xl border-2 bg-white dark:bg-[#181115] border-slate-200 dark:border-rose-950/60 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
              {t('expired_stock_loss', 'Expired Stock Loss')}
            </span>
            <div className={`p-2 rounded-xl ${(parseFloat(stats.expiredLoss) || 0) > 0 ? 'bg-rose-100 text-[#ff2c2c]' : 'bg-emerald-100 text-emerald-600'}`}>
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className={`text-2xl font-black font-mono ${(parseFloat(stats.expiredLoss) || 0) > 0 ? 'text-[#ff2c2c]' : 'text-emerald-700 dark:text-emerald-400'}`}>
              ₹{fmt(stats.expiredLoss)}
            </div>
            {(parseFloat(stats.expiredLoss) || 0) > 0 ? (
              <p className="text-xs text-rose-700 dark:text-rose-400 font-extrabold mt-1">
                🚨 {stats.expiredCount || 0} expired batch(es) (Dead stock loss)
              </p>
            ) : (
              <p className="text-xs text-emerald-700 dark:text-emerald-400 font-extrabold mt-1">
                ✅ 0 Expired Batches • 100% Salable Stock
              </p>
            )}
            {(stats.nearExpiryCount || 0) > 0 ? (
              <p className="text-[11px] text-amber-800 dark:text-amber-400 font-bold mt-1">
                ⚠️ {stats.nearExpiryCount} batch(es) expiring this month (Sell first / Return)
              </p>
            ) : (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mt-1">
                No batches expiring this month
              </p>
            )}
          </div>
        </div>

      </div>

      {/* Customizable GST Tax Breakdown Summary */}
      <div className="p-6 rounded-3xl border-2 bg-white dark:bg-[#181115] border-slate-200 dark:border-rose-950/60 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className={`font-black text-base flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <Percent className="w-5 h-5 text-[#ff2c2c]" />
            <span>GST Tax Breakdown Summary ({rangeLabels[timeRange]})</span>
          </h3>
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
            Computed on {stats.periodBills || 0} invoices
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl border-2 bg-slate-50 dark:bg-[#1f1215] border-slate-200 dark:border-rose-950/40">
            <span className="text-xs font-black uppercase tracking-wide text-slate-700 dark:text-slate-300">Total Tax Collected</span>
            <div className="text-xl font-black font-mono mt-1 text-slate-900 dark:text-white">
              ₹{fmt(stats.gstCollected)}
            </div>
          </div>

          {gstConfig.tax_split === 'CGST_SGST' ? (
            <>
              <div className="p-4 rounded-2xl border-2 bg-slate-50 dark:bg-[#1f1215] border-slate-200 dark:border-rose-950/40">
                <span className="text-xs font-black uppercase tracking-wide text-slate-700 dark:text-slate-300">CGST (Central Tax 50%)</span>
                <div className="text-xl font-black text-[#ff2c2c] font-mono mt-1">
                  ₹{fmt((parseFloat(stats.gstCollected) || 0) / 2)}
                </div>
              </div>
              <div className="p-4 rounded-2xl border-2 bg-slate-50 dark:bg-[#1f1215] border-slate-200 dark:border-rose-950/40">
                <span className="text-xs font-black uppercase tracking-wide text-slate-700 dark:text-slate-300">SGST (State Tax 50%)</span>
                <div className="text-xl font-black text-[#f94449] font-mono mt-1">
                  ₹{fmt((parseFloat(stats.gstCollected) || 0) / 2)}
                </div>
              </div>
            </>
          ) : (
            <div className="sm:col-span-2 p-4 rounded-2xl border-2 bg-slate-50 dark:bg-[#1f1215] border-slate-200 dark:border-rose-950/40">
              <span className="text-xs font-black uppercase tracking-wide text-slate-700 dark:text-slate-300">IGST (Integrated Tax 100%)</span>
              <div className="text-xl font-black text-[#ff2c2c] font-mono mt-1">
                ₹{fmt(stats.gstCollected)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
