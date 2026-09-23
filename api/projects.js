const crypto = require('crypto');
const { hasBlobStorage, isAdminRequest } = require('../lib/admin-session');

function sameOrigin(req) {
  const origin = String(req.headers.origin || '');
  if (!origin) return true;
  try {
    const u = new URL(origin);
    const host = String(req.headers.host || '');
    return u.host === host && u.protocol === 'https:';
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
    imagePath: cleanImagePath(input.imagePath || existing?.imagePath),
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
    const result = await blob.get(PROJECTS_PATH, { access: 'private', useCache: false });
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
  await blob.put(
    PROJECTS_PATH,
    JSON.stringify({ version: 2, updatedAt: new Date().toISOString(), projects }, null, 2),
    {
      access: 'private',
      allowOverwrite: true,
      contentType: 'application/json'
    }
  );
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
      const project = sanitizeProject(incoming, index >= 0 ? projects[index] : null);
      if (!project.title) return json(res, 400, { error: 'title_required' });
      if (index >= 0) projects[index] = project;
      else projects.unshift(project);
      await saveProjects(blob, projects);
      return json(res, 200, { project: adminProject(project), projects: projects.map(adminProject) });
    }

    if (action === 'delete') {
      const id = cleanText(body.id, 80);
      const found = projects.find(p => p.id === id);
      projects = projects.filter(p => p.id !== id);
      await saveProjects(blob, projects);
      if (found?.imagePath) {
        try { await blob.del(found.imagePath); } catch {}
      }
      return json(res, 200, { ok: true, projects: projects.map(adminProject) });
    }

    if (action === 'import') {
      if (!Array.isArray(body.projects)) return json(res, 400, { error: 'projects_required' });
      projects = body.projects.slice(0, 100).map(p => sanitizeProject(p));
      await saveProjects(blob, projects);
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
      const result = await blob.put(pathname, buffer, {
        access: 'private',
        addRandomSuffix: false,
        contentType: actualType
      });
      return json(res, 200, {
        pathname: result.pathname || pathname,
        previewUrl: imageRoute(result.pathname || pathname, true)
      });
    }

    return json(res, 400, { error: 'unknown_action' });
  } catch (error) {
    console.error('ROZNEX projects API error', error);
    return json(res, 500, { error: 'server_error' });
  }
};
