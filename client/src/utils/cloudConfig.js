/**
 * Dynamic Cloud API URL resolver for KNITE Medico
 * Automatically resolves whether running on public domain (knitemedico.kniteinfotech.in),
 * on local LAN (192.168.1.50), localhost, or Electron desktop app.
 */

export const getCloudUrl = () => {
  // 1. Check explicit build-time or runtime Vite env variable
  if (import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL.trim()) {
    return import.meta.env.VITE_API_URL.trim().replace(/\/+$/, '');
  }

  // 2. Check custom user override in browser storage
  const custom = localStorage.getItem('knite_cloud_url');
  if (custom && custom.trim()) {
    return custom.trim().replace(/\/+$/, '');
  }

  if (typeof window !== 'undefined' && window.location) {
    const host = window.location.hostname;

    // If local LAN IPv4 (e.g. 192.168.1.50)
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) {
      return `${window.location.protocol}//${host}:5055`;
    }

    // Localhost development
    if (host === 'localhost' || host === '127.0.0.1') {
      return `${window.location.protocol}//${host}:5055`;
    }
  }

  // Production Render Cloud Backend
  return 'https://knite-medico-backend.onrender.com';
};

export const setCloudUrl = (url) => {
  if (url) {
    localStorage.setItem('knite_cloud_url', url.trim().replace(/\/+$/, ''));
  } else {
    localStorage.removeItem('knite_cloud_url');
  }
};
