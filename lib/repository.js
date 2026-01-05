/**
 * 데이터 접근 계층 (Repository Pattern)
 * Drizzle ORM + better-sqlite3 (동기식)
 */

const { eq, sql, desc, and, isNotNull } = require('drizzle-orm');
const { getDb } = require('../db');
const { users, sessions, events } = require('../db/schema');

// ==================== Users ====================

// 사용자 생성/업데이트 (UPSERT)
function upsertUser({ userId, ipHash, userAgent, region, deviceType }) {
  const db = getDb();
  const nowIso = new Date().toISOString();

  db.run(sql`
    INSERT INTO users (user_id, ip_hash, user_agent, region, device_type, first_visit_at, last_visit_at, visit_count)
    VALUES (${userId}, ${ipHash}, ${userAgent}, ${region}, ${deviceType}, ${nowIso}, ${nowIso}, 1)
    ON CONFLICT(user_id) DO UPDATE SET
      ip_hash = excluded.ip_hash,
      user_agent = excluded.user_agent,
      region = excluded.region,
      device_type = excluded.device_type,
      last_visit_at = excluded.last_visit_at,
      visit_count = users.visit_count + 1
  `);
}

// ==================== Sessions ====================

// 세션 생성/업데이트
function ensureSession({ sessionId, userId }) {
  const db = getDb();
  const nowIso = new Date().toISOString();

  db.run(sql`
    INSERT INTO sessions (session_id, user_id, start_at)
    VALUES (${sessionId}, ${userId}, ${nowIso})
    ON CONFLICT(session_id) DO UPDATE SET
      user_id = excluded.user_id,
      end_at = NULL
  `);
}

// ==================== Events ====================

// 이벤트 로깅
function logEvent({ sessionId, eventType, targetUrl, latencyMs }) {
  const db = getDb();
  const nowIso = new Date().toISOString();

  db.insert(events).values({
    sessionId,
    eventType,
    targetUrl: targetUrl || null,
    latencyMs: typeof latencyMs === 'number' ? latencyMs : null,
    timestamp: nowIso
  }).run();
}

// ==================== Analytics ====================

// 사용자 통계
function getAnalyticsUsers() {
  const db = getDb();

  const result = db.get(sql`
    SELECT
      COUNT(*) as total_users,
      COUNT(DISTINCT region) as regions,
      SUM(visit_count) as total_visits,
      AVG(visit_count) as avg_visits_per_user,
      MAX(visit_count) as max_visits
    FROM users
  `);

  return result || {};
}

// 이벤트 통계
function getAnalyticsEvents(options = {}) {
  const db = getDb();
  const { eventType, limit = 100, offset = 0 } = options;

  let query = sql`
    SELECT
      event_type,
      COUNT(*) as count,
      AVG(CASE WHEN latency_ms IS NOT NULL THEN latency_ms END) as avg_latency_ms,
      MIN(CASE WHEN latency_ms IS NOT NULL THEN latency_ms END) as min_latency_ms,
      MAX(CASE WHEN latency_ms IS NOT NULL THEN latency_ms END) as max_latency_ms,
      COUNT(DISTINCT session_id) as unique_sessions
    FROM events
  `;

  if (eventType) {
    query = sql`${query} WHERE event_type = ${eventType}`;
  }

  query = sql`${query} GROUP BY event_type ORDER BY count DESC LIMIT ${limit} OFFSET ${offset}`;

  return db.all(query);
}

// 기기별 분석
function getAnalyticsDevices() {
  const db = getDb();

  return db.all(sql`
    SELECT
      u.device_type,
      COUNT(u.user_id) as total_users,
      COUNT(DISTINCT s.session_id) as sessions,
      AVG(u.visit_count) as avg_visits,
      COUNT(e.event_id) as total_events
    FROM users u
    LEFT JOIN sessions s ON u.user_id = s.user_id
    LEFT JOIN events e ON s.session_id = e.session_id
    WHERE u.device_type IS NOT NULL
    GROUP BY u.device_type
    ORDER BY total_users DESC
  `);
}

// URL별 성능
function getAnalyticsUrls(options = {}) {
  const db = getDb();
  const { limit = 50, offset = 0 } = options;

  return db.all(sql`
    SELECT
      target_url,
      COUNT(*) as requests,
      AVG(latency_ms) as avg_latency_ms,
      MIN(latency_ms) as min_latency_ms,
      MAX(latency_ms) as max_latency_ms,
      COUNT(DISTINCT session_id) as unique_sessions
    FROM events
    WHERE target_url IS NOT NULL
    GROUP BY target_url
    ORDER BY COUNT(*) DESC
    LIMIT ${limit} OFFSET ${offset}
  `);
}

// 이벤트 타입별 통계
function getAnalyticsEventsByType(eventType) {
  const db = getDb();

  const result = db.get(sql`
    SELECT COUNT(*) as count FROM events WHERE event_type = ${eventType}
  `);

  return result || { count: 0 };
}

// 전체 성능 통계
function getAnalyticsPerformance() {
  const db = getDb();

  return db.get(sql`
    SELECT
      COUNT(*) as total_events,
      AVG(latency_ms) as avg_latency_ms,
      MIN(latency_ms) as min_latency_ms,
      MAX(latency_ms) as max_latency_ms,
      COUNT(CASE WHEN latency_ms > 1000 THEN 1 END) as slow_events,
      COUNT(DISTINCT session_id) as unique_sessions
    FROM events
    WHERE latency_ms IS NOT NULL
  `);
}

module.exports = {
  upsertUser,
  ensureSession,
  logEvent,
  getAnalyticsUsers,
  getAnalyticsEvents,
  getAnalyticsDevices,
  getAnalyticsUrls,
  getAnalyticsEventsByType,
  getAnalyticsPerformance
};
