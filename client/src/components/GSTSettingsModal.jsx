import React, { useState, useEffect } from 'react';
import { 
  Check, 
  X, 
  Plus,
  ShieldCheck,
  FileCheck
} from 'lucide-react';
import { db } from '../db/localDb';

export default function GSTSettingsModal({ isOpen, onClose, onSave, theme }) {
  const [enableGst, setEnableGst] = useState(true); // GST Registered vs Non-GST Unregistered Store
  const [slabs, setSlabs] = useState([0, 5, 12, 18, 28]);
  const [newSlab, setNewSlab] = useState('');
  const [defaultRate, setDefaultRate] = useState(0);
  const [pricingMode, setPricingMode] = useState('INCLUSIVE'); // INCLUSIVE vs EXCLUSIVE
  const [taxSplit, setTaxSplit] = useState('CGST_SGST'); // CGST_SGST (50/50) or IGST (100)
  const [gstin, setGstin] = useState('');

  const isDark = theme === 'dark';

  useEffect(() => {
    if (!isOpen) return;
    db.settings.get('gst_config').then((config) => {
      if (config) {
        if (config.enable_gst !== undefined) setEnableGst(config.enable_gst);
        if (config.slabs) setSlabs(config.slabs);
        if (config.default_rate !== undefined) setDefaultRate(config.default_rate);
        if (config.pricing_mode) setPricingMode(config.pricing_mode);
        if (config.tax_split) setTaxSplit(config.tax_split);
        if (config.gstin) setGstin(config.gstin);
      } else {
        db.settings.get('store_profile').then(profile => {
          if (profile && profile.gstin) setGstin(profile.gstin);
        });
      }
    });
  }, [isOpen]);

  if (!isOpen) return null;

  function handleAddSlab(e) {
    e.preventDefault();
    const val = parseFloat(newSlab);
    if (!isNaN(val) && val >= 0 && !slabs.includes(val)) {
      const updated = [...slabs, val].sort((a, b) => a - b);
      setSlabs(updated);
      setNewSlab('');
    }
  }

  function handleRemoveSlab(slabToRemove) {
    if (slabs.length <= 1) {
      alert('You must have at least one GST slab');
      return;
    }
    const updated = slabs.filter(s => s !== slabToRemove);
    setSlabs(updated);
    if (defaultRate === slabToRemove) {
      setDefaultRate(updated[0] || 0);
    }
  }

  async function handleSave() {
    const config = {
      key: 'gst_config',
      enable_gst: enableGst,
      slabs,
      default_rate: defaultRate,
      pricing_mode: pricingMode,
      tax_split: taxSplit,
      gstin: enableGst ? gstin.trim() : '',
      updated_at: new Date().toISOString()
    };

    await db.settings.put(config);
    // Also update GSTIN in store profile if set
    const profile = await db.settings.get('store_profile');
    if (profile) {
      profile.gstin = enableGst ? gstin.trim() : '';
      await db.settings.put(profile);
    }

    if (onSave) onSave(config);
    onClose();
  }

  const inputCls = isDark
    ? 'bg-[#251820] border-rose-900/50 text-white placeholder-slate-500'
    : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400';
  const selectCls = isDark
    ? 'bg-[#251820] border-rose-900/50 text-white'
    : 'bg-white border-slate-300 text-slate-900';
  const labelCls = isDark ? 'text-slate-300' : 'text-slate-700';
  const dividerCls = isDark ? 'border-rose-950/40' : 'border-slate-100';
  const chipCls = isDark ? 'border-rose-800/60 bg-rose-950/40 text-rose-300' : 'border-rose-200 bg-rose-50 text-[#ff2c2c]';
  const optionActive = isDark ? 'border-rose-500 bg-rose-950/60 text-rose-200 font-bold shadow-sm' : 'border-[#ff2c2c] bg-rose-50 text-[#ff2c2c] font-bold shadow-sm';
  const optionIdle = isDark ? 'border-slate-700 bg-[#1e1318] text-slate-300 hover:bg-[#291b22]' : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white';
  const cancelBtn = isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700';
  const addBtn = isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-800';
  const subText = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-3 sm:p-6 overflow-hidden">
      <div className={`relative w-full max-w-lg max-h-[88vh] sm:max-h-[84vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden my-auto transition-all ${
        isDark ? 'bg-[#180e12] border-rose-900/40 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {/* Header (Fixed at top) */}
        <div className={`shrink-0 px-6 py-4 flex items-center justify-between border-b ${dividerCls}`}>
          <div className="flex items-center gap-3">
            <div className="p-1 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center shrink-0">
              <img src="/logo_icon.png" alt="Knite Medico Logo" className="w-9 h-9 object-contain drop-shadow-xs" />
            </div>
            <div>
              <h3 className={`font-extrabold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>Customizable Tax Engine &amp; GST Mode</h3>
              <p className={`text-xs font-medium ${subText}`}>Choose GST Registered or Non-GST Pharmacy Billing</p>
            </div>
          </div>
          <button onClick={onClose} className={`p-1.5 rounded-xl transition ${isDark ? 'text-slate-400 hover:text-white hover:bg-rose-950/40' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'}`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 overscroll-contain">
          {/* GST Registration Mode Card */}
          <div>
            <label className={`text-xs font-bold mb-2 block ${labelCls}`}>
              Pharmacy Registration Status
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setEnableGst(true)}
                className={`p-3.5 rounded-2xl border text-left transition ${enableGst ? optionActive : optionIdle}`}
              >
                <div className="text-xs font-bold flex items-center gap-1.5 mb-1">
                  <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>GST Registered Store</span>
                </div>
                <div className={`text-[10px] leading-normal ${subText}`}>Calculates CGST/SGST/IGST tax slabs on bills</div>
              </button>

              <button
                type="button"
                onClick={() => setEnableGst(false)}
                className={`p-3.5 rounded-2xl border text-left transition ${!enableGst ? optionActive : optionIdle}`}
              >
                <div className="text-xs font-bold flex items-center gap-1.5 mb-1">
                  <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Non-GST / Unregistered</span>
                </div>
                <div className={`text-[10px] leading-normal ${subText}`}>0% Tax across all items (Clean Bill of Supply)</div>
              </button>
            </div>
          </div>

          {/* GSTIN Field (Only if GST enabled) */}
          {enableGst && (
            <div>
              <label className={`text-xs font-bold mb-1.5 block ${labelCls}`}>
                Store GSTIN Identification Number
              </label>
              <input
                type="text"
                className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono font-bold uppercase outline-none focus:ring-2 focus:ring-[#ff2c2c]/20 focus:border-[#ff2c2c] transition ${inputCls}`}
                placeholder="e.g. 33AAAAA0000A1Z5"
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
              />
            </div>
          )}

          {/* Tax Pricing Mode */}
          <div>
            <label className={`text-xs font-bold mb-2 block ${labelCls}`}>
              POS Billing Tax Mode
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setPricingMode('INCLUSIVE')}
                className={`p-3.5 rounded-2xl border text-left transition ${pricingMode === 'INCLUSIVE' ? optionActive : optionIdle}`}
              >
                <div className="text-xs font-bold mb-1">Inclusive GST (Retail Chemist)</div>
                <div className={`text-[10px] leading-normal ${subText}`}>Sale price includes tax (Tax extracted automatically)</div>
              </button>

              <button
                type="button"
                onClick={() => setPricingMode('EXCLUSIVE')}
                className={`p-3.5 rounded-2xl border text-left transition ${pricingMode === 'EXCLUSIVE' ? optionActive : optionIdle}`}
              >
                <div className="text-xs font-bold mb-1">Exclusive GST (Wholesale/B2B)</div>
                <div className={`text-[10px] leading-normal ${subText}`}>Tax added on top of base sale price</div>
              </button>
            </div>
          </div>

          {/* Customizable Slabs Management */}
          <div>
            <label className={`text-xs font-bold mb-2 block ${labelCls}`}>
              Custom GST Tax Slabs (%)
            </label>

            <div className="flex flex-wrap gap-2 mb-3">
              {slabs.map((rate) => (
                <div
                  key={rate}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold font-mono ${chipCls}`}
                >
                  <span>{rate}% GST</span>
                  {defaultRate === rate && (
                    <span className="text-[9px] bg-[#ff2c2c] text-white px-1.5 py-0.5 rounded font-sans uppercase">
                      Default
                    </span>
                  )}
                  {slabs.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveSlab(rate)}
                      className={`p-0.5 transition ${isDark ? 'text-rose-400 hover:text-rose-200' : 'text-slate-400 hover:text-rose-600'}`}
                      title="Remove Slab"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <form onSubmit={handleAddSlab} className="flex gap-2">
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                className={`flex-1 px-3 py-2 rounded-xl border text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-[#ff2c2c]/20 focus:border-[#ff2c2c] transition ${inputCls}`}
                placeholder="Enter custom GST rate (e.g. 3, 6, 28)..."
                value={newSlab}
                onChange={(e) => setNewSlab(e.target.value)}
              />
              <button
                type="submit"
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1.5 ${addBtn}`}
              >
                <Plus className="w-4 h-4 text-[#ff2c2c]" />
                <span>Add Rate</span>
              </button>
            </form>
          </div>

          {/* Default GST Slab for new stock */}
          <div>
            <label className={`text-xs font-bold mb-1.5 block ${labelCls}`}>
              Default GST Slab for New Medicines
            </label>
            <select
              className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-bold outline-none focus:ring-2 focus:ring-[#ff2c2c]/20 focus:border-[#ff2c2c] transition ${selectCls}`}
              value={defaultRate}
              onChange={(e) => setDefaultRate(parseFloat(e.target.value))}
            >
              {slabs.map((s) => (
                <option key={s} value={s}>
                  {s}% GST {s === 12 ? '(Standard Pharma Benchmark)' : s === 0 ? '(Exempted / Nil)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Intra vs Inter-State Tax Split */}
          <div>
            <label className={`text-xs font-bold mb-1.5 block ${labelCls}`}>
              Tax Ledger Breakdown Format
            </label>
            <select
              className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-bold outline-none focus:ring-2 focus:ring-[#ff2c2c]/20 focus:border-[#ff2c2c] transition ${selectCls}`}
              value={taxSplit}
              onChange={(e) => setTaxSplit(e.target.value)}
            >
              <option value="CGST_SGST">Intra-State: Split into CGST (50%) + SGST (50%)</option>
              <option value="IGST">Inter-State: Combined IGST (100%)</option>
            </select>
          </div>

        </div>

        {/* Actions (Pinned at bottom) */}
        <div className={`shrink-0 px-6 py-3.5 flex justify-end gap-2.5 border-t ${dividerCls} ${
          isDark ? 'bg-[#180e12]' : 'bg-slate-50/80'
        }`}>
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition ${cancelBtn}`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#ff2c2c] to-[#f94449] text-white text-xs font-black shadow-md shadow-rose-500/20 transition flex items-center gap-1.5 hover:shadow-lg hover:shadow-rose-500/30 active:scale-95"
          >
            <Check className="w-4 h-4" />
            <span>Apply GST Configuration</span>
          </button>
        </div>
      </div>
    </div>
  );
}
