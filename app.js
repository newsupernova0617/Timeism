/**
 * Timeism - HTTP Date 헤더 기반 서버 시간 비교 서비스
 * 
 * Express 애플리케이션 진입점
 * - EJS 템플릿 렌더링
 * - API 라우팅
 * - 보안 미들웨어 (Helmet, Rate Limit)
 * - SEO 최적화 (robots.txt, sitemap.xml)
 * - 관리자 대시보드
 */

require('dotenv').config();

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');

const apiRouter = require('./routes/api');

// 환경 변수
const PORT = process.env.PORT || 3000;
const DOMAIN = process.env.DOMAIN || 'https://timeism.keero.site';

const app = express();

// ==================== 뷰 엔진 설정 ====================
// EJS 템플릿 엔진 사용 (동적 메타 태그 생성)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 리버스 프록시 환경 설정 (Nginx, ALB 등)
if (process.env.TRUST_PROXY) {
  app.set('trust proxy', process.env.TRUST_PROXY);
}

// ==================== 미들웨어 설정 ====================

// 1. Helmet: 보안 헤더 설정
app.use(
  helmet({
    contentSecurityPolicy: false  // CSP 비활성화 (필요시 활성화)
  })
);

// 2. Compression: Gzip 압축
app.use(compression());

// 3. JSON 파싱 (최대 64KB)
app.use(express.json({ limit: '64kb' }));

// 4. Morgan: HTTP 로깅
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ==================== 레이트 리밋 설정 ====================

// /api/check-time 레이트 리밋
const checkTimeLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1분 윈도우
  max: Number(process.env.RATE_LIMIT_MAX || 30),  // 분당 최대 30회
  standardHeaders: 'draft-7',  // RateLimit-* 헤더 사용
  legacyHeaders: false,  // X-RateLimit-* 헤더 비활성화
  message: {
    error: 'RATE_LIMITED',
    message: 'Too many requests. Try again later.'
  }
});

// /api/log-event 레이트 리밋
const logEventLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1분 윈도우
  max: 30,  // 분당 최대 30회
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: 'RATE_LIMITED',
    message: 'Too many log events. Try again later.'
  }
});

// /api/session-init 레이트 리밋
const sessionInitLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1분 윈도우
  max: 30,  // 분당 최대 30회
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: 'RATE_LIMITED',
    message: 'Too many session initializations. Try again later.'
  }
});

// ==================== 관리자 인증 미들웨어 ====================
/**
 * 관리자 토큰 검증
 * 
 * 사용 방법:
 * - 쿼리 파라미터: ?token=your_token
 * - HTTP 헤더: X-Admin-Token: your_token
 * 
 * 환경 변수: ADMIN_TOKEN
 */
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

// ==================== 라우팅 설정 ====================

// 레이트 리밋 적용
app.use('/api/check-time', checkTimeLimiter);
app.use('/api/log-event', logEventLimiter);
app.use('/api/session-init', sessionInitLimiter);

// API 라우터 연결
app.use('/api', apiRouter);

// 정적 파일 디렉토리
const staticDir = path.join(__dirname, 'public');

// ==================== SEO 최적화 라우트 ====================

// robots.txt 동적 생성
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

// ==================== 관리자 페이지 ====================

// 관리자 로그인 페이지 (토큰 입력)
app.get('/admin', (_req, res) => {
  res.sendFile(path.join(staticDir, 'admin', 'login.html'));
});

// 관리자 대시보드 (토큰 검증 필요)
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
