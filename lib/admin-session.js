const crypto = require('crypto');
const { hasBlobStorage, blobOptions } = require('./blob-config');

const COOKIE_NAME = 'roznex_admin_session';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const SESSION_PREFIX = 'roznex/private/sessions/';

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

function getSessionSecret() {
  return String(
    process.env.ROZNEX_ADMIN_SESSION_SECRET ||
    process.env.ROZNEX_ADMIN_PASSWORD_HASH ||
    ''
  ).trim();
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left || ''));
  const b = Buffer.from(String(right || ''));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function signStateless(value) {
  const secret = getSessionSecret();
  if (!secret) return '';
  return crypto.createHmac('sha256', secret).update(value).digest('base64url');
}

function statelessCookieValue() {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const nonce = crypto.randomBytes(18).toString('base64url');
  const payload = expiresAt + '.' + nonce;
  return 's1.' + payload + '.' + signStateless(payload);
}

function verifyStateless(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 4 || parts[0] !== 's1') return false;
  const expiresAt = Number(parts[1]);
  const nonce = parts[2];
  const signature = parts[3];
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return false;
  if (!/^[A-Za-z0-9_-]{16,80}$/.test(nonce)) return false;
  const expected = signStateless(parts[1] + '.' + nonce);
  return expected && safeEqual(signature, expected);
}

async function createAdminSession(res) {
  let token = '';

  if (hasBlobStorage()) {
    const blob = await import('@vercel/blob');
    token = crypto.randomBytes(32).toString('base64url');
    const expiresAt = Date.now() + SESSION_TTL_MS;

    await blob.put(
      tokenPath(token),
      JSON.stringify({ expiresAt }),
      blobOptions({
        access: 'private',
        allowOverwrite: false,
        contentType: 'application/json'
      })
    );
  } else {
    token = statelessCookieValue();
    if (!token) return false;
  }

  res.setHeader(
    'Set-Cookie',
    COOKIE_NAME + '=' + encodeURIComponent(token) +
      '; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=43200'
  );
  return true;
}

async function isAdminRequest(req) {
  const token = parseCookies(req)[COOKIE_NAME] || '';
  if (!token) return false;

  if (token.startsWith('s1.')) return verifyStateless(token);
  if (!hasBlobStorage() || !/^[A-Za-z0-9_-]{32,128}$/.test(token)) return false;

  const pathname = tokenPath(token);

  try {
    const blob = await import('@vercel/blob');
    const result = await blob.get(pathname, blobOptions({ access: 'private', useCache: false }));
    if (!result || result.statusCode !== 200) return false;

    const raw = await new Response(result.stream).text();
    const data = JSON.parse(raw);
    const expiresAt = Number(data?.expiresAt || 0);

    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      try { await blob.del(pathname, blobOptions()); } catch {}
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

async function destroyAdminSession(req, res) {
  const token = parseCookies(req)[COOKIE_NAME] || '';
  if (token && !token.startsWith('s1.') && hasBlobStorage()) {
    try {
      const blob = await import('@vercel/blob');
      await blob.del(tokenPath(token), blobOptions());
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
