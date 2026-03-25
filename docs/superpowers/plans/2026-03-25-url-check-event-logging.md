# URL Check Event Logging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable real-time trending sites by logging `url_check` events when users successfully check server times.

**Architecture:** Add 10 lines of event logging code to `public/js/modules/api.js` in the successful response handler. No new files, no schema changes, no API modifications. Event logging is fire-and-forget with silent error handling (logs errors to console for debugging, but never breaks the core feature).

**Tech Stack:** ES6 JavaScript (existing), session event system (already used), SQLite events table (existing).

---

## File Structure

**Modified:**
- `public/js/modules/api.js` — Add `url_check` event logging in `requestServerTime()` function (lines 115-124)

**No changes to:**
- `public/js/modules/session.js` (already has `sendEvent()`)
- `public/js/modules/trending-sites.js` (already displays trending data)
- `routes/api.js` (already queries `url_check` events)
- `views/index.ejs` (UI already exists)
- `db/schema.js` (schema already supports url_check)

---

## Task 1: Add url_check Event Logging to api.js

**Files:**
- Modify: `public/js/modules/api.js:115-124` (in the success handler, before onTimeResult)

### Step 1: Review current code structure

Read the `requestServerTime()` function to understand the flow:
- Lines 82-149: Complete function
- Lines 88-98: Initial fetch and response parsing
- Lines 100-114: Error check — if response is not ok, log error and return
- Lines 116-126: Success path — prepare adjusted payload and call onTimeResult
- Lines 129-133: Send click_button event (this is where we'll add url_check too)

- [ ] Open `public/js/modules/api.js` and locate the `requestServerTime()` function
- [ ] Identify line 100: `if (!response.ok || payload.error) {`
- [ ] Identify line 124: `if (onTimeResult) {`
- [ ] Understand that after line 114 (the closing brace of the error block), we need to add url_check logging before the success callback

### Step 2: Write the url_check logging code

Add the event logging in the success path (after the error check, before onTimeResult).

**Insert after line 114 (before the RTT/2 adjustment):**

```javascript
      // Log url_check event for trending analysis
      // Note: This is logged BEFORE onTimeResult() to ensure the event is recorded
      // even if the UI update fails (fail-safe approach)
      const locale = document.documentElement.lang || 'en';
      try {
        sendEvent('url_check', {
          target_url: targetUrl,
          locale,
          latency_ms: latencyMs
        });
      } catch (logError) {
        console.error('Failed to log url_check event:', {
          target_url: targetUrl,
          locale,
          error: logError.message
        });
        // Continue—logging failure should not break the URL check
      }
      // The click_button event is sent later (after onTimeResult) to track UI interaction
```

- [ ] In your editor, place cursor at end of line 114 (after the closing brace of the error handler)
- [ ] Press Enter to create a new line
- [ ] Add a blank line and the code block above
- [ ] Verify indentation matches surrounding code (2 spaces)

### Step 3: Verify the modified code structure

- [ ] Check that the code looks correct:
  - `const locale = document.documentElement.lang || 'en';` extracts the language
  - `sendEvent('url_check', {...})` logs the event
  - `catch (logError) { console.error(...) }` silently logs errors without throwing
  - The closing brace of the try/catch is followed by blank line, then RTT/2 adjustment code

- [ ] Visual checklist:
  - ✅ Event is logged BEFORE `onTimeResult()` is called (line 124)
  - ✅ Event uses correct field name `target_url` (not `url`)
  - ✅ `locale` is extracted from DOM
  - ✅ `latency_ms` is already calculated (line 98)
  - ✅ Error handling catches and logs without re-throwing
  - ✅ Code is inside the success path (after error check)

### Step 4: Test the implementation locally

**Test: Verify url_check events are created**

1. Verify database exists: `ls -la data/app.db`
2. Start the app: `npm start` (or however you normally run it)
3. Open http://localhost:3000/ko/ in browser
   - Verify page HTML has `<html lang="ko">` (open DevTools → Elements and check)
3. Open browser DevTools → Console tab
4. Enter a test URL: `https://www.example.com`
5. Click "시간 확인" button
6. Expected:
   - Server time displays normally ✅
   - No errors in console ✅
7. Open a terminal and check the database:
   ```bash
   sqlite3 data/app.db "SELECT event_type, target_url, locale, latency_ms FROM events WHERE event_type='url_check' ORDER BY timestamp DESC LIMIT 1;"
   ```
8. Expected output:
   ```
   url_check|https://www.example.com|ko|[latency_number]
   ```

- [ ] Verify time displays correctly after URL check
- [ ] Check database: one new `url_check` event exists with correct fields
- [ ] Verify `target_url` matches the input URL
- [ ] Verify `locale` matches page language (ko)
- [ ] Verify `latency_ms` is a number > 0

### Step 5: Test multiple URLs for trending

**Test: Verify trending list populates after multiple checks**

1. Check 5+ different URLs (e.g., https://www.example.com, https://www.google.com, https://www.github.com, etc.)
2. Go back to main page (http://localhost:3000/ko/)
3. Look for "🔥 실시간 인기 사이트" section
4. Expected: URLs should appear in the trending list
5. Click one trending URL
6. Expected: URL auto-fills and time check executes automatically

- [ ] Check 5+ different URLs
- [ ] Verify trending list shows URLs (should appear within 5-10 seconds; if not, check `/api/trending-urls?locale=ko` in browser console to debug)
- [ ] Click a trending item and verify it auto-checks

### Step 6: Test locale filtering

**Test: Verify trending data is locale-specific**

1. In Korean page (ko), check a URL: `https://www.test1.com`
2. In English page (en), check the same URL: `https://www.test1.com`
3. Open browser console and test the API:
   ```javascript
   fetch('/api/trending-urls?locale=ko').then(r => r.json()).then(d => console.log('KO:', d))
   fetch('/api/trending-urls?locale=en').then(r => r.json()).then(d => console.log('EN:', d))
   ```
4. Expected: Each locale's result contains only events from that locale

- [ ] Check URL on /ko/ and /en/ pages
- [ ] Call API with different locales
- [ ] Verify locale filtering works correctly

### Step 7: Test error resilience

**Test: Verify URL checking still works if event logging fails**

1. Modify code temporarily to simulate logging failure:
   - In DevTools Console, override session module: `window.sendEventOriginal = window.sendEvent; window.sendEvent = () => { throw new Error('Mock failure'); };`
   - Or: Comment out the `sendEvent()` call to simulate a broken session module
2. Check a URL
3. Expected:
   - Server time displays normally ✅
   - Error message appears in console (for debugging) ✅
   - No user-facing error ✅
4. Check database: Event might not be logged, but that's acceptable

- [ ] Simulate logging failure (either via override or code modification)
- [ ] Verify URL check still completes
- [ ] Verify time displays correctly
- [ ] Verify error is logged to console
- [ ] Verify no error is shown to user

### Step 8: Commit the change

```bash
git add public/js/modules/api.js
git commit -m "feat: Add url_check event logging for trending sites feature

- Log url_check event when users successfully check server time
- Includes target_url, locale, and latency_ms
- Silent error handling ensures URL checks work even if logging fails
- Enables real-time trending sites feature"
```

- [ ] Stage the modified file: `git add public/js/modules/api.js`
- [ ] Create commit with message above
- [ ] Verify: `git log --oneline -1` shows your commit

---

## Verification Checklist

After implementation, verify all success criteria:

- [ ] **Event logging works:**
  - Checking a URL creates a `url_check` event in database
  - Event contains: target_url, locale, latency_ms, timestamp

- [ ] **Trending list populates:**
  - After checking 5+ URLs, `/api/trending-urls` returns data
  - URLs appear on trending sites section of main page

- [ ] **Locale filtering works:**
  - `/api/trending-urls?locale=ko` returns only Korean checks
  - `/api/trending-urls?locale=en` returns only English checks

- [ ] **UI interaction works:**
  - Clicking a trending item auto-fills URL and checks it
  - 5-minute auto-refresh displays new trending data

- [ ] **Error handling works:**
  - If logging fails, URL check still completes
  - No error shown to user
  - Error logged to console for debugging

- [ ] **Zero breaking changes:**
  - Existing features unaffected
  - Database schema unchanged
  - API responses unchanged

---

## Code Reference

**Location:** `public/js/modules/api.js`, line 115 (within `requestServerTime()` function)

**Context (before insertion):**
```javascript
100      if (!response.ok || payload.error) {
101        const message = payload?.message || getMessages().serverTimeError;
102        const errorType = payload?.error || 'UNKNOWN_ERROR';
103
104        // 오류 추적
105        sendEvent('check_time_error', {
106          target_url: targetUrl,
107          error_type: errorType,
108          latency_ms: latencyMs,
109          status_code: response.status
110        });
111
112        handleApiError(message);
113        return;
114      }
115      // ← INSERT NEW CODE HERE
116
117      // RTT/2 보정: 클라이언트-서버 네트워크 지연 보정
118      const clientRTT = endTime - startTime;
119      const adjustedPayload = {
120        ...payload,
121        server_time_estimated_epoch_ms: payload.server_time_estimated_epoch_ms + (clientRTT / 2),
122        client_rtt_ms: clientRTT  // 디버깅용
123      };
124
125      if (onTimeResult) {
126        onTimeResult(adjustedPayload, endTime);
127      }
```

**Code to insert (10 lines):**
```javascript
      // Log url_check event for trending analysis
      const locale = document.documentElement.lang || 'en';
      try {
        sendEvent('url_check', {
          target_url: targetUrl,
          locale,
          latency_ms: latencyMs
        });
      } catch (logError) {
        console.error('Failed to log url_check event:', {
          target_url: targetUrl,
          locale,
          error: logError.message
        });
        // Continue—logging failure should not break the URL check
      }
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Event not appearing in database | Check: 1) URL check succeeded (time displayed) 2) Database exists at `data/app.db` 3) Event logged with correct type name `url_check` |
| Trending list still empty | 1) Verify 5+ url_check events exist in DB 2) Check `/api/trending-urls?locale=ko` response in browser console 3) Trending list refreshes every 5 minutes |
| Wrong locale logged | Verify `document.documentElement.lang` is set correctly on the page (check `<html lang="ko">` in HTML) |
| Error in console | Review error message — should be "Failed to log url_check event". This is normal (logging error), but URL check should still complete |
| Session module not available | Verify `sendEvent` parameter is passed to createApi (check main.js) — should be: `sendEvent: session.sendEvent` |

---

## Rollback Plan

If critical issues arise:

1. Remove the url_check logging block from api.js (the 10 lines added after line 114, typically lines 115-124)
   - Do NOT remove the `click_button` event that appears later (around line 129+)
2. Clear url_check events: `sqlite3 data/app.db "DELETE FROM events WHERE event_type='url_check';"`
3. Restart app
4. Trending sites will show empty state (safe) — no broken functionality

No schema or API changes need to be reverted.
