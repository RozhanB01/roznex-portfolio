const { Readable } = require('stream');
const { hasBlobStorage, isAdminRequest } = require('../lib/admin-session');
const { blobOptions } = require('../lib/blob-config');

const PROJECTS_PATH = 'roznex/private/projects.json';

function cleanPath(value) {
  const path = String(value || '').trim().slice(0, 600);
  return /^roznex\/projects\/[a-f0-9-]+\.(jpg|png|webp)$/i.test(path) ? path : '';
}

async function loadProjects(blob) {
  try {
    const result = await blob.get(PROJECTS_PATH, blobOptions({ access: 'private', useCache: false }));
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
  if (!hasBlobStorage()) {
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
    const adminPreview = String(req.query?.admin || '') === '1' && await isAdminRequest(req);

    if (!adminPreview) {
      const projects = await loadProjects(blob);
      const allowed = projects.some(p => p && p.status === 'approved' && p.imagePath === pathname);
      if (!allowed) {
        res.statusCode = 404;
        return res.end('Not found');
      }
    }

    const result = await blob.get(pathname, blobOptions({
      access: 'private',
      ifNoneMatch: req.headers['if-none-match'] || undefined
    }));

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
