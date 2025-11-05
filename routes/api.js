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

const router = express.Router();

router.post('/check-time', async (req, res) => {
  const targetUrl = req.body?.target_url;
  if (typeof targetUrl !== 'string' || targetUrl.trim().length === 0) {
    return res.status(400).json({
      error: 'INVALID_URL',
      message: 'target_url is required.'
    });
  }

  try {
    const result = await measureServerTime(targetUrl);
    const responsePayload = {
      target_url: targetUrl,
      server_time_utc: result.serverTimeUtcIso,
      server_time_estimated_epoch_ms: result.serverTimeEstimatedEpochMs
    };

    if (req.query.debug === '1') {
      responsePayload.rtt_ms = result.rttMs;
    }

    return res.json(responsePayload);
  } catch (err) {
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

    console.error('Unexpected error in /api/check-time:', err);
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Unexpected server error.'
    });
  }
});

router.post('/log-event', async (req, res) => {
  const { session_id: sessionId, event_type: eventType, target_url: targetUrl, latency_ms: latencyMs } = req.body || {};

  if (typeof sessionId !== 'string' || sessionId.trim().length === 0) {
    return res.status(400).json({ error: 'INVALID_PARAM', message: 'session_id is required.' });
  }
  if (typeof eventType !== 'string' || eventType.trim().length === 0) {
    return res.status(400).json({ error: 'INVALID_PARAM', message: 'event_type is required.' });
  }

  const sanitizedUrl =
    typeof targetUrl === 'string' && targetUrl.length > 0 ? targetUrl.slice(0, 2048) : null;

  let latencyValue = null;
  if (typeof latencyMs === 'number' && Number.isFinite(latencyMs)) {
    latencyValue = Math.round(latencyMs);
  }

  try {
    await logEvent({
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

router.post('/session-init', async (req, res) => {
  const {
    user_id: providedUserId,
    session_id: providedSessionId,
    user_agent: userAgent,
    region,
    device_type: deviceType
  } = req.body || {};

  const userId = typeof providedUserId === 'string' && providedUserId.trim().length > 0
    ? providedUserId.trim()
    : `user_${nanoid(12)}`;
  const sessionId = typeof providedSessionId === 'string' && providedSessionId.trim().length > 0
    ? providedSessionId.trim()
    : `sess_${nanoid(12)}`;

  const clientIp = normalizeIp(req.ip);
  const ipHash = hashIp(clientIp);

  try {
    await upsertUser({
      userId,
      ipHash,
      userAgent,
      region,
      deviceType
    });
    await ensureSession({
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

/**
 * GET /analytics/users
 * 사용자 통계 조회
 */
router.get('/analytics/users', async (req, res) => {
  try {
    const stats = await getAnalyticsUsers();
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

/**
 * GET /analytics/events
 * 이벤트 통계 조회
 * 쿼리 파라미터:
 *   - event_type: 특정 이벤트 타입만 조회
 *   - limit: 결과 개수 (기본값 100)
 *   - offset: 오프셋 (기본값 0)
 */
router.get('/analytics/events', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 100, 1000);
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);
    const eventType = req.query.event_type || null;

    const stats = await getAnalyticsEvents({ eventType, limit, offset });

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

/**
 * GET /analytics/devices
 * 기기별 분석
 */
router.get('/analytics/devices', async (req, res) => {
  try {
    const stats = await getAnalyticsDevices();

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

/**
 * GET /analytics/urls
 * URL별 성능 분석
 * 쿼리 파라미터:
 *   - limit: 결과 개수 (기본값 50)
 *   - offset: 오프셋 (기본값 0)
 */
router.get('/analytics/urls', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 500);
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);

    const stats = await getAnalyticsUrls({ limit, offset });

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

/**
 * GET /analytics/performance
 * 전체 성능 통계
 */
router.get('/analytics/performance', async (req, res) => {
  try {
    const stats = await getAnalyticsPerformance();

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

/**
 * GET /analytics/summary
 * 전체 분석 요약 (모든 통계 한번에)
 */
router.get('/analytics/summary', async (req, res) => {
  try {
    const [users, events, devices, performance] = await Promise.all([
      getAnalyticsUsers(),
      getAnalyticsEvents({ limit: 10 }),
      getAnalyticsDevices(),
      getAnalyticsPerformance()
    ]);

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

module.exports = router;
