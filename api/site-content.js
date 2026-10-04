const { hasBlobStorage, isAdminRequest } = require('../lib/admin-session');
const { blobOptions } = require('../lib/blob-config');

const CONTENT_PATH = 'roznex/private/site-content.json';
const ALLOWED_KEYS = new Set([
  'seo_title','seo_description',
  'hero_en_1','hero_en_2','hero_en_3','hero_en_4',
  'hero_fa_1','hero_fa_2','hero_fa_3','hero_fa_4',
  'hero_fa_tagline','hero_en_description','hero_fa_description',
  'about_en_title','about_fa_title','about_en_body','about_fa_body',
  'contact_en_title','contact_fa_title','contact_en_body','contact_fa_body',
  'service_ai_en_title','service_ai_fa_title','service_ai_en_body','service_ai_fa_body',
  'service_web_en_title','service_web_fa_title','service_web_en_body','service_web_fa_body',
  'service_3d_en_title','service_3d_fa_title','service_3d_en_body','service_3d_fa_body',
  'service_seo_en_title','service_seo_fa_title','service_seo_en_body','service_seo_fa_body'
]);

function json(res, status, value) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(value));
}

function clean(value, max = 1200) {
  return String(value ?? '').replace(/\u0000/g, '').trim().slice(0, max);
}

function sanitize(input = {}) {
  const out = {};
  for (const [key, value] of Object.entries(input)) {
    if (!ALLOWED_KEYS.has(key)) continue;
    const max = key.endsWith('_body') || key.includes('description') ? 1800 : 500;
    const text = clean(value, max);
    if (text) out[key] = text;
  }
  return out;
}

function sameOrigin(req) {
  const site = String(req.headers['sec-fetch-site'] || '').toLowerCase();
  if (site && !['same-origin', 'same-site', 'none'].includes(site)) return false;

  const origin = String(req.headers.origin || '');
  if (!origin) return true;

  try {
    const url = new URL(origin);
    const forwardedHost = String(req.headers['x-forwarded-host'] || '').split(',')[0].trim();
    const host = forwardedHost || String(req.headers.host || '');
    return url.protocol === 'https:' && url.host === host;
  } catch {
    return false;
  }
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

async function loadContent(blob) {
  if (!hasBlobStorage()) return {};
  try {
    const result = await blob.get(CONTENT_PATH, blobOptions({ access: 'private', useCache: false }));
    if (!result || result.statusCode !== 200) return {};
    const raw = await new Response(result.stream).text();
    const parsed = JSON.parse(raw);
    return sanitize(parsed?.content || {});
  } catch (error) {
    if (error?.name === 'BlobNotFoundError' || /not found/i.test(String(error?.message || ''))) return {};
    throw error;
  }
}

async function saveContent(blob, content) {
  await blob.put(
    CONTENT_PATH,
    JSON.stringify({ version: 1, updatedAt: new Date().toISOString(), content }, null, 2),
    blobOptions({
      access: 'private',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json',
      cacheControlMaxAge: 60
    })
  );
}

module.exports = async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const admin = String(req.query?.admin || '') === '1';
      if (!hasBlobStorage()) {
        if (admin) return json(res, 503, { error: 'storage_not_configured' });
        return json(res, 200, { content: {}, storageReady: false });
      }
      if (admin && !(await isAdminRequest(req))) return json(res, 401, { error: 'unauthorized' });
      const blob = await import('@vercel/blob');
      const content = await loadContent(blob);
      return json(res, 200, { content, storageReady: true });
    }

    if (req.method !== 'POST') return json(res, 405, { error: 'method_not_allowed' });
    if (!sameOrigin(req)) return json(res, 403, { error: 'bad_origin' });
    if (!hasBlobStorage()) return json(res, 503, { error: 'storage_not_configured' });
    if (!(await isAdminRequest(req))) return json(res, 401, { error: 'unauthorized' });

    const body = await readBody(req);
    const action = clean(body.action, 30);
    const blob = await import('@vercel/blob');

    if (action === 'save') {
      const content = sanitize(body.content || {});
      await saveContent(blob, content);
      return json(res, 200, { ok: true, content });
    }

    if (action === 'reset') {
      try { await blob.del(CONTENT_PATH, blobOptions()); } catch {}
      return json(res, 200, { ok: true, content: {} });
    }

    return json(res, 400, { error: 'unknown_action' });
  } catch (error) {
    console.error('ROZNEX site content API error', { name: error?.name, message: error?.message });
    return json(res, 500, { error: 'server_error' });
  }
};
