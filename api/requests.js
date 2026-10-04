const crypto = require('crypto');
const { hasBlobStorage, isAdminRequest } = require('../lib/admin-session');
const { blobOptions } = require('../lib/blob-config');

const REQUESTS_PATH = 'roznex/private/requests.json';
const MAX_REQUESTS = 500;
const STATUS = new Set(['new', 'review', 'qualified', 'closed', 'rejected']);

function json(res, status, value) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(value));
}

function clean(value, max = 500) {
  return String(value ?? '').replace(/\u0000/g, '').trim().slice(0, max);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function sendProjectRequestEmail(request) {
  const apiKey = String(process.env.RESEND_API_KEY || '').trim();
  const to = String(process.env.ROZNEX_NOTIFICATION_EMAIL || '').trim();
  const from = String(process.env.ROZNEX_EMAIL_FROM || 'ROZNEX <onboarding@resend.dev>').trim();

  if (!apiKey || !to) return { sent: false, reason: 'email_not_configured' };

  const rows = [
    ['کد درخواست', request.id],
    ['نام', request.name],
    ['شرکت / برند', request.company || '—'],
    ['ایمیل', request.email],
    ['موبایل', request.mobile],
    ['نوع پروژه', request.type],
    ['عنوان پروژه', request.project],
    ['هدف', request.goal],
    ['قابلیت‌های مدنظر', request.features || '—'],
    ['زمان‌بندی', request.timeline || '—'],
    ['بودجه', request.budget || '—'],
    ['توضیحات', request.notes || '—'],
    ['زمان ثبت', request.createdAt]
  ];

  const html = `<!doctype html>
  <html lang="fa" dir="rtl">
  <body style="margin:0;background:#f3eee8;color:#171817;font-family:Arial,sans-serif">
    <div style="max-width:680px;margin:0 auto;padding:28px 18px">
      <div style="font-size:13px;letter-spacing:2px;margin-bottom:18px">ROZNEX / NEW PROJECT REQUEST</div>
      <h1 style="font-size:26px;margin:0 0 8px">درخواست پروژه جدید</h1>
      <p style="color:#6f675f;margin:0 0 24px">یک درخواست جدید از فرم سایت ثبت شده است.</p>
      <div style="background:#fff;border:1px solid #ddd3c7;border-radius:16px;overflow:hidden">
        ${rows.map(([label, value]) => `
          <div style="padding:12px 16px;border-bottom:1px solid #eee6dd">
            <div style="font-size:11px;color:#8c7c6b;margin-bottom:4px">${escapeHtml(label)}</div>
            <div style="font-size:14px;line-height:1.7;white-space:pre-wrap">${escapeHtml(value)}</div>
          </div>`).join('')}
      </div>
      <p style="margin:22px 0 0;font-size:12px;color:#796f66">برای مدیریت درخواست وارد پنل ROZNEX شو.</p>
      <a href="https://roznex-portfolio.vercel.app/admin" style="display:inline-block;margin-top:10px;padding:10px 16px;border-radius:999px;background:#171817;color:#fff;text-decoration:none;font-size:13px">باز کردن پنل مدیریت</a>
    </div>
  </body></html>`;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': `project-request/${request.id}`
    },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: request.email || undefined,
      subject: `ROZNEX — درخواست پروژه جدید از ${request.name}`,
      html
    })
  });

  let data = null;
  try { data = await response.json(); } catch {}

  if (!response.ok) {
    const error = new Error('email_delivery_failed');
    error.status = response.status;
    error.details = data;
    throw error;
  }

  return { sent: true, id: data?.id || null };
}

function sameOrigin(req) {
  const site = String(req.headers['sec-fetch-site'] || '').toLowerCase();
  if (site && !['same-origin', 'same-site', 'none'].includes(site)) return false;
  const origin = String(req.headers.origin || '');
  if (!origin) return true;
  try {
    const u = new URL(origin);
    const forwardedHost = String(req.headers['x-forwarded-host'] || '').split(',')[0].trim();
    const host = forwardedHost || String(req.headers.host || '');
    return u.protocol === 'https:' && u.host === host;
  } catch {
    return false;
  }
}

const REQUEST_RATE_PREFIX = 'roznex/private/request-rate/';
const REQUEST_RATE_WINDOW_MS = 30 * 60 * 1000;
const REQUEST_RATE_MAX = 5;

function requestClientAddress(req) {
  return String(req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown')
    .split(',')[0].trim().slice(0, 160);
}

function requestRatePath(req) {
  const digest = crypto.createHash('sha256').update(requestClientAddress(req)).digest('hex');
  return REQUEST_RATE_PREFIX + digest + '.json';
}

async function loadRequestRate(blob, req) {
  const empty = { count: 0, resetAt: 0 };
  try {
    const path = requestRatePath(req);
    const result = await blob.get(path, blobOptions({ access: 'private', useCache: false }));
    if (!result || result.statusCode !== 200) return empty;
    const raw = await new Response(result.stream).text();
    const data = JSON.parse(raw);
    const now = Date.now();
    const resetAt = Number(data?.resetAt || 0);
    if (!resetAt || resetAt <= now) {
      try { await blob.del(path, blobOptions()); } catch {}
      return empty;
    }
    return { count: Math.max(0, Number(data?.count || 0)), resetAt };
  } catch {
    return empty;
  }
}

async function recordAcceptedRequest(blob, req, current) {
  const now = Date.now();
  const resetAt = current.resetAt > now ? current.resetAt : now + REQUEST_RATE_WINDOW_MS;
  const state = { count: current.resetAt > now ? current.count + 1 : 1, resetAt };
  await blob.put(requestRatePath(req), JSON.stringify(state), blobOptions({
    access: 'private', addRandomSuffix: false, allowOverwrite: true,
    contentType: 'application/json', cacheControlMaxAge: 60
  }));
}
async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

async function loadRequests(blob) {
  if (!hasBlobStorage()) return [];
  try {
    const result = await blob.get(REQUESTS_PATH, blobOptions({ access: 'private', useCache: false }));
    if (!result || result.statusCode !== 200) return [];
    const raw = await new Response(result.stream).text();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.requests) ? parsed.requests : [];
  } catch (error) {
    if (error?.name === 'BlobNotFoundError' || /not found/i.test(String(error?.message || ''))) return [];
    throw error;
  }
}

async function saveRequests(blob, requests) {
  const payload = JSON.stringify({
    version: 1,
    updatedAt: new Date().toISOString(),
    requests: requests.slice(0, MAX_REQUESTS)
  }, null, 2);

  await blob.put(
    REQUESTS_PATH,
    payload,
    blobOptions({
      access: 'private',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json',
      cacheControlMaxAge: 60
    })
  );
}

function publicPayload(body) {
  return {
    id: 'RZN-REQ-' + Date.now().toString(36).toUpperCase() + '-' + crypto.randomBytes(3).toString('hex').toUpperCase(),
    name: clean(body.name, 120),
    company: clean(body.company, 140),
    mobile: clean(body.mobile, 60),
    email: clean(body.email, 180).toLowerCase(),
    type: clean(body.type, 100),
    project: clean(body.project, 180),
    goal: clean(body.goal, 2200),
    features: clean(body.features, 2200),
    timeline: clean(body.timeline, 120),
    budget: clean(body.budget, 120),
    notes: clean(body.notes, 2600),
    status: 'new',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

module.exports = async function handler(req, res) {
  try {
    if (!sameOrigin(req)) return json(res, 403, { error: 'bad_origin' });

    if (req.method === 'GET') {
      if (!hasBlobStorage()) return json(res, 503, { error: 'storage_not_configured' });
      if (!(await isAdminRequest(req))) return json(res, 401, { error: 'unauthorized' });
      const blob = await import('@vercel/blob');
      const requests = await loadRequests(blob);
      return json(res, 200, { requests, storageReady: true });
    }

    if (req.method !== 'POST') return json(res, 405, { error: 'method_not_allowed' });
    const body = await readBody(req);
    const action = clean(body.action, 40);

    if (!action) {
      if (clean(body.website, 200)) {
        return json(res, 200, { ok: true, id: 'RZN-REQ-RECEIVED' });
      }
      if (!hasBlobStorage()) return json(res, 503, { error: 'storage_not_configured' });

      const request = publicPayload(body);
      if (!request.name || !request.mobile || !request.email || !request.type || !request.project || !request.goal) {
        return json(res, 400, { error: 'required_fields' });
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(request.email)) {
        return json(res, 400, { error: 'bad_email' });
      }
      if (request.mobile.replace(/\D/g, '').length < 7) {
        return json(res, 400, { error: 'bad_mobile' });
      }

      const blob = await import('@vercel/blob');
      const rate = await loadRequestRate(blob, req);
      if (rate.count >= REQUEST_RATE_MAX) {
        const seconds = Math.max(1, Math.ceil((rate.resetAt - Date.now()) / 1000));
        res.setHeader('Retry-After', String(seconds));
        return json(res, 429, { error: 'rate_limited', retryAfter: seconds });
      }
      const requests = await loadRequests(blob);
      const recentDuplicate = requests.some(item =>
        item &&
        item.email === request.email &&
        item.project === request.project &&
        Date.now() - Date.parse(item.createdAt || 0) < 5 * 60 * 1000
      );
      if (recentDuplicate) return json(res, 200, { ok: true, id: requests.find(item => item.email === request.email && item.project === request.project)?.id });

      requests.unshift(request);
      await saveRequests(blob, requests);

      try { await recordAcceptedRequest(blob, req, rate); } catch (error) {
        console.error('ROZNEX request rate-limit write error', { name: error?.name, message: error?.message });
      }

      let notification = { sent: false, reason: 'email_not_configured' };
      try {
        notification = await sendProjectRequestEmail(request);
      } catch (error) {
        console.error('ROZNEX request email error', {
          name: error?.name,
          message: error?.message,
          status: error?.status || null
        });
        notification = { sent: false, reason: 'email_delivery_failed' };
      }

      request.notification = {
        sent: Boolean(notification.sent),
        sentAt: notification.sent ? new Date().toISOString() : null,
        providerId: notification.id || null,
        reason: notification.sent ? null : notification.reason || 'email_delivery_failed'
      };
      await saveRequests(blob, requests);

      return json(res, 201, { ok: true, id: request.id, notified: Boolean(notification.sent) });
    }

    if (!hasBlobStorage()) return json(res, 503, { error: 'storage_not_configured' });
    if (!(await isAdminRequest(req))) return json(res, 401, { error: 'unauthorized' });

    const blob = await import('@vercel/blob');
    let requests = await loadRequests(blob);
    const id = clean(body.id, 100);

    if (action === 'status') {
      const status = clean(body.status, 40);
      if (!STATUS.has(status)) return json(res, 400, { error: 'bad_status' });
      const index = requests.findIndex(item => item.id === id);
      if (index < 0) return json(res, 404, { error: 'not_found' });
      requests[index] = { ...requests[index], status, updatedAt: new Date().toISOString() };
      await saveRequests(blob, requests);
      return json(res, 200, { ok: true, requests });
    }

    if (action === 'delete') {
      requests = requests.filter(item => item.id !== id);
      await saveRequests(blob, requests);
      return json(res, 200, { ok: true, requests });
    }

    return json(res, 400, { error: 'unknown_action' });
  } catch (error) {
    console.error('ROZNEX requests API error', { name: error?.name, message: error?.message });
    return json(res, 500, { error: 'server_error' });
  }
};
