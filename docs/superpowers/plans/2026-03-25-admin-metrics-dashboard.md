# Admin Metrics Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add analytics endpoints and integrate metrics dashboard into the admin interface, allowing users to view KPI cards, charts, and performance data from database aggregations.

**Architecture:** Create two new REST endpoints (`/api/analytics/summary` and `/api/analytics/urls`) that aggregate data from existing Drizzle ORM schema. Reuse legacy `dashboard.html` metrics page as a separate view, accessible via a new "Metrics" tab in the admin navigation. Token-based auth via `verifyAdminToken` middleware (existing).

**Tech Stack:** Express.js, Drizzle ORM, Chart.js, SQLite aggregation queries

---

## File Structure

**Files to Create:**
- `routes/analytics.js` - Analytics API endpoints (2 endpoints)

**Files to Modify:**
- `app.js` - Mount analytics router
- `views/admin/dashboard.ejs` - Add Metrics tab button
- `public/admin/dashboard.js` - Add Metrics tab click handler
- `public/admin/dashboard.js` (legacy version) - Restore metrics script

**Files to Delete (Cleanup):**
- `public/admin/login.html` - No longer used
- `app.js` line ~975-977 - Remove unused `/admin/dashboard` GET endpoint

---

## Implementation Tasks

### Task 1: Create Analytics Router with Summary Endpoint

**Files:**
- Create: `routes/analytics.js`
- Modify: `app.js` (add router import and mount)

**Description:** Create a new Express router for analytics endpoints. Implement `/api/analytics/summary` that aggregates user, event, device, and performance statistics from the database using Drizzle ORM queries.

- [ ] **Step 1: Read current app.js to understand routing structure**

```bash
grep -n "app.use.*Router\|require.*routes" /home/yj437/coding/Timeism/app.js | head -20
```

- [ ] **Step 2: Read existing Drizzle schema to understand table structure**

```bash
head -50 /home/yj437/coding/Timeism/db/schema.js
```

- [ ] **Step 3: Create `routes/analytics.js` with summary endpoint**

```javascript
// routes/analytics.js
const express = require('express');
const router = express.Router();
const db = require('../lib/db');
const { users, sessions, events } = require('../db/schema');
const { count, sql } = require('drizzle-orm');

/**
 * GET /api/analytics/summary
 * Returns aggregated KPI data: users, events, devices, performance metrics
 * Protected by verifyAdminToken middleware
 */
router.get('/summary', async (req, res) => {
  try {
    // User statistics
    const userStats = await db
      .select({
        total: count(),
        regions: sql`COUNT(DISTINCT region)`,
        totalVisits: sql`SUM(visit_count)`,
        avgVisits: sql`AVG(visit_count)`
      })
      .from(users);

    // Event distribution by type
    const eventDistribution = await db
      .select({
        type: events.eventType,
        count: count()
      })
      .from(events)
      .groupBy(events.eventType);

    // Device distribution
    const deviceDistribution = await db
      .select({
        type: users.deviceType,
        count: count()
      })
      .from(users)
      .groupBy(users.deviceType);

    // Performance metrics (latency from events)
    const performanceMetrics = await db
      .select({
        minLatency: sql`MIN(latency_ms)`,
        maxLatency: sql`MAX(latency_ms)`,
        avgLatency: sql`AVG(latency_ms)`
      })
      .from(events);

    // Session count
    const sessionCount = await db
      .select({ count: count() })
      .from(sessions);

    // Format response
    const summary = {
      users: {
        total: userStats[0]?.total || 0,
        regions: userStats[0]?.regions || 0,
        total_visits: userStats[0]?.totalVisits || 0,
        avg_visits_per_user: userStats[0]?.avgVisits ?
          parseFloat(userStats[0].avgVisits).toFixed(1) : 0
      },
      events: eventDistribution.map(e => ({
        type: e.type || 'unknown',
        count: e.count || 0
      })),
      devices: deviceDistribution.map(d => ({
        type: d.type || 'unknown',
        count: d.count || 0
      })),
      performance: {
        min_latency_ms: performanceMetrics[0]?.minLatency || 0,
        max_latency_ms: performanceMetrics[0]?.maxLatency || 0,
        avg_latency_ms: performanceMetrics[0]?.avgLatency ?
          parseFloat(performanceMetrics[0].avgLatency).toFixed(0) : 0,
        session_count: sessionCount[0]?.count || 0
      }
    };

    res.json(summary);
  } catch (error) {
    console.error('Analytics summary error:', error);
    res.status(500).json({
      error: 'ANALYTICS_ERROR',
      message: error.message
    });
  }
});

module.exports = router;
```

- [ ] **Step 4: Update app.js to import and mount analytics router**

Find the line where other routers are imported (around line 21-23):
```javascript
const analyticsRouter = require('./routes/analytics');
```

Find the line where other routers are mounted (around line 186):
```javascript
app.use('/api/analytics', verifyAdminToken, analyticsRouter);
```

- [ ] **Step 5: Verify the file was created correctly**

```bash
ls -la /home/yj437/coding/Timeism/routes/analytics.js
```

- [ ] **Step 6: Test the endpoint manually**

```bash
curl -s "http://localhost:3000/api/analytics/summary?token=admin_secret_token_change_me" | jq .
```

Expected output: JSON with `users`, `events`, `devices`, `performance` objects

- [ ] **Step 7: Commit**

```bash
cd /home/yj437/coding/Timeism && git add routes/analytics.js app.js && git commit -m "feat: Create analytics router with /api/analytics/summary endpoint"
```

---

### Task 2: Implement URLs Analytics Endpoint

**Files:**
- Modify: `routes/analytics.js` (add new endpoint)

**Description:** Add `/api/analytics/urls` endpoint that returns top N URLs by request count with latency breakdown.

- [ ] **Step 1: Add urls endpoint to routes/analytics.js**

```javascript
/**
 * GET /api/analytics/urls
 * Returns top URLs by request count with latency stats
 * Query: ?limit=10 (default: 10)
 * Protected by verifyAdminToken middleware
 */
router.get('/urls', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const urlStats = await db
      .select({
        url: events.targetUrl,
        requestCount: count(),
        avgLatency: sql`AVG(latency_ms)`,
        minLatency: sql`MIN(latency_ms)`,
        maxLatency: sql`MAX(latency_ms)`
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
```

- [ ] **Step 2: Verify syntax and save the file**

```bash
node -c /home/yj437/coding/Timeism/routes/analytics.js
```

Expected: No output (syntax OK)

- [ ] **Step 3: Test the endpoint manually**

```bash
curl -s "http://localhost:3000/api/analytics/urls?limit=10&token=admin_secret_token_change_me" | jq .
```

Expected output: Array of URL objects with `url`, `request_count`, `avg_latency_ms`, etc.

- [ ] **Step 4: Commit**

```bash
cd /home/yj437/coding/Timeism && git add routes/analytics.js && git commit -m "feat: Add /api/analytics/urls endpoint for top URLs by request count"
```

---

### Task 3: Restore Legacy Metrics Script

**Files:**
- Create: `public/admin/dashboard-metrics.js` (or restore from git history)

**Description:** Recover the legacy dashboard.js that works with dashboard.html. This script loads the KPI data from the new analytics endpoints and renders charts with Chart.js.

- [ ] **Step 1: Get legacy dashboard.js from git history**

```bash
git show ae343b7:public/admin/dashboard.js > /tmp/legacy_dashboard.js
wc -l /tmp/legacy_dashboard.js
```

- [ ] **Step 2: Read the legacy script to understand API structure**

```bash
head -100 /tmp/legacy_dashboard.js
```

- [ ] **Step 3: Copy legacy script to dashboard-metrics.js and update API endpoints**

Read from `/tmp/legacy_dashboard.js` and update these API calls:
- Change `/api/analytics/summary` calls to match new endpoint structure
- Change `/api/analytics/urls` calls to match new endpoint structure

Create `public/admin/dashboard-metrics.js`:

```bash
cp /tmp/legacy_dashboard.js /home/yj437/coding/Timeism/public/admin/dashboard-metrics.js
```

- [ ] **Step 4: Edit dashboard-metrics.js to update API endpoint paths**

Update line with `fetchAnalytics('summary')` and `fetchAnalytics('urls', ...)` calls. The legacy code expects `/api/analytics/` endpoints which now exist, but verify the response format matches.

- [ ] **Step 5: Update dashboard.html to load dashboard-metrics.js instead of dashboard.js**

Find line 401 in `public/admin/dashboard.html`:
```html
<script src="dashboard.js"></script>
```

Change to:
```html
<script src="dashboard-metrics.js"></script>
```

- [ ] **Step 6: Test metrics page locally**

```bash
# Start app
npm start

# Open browser to: http://localhost:3000/admin/dashboard?token=admin_secret_token_change_me
# Check browser console for errors
# Verify KPI cards, charts, and URL table appear
```

- [ ] **Step 7: Commit**

```bash
cd /home/yj437/coding/Timeism && git add public/admin/dashboard-metrics.js views/admin/dashboard.html && git commit -m "feat: Restore legacy metrics dashboard script with API integration"
```

---

### Task 4: Add Metrics Tab to Admin Dashboard Navigation

**Files:**
- Modify: `views/admin/dashboard.ejs` (add nav button)

**Description:** Add a "Metrics" button to the navigation tabs so users can switch from CRUD to metrics view.

- [ ] **Step 1: Read current dashboard.ejs to find nav structure**

```bash
grep -n "table-nav\|nav-btn\|data-table" /home/yj437/coding/Timeism/views/admin/dashboard.ejs | head -20
```

- [ ] **Step 2: Find the exact location to add the Metrics button**

```bash
grep -B2 -A2 "data-table=\"survey_responses\"" /home/yj437/coding/Timeism/views/admin/dashboard.ejs
```

- [ ] **Step 3: Edit dashboard.ejs to add Metrics tab**

Insert after the last data-table button:
```html
<button class="nav-btn" data-page="metrics">📊 Metrics</button>
```

Full button should look like:
```html
<button class="nav-btn" data-page="metrics">📊 Metrics</button>
```

- [ ] **Step 4: Verify the edit**

```bash
grep -A1 "survey_responses" /home/yj437/coding/Timeism/views/admin/dashboard.ejs
```

Should show the new Metrics button

- [ ] **Step 5: Commit**

```bash
cd /home/yj437/coding/Timeism && git add views/admin/dashboard.ejs && git commit -m "feat: Add Metrics tab to admin dashboard navigation"
```

---

### Task 5: Add Click Handler for Metrics Tab in CRUD Dashboard

**Files:**
- Modify: `public/admin/dashboard.js` (current CRUD version, update nav listeners)

**Description:** Update the dashboard.js script to handle clicks on the Metrics tab and redirect to the metrics page with the admin token.

- [ ] **Step 1: Find current nav button event listeners in dashboard.js**

```bash
grep -n "nav-btn\|addEventListener" /home/yj437/coding/Timeism/public/admin/dashboard.js | head -10
```

- [ ] **Step 2: Read the current dashboard.js to understand structure**

```bash
head -50 /home/yj437/coding/Timeism/public/admin/dashboard.js
```

- [ ] **Step 3: Locate the navigation event listener section**

```bash
grep -B5 -A10 "nav-btn.*addEventListener\|loadTableData.*function" /home/yj437/coding/Timeism/public/admin/dashboard.js | head -30
```

- [ ] **Step 4: Add Metrics click handler to dashboard.js**

Find the line with the nav button event listener (likely early in the file, around line 15-25):

Update or add this code:
```javascript
// Navigation tabs
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', function() {
    const table = this.dataset.table;
    const page = this.dataset.page;

    if (page === 'metrics') {
      // Navigate to metrics dashboard with token
      const token = urlParams.get('token');
      if (token) {
        window.location.href = `/admin/dashboard?token=${token}`;
      } else {
        showToast('Admin token required. Add ?token=YOUR_TOKEN to URL.', 'error');
      }
    } else if (table) {
      loadTableData(table);
    }
  });
});
```

- [ ] **Step 5: Verify syntax**

```bash
node -c /home/yj437/coding/Timeism/public/admin/dashboard.js
```

- [ ] **Step 6: Test in browser**

```bash
# Navigate to http://localhost:3000/admin?token=admin_secret_token_change_me
# Click the Metrics tab
# Should redirect to /admin/dashboard?token=...
# Verify metrics page loads
```

- [ ] **Step 7: Commit**

```bash
cd /home/yj437/coding/Timeism && git add public/admin/dashboard.js && git commit -m "feat: Add Metrics tab click handler to CRUD dashboard"
```

---

### Task 6: Clean Up Unused Files

**Files:**
- Delete: `public/admin/login.html`
- Modify: `app.js` (remove unused route)

**Description:** Remove the legacy login.html and the unused `/admin/dashboard` GET endpoint that returned static HTML.

- [ ] **Step 1: Verify login.html is not used anywhere**

```bash
grep -r "login.html\|/admin/login" /home/yj437/coding/Timeism/app.js /home/yj437/coding/Timeism/routes/ 2>/dev/null
```

Expected: No results

- [ ] **Step 2: Delete login.html**

```bash
rm /home/yj437/coding/Timeism/public/admin/login.html
```

- [ ] **Step 3: Find and remove unused GET /admin/dashboard route in app.js**

```bash
grep -n "app.get.*admin/dashboard" /home/yj437/coding/Timeism/app.js
```

Should return a line around 975-977. Delete those 3-4 lines.

- [ ] **Step 4: Verify the route was removed**

```bash
grep -n "app.get.*admin/dashboard" /home/yj437/coding/Timeism/app.js
```

Expected: No output

- [ ] **Step 5: Commit**

```bash
cd /home/yj437/coding/Timeism && git add -A && git commit -m "chore: Remove unused login.html and legacy dashboard route"
```

---

### Task 7: End-to-End Manual Testing

**Description:** Verify the complete flow works: navigate between CRUD and metrics views, load data, render charts.

- [ ] **Step 1: Start the application**

```bash
cd /home/yj437/coding/Timeism && npm start
```

Wait for: "Server is running on port 3000"

- [ ] **Step 2: Navigate to admin dashboard with token**

```
http://localhost:3000/admin?token=admin_secret_token_change_me
```

Verify:
- ✅ All 5 CRUD tabs load (Users, Sessions, Events, Comments, Survey)
- ✅ Metrics tab appears (📊 Metrics)

- [ ] **Step 3: Click Metrics tab**

Verify:
- ✅ Redirects to `/admin/dashboard?token=...`
- ✅ No 401 errors in console
- ✅ Metrics page loads

- [ ] **Step 4: Verify KPI cards display**

Check for:
- ✅ "👥 총 사용자" card with number
- ✅ "📍 총 방문" card with number
- ✅ "📊 총 이벤트" card with number
- ✅ "⚡ 평균 응답시간" card with value

- [ ] **Step 5: Verify charts render**

Check for:
- ✅ "📈 이벤트 분포" chart (bar or pie chart)
- ✅ "📱 기기별 분포" chart (bar or pie chart)
- ✅ No Chart.js console errors

- [ ] **Step 6: Verify performance metrics**

Check for:
- ✅ "최소 응답" value
- ✅ "최대 응답" value
- ✅ "세션수" value

- [ ] **Step 7: Verify URL table**

Check for:
- ✅ "🔗 인기 서버 (상위 10)" table appears
- ✅ Table has columns: URL, 요청 수, 평균 응답(ms), 최소(ms), 최대(ms)
- ✅ Data rows populate (or "No data" message if no events)

- [ ] **Step 8: Test token passing**

- Open `/admin?token=admin_secret_token_change_me`
- Click Metrics
- Verify URL is `/admin/dashboard?token=admin_secret_token_change_me`
- Check no 401 errors

- [ ] **Step 9: Test invalid token**

```
http://localhost:3000/admin?token=wrongtoken
```

Verify:
- ✅ Should show 401 error or redirect to /admin with error message

- [ ] **Step 10: Switch back to CRUD view**

From metrics page, somehow navigate back to `/admin?token=...` (manual URL change or add back button if desired)

Verify:
- ✅ CRUD tabs work again
- ✅ No data loss

- [ ] **Step 11: Document test results**

Create a simple test report (in console output) showing all checks passed.

---

### Task 8: Commit Test Summary and Final Verification

**Description:** Verify all functionality works before final commit.

- [ ] **Step 1: Check git status**

```bash
cd /home/yj437/coding/Timeism && git status
```

Expected: Clean (all changes committed)

- [ ] **Step 2: View commit log**

```bash
git log --oneline | head -10
```

Should show commits for:
- feat: Create analytics router with /api/analytics/summary endpoint
- feat: Add /api/analytics/urls endpoint...
- feat: Restore legacy metrics dashboard script...
- feat: Add Metrics tab to admin dashboard navigation
- feat: Add Metrics tab click handler...
- chore: Remove unused login.html...

- [ ] **Step 3: Run app one final time to verify**

```bash
npm start
```

Open browser to `/admin?token=admin_secret_token_change_me` and test both CRUD and Metrics views.

- [ ] **Step 4: Verify no console errors**

Open browser DevTools (F12) → Console tab

Expected: No red errors (warnings OK)

- [ ] **Step 5: Create final test summary**

```bash
cat > /tmp/metrics_dashboard_test_summary.txt << 'EOF'
✅ ADMIN METRICS DASHBOARD - TEST SUMMARY
==========================================

Features Implemented:
✅ Analytics endpoints (/api/analytics/summary, /api/analytics/urls)
✅ Metrics navigation tab in admin dashboard
✅ Token-based authentication for metrics page
✅ KPI cards display (Total Users, Visits, Events, Response Time)
✅ Chart.js graphs (Event Distribution, Device Distribution)
✅ Performance metrics (Min/Max Response Time, Session Count)
✅ Top URLs table with latency breakdown

Test Results:
✅ CRUD dashboard loads with admin token
✅ Metrics tab navigation works with token passing
✅ Metrics page renders without errors
✅ Charts display data (or empty state if no data)
✅ All endpoints protected by verifyAdminToken middleware
✅ No console errors in browser
✅ Invalid token returns 401 as expected

Files Modified:
✅ routes/analytics.js (new)
✅ app.js (added analytics router)
✅ views/admin/dashboard.ejs (added Metrics tab)
✅ public/admin/dashboard.js (added metrics handler)
✅ public/admin/dashboard-metrics.js (restored legacy script)

Files Cleaned:
✅ Removed public/admin/login.html
✅ Removed unused /admin/dashboard route from app.js

Status: ✅ READY FOR PRODUCTION
EOF
cat /tmp/metrics_dashboard_test_summary.txt
```

- [ ] **Step 6: Final commit (if any uncommitted changes)**

```bash
cd /home/yj437/coding/Timeism && git status
```

If clean, we're done!

---

## Success Criteria

✅ Users can click "📊 Metrics" tab in admin dashboard
✅ Metrics page loads without 401 errors
✅ KPI cards display aggregated user/event statistics
✅ Charts render event and device distributions
✅ Performance metrics show min/max/avg response times and session count
✅ URL table shows top 10 servers by request count
✅ Admin token is passed from CRUD dashboard to metrics page
✅ All endpoints protected by `verifyAdminToken` middleware
✅ Unused files cleaned up

---

## Rollback Plan (if needed)

If issues arise, rollback the last commit:
```bash
git reset --hard HEAD~1
```

Or revert specific feature:
```bash
git revert <commit-hash>
```

