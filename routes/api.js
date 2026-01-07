/**
 * API 라우터
 * - 시간 조회, 세션 관리, 이벤트 로깅, 분석 데이터 제공
 */

const express = require('express');
const { nanoid } = require('nanoid');

const { measureServerTime } = require('../lib/timeFetch');
const { UrlSafetyError } = require('../lib/ssrf');
const {
  upsertUser,
  ensureSession,
  logEvent,
  getAnalyticsUsers,
  getAnalyticsEvents,
  getAnalyticsDevices,
  getAnalyticsUrls,
  getAnalyticsEventsByType,
  getAnalyticsPerformance
} = require('../lib/repository');
const { normalizeIp, hashIp } = require('../lib/identity');
const { apiLimiter, trendingLimiter } = require('../middleware/rate-limiter');

const router = express.Router();

// ==================== POST /api/check-time ====================
// 대상 URL의 서버 시간 조회 (RTT 보정) - Rate Limited: 10 requests/분
router.post('/check-time', apiLimiter, async (req, res) => {
  const targetUrl = req.body?.target_url;

  // URL 유효성 검사
  if (typeof targetUrl !== 'string' || targetUrl.trim().length === 0) {
    return res.status(400).json({
      error: 'INVALID_URL',
      message: 'target_url is required.'
    });
  }

  try {
    // 서버 시간 측정
    const result = await measureServerTime(targetUrl);

    // SyncTime 서버의 정확한 밀리초 타임스탬프 (HTTP Date 헤더 정밀도 한계 보완)
    const SyncTimeServerTimeMs = Date.now();

    const responsePayload = {
      target_url: targetUrl,
      server_time_utc: result.serverTimeUtcIso,
      server_time_estimated_epoch_ms: result.serverTimeEstimatedEpochMs,
      SyncTime_server_time_ms: SyncTimeServerTimeMs  // 새로 추가: SyncTime 서버 기준 시각
    };

    // 디버그 모드: RTT 포함
    if (req.query.debug === '1') {
      responsePayload.rtt_ms = result.rttMs;
    }

    // 캐싱 방지 (시간 데이터는 절대 캐시되면 안 됨!)
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    return res.json(responsePayload);
  } catch (err) {
    // SSRF 에러 처리
    if (err instanceof UrlSafetyError) {
      const statusMap = {
        INVALID_URL: 400,
        BLOCKED_HOST: 400,
        BLOCKED_IP: 400,
        DNS_LOOKUP_FAILED: 502,
        TIMEOUT: 504,
        TIME_UNAVAILABLE: 502
      };
      return res.status(statusMap[err.code] || 400).json({
        error: err.code,
        message: err.message
      });
    }

    // 기타 에러
    console.error('Unexpected error in /api/check-time:', err);
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Unexpected server error.'
    });
  }
});

// ==================== POST /api/log-event ====================
// 이벤트 로깅 (버튼 클릭, 페이지 뷰 등)
router.post('/log-event', async (req, res) => {
  const { session_id: sessionId, event_type: eventType, target_url: targetUrl, latency_ms: latencyMs } = req.body || {};

  // 필수 파라미터 검증
  if (typeof sessionId !== 'string' || sessionId.trim().length === 0) {
    return res.status(400).json({ error: 'INVALID_PARAM', message: 'session_id is required.' });
  }
  if (typeof eventType !== 'string' || eventType.trim().length === 0) {
    return res.status(400).json({ error: 'INVALID_PARAM', message: 'event_type is required.' });
  }

  // URL 길이 제한 (최대 2048자)
  const sanitizedUrl = typeof targetUrl === 'string' && targetUrl.length > 0 ? targetUrl.slice(0, 2048) : null;

  // 지연 시간 정수 변환
  let latencyValue = null;
  if (typeof latencyMs === 'number' && Number.isFinite(latencyMs)) {
    latencyValue = Math.round(latencyMs);
  }

  try {
    logEvent({
      sessionId: sessionId.trim(),
      eventType: eventType.trim(),
      targetUrl: sanitizedUrl,
      latencyMs: latencyValue
    });
    return res.json({ ok: true });
  } catch (err) {
    console.error('Failed to log event:', err);
    return res.status(500).json({ error: 'DB_ERROR', message: 'Failed to store event.' });
  }
});

// ==================== POST /api/session-init ====================
// 세션 초기화 (최초 방문 시)
router.post('/session-init', async (req, res) => {
  const {
    user_id: providedUserId,
    session_id: providedSessionId,
    user_agent: userAgent,
    region,
    device_type: deviceType
  } = req.body || {};

  // ID 생성 (미제공 시 nanoid 사용)
  const userId = typeof providedUserId === 'string' && providedUserId.trim().length > 0
    ? providedUserId.trim()
    : `user_${nanoid(12)}`;
  const sessionId = typeof providedSessionId === 'string' && providedSessionId.trim().length > 0
    ? providedSessionId.trim()
    : `sess_${nanoid(12)}`;

  // IP 해싱 (개인정보 보호)
  const clientIp = normalizeIp(req.ip);
  const ipHash = hashIp(clientIp);

  try {
    // 사용자 생성/업데이트
    upsertUser({
      userId,
      ipHash,
      userAgent,
      region,
      deviceType
    });

    // 세션 생성/업데이트
    ensureSession({
      sessionId,
      userId
    });

    return res.json({
      user_id: userId,
      session_id: sessionId,
      started_at: new Date().toISOString()
    });
  } catch (err) {
    console.error('Failed to initialize session:', err);
    return res.status(500).json({
      error: 'DB_ERROR',
      message: 'Failed to initialize session.'
    });
  }
});

// ==================== Analytics API ====================

// GET /api/analytics/users - 사용자 통계
router.get('/analytics/users', (req, res) => {
  try {
    const stats = getAnalyticsUsers();
    return res.json({
      total_users: stats.total_users || 0,
      regions: stats.regions || 0,
      total_visits: stats.total_visits || 0,
      avg_visits_per_user: stats.avg_visits_per_user ? Math.round(stats.avg_visits_per_user * 100) / 100 : 0,
      max_visits: stats.max_visits || 0
    });
  } catch (err) {
    console.error('Failed to get user analytics:', err);
    return res.status(500).json({ error: 'DB_ERROR', message: 'Failed to retrieve analytics.' });
  }
});

// GET /api/analytics/events - 이벤트 통계
router.get('/analytics/events', (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 100, 1000);
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);
    const eventType = req.query.event_type || null;

    const stats = getAnalyticsEvents({ eventType, limit, offset });

    // 숫자 정규화
    const normalized = stats.map((s) => ({
      event_type: s.event_type,
      count: s.count,
      avg_latency_ms: s.avg_latency_ms ? Math.round(s.avg_latency_ms * 10) / 10 : null,
      min_latency_ms: s.min_latency_ms || null,
      max_latency_ms: s.max_latency_ms || null,
      unique_sessions: s.unique_sessions || 0
    }));

    return res.json(normalized);
  } catch (err) {
    console.error('Failed to get event analytics:', err);
    return res.status(500).json({ error: 'DB_ERROR', message: 'Failed to retrieve analytics.' });
  }
});

// GET /api/analytics/devices - 기기별 분석
router.get('/analytics/devices', (req, res) => {
  try {
    const stats = getAnalyticsDevices();

    const normalized = stats.map((s) => ({
      device_type: s.device_type,
      total_users: s.total_users || 0,
      sessions: s.sessions || 0,
      avg_visits: s.avg_visits ? Math.round(s.avg_visits * 100) / 100 : 0,
      total_events: s.total_events || 0
    }));

    return res.json(normalized);
  } catch (err) {
    console.error('Failed to get device analytics:', err);
    return res.status(500).json({ error: 'DB_ERROR', message: 'Failed to retrieve analytics.' });
  }
});

// GET /api/analytics/urls - URL별 성능
router.get('/analytics/urls', (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 500);
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);

    const stats = getAnalyticsUrls({ limit, offset });

    const normalized = stats.map((s) => ({
      target_url: s.target_url,
      requests: s.requests || 0,
      avg_latency_ms: s.avg_latency_ms ? Math.round(s.avg_latency_ms * 10) / 10 : null,
      min_latency_ms: s.min_latency_ms || null,
      max_latency_ms: s.max_latency_ms || null,
      unique_sessions: s.unique_sessions || 0
    }));

    return res.json(normalized);
  } catch (err) {
    console.error('Failed to get URL analytics:', err);
    return res.status(500).json({ error: 'DB_ERROR', message: 'Failed to retrieve analytics.' });
  }
});

// GET /api/analytics/performance - 전체 성능
router.get('/analytics/performance', (req, res) => {
  try {
    const stats = getAnalyticsPerformance();

    return res.json({
      total_events: stats.total_events || 0,
      avg_latency_ms: stats.avg_latency_ms ? Math.round(stats.avg_latency_ms * 10) / 10 : null,
      min_latency_ms: stats.min_latency_ms || null,
      max_latency_ms: stats.max_latency_ms || null,
      slow_events: stats.slow_events || 0,
      unique_sessions: stats.unique_sessions || 0
    });
  } catch (err) {
    console.error('Failed to get performance analytics:', err);
    return res.status(500).json({ error: 'DB_ERROR', message: 'Failed to retrieve analytics.' });
  }
});

// GET /api/analytics/summary - 전체 요약
router.get('/analytics/summary', (req, res) => {
  try {
    const users = getAnalyticsUsers();
    const events = getAnalyticsEvents({ limit: 10 });
    const devices = getAnalyticsDevices();
    const performance = getAnalyticsPerformance();

    return res.json({
      users: {
        total: users.total_users || 0,
        regions: users.regions || 0,
        total_visits: users.total_visits || 0,
        avg_visits_per_user: users.avg_visits_per_user ? Math.round(users.avg_visits_per_user * 100) / 100 : 0
      },
      events: events.map((e) => ({
        type: e.event_type,
        count: e.count,
        avg_latency_ms: e.avg_latency_ms ? Math.round(e.avg_latency_ms * 10) / 10 : null
      })),
      devices: devices.map((d) => ({
        type: d.device_type,
        users: d.total_users,
        sessions: d.sessions
      })),
      performance: {
        total_events: performance.total_events || 0,
        avg_latency_ms: performance.avg_latency_ms ? Math.round(performance.avg_latency_ms * 10) / 10 : null,
        slow_events: performance.slow_events || 0
      }
    });
  } catch (err) {
    console.error('Failed to get analytics summary:', err);
    return res.status(500).json({ error: 'DB_ERROR', message: 'Failed to retrieve analytics.' });
  }
});

// ==================== GET /api/trending-urls ====================
// 언어권별 실시간 트렌드 URL (최근 1시간)
router.get('/trending-urls', trendingLimiter, (req, res) => {
  try {
    const locale = req.query.locale || 'en';
    const limit = Math.min(parseInt(req.query.limit) || 5, 10);

    const db = require('../db').getSqlite();

    // 최근 1시간 동안의 트렌드 URL 조회
    const trending = db.prepare(`
      SELECT 
        target_url,
        COUNT(*) as check_count,
        MAX(timestamp) as last_checked
      FROM events
      WHERE locale = ?
        AND target_url IS NOT NULL
        AND target_url != ''
        AND timestamp > datetime('now', '-1 hour')
        AND event_type = 'url_check'
      GROUP BY target_url
      ORDER BY check_count DESC, last_checked DESC
      LIMIT ?
    `).all(locale, limit);

    // URL에서 도메인 이름 추출
    const trendingWithNames = trending.map(item => {
      let displayName = item.target_url;
      try {
        const url = new URL(item.target_url);
        displayName = url.hostname.replace('www.', '');
      } catch (e) {
        // URL 파싱 실패 시 그대로 사용
      }

      return {
        url: item.target_url,
        name: displayName,
        count: item.check_count,
        lastChecked: item.last_checked
      };
    });

    return res.json({
      locale,
      trending: trendingWithNames,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Failed to get trending URLs:', err);
    return res.status(500).json({ error: 'DB_ERROR', message: 'Failed to retrieve trending URLs.' });
  }
});

module.exports = router;
