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
const commentsRouter = require('./routes/comments');
const i18n = require('./lib/i18n');
const repository = require('./lib/repository');
const { apiLimiter, trendingLimiter, strictLimiter } = require('./middleware/rate-limiter');

// 환경 변수
const PORT = process.env.PORT || 3000;
const DOMAIN = process.env.DOMAIN || 'https://timeism.keero.site';

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

// 5. i18n: 다국어 지원
app.use((req, res, next) => {
  const locale = i18n.detectLocale(req);
  res.locals.locale = locale;
  res.locals.t = (key) => i18n.t(locale, key);
  res.locals.translations = i18n.getTranslations(locale);
  res.locals.domain = DOMAIN;
  res.locals.hreflangLinks = i18n.getHreflangLinks(DOMAIN, req.path);
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

// API 라우터 연결
app.use('/api', apiRouter);
app.use('/api', commentsRouter);

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

  // 기본 페이지들
  let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url>
    <loc>${DOMAIN}/</loc>
    <xhtml:link rel="alternate" hreflang="en" href="${DOMAIN}/en/" />
    <xhtml:link rel="alternate" hreflang="ko" href="${DOMAIN}/ko/" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${DOMAIN}/" />
    <lastmod>${lastmod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${DOMAIN}/en/</loc>
    <xhtml:link rel="alternate" hreflang="ko" href="${DOMAIN}/ko/" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${DOMAIN}/" />
    <lastmod>${lastmod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${DOMAIN}/ko/</loc>
    <xhtml:link rel="alternate" hreflang="en" href="${DOMAIN}/en/" />
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
    <xhtml:link rel="alternate" hreflang="x-default" href="${DOMAIN}/en/game" />
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${DOMAIN}/ko/game</loc>
    <xhtml:link rel="alternate" hreflang="en" href="${DOMAIN}/en/game" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${DOMAIN}/en/game" />
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
`;

  // 타겟 사이트 페이지들 추가
  allSites.forEach(site => {
    sitemap += `  <url>
    <loc>${DOMAIN}/en/sites/${site.id}</loc>
    <xhtml:link rel="alternate" hreflang="ko" href="${DOMAIN}/ko/sites/${site.id}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${DOMAIN}/en/sites/${site.id}" />
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${DOMAIN}/ko/sites/${site.id}</loc>
    <xhtml:link rel="alternate" hreflang="en" href="${DOMAIN}/en/sites/${site.id}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${DOMAIN}/en/sites/${site.id}" />
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`;
  });

  // 블로그 포스트 추가
  const blogData = require('./lib/blog-data');
  blogData.posts.forEach(post => {
    sitemap += `  <url>
    <loc>${DOMAIN}/en/blog/${post.slug}</loc>
    <xhtml:link rel="alternate" hreflang="ko" href="${DOMAIN}/ko/blog/${post.slug}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${DOMAIN}/en/blog/${post.slug}" />
    <lastmod>${post.date}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${DOMAIN}/ko/blog/${post.slug}</loc>
    <xhtml:link rel="alternate" hreflang="en" href="${DOMAIN}/en/blog/${post.slug}" />
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

app.get('/ja/', (req, res) => {
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

app.get('/ja/guide', (req, res) => {
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

app.get('/ja/privacy', (req, res) => {
  res.render('privacy', { domain: DOMAIN });
});

app.get('/zh-tw/privacy', (req, res) => {
  res.render('privacy', { domain: DOMAIN });
});

// 언어별 게임 페이지
app.get('/en/game', (req, res) => {
  res.render('game', { domain: DOMAIN });
});

app.get('/ko/game', (req, res) => {
  res.render('game', { domain: DOMAIN });
});

app.get('/ja/game', (req, res) => {
  res.render('game', { domain: DOMAIN });
});

app.get('/zh-tw/game', (req, res) => {
  res.render('game', { domain: DOMAIN });
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

app.get('/ja/trends', async (req, res) => {
  try {
    const stats = await getTrendsStats();
    res.render('trends', {
      domain: DOMAIN,
      locale: 'ja',
      ...stats
    });
  } catch (error) {
    console.error('Trends page error:', error);
    res.render('trends', {
      domain: DOMAIN,
      locale: 'ja',
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
  // TODO: Save survey response to DB
  res.render('survey', {
    domain: DOMAIN,
    locale: 'en',
    submitted: true
  });
});

app.get('/ko/survey', (req, res) => {
  res.render('survey', {
    domain: DOMAIN,
    locale: 'ko',
    submitted: false
  });
});

app.post('/ko/survey', async (req, res) => {
  // TODO: Save survey response to DB
  res.render('survey', {
    domain: DOMAIN,
    locale: 'ko',
    submitted: true
  });
});

app.get('/ja/survey', (req, res) => {
  res.render('survey', {
    domain: DOMAIN,
    locale: 'ja',
    submitted: false
  });
});

app.post('/ja/survey', async (req, res) => {
  // TODO: Save survey response to DB
  res.render('survey', {
    domain: DOMAIN,
    locale: 'ja',
    submitted: true
  });
});

app.get('/zh-tw/survey', (req, res) => {
  res.render('survey', {
    domain: DOMAIN,
    locale: 'zh-tw',
    submitted: false
  });
});

app.post('/zh-tw/survey', async (req, res) => {
  // TODO: Save survey response to DB
  res.render('survey', {
    domain: DOMAIN,
    locale: 'zh-tw',
    submitted: true
  });
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

// 기존 경로 호환성 유지 (리다이렉트)
app.get('/guide', (req, res) => {
  const locale = i18n.detectLocale(req);
  res.redirect(`/${locale}/guide`);
});

app.get('/privacy', (req, res) => {
  const locale = i18n.detectLocale(req);
  res.redirect(`/${locale}/privacy`);
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
