const crypto = require('crypto');
const { hasBlobStorage, isAdminRequest } = require('../lib/admin-session');
const { blobOptions, getBlobTokenKey, getBlobStoreIdKey } = require('../lib/blob-config');

function json(res, status, value) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(value));
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'method_not_allowed' });

  const configured = hasBlobStorage();
  const admin = configured ? await isAdminRequest(req) : false;

  if (!configured) {
    return json(res, 200, {
      configured: false,
      admin: false,
      canWrite: false,
      message: 'Blob read-write token is missing',
      detectedTokenKey: getBlobTokenKey() || null,
      detectedStoreKey: getBlobStoreIdKey() || null
    });
  }

  if (!admin) {
    return json(res, 200, {
      configured: true,
      admin: false,
      canWrite: false,
      message: 'Admin session is not active',
      detectedTokenKey: getBlobTokenKey() || null,
      detectedStoreKey: getBlobStoreIdKey() || null
    });
  }

  const blob = await import('@vercel/blob');
  const path = 'roznex/private/health/' + crypto.randomUUID() + '.txt';

  try {
    await blob.put(path, 'ok', blobOptions({
      access: 'private',
      addRandomSuffix: false,
      contentType: 'text/plain',
      cacheControlMaxAge: 60
    }));

    const result = await blob.get(path, blobOptions({ access: 'private', useCache: false }));
    const text = result && result.statusCode === 200 ? await new Response(result.stream).text() : '';

    try { await blob.del(path, blobOptions()); } catch {}

    return json(res, 200, {
      configured: true,
      admin: true,
      canWrite: result?.statusCode === 200 && text === 'ok',
      message: result?.statusCode === 200 && text === 'ok' ? 'storage_ok' : 'storage_readback_failed',
      detectedTokenKey: getBlobTokenKey() || null,
      detectedStoreKey: getBlobStoreIdKey() || null
    });
  } catch (error) {
    console.error('ROZNEX storage health error', {
      name: error?.name,
      message: error?.message
    });
    try { await blob.del(path, blobOptions()); } catch {}
    return json(res, 200, {
      configured: true,
      admin: true,
      canWrite: false,
      message: String(error?.message || 'storage_test_failed').slice(0, 220),
      detectedTokenKey: getBlobTokenKey() || null,
      detectedStoreKey: getBlobStoreIdKey() || null
    });
  }
};
