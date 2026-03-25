# Survey Responses Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement survey response collection by adding data persistence to the survey form endpoints.

**Architecture:** Add survey response save function to repository layer, update POST handlers in app.js to collect form data, validate, hash client IP, and persist to database.

**Tech Stack:** Node.js/Express, Drizzle ORM, SQLite, crypto (built-in)

---

## Task 1: Add Survey Response Save Function to Repository

**Files:**
- Modify: `lib/repository.js` (add import, add function, update exports)

- [ ] **Step 1: Add surveyResponses import at top of file**

Location: Line 8 (after existing imports)

```javascript
const { users, sessions, events, surveyResponses } = require('../db/schema');
```

Update the existing import from:
```javascript
const { users, sessions, events } = require('../db/schema');
```

- [ ] **Step 2: Add survey response save function before module.exports**

Location: Before `module.exports` (around line 230)

```javascript
// ==================== Survey Responses ====================

// 설문 응답 저장
function saveSurveyResponse({ satisfaction, usefulFeature, improvement, additionalFeedback, ipHash }) {
  const db = getDb();
  const nowIso = new Date().toISOString();

  db.insert(surveyResponses).values({
    satisfaction: parseInt(satisfaction, 10),
    usefulFeature,
    improvement: improvement || null,
    additionalFeedback: additionalFeedback || null,
    ipHash,
    createdAt: nowIso
  }).run();
}
```

- [ ] **Step 3: Add saveSurveyResponse to module.exports**

Location: In `module.exports` object, add:

```javascript
  saveSurveyResponse,
```

Complete updated exports should be:
```javascript
module.exports = {
  upsertUser,
  ensureSession,
  logEvent,
  getAnalyticsUsers,
  getAnalyticsEvents,
  getAnalyticsDevices,
  getAnalyticsUrls,
  getAnalyticsEventsByType,
  getAnalyticsPerformance,
  getTopUrls,
  getHourlyStats,
  getTotalChecks,
  getUniqueUrlsCount,
  getTodayChecks,
  saveSurveyResponse
};
```

- [ ] **Step 4: Verify changes**

Run: `node -c lib/repository.js`
Expected: Exit code 0 (no syntax errors)

- [ ] **Step 5: Commit**

```bash
git add lib/repository.js
git commit -m "feat: add survey response save function to repository"
```

---

## Task 2: Add IP Hashing Utility Import to app.js

**Files:**
- Modify: `app.js` (add import for identity utilities)

- [ ] **Step 1: Find where requires are in app.js**

Run: `grep -n "const.*require" app.js | head -20`
Expected: See all require statements at the top

- [ ] **Step 2: Add identity import after existing requires**

Add this line (after other require statements, e.g., after line ~40):

```javascript
const { hashIp, normalizeIp } = require('./lib/identity');
```

- [ ] **Step 3: Add repository import if not already present**

Check if repository is already imported:
```bash
grep "const.*repository\|require.*repository" app.js
```

If not present, add:
```javascript
const repository = require('./lib/repository');
```

- [ ] **Step 4: Verify syntax**

Run: `node -c app.js`
Expected: Exit code 0

- [ ] **Step 5: Commit**

```bash
git add app.js
git commit -m "feat: import survey response dependencies in app.js"
```

---

## Task 3: Implement English Survey POST Handler

**Files:**
- Modify: `app.js` (replace /en/survey POST handler, around line 798-804)

- [ ] **Step 1: Replace the /en/survey POST handler**

Find and replace the `/en/survey` POST handler (around line 798):

Replace this:
```javascript
app.post('/en/survey', async (req, res) => {
  // TODO: Save survey response to DB
  res.render('survey', {
    domain: DOMAIN,
    locale: 'en',
    submitted: true
  });
});
```

With this:
```javascript
app.post('/en/survey', async (req, res) => {
  try {
    const { satisfaction, usefulFeature, improvement, additionalFeedback } = req.body;

    // Validate required fields
    if (!satisfaction || !usefulFeature) {
      return res.status(400).render('survey', {
        domain: DOMAIN,
        locale: 'en',
        submitted: false,
        error: 'Missing required fields'
      });
    }

    // Validate satisfaction is 1-5
    const satNum = parseInt(satisfaction, 10);
    if (isNaN(satNum) || satNum < 1 || satNum > 5) {
      return res.status(400).render('survey', {
        domain: DOMAIN,
        locale: 'en',
        submitted: false,
        error: 'Invalid satisfaction rating'
      });
    }

    // Get client IP and hash it
    const clientIp = normalizeIp(req.ip || req.connection.remoteAddress);
    const ipHash = hashIp(clientIp);

    // Save to database
    repository.saveSurveyResponse({
      satisfaction,
      usefulFeature,
      improvement: improvement || null,
      additionalFeedback: additionalFeedback || null,
      ipHash
    });

    res.render('survey', {
      domain: DOMAIN,
      locale: 'en',
      submitted: true
    });
  } catch (error) {
    console.error('Error saving survey response:', error);
    res.status(500).render('survey', {
      domain: DOMAIN,
      locale: 'en',
      submitted: false,
      error: 'Failed to save response. Please try again.'
    });
  }
});
```

- [ ] **Step 2: Verify no syntax errors**

Run: `node -c app.js`
Expected: Exit code 0

- [ ] **Step 3: Commit**

```bash
git add app.js
git commit -m "feat: implement English survey POST handler with validation and DB save"
```

---

## Task 4: Implement Korean Survey POST Handler

**Files:**
- Modify: `app.js` (replace /ko/survey POST handler, around line 815-821)

- [ ] **Step 1: Replace the /ko/survey POST handler**

Find and replace the `/ko/survey` POST handler (around line 815):

Replace this:
```javascript
app.post('/ko/survey', async (req, res) => {
  // TODO: Save survey response to DB
  res.render('survey', {
    domain: DOMAIN,
    locale: 'ko',
    submitted: true
  });
});
```

With this:
```javascript
app.post('/ko/survey', async (req, res) => {
  try {
    const { satisfaction, usefulFeature, improvement, additionalFeedback } = req.body;

    // Validate required fields
    if (!satisfaction || !usefulFeature) {
      return res.status(400).render('survey', {
        domain: DOMAIN,
        locale: 'ko',
        submitted: false,
        error: '필수 항목을 입력해주세요'
      });
    }

    // Validate satisfaction is 1-5
    const satNum = parseInt(satisfaction, 10);
    if (isNaN(satNum) || satNum < 1 || satNum > 5) {
      return res.status(400).render('survey', {
        domain: DOMAIN,
        locale: 'ko',
        submitted: false,
        error: '만족도는 1-5 사이의 값이어야 합니다'
      });
    }

    // Get client IP and hash it
    const clientIp = normalizeIp(req.ip || req.connection.remoteAddress);
    const ipHash = hashIp(clientIp);

    // Save to database
    repository.saveSurveyResponse({
      satisfaction,
      usefulFeature,
      improvement: improvement || null,
      additionalFeedback: additionalFeedback || null,
      ipHash
    });

    res.render('survey', {
      domain: DOMAIN,
      locale: 'ko',
      submitted: true
    });
  } catch (error) {
    console.error('Error saving survey response:', error);
    res.status(500).render('survey', {
      domain: DOMAIN,
      locale: 'ko',
      submitted: false,
      error: '응답 저장에 실패했습니다. 다시 시도해주세요'
    });
  }
});
```

- [ ] **Step 2: Verify syntax**

Run: `node -c app.js`
Expected: Exit code 0

- [ ] **Step 3: Commit**

```bash
git add app.js
git commit -m "feat: implement Korean survey POST handler with validation and DB save"
```

---

## Task 5: Implement Japanese Survey POST Handler

**Files:**
- Modify: `app.js` (replace /jp/survey POST handler, around line 832-838)

- [ ] **Step 1: Replace the /jp/survey POST handler**

Find and replace the `/jp/survey` POST handler (around line 832):

Replace this:
```javascript
app.post('/jp/survey', async (req, res) => {
  // TODO: Save survey response to DB
  res.render('survey', {
    domain: DOMAIN,
    locale: 'jp',
    submitted: true
  });
});
```

With this:
```javascript
app.post('/jp/survey', async (req, res) => {
  try {
    const { satisfaction, usefulFeature, improvement, additionalFeedback } = req.body;

    // Validate required fields
    if (!satisfaction || !usefulFeature) {
      return res.status(400).render('survey', {
        domain: DOMAIN,
        locale: 'jp',
        submitted: false,
        error: '必須項目を入力してください'
      });
    }

    // Validate satisfaction is 1-5
    const satNum = parseInt(satisfaction, 10);
    if (isNaN(satNum) || satNum < 1 || satNum > 5) {
      return res.status(400).render('survey', {
        domain: DOMAIN,
        locale: 'jp',
        submitted: false,
        error: '満足度は1〜5の値である必要があります'
      });
    }

    // Get client IP and hash it
    const clientIp = normalizeIp(req.ip || req.connection.remoteAddress);
    const ipHash = hashIp(clientIp);

    // Save to database
    repository.saveSurveyResponse({
      satisfaction,
      usefulFeature,
      improvement: improvement || null,
      additionalFeedback: additionalFeedback || null,
      ipHash
    });

    res.render('survey', {
      domain: DOMAIN,
      locale: 'jp',
      submitted: true
    });
  } catch (error) {
    console.error('Error saving survey response:', error);
    res.status(500).render('survey', {
      domain: DOMAIN,
      locale: 'jp',
      submitted: false,
      error: '応答の保存に失敗しました。もう一度やり直してください'
    });
  }
});
```

- [ ] **Step 2: Verify syntax**

Run: `node -c app.js`
Expected: Exit code 0

- [ ] **Step 3: Commit**

```bash
git add app.js
git commit -m "feat: implement Japanese survey POST handler with validation and DB save"
```

---

## Task 6: Implement Chinese (Traditional) Survey POST Handler

**Files:**
- Modify: `app.js` (replace /zh-tw/survey POST handler, around line 849-855)

- [ ] **Step 1: Replace the /zh-tw/survey POST handler**

Find and replace the `/zh-tw/survey` POST handler (around line 849):

Replace this:
```javascript
app.post('/zh-tw/survey', async (req, res) => {
  // TODO: Save survey response to DB
  res.render('survey', {
    domain: DOMAIN,
    locale: 'zh-tw',
    submitted: true
  });
});
```

With this:
```javascript
app.post('/zh-tw/survey', async (req, res) => {
  try {
    const { satisfaction, usefulFeature, improvement, additionalFeedback } = req.body;

    // Validate required fields
    if (!satisfaction || !usefulFeature) {
      return res.status(400).render('survey', {
        domain: DOMAIN,
        locale: 'zh-tw',
        submitted: false,
        error: '請填寫必填項目'
      });
    }

    // Validate satisfaction is 1-5
    const satNum = parseInt(satisfaction, 10);
    if (isNaN(satNum) || satNum < 1 || satNum > 5) {
      return res.status(400).render('survey', {
        domain: DOMAIN,
        locale: 'zh-tw',
        submitted: false,
        error: '滿意度必須為 1-5 之間的值'
      });
    }

    // Get client IP and hash it
    const clientIp = normalizeIp(req.ip || req.connection.remoteAddress);
    const ipHash = hashIp(clientIp);

    // Save to database
    repository.saveSurveyResponse({
      satisfaction,
      usefulFeature,
      improvement: improvement || null,
      additionalFeedback: additionalFeedback || null,
      ipHash
    });

    res.render('survey', {
      domain: DOMAIN,
      locale: 'zh-tw',
      submitted: true
    });
  } catch (error) {
    console.error('Error saving survey response:', error);
    res.status(500).render('survey', {
      domain: DOMAIN,
      locale: 'zh-tw',
      submitted: false,
      error: '保存回應失敗，請重試'
    });
  }
});
```

- [ ] **Step 2: Verify syntax**

Run: `node -c app.js`
Expected: Exit code 0

- [ ] **Step 3: Commit**

```bash
git add app.js
git commit -m "feat: implement Traditional Chinese survey POST handler with validation and DB save"
```

---

## Task 7: Verify Implementation

**Files:**
- Test: Survey form submission
- Verify: Database persistence

- [ ] **Step 1: Start the application**

Run: `npm start` or however the app is normally started
Expected: Server starts without errors

- [ ] **Step 2: Test survey form submission (English)**

1. Navigate to `http://localhost:PORT/en/survey`
2. Fill out the form:
   - Satisfaction: Select any rating (1-5)
   - Useful Feature: Select any option
   - Improvement: (optional) Add some text
   - Additional Feedback: (optional) Add some text
3. Submit the form
4. Verify: Success page appears with "Thank you!"

- [ ] **Step 3: Verify data was saved to database**

Run:
```bash
sqlite3 db/database.db "SELECT * FROM survey_responses ORDER BY created_at DESC LIMIT 1;"
```

Expected:
- One row with satisfaction, usefulFeature, improvement, additionalFeedback, ipHash, and createdAt values
- ipHash is a 64-character hex string (SHA-256)
- createdAt is ISO 8601 timestamp

- [ ] **Step 4: Test validation - missing satisfaction**

1. Navigate to survey page
2. Skip satisfaction and try to submit
3. Expected: Error message shown, form stays on page

- [ ] **Step 5: Test validation - invalid satisfaction value**

1. Use browser dev tools to inject satisfaction = "10" into form
2. Submit form
3. Expected: Validation catches it and shows error

- [ ] **Step 6: Test Korean survey**

1. Navigate to `http://localhost:PORT/ko/survey`
2. Fill and submit form
3. Verify success page displays in Korean
4. Check database for new row

- [ ] **Step 7: Commit verification**

```bash
git add docs/superpowers/plans/2026-03-25-survey-responses.md
git commit -m "docs: complete survey responses implementation plan and verification"
```

---

## Summary

This plan implements survey response persistence by:
1. Adding `saveSurveyResponse()` function to the repository layer
2. Implementing POST handlers for all 4 language variants
3. Adding client IP hashing for duplicate prevention
4. Including form validation for required fields
5. Providing localized error messages
6. Comprehensive error handling with try-catch

All tasks follow TDD/DDD patterns, with frequent commits to maintain reversibility.
