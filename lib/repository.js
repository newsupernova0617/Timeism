const { openDb } = require('../db');

async function withDb(fn) {
  const db = await openDb();
  try {
    return await fn(db);
  } finally {
    await db.close();
  }
}

async function upsertUser({
  userId,
  ipHash,
  userAgent,
  region,
  deviceType
}) {
  const nowIso = new Date().toISOString();

  await withDb(async (db) => {
    await db.run(
      `
        INSERT INTO users (user_id, ip_hash, user_agent, region, device_type, first_visit_at, last_visit_at, visit_count)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1)
        ON CONFLICT(user_id) DO UPDATE SET
          ip_hash = excluded.ip_hash,
          user_agent = excluded.user_agent,
          region = excluded.region,
          device_type = excluded.device_type,
          last_visit_at = excluded.last_visit_at,
          visit_count = users.visit_count + 1
      `,
      [
        userId,
        ipHash,
        userAgent || null,
        region || null,
        deviceType || null,
        nowIso,
        nowIso
      ]
    );
  });
}

async function ensureSession({ sessionId, userId }) {
  const nowIso = new Date().toISOString();

  await withDb(async (db) => {
    await db.run(
      `
        INSERT INTO sessions (session_id, user_id, start_at)
        VALUES (?, ?, ?)
        ON CONFLICT(session_id) DO UPDATE SET
          user_id = excluded.user_id,
          end_at = NULL
      `,
      [sessionId, userId, nowIso]
    );
  });
}

async function logEvent({
  sessionId,
  eventType,
  targetUrl,
  latencyMs
}) {
  await withDb(async (db) => {
    await db.run(
      `
        INSERT INTO events (session_id, event_type, target_url, latency_ms, timestamp)
        VALUES (?, ?, ?, ?, datetime('now'))
      `,
      [
        sessionId,
        eventType,
        targetUrl || null,
        typeof latencyMs === 'number' ? latencyMs : null
      ]
    );
  });
}

async function getAnalyticsUsers() {
  return withDb(async (db) => {
    const row = await db.get(
      `
        SELECT
          COUNT(*) as total_users,
          COUNT(DISTINCT region) as regions,
          SUM(visit_count) as total_visits,
          AVG(visit_count) as avg_visits_per_user,
          MAX(visit_count) as max_visits
        FROM users
      `
    );
    return row || {};
  });
}

async function getAnalyticsEvents(options = {}) {
  const { eventType, limit = 100, offset = 0 } = options;

  return withDb(async (db) => {
    let query = `
      SELECT
        event_type,
        COUNT(*) as count,
        AVG(CASE WHEN latency_ms IS NOT NULL THEN latency_ms END) as avg_latency_ms,
        MIN(CASE WHEN latency_ms IS NOT NULL THEN latency_ms END) as min_latency_ms,
        MAX(CASE WHEN latency_ms IS NOT NULL THEN latency_ms END) as max_latency_ms,
        COUNT(DISTINCT session_id) as unique_sessions
      FROM events
    `;
    const params = [];

    if (eventType) {
      query += ` WHERE event_type = ?`;
      params.push(eventType);
    }

    query += ` GROUP BY event_type ORDER BY count DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    return await db.all(query, params);
  });
}

async function getAnalyticsDevices() {
  return withDb(async (db) => {
    return await db.all(
      `
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
      `
    );
  });
}

async function getAnalyticsUrls(options = {}) {
  const { limit = 50, offset = 0 } = options;

  return withDb(async (db) => {
    return await db.all(
      `
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
        LIMIT ? OFFSET ?
      `,
      [limit, offset]
    );
  });
}

async function getAnalyticsEventsByType(eventType) {
  return withDb(async (db) => {
    const count = await db.get(
      `
        SELECT COUNT(*) as count FROM events WHERE event_type = ?
      `,
      [eventType]
    );
    return count || { count: 0 };
  });
}

async function getAnalyticsPerformance() {
  return withDb(async (db) => {
    return await db.get(
      `
        SELECT
          COUNT(*) as total_events,
          AVG(latency_ms) as avg_latency_ms,
          MIN(latency_ms) as min_latency_ms,
          MAX(latency_ms) as max_latency_ms,
          COUNT(CASE WHEN latency_ms > 1000 THEN 1 END) as slow_events,
          COUNT(DISTINCT session_id) as unique_sessions
        FROM events
        WHERE latency_ms IS NOT NULL
      `
    );
  });
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
