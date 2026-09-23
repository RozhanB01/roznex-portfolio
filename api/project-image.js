const crypto = require('crypto');
const { Readable } = require('stream');

const COOKIE_NAME = 'roznex_admin_session';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const PROJECTS_PATH = 'roznex/private/projects.json';

function getSessionSecret() {
  const source = process.env.ROZNEX_ADMIN_SESSION_SECRET || process.env.BLOB_READ_WRITE_TOKEN || '';
  if (!source) return '';
  return crypto.createHash('sha256').update('roznex-admin-session:v1:' + source).digest();
}

function parseCookies(req) {
  return Object.fromEntries(
    String(req.headers.cookie || '').split(';').map(v => v.trim()).filter(Boolean).map(v => {
      const i = v.indexOf('=');
      return i < 0 ? [v, ''] : [v.slice(0, i), decodeURIComponent(v.slice(i + 1))];
    })
  );
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a || ''));
  const right = Buffer.from(String(b || ''));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function isAdmin(req) {
  const secret = getSessionSecret();
  if (!secret) return false;
  const token = parseCookies(req)[COOKIE_NAME] || '';
  const [expText, sig] = token.split('.');
  const exp = Number(expText);
  if (!Number.isFinite(exp) || exp < Date.now() || exp > Date.now() + SESSION_TTL_MS + 60_000) return false;
  const expected = crypto.createHmac('sha256', secret).update(expText).digest('base64url');
  return safeEqual(sig, expected);
}

function cleanPath(value) {
  const path = String(value || '').trim().slice(0, 600);
  return /^roznex\/projects\/[a-f0-9-]+\.(jpg|png|webp)$/i.test(path) ? path : '';
}

async function loadProjects(blob) {
  try {
    const result = await blob.get(PROJECTS_PATH, { access: 'private', useCache: false });
    if (!result || result.statusCode !== 200) return [];
    const raw = await new Response(result.stream).text();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.projects) ? parsed.projects : [];
  } catch {
    return [];
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');

  if (req.method !== 'GET') {
    res.statusCode = 405;
    return res.end('Method not allowed');
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    res.statusCode = 404;
    return res.end('Not found');
  }

  const pathname = cleanPath(req.query?.path);
  if (!pathname) {
    res.statusCode = 400;
    return res.end('Invalid image path');
  }

  try {
    const blob = await import('@vercel/blob');
    const adminPreview = String(req.query?.admin || '') === '1' && isAdmin(req);

    if (!adminPreview) {
      const projects = await loadProjects(blob);
      const allowed = projects.some(p => p && p.status === 'approved' && p.imagePath === pathname);
      if (!allowed) {
        res.statusCode = 404;
        return res.end('Not found');
      }
    }

    const result = await blob.get(pathname, {
      access: 'private',
      ifNoneMatch: req.headers['if-none-match'] || undefined
    });

    if (!result) {
      res.statusCode = 404;
      return res.end('Not found');
    }
    if (result.statusCode === 304) {
      res.statusCode = 304;
      if (result.blob?.etag) res.setHeader('ETag', result.blob.etag);
      return res.end();
    }
    if (result.statusCode !== 200) {
      res.statusCode = 404;
      return res.end('Not found');
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', result.blob.contentType || 'application/octet-stream');
    if (result.blob.etag) res.setHeader('ETag', result.blob.etag);
    res.setHeader('Cache-Control', adminPreview ? 'private, no-store' : 'public, max-age=3600, stale-while-revalidate=86400');
    return Readable.fromWeb(result.stream).pipe(res);
  } catch (error) {
    console.error('ROZNEX image proxy error', error);
    res.statusCode = 404;
    return res.end('Not found');
  }
};
