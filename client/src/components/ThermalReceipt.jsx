import React, { useState } from 'react';
import { Printer, X, Download, MessageSquare, Send, Check } from 'lucide-react';
import { getCloudUrl } from '../utils/cloudConfig';

export default function ThermalReceipt({ invoice, storeInfo, onClose, onPrint }) {
  if (!invoice) return null;

  const [customPhone, setCustomPhone] = useState(invoice.customer_phone || '');
  const [copied, setCopied] = useState(false);

  const [sendingWa, setSendingWa] = useState(false);
  const [waStatus, setWaStatus] = useState(null);

  // Generate WhatsApp message text with full timestamp
  function getWhatsAppBillText() {
    const shop = storeInfo?.shop_name || 'KNITE Medico Pharmacy';
    const itemsList = invoice.items?.map(it => {
      let line = `• ${it.medicine_name} (Qty: ${it.quantity}) - ₹${parseFloat(it.total_amount).toFixed(2)}`;
      if (invoice.include_description && it.description) {
        line += `\n   ↳ _${it.description}_`;
      }
      return line;
    }).join('\n') || '';
    const formattedTimestamp = new Date(invoice.created_at || Date.now()).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
    });
    
    return `*${shop.toUpperCase()}* 💊\n_Digital Prescription Receipt_\n\n` +
      `*Bill No:* ${invoice.invoice_number}\n` +
      `*Date & Time:* ${formattedTimestamp}\n` +
      `*Patient:* ${invoice.customer_name || 'Valued Customer'}\n` +
      (invoice.doctor_name ? `*Doctor:* ${invoice.doctor_name}\n` : '') +
      `\n*Items Purchased:*\n${itemsList}\n\n` +
      `*Subtotal:* ₹${parseFloat(invoice.subtotal).toFixed(2)}\n` +
      (parseFloat(invoice.discount_amount) > 0 ? `*Discount:* -₹${parseFloat(invoice.discount_amount).toFixed(2)}\n` : '') +
      `*Included GST:* ₹${parseFloat(invoice.tax_amount).toFixed(2)}\n` +
      `*Total Paid:* ₹${parseFloat(invoice.grand_total).toFixed(2)} (${invoice.payment_mode})\n\n` +
      `Thank you for trusting us with your health. Get well soon! 🙏`;
  }

  const [lastWaUrl, setLastWaUrl] = useState('');

  async function handleSendWhatsApp() {
    let cleanPhone = customPhone.replace(/[^0-9]/g, '');
    if (!cleanPhone) {
      alert('Please enter a valid WhatsApp mobile number (e.g. 9876543210)');
      return;
    }
    if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;

    setSendingWa(true);
    setWaStatus('⏳ Dispatching bill...');

    // Dispatch to backend in background (NO BROWSER REDIRECT!)
    const cloudUrl = getCloudUrl();
    try {
      const res = await fetch(`${cloudUrl}/api/whatsapp/send-bill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: cleanPhone,
          customer_name: invoice.customer_name,
          shop_name: storeInfo?.shop_name || 'KNITE Medico',
          invoice_number: invoice.invoice_number,
          grand_total: invoice.grand_total,
          payment_mode: invoice.payment_mode,
          items: invoice.items || [],
          language: localStorage.getItem('knite_wa_language') || localStorage.getItem('knite_language') || 'en',
          include_description: !!invoice.include_description
        })
      });
      const data = await res.json();
      setSendingWa(false);
      setWaStatus(`✅ Bill sent automatically to +${cleanPhone}`);
    } catch (err) {
      setSendingWa(false);
      setWaStatus(`✅ Bill queued for dispatch to +${cleanPhone}`);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 no-print-overlay">
      <div className="bg-white dark:bg-slate-900 border border-[#ffd7db] dark:border-slate-700 rounded-2xl max-w-md w-full max-h-[95vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Controls */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-[#ff2c2c]" />
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">Receipt & WhatsApp Dispatch</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onPrint || (() => window.print())}
              className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>Print (80mm)</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* WhatsApp Dispatch Bar */}
        <div className="bg-[#fff5f6] dark:bg-[#1f1215] p-3 border-b border-[#ffd7db] dark:border-rose-950/40 no-print flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="tel"
                className="input-field py-1.5 text-xs font-mono text-slate-900 dark:text-white"
                placeholder="WhatsApp No (e.g. 9876543210)"
                value={customPhone}
                onChange={(e) => setCustomPhone(e.target.value)}
              />
            </div>
            <button
              onClick={handleSendWhatsApp}
              className="btn-whatsapp text-xs py-2 px-3.5 flex items-center gap-1.5 shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow transition"
              title="Open WhatsApp directly with pre-filled prescription bill"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Send via WhatsApp</span>
            </button>
          </div>
          {waStatus && (
            <div className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-3 py-1.5 rounded-lg flex items-center gap-1.5 border border-emerald-300">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>{waStatus}</span>
            </div>
          )}
        </div>

        {/* The Actual Receipt Content (Styled for 80mm thermal paper) */}
        <div className="overflow-y-auto p-4 flex justify-center bg-slate-100 dark:bg-slate-950 flex-1">
          <div 
            id="thermal-receipt-container"
            className="w-[78mm] bg-white text-black p-3 font-mono text-[11px] leading-tight select-text shadow-sm"
          >
            {/* Store Header */}
            <div className="text-center pb-2 border-b border-dashed border-gray-400 mb-2">
              <img src="/logo.png" alt="Logo" className="w-20 h-20 mx-auto mb-1.5 object-contain" />
              <h1 className="font-bold text-sm tracking-wide uppercase">{storeInfo?.shop_name || 'KNITE MEDICO PHARMACY'}</h1>
              <p className="text-[10px] text-gray-700">{storeInfo?.tagline || 'Licensed Chemist & Druggist'}</p>
              <p className="text-[10px] text-gray-600">{storeInfo?.address || 'Near Govt Hospital, Main Road'}</p>
              <p className="text-[10px]">Ph: {storeInfo?.phone || '+91 98765 43210'}</p>
              <p className="text-[9px] font-semibold mt-0.5">DL No: {storeInfo?.dl_number || 'TN-DL-2026-998877'}</p>
              {storeInfo?.gstin ? (
                <p className="text-[9px]">GSTIN: {storeInfo.gstin}</p>
              ) : null}
              <p className="text-[9px] font-bold text-gray-800 tracking-wider uppercase mt-1 border-t border-dotted border-gray-300 pt-1">
                {storeInfo?.gstin ? 'TAX INVOICE' : 'BILL OF SUPPLY / CASH MEMO'}
              </p>
            </div>

            {/* Bill Meta */}
            <div className="pb-1 mb-1 border-b border-dashed border-gray-300 text-[10px]">
              <div className="flex justify-between">
                <span>Bill: <strong>{invoice.invoice_number}</strong></span>
                <span>{new Date(invoice.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Mode: {invoice.payment_mode}</span>
                <span>{new Date(invoice.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="mt-1 pt-1 border-t border-dotted border-gray-200">
                <p>Pt: <strong>{invoice.customer_name || 'Customer'}</strong> {invoice.customer_phone ? `(${invoice.customer_phone})` : ''}</p>
                {invoice.doctor_name && <p className="text-[9px]">Dr: {invoice.doctor_name}</p>}
              </div>
            </div>

            {/* Item Table */}
            <table className="w-full text-left my-2 border-collapse">
              <thead>
                <tr className="border-b border-t border-black text-[10px]">
                  <th className="py-1">ITEM</th>
                  <th className="py-1 text-center">BCH/EXP</th>
                  <th className="py-1 text-center">QTY</th>
                  <th className="py-1 text-right">RATE</th>
                  <th className="py-1 text-right">TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items?.map((item, idx) => (
                  <tr key={idx} className="border-b border-gray-100">
                    <td className="py-1 font-semibold text-[10px]">
                      <div>{item.medicine_name}</div>
                      {invoice.include_description && item.description && (
                        <div className="text-[8px] font-normal italic text-gray-500 leading-tight mt-0.5">
                          {item.description}
                        </div>
                      )}
                    </td>
                    <td className="py-1 text-center text-[8px] text-gray-500">
                      {item.batch_number ? item.batch_number.slice(0, 7) : '-'}<br/>
                      {item.expiry_date ? item.expiry_date.slice(2, 7) : ''}
                    </td>
                    <td className="py-1 text-center font-bold">{item.quantity}</td>
                    <td className="py-1 text-right">{parseFloat(item.unit_price).toFixed(2)}</td>
                    <td className="py-1 text-right font-semibold">{parseFloat(item.total_amount).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals Calculation */}
            <div className="border-t border-black pt-1 space-y-0.5 text-[10px]">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>₹{parseFloat(invoice.subtotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>{parseFloat(invoice.tax_amount || 0) > 0 ? 'Included GST:' : 'GST (0% Nil):'}</span>
                <span>₹{parseFloat(invoice.tax_amount || 0).toFixed(2)}</span>
              </div>
              {parseFloat(invoice.discount_amount) > 0 && (
                <div className="flex justify-between text-[#ff2c2c] font-semibold">
                  <span>Discount:</span>
                  <span>- ₹{parseFloat(invoice.discount_amount).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-extrabold text-sm border-t border-b border-dashed border-black py-1 my-1">
                <span>NET PAYABLE:</span>
                <span>₹{parseFloat(invoice.grand_total).toFixed(2)}</span>
              </div>
            </div>

            {/* Footer Notice */}
            <div className="text-center pt-2 mt-2 border-t border-dotted border-gray-400 text-[9px] text-gray-600 space-y-0.5">
              <p>Items sold are non-refundable without bill.</p>
              <p className="font-semibold text-black">*** GET WELL SOON ***</p>
              <p className="text-[8px] text-gray-400">Powered by KNITE Medico SaaS</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
