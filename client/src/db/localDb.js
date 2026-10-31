import Dexie from 'dexie';
import { getCloudUrl } from '../utils/cloudConfig';

// Sample medicine IDs that were previously auto-seeded (we explicitly purge them)
export const SAMPLE_MEDICINE_IDS = [
  'med_dolo_650',
  'med_azithral_500',
  'med_pan_d',
  'med_aug_625',
  'med_cetz_10',
  'med_glyc_500',
  'med_telma_40',
  'med_ors_powder'
];

/**
 * Resolves the currently active store identifier.
 * Ensures User 1 and User 2 have completely separate, isolated local IndexedDB instances!
 */
export function getActiveStoreId() {
  try {
    const owner = JSON.parse(localStorage.getItem('knite_shop_owner') || 'null');
    if (owner && owner.id) return String(owner.id);
    const tenant = JSON.parse(localStorage.getItem('knite_cloud_tenant') || 'null');
    if (tenant && tenant.id) return String(tenant.id);
    if (owner && owner.email) return owner.email.replace(/[^a-zA-Z0-9_-]/g, '_');
  } catch {}
  return 'store_default';
}

const dbInstances = new Map();

function createDexieInstance(storeId) {
  const safeId = (storeId || 'default').replace(/[^a-zA-Z0-9_-]/g, '_');
  const d = new Dexie(`KniteMedicoDB_${safeId}`);

  d.version(1).stores({
    medicines: 'id, name, generic_name, batch_number, expiry_date, rack, hsn_code, stock_qty, is_deleted, updated_at',
    invoices: 'id, invoice_number, customer_name, customer_phone, payment_mode, grand_total, created_at, is_synced',
    customers: 'id, name, phone, pending_credit, created_at',
    syncQueue: '++id, action, entity, entity_id, payload, created_at',
    settings: 'key'
  });

  return d;
}

export function getDbForCurrentStore() {
  const storeId = getActiveStoreId();
  if (!dbInstances.has(storeId)) {
    dbInstances.set(storeId, createDexieInstance(storeId));
  }
  return dbInstances.get(storeId);
}

// Proxy object delegating all Dexie calls (db.medicines, db.invoices, db.settings, etc.)
// directly to the current store's isolated database with strict non-erasable protections.
export const db = new Proxy({}, {
  get(target, prop) {
    const activeDb = getDbForCurrentStore();
    const val = activeDb[prop];
    if (prop === 'invoices') {
      // Invoices in pharmacy POS are legal tax documents — protect against accidental .clear()
      return new Proxy(val, {
        get(tblTarget, tblProp) {
          if (tblProp === 'clear') {
            return async () => {
              console.warn('🛡️ [Data Protection] db.invoices is non-erasable in local DB.');
              return 0;
            };
          }
          const tblVal = tblTarget[tblProp];
          return typeof tblVal === 'function' ? tblVal.bind(tblTarget) : tblVal;
        }
      });
    }
    if (typeof val === 'function') {
      return val.bind(activeDb);
    }
    return val;
  }
});

/**
 * Migration helper:
 * If a store opens their scoped database for the first time, migrate their real data
 * (excluding sample medicines) from legacy KniteMedicoLocalDB, then delete the legacy DB.
 */
async function migrateLegacyIfAvailable(targetDb) {
  try {
    const hasMeds = await targetDb.medicines.count();
    if (hasMeds > 0) return;

    if (await Dexie.exists('KniteMedicoLocalDB')) {
      const legacy = new Dexie('KniteMedicoLocalDB');
      legacy.version(1).stores({
        medicines: 'id, name, generic_name, batch_number, expiry_date, rack, hsn_code, stock_qty, is_deleted, updated_at',
        invoices: 'id, invoice_number, customer_name, customer_phone, payment_mode, grand_total, created_at, is_synced',
        customers: 'id, name, phone, pending_credit, created_at',
        settings: 'key'
      });
      await legacy.open();

      const allMeds = await legacy.medicines.toArray();
      const realMeds = allMeds.filter(m => !SAMPLE_MEDICINE_IDS.includes(m.id));
      if (realMeds.length > 0) {
        await targetDb.medicines.bulkPut(realMeds);
        console.log(`📦 Migrated ${realMeds.length} real medicines into store database.`);
      }

      const invs = await legacy.invoices.toArray();
      if (invs.length > 0) await targetDb.invoices.bulkPut(invs);

      const custs = await legacy.customers.toArray();
      if (custs.length > 0) await targetDb.customers.bulkPut(custs);

      const sets = await legacy.settings.toArray();
      if (sets.length > 0) await targetDb.settings.bulkPut(sets);

      await legacy.delete();
      console.log('🧹 Cleaned legacy shared database.');
    }
  } catch (err) {
    console.warn('Migration note:', err.message);
  }
}

/**
 * Purges any sample medicines that might have been accidentally seeded.
 * Medicines must only be added by the shop owner!
 */
export async function purgeSampleMedicines() {
  try {
    const targetDb = getDbForCurrentStore();
    for (const sid of SAMPLE_MEDICINE_IDS) {
      await targetDb.medicines.delete(sid).catch(() => {});
    }
  } catch (err) {
    console.warn('Purge sample meds note:', err.message);
  }
}

/**
 * Initializes store settings only.
 * NO MEDICINES ARE EVER AUTO-ADDED.
 * The medicine catalog starts empty; medicines must be added manually by the shop owner.
 */
export async function seedInitialDataIfEmpty() {
  const currentDb = getDbForCurrentStore();
  
  // First, migrate any existing real items and clean legacy database
  await migrateLegacyIfAvailable(currentDb);

  // Purge any sample medicines that were previously auto-added
  await purgeSampleMedicines();

  // Initialize store profile ONLY if settings are completely empty
  const existingProfile = await currentDb.settings.get('store_profile');
  if (!existingProfile) {
    let ownerInfo = null;
    try {
      ownerInfo = JSON.parse(localStorage.getItem('knite_shop_owner') || 'null');
    } catch {}

    await currentDb.settings.put({
      key: 'store_profile',
      shop_name: ownerInfo?.shop_name || 'My Pharmacy Store',
      tagline: 'Quality Medicines & Healthcare Supplies',
      address: ownerInfo?.address || 'Main Road',
      phone: ownerInfo?.phone || '+91 98765 43210',
      email: ownerInfo?.email || '',
      gstin: ownerInfo?.gstin || '',
      dl_number: ownerInfo?.dl_number || '',
      thermal_printer_width: '80mm',
      cloud_url: getCloudUrl(),
      license_key: ownerInfo?.license_key || '',
      plan_type: ownerInfo?.plan_type || 'free_local',
      is_cloud_enabled: ownerInfo?.plan_type === 'pro_cloud'
    });
  }
}
