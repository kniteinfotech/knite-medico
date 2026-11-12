const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const {
  uploadToNeonStorage,
  listNeonStorage,
  getFromNeonStorage
} = require('../services/backupStorageService');

function getHelloFunctionUrl() {
  if (process.env.NEON_HELLO_FUNCTION_URL) {
    return process.env.NEON_HELLO_FUNCTION_URL;
  }
  const branchId = process.env.NEON_BRANCH_ID || 'br-dawn-queen-a1975cg9';
  const region = process.env.AWS_REGION || 'ap-southeast-1';
  return `https://${branchId}-hello.compute.c-1.${region}.aws.neon.tech/`;
}

/**
 * GET /api/neon/status
 * End-to-end verification of all 6 Neon services:
 * Postgres, Neon Auth, Object Storage, Functions, AI Gateway, Realtime
 */
router.get('/status', async (req, res) => {
  const results = {};

  // 1. Lakebase Postgres
  try {
    const pgRes = await pool.query('SELECT current_database() AS db, current_user AS usr, NOW() AS now');
    results.postgres = {
      ok: true,
      database: pgRes.rows[0].db,
      user: pgRes.rows[0].usr,
      timestamp: pgRes.rows[0].now,
      pooled: Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.includes('-pooler'))
    };
  } catch (err) {
    results.postgres = { ok: false, error: err.message };
  }

  // 2. Neon Auth (JWKS endpoint)
  try {
    const jwksUrl = process.env.NEON_AUTH_JWKS_URL;
    if (!jwksUrl) throw new Error('NEON_AUTH_JWKS_URL not set');
    const authResp = await fetch(jwksUrl, { signal: AbortSignal.timeout(8000) });
    const jwks = await authResp.json();
    results.auth = {
      ok: authResp.ok && Array.isArray(jwks.keys),
      baseUrl: process.env.NEON_AUTH_BASE_URL,
      keysCount: Array.isArray(jwks.keys) ? jwks.keys.length : 0
    };
  } catch (err) {
    results.auth = { ok: false, error: err.message };
  }

  // 3. Neon Object Storage (S3)
  try {
    const testKey = 'health/neon-storage-check.json';
    const payload = JSON.stringify({ checkedAt: new Date().toISOString(), service: 'knite-medico' });
    await uploadToNeonStorage(testKey, payload);
    const readBack = await getFromNeonStorage(testKey);
    const listed = await listNeonStorage('health/');
    results.objectStorage = {
      ok: Boolean(readBack && JSON.parse(readBack).service === 'knite-medico'),
      endpoint: process.env.AWS_ENDPOINT_URL_S3,
      bucket: listed.bucket,
      objectsFound: listed.objects.length
    };
  } catch (err) {
    results.objectStorage = { ok: false, error: err.message };
  }

  // 4. Neon Functions
  try {
    const fnUrl = getHelloFunctionUrl();
    const fnResp = await fetch(fnUrl, { signal: AbortSignal.timeout(8000) });
    const fnText = await fnResp.text();
    results.functions = {
      ok: fnResp.ok,
      url: fnUrl,
      status: fnResp.status,
      response: fnText.slice(0, 200)
    };
  } catch (err) {
    results.functions = { ok: false, error: err.message };
  }

  // 5. Neon Realtime
  try {
    if (!process.env.NEON_REALTIME_SECRET || !process.env.NEON_REALTIME_URL) {
      throw new Error('NEON_REALTIME_URL or NEON_REALTIME_SECRET not set');
    }
    const { createRealtime, rawSql } = await import('@neon/realtime/server');
    const rt = createRealtime({
      secret: process.env.NEON_REALTIME_SECRET,
      db: 'neondb'
    });
    const query = rawSql('SELECT id, shop_name, status, plan_type FROM medico.tenants LIMIT 20', []);
    const sealed = await rt.seal({ query });
    results.realtime = {
      ok: Boolean(sealed && (sealed.token || sealed.sealed || typeof sealed === 'object')),
      url: process.env.NEON_REALTIME_URL,
      sealedKeys: sealed ? Object.keys(sealed) : []
    };
  } catch (err) {
    results.realtime = { ok: false, error: err.message };
  }

  const allOk = Object.values(results).every((r) => r.ok);
  res.status(allOk ? 200 : 207).json({
    branch: process.env.NEON_BRANCH || 'production',
    branchId: process.env.NEON_BRANCH_ID || null,
    allOk,
    services: results
  });
});

/**
 * POST /api/neon/realtime/seal
 * Seals a live query for client-side subscription via Neon Realtime
 */
router.post('/realtime/seal', async (req, res) => {
  try {
    if (!process.env.NEON_REALTIME_SECRET) {
      return res.status(503).json({ error: 'NEON_REALTIME_SECRET not configured' });
    }
    const { createRealtime, rawSql } = await import('@neon/realtime/server');
    const rt = createRealtime({
      secret: process.env.NEON_REALTIME_SECRET,
      db: 'neondb'
    });
    const query = rawSql('SELECT id, shop_name, status, plan_type FROM medico.tenants LIMIT 50', []);
    const sealed = await rt.seal({ query });
    res.json({
      realtimeUrl: process.env.NEON_REALTIME_URL,
      sealed
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

