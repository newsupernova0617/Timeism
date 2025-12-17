require('dotenv').config();

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');

const apiRouter = require('./routes/api');

const PORT = process.env.PORT || 3000;
const DOMAIN = process.env.DOMAIN || 'https://timeism.keero.site';

const app = express();

// Set view engine to EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

if (process.env.TRUST_PROXY) {
  app.set('trust proxy', process.env.TRUST_PROXY);
}

app.use(
  helmet({
    contentSecurityPolicy: false
  })
);
app.use(compression());
app.use(express.json({ limit: '64kb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

const checkTimeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX || 30),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: 'RATE_LIMITED',
    message: 'Too many requests. Try again later.'
  }
});

// Admin token authentication middleware
function verifyAdminToken(req, res, next) {
  const token = req.query.token || req.headers['x-admin-token'];
  const expectedToken = process.env.ADMIN_TOKEN || 'admin_secret_token_change_me';

  if (!token || token !== expectedToken) {
    return res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Invalid or missing admin token.'
    });
  }

  next();
}

app.use('/api/check-time', checkTimeLimiter);
app.use('/api', apiRouter);

const staticDir = path.join(__dirname, 'public');

// Dynamic SEO routes
app.get('/robots.txt', (_req, res) => {
  res.type('text/plain');
  res.send(
    `User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/

Sitemap: ${DOMAIN}/sitemap.xml
`
  );
});

app.get('/sitemap.xml', (_req, res) => {
  const lastmod = new Date().toISOString().split('T')[0];

  res.type('application/xml');
  res.send(
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${DOMAIN}/</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${DOMAIN}/guide</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${DOMAIN}/privacy</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
</urlset>`
  );
});

// Dynamic SEO routes with EJS (must be before static middleware)
app.get('/', (_req, res) => {
  res.render('index', { domain: DOMAIN });
});

app.get('/guide', (_req, res) => {
  res.render('guide', { domain: DOMAIN });
});

app.get('/privacy', (_req, res) => {
  res.render('privacy', { domain: DOMAIN });
});

// Serve static files (CSS, JS, images, etc.)
app.use(express.static(staticDir, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.set('Cache-Control', 'no-cache');
    }
  }
}));

// Admin Dashboard
app.get('/admin/dashboard', verifyAdminToken, (_req, res) => {
  res.sendFile(path.join(staticDir, 'admin', 'dashboard.html'));
});

// Analytics API with token verification
app.get('/api/analytics/:endpoint', verifyAdminToken, (req, res, next) => {
  // 토큰 검증 후 API 라우터로 전달
  req.url = `/analytics/${req.params.endpoint}${req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : ''}`;
  apiRouter(req, res, next);
});

app.use((_req, res) => {
  res.status(404).json({
    error: 'NOT_FOUND',
    message: 'Resource not found.'
  });
});

app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred.'
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

module.exports = app;
