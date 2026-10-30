const { isAdminRequest } = require('../lib/admin-session');
const crypto = require('crypto');

function respond(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(payload));
}

function b64(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

async function authorize(email, key) {
  const now = Math.floor(Date.now() / 1000);
  const jwt = b64({ alg: 'RS256', typ: 'JWT' }) + '.' + b64({
    iss: email,
    scope: 'https://www.googleapis.com/auth/webmasters.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  });
  const signature = crypto.sign('RSA-SHA256', Buffer.from(jwt), key).toString('base64url');
  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: jwt + '.' + signature
  });
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) throw new Error('authorization_failed');
  const data = await response.json();
  if (!data.access_token) throw new Error('authorization_failed');
  return data.access_token;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return respond(res, 405, { error: 'method_not_allowed' }); }
  if (!(await isAdminRequest(req))) return respond(res, 401, { error: 'unauthorized' });
  const email = String(process.env.GSC_SERVICE_ACCOUNT_EMAIL || '').trim();
  const key = String(process.env.GSC_SERVICE_ACCOUNT_PRIVATE_KEY || '').replace(/\\n/g, '\n').trim();
  const site = 'sc-domain:roznexstudio.ir';
  if (!email || !key) return respond(res, 200, { configured: false, site });
  try {
    const token = await authorize(email, key);
    const today = new Date();
    const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - 3));
    const start = new Date(end.getTime() - 27 * 86400000);
    const date = d => d.toISOString().slice(0, 10);
    const endpoint = 'https://www.googleapis.com/webmasters/v3/sites/' + encodeURIComponent(site) + '/searchAnalytics/query';
    async function query(dimensions, rowLimit) {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate: date(start), endDate: date(end), dimensions, rowLimit, dataState: 'final' }),
        signal: AbortSignal.timeout(12000)
      });
      if (!response.ok) throw new Error(response.status === 403 || response.status === 404 ? 'property_access_denied' : 'search_console_unavailable');
      const data = await response.json();
      return data.rows || [];
    }
    const [daily, keywords, pages] = await Promise.all([
      query(['date'], 40), query(['query'], 10), query(['page'], 10)
    ]);
    const clicks = daily.reduce((sum, row) => sum + Number(row.clicks || 0), 0);
    const impressions = daily.reduce((sum, row) => sum + Number(row.impressions || 0), 0);
    const position = impressions ? daily.reduce((sum, row) => sum + Number(row.position || 0) * Number(row.impressions || 0), 0) / impressions : null;
    const rows = values => values.map(row => ({
      label: Array.isArray(row.keys) ? String(row.keys[0] || '') : '', clicks: row.clicks, impressions: row.impressions,
      ctr: row.ctr, position: row.position
    }));
    return respond(res, 200, {
      configured: true, site, startDate: date(start), endDate: date(end),
      note: 'Finalized Search Console data; the latest three UTC calendar days are excluded to reduce incomplete reporting.',
      totals: { clicks, impressions, ctr: impressions ? clicks / impressions : 0, position },
      keywords: rows(keywords), pages: rows(pages), daily: rows(daily)
    });
  } catch (error) {
    console.error('Search Console request failed:', error.message);
    return respond(res, 502, { error: ['authorization_failed', 'property_access_denied'].includes(error.message) ? error.message : 'search_console_unavailable' });
  }
};
