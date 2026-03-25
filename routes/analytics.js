/**
 * Analytics Router
 *
 * Provides aggregated statistics about users, events, devices, and performance.
 * All endpoints are protected by the verifyAdminToken middleware.
 */

const express = require('express');
const router = express.Router();
const { getDb } = require('../db/index');
const { users, sessions, events } = require('../db/schema');
const { count, sql } = require('drizzle-orm');

/**
 * GET /api/analytics/summary
 *
 * Returns comprehensive analytics summary including:
 * - User statistics (total, regions, visits)
 * - Event type distribution
 * - Device type distribution
 * - Performance metrics (latency statistics)
 */
router.get('/summary', async (req, res) => {
  try {
    const db = getDb();

    // ==================== User Statistics ====================

    // Total users
    const userCountResult = await db
      .select({ value: count() })
      .from(users);
    const totalUsers = userCountResult[0]?.value || 0;

    // Total regions
    const regionCountResult = await db
      .select({ value: count(sql`DISTINCT ${users.region}`) })
      .from(users);
    const totalRegions = regionCountResult[0]?.value || 0;

    // Total visits (sum of visit_count)
    const totalVisitsResult = await db
      .select({ value: sql`SUM(${users.visitCount})` })
      .from(users);
    const totalVisits = totalVisitsResult[0]?.value || 0;

    // Average visits per user
    const avgVisitsPerUser = totalUsers > 0 ? (totalVisits / totalUsers).toFixed(2) : 0;

    // ==================== Event Statistics ====================

    // Events grouped by type
    const eventsByType = await db
      .select({
        type: events.eventType,
        count: count()
      })
      .from(events)
      .groupBy(events.eventType)
      .orderBy(sql`COUNT(*) DESC`);

    // ==================== Device Statistics ====================

    // Devices grouped by type
    const devicesByType = await db
      .select({
        type: users.deviceType,
        count: count()
      })
      .from(users)
      .groupBy(users.deviceType)
      .orderBy(sql`COUNT(*) DESC`);

    // ==================== Performance Statistics ====================

    // Latency statistics
    const performanceResult = await db
      .select({
        minLatency: sql`MIN(${events.latencyMs})`,
        maxLatency: sql`MAX(${events.latencyMs})`,
        avgLatency: sql`AVG(${events.latencyMs})`,
        sessionCount: count(sql`DISTINCT ${events.sessionId}`)
      })
      .from(events);

    const performance = performanceResult[0] || {
      minLatency: null,
      maxLatency: null,
      avgLatency: null,
      sessionCount: 0
    };

    // Convert latency values to numbers and round
    const minLatency = performance.minLatency !== null ? parseInt(performance.minLatency) : 0;
    const maxLatency = performance.maxLatency !== null ? parseInt(performance.maxLatency) : 0;
    const avgLatency = performance.avgLatency !== null ? parseFloat(performance.avgLatency).toFixed(2) : 0;
    const sessionCount = performance.sessionCount || 0;

    // ==================== Response ====================

    res.json({
      users: {
        total: totalUsers,
        regions: totalRegions,
        total_visits: totalVisits,
        avg_visits_per_user: parseFloat(avgVisitsPerUser)
      },
      events: eventsByType.map(e => ({
        type: e.type,
        count: e.count
      })),
      devices: devicesByType.map(d => ({
        type: d.type,
        count: d.count
      })),
      performance: {
        min_latency_ms: minLatency,
        max_latency_ms: maxLatency,
        avg_latency_ms: parseFloat(avgLatency),
        session_count: sessionCount
      }
    });
  } catch (error) {
    console.error('Analytics summary error:', error);
    res.status(500).json({
      error: 'ANALYTICS_ERROR',
      message: error.message
    });
  }
});

/**
 * GET /api/analytics/urls
 * Returns top URLs by request count with latency stats
 * Query: ?limit=10 (default: 10)
 * Protected by verifyAdminToken middleware
 */
router.get('/urls', async (req, res) => {
  try {
    const db = getDb();
    let limit = parseInt(req.query.limit) || 10;
    limit = Math.max(1, Math.min(limit, 1000));

    const urlStats = await db
      .select({
        url: events.targetUrl,
        requestCount: count(),
        avgLatency: sql`AVG(${events.latencyMs})`,
        minLatency: sql`MIN(${events.latencyMs})`,
        maxLatency: sql`MAX(${events.latencyMs})`
      })
      .from(events)
      .where(sql`${events.targetUrl} IS NOT NULL`)
      .groupBy(events.targetUrl)
      .orderBy(sql`COUNT(*) DESC`)
      .limit(limit);

    const formatted = urlStats.map(stat => ({
      url: stat.url || 'unknown',
      request_count: stat.requestCount || 0,
      avg_latency_ms: stat.avgLatency ?
        parseFloat(stat.avgLatency).toFixed(1) : 0,
      min_latency_ms: stat.minLatency || 0,
      max_latency_ms: stat.maxLatency || 0
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Analytics urls error:', error);
    res.status(500).json({
      error: 'ANALYTICS_ERROR',
      message: error.message
    });
  }
});

module.exports = router;
