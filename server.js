const express = require('express');
const path = require('path');

const adminHandler = require('./api/admin');
const projectsHandler = require('./api/projects');
const projectImageHandler = require('./api/project-image');
const storageHealthHandler = require('./api/storage-health');

const app = express();
const root = __dirname;
const port = Number(process.env.PORT || 3000);

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(express.json({ limit: '3mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

app.get('/health', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ ok: true, service: 'roznex-portfolio' });
});

app.all('/api/projects', projectsHandler);
app.all('/api/project-image', projectImageHandler);
app.all('/api/storage-health', storageHealthHandler);
app.all(['/admin', '/admin/'], adminHandler);

const staticOptions = {
  etag: true,
  maxAge: '1h',
  setHeaders(res) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  }
};

app.use('/assets', express.static(path.join(root, 'assets'), { ...staticOptions, maxAge: '7d' }));
app.use('/quote', express.static(path.join(root, 'quote'), staticOptions));
app.use('/start', express.static(path.join(root, 'start'), staticOptions));
app.use('/admin/invite', express.static(path.join(root, 'admin', 'invite'), staticOptions));

for (const file of ['styles.css', 'script.js', 'manifest.webmanifest', 'robots.txt', 'sitemap.xml']) {
  app.get('/' + file, (req, res) => res.sendFile(path.join(root, file)));
}

app.get(['/', '/index.html'], (req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(path.join(root, 'index.html'));
});

app.use((req, res) => {
  res.status(404).sendFile(path.join(root, '404.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`ROZNEX listening on port ${port}`);
});
