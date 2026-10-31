import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { db } from '../db/localDb';

export class ReportExportService {
  // 1. Export Daily Sales Report as Real Microsoft Excel (.xlsx)
  static async exportDailyExcel(selectedDateStr, storeProfile, invoices) {
    const targetDate = selectedDateStr || new Date().toISOString().split('T')[0];
    const dailyInvoices = invoices.filter(inv => inv.created_at.startsWith(targetDate));

    // Sheet 1: Invoices Ledger
    const transactionsData = dailyInvoices.map((inv, idx) => ({
      'S.No': idx + 1,
      'Bill Number': inv.invoice_number,
      'Date': new Date(inv.created_at).toLocaleDateString(),
      'Time': new Date(inv.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      'Patient Name': inv.customer_name || 'Walk-in',
      'Phone': inv.customer_phone || '-',
      'Doctor': inv.doctor_name || '-',
      'Payment Mode': inv.payment_mode,
      'Subtotal (₹)': parseFloat(inv.subtotal || 0).toFixed(2),
      'Discount (₹)': parseFloat(inv.discount_amount || 0).toFixed(2),
      'GST Tax (₹)': parseFloat(inv.tax_amount || 0).toFixed(2),
      'Grand Total (₹)': parseFloat(inv.grand_total || 0).toFixed(2)
    }));

    // Sheet 2: Daily Executive Summary
    const totalSales = dailyInvoices.reduce((s, i) => s + (i.grand_total || 0), 0);
    const cashTotal = dailyInvoices.filter(i => i.payment_mode === 'CASH').reduce((s, i) => s + i.grand_total, 0);
    const upiTotal = dailyInvoices.filter(i => i.payment_mode === 'UPI').reduce((s, i) => s + i.grand_total, 0);
    const cardTotal = dailyInvoices.filter(i => i.payment_mode === 'CARD').reduce((s, i) => s + i.grand_total, 0);
    const taxTotal = dailyInvoices.reduce((s, i) => s + (i.tax_amount || 0), 0);

    const summaryData = [
      { 'Metric': 'Report Date', 'Value': targetDate },
      { 'Metric': 'Pharmacy Store', 'Value': storeProfile?.shop_name || 'KNITE Medico' },
      { 'Metric': 'Drug License (DL) No', 'Value': storeProfile?.dl_number || '-' },
      { 'Metric': 'GSTIN', 'Value': storeProfile?.gstin || '-' },
      { 'Metric': 'Total Bills Processed', 'Value': dailyInvoices.length },
      { 'Metric': 'Total Gross Sales (₹)', 'Value': totalSales.toFixed(2) },
      { 'Metric': 'Cash Collection (₹)', 'Value': cashTotal.toFixed(2) },
      { 'Metric': 'UPI / QR Collection (₹)', 'Value': upiTotal.toFixed(2) },
      { 'Metric': 'Card Collection (₹)', 'Value': cardTotal.toFixed(2) },
      { 'Metric': 'Total GST Tax Collected (₹)', 'Value': taxTotal.toFixed(2) },
      { 'Metric': 'CGST Share (₹)', 'Value': (taxTotal / 2).toFixed(2) },
      { 'Metric': 'SGST Share (₹)', 'Value': (taxTotal / 2).toFixed(2) }
    ];

    // Sheet 3: Medicines Sold Breakdown
    const itemsData = [];
    dailyInvoices.forEach(inv => {
      if (inv.items && inv.items.length > 0) {
        inv.items.forEach(it => {
          itemsData.push({
            'Bill No': inv.invoice_number,
            'Medicine Name': it.medicine_name,
            'Batch No': it.batch_number || '-',
            'Expiry Date': it.expiry_date || '-',
            'Quantity': it.quantity,
            'Unit Price (₹)': parseFloat(it.unit_price).toFixed(2),
            'GST Rate (%)': it.gst_rate || 12,
            'Total Amount (₹)': parseFloat(it.total_amount).toFixed(2)
          });
        });
      }
    });

    // Create Workbook
    const wb = XLSX.utils.book_new();
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    const wsTx = XLSX.utils.json_to_sheet(transactionsData);
    const wsItems = XLSX.utils.json_to_sheet(itemsData);

    XLSX.utils.book_append_sheet(wb, wsSummary, 'Daily Summary');
    XLSX.utils.book_append_sheet(wb, wsTx, 'Bills Ledger');
    if (itemsData.length > 0) {
      XLSX.utils.book_append_sheet(wb, wsItems, 'Items Sold');
    }

    // Write file and download
    const fileName = `Daily-Sales-Report-${targetDate}.xlsx`;
    XLSX.writeFile(wb, fileName);
    return { success: true, count: dailyInvoices.length, fileName };
  }

  // 2. Export Daily Sales Report as High-Res Print-Ready PDF
  static async exportDailyPDF(selectedDateStr, storeProfile, invoices) {
    const targetDate = selectedDateStr || new Date().toISOString().split('T')[0];
    const dailyInvoices = invoices.filter(inv => inv.created_at.startsWith(targetDate));

    const totalSales = dailyInvoices.reduce((s, i) => s + (i.grand_total || 0), 0);
    const cashTotal = dailyInvoices.filter(i => i.payment_mode === 'CASH').reduce((s, i) => s + i.grand_total, 0);
    const upiTotal = dailyInvoices.filter(i => i.payment_mode === 'UPI').reduce((s, i) => s + i.grand_total, 0);
    const taxTotal = dailyInvoices.reduce((s, i) => s + (i.tax_amount || 0), 0);

    const doc = new jsPDF('p', 'mm', 'a4');

    // Header Background Accent
    doc.setFillColor(255, 44, 44);
    doc.rect(0, 0, 210, 18, 'F');

    // Store Title
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text((storeProfile?.shop_name || 'KNITE MEDICO PHARMACY').toUpperCase(), 14, 11);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Daily Sales & Tax Audit Report • ${targetDate}`, 145, 11);

    // Store Meta Subheader
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(8);
    doc.text(`Address: ${storeProfile?.address || 'Near Hospital'} | Ph: ${storeProfile?.phone || '-'} | DL No: ${storeProfile?.dl_number || '-'} | GSTIN: ${storeProfile?.gstin || '-'}`, 14, 25);

    // KPI Summary Box
    doc.setFillColor(255, 241, 242);
    doc.setDrawColor(255, 215, 219);
    doc.roundedRect(14, 29, 182, 22, 3, 3, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 44, 44);
    doc.text(`TOTAL REVENUE: Rs. ${totalSales.toFixed(2)}`, 20, 37);

    doc.setTextColor(51, 65, 85);
    doc.text(`Bills: ${dailyInvoices.length}`, 90, 37);
    doc.text(`Cash: Rs. ${cashTotal.toFixed(2)}`, 120, 37);
    doc.text(`UPI/QR: Rs. ${upiTotal.toFixed(2)}`, 155, 37);

    doc.setFont('helvetica', 'normal');
    doc.text(`Included GST: Rs. ${taxTotal.toFixed(2)}  (CGST: Rs. ${(taxTotal / 2).toFixed(2)} | SGST: Rs. ${(taxTotal / 2).toFixed(2)})`, 20, 45);

    // Transactions Table
    const tableRows = dailyInvoices.map((inv, idx) => [
      idx + 1,
      inv.invoice_number,
      new Date(inv.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      inv.customer_name || 'Walk-in',
      inv.payment_mode,
      `Rs. ${(inv.subtotal || 0).toFixed(2)}`,
      `Rs. ${(inv.discount_amount || 0).toFixed(2)}`,
      `Rs. ${(inv.tax_amount || 0).toFixed(2)}`,
      `Rs. ${(inv.grand_total || 0).toFixed(2)}`
    ]);

    autoTable(doc, {
      startY: 55,
      head: [['#', 'Bill No', 'Time', 'Patient', 'Mode', 'Subtotal', 'Disc', 'GST', 'Total']],
      body: tableRows,
      theme: 'grid',
      headStyles: {
        fillColor: [255, 44, 44],
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 2,
        textColor: [15, 23, 42]
      },
      alternateRowStyles: {
        fillColor: [255, 248, 248]
      }
    });

    // Verification Signatures Footer
    const finalY = doc.lastAutoTable.finalY + 20;
    if (finalY < 270) {
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('Pharmacist-in-Charge Signature: __________________', 14, finalY);
      doc.text('Store Manager Signature: __________________', 125, finalY);
    }

    const fileName = `Daily-Sales-Report-${targetDate}.pdf`;
    doc.save(fileName);
    return { success: true, count: dailyInvoices.length, fileName };
  }

  // 3. ZERO DATA LOSS: Complete Local Snapshot DB Export
  static async exportFullDatabaseSnapshot() {
    const medicines = await db.medicines.toArray();
    const invoices = await db.invoices.toArray();
    const customers = await db.customers.toArray();
    const settings = await db.settings.toArray();

    const snapshot = {
      product: 'KNITE Medico SaaS',
      version: '1.0.0',
      exported_at: new Date().toISOString(),
      medicines_count: medicines.length,
      invoices_count: invoices.length,
      data: {
        medicines,
        invoices,
        customers,
        settings
      }
    };

    const jsonString = JSON.stringify(snapshot, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `KNITE-Medico-ZeroLoss-Snapshot-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    return { success: true, sizeBytes: jsonString.length };
  }
}
