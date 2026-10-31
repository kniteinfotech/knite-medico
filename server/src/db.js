const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'knite_db',
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD,
  max: 50,                      // Support up to 50 concurrent cloud-user connections
  min: 5,                       // Keep minimum connections warm for fast response
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 8000,
  statement_timeout: 15000,     // 15s max query time (covers full-export for large stores)
  query_timeout: 15000,
  keepAlive: true,              // Prevent idle connection drops
  keepAliveInitialDelayMillis: 10000
});

// Graceful pool error handler (prevents crash on stale connections)
pool.on('error', (err) => {
  console.error('⚠️ Unexpected PostgreSQL pool client error (non-fatal):', err.message);
  try {
    const { sendAlert } = require('./services/telegramService');
    sendAlert({
      title: '🐘 POSTGRESQL DB POOL ERROR',
      message: err.message,
      level: 'ERROR'
    }).catch(() => {});
  } catch (e) {}
});

// Auto-run database migrations on boot
async function initDB() {
  const client = await pool.connect();
  try {
    console.log('🔄 Checking & initializing KNITE Medico database schema...');

    await client.query(`
      CREATE SCHEMA IF NOT EXISTS medico;

      CREATE TABLE IF NOT EXISTS medico.tenants (
        id VARCHAR(64) PRIMARY KEY,
        shop_name VARCHAR(255) NOT NULL,
        owner_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(32),
        dl_number VARCHAR(100),
        gstin VARCHAR(100),
        address TEXT,
        license_key VARCHAR(128) UNIQUE NOT NULL,
        plan_type VARCHAR(32) DEFAULT 'pro_cloud', -- 'free_local', 'pro_cloud', 'enterprise'
        status VARCHAR(32) DEFAULT 'PENDING_APPROVAL', -- 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'SUSPENDED'
        plan_expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '365 days'),
        cloud_storage_limit_mb INT DEFAULT 5000,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Run safe schema alterations for existing DBs
      ALTER TABLE medico.tenants ADD COLUMN IF NOT EXISTS status VARCHAR(32) DEFAULT 'PENDING_APPROVAL';
      ALTER TABLE medico.tenants ADD COLUMN IF NOT EXISTS dl_number VARCHAR(100);
      ALTER TABLE medico.tenants ADD COLUMN IF NOT EXISTS gstin VARCHAR(100);
      ALTER TABLE medico.tenants ADD COLUMN IF NOT EXISTS address TEXT;
      ALTER TABLE medico.tenants ADD COLUMN IF NOT EXISTS trial_used BOOLEAN DEFAULT false;

      -- Existing demo stores auto-approved
      UPDATE medico.tenants SET status = 'APPROVED' WHERE status IS NULL OR status = '';

      CREATE TABLE IF NOT EXISTS medico.system_settings (
        key VARCHAR(64) PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS medico.users (
        id VARCHAR(64) PRIMARY KEY,
        tenant_id VARCHAR(64) REFERENCES medico.tenants(id) ON DELETE CASCADE,
        username VARCHAR(100) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(32) DEFAULT 'admin',
        failed_login_attempts INT DEFAULT 0,
        locked_until TIMESTAMP WITH TIME ZONE DEFAULT NULL,
        token_version INT DEFAULT 1,
        email_verified BOOLEAN DEFAULT FALSE,
        mfa_enabled BOOLEAN DEFAULT FALSE,
        mfa_secret VARCHAR(128) DEFAULT NULL,
        mfa_backup_codes JSONB DEFAULT '[]',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(tenant_id, username)
      );

      ALTER TABLE medico.users ADD COLUMN IF NOT EXISTS failed_login_attempts INT DEFAULT 0;
      ALTER TABLE medico.users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP WITH TIME ZONE DEFAULT NULL;
      ALTER TABLE medico.users ADD COLUMN IF NOT EXISTS token_version INT DEFAULT 1;
      ALTER TABLE medico.users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
      ALTER TABLE medico.users ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT FALSE;
      ALTER TABLE medico.users ADD COLUMN IF NOT EXISTS mfa_secret VARCHAR(128) DEFAULT NULL;
      ALTER TABLE medico.users ADD COLUMN IF NOT EXISTS mfa_backup_codes JSONB DEFAULT '[]';

      CREATE TABLE IF NOT EXISTS medico.security_logs (
        id SERIAL PRIMARY KEY,
        event_type VARCHAR(64) NOT NULL,
        email_masked VARCHAR(255),
        ip_address VARCHAR(128),
        user_agent TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_security_logs_created ON medico.security_logs(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_security_logs_event ON medico.security_logs(event_type);

      CREATE TABLE IF NOT EXISTS medico.password_resets (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(64) REFERENCES medico.users(id) ON DELETE CASCADE,
        token_hash VARCHAR(128) NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_password_resets_token ON medico.password_resets(token_hash);

      CREATE TABLE IF NOT EXISTS medico.email_verifications (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        token_hash VARCHAR(128) NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS medico.medicines (
        id VARCHAR(64) PRIMARY KEY,
        tenant_id VARCHAR(64) REFERENCES medico.tenants(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        generic_name VARCHAR(255),
        batch_number VARCHAR(100),
        expiry_date DATE,
        rack VARCHAR(50),
        hsn_code VARCHAR(50),
        mrp NUMERIC(12, 2) DEFAULT 0,
        purchase_price NUMERIC(12, 2) DEFAULT 0,
        sale_price NUMERIC(12, 2) DEFAULT 0,
        gst_rate NUMERIC(5, 2) DEFAULT 12,
        stock_qty INT DEFAULT 0,
        min_stock INT DEFAULT 10,
        description TEXT,
        is_deleted BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      ALTER TABLE medico.medicines ADD COLUMN IF NOT EXISTS description TEXT;

      CREATE INDEX IF NOT EXISTS idx_medicines_tenant_updated 
        ON medico.medicines(tenant_id, updated_at);

      -- Performance: Fast tenant-scoped medicine name search
      CREATE INDEX IF NOT EXISTS idx_medicines_tenant_name 
        ON medico.medicines(tenant_id, name);

      CREATE TABLE IF NOT EXISTS medico.invoices (
        id VARCHAR(64) PRIMARY KEY,
        tenant_id VARCHAR(64) REFERENCES medico.tenants(id) ON DELETE CASCADE,
        invoice_number VARCHAR(100) NOT NULL,
        customer_name VARCHAR(255),
        customer_phone VARCHAR(50),
        doctor_name VARCHAR(255),
        payment_mode VARCHAR(50) DEFAULT 'CASH', -- CASH, UPI, CARD, CREDIT
        subtotal NUMERIC(12, 2) DEFAULT 0,
        tax_amount NUMERIC(12, 2) DEFAULT 0,
        discount_amount NUMERIC(12, 2) DEFAULT 0,
        grand_total NUMERIC(12, 2) DEFAULT 0,
        items_count INT DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(tenant_id, invoice_number)
      );

      CREATE INDEX IF NOT EXISTS idx_invoices_tenant_created 
        ON medico.invoices(tenant_id, created_at DESC);

      CREATE TABLE IF NOT EXISTS medico.invoice_items (
        id VARCHAR(64) PRIMARY KEY,
        tenant_id VARCHAR(64) REFERENCES medico.tenants(id) ON DELETE CASCADE,
        invoice_id VARCHAR(64) REFERENCES medico.invoices(id) ON DELETE CASCADE,
        medicine_id VARCHAR(64),
        medicine_name VARCHAR(255) NOT NULL,
        batch_number VARCHAR(100),
        expiry_date DATE,
        quantity INT NOT NULL,
        unit_price NUMERIC(12, 2) NOT NULL,
        gst_rate NUMERIC(5, 2) DEFAULT 12,
        total_amount NUMERIC(12, 2) NOT NULL
      );

      -- Performance: Invoice items joined via invoice_id for tenant exports
      CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice 
        ON medico.invoice_items(invoice_id);

      -- Performance: Per-tenant invoice_items for analytics
      CREATE INDEX IF NOT EXISTS idx_invoice_items_tenant 
        ON medico.invoice_items(tenant_id);

      CREATE TABLE IF NOT EXISTS medico.cloud_backups (
        id VARCHAR(64) PRIMARY KEY,
        tenant_id VARCHAR(64) REFERENCES medico.tenants(id) ON DELETE CASCADE,
        backup_name VARCHAR(255) NOT NULL,
        backup_data JSONB NOT NULL,
        size_bytes BIGINT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Performance: Cloud backup listing per tenant
      CREATE INDEX IF NOT EXISTS idx_cloud_backups_tenant_created 
        ON medico.cloud_backups(tenant_id, created_at DESC);

      CREATE TABLE IF NOT EXISTS medico.customers (
        id VARCHAR(64) PRIMARY KEY,
        tenant_id VARCHAR(64) REFERENCES medico.tenants(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        email VARCHAR(255),
        address TEXT,
        pending_credit NUMERIC(12, 2) DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(tenant_id, id)
      );

      CREATE INDEX IF NOT EXISTS idx_customers_tenant_phone 
        ON medico.customers(tenant_id, phone);
    `);

    console.log('✅ PostgreSQL Schema initialized under medico schema!');
  } catch (err) {
    console.error('❌ Database initialization error:', err);
  } finally {
    client.release();
  }
}

module.exports = {
  pool,
  initDB,
};
