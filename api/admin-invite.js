const fs = require('fs');
const path = require('path');
const { isAdminRequest } = require('../lib/admin-session');

const inviteHtml = fs.readFileSync(path.join(__dirname, '..', 'admin', 'invite', 'index.html'), 'utf8');

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');

  if (!(await isAdminRequest(req))) {
    res.statusCode = 302;
    res.setHeader('Location', '/admin');
    return res.end();
  }

  if (req.method !== 'GET') {
    res.statusCode = 405;
    return res.end('Method not allowed');
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.end(inviteHtml);
};
