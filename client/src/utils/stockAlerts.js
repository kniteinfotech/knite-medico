import { db } from '../db/localDb';

/**
 * Check for critically low stock medicines and push on-screen notifications
 * Works natively on Apple iPhone (iOS 16.4+ Home Screen), Android, and Desktop
 */
export async function checkAndNotifyLowStock(forceImmediate = false) {
  try {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    const medicines = await db.medicines.toArray();
    const criticallyLow = medicines.filter(m => {
      const min = m.min_stock !== undefined ? m.min_stock : 5;
      return (m.stock_qty || 0) <= min && (m.stock_qty || 0) >= 0;
    });

    if (criticallyLow.length === 0) return;

    // Rate limit periodic popups to once every 10 minutes (unless forceImmediate from sale completion)
    if (!forceImmediate) {
      const lastAlert = parseInt(sessionStorage.getItem('last_low_stock_alert') || '0', 10);
      if (Date.now() - lastAlert < 10 * 60 * 1000) return;
    }
    sessionStorage.setItem('last_low_stock_alert', Date.now().toString());

    const title = criticallyLow.length === 1
      ? `⚠️ Low Stock: ${criticallyLow[0].name}`
      : `⚠️ Low Stock Alert: ${criticallyLow.length} Medicines Critical`;

    const body = criticallyLow.length === 1
      ? `Only ${criticallyLow[0].stock_qty} units left in stock. Reorder soon.`
      : criticallyLow.slice(0, 3).map(m => `${m.name} (${m.stock_qty} left)`).join(', ') + 
        (criticallyLow.length > 3 ? ` + ${criticallyLow.length - 3} more` : '');

    // ServiceWorker Notification is the official standard for Apple iOS 16.4+ and Android
    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready;
        reg.showNotification(title, {
          body,
          icon: '/logo_icon.png',
          badge: '/favicon.png',
          vibrate: [200, 100, 200],
          tag: 'low-stock-alert',
          renotify: true
        });
        return;
      } catch (swErr) {
        console.warn('SW notification failed, trying fallback:', swErr);
      }
    }

    if (typeof Notification !== 'undefined') {
      try {
        new Notification(title, { body, icon: '/logo_icon.png' });
      } catch {}
    }
  } catch (err) {
    console.warn('Low stock notification check error:', err);
  }
}
