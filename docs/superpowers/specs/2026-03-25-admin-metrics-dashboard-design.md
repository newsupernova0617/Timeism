# Admin Dashboard Metrics Integration

> **For agentic workers:** Use superpowers:writing-plans to implement this design step-by-step.

**Goal:** Integrate KPI charts and performance metrics into the admin dashboard, allowing users to switch between CRUD operations and analytics view from a single interface.

**Architecture:** Reuse legacy `dashboard.html` metrics page as a separate view accessible via a "Metrics" tab in the admin navigation. The metrics page retrieves data from new `/api/analytics/` endpoints that aggregate statistics from the 5 existing database tables (users, sessions, events, comments, survey_responses).

**Tech Stack:** Chart.js (existing), Express.js endpoints, SQLite aggregation queries via Drizzle ORM

---

## Overview

The current admin dashboard (`/admin`) provides CRUD operations on 5 database tables. This design adds a complementary analytics view (`/admin/dashboard`) that displays KPI cards, charts, and performance metrics without disrupting existing functionality.

**Key Principle:** Minimal changes to existing code. Leverage the legacy metrics page structure and token-based authentication already in place.

---

## Components

### 1. Frontend - Navigation Integration

**File:** `views/admin/dashboard.ejs`

**Change:** Add a new tab button to the navigation bar:
```html
<nav class="table-nav">
  <button class="nav-btn" data-table="users">Users</button>
  <button class="nav-btn" data-table="sessions">Sessions</button>
  <button class="nav-btn" data-table="events">Events</button>
  <button class="nav-btn" data-table="comments">Comments</button>
  <button class="nav-btn" data-table="survey_responses">Survey</button>
  <button class="nav-btn" data-page="metrics">📊 Metrics</button>  <!-- NEW -->
</nav>
```

**Behavior:** When "Metrics" tab is clicked, extract admin token from current URL and navigate to `/admin/dashboard?token=ADMIN_TOKEN`.

### 2. Frontend - Metrics Page

**File:** `public/admin/dashboard.html` (existing, no changes needed)

**File:** `public/admin/dashboard.js` (legacy version restored)

The existing legacy metrics page displays:
- **KPI Cards (4):** Total Users, Total Visits, Total Events, Avg Response Time
- **Charts (2):** Event Distribution (Chart.js), Device Distribution (Chart.js)
- **Performance Metrics (4):** Min/Max Response Time, Error Rate, Session Count
- **URL Table:** Top 10 most queried servers with request counts and latency stats

No UI changes needed. The page calls `/api/analytics/summary` and `/api/analytics/urls` endpoints on load.

### 3. Backend - API Endpoints

**Files:** `routes/api.js` or new `routes/analytics.js`

**Endpoint 1: `GET /api/analytics/summary`**

Protected by `verifyAdminToken` middleware. Returns aggregated statistics:

```javascript
{
  users: {
    total: number,              // COUNT(DISTINCT userId) from users
    regions: number,            // COUNT(DISTINCT region) from users
    total_visits: number,       // SUM(visitCount) from users
    avg_visits_per_user: number // AVG(visitCount) from users
  },
  events: [
    { type: string, count: number },  // Event distribution by eventType
    ...
  ],
  devices: [
    { type: string, count: number },  // Device distribution (desktop/mobile/tablet)
    ...
  ],
  performance: {
    min_latency_ms: number,     // MIN(latencyMs) from events
    max_latency_ms: number,     // MAX(latencyMs) from events
    avg_latency_ms: number,     // AVG(latencyMs) from events
    session_count: number       // COUNT(DISTINCT sessionId) from sessions
  }
}
```

**Endpoint 2: `GET /api/analytics/urls?limit=10`**

Protected by `verifyAdminToken` middleware. Returns top URLs by request count:

```javascript
[
  {
    url: string,                // targetUrl from events
    request_count: number,      // COUNT(*) grouped by targetUrl
    avg_latency_ms: number,     // AVG(latencyMs) for this URL
    min_latency_ms: number,     // MIN(latencyMs) for this URL
    max_latency_ms: number      // MAX(latencyMs) for this URL
  },
  ...
]
```

### 4. Navigation Logic

**File:** `public/admin/dashboard.js` (current CRUD version)

**Change:** Update event listener to detect "Metrics" button clicks:

```javascript
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', function() {
    const table = this.dataset.table;
    const page = this.dataset.page;

    if (page === 'metrics') {
      const adminToken = urlParams.get('token');
      window.location.href = `/admin/dashboard?token=${adminToken}`;
    } else if (table) {
      loadTableData(table);
    }
  });
});
```

---

## Data Flow

```
User at /admin?token=ABC123
  ↓
Clicks "Metrics" tab
  ↓
JavaScript extracts token=ABC123
  ↓
Navigate to /admin/dashboard?token=ABC123
  ↓
verifyAdminToken middleware validates token
  ↓
Render public/admin/dashboard.html
  ↓
Load public/admin/dashboard.js (legacy metrics script)
  ↓
Fetch /api/analytics/summary?token=ABC123
  ↓
Fetch /api/analytics/urls?token=ABC123
  ↓
Render KPI cards, charts, tables
```

---

## Implementation Order

1. **Create `/api/analytics/summary` endpoint** - Aggregate user, event, device, and performance stats
2. **Create `/api/analytics/urls` endpoint** - Top URLs with latency breakdown
3. **Restore legacy `dashboard.js`** - Ensure it calls the new endpoints with proper token handling
4. **Update navigation in `dashboard.ejs`** - Add Metrics tab button
5. **Update CRUD `dashboard.js`** - Add event listener for Metrics tab navigation
6. **Test end-to-end** - Verify token passing and data rendering

---

## Database Queries

All queries use existing Drizzle ORM schema from `db/schema.js`:

- `users` table: userId, region, deviceType, visitCount
- `sessions` table: sessionId, userId
- `events` table: sessionId, eventType, targetUrl, latencyMs
- `comments` table: (used for CRUD, not analytics)
- `survey_responses` table: (used for CRUD, not analytics)

No schema changes needed. All metrics are derived from existing columns via aggregation queries.

---

## Error Handling

- **Missing token:** Show error message "Authentication token required. Add ?token=YOUR_TOKEN to URL."
- **Invalid token:** Return 401 Unauthorized from `verifyAdminToken` middleware
- **No data:** Show "No data available" message in KPI cards and tables
- **API failure:** Display error toast and log to console

---

## Security

- All endpoints protected by `verifyAdminToken` middleware (existing)
- Token passed via URL query parameter (consistent with current implementation)
- No sensitive data exposed in responses (aggregated statistics only)
- Same rate-limiting rules apply as other `/api/analytics/` endpoints

---

## Testing Strategy

1. **Unit tests:** Aggregation queries return correct totals
2. **Integration tests:** `/api/analytics/` endpoints return expected response format
3. **E2E tests:**
   - Click Metrics tab → navigate with token
   - Load metrics page → render KPI cards
   - Charts display correct data
   - URL table shows top 10 servers

---

## Future Enhancements (Out of Scope)

- Error rate calculation (requires error flag in events table)
- Slow request tracking (requires latency threshold definition)
- Time range filtering (currently shows all-time data)
- Export metrics to CSV/PDF
- Real-time data updates via WebSocket

---

**Status:** Ready for implementation plan

