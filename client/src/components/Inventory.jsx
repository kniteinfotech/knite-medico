import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Edit3,
  Trash2,
  X,
  TrendingDown,
  ShieldAlert,
  Boxes,
  ChevronRight,
  ScanLine,
  FlaskConical,
  Tag,
  IndianRupee,
  Hash,
  MapPin,
  CalendarDays,
  Archive,
  FileText,
} from 'lucide-react';
import { db } from '../db/localDb';
import { SyncService } from '../services/syncService';
import { useLanguage } from '../i18n/languageContext';
import Pagination from './Pagination';

export default function Inventory({ onStockModified, theme }) {
  const { t } = useLanguage();
  const [medicines, setMedicines] = useState([]);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [filterType, setFilterType] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMed, setEditingMed] = useState(null);
  const [genericSearchSalt, setGenericSearchSalt] = useState('');
  const [gstSlabs, setGstSlabs] = useState([0, 5, 12, 18, 28]);

  const [formData, setFormData] = useState({
    name: '', generic_name: '', batch_number: '', expiry_date: '',
    rack: '', hsn_code: '30049099', mrp: '', purchase_price: '',
    sale_price: '', gst_rate: '0', stock_qty: '', min_stock: '15',
    description: ''
  });

  useEffect(() => { 
    loadInventory(); 
    loadGSTConfig();

    const handleSync = () => {
      loadInventory();
    };
    window.addEventListener('knite_sync_completed', handleSync);
    return () => window.removeEventListener('knite_sync_completed', handleSync);
  }, []);

  async function loadInventory() {
    const items = await db.medicines.filter(m => !m.is_deleted).toArray();
    setMedicines(items);
  }

  async function loadGSTConfig() {
    const gst = await db.settings.get('gst_config');
    if (gst && gst.slabs) {
      setGstSlabs(gst.slabs);
      if (gst.default_rate !== undefined)
        setFormData(prev => ({ ...prev, gst_rate: gst.default_rate.toString() }));
    }
  }

  function handleOpenAdd() {
    setEditingMed(null);
    setFormData({
      name: '', generic_name: '',
      batch_number: 'BCH-' + Math.floor(1000 + Math.random() * 9000),
      expiry_date: '', rack: '', hsn_code: '30049099', mrp: '',
      purchase_price: '', sale_price: '',
      gst_rate: '0',
      stock_qty: '', min_stock: '15',
      description: ''
    });
    setIsModalOpen(true);
  }

  function handleOpenEdit(med) {
    setEditingMed(med);
    setFormData({
      name: med.name, generic_name: med.generic_name || '',
      batch_number: med.batch_number || '', expiry_date: med.expiry_date || '',
      rack: med.rack || '', hsn_code: med.hsn_code || '30049099',
      mrp: med.mrp || '', purchase_price: med.purchase_price || '',
      sale_price: med.sale_price || '',
      gst_rate: (med.gst_rate !== undefined ? med.gst_rate : 12).toString(),
      stock_qty: med.stock_qty || '', min_stock: med.min_stock || '15',
      description: med.description || ''
    });
    setIsModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!formData.name || !formData.sale_price) {
      alert('Medicine name and sale price are required');
      return;
    }
    const payload = {
      name: formData.name.trim(), generic_name: formData.generic_name.trim(),
      batch_number: formData.batch_number.trim(), expiry_date: formData.expiry_date,
      rack: formData.rack.trim().toUpperCase(), hsn_code: formData.hsn_code.trim(),
      mrp: parseFloat(formData.mrp) || parseFloat(formData.sale_price),
      purchase_price: parseFloat(formData.purchase_price) || 0,
      sale_price: parseFloat(formData.sale_price),
      gst_rate: parseFloat(formData.gst_rate) || 0,
      stock_qty: parseInt(formData.stock_qty, 10) || 0,
      min_stock: parseInt(formData.min_stock, 10) || 10,
      description: (formData.description || '').trim(),
      is_deleted: false, updated_at: new Date().toISOString()
    };
    if (editingMed) {
      await db.medicines.update(editingMed.id, payload);
    } else {
      const newId = 'med_' + Math.random().toString(36).substring(2, 9);
      await db.medicines.add({ id: newId, ...payload });
    }
    setIsModalOpen(false);
    loadInventory();
    if (onStockModified) onStockModified();
    await SyncService.pushSync().catch(console.warn);
  }

  async function handleDelete(id) {
    if (confirm('Remove this medicine from inventory?')) {
      await db.medicines.update(id, { is_deleted: true, updated_at: new Date().toISOString() });
      loadInventory();
      if (onStockModified) onStockModified();
      await SyncService.pushSync().catch(console.warn);
    }
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thirtyDaysFromNow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 30);

  function getExpiryStatus(expiryStr) {
    if (!expiryStr) return 'GOOD';
    const exp = new Date(expiryStr);
    if (exp < todayStart) return 'EXPIRED';
    if (exp <= thirtyDaysFromNow) return 'NEAR_EXPIRY';
    return 'GOOD';
  }

  const filteredMedicines = medicines.filter(m => {
    const q = (genericSearchSalt || search).toLowerCase();
    const matchesSearch =
      m.name.toLowerCase().includes(q) ||
      (m.generic_name && m.generic_name.toLowerCase().includes(q)) ||
      (m.batch_number && m.batch_number.toLowerCase().includes(q)) ||
      (m.rack && m.rack.toLowerCase().includes(q)) ||
      (m.description && m.description.toLowerCase().includes(q));
    if (!matchesSearch) return false;
    const expStatus = getExpiryStatus(m.expiry_date);
    if (filterType === 'LOW_STOCK') return m.stock_qty <= m.min_stock;
    if (filterType === 'NEAR_EXPIRY') return expStatus === 'NEAR_EXPIRY';
    if (filterType === 'EXPIRED') return expStatus === 'EXPIRED';
    return true;
  });

  const ITEMS_PER_PAGE = 10;
  const paginatedMedicines = filteredMedicines.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterType, genericSearchSalt]);

  const lowStockCount = medicines.filter(m => m.stock_qty <= m.min_stock).length;
  const nearExpiryCount = medicines.filter(m => getExpiryStatus(m.expiry_date) === 'NEAR_EXPIRY').length;
  const expiredCount = medicines.filter(m => getExpiryStatus(m.expiry_date) === 'EXPIRED').length;

  const statCards = [
    {
      id: 'ALL', label: t('total_medicines', 'Total Medicines'), value: medicines.length,
      icon: Boxes,
      gradient: 'from-violet-500 to-indigo-600',
      bg: 'bg-violet-50', border: 'border-violet-200',
      text: 'text-violet-700', iconColor: 'text-violet-500',
      activeBorder: 'border-violet-500',
    },
    {
      id: 'LOW_STOCK', label: t('low_stock', 'Low Stock Alert'), value: lowStockCount,
      icon: TrendingDown,
      gradient: 'from-amber-500 to-orange-500',
      bg: 'bg-amber-50', border: 'border-amber-200',
      text: 'text-amber-700', iconColor: 'text-amber-500',
      activeBorder: 'border-amber-500',
    },
    {
      id: 'NEAR_EXPIRY', label: t('near_expiry', 'Near Expiry (30d)'), value: nearExpiryCount,
      icon: Clock,
      gradient: 'from-orange-500 to-red-500',
      bg: 'bg-orange-50', border: 'border-orange-200',
      text: 'text-orange-700', iconColor: 'text-orange-500',
      activeBorder: 'border-orange-500',
    },
    {
      id: 'EXPIRED', label: t('expired', 'Expired Stock'), value: expiredCount,
      icon: ShieldAlert,
      gradient: 'from-rose-500 to-red-600',
      bg: 'bg-rose-50', border: 'border-rose-200',
      text: 'text-rose-700', iconColor: 'text-rose-500',
      activeBorder: 'border-rose-500',
    },
  ];

  return (
    <div className="space-y-6 py-4">

      {/* ── Top Bar / Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-2xl bg-gradient-to-br from-[#ff2c2c] to-[#f94449] flex items-center justify-center shadow-lg shadow-red-200">
              <Package className="w-5 h-5 text-white" />
            </span>
            {t('inventory', 'Medicine Inventory')}
          </h2>
          <p className="text-sm text-slate-600 font-medium mt-1 ml-0.5">
            Real-time local database · Expiry tracking · Dosage instructions
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#ff2c2c] to-[#f94449] text-white text-sm font-bold shadow-lg shadow-red-200 hover:brightness-105 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          {t('add_medicine', 'Add Medicine')}
        </button>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map(card => {
          const Icon = card.icon;
          const isActive = filterType === card.id && !genericSearchSalt;
          return (
            <button
              key={card.id}
              onClick={() => { setFilterType(card.id); setGenericSearchSalt(''); }}
              className={`relative overflow-hidden p-4 rounded-2xl border-2 text-left transition-all duration-200 group
                ${isActive
                  ? `${card.bg} ${card.activeBorder} shadow-md`
                  : 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-md'
                }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className={`text-xs font-extrabold uppercase tracking-wider mb-1 ${isActive ? card.text : 'text-slate-600'}`}>
                    {card.label}
                  </p>
                  <p className={`text-3xl font-black ${isActive ? card.text : 'text-slate-900'}`}>
                    {card.value}
                  </p>
                </div>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all
                  ${isActive
                    ? `bg-gradient-to-br ${card.gradient} shadow-md`
                    : 'bg-slate-100 group-hover:bg-slate-200'
                  }`}
                >
                  <Icon className={`w-4.5 h-4.5 ${isActive ? 'text-white' : 'text-slate-600'}`} />
                </div>
              </div>
              {isActive && (
                <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r ${card.gradient}`} />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Generic Salt Filter Banner ── */}
      {genericSearchSalt && (
        <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-violet-50 border border-violet-200 text-violet-800">
          <div className="flex items-center gap-2.5 text-sm font-semibold">
            <FlaskConical className="w-4 h-4 text-violet-500 shrink-0" />
            Showing substitutes for generic salt:
            <span className="font-black underline underline-offset-2">{genericSearchSalt}</span>
          </div>
          <button
            onClick={() => setGenericSearchSalt('')}
            className="flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-xl bg-violet-100 hover:bg-violet-200 text-violet-700 transition"
          >
            <X className="w-3 h-3" /> Clear
          </button>
        </div>
      )}

      {/* ── Search ── */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-300 bg-white text-sm text-slate-900 font-semibold placeholder-slate-500 outline-none focus:border-[#ff2c2c] focus:ring-4 focus:ring-red-50 transition-all shadow-sm"
          placeholder={t('search_stock_placeholder', 'Search by brand name, generic salt, batch no, rack location…')}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-xl text-slate-500 hover:text-[#ff2c2c] hover:bg-red-50 transition"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table header */}
        <div className="px-5 py-3.5 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between">
          <span className="text-xs font-black text-slate-600 uppercase tracking-widest">
            {filteredMedicines.length} {filteredMedicines.length === 1 ? 'item' : 'items'} found
          </span>
          <span className="text-xs text-slate-600 font-bold">Prices incl. GST</span>
        </div>

        <div>
          {filteredMedicines.length === 0 ? (
            <div className="py-16 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
                  <Archive className="w-7 h-7 text-slate-400" />
                </div>
                <p className="text-slate-600 font-bold text-sm">No medicines match this filter</p>
                <button
                  onClick={() => { setFilterType('ALL'); setSearch(''); setGenericSearchSalt(''); }}
                  className="text-xs font-bold text-[#ff2c2c] hover:underline"
                >
                  Clear filters
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* ── Mobile Medicine Cards (< md) ── */}
              <div className="block md:hidden divide-y divide-slate-100">
                {paginatedMedicines.map((med) => {
                  const expStatus = getExpiryStatus(med.expiry_date);
                  const isLow = med.stock_qty <= med.min_stock;
                  const isOut = med.stock_qty <= 0;
                  return (
                    <div key={med.id} className="p-4 space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-extrabold text-slate-900 text-sm leading-tight truncate">{med.name}</h4>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-xs text-slate-500 font-medium truncate">{med.generic_name || 'Standard OTC'}</span>
                            {med.generic_name && (
                              <button
                                onClick={() => setGenericSearchSalt(med.generic_name)}
                                className="text-[10px] font-black text-violet-700 bg-violet-100 px-1.5 py-0.2 rounded shrink-0"
                              >
                                Subs
                              </button>
                            )}
                          </div>
                          {med.description && (
                            <p className="text-[11px] text-slate-500 mt-1 line-clamp-1 italic">
                              📝 {med.description}
                            </p>
                          )}
                        </div>

                        {/* Edit & Delete Action Buttons */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleOpenEdit(med)}
                            className="p-2 rounded-xl bg-slate-100 text-slate-600 active:bg-slate-200"
                            aria-label="Edit medicine"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(med.id)}
                            className="p-2 rounded-xl bg-rose-50 text-rose-600 active:bg-rose-100"
                            aria-label="Delete medicine"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Badges Row */}
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                        {med.rack && (
                          <span className="inline-flex items-center gap-1 font-mono font-black text-[#ff2c2c] bg-red-50 px-2 py-0.5 rounded-lg border border-red-200">
                            <MapPin className="w-3 h-3 text-red-500" /> Rack: {med.rack}
                          </span>
                        )}
                        <span className="font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                          Batch: {med.batch_number || '—'}
                        </span>
                        {expStatus === 'EXPIRED' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black bg-red-50 text-red-700 border border-red-200">
                            <ShieldAlert className="w-3 h-3 text-red-600" /> EXP {med.expiry_date}
                          </span>
                        )}
                        {expStatus === 'NEAR_EXPIRY' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-300">
                            <Clock className="w-3 h-3 text-amber-600" /> Exp: {med.expiry_date}
                          </span>
                        )}
                        {expStatus === 'GOOD' && (
                          <span className="text-[11px] font-mono text-slate-500">
                            Exp: {med.expiry_date || 'N/A'}
                          </span>
                        )}
                      </div>

                      {/* Pricing and Stock Footer */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                        {/* Stock Badge */}
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black border ${
                          isOut
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : isLow
                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        }`}>
                          {isOut && <ShieldAlert className="w-3 h-3" />}
                          {!isOut && isLow && <TrendingDown className="w-3 h-3" />}
                          {!isOut && !isLow && <CheckCircle2 className="w-3 h-3" />}
                          {med.stock_qty} in stock
                        </span>

                        {/* Price */}
                        <div className="flex items-baseline gap-2">
                          {med.mrp && parseFloat(med.mrp) > parseFloat(med.sale_price) && (
                            <span className="text-xs font-mono text-slate-400 line-through">
                              ₹{parseFloat(med.mrp).toFixed(2)}
                            </span>
                          )}
                          <span className="text-base font-black font-mono text-slate-900">
                            ₹{parseFloat(med.sale_price).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ── Desktop & Tablet Table (>= md) ── */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-xs font-black text-slate-700 uppercase tracking-wider">
                      <th className="px-5 py-3">{t('medicine_name', 'Medicine / Salt')}</th>
                      <th className="px-4 py-3">{t('batch_number', 'Batch')}</th>
                      <th className="px-4 py-3">{t('expiry_date', 'Expiry')}</th>
                      <th className="px-4 py-3">{t('rack_location', 'Rack')}</th>
                      <th className="px-4 py-3 text-center">{t('gst_slab', 'GST')}</th>
                      <th className="px-4 py-3 text-right">{t('mrp', 'MRP')}</th>
                      <th className="px-4 py-3 text-right">{t('sale_price', 'Sale Rate')}</th>
                      <th className="px-4 py-3 text-center">{t('stock_quantity', 'Stock')}</th>
                      <th className="px-4 py-3 text-center">{t('actions', 'Actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedMedicines.map((med, idx) => {
                      const expStatus = getExpiryStatus(med.expiry_date);
                      const isLow = med.stock_qty <= med.min_stock;
                      const isOut = med.stock_qty <= 0;
                      return (
                        <tr
                          key={med.id}
                          className={`border-b border-slate-100 hover:bg-slate-50 transition-colors group ${
                            idx % 2 === 0 ? '' : 'bg-slate-50/50'
                          }`}
                        >
                          {/* Medicine Name & Description */}
                          <td className="px-5 py-3.5">
                            <div className="font-extrabold text-slate-900 text-[13px] leading-tight">{med.name}</div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[11px] text-slate-600 font-semibold">
                                {med.generic_name || 'Standard OTC'}
                              </span>
                              {med.generic_name && (
                                <button
                                  onClick={() => setGenericSearchSalt(med.generic_name)}
                                  className="text-[10px] font-black text-violet-700 hover:text-violet-900 bg-violet-100 hover:bg-violet-200 px-1.5 py-0.5 rounded-md transition"
                                >
                                  Substitutes
                                </button>
                              )}
                            </div>
                            {med.description && (
                              <div className="text-[11px] text-slate-600 font-medium mt-1 bg-slate-100/90 rounded-lg px-2 py-0.5 line-clamp-1 border border-slate-200/60 flex items-center gap-1.5" title={med.description}>
                                <FileText className="w-3 h-3 text-[#ff2c2c] shrink-0" />
                                <span className="truncate">{med.description}</span>
                              </div>
                            )}
                          </td>

                          {/* Batch */}
                          <td className="px-4 py-3.5">
                            <span className="font-mono text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                              {med.batch_number || '—'}
                            </span>
                          </td>

                          {/* Expiry */}
                          <td className="px-4 py-3.5">
                            {expStatus === 'EXPIRED' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black bg-red-50 text-red-700 border border-red-200">
                                <ShieldAlert className="w-3 h-3 text-red-600" />
                                EXP {med.expiry_date}
                              </span>
                            )}
                            {expStatus === 'NEAR_EXPIRY' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-300">
                                <Clock className="w-3 h-3 text-amber-600" />
                                {med.expiry_date}
                              </span>
                            )}
                            {expStatus === 'GOOD' && (
                              <span className="text-[12px] font-mono font-bold text-slate-700">
                                {med.expiry_date || 'N/A'}
                              </span>
                            )}
                          </td>

                          {/* Rack */}
                          <td className="px-4 py-3.5">
                            <span className="inline-flex items-center gap-1 font-mono text-[11px] font-black text-[#ff2c2c] bg-red-50 px-2 py-0.5 rounded-lg border border-red-200">
                              <MapPin className="w-3 h-3 text-red-500" />
                              {med.rack || '—'}
                            </span>
                          </td>

                          {/* GST */}
                          <td className="px-4 py-3.5 text-center">
                            <span className="font-mono text-xs font-extrabold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                              {med.gst_rate ?? 0}%
                            </span>
                          </td>

                          {/* MRP */}
                          <td className="px-4 py-3.5 text-right">
                            <span className="text-[12px] font-mono font-semibold text-slate-500 line-through">
                              ₹{parseFloat(med.mrp || 0).toFixed(2)}
                            </span>
                          </td>

                          {/* Sale Rate */}
                          <td className="px-4 py-3.5 text-right">
                            <span className="text-[13px] font-black font-mono text-slate-900">
                              ₹{parseFloat(med.sale_price).toFixed(2)}
                            </span>
                          </td>

                          {/* Stock */}
                          <td className="px-4 py-3.5 text-center">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-black border ${
                              isOut
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : isLow
                                ? 'bg-amber-50 text-amber-800 border-amber-300'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            }`}>
                              {isOut && <ShieldAlert className="w-3 h-3" />}
                              {!isOut && isLow && <TrendingDown className="w-3 h-3" />}
                              {!isOut && !isLow && <CheckCircle2 className="w-3 h-3" />}
                              {med.stock_qty} units
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3.5 text-center">
                            <div className="flex items-center justify-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleOpenEdit(med)}
                                className="p-2 rounded-xl text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition"
                                title="Edit"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(med.id)}
                                className="p-2 rounded-xl text-slate-600 hover:text-red-600 hover:bg-red-50 transition"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* 10 per page pagination */}
              <div className="p-3 border-t border-slate-100">
                <Pagination
                  currentPage={currentPage}
                  totalItems={filteredMedicines.length}
                  itemsPerPage={ITEMS_PER_PAGE}
                  onPageChange={setCurrentPage}
                  theme={theme}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Add / Edit Modal ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl shadow-black/20 overflow-hidden border border-slate-200">

            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-[#ff2c2c] to-[#f94449] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                  <Package className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">
                    {editingMed ? 'Edit Medicine' : 'Add New Medicine'}
                  </h3>
                  <p className="text-[11px] text-red-100 font-medium">
                    {editingMed ? 'Update stock, pricing & details' : 'Enter complete medicine details'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">

              {/* Name */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-extrabold text-slate-700 mb-1.5">
                  <Tag className="w-3 h-3 text-slate-500" /> {t('medicine_name', 'Brand / Medicine Name *')}
                </label>
                <input
                  type="text" required
                  className="input-field text-slate-900 font-semibold"
                  placeholder="e.g. Augmentin 625 Duo Tablet"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              {/* Generic */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-extrabold text-slate-700 mb-1.5">
                  <FlaskConical className="w-3 h-3 text-slate-500" /> {t('generic_composition', 'Generic Salt / Composition')}
                </label>
                <input
                  type="text"
                  className="input-field text-slate-900 font-semibold"
                  placeholder="e.g. Amoxicillin (500mg) + Clavulanic Acid (125mg)"
                  value={formData.generic_name}
                  onChange={e => setFormData({ ...formData, generic_name: e.target.value })}
                />
              </div>

              {/* Medicine Description / Dosage & Usage Notes */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-extrabold text-slate-700 mb-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#ff2c2c]" /> {t('medicine_description', 'Medicine Description / Dosage Notes')}
                </label>
                <textarea
                  rows={2}
                  className="input-field text-slate-900 font-medium text-xs resize-none"
                  placeholder={t('medicine_description_placeholder', 'e.g. Take 1 tablet after meals twice daily. Store below 25°C. Useful for fever/infection.')}
                  value={formData.description || ''}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              {/* Batch + Expiry */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-extrabold text-slate-700 mb-1.5">
                    <Hash className="w-3 h-3 text-slate-500" /> {t('batch_number', 'Batch Number')}
                  </label>
                  <input
                    type="text"
                    className="input-field font-mono text-slate-900 font-bold"
                    placeholder="BCH-8821"
                    value={formData.batch_number}
                    onChange={e => setFormData({ ...formData, batch_number: e.target.value })}
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-extrabold text-slate-700 mb-1.5">
                    <CalendarDays className="w-3 h-3 text-slate-500" /> {t('expiry_date', 'Expiry Date')}
                  </label>
                  <input
                    type="date"
                    className="input-field text-slate-900 font-semibold"
                    value={formData.expiry_date}
                    onChange={e => setFormData({ ...formData, expiry_date: e.target.value })}
                  />
                </div>
              </div>

              {/* Rack + GST */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-extrabold text-slate-700 mb-1.5">
                    <MapPin className="w-3 h-3 text-slate-500" /> Rack / Shelf Location
                  </label>
                  <input
                    type="text"
                    className="input-field font-mono uppercase text-slate-900 font-bold"
                    placeholder="B-01"
                    value={formData.rack}
                    onChange={e => setFormData({ ...formData, rack: e.target.value })}
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-extrabold text-slate-700 mb-1.5">
                    <ScanLine className="w-3 h-3 text-slate-500" /> GST Slab
                  </label>
                  <select
                    className="input-field font-bold text-slate-900"
                    value={formData.gst_rate}
                    onChange={e => setFormData({ ...formData, gst_rate: e.target.value })}
                  >
                    {gstSlabs.map(slab => (
                      <option key={slab} value={slab.toString()}>
                        {slab}% {slab === 12 ? '(Standard)' : slab === 0 ? '(Nil)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Prices */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-extrabold text-slate-700 mb-2">
                  <IndianRupee className="w-3 h-3 text-slate-500" /> Pricing
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-600 font-bold mb-1 block">MRP (₹)</label>
                    <input type="number" step="0.01" className="input-field text-sm font-semibold text-slate-900" placeholder="100.00"
                      value={formData.mrp} onChange={e => setFormData({ ...formData, mrp: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-600 font-bold mb-1 block">Purchase (₹)</label>
                    <input type="number" step="0.01" className="input-field text-sm font-semibold text-slate-900" placeholder="70.00"
                      value={formData.purchase_price} onChange={e => setFormData({ ...formData, purchase_price: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#ff2c2c] font-black mb-1 block">Sale Rate * (₹)</label>
                    <input type="number" step="0.01" required className="input-field text-sm font-bold text-slate-900 border-[#ffd7db] focus:border-[#ff2c2c]"
                      placeholder="95.00" value={formData.sale_price}
                      onChange={e => setFormData({ ...formData, sale_price: e.target.value })} />
                  </div>
                </div>
              </div>

              {/* Stock */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-extrabold text-slate-700 mb-1.5">
                    <Boxes className="w-3 h-3 text-slate-500" /> Stock Quantity
                  </label>
                  <input type="number" className="input-field font-mono font-bold text-slate-900" placeholder="50"
                    value={formData.stock_qty} onChange={e => setFormData({ ...formData, stock_qty: e.target.value })} />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-extrabold text-slate-700 mb-1.5">
                    <AlertTriangle className="w-3 h-3 text-slate-500" /> Min Stock Warning
                  </label>
                  <input type="number" className="input-field font-mono font-bold text-slate-900" placeholder="15"
                    value={formData.min_stock} onChange={e => setFormData({ ...formData, min_stock: e.target.value })} />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 rounded-2xl border border-slate-300 text-slate-700 text-sm font-bold hover:bg-slate-100 transition"
                >
                  {t('cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-2xl bg-gradient-to-r from-[#ff2c2c] to-[#f94449] text-white text-sm font-black shadow-md shadow-red-200 hover:brightness-105 active:scale-95 transition-all"
                >
                  {editingMed ? t('save_changes', 'Save Changes') : t('add_to_inventory', 'Add to Inventory')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
