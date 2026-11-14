import { db } from '../db/localDb';
import { getCloudUrl } from '../utils/cloudConfig';

export class SyncService {
  static getApiBase() {
    return getCloudUrl();
  }

  static getAuthToken() {
    return localStorage.getItem('knite_auth_token');
  }

  // Check if Cloud Server is reachable
  static async checkCloudHealth() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${this.getApiBase()}/health`, { signal: controller.signal });
      clearTimeout(timeoutId);
      return res.ok;
    } catch {
      return false;
    }
  }

  // Push local changes to Cloud Server (All-In-One Cloud SaaS)
  static async pushSync() {
    const token = this.getAuthToken();
    if (!token) return { success: false, reason: 'Not logged in to Cloud' };

    // Fetch local records to guarantee zero data loss
    const medicinesToSync = await db.medicines.toArray();
    const invoicesToSync = await db.invoices.filter(inv => !inv.is_synced).toArray();
    const customersToSync = await db.customers.toArray();

    if (medicinesToSync.length === 0 && invoicesToSync.length === 0 && customersToSync.length === 0) {
      return { success: true, message: 'Already up to date', count: 0 };
    }

    try {
      const response = await fetch(`${this.getApiBase()}/api/sync/push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          medicines: medicinesToSync,
          invoices: invoicesToSync,
          customers: customersToSync
        })
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || errJson.message || 'Sync push failed on server');
      }

      const result = await response.json();

      // Mark local invoices as synced
      for (const inv of invoicesToSync) {
        await db.invoices.update(inv.id, { is_synced: true });
      }

      localStorage.setItem('knite_last_sync_timestamp', result.synced_at || new Date().toISOString());
      window.dispatchEvent(new CustomEvent('knite_sync_completed', { detail: { pushed: true, count: medicinesToSync.length } }));
      return { success: true, ...result };
    } catch (err) {
      console.warn('Sync push error:', err.message);
      return { success: false, error: err.message };
    }
  }

  // Pull remote updates from Cloud Server to Local App
  static async pullSync(forceFull = false) {
    const token = this.getAuthToken();
    if (!token) return { success: false, reason: 'Not logged in to Cloud' };

    const lastSync = forceFull ? '1970-01-01T00:00:00.000Z' : (localStorage.getItem('knite_last_sync_timestamp') || '1970-01-01T00:00:00.000Z');

    try {
      const response = await fetch(`${this.getApiBase()}/api/sync/pull?since=${encodeURIComponent(lastSync)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || 'Sync pull failed');
      }

      const data = await response.json();

      if (data.medicines && data.medicines.length > 0) {
        for (const med of data.medicines) {
          await db.medicines.put({
            id: med.id,
            name: med.name,
            generic_name: med.generic_name || '',
            batch_number: med.batch_number || '',
            expiry_date: med.expiry_date ? String(med.expiry_date).slice(0, 10) : '',
            rack: med.rack || '',
            hsn_code: med.hsn_code || '',
            mrp: parseFloat(med.mrp) || 0,
            purchase_price: parseFloat(med.purchase_price) || 0,
            sale_price: parseFloat(med.sale_price) || 0,
            gst_rate: parseFloat(med.gst_rate) || 0,
            stock_qty: parseInt(med.stock_qty, 10) || 0,
            min_stock: parseInt(med.min_stock, 10) || 10,
            description: med.description || '',
            is_deleted: Boolean(med.is_deleted),
            updated_at: med.updated_at || new Date().toISOString()
          });
        }
      }

      if (data.invoices && data.invoices.length > 0) {
        for (const inv of data.invoices) {
          await db.invoices.put({ ...inv, is_synced: true });
        }
      }

      if (data.customers && data.customers.length > 0) {
        for (const cust of data.customers) {
          await db.customers.put(cust);
        }
      }

      if (data.current_timestamp) {
        localStorage.setItem('knite_last_sync_timestamp', data.current_timestamp);
      }

      window.dispatchEvent(new CustomEvent('knite_sync_completed', { 
        detail: { 
          pulled_medicines: data.medicines ? data.medicines.length : 0, 
          pulled_invoices: data.invoices ? data.invoices.length : 0,
          pulled_customers: data.customers ? data.customers.length : 0
        } 
      }));

      return { 
        success: true, 
        pulled_medicines: data.medicines ? data.medicines.length : 0, 
        pulled_invoices: data.invoices ? data.invoices.length : 0,
        pulled_customers: data.customers ? data.customers.length : 0
      };
    } catch (err) {
      console.warn('Sync pull note:', err.message);
      return { success: false, error: err.message };
    }
  }

  // Full manual Cloud Backup
  static async uploadFullBackup() {
    const token = this.getAuthToken();
    if (!token) return { success: false, error: 'Cloud login required for cloud backups' };

    const medicines = await db.medicines.toArray();
    const invoices = await db.invoices.toArray();
    const customers = await db.customers.toArray();
    const settings = await db.settings.toArray();

    const backupPayload = {
      timestamp: new Date().toISOString(),
      shop_info: settings.find(s => s.key === 'store_profile') || {},
      medicines,
      invoices,
      customers
    };

    try {
      const res = await fetch(`${this.getApiBase()}/api/backup/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          backup_name: `Snapshot-${new Date().toISOString().slice(0, 10)}`,
          data: backupPayload
        })
      });

      return await res.json();
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  static async createSnapshotBackup(name = 'Manual Cloud Snapshot') {
    return await this.uploadFullBackup();
  }

  static async restoreSnapshot(snapshotData) {
    try {
      const payload = typeof snapshotData === 'string' ? JSON.parse(snapshotData) : snapshotData;
      if (!payload) return { success: false, error: 'Invalid backup content' };

      // Non-destructive restore: Never erase local DB records, safely merge/upsert
      if (Array.isArray(payload.medicines) && payload.medicines.length > 0) {
        await db.medicines.bulkPut(payload.medicines);
      }
      if (Array.isArray(payload.invoices) && payload.invoices.length > 0) {
        await db.invoices.bulkPut(payload.invoices);
      }
      if (Array.isArray(payload.customers) && payload.customers.length > 0) {
        await db.customers.bulkPut(payload.customers);
      }
      if (payload.shop_info && payload.shop_info.key) {
        await db.settings.put(payload.shop_info);
      }
      return { success: true };
    } catch (err) {
      console.error('Snapshot restore error:', err);
      return { success: false, error: err.message };
    }
  }

  static async deleteSnapshot(backupId) {
    const token = this.getAuthToken();
    if (!token) return { success: false, error: 'Authorization required' };
    try {
      const res = await fetch(`${this.getApiBase()}/api/backup/${backupId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      return await res.json();
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
}

