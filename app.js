/**
 * SyncTime - HTTP Date 헤더 기반 서버 시간 비교 서비스
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
const commentsRouter = require('./routes/comments');
const adminRouter = require('./routes/admin');
const analyticsRouter = require('./routes/analytics');
const backup = require('./lib/admin/backup');
const i18n = require('./lib/i18n');
const repository = require('./lib/repository');
const { hashIp, normalizeIp } = require('./lib/identity');
const { initDb } = require('./db/init');
const { apiLimiter, trendingLimiter, strictLimiter } = require('./middleware/rate-limiter');

// 환경 변수
const PORT = process.env.PORT || 3000;
const DOMAIN = process.env.DOMAIN || 'https://synctime.keero.site';

const app = express();

// 트렌드 통계 가져오기 함수
async function getTrendsStats() {
  try {
    // 인기 URL 상위 10개
    const topUrls = repository.getTopUrls(10);

    // 시간대별 통계 (0-23시)
    const hourlyStats = repository.getHourlyStats();

    // 전체 통계
    const totalChecks = repository.getTotalChecks();
    const uniqueUrls = repository.getUniqueUrlsCount();
    const todayChecks = repository.getTodayChecks();

    return {
      topUrls,
      hourlyStats,
      totalChecks,
      uniqueUrls,
      todayChecks
    };
  } catch (error) {
    console.error('Error getting trends stats:', error);
    return {
      topUrls: [],
      hourlyStats: [],
      totalChecks: 0,
      uniqueUrls: 0,
      todayChecks: 0
    };
  }
}

// ==================== 뷰 엔진 설정 ====================
// EJS 템플릿 엔진 사용 (동적 메타 태그 생성)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 리버스 프록시 환경 설정 (Nginx, ALB 등)
app.set('trust proxy', 1);

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

// 3-1. Form 데이터 파싱 (HTML form 제출용)
app.use(express.urlencoded({ extended: true, limit: '64kb' }));

// 4. Morgan: HTTP 로깅
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// 5. i18n: 다국어 지원
app.use((req, res, next) => {
  const locale = i18n.detectLocale(req);
  res.locals.locale = locale;
  res.locals.t = (key) => i18n.t(locale, key);
  res.locals.translations = i18n.getTranslations(locale);
  res.locals.domain = DOMAIN;
  res.locals.hreflangLinks = i18n.getHreflangLinks(DOMAIN, req.path);
  res.locals.originalUrl = req.path; // For language switcher
  next();
});

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

// Analytics API routes (aggregated statistics - must come before general /api router)
app.use('/api/analytics', verifyAdminToken, analyticsRouter);

// API 라우터 연결
app.use('/api', apiRouter);
app.use('/api', commentsRouter);

// Admin dashboard route (DB CRUD)
app.get('/admin', verifyAdminToken, (req, res) => {
  res.render('admin/dashboard');
});

// Metrics dashboard route
app.get('/admin/dashboard', verifyAdminToken, (req, res) => {
  res.sendFile(path.join(__dirname, 'public/admin/dashboard.html'));
});

// Admin API routes (all endpoints: CRUD + backup)
app.use('/api/admin', verifyAdminToken, adminRouter);

// Initialize scheduled backup system
try {
  backup.startScheduledBackup();
} catch (error) {
  console.error('Failed to initialize scheduled backup:', error.message);
}

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
  const targetSites = require('./lib/target-sites');
  const allSites = targetSites.getAllSites();

  // 기본 페이지들 (4개 언어: en, ko, ja, zh-tw)
  let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url>
    <loc>${DOMAIN}/</loc>
    <xhtml:link rel="alternate" hreflang="en" href="${DOMAIN}/en/" />
    <xhtml:link rel="alternate" hreflang="ko" href="${DOMAIN}/ko/" />
    <xhtml:link rel="alternate" hreflang="jp" href="${DOMAIN}/jp/" />
    <xhtml:link rel="alternate" hreflang="zh-Hant" href="${DOMAIN}/zh-tw/" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${DOMAIN}/" />
    <lastmod>${lastmod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${DOMAIN}/en/</loc>
    <xhtml:link rel="alternate" hreflang="ko" href="${DOMAIN}/ko/" />
    <xhtml:link rel="alternate" hreflang="jp" href="${DOMAIN}/jp/" />
    <xhtml:link rel="alternate" hreflang="zh-Hant" href="${DOMAIN}/zh-tw/" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${DOMAIN}/" />
    <lastmod>${lastmod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${DOMAIN}/ko/</loc>
    <xhtml:link rel="alternate" hreflang="en" href="${DOMAIN}/en/" />
    <xhtml:link rel="alternate" hreflang="jp" href="${DOMAIN}/jp/" />
    <xhtml:link rel="alternate" hreflang="zh-Hant" href="${DOMAIN}/zh-tw/" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${DOMAIN}/" />
    <lastmod>${lastmod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${DOMAIN}/jp/</loc>
    <xhtml:link rel="alternate" hreflang="en" href="${DOMAIN}/en/" />
    <xhtml:link rel="alternate" hreflang="ko" href="${DOMAIN}/ko/" />
    <xhtml:link rel="alternate" hreflang="zh-Hant" href="${DOMAIN}/zh-tw/" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${DOMAIN}/" />
    <lastmod>${lastmod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${DOMAIN}/zh-tw/</loc>
    <xhtml:link rel="alternate" hreflang="en" href="${DOMAIN}/en/" />
    <xhtml:link rel="alternate" hreflang="ko" href="${DOMAIN}/ko/" />
    <xhtml:link rel="alternate" hreflang="jp" href="${DOMAIN}/jp/" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${DOMAIN}/" />
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
  <url>
    <loc>${DOMAIN}/en/game</loc>
    <xhtml:link rel="alternate" hreflang="ko" href="${DOMAIN}/ko/game" />
    <xhtml:link rel="alternate" hreflang="jp" href="${DOMAIN}/jp/game" />
    <xhtml:link rel="alternate" hreflang="zh-Hant" href="${DOMAIN}/zh-tw/game" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${DOMAIN}/en/game" />
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${DOMAIN}/ko/game</loc>
    <xhtml:link rel="alternate" hreflang="en" href="${DOMAIN}/en/game" />
    <xhtml:link rel="alternate" hreflang="jp" href="${DOMAIN}/jp/game" />
    <xhtml:link rel="alternate" hreflang="zh-Hant" href="${DOMAIN}/zh-tw/game" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${DOMAIN}/en/game" />
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${DOMAIN}/jp/game</loc>
    <xhtml:link rel="alternate" hreflang="en" href="${DOMAIN}/en/game" />
    <xhtml:link rel="alternate" hreflang="ko" href="${DOMAIN}/ko/game" />
    <xhtml:link rel="alternate" hreflang="zh-Hant" href="${DOMAIN}/zh-tw/game" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${DOMAIN}/en/game" />
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${DOMAIN}/zh-tw/game</loc>
    <xhtml:link rel="alternate" hreflang="en" href="${DOMAIN}/en/game" />
    <xhtml:link rel="alternate" hreflang="ko" href="${DOMAIN}/ko/game" />
    <xhtml:link rel="alternate" hreflang="jp" href="${DOMAIN}/jp/game" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${DOMAIN}/en/game" />
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${DOMAIN}/en/about</loc>
    <xhtml:link rel="alternate" hreflang="ko" href="${DOMAIN}/ko/about" />
    <xhtml:link rel="alternate" hreflang="jp" href="${DOMAIN}/jp/about" />
    <xhtml:link rel="alternate" hreflang="zh-Hant" href="${DOMAIN}/zh-tw/about" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${DOMAIN}/en/about" />
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>${DOMAIN}/ko/about</loc>
    <xhtml:link rel="alternate" hreflang="en" href="${DOMAIN}/en/about" />
    <xhtml:link rel="alternate" hreflang="jp" href="${DOMAIN}/jp/about" />
    <xhtml:link rel="alternate" hreflang="zh-Hant" href="${DOMAIN}/zh-tw/about" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${DOMAIN}/en/about" />
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>${DOMAIN}/jp/about</loc>
    <xhtml:link rel="alternate" hreflang="en" href="${DOMAIN}/en/about" />
    <xhtml:link rel="alternate" hreflang="ko" href="${DOMAIN}/ko/about" />
    <xhtml:link rel="alternate" hreflang="zh-Hant" href="${DOMAIN}/zh-tw/about" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${DOMAIN}/en/about" />
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>${DOMAIN}/zh-tw/about</loc>
    <xhtml:link rel="alternate" hreflang="en" href="${DOMAIN}/en/about" />
    <xhtml:link rel="alternate" hreflang="ko" href="${DOMAIN}/ko/about" />
    <xhtml:link rel="alternate" hreflang="jp" href="${DOMAIN}/jp/about" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${DOMAIN}/en/about" />
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>${DOMAIN}/en/contact</loc>
    <xhtml:link rel="alternate" hreflang="ko" href="${DOMAIN}/ko/contact" />
    <xhtml:link rel="alternate" hreflang="jp" href="${DOMAIN}/jp/contact" />
    <xhtml:link rel="alternate" hreflang="zh-Hant" href="${DOMAIN}/zh-tw/contact" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${DOMAIN}/en/contact" />
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>${DOMAIN}/ko/contact</loc>
    <xhtml:link rel="alternate" hreflang="en" href="${DOMAIN}/en/contact" />
    <xhtml:link rel="alternate" hreflang="jp" href="${DOMAIN}/jp/contact" />
    <xhtml:link rel="alternate" hreflang="zh-Hant" href="${DOMAIN}/zh-tw/contact" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${DOMAIN}/en/contact" />
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>${DOMAIN}/jp/contact</loc>
    <xhtml:link rel="alternate" hreflang="en" href="${DOMAIN}/en/contact" />
    <xhtml:link rel="alternate" hreflang="ko" href="${DOMAIN}/ko/contact" />
    <xhtml:link rel="alternate" hreflang="zh-Hant" href="${DOMAIN}/zh-tw/contact" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${DOMAIN}/en/contact" />
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>${DOMAIN}/zh-tw/contact</loc>
    <xhtml:link rel="alternate" hreflang="en" href="${DOMAIN}/en/contact" />
    <xhtml:link rel="alternate" hreflang="ko" href="${DOMAIN}/ko/contact" />
    <xhtml:link rel="alternate" hreflang="jp" href="${DOMAIN}/jp/contact" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${DOMAIN}/en/contact" />
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
`;

  // 타겟 사이트 페이지들 추가 (4개 언어)
  allSites.forEach(site => {
    sitemap += `  <url>
    <loc>${DOMAIN}/en/sites/${site.id}</loc>
    <xhtml:link rel="alternate" hreflang="ko" href="${DOMAIN}/ko/sites/${site.id}" />
    <xhtml:link rel="alternate" hreflang="jp" href="${DOMAIN}/jp/sites/${site.id}" />
    <xhtml:link rel="alternate" hreflang="zh-Hant" href="${DOMAIN}/zh-tw/sites/${site.id}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${DOMAIN}/en/sites/${site.id}" />
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${DOMAIN}/ko/sites/${site.id}</loc>
    <xhtml:link rel="alternate" hreflang="en" href="${DOMAIN}/en/sites/${site.id}" />
    <xhtml:link rel="alternate" hreflang="jp" href="${DOMAIN}/jp/sites/${site.id}" />
    <xhtml:link rel="alternate" hreflang="zh-Hant" href="${DOMAIN}/zh-tw/sites/${site.id}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${DOMAIN}/en/sites/${site.id}" />
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${DOMAIN}/jp/sites/${site.id}</loc>
    <xhtml:link rel="alternate" hreflang="en" href="${DOMAIN}/en/sites/${site.id}" />
    <xhtml:link rel="alternate" hreflang="ko" href="${DOMAIN}/ko/sites/${site.id}" />
    <xhtml:link rel="alternate" hreflang="zh-Hant" href="${DOMAIN}/zh-tw/sites/${site.id}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${DOMAIN}/en/sites/${site.id}" />
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${DOMAIN}/zh-tw/sites/${site.id}</loc>
    <xhtml:link rel="alternate" hreflang="en" href="${DOMAIN}/en/sites/${site.id}" />
    <xhtml:link rel="alternate" hreflang="ko" href="${DOMAIN}/ko/sites/${site.id}" />
    <xhtml:link rel="alternate" hreflang="jp" href="${DOMAIN}/jp/sites/${site.id}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${DOMAIN}/en/sites/${site.id}" />
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`;
  });

  // 블로그 포스트 추가 (4개 언어)
  const blogData = require('./lib/blog-data');
  blogData.posts.forEach(post => {
    sitemap += `  <url>
    <loc>${DOMAIN}/en/blog/${post.slug}</loc>
    <xhtml:link rel="alternate" hreflang="ko" href="${DOMAIN}/ko/blog/${post.slug}" />
    <xhtml:link rel="alternate" hreflang="jp" href="${DOMAIN}/jp/blog/${post.slug}" />
    <xhtml:link rel="alternate" hreflang="zh-Hant" href="${DOMAIN}/zh-tw/blog/${post.slug}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${DOMAIN}/en/blog/${post.slug}" />
    <lastmod>${post.date}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${DOMAIN}/ko/blog/${post.slug}</loc>
    <xhtml:link rel="alternate" hreflang="en" href="${DOMAIN}/en/blog/${post.slug}" />
    <xhtml:link rel="alternate" hreflang="jp" href="${DOMAIN}/jp/blog/${post.slug}" />
    <xhtml:link rel="alternate" hreflang="zh-Hant" href="${DOMAIN}/zh-tw/blog/${post.slug}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${DOMAIN}/en/blog/${post.slug}" />
    <lastmod>${post.date}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${DOMAIN}/jp/blog/${post.slug}</loc>
    <xhtml:link rel="alternate" hreflang="en" href="${DOMAIN}/en/blog/${post.slug}" />
    <xhtml:link rel="alternate" hreflang="ko" href="${DOMAIN}/ko/blog/${post.slug}" />
    <xhtml:link rel="alternate" hreflang="zh-Hant" href="${DOMAIN}/zh-tw/blog/${post.slug}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${DOMAIN}/en/blog/${post.slug}" />
    <lastmod>${post.date}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${DOMAIN}/zh-tw/blog/${post.slug}</loc>
    <xhtml:link rel="alternate" hreflang="en" href="${DOMAIN}/en/blog/${post.slug}" />
    <xhtml:link rel="alternate" hreflang="ko" href="${DOMAIN}/ko/blog/${post.slug}" />
    <xhtml:link rel="alternate" hreflang="jp" href="${DOMAIN}/jp/blog/${post.slug}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${DOMAIN}/en/blog/${post.slug}" />
    <lastmod>${post.date}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
`;
  });

  sitemap += `</urlset>`;

  res.type('application/xml');
  res.send(sitemap);
});

// ==================== 블로그 라우팅 ====================
const blogData = require('./lib/blog-data');

// 블로그 목록
app.get(['/en/blog', '/ko/blog'], (req, res) => {
  const locale = req.path.startsWith('/ko') ? 'ko' : 'en';
  const translations = locale === 'ko'
    ? require('./lib/i18n/locales/ko.json')
    : require('./lib/i18n/locales/en.json');

  res.render('blog/index', {
    locale,
    posts: blogData.posts,
    domain: DOMAIN,
    translations,
    siteId: 'blog' // 헤더/푸터 등에서 조건부 렌더링 필요 시 사용
  });
});

// 블로그 상세
app.get(['/en/blog/:slug', '/ko/blog/:slug'], (req, res) => {
  const locale = req.path.startsWith('/ko') ? 'ko' : 'en';
  const translations = locale === 'ko'
    ? require('./lib/i18n/locales/ko.json')
    : require('./lib/i18n/locales/en.json');

  const post = blogData.posts.find(p => p.slug === req.params.slug);

  if (!post) {
    // 404 처리 (임시로 메인으로 리다이렉트)
    return res.redirect(`/${locale}/blog`);
  }

  res.render('blog/post', {
    locale,
    post,
    domain: DOMAIN,
    translations,
    siteId: 'blog'
  });
});

// ==================== 다국어 라우팅 ====================

// 루트 경로: 브라우저 언어 감지 후 리다이렉트 또는 영어 기본
app.get('/', (req, res) => {
  const locale = i18n.detectLocale(req);
  if (locale !== i18n.DEFAULT_LOCALE) {
    return res.redirect(`/${locale}/`);
  }
  res.render('index', { domain: DOMAIN });
});

// 언어별 메인 페이지
app.get('/en/', (req, res) => {
  res.render('index', { domain: DOMAIN });
});

app.get('/ko/', (req, res) => {
  res.render('index', { domain: DOMAIN });
});

app.get('/jp/', (req, res) => {
  res.render('index', { domain: DOMAIN });
});

app.get('/zh-tw/', (req, res) => {
  res.render('index', { domain: DOMAIN });
});

// 언어별 가이드 페이지
app.get('/en/guide', (req, res) => {
  res.render('guide', { domain: DOMAIN });
});

app.get('/ko/guide', (req, res) => {
  res.render('guide', { domain: DOMAIN });
});

app.get('/jp/guide', (req, res) => {
  res.render('guide', { domain: DOMAIN });
});

app.get('/zh-tw/guide', (req, res) => {
  res.render('guide', { domain: DOMAIN });
});

// 언어별 개인정보 페이지
app.get('/en/privacy', (req, res) => {
  res.render('privacy', { domain: DOMAIN });
});

app.get('/ko/privacy', (req, res) => {
  res.render('privacy', { domain: DOMAIN });
});

app.get('/jp/privacy', (req, res) => {
  res.render('privacy', { domain: DOMAIN });
});

app.get('/zh-tw/privacy', (req, res) => {
  res.render('privacy', { domain: DOMAIN });
});

// 언어별 About 페이지
app.get('/en/about', (req, res) => {
  res.render('about', { domain: DOMAIN });
});

app.get('/ko/about', (req, res) => {
  res.render('about', { domain: DOMAIN });
});

app.get('/jp/about', (req, res) => {
  res.render('about', { domain: DOMAIN });
});

app.get('/zh-tw/about', (req, res) => {
  res.render('about', { domain: DOMAIN });
});

// 언어별 Contact 페이지
app.get('/en/contact', (req, res) => {
  res.render('contact', { domain: DOMAIN });
});

app.get('/ko/contact', (req, res) => {
  res.render('contact', { domain: DOMAIN });
});

app.get('/jp/contact', (req, res) => {
  res.render('contact', { domain: DOMAIN });
});

app.get('/zh-tw/contact', (req, res) => {
  res.render('contact', { domain: DOMAIN });
});

// 언어별 Terms 페이지
app.get('/en/terms', (req, res) => {
  res.render('terms', { domain: DOMAIN });
});

app.get('/ko/terms', (req, res) => {
  res.render('terms', { domain: DOMAIN });
});

app.get('/jp/terms', (req, res) => {
  res.render('terms', { domain: DOMAIN });
});

app.get('/zh-tw/terms', (req, res) => {
  res.render('terms', { domain: DOMAIN });
});

// 언어별 게임 페이지
app.get('/en/game', (req, res) => {
  res.render('game', { domain: DOMAIN });
});

app.get('/ko/game', (req, res) => {
  res.render('game', { domain: DOMAIN });
});

app.get('/jp/game', (req, res) => {
  res.render('game', { domain: DOMAIN });
});

app.get('/zh-tw/game', (req, res) => {
  res.render('game', { domain: DOMAIN });
});

// 알람 테스트 페이지 (언어별)
app.get('/en/alarm-test', (req, res) => {
  res.render('alarm-test', { domain: DOMAIN });
});

app.get('/ko/alarm-test', (req, res) => {
  res.render('alarm-test', { domain: DOMAIN });
});

app.get('/jp/alarm-test', (req, res) => {
  res.render('alarm-test', { domain: DOMAIN });
});

app.get('/zh-tw/alarm-test', (req, res) => {
  res.render('alarm-test', { domain: DOMAIN });
});

// 기본 알람 테스트 페이지 (언어 감지)
app.get('/alarm-test', (req, res) => {
  const locale = i18n.detectLocale(req);
  res.redirect(`/${locale}/alarm-test`);
});


// 언어별 트렌드 분석 페이지
app.get('/en/trends', async (req, res) => {
  try {
    const stats = await getTrendsStats();
    res.render('trends', {
      domain: DOMAIN,
      locale: 'en',
      ...stats
    });
  } catch (error) {
    console.error('Trends page error:', error);
    res.render('trends', {
      domain: DOMAIN,
      locale: 'en',
      topUrls: [],
      hourlyStats: [],
      totalChecks: 0,
      uniqueUrls: 0,
      todayChecks: 0
    });
  }
});

app.get('/ko/trends', async (req, res) => {
  try {
    const stats = await getTrendsStats();
    res.render('trends', {
      domain: DOMAIN,
      locale: 'ko',
      ...stats
    });
  } catch (error) {
    console.error('Trends page error:', error);
    res.render('trends', {
      domain: DOMAIN,
      locale: 'ko',
      topUrls: [],
      hourlyStats: [],
      totalChecks: 0,
      uniqueUrls: 0,
      todayChecks: 0
    });
  }
});

app.get('/jp/trends', async (req, res) => {
  try {
    const stats = await getTrendsStats();
    res.render('trends', {
      domain: DOMAIN,
      locale: 'jp',
      ...stats
    });
  } catch (error) {
    console.error('Trends page error:', error);
    res.render('trends', {
      domain: DOMAIN,
      locale: 'jp',
      topUrls: [],
      hourlyStats: [],
      totalChecks: 0,
      uniqueUrls: 0,
      todayChecks: 0
    });
  }
});

app.get('/zh-tw/trends', async (req, res) => {
  try {
    const stats = await getTrendsStats();
    res.render('trends', {
      domain: DOMAIN,
      locale: 'zh-tw',
      ...stats
    });
  } catch (error) {
    console.error('Trends page error:', error);
    res.render('trends', {
      domain: DOMAIN,
      locale: 'zh-tw',
      topUrls: [],
      hourlyStats: [],
      totalChecks: 0,
      uniqueUrls: 0,
      todayChecks: 0
    });
  }
});

// 언어별 설문조사 페이지
app.get('/en/survey', (req, res) => {
  res.render('survey', {
    domain: DOMAIN,
    locale: 'en',
    submitted: false
  });
});

app.post('/en/survey', async (req, res) => {
  try {
    const { satisfaction, usefulFeature, improvement, additionalFeedback } = req.body;

    // Validate required fields
    if (!satisfaction || !usefulFeature) {
      return res.status(400).render('survey', {
        domain: DOMAIN,
        locale: 'en',
        submitted: false,
        error: 'Missing required fields'
      });
    }

    // Validate satisfaction is 1-5
    const satNum = parseInt(satisfaction, 10);
    if (isNaN(satNum) || satNum < 1 || satNum > 5) {
      return res.status(400).render('survey', {
        domain: DOMAIN,
        locale: 'en',
        submitted: false,
        error: 'Invalid satisfaction rating'
      });
    }

    // Get client IP and hash it
    const clientIp = normalizeIp(req.ip || req.connection.remoteAddress);
    const ipHash = hashIp(clientIp);

    // Save to database
    repository.saveSurveyResponse({
      satisfaction,
      usefulFeature,
      improvement: improvement || null,
      additionalFeedback: additionalFeedback || null,
      ipHash
    });

    res.render('survey', {
      domain: DOMAIN,
      locale: 'en',
      submitted: true
    });
  } catch (error) {
    console.error('Error saving survey response:', error);
    res.status(500).render('survey', {
      domain: DOMAIN,
      locale: 'en',
      submitted: false,
      error: 'Failed to save response. Please try again.'
    });
  }
});

app.get('/ko/survey', (req, res) => {
  res.render('survey', {
    domain: DOMAIN,
    locale: 'ko',
    submitted: false
  });
});

app.post('/ko/survey', async (req, res) => {
  try {
    const { satisfaction, usefulFeature, improvement, additionalFeedback } = req.body;

    // Validate required fields
    if (!satisfaction || !usefulFeature) {
      return res.status(400).render('survey', {
        domain: DOMAIN,
        locale: 'ko',
        submitted: false,
        error: '필수 항목을 입력해주세요'
      });
    }

    // Validate satisfaction is 1-5
    const satNum = parseInt(satisfaction, 10);
    if (isNaN(satNum) || satNum < 1 || satNum > 5) {
      return res.status(400).render('survey', {
        domain: DOMAIN,
        locale: 'ko',
        submitted: false,
        error: '만족도는 1-5 사이의 값이어야 합니다'
      });
    }

    // Get client IP and hash it
    const clientIp = normalizeIp(req.ip || req.connection.remoteAddress);
    const ipHash = hashIp(clientIp);

    // Save to database
    repository.saveSurveyResponse({
      satisfaction,
      usefulFeature,
      improvement: improvement || null,
      additionalFeedback: additionalFeedback || null,
      ipHash
    });

    res.render('survey', {
      domain: DOMAIN,
      locale: 'ko',
      submitted: true
    });
  } catch (error) {
    console.error('Error saving survey response:', error);
    res.status(500).render('survey', {
      domain: DOMAIN,
      locale: 'ko',
      submitted: false,
      error: '응답 저장에 실패했습니다. 다시 시도해주세요'
    });
  }
});

app.get('/jp/survey', (req, res) => {
  res.render('survey', {
    domain: DOMAIN,
    locale: 'jp',
    submitted: false
  });
});

app.post('/jp/survey', async (req, res) => {
  try {
    const { satisfaction, usefulFeature, improvement, additionalFeedback } = req.body;

    // Validate required fields
    if (!satisfaction || !usefulFeature) {
      return res.status(400).render('survey', {
        domain: DOMAIN,
        locale: 'jp',
        submitted: false,
        error: '必須項目を入力してください'
      });
    }

    // Validate satisfaction is 1-5
    const satNum = parseInt(satisfaction, 10);
    if (isNaN(satNum) || satNum < 1 || satNum > 5) {
      return res.status(400).render('survey', {
        domain: DOMAIN,
        locale: 'jp',
        submitted: false,
        error: '満足度は1〜5の値である必要があります'
      });
    }

    // Get client IP and hash it
    const clientIp = normalizeIp(req.ip || req.connection.remoteAddress);
    const ipHash = hashIp(clientIp);

    // Save to database
    repository.saveSurveyResponse({
      satisfaction,
      usefulFeature,
      improvement: improvement || null,
      additionalFeedback: additionalFeedback || null,
      ipHash
    });

    res.render('survey', {
      domain: DOMAIN,
      locale: 'jp',
      submitted: true
    });
  } catch (error) {
    console.error('Error saving survey response:', error);
    res.status(500).render('survey', {
      domain: DOMAIN,
      locale: 'jp',
      submitted: false,
      error: '応答の保存に失敗しました。もう一度やり直してください'
    });
  }
});

app.get('/zh-tw/survey', (req, res) => {
  res.render('survey', {
    domain: DOMAIN,
    locale: 'zh-tw',
    submitted: false
  });
});

app.post('/zh-tw/survey', async (req, res) => {
  try {
    const { satisfaction, usefulFeature, improvement, additionalFeedback } = req.body;

    // Validate required fields
    if (!satisfaction || !usefulFeature) {
      return res.status(400).render('survey', {
        domain: DOMAIN,
        locale: 'zh-tw',
        submitted: false,
        error: '請填寫必填項目'
      });
    }

    // Validate satisfaction is 1-5
    const satNum = parseInt(satisfaction, 10);
    if (isNaN(satNum) || satNum < 1 || satNum > 5) {
      return res.status(400).render('survey', {
        domain: DOMAIN,
        locale: 'zh-tw',
        submitted: false,
        error: '滿意度必須為 1-5 之間的值'
      });
    }

    // Get client IP and hash it
    const clientIp = normalizeIp(req.ip || req.connection.remoteAddress);
    const ipHash = hashIp(clientIp);

    // Save to database
    repository.saveSurveyResponse({
      satisfaction,
      usefulFeature,
      improvement: improvement || null,
      additionalFeedback: additionalFeedback || null,
      ipHash
    });

    res.render('survey', {
      domain: DOMAIN,
      locale: 'zh-tw',
      submitted: true
    });
  } catch (error) {
    console.error('Error saving survey response:', error);
    res.status(500).render('survey', {
      domain: DOMAIN,
      locale: 'zh-tw',
      submitted: false,
      error: '保存回應失敗，請重試'
    });
  }
});

// ==================== 타겟 사이트 전용 페이지 ====================

const targetSites = require('./lib/target-sites');

// 타겟 사이트 페이지 라우팅 (한국어)
app.get('/ko/sites/:siteId', (req, res) => {
  const site = targetSites.getSiteById(req.params.siteId);

  if (!site) {
    return res.status(404).send('Site not found');
  }

  const siteContent = res.locals.translations.sites?.[site.id] || null;

  res.render('site-page', {
    domain: DOMAIN,
    site,
    siteContent
  });
});

// 타겟 사이트 페이지 라우팅 (영어)
app.get('/en/sites/:siteId', (req, res) => {
  const site = targetSites.getSiteById(req.params.siteId);

  if (!site) {
    return res.status(404).send('Site not found');
  }

  const siteContent = res.locals.translations.sites?.[site.id] || null;

  res.render('site-page', {
    domain: DOMAIN,
    site,
    siteContent
  });
});

// ==================== About & Contact 페이지 ====================

// About 페이지 (4개 언어)
app.get('/ko/about', (req, res) => {
  res.render('about', { domain: DOMAIN, locale: 'ko' });
});

app.get('/en/about', (req, res) => {
  res.render('about', { domain: DOMAIN, locale: 'en' });
});

app.get('/jp/about', (req, res) => {
  res.render('about', { domain: DOMAIN, locale: 'jp' });
});

app.get('/zh-tw/about', (req, res) => {
  res.render('about', { domain: DOMAIN, locale: 'zh-tw' });
});

// Contact 페이지 (4개 언어)
app.get('/ko/contact', (req, res) => {
  res.render('contact', { domain: DOMAIN, locale: 'ko' });
});

app.get('/en/contact', (req, res) => {
  res.render('contact', { domain: DOMAIN, locale: 'en' });
});

app.get('/jp/contact', (req, res) => {
  res.render('contact', { domain: DOMAIN, locale: 'jp' });
});

app.get('/zh-tw/contact', (req, res) => {
  res.render('contact', { domain: DOMAIN, locale: 'zh-tw' });
});

// 기존 경로 호환성 유지 (리다이렉트)
app.get('/guide', (req, res) => {
  const locale = i18n.detectLocale(req);
  res.redirect(`/${locale}/guide`);
});

app.get('/privacy', (req, res) => {
  const locale = i18n.detectLocale(req);
  res.redirect(`/${locale}/privacy`);
});

app.get('/about', (req, res) => {
  const locale = i18n.detectLocale(req);
  res.redirect(`/${locale}/about`);
});

app.get('/contact', (req, res) => {
  const locale = i18n.detectLocale(req);
  res.redirect(`/${locale}/contact`);
});

app.get('/terms', (req, res) => {
  const locale = i18n.detectLocale(req);
  res.redirect(`/${locale}/terms`);
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

// Analytics API with token verification
app.get('/api/analytics/:endpoint', verifyAdminToken, (req, res, next) => {
  // 토큰 검증 후 API 라우터로 전달
  req.url = `/analytics/${req.params.endpoint}${req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : ''}`;
  apiRouter(req, res, next);
});

// 404 핸들러 - 사용자 친화적인 페이지 제공
app.use((req, res) => {
  const locale = i18n.detectLocale(req);
  res.status(404).render('404', {
    domain: DOMAIN,
    locale: locale
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
  // 데이터베이스 초기화 (테이블 및 인덱스 자동 생성)
  try {
    initDb();
  } catch (err) {
    console.error('Failed to initialize database on startup:', err);
  }

  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

module.exports = app;
