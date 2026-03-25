# URL Check Event Logging - Design Specification

**Date:** 2026-03-25
**Status:** Ready for Implementation
**Feature:** Real-time Trending Sites Data Collection

---

## 1. Overview

The trending sites feature currently displays UI and API endpoints but produces no data because URL checks are never logged. This specification defines how to add `url_check` event logging when users successfully check a server's time.

**Goal:** Enable the trending sites feature to show real-time popular URLs by logging each URL check attempt.

**Current Gap:**
- Frontend: ✅ UI components exist, JS module implemented
- Backend: ✅ API endpoint `/api/trending-urls` exists, queries implemented
- Database: ✅ Schema supports `url_check` events
- Event Logging: ❌ No code generates `url_check` events

---

## 2. Solution: Log url_check on Successful Response

### 2.1 Event Structure

When a user successfully checks a URL's server time, log:

```javascript
{
  event_type: 'url_check',
  target_url: 'https://example.com',  // The URL user checked
  locale: 'ko',                        // User's current language/region
  latency_ms: 245,                     // Optional: response time in ms
  timestamp: '2026-03-25T10:30:45.123Z'
}
```

**Field Definitions:**
- `event_type`: Fixed value `'url_check'`
- `target_url`: Exact URL from the user's input (e.g., `https://www.ticketmaster.com`)
- `locale`: Detected from `document.documentElement.lang` (e.g., `'ko'`, `'en'`, `'jp'`, `'zh-tw'`)
- `latency_ms`: Time between request start and response received (milliseconds, integer)
- `timestamp`: ISO 8601 timestamp when event occurred (already handled by session module)

**Data Validation:**
- `target_url` must not be null or empty
- `locale` must match: `'ko' | 'en' | 'jp' | 'zh-tw'` (default: `'en'`)
- `latency_ms` must be non-negative integer or null

**Storage:** Uses existing `events` table in SQLite (db/schema.js). No schema changes needed.

---

### 2.2 Integration Point

**File:** `public/js/modules/api.js`

**Location in code flow:**
```
User enters URL and clicks "Check"
        ↓
api.js calls fetch('/api/check-time', {...})
        ↓
Response received and parsed
        ↓
✅ IF response.ok:
   - Validate response data
   - Calculate latency_ms = (Date.now() - requestStartTime)
   - LOG url_check event ← NEW STEP
   - Call onTimeResult(data, endTime)
   - Update UI with time
```

**Specific Implementation:**
1. In the fetch success handler (around line 70-90)
2. After: `const data = await response.json()` succeeds
3. After: Validation that `response.ok === true`
4. Before: `onTimeResult(data, endTime)` callback is invoked
5. Call: `session.sendEvent('url_check', {url, locale, latency_ms})`

**Why before onTimeResult:**
- Ensures we log the check even if UI update fails
- Maintains logical separation: "log first, display second"
- Consistent with how `click_button` events work

---

### 2.3 Data Collection

**How to obtain each field:**

| Field | Source | How to Extract |
|-------|--------|-----------------|
| `target_url` | User input | `document.getElementById('urlInput').value` |
| `locale` | DOM language | `document.documentElement.lang \|\| 'en'` |
| `latency_ms` | Timestamps | `Math.round(Date.now() - requestStartTime)` |
| `event_type` | Constant | `'url_check'` (hardcoded) |
| `timestamp` | Session module | Handled automatically by `session.sendEvent()` |

**Sample code structure:**
```javascript
const startTime = Date.now();

try {
  const response = await fetch('/api/check-time', {...});

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json();
  const latency = Math.round(Date.now() - startTime);

  // ← LOG HERE
  const url = document.getElementById('urlInput').value;
  const locale = document.documentElement.lang || 'en';

  try {
    session.sendEvent('url_check', {
      url,
      locale,
      latency_ms: latency
    });
  } catch (logError) {
    console.error('Failed to log url_check event:', logError);
    // Continue—don't break UX
  }

  onTimeResult(data, Date.now());

} catch (error) {
  // Handle check failure (existing code)
  onApiError(error);
}
```

---

### 2.4 Error Handling & Resilience

**Principle:** Event logging failures must never break the core feature (URL time checking).

**Behavior:**
- If `session.sendEvent()` throws: catch silently, log to console, continue
- If event data is invalid: session module validates/sanitizes, we don't double-validate
- If database insert fails: handled by session module, we don't retry

**Console Logging (debugging only):**
```javascript
console.error('Failed to log url_check event:', {
  url,
  locale,
  error: logError.message
});
```

**User Experience:**
- ✅ URL check result displays normally
- ✅ Time updates on screen
- ✅ No error message shown to user
- ❌ Event may not be logged (acceptable failure mode)

**Rate Limiting:**
- Uses existing session module rate limiting (if enabled)
- No special url_check-specific limits needed
- If user hits rate limit, check still works, event just may not be sent

---

### 2.5 Integration with Existing Code

**Dependencies:**
- `session` module (already available in api.js via `sendEvent` parameter)
- User input from DOM (already available)
- Current timestamp (built-in Date API)

**No changes needed to:**
- Database schema (url_check fits existing events table)
- API endpoints (existing /api/trending-urls query already handles url_check)
- UI/display logic (trending-sites.js already works)
- Session module (sendEvent already handles event structure)

**Minimal footprint:**
- ~10 lines of code added to api.js
- No new files or modules
- No new dependencies

---

## 3. Data Flow

```
User Interface
   ↓
[URL Input + Check Button Click]
   ↓
api.js (public/js/modules/api.js)
   ↓
/api/check-time (backend validates)
   ↓
Response: { server_time_estimated_epoch_ms, ... }
   ↓
IF response.ok:
   ├─→ session.sendEvent('url_check', {...}) ← NEW
   │   ├─→ Batch with other events
   │   └─→ /api/log-event (backend stores)
   │
   └─→ onTimeResult(data) [display time to user]

Database (events table)
   ├─ event_type: 'url_check'
   ├─ target_url: user's input
   ├─ locale: user's language
   └─ timestamp: when check occurred

Trending API (/api/trending-urls)
   ↓
SELECT target_url, COUNT(*) FROM events
WHERE event_type='url_check' AND locale=? AND timestamp > NOW()-1hour
GROUP BY target_url ORDER BY COUNT DESC LIMIT 5
   ↓
Response with trending URLs
   ↓
Trending Sites UI (trending-sites.js)
   ↓
Display "🔥 실시간 인기 사이트"
```

---

## 4. Testing & Verification

### 4.1 Manual Testing

**Test 1: Event Creation**
1. Open http://localhost:3000/ko/
2. Enter URL: `https://www.example.com`
3. Click "시간 확인" button
4. Verify: Time displays correctly
5. Check database:
   ```sql
   SELECT * FROM events
   WHERE event_type='url_check'
   ORDER BY timestamp DESC LIMIT 1;
   ```
6. Verify: Row exists with target_url, locale, latency_ms populated

**Test 2: Trending List Population**
1. Repeat Test 1 with 5+ different URLs
2. Open http://localhost:3000/ko/
3. Observe trending sites section (should update after 5 seconds or manual refresh)
4. Verify: URLs appear in trending list, sorted by check count
5. Click one trending item
6. Verify: URL auto-fills, check executes

**Test 3: Locale Filtering**
1. Check same URL on `/ko/` page
2. Check same URL on `/en/` page
3. Call `/api/trending-urls?locale=ko`
4. Call `/api/trending-urls?locale=en`
5. Verify: Each locale shows only its own events

**Test 4: Error Resilience**
1. Temporarily modify session.sendEvent to throw error
2. Enter URL and check time
3. Verify: Time still displays (event logging didn't break it)
4. Check console for error log message

### 4.2 No Automated Tests Required

- Event logging is a simple side effect (not core logic)
- Covered implicitly by integration tests if they exist
- Manual verification above is sufficient

---

## 5. Success Criteria

✅ Feature is complete when:

1. **Event logging works:**
   - Checking a URL creates a `url_check` event in database
   - Event contains: target_url, locale, latency_ms, timestamp

2. **Trending list populates:**
   - After checking 5+ URLs, `/api/trending-urls` returns data
   - URLs appear on trending sites section of main page

3. **Locale filtering works:**
   - `/api/trending-urls?locale=ko` returns only Korean checks
   - `/api/trending-urls?locale=en` returns only English checks

4. **UI interaction works:**
   - Clicking a trending item auto-fills URL and checks it
   - 5-minute auto-refresh displays new trending data

5. **Error handling works:**
   - If logging fails, URL check still completes
   - No error shown to user
   - Error logged to console for debugging

6. **Zero breaking changes:**
   - Existing features unaffected
   - Database schema unchanged
   - API responses unchanged

---

## 6. Implementation Scope

**Files to modify:**
- `public/js/modules/api.js` (add url_check logging, ~10 lines)

**Files that need no changes:**
- `routes/api.js` (already queries url_check)
- `public/js/modules/trending-sites.js` (already displays them)
- `views/index.ejs` (UI already exists)
- `db/schema.js` (schema supports it)

**Estimated effort:** 15-30 minutes

---

## 7. Rollback Plan

If issues arise:
1. Remove the url_check logging block from api.js
2. Clear url_check events: `DELETE FROM events WHERE event_type='url_check';`
3. Trending sites will show empty state again (safe)
4. No schema or API changes to revert
