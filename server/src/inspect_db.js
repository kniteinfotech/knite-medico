const { pool } = require('./db');

async function inspectDatabase() {
  console.log('===============================================================');
  console.log('📦 KNITE MEDICO POSTGRESQL DATABASE ARCHITECTURE (medico SCHEMA)');
  console.log('===============================================================\n');

  // 1. Tenants (Pharmacies)
  console.log('1️⃣ TABLE: medico.tenants (Multi-Tenant Pharmacy Registry)');
  const tenants = await pool.query(`
    SELECT id, shop_name, owner_name, email, phone, dl_number, gstin, plan_type, status, license_key 
    FROM medico.tenants
  `);
  console.table(tenants.rows);

  // 2. Medicines Catalog
  console.log('\n2️⃣ TABLE: medico.medicines (Drug Inventory & Batches)');
  const meds = await pool.query(`
    SELECT id, name, generic_name, batch_number, expiry_date, sale_price, gst_rate, stock_qty, tenant_id 
    FROM medico.medicines 
    LIMIT 5
  `);
  console.table(meds.rows);

  // 3. Invoices (Prescription Billing)
  console.log('\n3️⃣ TABLE: medico.invoices (Prescription Invoices)');
  const invoices = await pool.query(`
    SELECT id, tenant_id, invoice_number, customer_name, customer_phone, payment_mode, grand_total, created_at 
    FROM medico.invoices 
    LIMIT 5
  `);
  console.table(invoices.rows);

  // 4. Invoice Items
  console.log('\n4️⃣ TABLE: medico.invoice_items (Itemized Drugs Billed)');
  const items = await pool.query(`
    SELECT id, invoice_id, medicine_name, batch_number, quantity, unit_price, total_amount 
    FROM medico.invoice_items 
    LIMIT 5
  `);
  console.table(items.rows);

  // 5. System Settings
  console.log('\n5️⃣ TABLE: medico.system_settings (Global SaaS & Gateway Settings)');
  const settings = await pool.query(`
    SELECT key, value, updated_at FROM medico.system_settings
  `);
  console.table(settings.rows);

  process.exit(0);
}

inspectDatabase().catch(err => {
  console.error('Error inspecting DB:', err);
  process.exit(1);
});
