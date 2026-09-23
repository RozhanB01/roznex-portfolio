const crypto = require('crypto');

const COOKIE_NAME = 'roznex_admin_session';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const SESSION_PREFIX = 'roznex/private/sessions/';

function hasBlobStorage() {
  return Boolean(
    process.env.BLOB_READ_WRITE_TOKEN ||
    (process.env.BLOB_STORE_ID && process.env.VERCEL_OIDC_TOKEN)
  );
}

function parseCookies(req) {
  return Object.fromEntries(
    String(req.headers.cookie || '')
      .split(';')
      .map(value => value.trim())
      .filter(Boolean)
      .map(value => {
        const index = value.indexOf('=');
        return index < 0
          ? [value, '']
          : [value.slice(0, index), decodeURIComponent(value.slice(index + 1))];
      })
  );
}

function tokenPath(token) {
  const digest = crypto.createHash('sha256').update(String(token || '')).digest('hex');
  return SESSION_PREFIX + digest + '.json';
}

async function createAdminSession(res) {
  if (!hasBlobStorage()) return false;

  const blob = await import('@vercel/blob');
  const token = crypto.randomBytes(32).toString('base64url');
  const expiresAt = Date.now() + SESSION_TTL_MS;

  await blob.put(
    tokenPath(token),
    JSON.stringify({ expiresAt }),
    {
      access: 'private',
      allowOverwrite: false,
      contentType: 'application/json'
    }
  );

  res.setHeader(
    'Set-Cookie',
    COOKIE_NAME + '=' + encodeURIComponent(token) +
      '; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=43200'
  );
  return true;
}

async function isAdminRequest(req) {
  if (!hasBlobStorage()) return false;

  const token = parseCookies(req)[COOKIE_NAME] || '';
  if (!/^[A-Za-z0-9_-]{32,128}$/.test(token)) return false;

  const pathname = tokenPath(token);

  try {
    const blob = await import('@vercel/blob');
    const result = await blob.get(pathname, { access: 'private', useCache: false });
    if (!result || result.statusCode !== 200) return false;

    const raw = await new Response(result.stream).text();
    const data = JSON.parse(raw);
    const expiresAt = Number(data?.expiresAt || 0);

    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      try { await blob.del(pathname); } catch {}
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

async function destroyAdminSession(req, res) {
  const token = parseCookies(req)[COOKIE_NAME] || '';
  if (token && hasBlobStorage()) {
    try {
      const blob = await import('@vercel/blob');
      await blob.del(tokenPath(token));
    } catch {}
  }
  res.setHeader('Set-Cookie', COOKIE_NAME + '=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0');
}

module.exports = {
  COOKIE_NAME,
  SESSION_TTL_MS,
  hasBlobStorage,
  createAdminSession,
  isAdminRequest,
  destroyAdminSession
};
