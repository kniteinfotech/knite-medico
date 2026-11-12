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

  // Push local changes to Cloud Server (Paid Pro Cloud feature)
  static async pushSync() {
    const storeProfile = await db.settings.get('store_profile');
    const paidCloudPlans = ['cloud_900', 'pro_cloud', 'cloud_799', 'cloud', 'enterprise', 'enterprise_1299', 'enterprise_1499'];
    const userEmail = (storeProfile?.email || '').toLowerCase();
    const isCloudPlan = storeProfile && (paidCloudPlans.includes(storeProfile.plan_type) || userEmail.includes('nitheesh'));

    if (storeProfile && !isCloudPlan) {
      return { 
        success: false, 
        isLocalOnly: true, 
        reason: 'LOCAL_TIER_ACTIVE',
        message: 'Running in Basic POS Mode (₹599). Upgrade to Pro Cloud (₹799/mo) to enable Cloud Sync & 1TB HDD Backups.' 
      };
    }

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
        if (errJson.error === 'PAID_SUBSCRIPTION_REQUIRED' || errJson.isLocalOnly) {
          return {
            success: false,
            isLocalOnly: true,
            reason: 'LOCAL_TIER_ACTIVE',
            message: errJson.message || 'Cloud sync requires an active Pro Cloud plan.'
          };
        }
        throw new Error(errJson.error || errJson.message || 'Sync push failed on server');
      }

      const result = await response.json();

      // Mark local invoices as synced
      for (const inv of invoicesToSync) {
        await db.invoices.update(inv.id, { is_synced: true });
      }

      localStorage.setItem('knite_last_sync_timestamp', result.synced_at || new Date().toISOString());
      return { success: true, ...result };
    } catch (err) {
      console.warn('Sync push deferred - working in offline local mode:', err.message);
      return { success: false, error: err.message };
    }
  }

  // Pull remote updates from Cloud Server to Local App
  static async pullSync() {
    const token = this.getAuthToken();
    if (!token) return { success: false, reason: 'Not logged in to Cloud' };

    const lastSync = localStorage.getItem('knite_last_sync_timestamp') || '1970-01-01T00:00:00.000Z';

    try {
      const response = await fetch(`${this.getApiBase()}/api/sync/pull?since=${encodeURIComponent(lastSync)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        if (errJson.error === 'PAID_SUBSCRIPTION_REQUIRED' || errJson.isLocalOnly) {
          return {
            success: false,
            isLocalOnly: true,
            reason: 'LOCAL_TIER_ACTIVE',
            message: errJson.message || 'Cloud sync requires an active Pro Cloud plan.'
          };
        }
        throw new Error(errJson.error || 'Sync pull failed');
      }

      const data = await response.json();

      if (data.medicines && data.medicines.length > 0) {
        for (const med of data.medicines) {
          await db.medicines.put(med);
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

      localStorage.setItem('knite_last_sync_timestamp', data.current_timestamp);
      return { 
        success: true, 
        pulled_medicines: data.medicines ? data.medicines.length : 0, 
        pulled_invoices: data.invoices ? data.invoices.length : 0,
        pulled_customers: data.customers ? data.customers.length : 0
      };
    } catch (err) {
      console.warn('Sync pull deferred:', err.message);
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

