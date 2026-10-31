export const LANGUAGES = [
  { code: 'en', label: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'ta', label: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳' },
  { code: 'ml', label: 'Malayalam', nativeName: 'മലയാളം', flag: '🇮🇳' },
  { code: 'hi', label: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
];

export const translations = {
  en: {
    // Navigation
    pos_billing: 'POS Billing',
    inventory: 'Inventory & Stock',
    invoices: 'Invoices History',
    reports: 'Analytics & Reports',
    cloud_active: 'Cloud Active',
    cloud_sync: 'Cloud Sync',
    custom_gst: 'Custom GST',
    whatsapp_billing: 'WhatsApp Billing',
    switch_theme: 'Switch Theme',
    logout: 'Logout',
    
    // POS Billing
    search_medicine_placeholder: 'Search brand or generic formula... (F2 or click)',
    customer_name: 'Customer Name',
    phone_number: 'Phone Number (10 digits)',
    doctor_name: 'Doctor / Prescriber',
    cart_empty: 'Cart is empty. Search & add medicines to begin billing.',
    clear_cart: 'Clear Cart',
    items_in_cart: 'Cart Items',
    subtotal: 'Subtotal',
    discount: 'Discount',
    gst_tax: 'GST Tax',
    grand_total: 'Grand Total',
    payment_mode: 'Payment Mode',
    cash: 'Cash',
    upi: 'UPI / QR',
    card: 'Card',
    credit: 'Credit',
    complete_billing: 'Complete Billing (Ctrl+Enter)',
    print_bill: 'Print Bill',
    send_whatsapp_bill: 'Send WhatsApp Bill',
    cash_received: 'Cash Received',
    change_return: 'Change to Return',
    stock_available: 'In Stock',
    unit_price: 'Unit Price',
    qty: 'Qty',
    total: 'Total',
    wa_lang_label: 'WhatsApp Lang:',

    // Inventory
    add_medicine: 'Add Medicine',
    edit_medicine: 'Edit Medicine',
    medicine_name: 'Medicine Brand Name *',
    generic_composition: 'Generic Salt / Composition',
    batch_number: 'Batch Number',
    expiry_date: 'Expiry Date',
    rack_location: 'Rack / Shelf Location',
    gst_slab: 'GST Slab',
    mrp: 'MRP (₹)',
    purchase_price: 'Purchase Rate (₹)',
    sale_price: 'Sale Price * (₹)',
    stock_quantity: 'Stock Quantity',
    min_stock_alert: 'Min Stock Warning Threshold',
    medicine_description: 'Medicine Description / Dosage Notes',
    medicine_description_placeholder: 'e.g. Take 1 tablet after meals twice daily. Store below 25°C. Useful for fever/infection.',
    save_changes: 'Save Changes',
    add_to_inventory: 'Add to Inventory',
    cancel: 'Cancel',
    total_medicines: 'Total Medicines',
    low_stock: 'Low Stock Alert',
    near_expiry: 'Near Expiry (30d)',
    expired: 'Expired Stock',
    search_stock_placeholder: 'Search by brand, formula, batch, or rack...',
    no_medicines_found: 'No medicines found in catalog.',
    actions: 'Actions',
    dosage_info: 'Dosage / Notes',

    // Invoices
    search_invoices: 'Search by invoice #, customer name, or phone...',
    all_payment_modes: 'All Payment Modes',
    today: 'Today',
    this_month: 'This Month',
    all_time: 'All Time',
    resend_whatsapp: 'Send WhatsApp',
    view_receipt: 'View Bill',
    no_invoices: 'No invoices found.',

    // Reports
    sales_overview: 'Store Sales Overview',
    cash_vs_upi: 'Cash vs UPI Collections',
    inventory_valuation: 'Store Inventory Valuation',
    expired_stock_loss: 'Expired Stock Loss',
    export_excel: 'Export Excel Report',
    export_pdf: 'Download PDF Report',
    custom_date: 'Custom Date',
  },

  ta: {
    // Navigation
    pos_billing: 'பில் போடுதல் (POS)',
    inventory: 'மருந்து இருப்பு (Stock)',
    invoices: 'ரசீது வரலாறு',
    reports: 'விற்பனை அறிக்கைகள்',
    cloud_active: 'கிளவுட் இணைந்தது',
    cloud_sync: 'கிளவுட் ஒத்திசைவு',
    custom_gst: 'ஜிஎஸ்டி அமைப்பு',
    whatsapp_billing: 'வாட்ஸ்அப் பில்லிங்',
    switch_theme: 'வண்ண மாற்றம்',
    logout: 'வெளியேறு',

    // POS Billing
    search_medicine_placeholder: 'மருந்து பெயர் அல்லது மூலக்கூறு தேடுக... (F2)',
    customer_name: 'வாடிக்கையாளர் பெயர்',
    phone_number: 'தொலைபேசி எண் (10 இலக்கம்)',
    doctor_name: 'மருத்துவர் பெயர்',
    cart_empty: 'கூடை காலியாக உள்ளது. மருந்துகளைத் தேடி சேர்க்கவும்.',
    clear_cart: 'கூடையை காலியாக்கு',
    items_in_cart: 'கூடையிலுள்ள மருந்துகள்',
    subtotal: 'கூட்டுத்தொகை',
    discount: 'தள்ளுபடி',
    gst_tax: 'ஜிஎஸ்டி வரி',
    grand_total: 'மொத்தத் தொகை',
    payment_mode: 'பணம் செலுத்தும் முறை',
    cash: 'ரொக்கம் (Cash)',
    upi: 'யுபிஐ (UPI / QR)',
    card: 'அட்டை (Card)',
    credit: 'கடன் (Credit)',
    complete_billing: 'பில் முடி (Ctrl+Enter)',
    print_bill: 'பில் அச்சிடு',
    send_whatsapp_bill: 'வாட்ஸ்அப் பில் அனுப்பு',
    cash_received: 'பெற்ற ரொக்கம்',
    change_return: 'மீதம் தரவேண்டியது',
    stock_available: 'இருப்பில்',
    unit_price: 'விலை',
    qty: 'எண்ணிக்கை',
    total: 'மொத்தம்',
    wa_lang_label: 'வாட்ஸ்அப் மொழி:',

    // Inventory
    add_medicine: 'புதிய மருந்து சேர்க்க',
    edit_medicine: 'மருந்து விவரம் மாற்று',
    medicine_name: 'மருந்து பெயர் *',
    generic_composition: 'மருந்தின் வேதியியல் மூலக்கூறு (Generic)',
    batch_number: 'பேட்ச் எண் (Batch No)',
    expiry_date: 'காலாவதி தேதி (Expiry)',
    rack_location: 'அலமாரி / ராக் எண்',
    gst_slab: 'ஜிஎஸ்டி வரி விகிதம்',
    mrp: 'அதிகபட்ச சில்லறை விலை (MRP ₹)',
    purchase_price: 'கொள்முதல் விலை (₹)',
    sale_price: 'விற்பனை விலை * (₹)',
    stock_quantity: 'இருப்பு எண்ணிக்கை (Stock Qty)',
    min_stock_alert: 'குறைந்தபட்ச இருப்பு எச்சரிக்கை',
    medicine_description: 'மருந்து விளக்கம் / உட்கொள்ளும் வழிமுறை',
    medicine_description_placeholder: 'உதா: தினமும் இருவேளை உணவுக்குப் பின் 1 மாத்திரை. 25°C-க்கு கீழ் சேமிக்கவும்.',
    save_changes: 'சேமிக்க',
    add_to_inventory: 'இருப்பில் சேர்',
    cancel: 'ரத்து செய்',
    total_medicines: 'மொத்த மருந்துகள்',
    low_stock: 'குறைந்த இருப்பு எச்சரிக்கை',
    near_expiry: 'விரைவில் காலாவதியாகும் (30 நாட்கள்)',
    expired: 'காலாவதியான மருந்துகள்',
    search_stock_placeholder: 'மருந்து பெயர், பேட்ச், அலமாரி தேடுக...',
    no_medicines_found: 'மருந்துகள் எதுவும் காணப்படவில்லை.',
    actions: 'செயல்கள்',
    dosage_info: 'வழிமுறை / குறிப்பு',

    // Invoices
    search_invoices: 'ரசீது எண், வாடிக்கையாளர் பெயர் தேடுக...',
    all_payment_modes: 'அனைத்து கட்டண முறைகளும்',
    today: 'இன்று',
    this_month: 'இந்த மாதம்',
    all_time: 'எல்லா நாட்களும்',
    resend_whatsapp: 'வாட்ஸ்அப் அனுப்பு',
    view_receipt: 'ரசீதை பார்',
    no_invoices: 'ரசீதுகள் எதுவும் இல்லை.',

    // Reports
    sales_overview: 'விற்பனை கண்ணோட்டம்',
    cash_vs_upi: 'ரொக்கம் vs யுபிஐ வசூல்',
    inventory_valuation: 'மொத்த மருந்து இருப்பு மதிப்பு',
    expired_stock_loss: 'காலாவதியான இழப்பு',
    export_excel: 'எக்செல் அறிக்கை பதிவிறக்கு',
    export_pdf: 'பிடிஎஃப் அறிக்கை பதிவிறக்கு',
    custom_date: 'தேதியை தேர்வுசெய்',
  },

  ml: {
    // Navigation
    pos_billing: 'പി.ഒ.എസ് ബില്ലിംഗ് (POS)',
    inventory: 'മരുന്ന് സ്റ്റോക്ക് (Inventory)',
    invoices: 'ബില്ലുകളുടെ വിവരങ്ങൾ',
    reports: 'വിൽപ്പന റിപ്പോർട്ടുകൾ',
    cloud_active: 'ക്ലൗഡ് കണക്റ്റഡ്',
    cloud_sync: 'ക്ലൗഡ് സിങ്ക്',
    custom_gst: 'ജിഎസ്ടി ക്രമീകരണം',
    whatsapp_billing: 'വാട്സ്ആപ്പ് ബില്ലിംഗ്',
    switch_theme: 'തീം മാറ്റുക',
    logout: 'ലോഗൗട്ട്',

    // POS Billing
    search_medicine_placeholder: 'മരുന്ന് അല്ലെങ്കിൽ ഫോർമുല തിരയുക... (F2)',
    customer_name: 'ഉപഭോക്താവിന്റെ പേര്',
    phone_number: 'ഫോൺ നമ്പർ (10 അക്കം)',
    doctor_name: 'ഡോക്ടറുടെ പേര്',
    cart_empty: 'കാർട്ട് ശൂന്യമാണ്. മരുന്നുകൾ തിരഞ്ഞു ചേർക്കുക.',
    clear_cart: 'കാർട്ട് ഒഴിവാക്കുക',
    items_in_cart: 'തിരഞ്ഞെടുത്ത മരുന്നുകൾ',
    subtotal: 'ആകെ തുക',
    discount: 'ഡിസ്കൗണ്ട്',
    gst_tax: 'ജിഎസ്ടി നികുതി',
    grand_total: 'അടക്കേണ്ട തുക',
    payment_mode: 'പേയ്‌മെന്റ് രീതി',
    cash: 'പണം (Cash)',
    upi: 'യുപിഐ (UPI / QR)',
    card: 'കാർഡ് (Card)',
    credit: 'കടം (Credit)',
    complete_billing: 'ബിൽ പൂർത്തിയാക്കുക (Ctrl+Enter)',
    print_bill: 'ബിൽ പ്രിന്റ് ചെയ്യുക',
    send_whatsapp_bill: 'വാട്സ്ആപ്പ് ബിൽ അയക്കുക',
    cash_received: 'ലഭിച്ച പണം',
    change_return: 'തിരികെ നൽകാനുള്ളത്',
    stock_available: 'സ്റ്റോക്കിൽ',
    unit_price: 'വില',
    qty: 'എണ്ണം',
    total: 'ആകെ',
    wa_lang_label: 'വാട്സ്ആപ്പ് ഭാഷ:',

    // Inventory
    add_medicine: 'പുതിയ മരുന്ന് ചേർക്കുക',
    edit_medicine: 'മരുന്ന് വിവരങ്ങൾ മാറ്റുക',
    medicine_name: 'മരുന്നിന്റെ പേര് *',
    generic_composition: 'ജനറിക് ചേരുവകൾ (Composition)',
    batch_number: 'ബാച്ച് നമ്പർ (Batch No)',
    expiry_date: 'കാലഹരണ തീയതി (Expiry)',
    rack_location: 'റാക്ക് / ഷെൽഫ് സ്ഥാനം',
    gst_slab: 'ജിഎസ്ടി സ്ലാബ്',
    mrp: 'എം.ആർ.പി (MRP ₹)',
    purchase_price: 'വാങ്ങിയ വില (₹)',
    sale_price: 'വിൽക്കുന്ന വില * (₹)',
    stock_quantity: 'സ്റ്റോക്ക് എണ്ണം (Qty)',
    min_stock_alert: 'കുറഞ്ഞ സ്റ്റോക്ക് മുന്നറിയിപ്പ്',
    medicine_description: 'മരുന്ന് വിവരണം / ഉപയോഗിക്കേണ്ട വിധം',
    medicine_description_placeholder: 'ഉദാ: ഭക്ഷണത്തിന് ശേഷം 1 ഗുളിക വീതം 2 നേരം. 25°C താഴെ സൂക്ഷിക്കുക.',
    save_changes: 'സേവ് ചെയ്യുക',
    add_to_inventory: 'സ്റ്റോക്കിലേക്ക് ചേർക്കുക',
    cancel: 'റദ്ദാക്കുക',
    total_medicines: 'ആകെ മരുന്നുകൾ',
    low_stock: 'കുറഞ്ഞ സ്റ്റോക്ക് മുന്നറിയിപ്പ്',
    near_expiry: 'ഉടൻ കാലഹരണപ്പെടുന്നത് (30 ദിവസം)',
    expired: 'കാലഹരണപ്പെട്ടവ',
    search_stock_placeholder: 'മരുന്ന്, ഫോർമുല, ബാച്ച് തിരയുക...',
    no_medicines_found: 'മരുന്നുകൾ ഒന്നും കണ്ടെത്തിയില്ല.',
    actions: 'നടപടികൾ',
    dosage_info: 'നിർദ്ദേശങ്ങൾ / കുറിപ്പ്',

    // Invoices
    search_invoices: 'ഇൻവോയ്സ് നമ്പർ, ഉപഭോക്താവിന്റെ പേര് തിരയുക...',
    all_payment_modes: 'എല്ലാ പേയ്‌മെന്റ് രീതികളും',
    today: 'ഇന്ന്',
    this_month: 'ഈ മാസം',
    all_time: 'എല്ലാ സമയവും',
    resend_whatsapp: 'വാട്സ്ആപ്പ് അയക്കുക',
    view_receipt: 'ബിൽ കാണുക',
    no_invoices: 'ഇൻവോയ്സുകൾ ഒന്നും കണ്ടെത്തിയില്ല.',

    // Reports
    sales_overview: 'വിൽപ്പന വിവരണം',
    cash_vs_upi: 'ക്യാഷ് vs യുപിഐ ശേഖരണം',
    inventory_valuation: 'മരുന്ന് സ്റ്റോക്ക് മൂല്യം',
    expired_stock_loss: 'കാലഹരണപ്പെട്ട നഷ്ടം',
    export_excel: 'എക്സൽ റിപ്പോർട്ട് ഡൗൺലോഡ്',
    export_pdf: 'പിഡിഎഫ് റിപ്പോർട്ട് ഡൗൺലോഡ്',
    custom_date: 'തീയതി തിരഞ്ഞെടുക്കുക',
  },

  hi: {
    // Navigation
    pos_billing: 'पीओएस बिलिंग (POS)',
    inventory: 'दवा भंडार (Stock)',
    invoices: 'बिल इतिहास (Invoices)',
    reports: 'बिक्री रिपोर्ट (Reports)',
    cloud_active: 'क्लाउड सक्रिय',
    cloud_sync: 'क्लाउड सिंक',
    custom_gst: 'जीएसटी सेटिंग्स',
    whatsapp_billing: 'व्हाट्सएप बिलिंग',
    switch_theme: 'थीम बदलें',
    logout: 'लॉगआउट',

    // POS Billing
    search_medicine_placeholder: 'दवा का नाम या साल्ट खोजें... (F2 दबाएं)',
    customer_name: 'ग्राहक का नाम',
    phone_number: 'मोबाइल नंबर (10 अंक)',
    doctor_name: 'डॉक्टर का नाम',
    cart_empty: 'कार्ट खाली है। बिलिंग शुरू करने के लिए दवाएं जोड़ें।',
    clear_cart: 'कार्ट खाली करें',
    items_in_cart: 'कार्ट की दवाएं',
    subtotal: 'उप-योग (Subtotal)',
    discount: 'छूट (Discount)',
    gst_tax: 'जीएसटी कर (GST)',
    grand_total: 'कुल देय राशि',
    payment_mode: 'भुगतान का प्रकार',
    cash: 'नकद (Cash)',
    upi: 'यूपीआई (UPI / QR)',
    card: 'कार्ड (Card)',
    credit: 'उधार (Credit)',
    complete_billing: 'बिल पूरा करें (Ctrl+Enter)',
    print_bill: 'बिल प्रिंट करें',
    send_whatsapp_bill: 'व्हाट्सएप बिल भेजें',
    cash_received: 'प्राप्त नकद',
    change_return: 'वापस करने योग्य राशि',
    stock_available: 'स्टॉक में उपलब्ध',
    unit_price: 'प्रति दर',
    qty: 'मात्रा',
    total: 'कुल योग',
    wa_lang_label: 'व्हाट्सएप भाषा:',

    // Inventory
    add_medicine: 'नई दवा जोड़ें',
    edit_medicine: 'दवा विवरण बदलें',
    medicine_name: 'दवा का नाम *',
    generic_composition: 'जेनेरिक साल्ट / संरचना (Composition)',
    batch_number: 'बैच नंबर (Batch No)',
    expiry_date: 'समाप्ति तिथि (Expiry Date)',
    rack_location: 'रैक / अलमारी स्थान',
    gst_slab: 'जीएसटी स्लैब',
    mrp: 'एमआरपी (MRP ₹)',
    purchase_price: 'खरीद मूल्य (₹)',
    sale_price: 'बिक्री मूल्य * (₹)',
    stock_quantity: 'स्टॉक मात्रा (Qty)',
    min_stock_alert: 'न्यूनतम स्टॉक चेतावनी सीमा',
    medicine_description: 'दवा विवरण / खुराक एवं उपयोग निर्देश',
    medicine_description_placeholder: 'उदा: भोजन के बाद 1 गोली दिन में दो बार लें। 25°C से नीचे रखें।',
    save_changes: 'बदलाव सहेजें',
    add_to_inventory: 'स्टॉक में जोड़ें',
    cancel: 'रद्द करें',
    total_medicines: 'कुल दवाएं',
    low_stock: 'कम स्टॉक चेतावनी',
    near_expiry: 'जल्द समाप्त होने वाली (30 दिन)',
    expired: 'समाप्त दवाएं (Expired)',
    search_stock_placeholder: 'दवा का नाम, साल्ट, बैच या रैक खोजें...',
    no_medicines_found: 'कैटलॉग में कोई दवा नहीं मिली।',
    actions: 'कार्रवाई',
    dosage_info: 'खुराक / निर्देश',

    // Invoices
    search_invoices: 'बिल संख्या, ग्राहक का नाम या फोन नंबर खोजें...',
    all_payment_modes: 'सभी भुगतान माध्यम',
    today: 'आज',
    this_month: 'इस महीने',
    all_time: 'अब तक का सब',
    resend_whatsapp: 'व्हाट्सएप भेजें',
    view_receipt: 'बिल देखें',
    no_invoices: 'कोई बिल नहीं मिला।',

    // Reports
    sales_overview: 'बिक्री अवलोकन',
    cash_vs_upi: 'नकद बनाम यूपीआई संग्रह',
    inventory_valuation: 'दुकान स्टॉक मूल्यांकन',
    expired_stock_loss: 'समाप्त स्टॉक हानि',
    export_excel: 'एक्सेल रिपोर्ट डाउनलोड करें',
    export_pdf: 'पीडीएफ रिपोर्ट डाउनलोड करें',
    custom_date: 'दिनांक चुनें',
  }
};

/**
 * Returns formatted WhatsApp prescription message in the chosen language.
 */
export function getLocalizedWhatsAppMessage({
  language = 'en',
  shopName = 'KNITE Medico',
  customerName = 'Valued Customer',
  invoiceNumber = '',
  grandTotal = 0,
  paymentMode = 'CASH',
  items = [],
  date = new Date()
}) {
  const sName = (shopName || 'KNITE MEDICO PHARMACY').toUpperCase();
  const cName = customerName || 'Valued Customer';
  const grandFormatted = parseFloat(grandTotal || 0).toFixed(2);
  const pMode = paymentMode || 'CASH';

  const itemsSummary = (items || [])
    .slice(0, 8)
    .map(it => `• ${it.medicine_name || it.name} (x${it.quantity}) - ₹${parseFloat(it.total_amount || (it.quantity * it.unit_price) || 0).toFixed(2)}`)
    .join('\n');
  const moreText = (items || []).length > 8 ? `\n_...and ${(items.length - 8)} more items_` : '';
  const dateStr = date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  if (language === 'ta') {
    return (
      `*${sName}* 💊\n` +
      `_மருத்துவ ரசீது & கட்டண விவரம்_\n\n` +
      `வணக்கம் *${cName}*! 👋\n` +
      `உங்கள் மருத்துவ ரசீது வெற்றிகரமாக உருவாக்கப்பட்டுள்ளது.\n\n` +
      `📄 *ரசீது எண்:* ${invoiceNumber}\n` +
      `💰 *மொத்தத் தொகை:* ₹${grandFormatted}\n` +
      `💳 *கட்டண முறை:* ${pMode}\n` +
      `📅 *தேதி:* ${dateStr}\n\n` +
      (itemsSummary ? `*மருந்துகள் விவரம்:*\n${itemsSummary}${moreText}\n\n` : '') +
      `🙏 *${shopName}-ஐ அணுகியமைக்கு நன்றி! நலமுடன் வாழ வாழ்த்துகிறோம்.*\n` +
      `_KNITE Medico மூலம் இயக்கப்படுகிறது_`
    );
  }

  if (language === 'ml') {
    return (
      `*${sName}* 💊\n` +
      `_ഔദ്യോഗിക മെഡിക്കൽ ബില്ലും പേയ്‌മെന്റ് രസീതും_\n\n` +
      `നമസ്കാരം *${cName}*! 👋\n` +
      `താങ്കളുടെ മെഡിക്കൽ ബിൽ വിജയകരമായി പ്രോസസ്സ് ചെയ്തു.\n\n` +
      `📄 *ഇൻവോയ്സ് നമ്പർ:* ${invoiceNumber}\n` +
      `💰 *ആകെ തുക:* ₹${grandFormatted}\n` +
      `💳 *പേയ്‌മെന്റ് രീതി:* ${pMode}\n` +
      `📅 *തീയതി:* ${dateStr}\n\n` +
      (itemsSummary ? `*മരുന്നുകളുടെ വിവരങ്ങൾ:*\n${itemsSummary}${moreText}\n\n` : '') +
      `🙏 *${shopName} തിരഞ്ഞെടുത്തതിന് നന്ദി! ആയുരാരോഗ്യം നേരുന്നു.*\n` +
      `_Powered by KNITE Medico SaaS_`
    );
  }

  if (language === 'hi') {
    return (
      `*${sName}* 💊\n` +
      `_दवा बिल एवं भुगतान रसीद_\n\n` +
      `नमस्ते *${cName}*! 👋\n` +
      `आपका मेडिकल बिल सफलतापूर्वक तैयार हो गया है।\n\n` +
      `📄 *बिल संख्या:* ${invoiceNumber}\n` +
      `💰 *कुल राशि:* ₹${grandFormatted}\n` +
      `💳 *भुगतान माध्यम:* ${pMode}\n` +
      `📅 *दिनांक:* ${dateStr}\n\n` +
      (itemsSummary ? `*दवाओं का विवरण:*\n${itemsSummary}${moreText}\n\n` : '') +
      `🙏 *${shopName} पर भरोसा करने के लिए धन्यवाद! आपके उत्तम स्वास्थ्य की कामना करते हैं।*\n` +
      `_KNITE Medico द्वारा संचालित_`
    );
  }

  // Default: English
  return (
    `*${sName}* 💊\n` +
    `_Official Prescription Bill & Payment Receipt_\n\n` +
    `Hello *${cName}*! 👋\n` +
    `Your prescription bill has been processed successfully.\n\n` +
    `📄 *Invoice No:* ${invoiceNumber}\n` +
    `💰 *Grand Total:* ₹${grandFormatted}\n` +
    `💳 *Payment Method:* ${pMode}\n` +
    `📅 *Date:* ${dateStr}\n\n` +
    (itemsSummary ? `*Prescription Items:*\n${itemsSummary}${moreText}\n\n` : '') +
    `🙏 *Thank you for choosing ${shopName}! Wishing you good health.*\n` +
    `_Powered by KNITE Medico SaaS_`
  );
}
