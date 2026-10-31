import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard, 
  QrCode, 
  DollarSign, 
  User, 
  UserPlus, 
  Printer, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Percent, 
  RefreshCw, 
  Sparkles, 
  MessageSquare, 
  Smartphone, 
  ExternalLink,
  Lock,
  Repeat,
  Copy,
  Check
} from 'lucide-react';
import { db, getActiveStoreId } from '../db/localDb';
import { SyncService } from '../services/syncService';
import { getCloudUrl } from '../utils/cloudConfig';
import { useLanguage } from '../i18n/languageContext';
import ThermalReceipt from './ThermalReceipt';
import PhonePeModal from './PhonePeModal';

export default function POSBilling({ onSaleComplete, theme, onOpenWhatsAppModal }) {
  const { language, whatsappLanguage, setWhatsappLanguage, availableLanguages, t } = useLanguage();
  const [medicines, setMedicines] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [paymentMode, setPaymentMode] = useState('CASH'); // CASH, UPI, CARD, CREDIT
  const [discountType, setDiscountType] = useState('PERCENT'); // 'PERCENT' or 'FLAT'
  const [discountValue, setDiscountValue] = useState(0); // Optional editable discount
  const [storeInfo, setStoreInfo] = useState(null);
  const [gstConfig, setGstConfig] = useState({ enable_gst: true, slabs: [0, 5, 12, 18, 28], pricing_mode: 'INCLUSIVE', tax_split: 'CGST_SGST' });
  const [whatsappConfig, setWhatsappConfig] = useState({ enabled: false, auto_open: false });
  const [sendWhatsApp, setSendWhatsApp] = useState(false); // Optional, default off
  const [includeDescription, setIncludeDescription] = useState(false); // Optional: send/include description in bill & WhatsApp
  const [selectedSearchIndex, setSelectedSearchIndex] = useState(0); // Keyboard Enter & Mouse navigation index
  const [printReceipt, setPrintReceipt] = useState(false); // Optional, default off
  const [postSalePrompt, setPostSalePrompt] = useState(null);
  const [waNotification, setWaNotification] = useState(null);
  const [waDeviceStatus, setWaDeviceStatus] = useState({ isConnected: false, checked: false, userPhone: null });
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const isDevUser = (storeInfo?.email || '').toLowerCase() === 'nitheesh8797@gmail.com';
  const has799Plan = isDevUser || storeInfo?.plan_type === 'cloud_799' || storeInfo?.plan_type === 'pro_cloud' || storeInfo?.plan_type === 'enterprise';
  const [waLinkAlert, setWaLinkAlert] = useState(null); // Alert when device is not linked
  const [activeReceipt, setActiveReceipt] = useState(null);
  const [showUPISimulator, setShowUPISimulator] = useState(false);
  const [copiedField, setCopiedField] = useState(null);

  function copyToClipboard(text, field) {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }
  }

  const searchInputRef = useRef(null);
  const searchContainerRef = useRef(null);
  const checkoutSectionRef = useRef(null);
  const isDark = theme === 'dark';

  // Load medicines, store profile, and configs
  useEffect(() => {
    loadMedicines();
    loadConfigs();
    checkWaStatus();
  }, []);

  // Click outside search container to close dropdown
  useEffect(() => {
    function handleClickOutside(e) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setSearchResults([]);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-dismiss WhatsApp notification toast
  useEffect(() => {
    if (waNotification) {
      const timer = setTimeout(() => setWaNotification(null), 4500);
      return () => clearTimeout(timer);
    }
  }, [waNotification]);

  // Auto-dismiss post-sale print prompt
  useEffect(() => {
    if (postSalePrompt) {
      const timer = setTimeout(() => setPostSalePrompt(null), 10000);
      return () => clearTimeout(timer);
    }
  }, [postSalePrompt]);

  // Helper to check medicine expiration
  function getExpiryStatus(expiryStr) {
    if (!expiryStr) return 'normal';
    try {
      const parts = expiryStr.trim().split(/[-/]/);
      let expDate;
      if (parts.length === 2) {
        const month = parseInt(parts[0], 10) - 1;
        const year = parts[1].length === 2 ? 2000 + parseInt(parts[1], 10) : parseInt(parts[1], 10);
        expDate = new Date(year, month + 1, 0);
      } else if (parts.length === 3) {
        expDate = new Date(expiryStr);
      }
      if (expDate && !isNaN(expDate.getTime())) {
        const now = new Date();
        if (expDate < now) return 'expired';
        const diffDays = Math.ceil((expDate - now) / (1000 * 60 * 60 * 24));
        if (diffDays <= 45) return 'near_expiry';
      }
    } catch {}
    return 'normal';
  }

  async function checkWaStatus() {
    try {
      const cloudUrl = getCloudUrl();
      const storeId = getActiveStoreId();
      const res = await fetch(`${cloudUrl}/api/whatsapp/status?store_id=${encodeURIComponent(storeId)}`);
      const data = await res.json();
      if (data.success) {
        setWaDeviceStatus({ isConnected: !!data.isConnected, userPhone: data.userPhone, checked: true });
      }
    } catch (e) {
      console.warn('Could not check WhatsApp status:', e.message);
    }
  }

  async function loadMedicines() {
    const all = await db.medicines.filter(m => !m.is_deleted).toArray();
    setMedicines(all);
  }

  async function loadConfigs() {
    const profile = await db.settings.get('store_profile');
    if (profile) setStoreInfo(profile);

    const gst = await db.settings.get('gst_config');
    if (gst) setGstConfig(gst);

    const wa = await db.settings.get('whatsapp_config');
    if (wa) {
      setWhatsappConfig(wa);
    }
  }

  // Live Medicine Search (by Brand, Generic Salt, Batch, or Barcode)
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }
    const q = searchTerm.toLowerCase();
    const matches = medicines.filter(m => 
      m.name.toLowerCase().includes(q) ||
      (m.generic_name && m.generic_name.toLowerCase().includes(q)) ||
      (m.batch_number && m.batch_number.toLowerCase().includes(q)) ||
      (m.rack && m.rack.toLowerCase().includes(q)) ||
      (m.description && m.description.toLowerCase().includes(q))
    ).slice(0, 8);
    setSearchResults(matches);
    setSelectedSearchIndex(0);
  }, [searchTerm, medicines]);

  // Keyboard navigation & Enter button handler for medicine search
  function handleSearchKeyDown(e) {
    if (searchResults.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIdx = (selectedSearchIndex + 1) % searchResults.length;
      setSelectedSearchIndex(nextIdx);
      document.getElementById(`search-result-item-${nextIdx}`)?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const nextIdx = (selectedSearchIndex - 1 + searchResults.length) % searchResults.length;
      setSelectedSearchIndex(nextIdx);
      document.getElementById(`search-result-item-${nextIdx}`)?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const targetMed = searchResults[selectedSearchIndex] || searchResults[0];
      if (targetMed) {
        if (targetMed.stock_qty <= 0) {
          alert(`⚠️ ${targetMed.name} is currently OUT OF STOCK!`);
        } else {
          addToCart(targetMed);
        }
      }
    } else if (e.key === 'Escape') {
      setSearchResults([]);
    }
  }

  // Add Item to Cart
  function addToCart(medicine) {
    if (medicine.stock_qty <= 0) {
      alert(`⚠️ ${medicine.name} is currently OUT OF STOCK!`);
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.id === medicine.id);
      const parsedPrice = parseFloat(medicine.sale_price) || 0;
      if (existing) {
        if (existing.quantity >= medicine.stock_qty) {
          alert(`⚠️ Only ${medicine.stock_qty} units available in stock!`);
          return prev;
        }
        return prev.map(item => {
          if (item.id === medicine.id) {
            const newQty = item.quantity + 1;
            const price = parseFloat(item.sale_price) || parsedPrice;
            return { ...item, quantity: newQty, sale_price: price, total_amount: newQty * price };
          }
          return item;
        });
      } else {
        return [
          ...prev,
          {
            id: medicine.id,
            medicine_name: medicine.name,
            generic_name: medicine.generic_name,
            description: medicine.description || '',
            batch_number: medicine.batch_number,
            expiry_date: medicine.expiry_date,
            rack: medicine.rack,
            stock_qty: medicine.stock_qty,
            sale_price: parsedPrice,
            gst_rate: (medicine.gst_rate !== undefined && medicine.gst_rate !== null) ? parseFloat(medicine.gst_rate) : 0,
            quantity: 1,
            total_amount: parsedPrice
          }
        ];
      }
    });

    setSearchTerm('');
    setSearchResults([]);
    searchInputRef.current?.focus();
  }

  // Update item quantity
  function updateQuantity(id, delta) {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = item.quantity + delta;
        if (newQty <= 0) return null;
        if (newQty > item.stock_qty) {
          alert(`⚠️ Cannot exceed available stock of ${item.stock_qty}`);
          return item;
        }
        const price = parseFloat(item.sale_price) || 0;
        return {
          ...item,
          quantity: newQty,
          sale_price: price,
          total_amount: newQty * price
        };
      }
      return item;
    }).filter(Boolean));
  }

  // Directly set item quantity from input field
  function setDirectQuantity(id, qty) {
    const parsed = parseInt(qty, 10);
    if (isNaN(parsed) || parsed < 1) return;
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const finalQty = Math.max(1, Math.min(item.stock_qty, parsed));
        const price = parseFloat(item.sale_price) || 0;
        return {
          ...item,
          quantity: finalQty,
          total_amount: finalQty * price
        };
      }
      return item;
    }));
  }

  // Remove item
  function removeItem(id) {
    setCart(prev => prev.filter(item => item.id !== id));
  }

  // Update item GST rate directly in cart
  function updateItemGst(id, newRate) {
    setCart(prev => prev.map(item => item.id === id ? { ...item, gst_rate: parseFloat(newRate) || 0 } : item));
  }

  // Apply GST Rate to all items in cart at once
  function applyGstToAllItems(rate) {
    const numericRate = Math.max(0, parseFloat(rate) || 0);
    setCart(prev => prev.map(item => ({ ...item, gst_rate: numericRate })));
  }

  // Check if store operates as Non-GST / Unregistered
  const isNonGstStore = gstConfig.enable_gst === false;

  // Tax and Totals Calculation
  const subtotal = cart.reduce((sum, item) => sum + (parseFloat(item.total_amount) || 0), 0);
  const discountAmount = discountType === 'PERCENT'
    ? (subtotal * discountValue) / 100
    : Math.min(subtotal, discountValue);
  const taxableAmount = Math.max(0, subtotal - discountAmount);

  // Calculate tax per item's customized GST rate (Bypassed if Non-GST Store)
  let totalTax = 0;
  if (!isNonGstStore) {
    if (gstConfig.pricing_mode === 'EXCLUSIVE') {
      // Exclusive mode: tax is added on top
      cart.forEach(it => {
        const itTotal = parseFloat(it.total_amount) || 0;
        const itemRatio = itTotal / (subtotal || 1);
        const discountedItemTotal = itTotal - (discountAmount * itemRatio);
        const rate = parseFloat(it.gst_rate) || 0;
        totalTax += (discountedItemTotal * (rate / 100));
      });
    } else {
      // Inclusive mode (standard pharma): tax is extracted from retail price
      cart.forEach(it => {
        const itTotal = parseFloat(it.total_amount) || 0;
        const itemRatio = itTotal / (subtotal || 1);
        const discountedItemTotal = itTotal - (discountAmount * itemRatio);
        const rate = parseFloat(it.gst_rate) || 0;
        if (rate > 0) {
          totalTax += (discountedItemTotal - (discountedItemTotal / (1 + rate / 100)));
        }
      });
    }
  }

  const grandTotal = (!isNonGstStore && gstConfig.pricing_mode === 'EXCLUSIVE')
    ? Math.round(taxableAmount + totalTax)
    : Math.round(taxableAmount);

  // Complete Sale & Print Bill & Trigger WhatsApp
  async function handleCheckout() {
    if (cart.length === 0) {
      alert('Please add at least one medicine to the bill!');
      return;
    }

    const invoiceId = 'inv_' + Date.now();
    const invoiceNum = 'KNM-' + Math.floor(100000 + Math.random() * 900000);

    const invoiceRecord = {
      id: invoiceId,
      invoice_number: invoiceNum,
      customer_name: customerName.trim() || 'General Customer',
      customer_phone: customerPhone.trim() || '',
      doctor_name: doctorName.trim() || '',
      payment_mode: paymentMode,
      subtotal: subtotal,
      discount_amount: discountAmount,
      tax_amount: totalTax,
      grand_total: grandTotal,
      items: cart.map(item => ({
        medicine_id: item.id,
        medicine_name: item.medicine_name,
        description: item.description || '',
        batch_number: item.batch_number,
        expiry_date: item.expiry_date,
        quantity: item.quantity,
        unit_price: parseFloat(item.sale_price) || 0,
        gst_rate: parseFloat(item.gst_rate) || 0,
        total_amount: parseFloat(item.total_amount) || 0
      })),
      include_description: includeDescription,
      created_at: new Date().toISOString(),
      is_synced: false
    };

    try {
      // 1. Save locally in IndexedDB
      await db.invoices.add(invoiceRecord);

      // 2. Deduct local stock in Dexie
      for (const item of cart) {
        const med = await db.medicines.get(item.id);
        if (med) {
          const updatedStock = Math.max(0, med.stock_qty - item.quantity);
          await db.medicines.update(item.id, { 
            stock_qty: updatedStock,
            updated_at: new Date().toISOString()
          });
        }
      }

      // 2.5 Save/Update customer record in Dexie
      const cName = customerName.trim();
      const cPhone = customerPhone.trim();
      if (cName || cPhone) {
        try {
          const phoneKey = cPhone || cName.toLowerCase();
          const existingCust = await db.customers.where('phone').equals(phoneKey).first();
          if (existingCust) {
            await db.customers.update(existingCust.id, {
              name: cName || existingCust.name,
              updated_at: new Date().toISOString()
            });
          } else {
            await db.customers.add({
              id: 'cust_' + Math.random().toString(36).substring(2, 9),
              name: cName || 'General Customer',
              phone: cPhone || '',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
          }
        } catch (custErr) {
          console.warn('Customer upsert error:', custErr);
        }
      }

      // Auto Push Sync to Cloud
      SyncService.pushSync().catch(console.warn);

      // 3. Headless Automatic WhatsApp Billing Dispatch (NO REDIRECT!) — Only available on ₹799+ Pro Cloud Plan
      let cleanPhone = customerPhone.replace(/[^0-9]/g, '');
      if (has799Plan && sendWhatsApp && cleanPhone) {
        if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;

        const cloudUrl = getCloudUrl();
        const storeId = getActiveStoreId();

        fetch(`${cloudUrl}/api/whatsapp/send-bill`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            store_id: storeId,
            phone: cleanPhone,
            customer_name: customerName,
            shop_name: storeInfo?.shop_name || 'KNITE Medico',
            invoice_number: invoiceNum,
            grand_total: grandTotal,
            payment_mode: paymentMode,
            items: cart,
            language: whatsappLanguage || 'en',
            include_description: includeDescription
          })
        })
        .then(async res => {
          const data = await res.json();
          if (data.notLinked) {
            setWaDeviceStatus(s => ({ ...s, isConnected: false }));
            setWaLinkAlert({
              title: 'WhatsApp Device Not Linked — Bill Not Sent',
              message: 'Your pharmacy WhatsApp is not linked. Scan the QR code with your phone to send bills automatically in the background.',
              phone: cleanPhone,
              messageText: data.message_text,
              invoiceNum
            });
          } else if (data.success) {
            setWaDeviceStatus(s => ({ ...s, isConnected: true }));
            setWaNotification({
              phone: data.recipient || cleanPhone,
              status: 'Sent automatically via Linked WhatsApp'
            });
            setTimeout(() => setWaNotification(null), 4000);
          } else {
            console.warn('WhatsApp dispatch warning:', data.error);
          }
        })
        .catch(err => console.warn('Background WhatsApp error:', err.message));
      }

      // 4. Print Receipt ONLY if printReceipt was selected
      if (printReceipt) {
        setActiveReceipt(invoiceRecord);
      } else {
        setPostSalePrompt(invoiceRecord);
        setTimeout(() => setPostSalePrompt(null), 6000);
      }

      // Reset cart
      setCart([]);
      setSearchTerm('');
      setDiscountValue(0);
      setCustomerName('');
      setCustomerPhone('');
      setDoctorName('');
      loadMedicines();

      if (onSaleComplete) onSaleComplete();
    } catch (err) {
      console.error('Billing error:', err);
      alert('Failed to save invoice: ' + err.message);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pb-28 lg:pb-8">
      {/* LEFT: Product Search & Cart (8 cols) */}
      <div className="lg:col-span-8 flex flex-col gap-4">
        {/* Search Bar with Autocomplete Dropdown */}
        <div ref={searchContainerRef} className="relative">
          <div className="glass-panel p-2.5 flex items-center gap-3 border-[#ffd7db] dark:border-rose-950/40">
            <Search className="w-5 h-5 text-[#ff2c2c] ml-2" />
            <input
              ref={searchInputRef}
              type="text"
              className={`bg-transparent border-none outline-none w-full text-base font-semibold ${
                isDark ? 'text-white placeholder-slate-400' : 'text-slate-900 placeholder-slate-400'
              }`}
              placeholder={t('search_medicine_placeholder', 'Search Medicine by Name, Generic Salt, Batch, or Scan Barcode... [F2]')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              autoFocus
            />
            {searchTerm && (
              <button 
                type="button"
                onClick={() => setSearchTerm('')} 
                className="text-xs px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg hover:text-[#ff2c2c]"
              >
                Clear
              </button>
            )}
          </div>

          {/* Autocomplete Results Dropdown with Mouse Click & Enter Selection */}
          {searchResults.length > 0 && (
            <div className={`absolute left-0 right-0 top-full mt-2 rounded-2xl shadow-2xl z-30 max-h-96 overflow-y-auto divide-y border ${
              isDark 
                ? 'bg-[#181113] border-[#f94449]/30 divide-[#29161a]' 
                : 'bg-white border-[#ffd7db] divide-[#fff1f2] shadow-xl'
            }`}>
              {searchResults.map((med, index) => {
                const isOutOfStock = med.stock_qty <= 0;
                const isSelected = index === selectedSearchIndex;
                const expStatus = getExpiryStatus(med.expiry_date);
                return (
                  <div
                    key={med.id}
                    id={`search-result-item-${index}`}
                    onMouseEnter={() => setSelectedSearchIndex(index)}
                    onClick={() => {
                      if (!isOutOfStock) addToCart(med);
                    }}
                    className={`p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-colors select-none ${
                      isOutOfStock 
                        ? 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-950/40' 
                        : isSelected
                          ? 'bg-rose-50/90 dark:bg-rose-950/50 ring-1 ring-[#ff2c2c]/40 cursor-pointer'
                          : isDark ? 'hover:bg-[#241417] cursor-pointer' : 'hover:bg-[#fff5f6] cursor-pointer'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{med.name}</span>
                        {med.rack && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#fff1f2] dark:bg-[#29161a] text-[#ff2c2c] font-mono font-bold border border-[#ffd7db]">
                            Rack: {med.rack}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-500 font-mono">
                          Batch: {med.batch_number}
                        </span>
                        <span className="text-[10px] px-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
                          {med.gst_rate ?? 0}% GST
                        </span>
                        {isSelected && !isOutOfStock && (
                          <span className="hidden sm:inline-block text-[9px] px-1.5 py-0.5 rounded bg-[#ff2c2c] text-white font-mono font-bold uppercase tracking-wider animate-pulse">
                            Press Enter
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 font-sans truncate">
                        {med.generic_name}
                      </p>
                      {med.description && (
                        <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium italic mt-0.5 line-clamp-1 flex items-center gap-1">
                          <FileText className="w-3 h-3 shrink-0" />
                          <span className="truncate">{med.description}</span>
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 dark:border-rose-950/30 shrink-0">
                      <div className="text-left sm:text-right">
                        <div className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                          <span>Exp: {med.expiry_date}</span>
                          {expStatus === 'expired' && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-600 text-white font-bold uppercase">
                              Expired
                            </span>
                          )}
                          {expStatus === 'near_expiry' && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500 text-white font-bold uppercase">
                              Near Exp
                            </span>
                          )}
                        </div>
                        <div className={`text-[11px] font-bold ${
                          isOutOfStock ? 'text-rose-600' : med.stock_qty <= med.min_stock ? 'text-amber-600' : 'text-emerald-600'
                        }`}>
                          Stock: {med.stock_qty}
                        </div>
                      </div>
                      <div className="font-bold text-base text-[#ff2c2c] font-mono">
                        ₹{parseFloat(med.sale_price).toFixed(2)}
                      </div>
                      <span 
                        className={`text-xs py-1.5 px-3 rounded-xl font-bold transition shadow-sm pointer-events-none ${
                          isOutOfStock
                            ? 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                            : 'btn-primary'
                        }`}
                      >
                        + Add
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Current Cart Table */}
        <div className="glass-panel overflow-hidden flex-1 flex flex-col min-h-[420px] border-[#ffd7db] dark:border-rose-950/40">
          <div className="p-4 border-b border-[#ffd7db] dark:border-rose-950/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#ff2c2c]" />
              <h2 className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>{t('items_in_cart', 'Prescription Billing Cart')}</h2>
              <span className="badge badge-brand text-xs">{cart.length} items</span>
            </div>
            {cart.length > 0 && (
              <button
                onClick={() => setCart([])}
                className="text-xs text-[#ff2c2c] hover:text-[#f94449] flex items-center gap-1 font-semibold"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {t('clear_cart', 'Clear All')}
              </button>
            )}
          </div>

          {/* Cart View: Cards on Mobile (< sm), Table on Tablet & Desktop (>= sm) */}
          <div className="overflow-x-auto overflow-y-auto flex-1 max-h-[420px]">
            {cart.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <div className="flex flex-col items-center gap-2">
                  <Sparkles className="w-8 h-8 text-[#f94449] animate-pulse" />
                  <p className="font-semibold text-slate-700 dark:text-slate-300">Prescription Cart is empty</p>
                  <p className="text-xs text-slate-500">Scan barcode or search above [F2]</p>
                </div>
              </div>
            ) : (
              <>
                {/* Mobile Cart Card List (< sm) */}
                <div className="block sm:hidden divide-y divide-[#ffd7db]/60 dark:divide-rose-950/40">
                  {cart.map((item) => (
                    <div key={item.id} className="p-3.5 space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className={`font-bold text-sm truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{item.medicine_name}</h4>
                          <p className="text-xs text-slate-500 truncate">{item.generic_name}</p>
                          {item.description && (
                            <p className="text-[10px] text-amber-700 dark:text-amber-400 font-medium italic mt-0.5 line-clamp-1" title={item.description}>
                              📝 {item.description}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-[#ff2c2c] hover:bg-rose-50 dark:hover:bg-rose-950/50 transition shrink-0"
                          aria-label="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          Batch: {item.batch_number}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          Exp: {item.expiry_date}
                        </span>
                        {isNonGstStore ? (
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">0% Non-GST</span>
                        ) : (
                          <select
                            value={item.gst_rate}
                            onChange={(e) => updateItemGst(item.id, e.target.value)}
                            className="bg-red-50 text-[#ff2c2c] border border-red-200 dark:bg-[#28161a] dark:border-rose-900/40 rounded-md px-1 py-0.5 font-bold outline-none"
                          >
                            {(gstConfig.slabs || [0, 5, 12, 18, 28]).map(rate => (
                              <option key={rate} value={rate}>{rate}% GST</option>
                            ))}
                          </select>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-rose-950/20">
                        {/* Quantity Stepper */}
                        <div className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 border border-[#ffd7db] dark:border-rose-900/30 rounded-xl p-1">
                          <button
                            onClick={() => updateQuantity(item.id, -1)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 shadow-sm active:scale-90"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <input
                            type="number"
                            min="1"
                            max={item.stock_qty || 9999}
                            value={item.quantity}
                            onChange={(e) => setDirectQuantity(item.id, e.target.value)}
                            className="w-10 text-center font-black font-mono text-sm bg-transparent border-none outline-none p-0 text-slate-800 dark:text-white"
                          />
                          <button
                            onClick={() => updateQuantity(item.id, 1)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 shadow-sm active:scale-90"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Price & Total */}
                        <div className="text-right">
                          <span className="text-[11px] text-slate-400 font-mono block">₹{(parseFloat(item.sale_price) || 0).toFixed(2)}/unit</span>
                          <span className="font-black text-base text-[#ff2c2c] font-mono">₹{(parseFloat(item.total_amount) || 0).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop & Tablet Table (>= sm) */}
                <table className="hidden sm:table w-full text-left text-sm">
                  <thead className={`text-xs font-bold uppercase tracking-wider border-b ${
                    isDark 
                      ? 'bg-[#1f1215] text-slate-400 border-rose-950/40' 
                      : 'bg-[#fff5f6] text-slate-700 border-[#ffd7db]'
                  }`}>
                    <tr>
                      <th className="p-3.5">Medicine & Salt</th>
                      <th className="p-3.5 text-center">Batch / Exp</th>
                      <th className="p-3.5 text-center">GST %</th>
                      <th className="p-3.5 text-right">Price</th>
                      <th className="p-3.5 text-center">Qty</th>
                      <th className="p-3.5 text-right">Total</th>
                      <th className="p-3.5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ffd7db]/60 dark:divide-rose-950/40">
                    {cart.map((item) => (
                      <tr key={item.id} className="hover:bg-[#fff5f6]/50 dark:hover:bg-[#241417]/50 transition">
                        <td className="p-3.5">
                          <div className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{item.medicine_name}</div>
                          <div className="text-xs text-slate-500">{item.generic_name}</div>
                          {item.description && (
                            <div className="text-[10px] text-amber-700 dark:text-amber-400 font-medium italic mt-0.5 line-clamp-1" title={item.description}>
                              📝 {item.description}
                            </div>
                          )}
                        </td>
                        <td className="p-3.5 text-center font-mono text-xs">
                          <span className="font-semibold">{item.batch_number}</span>
                          <div className="text-[10px] text-slate-500">{item.expiry_date}</div>
                        </td>
                        <td className="p-3.5 text-center font-mono text-xs font-bold">
                          {isNonGstStore ? (
                            <span className="text-[10px] text-slate-500 font-mono">0% (Non-GST)</span>
                          ) : (
                            <select
                              value={item.gst_rate}
                              onChange={(e) => updateItemGst(item.id, e.target.value)}
                              className="bg-red-50 text-[#ff2c2c] border border-red-200 dark:bg-[#28161a] dark:border-rose-900/40 rounded-lg px-1.5 py-0.5 font-bold cursor-pointer outline-none focus:ring-2 focus:ring-red-300"
                              title="Click to change GST rate for this item"
                            >
                              {(gstConfig.slabs || [0, 5, 12, 18, 28]).map(rate => (
                                <option key={rate} value={rate}>{rate}% GST</option>
                              ))}
                            </select>
                          )}
                        </td>
                        <td className="p-3.5 text-right font-medium text-slate-700 dark:text-slate-200 font-mono">
                          ₹{(parseFloat(item.sale_price) || 0).toFixed(2)}
                        </td>
                        <td className="p-3.5 text-center">
                          <div className="inline-flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-[#ffd7db] dark:border-rose-900/30 rounded-lg p-1">
                            <button
                              onClick={() => updateQuantity(item.id, -1)}
                              className="p-1 rounded hover:bg-[#fff1f2] dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <input
                              type="number"
                              min="1"
                              max={item.stock_qty || 9999}
                              value={item.quantity}
                              onChange={(e) => setDirectQuantity(item.id, e.target.value)}
                              className="w-12 text-center font-bold font-mono text-sm bg-transparent border-none outline-none p-0 text-slate-800 dark:text-white"
                            />
                            <button
                              onClick={() => updateQuantity(item.id, 1)}
                              className="p-1 rounded hover:bg-[#fff1f2] dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                        <td className="p-3.5 text-right font-bold text-[#ff2c2c] font-mono">
                          ₹{(parseFloat(item.total_amount) || 0).toFixed(2)}
                        </td>
                        <td className="p-3.5 text-center">
                          <button
                            onClick={() => removeItem(item.id)}
                            className="p-1.5 text-slate-400 hover:text-[#ff2c2c] transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT: Patient, Doctor, WhatsApp Option & Payment Checkout (4 cols) */}
      <div ref={checkoutSectionRef} className="lg:col-span-4 flex flex-col gap-4">
        {/* Patient & Doctor Card */}
        <div className="glass-panel p-4 space-y-3 border-[#ffd7db] dark:border-rose-950/40">
          <div className="flex items-center gap-2 border-b border-[#ffd7db] dark:border-rose-950/40 pb-2">
            <User className="w-4 h-4 text-[#ff2c2c]" />
            <h3 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>Patient & Prescribing Doctor</h3>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">{t('customer_name', 'Patient Name')}</label>
            <input
              type="text"
              className="input-field py-2 text-sm"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="e.g. Ramesh Kumar"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">{t('phone_number', 'Customer Phone')}</label>
              <input
                type="text"
                className="input-field py-2 text-sm font-mono"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="98765 00000"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">{t('doctor_name', 'Doctor Name')}</label>
              <input
                type="text"
                className="input-field py-2 text-sm"
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
                placeholder="Dr. S. Sharma"
              />
            </div>
          </div>

          {/* Optional Post-Sale Action Toggles */}
          <div className="grid grid-cols-2 gap-2">
            <label className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition select-none ${
              printReceipt 
                ? 'bg-rose-500/10 border-[#ff2c2c] text-[#ff2c2c]' 
                : isDark ? 'bg-[#1e1318] border-rose-900/30 text-slate-400' : 'bg-[#fff5f6] border-[#ffd7db] text-slate-600'
            }`}>
              <input
                type="checkbox"
                checked={printReceipt}
                onChange={e => setPrintReceipt(e.target.checked)}
                className="w-4 h-4 text-[#ff2c2c] rounded border-slate-300 focus:ring-[#ff2c2c]"
              />
              <Printer className="w-3.5 h-3.5 shrink-0" />
              <span className="text-[11px] font-bold">{t('print_bill', 'Print Slip')}</span>
            </label>

            {/* WhatsApp Billing Option (Gated to ₹799 Pro Cloud) */}
            {has799Plan ? (
              <div className={`p-2.5 rounded-xl border flex items-center justify-between transition select-none ${
                sendWhatsApp 
                  ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600' 
                  : isDark ? 'bg-[#1e1318] border-rose-900/30 text-slate-400' : 'bg-[#fff5f6] border-[#ffd7db] text-slate-600'
              }`}>
                <label className="flex items-center gap-2 cursor-pointer flex-1">
                  <input
                    type="checkbox"
                    checked={sendWhatsApp}
                    onChange={e => {
                      const nextVal = e.target.checked;
                      setSendWhatsApp(nextVal);
                      if (nextVal && !waDeviceStatus.isConnected) {
                        setWaLinkAlert({
                          title: 'WhatsApp Device Not Linked',
                          message: 'To send bills automatically to customers without opening browser tabs, scan your store QR code once.',
                          canOpenModal: true
                        });
                      }
                    }}
                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                  />
                  <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-[11px] font-bold">{t('whatsapp_billing', 'WhatsApp')}</span>
                </label>
                {waDeviceStatus.checked && (
                  waDeviceStatus.isConnected ? (
                    <span className="text-[9px] font-mono text-emerald-600 font-bold bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">
                      Linked
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        if (onOpenWhatsAppModal) onOpenWhatsAppModal();
                      }}
                      className="text-[9px] font-bold text-amber-600 dark:text-amber-400 underline hover:text-amber-700"
                    >
                      Scan QR
                    </button>
                  )
                )}
              </div>
            ) : (
              <div className={`p-2 rounded-xl border flex items-center justify-between transition select-none ${
                isDark ? 'bg-[#1e1318] border-rose-900/30 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}>
                <div className="flex items-center gap-1.5">
                  <Lock className="w-3 h-3 text-amber-500 shrink-0" />
                  <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">WhatsApp</span>
                  <span className="text-[8px] font-black bg-amber-100 text-amber-900 px-1 rounded">₹799 Plan</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowUpgradeModal(true)}
                  className="text-[10px] font-black text-[#ff2c2c] hover:underline"
                >
                  Upgrade
                </button>
              </div>
            )}

            {/* WhatsApp Bill Language Quick Selector */}
            {has799Plan && sendWhatsApp && (
              <div className="col-span-2 flex items-center justify-between px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs">
                <span className="text-[10px] font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                  {t('wa_lang_label', 'WhatsApp Lang:')}
                </span>
                <div className="flex items-center gap-1">
                  {availableLanguages.map(l => (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => setWhatsappLanguage(l.code)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-black transition ${
                        whatsappLanguage === l.code
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60'
                      }`}
                      title={`Send bill in ${l.nativeName}`}
                    >
                      {l.flag} {l.nativeName.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Optional: Include Medicine Descriptions in Bill & WhatsApp (Gated to ₹799) */}
            {has799Plan ? (
              <div className={`col-span-2 flex items-center justify-between px-3 py-2 rounded-xl border text-xs transition select-none ${
                includeDescription
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-700 dark:text-amber-300'
                  : isDark ? 'bg-[#181113] border-rose-900/20 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}>
                <label 
                  htmlFor="include_desc_checkbox"
                  className="flex items-center gap-2 cursor-pointer select-none font-semibold flex-1"
                >
                  <input
                    id="include_desc_checkbox"
                    type="checkbox"
                    checked={includeDescription}
                    onChange={(e) => setIncludeDescription(e.target.checked)}
                    className="w-4 h-4 rounded text-[#ff2c2c] focus:ring-[#ff2c2c] border-slate-300 cursor-pointer accent-[#ff2c2c]"
                  />
                  <span className="text-[11px] font-bold">
                    {t('include_description_in_bill', 'Include Medicine Descriptions in Bill & WhatsApp')}
                  </span>
                </label>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-current opacity-70">
                  Optional
                </span>
              </div>
            ) : (
              <div className={`col-span-2 flex items-center justify-between px-3 py-2 rounded-xl border text-xs transition select-none ${
                isDark ? 'bg-[#181113] border-rose-900/20 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}>
                <div className="flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    Medicine Descriptions in Bill
                  </span>
                  <span className="text-[9px] font-bold bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded">
                    ₹799 Plan
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowUpgradeModal(true)}
                  className="text-[10px] font-black text-[#ff2c2c] hover:underline"
                >
                  Upgrade to ₹799
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Payment Summary & Modes */}
        <div className="glass-panel p-4 flex flex-col gap-4 border-[#ffd7db] dark:border-rose-950/40">
          <h3 className={`font-bold text-sm border-b border-[#ffd7db] dark:border-rose-950/40 pb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Payment Mode & Discount
          </h3>

          {/* Payment Method Selector */}
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 block">Payment Mode</label>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { id: 'CASH', label: 'Cash', icon: DollarSign },
                { id: 'UPI', label: 'UPI / QR', icon: QrCode },
                { id: 'CARD', label: 'Card', icon: CreditCard },
                { id: 'CREDIT', label: 'Udhar', icon: UserPlus },
              ].map(mode => {
                const Icon = mode.icon;
                const isSelected = paymentMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    onClick={() => {
                      setPaymentMode(mode.id);
                      if (mode.id === 'UPI') setShowUPISimulator(true);
                      else setShowUPISimulator(false);
                    }}
                    className={`p-2 rounded-xl flex flex-col items-center gap-1 text-xs font-bold border transition ${
                      isSelected
                        ? 'bg-gradient-to-r from-[#ff2c2c] to-[#f94449] text-white border-[#ff2c2c] shadow-md shadow-[#ff2c2c]/30'
                        : isDark
                          ? 'bg-[#1f1215] border-rose-950/40 text-slate-400 hover:bg-[#29161a]'
                          : 'bg-[#fff5f6] border-[#ffd7db] text-slate-700 hover:bg-[#ffebee]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{mode.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* PhonePe UPI Dynamic QR Code */}
          {showUPISimulator && (
            <div className={`p-4 rounded-3xl border text-center animate-in fade-in duration-200 ${
              isDark ? 'bg-[#18101a] border-[#5f259f]/40' : 'bg-[#fcf8ff] border-[#5f259f]/30'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-[#5f259f] text-white flex items-center justify-center font-black text-xs shadow-sm">
                    पे
                  </div>
                  <span className="text-xs font-black text-[#5f259f] dark:text-purple-300">
                    PhonePe Dynamic UPI QR
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#5f259f]/10 text-[#5f259f] dark:text-purple-300 border border-[#5f259f]/30">
                  Auto-Verify
                </span>
              </div>

              <div className="w-40 h-40 mx-auto bg-white rounded-2xl p-2.5 flex items-center justify-center shadow-md border border-purple-100 relative">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=4&data=upi://pay?pa=kniteinfotech@ybl&pn=KNITE%20Pharmacy&am=${grandTotal}&cu=INR&tn=Prescription%20Bill`} 
                  alt="PhonePe UPI QR"
                  className="w-full h-full object-contain"
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-7 h-7 rounded-lg bg-[#5f259f] text-white flex items-center justify-center font-black text-xs shadow-md border border-white">
                    पे
                  </div>
                </div>
              </div>

              <div className="mt-2.5 space-y-1">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Scan to pay: <strong className="text-[#5f259f] dark:text-purple-300 text-base font-black">₹{grandTotal}</strong>
                </p>
                <p className="text-[10px] text-slate-500 font-mono">
                  UPI VPA: kniteinfotech@ybl • PhonePe Official
                </p>
              </div>

              {/* UPI Quick Action Buttons */}
              <div className="mt-3 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => copyToClipboard('kniteinfotech@ybl', 'upi_id')}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-purple-200 dark:border-purple-800/60 bg-white dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-50 flex items-center gap-1 transition"
                  title="Copy UPI VPA ID"
                >
                  {copiedField === 'upi_id' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedField === 'upi_id' ? 'Copied VPA!' : 'Copy UPI ID'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => copyToClipboard(grandTotal.toString(), 'amount')}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-purple-200 dark:border-purple-800/60 bg-white dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-50 flex items-center gap-1 transition"
                  title="Copy Amount"
                >
                  {copiedField === 'amount' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedField === 'amount' ? 'Copied ₹!' : `Copy ₹${grandTotal}`}</span>
                </button>
              </div>

              <div className="mt-2.5 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Customer can scan with PhonePe / GPay / Paytm</span>
              </div>
            </div>
          )}

          {/* Editable & Optional Discount Field */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Optional Discount {discountType === 'PERCENT' ? '(Max 100%)' : `(Max ₹${subtotal.toFixed(0)})`}
              </label>
              <span className="text-xs font-mono text-[#ff2c2c] font-black">
                {discountAmount > 0 ? `-₹${discountAmount.toFixed(2)}` : 'No Discount'}
              </span>
            </div>

            {/* Input field + Percent/Flat Toggle */}
            <div className="flex items-center gap-2 mb-2">
              <div className="relative flex-1">
                <input
                  type="number"
                  min="0"
                  max={discountType === 'PERCENT' ? 100 : Math.max(0, subtotal)}
                  step={discountType === 'PERCENT' ? '1' : '5'}
                  className="input-field py-1.5 px-3 text-xs font-mono font-bold w-full text-slate-900 dark:text-white"
                  placeholder={discountType === 'PERCENT' ? '0% - 100%' : 'Enter flat ₹ discount'}
                  value={discountValue || ''}
                  onChange={(e) => {
                    const rawVal = parseFloat(e.target.value) || 0;
                    if (discountType === 'PERCENT') {
                      setDiscountValue(Math.min(100, Math.max(0, rawVal)));
                    } else {
                      setDiscountValue(Math.min(subtotal, Math.max(0, rawVal)));
                    }
                  }}
                />
              </div>

              <div className="flex rounded-xl border border-slate-300 dark:border-slate-700 overflow-hidden shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setDiscountType('PERCENT');
                    if (discountValue > 100) setDiscountValue(100);
                  }}
                  className={`px-3 py-1.5 text-xs font-black transition ${discountType === 'PERCENT' ? 'bg-[#ff2c2c] text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}
                >
                  %
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDiscountType('FLAT');
                    if (discountValue > subtotal) setDiscountValue(subtotal);
                  }}
                  className={`px-3 py-1.5 text-xs font-black transition ${discountType === 'FLAT' ? 'bg-[#ff2c2c] text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}
                >
                  ₹ Flat
                </button>
              </div>
            </div>

            {/* Quick Discount Presets */}
            <div className="flex gap-1.5">
              {[0, 5, 10, 15, 20].map(pct => (
                <button
                  key={pct}
                  onClick={() => { setDiscountType('PERCENT'); setDiscountValue(pct); }}
                  className={`flex-1 py-1 rounded-lg text-xs font-mono font-bold border transition ${
                    discountType === 'PERCENT' && discountValue === pct 
                      ? 'bg-[#ff2c2c] text-white border-[#ff2c2c]' 
                      : isDark
                        ? 'bg-[#1f1215] text-slate-400 border-rose-950/40 hover:bg-[#29161a]'
                        : 'bg-[#fff5f6] text-slate-700 border-[#ffd7db] hover:bg-[#ffebee]'
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          {/* Direct GST Rate Control & Presets */}
          <div className="pt-2 border-t border-[#ffd7db] dark:border-rose-950/40">
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                <span>GST Tax Rate (%):</span>
                {isNonGstStore && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-bold">
                    Non-GST Store Mode
                  </span>
                )}
              </label>
              <button
                type="button"
                onClick={async () => {
                  const newEnable = !gstConfig.enable_gst;
                  const newCfg = { ...gstConfig, enable_gst: newEnable };
                  setGstConfig(newCfg);
                  await db.settings.put(newCfg, 'gst_config');
                }}
                className="text-[11px] font-bold text-[#ff2c2c] hover:underline"
              >
                {gstConfig.enable_gst ? 'Disable GST' : 'Enable GST'}
              </button>
            </div>

            {/* Quick GST Presets */}
            {gstConfig.enable_gst && (
              <div className="flex gap-1.5 mb-2">
                {[
                  { rate: 0, label: '0% (Nil)' },
                  { rate: 5, label: '5%' },
                  { rate: 12, label: '12%' },
                  { rate: 18, label: '18%' },
                  { rate: 28, label: '28%' },
                ].map(preset => {
                  const allMatch = cart.length > 0 && cart.every(item => item.gst_rate === preset.rate);
                  return (
                    <button
                      key={preset.rate}
                      type="button"
                      onClick={() => applyGstToAllItems(preset.rate)}
                      title={`Set all items to ${preset.rate}% GST`}
                      className={`flex-1 py-1 rounded-lg text-[11px] font-mono font-extrabold border transition ${
                        allMatch
                          ? 'bg-[#ff2c2c] text-white border-[#ff2c2c] shadow-sm'
                          : isDark
                            ? 'bg-[#1f1215] text-slate-300 border-rose-950/40 hover:bg-[#29161a]'
                            : 'bg-[#fff5f6] text-slate-800 border-[#ffd7db] hover:bg-[#ffebee]'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Financial Breakdown (With High Contrast Dark Typography) */}
          <div className={`rounded-xl p-3.5 border space-y-1.5 text-xs font-mono ${
            isDark 
              ? 'bg-[#1f1215] border-rose-950/40' 
              : 'bg-[#fff5f6] border-[#ffd7db]'
          }`}>
            <div className="flex justify-between text-slate-700 dark:text-slate-300 font-semibold">
              <span>{t('subtotal', 'Subtotal')}:</span>
              <span className="font-bold text-slate-900 dark:text-white">₹{subtotal.toFixed(2)}</span>
            </div>
            
            {/* GST Breakdown */}
            <div className="flex justify-between text-slate-700 dark:text-slate-300 font-semibold">
              <span>
                {t('gst_tax', 'GST Tax')} ({gstConfig.pricing_mode === 'EXCLUSIVE' ? 'Added' : 'Included'}):
              </span>
              <span className="font-bold text-slate-900 dark:text-white">₹{totalTax.toFixed(2)}</span>
            </div>

            {gstConfig.tax_split === 'CGST_SGST' ? (
              <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-400 font-medium pl-2">
                <span>↳ CGST: ₹{(totalTax / 2).toFixed(2)} | SGST: ₹{(totalTax / 2).toFixed(2)}</span>
              </div>
            ) : (
              <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-400 font-medium pl-2">
                <span>↳ IGST: ₹{totalTax.toFixed(2)}</span>
              </div>
            )}

            {discountAmount > 0 && (
              <div className="flex justify-between text-[#ff2c2c] font-black">
                <span>{t('discount', 'Special Discount')}:</span>
                <span>-₹{discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="border-t border-[#ffd7db] dark:border-rose-950/40 pt-2 flex justify-between items-baseline">
              <span className="font-sans font-black text-sm text-slate-900 dark:text-white">{t('grand_total', 'Net Payable')}:</span>
              <span className="font-sans font-black text-2xl text-[#ff2c2c] tracking-tight">
                ₹{grandTotal}
              </span>
            </div>
          </div>

          {/* Fast Checkout Action */}
          <button
            onClick={handleCheckout}
            disabled={cart.length === 0}
            className="w-full btn-primary py-3.5 justify-center text-sm font-bold tracking-wide shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>{printReceipt ? `${t('complete_billing', 'Complete Sale')} & ${t('print_bill', 'Print')}` : t('complete_billing', 'Complete Sale (F4)')}</span>
          </button>
        </div>
      </div>

      {/* Floating Mobile Sticky Checkout Banner (< lg) */}
      {cart.length > 0 && (
        <div className="fixed bottom-20 left-3 right-3 z-30 lg:hidden p-3 rounded-2xl bg-slate-900/95 text-white shadow-2xl backdrop-blur-md border border-slate-700/80 flex items-center justify-between gap-3 animate-in slide-in-from-bottom duration-200">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-black tracking-wider text-slate-400">Total Payable</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-red-500/20 text-[#ff2c2c] font-black">{cart.length} item{cart.length !== 1 ? 's' : ''}</span>
            </div>
            <p className="text-lg font-black text-white font-mono leading-tight mt-0.5">₹{grandTotal}</p>
          </div>
          <button
            onClick={() => checkoutSectionRef.current?.scrollIntoView({ behavior: 'smooth' })}
            className="btn-primary py-2 px-3.5 text-xs font-black shadow-lg shadow-[#ff2c2c]/40 shrink-0 flex items-center gap-1"
          >
            <span>Pay & Complete</span>
            <span>➔</span>
          </button>
        </div>
      )}

      {/* Thermal Receipt Print Modal */}
      {activeReceipt && (
        <ThermalReceipt
          invoice={activeReceipt}
          storeInfo={storeInfo}
          onClose={() => setActiveReceipt(null)}
          onPrint={() => window.print()}
        />
      )}

      {/* Post-Sale Completion Action Prompt (Asks if customer wants paper receipt) */}
      {postSalePrompt && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3.5 bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-700 animate-in fade-in duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div className="text-xs">
            <p className="font-bold text-white">Bill #{postSalePrompt.invoice_number} Saved (₹{postSalePrompt.grand_total})</p>
            <p className="text-[11px] text-slate-400">Ask customer: need a printed slip?</p>
          </div>
          <div className="flex items-center gap-1.5 ml-2">
            <button
              onClick={() => { setActiveReceipt(postSalePrompt); setPostSalePrompt(null); }}
              className="px-3 py-1.5 rounded-xl bg-[#ff2c2c] hover:bg-[#e02626] text-white text-xs font-black flex items-center gap-1.5 transition shadow"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Slip</span>
            </button>
            <button
              onClick={() => setPostSalePrompt(null)}
              className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-bold transition"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* WhatsApp Device Not Linked Alert Modal */}
      {waLinkAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className={`p-6 rounded-3xl max-w-md w-full shadow-2xl space-y-4 border ${
            isDark ? 'bg-[#181113] border-amber-500/40 text-slate-100' : 'bg-white border-amber-300 text-slate-900'
          }`}>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                <Smartphone className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <h4 className="font-black text-sm text-slate-900 dark:text-white">
                  {waLinkAlert.title || 'Store WhatsApp Not Linked'}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  {waLinkAlert.message}
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-rose-950/60">
              <button
                type="button"
                onClick={() => {
                  setWaLinkAlert(null);
                  if (onOpenWhatsAppModal) onOpenWhatsAppModal();
                }}
                className="w-full py-2.5 px-4 bg-[#25D366] hover:bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 transition"
              >
                <QrCode className="w-4 h-4" />
                <span>Scan Store QR Code Now</span>
              </button>

              {waLinkAlert.phone && waLinkAlert.messageText && (
                <button
                  type="button"
                  onClick={() => {
                    const waUrl = `https://web.whatsapp.com/send?phone=${waLinkAlert.phone}&text=${encodeURIComponent(waLinkAlert.messageText)}`;
                    window.open(waUrl, '_blank');
                    setWaLinkAlert(null);
                  }}
                  className="w-full py-2 px-4 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 transition text-slate-700 dark:text-slate-200"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Send via WhatsApp Web Manually</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setWaLinkAlert(null)}
                className="w-full py-2 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition text-center"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Automated WhatsApp Dispatch Toast Notification (Headless - No Redirect!) */}
      {waNotification && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 bg-[#181113] text-white rounded-2xl shadow-2xl border border-emerald-500/40">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <MessageSquare className="w-4 h-4 text-[#25D366]" />
          </div>
          <div>
            <p className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>⚡ WhatsApp Bill Auto-Sent</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono">Headless</span>
            </p>
            <p className="text-[11px] text-slate-300">
              +{waNotification.phone} • {waNotification.status}
            </p>
          </div>
        </div>
      )}

      {/* Razorpay Upgrade Modal for ₹799 Pro Cloud Plan */}
      <PhonePeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        amount={799}
        purpose="CLOUD_SUBSCRIPTION"
        storeInfo={storeInfo}
        onPaymentSuccess={async (paymentData) => {
          const updated = {
            ...storeInfo,
            plan_type: 'cloud_799',
            status: 'APPROVED',
            plan_expires_at: new Date(Date.now() + 37 * 24 * 60 * 60 * 1000).toISOString()
          };
          await db.settings.put({ key: 'store_profile', ...updated });
          localStorage.setItem('knite_shop_owner', JSON.stringify(updated));
          setStoreInfo(updated);
          setShowUpgradeModal(false);
          setSendWhatsApp(true);
        }}
        theme={theme}
      />
    </div>
  );
}
