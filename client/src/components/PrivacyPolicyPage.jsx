import React from 'react';
import { Shield, Lock, FileText, ArrowLeft, Mail, Globe, CheckCircle2, Phone, MapPin } from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-[#ff2c2c] selection:text-white">
      {/* Header Bar */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <a 
            href="/" 
            className="inline-flex items-center gap-2 text-xs font-black text-slate-600 hover:text-slate-900 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to KNITE Medico</span>
          </a>
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            Official Compliance Policy
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-10 sm:py-14 space-y-8">
        {/* Title Block */}
        <div className="space-y-3 border-b border-slate-200 pb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 text-[#ff2c2c] border border-rose-200 text-xs font-black">
            <Shield className="w-3.5 h-3.5" />
            <span>Privacy & Data Protection Notice</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Privacy Policy for KNITE Medico
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Effective Date: November 14, 2026 • Published by KNITE Infotech
          </p>
        </div>

        {/* Introduction */}
        <section className="space-y-3">
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <span>1. Overview & Commitment</span>
          </h2>
          <p className="text-sm leading-relaxed text-slate-700">
            KNITE Infotech ("we", "us", or "our"), headquartered in <strong>Nagercoil, Tamil Nadu, India</strong>, operates the <strong>KNITE Medico</strong> software application (available via web at <code>knitemedico.kniteinfotech.in</code>, mobile Progressive Web Application, and Android APK). This page informs retail pharmacies, chemists, and medical store operators of our strict policies regarding the collection, use, disclosure, and protection of data.
          </p>
        </section>

        {/* 2. Information We Collect */}
        <section className="space-y-3">
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <span>2. Information We Collect</span>
          </h2>
          <p className="text-sm leading-relaxed text-slate-700">
            To provide comprehensive pharmacy billing, stock management, and GST invoicing, KNITE Medico processes:
          </p>
          <ul className="list-disc list-inside space-y-2 text-sm text-slate-700 ml-2">
            <li><strong>Pharmacy Account Details:</strong> Shop name, proprietor name, mobile phone number, email address, drug license (DL) number, GSTIN, and store address.</li>
            <li><strong>Inventory & Product Data:</strong> Medicine names, batch numbers, expiry dates, HSN codes, rack locations, and unit purchase/MRP pricing entered by the store operator.</li>
            <li><strong>Invoicing & Patient Records:</strong> Patient/customer names and phone numbers strictly for generating tax invoices and optional automated WhatsApp bill dispatch.</li>
            <li><strong>Payment Information:</strong> Subscription payments are processed directly through <strong>Razorpay</strong>. We do not store credit card numbers, debit card PINs, or UPI PINs on our servers.</li>
          </ul>
        </section>

        {/* 3. Local-First & Cloud Storage Architecture */}
        <section className="space-y-3">
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <span>3. Local-First Architecture & Data Ownership</span>
          </h2>
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
            <p className="text-sm text-slate-700 font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>You Own 100% of Your Pharmacy Data</span>
            </p>
            <p className="text-xs text-slate-600 leading-relaxed">
              KNITE Medico operates on an Offline-First architecture using client-side IndexedDB. When internet connectivity is unavailable, your invoices and stock operations continue seamlessly locally. When online, data syncs over encrypted TLS/SSL connections to an isolated tenant database partition.
            </p>
            <p className="text-xs text-slate-600 leading-relaxed font-semibold text-rose-700">
              KNITE Infotech will NEVER sell, monetize, rent, or distribute your pharmacy's sales data, medicine inventory, or patient contacts to any pharmaceutical manufacturer, insurance company, or third-party marketing agency.
            </p>
          </div>
        </section>

        {/* 4. WhatsApp & Third-Party Services */}
        <section className="space-y-3">
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <span>4. Third-Party Integrations</span>
          </h2>
          <ul className="list-disc list-inside space-y-2 text-sm text-slate-700 ml-2">
            <li><strong>Razorpay:</strong> Handles secure recurring SaaS subscription billing compliant with RBI and PCI-DSS standards.</li>
            <li><strong>WhatsApp (Linked Devices):</strong> Optional service allowing pharmacies to link their business phone to transmit digital prescription bills directly to consenting patients.</li>
            <li><strong>Transactional Email (Gmail SMTP):</strong> Used solely to transmit email verification OTPs and monthly GST invoices to the registered account owner.</li>
          </ul>
        </section>

        {/* 5. Data Security & Encryption */}
        <section className="space-y-3">
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <span>5. Security Standards</span>
          </h2>
          <p className="text-sm leading-relaxed text-slate-700">
            We implement industry-grade technical and organizational safeguards:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3.5 rounded-xl bg-white border border-slate-200">
              <p className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-600" /> End-to-End Encryption
              </p>
              <p className="text-xs text-slate-500 mt-1">All network transfers are enforced via HTTPS / TLS 1.3 protocol.</p>
            </div>
            <div className="p-3.5 rounded-xl bg-white border border-slate-200">
              <p className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-600" /> Password Hashing
              </p>
              <p className="text-xs text-slate-500 mt-1">Account passwords are salted and hashed using bcrypt with cost factor 12.</p>
            </div>
          </div>
        </section>

        {/* 6. Account Deletion & Data Export */}
        <section className="space-y-3">
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <span>6. Your Rights & Account Deletion</span>
          </h2>
          <p className="text-sm leading-relaxed text-slate-700">
            You retain the right at any time to:
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-sm text-slate-700 ml-2">
            <li>Export all medicine inventory and invoice records to Excel / CSV format from the Reports dashboard.</li>
            <li>Request permanent deletion of your cloud-stored tenant database by contacting our developer team.</li>
            <li>Cancel your active monthly subscription anytime without cancellation penalties.</li>
          </ul>
        </section>

        {/* 7. Contact Us */}
        <section className="space-y-3 pt-4 border-t border-slate-200">
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <span>7. Contact & Support</span>
          </h2>
          <p className="text-sm text-slate-700">
            If you have questions or wish to exercise data rights under this policy:
          </p>
          <div className="p-4 rounded-2xl bg-white border border-slate-200 text-xs space-y-2 font-medium">
            <p className="font-black text-slate-900 text-sm">KNITE Infotech</p>
            <p className="flex items-center gap-2 text-slate-600">
              <MapPin className="w-3.5 h-3.5 text-[#ff2c2c] shrink-0" />
              <span>Location: <strong>Nagercoil, Tamil Nadu, India</strong></span>
            </p>
            <p className="flex items-center gap-2 text-slate-600">
              <Phone className="w-3.5 h-3.5 text-[#ff2c2c] shrink-0" />
              <span>Phone / WhatsApp: <a href="tel:+918778721940" className="font-bold underline text-slate-900">+91 87787 21940</a></span>
            </p>
            <p className="flex items-center gap-2 text-slate-600">
              <Mail className="w-3.5 h-3.5 text-[#ff2c2c] shrink-0" /> 
              <span>Email: <a href="mailto:kniteinfotech@gmail.com" className="font-bold underline text-slate-900">kniteinfotech@gmail.com</a></span>
            </p>
            <p className="flex items-center gap-2 text-slate-600">
              <Globe className="w-3.5 h-3.5 text-[#ff2c2c] shrink-0" /> 
              <span>Website: <a href="https://knitemedico.kniteinfotech.in" className="font-bold underline text-slate-900">knitemedico.kniteinfotech.in</a></span>
            </p>
          </div>
        </section>

        {/* 8. Governing Law & Jurisdiction */}
        <section className="space-y-3 pt-2">
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <span>8. Governing Law & Jurisdiction</span>
          </h2>
          <p className="text-sm leading-relaxed text-slate-700">
            This Policy, our Terms of Service, and all statutory obligations are governed by and construed in accordance with the laws of the Republic of India. Any legal dispute, arbitration, or statutory claim arising from or related to KNITE Medico shall be subject to the exclusive jurisdiction of the competent courts in <strong>Nagercoil, Tamil Nadu, India</strong>.
          </p>
        </section>
      </main>
    </div>
  );
}
