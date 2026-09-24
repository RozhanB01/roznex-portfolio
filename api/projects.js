const crypto = require('crypto');
const { hasBlobStorage, isAdminRequest } = require('../lib/admin-session');
const { blobOptions } = require('../lib/blob-config');

const PROJECTS_PATH = 'roznex/private/projects.json';
const MAX_IMAGE_BYTES = 1.8 * 1024 * 1024;

function sameOrigin(req) {
  const fetchSite = String(req.headers['sec-fetch-site'] || '').toLowerCase();
  if (fetchSite === 'same-origin') return true;

  const origin = String(req.headers.origin || '');
  if (!origin) return true;

  try {
    const u = new URL(origin);
    const forwardedHost = String(req.headers['x-forwarded-host'] || '').split(',')[0].trim();
    const host = forwardedHost || String(req.headers.host || '');
    const allowedHosts = new Set([
      host,
      String(process.env.VERCEL_URL || ''),
      String(process.env.VERCEL_BRANCH_URL || ''),
      String(process.env.VERCEL_PROJECT_PRODUCTION_URL || '')
    ].filter(Boolean));
    return u.protocol === 'https:' && allowedHosts.has(u.host);
  } catch {
    return false;
  }
}

function cleanText(value, max = 500) {
  return String(value ?? '').replace(/\u0000/g, '').trim().slice(0, max);
}

function cleanHttpUrl(value) {
  const raw = cleanText(value, 1200);
  if (!raw) return '';
  try {
    const u = new URL(raw);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : '';
  } catch {
    return '';
  }
}

function cleanImagePath(value) {
  const raw = cleanText(value, 600);
  return /^roznex\/projects\/[a-f0-9-]+\.(jpg|png|webp)$/i.test(raw) ? raw : '';
}

function imageRoute(pathname, admin = false) {
  if (!pathname) return '';
  return '/api/project-image?path=' + encodeURIComponent(pathname) + (admin ? '&admin=1' : '');
}

function sanitizeProject(input = {}, existing = null) {
  const allowedStatus = new Set(['draft', 'review', 'approved']);
  return {
    id: cleanText(input.id || existing?.id || crypto.randomUUID(), 80),
    title: cleanText(input.title, 140),
    client: cleanText(input.client, 140),
    category: cleanText(input.category, 80),
    status: allowedStatus.has(input.status) ? input.status : 'draft',
    summary: cleanText(input.summary, 1600),
    url: cleanHttpUrl(input.url),
    date: cleanText(input.date, 80),
    notes: cleanText(input.notes, 4000),
    imagePath: Object.prototype.hasOwnProperty.call(input, 'imagePath')
      ? cleanImagePath(input.imagePath)
      : cleanImagePath(existing?.imagePath),
    updatedAt: new Date().toISOString()
  };
}

function publicProject(project) {
  return {
    id: project.id,
    title: project.title,
    client: project.client,
    category: project.category,
    summary: project.summary,
    url: project.url,
    date: project.date,
    imageUrl: imageRoute(project.imagePath, false),
    updatedAt: project.updatedAt
  };
}

function adminProject(project) {
  return { ...project, imageUrl: imageRoute(project.imagePath, true) };
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

async function loadProjects(blob) {
  if (!hasBlobStorage()) return [];
  try {
    const result = await blob.get(PROJECTS_PATH, blobOptions({ access: 'private', useCache: false }));
    if (!result || result.statusCode !== 200) return [];
    const raw = await new Response(result.stream).text();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.projects) ? parsed.projects : [];
  } catch (error) {
    if (error?.name === 'BlobNotFoundError' || /not found/i.test(String(error?.message || ''))) return [];
    throw error;
  }
}

async function saveProjects(blob, projects) {
  const payload = JSON.stringify({ version: 2, updatedAt: new Date().toISOString(), projects }, null, 2);
  const result = await blob.put(
    PROJECTS_PATH,
    payload,
    blobOptions({
      access: 'private',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json',
      cacheControlMaxAge: 60
    })
  );

  const verify = await blob.get(PROJECTS_PATH, blobOptions({ access: 'private', useCache: false }));
  if (!verify || verify.statusCode !== 200) throw new Error('project_store_verify_failed');

  const raw = await new Response(verify.stream).text();
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed?.projects)) throw new Error('project_store_invalid');

  return { result, projects: parsed.projects };
}

function detectImage(buffer, claimedType) {
  const isJpeg = buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const isPng = buffer.length > 8 && buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  const isWebp = buffer.length > 12 && buffer.subarray(0,4).toString('ascii') === 'RIFF' && buffer.subarray(8,12).toString('ascii') === 'WEBP';
  if (isJpeg && claimedType === 'image/jpeg') return ['jpg', 'image/jpeg'];
  if (isPng && claimedType === 'image/png') return ['png', 'image/png'];
  if (isWebp && claimedType === 'image/webp') return ['webp', 'image/webp'];
  return null;
}

function json(res, status, value) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(value));
}

module.exports = async function handler(req, res) {
  try {
    const blob = await import('@vercel/blob');

    if (req.method === 'GET') {
      const wantsAdmin = String(req.query?.admin || '') === '1';

      if (!hasBlobStorage()) {
        return json(res, wantsAdmin ? 503 : 200, {
          projects: [],
          storageReady: false,
          error: wantsAdmin ? 'storage_not_configured' : undefined
        });
      }

      if (wantsAdmin && !(await isAdminRequest(req))) return json(res, 401, { error: 'unauthorized' });

      const projects = await loadProjects(blob);
      return json(res, 200, {
        projects: wantsAdmin ? projects.map(adminProject) : projects.filter(p => p.status === 'approved').map(publicProject),
        storageReady: true
      });
    }

    if (req.method !== 'POST') return json(res, 405, { error: 'method_not_allowed' });
    if (!hasBlobStorage()) return json(res, 503, { error: 'storage_not_configured' });
    if (!(await isAdminRequest(req))) return json(res, 401, { error: 'unauthorized' });
    if (!sameOrigin(req)) return json(res, 403, { error: 'bad_origin' });

    const body = await readJsonBody(req);
    const action = cleanText(body.action, 40);
    let projects = await loadProjects(blob);

    if (action === 'save') {
      const incoming = body.project || {};
      const index = projects.findIndex(p => p.id === incoming.id);
      const existing = index >= 0 ? projects[index] : null;
      const project = sanitizeProject(incoming, existing);
      if (!project.title) return json(res, 400, { error: 'title_required' });
      if (index >= 0) projects[index] = project;
      else projects.unshift(project);

      const saved = await saveProjects(blob, projects);
      const persisted = saved.projects.find(p => p.id === project.id);
      if (!persisted) return json(res, 500, { error: 'project_not_persisted' });

      if (existing?.imagePath && existing.imagePath !== persisted.imagePath) {
        try { await blob.del(existing.imagePath, blobOptions()); } catch {}
      }

      return json(res, 200, {
        ok: true,
        published: persisted.status === 'approved',
        project: adminProject(persisted),
        projects: saved.projects.map(adminProject)
      });
    }

    if (action === 'delete') {
      const id = cleanText(body.id, 80);
      const found = projects.find(p => p.id === id);
      projects = projects.filter(p => p.id !== id);
      const saved = await saveProjects(blob, projects);
      projects = saved.projects;
      if (found?.imagePath) {
        try { await blob.del(found.imagePath, blobOptions()); } catch {}
      }
      return json(res, 200, { ok: true, projects: projects.map(adminProject) });
    }

    if (action === 'import') {
      if (!Array.isArray(body.projects)) return json(res, 400, { error: 'projects_required' });
      projects = body.projects.slice(0, 100).map(p => sanitizeProject(p));
      const saved = await saveProjects(blob, projects);
      projects = saved.projects;
      return json(res, 200, { ok: true, projects: projects.map(adminProject) });
    }

    if (action === 'upload-image') {
      const contentType = cleanText(body.contentType, 80);
      const base64 = String(body.base64 || '');
      if (!/^image\/(jpeg|png|webp)$/.test(contentType)) return json(res, 400, { error: 'unsupported_image' });
      if (!base64 || base64.length > Math.ceil(MAX_IMAGE_BYTES * 4 / 3) + 16) return json(res, 413, { error: 'image_too_large' });

      let buffer;
      try { buffer = Buffer.from(base64, 'base64'); } catch { return json(res, 400, { error: 'bad_image' }); }
      if (!buffer.length || buffer.length > MAX_IMAGE_BYTES) return json(res, 413, { error: 'image_too_large' });

      const detected = detectImage(buffer, contentType);
      if (!detected) return json(res, 400, { error: 'bad_image_signature' });
      const [ext, actualType] = detected;
      const pathname = 'roznex/projects/' + crypto.randomUUID() + '.' + ext;
      const result = await blob.put(pathname, buffer, blobOptions({
        access: 'private',
        addRandomSuffix: false,
        contentType: actualType
      }));
      return json(res, 200, {
        pathname: result.pathname || pathname,
        previewUrl: imageRoute(result.pathname || pathname, true)
      });
    }

    return json(res, 400, { error: 'unknown_action' });
  } catch (error) {
    console.error('ROZNEX projects API error', {
      message: error?.message,
      name: error?.name,
      stack: error?.stack
    });
    const known = ['project_store_verify_failed','project_store_invalid','project_not_persisted'];
    const code = known.includes(String(error?.message || '')) ? String(error.message) : 'server_error';
    return json(res, 500, { error: code });
  }
};
