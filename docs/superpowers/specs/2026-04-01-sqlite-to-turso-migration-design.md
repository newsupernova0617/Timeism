# SQLite to Turso Migration Design

**Date:** 2026-04-01  
**Project:** SyncTime  
**Author:** Claude Code Brainstorming  
**Status:** Design Approved  

---

## Executive Summary

Migrate SyncTime's database from SQLite (better-sqlite3) to Turso (managed SQLite service) to improve multi-environment developer experience. This enables seamless dev/staging/prod database separation without manual file management. Migration is phased: local development first, then production after validation. No data preservation required (starting fresh).

---

## Current State

| Aspect | Details |
|--------|---------|
| **DB Engine** | SQLite (better-sqlite3 v12.5.0) |
| **ORM** | Drizzle ORM v0.45.1 |
| **Tables** | 5 (users, sessions, events, comments, survey_responses) |
| **Data Size** | ~163KB (local development data) |
| **Deployment** | Railway (production SQLite file mounted) |
| **Dev/Prod** | No separate instances; both use local/mounted SQLite |
| **Pragmas** | WAL mode, NORMAL sync, 20MB cache, memory-mapped I/O |

---

## Target State

| Aspect | Details |
|--------|---------|
| **DB Engine** | Turso (managed SQLite via LibSQL protocol) |
| **ORM** | Drizzle ORM v0.45.1 (unchanged) |
| **Tables** | 5 (same schema, no changes) |
| **Data Size** | Starting fresh (no historical data migrated) |
| **Deployment** | Railway with Turso cloud databases |
| **Dev/Prod** | Separate Turso instances: `synctime-dev` and `synctime-prod` |
| **Connection** | LibSQL protocol via environment variables |

---

## Architecture

### Database Setup

Two separate Turso databases will be created:

```
Turso Organization
├── synctime-dev (development)
│   ├── Connection URL: libsql://synctime-dev-xxxxx.turso.io
│   ├── Auth token: <dev_token>
│   └── Schema: users, sessions, events, comments, survey_responses
│
└── synctime-prod (production)
    ├── Connection URL: libsql://synctime-prod-xxxxx.turso.io
    ├── Auth token: <prod_token>
    └── Schema: users, sessions, events, comments, survey_responses
```

### Connection Layer Changes

**File: `db/index.js`**

Current implementation:
```javascript
const Database = require('better-sqlite3');
const { drizzle } = require('drizzle-orm/better-sqlite3');
```

New implementation:
```javascript
const { createClient } = require('@libsql/client');
const { drizzle } = require('drizzle-orm/libsql');

function getSqlite() {
  // Turso client (replaces better-sqlite3)
  const client = createClient({
    url: process.env.TURSO_CONNECTION_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
  });
  return client;
}
```

**Key points:**
- `getDb()` and `getSqlite()` function signatures remain identical
- Routes and repositories use these functions; no consumer code changes needed
- Drizzle ORM abstraction handles the swap transparently
- Async behavior of LibSQL is compatible with Drizzle's query interface

### Schema Compatibility

The Drizzle ORM schema in `db/schema.js` requires **no changes**:
- Turso is SQLite-compatible (100% SQL compatibility)
- All table definitions (users, sessions, events, comments, survey_responses) work as-is
- Indexes are supported
- Foreign keys are supported
- Types (TEXT, INTEGER, DATETIME) map identically

### Environment Variables

**.env (local development):**
```
TURSO_CONNECTION_URL=libsql://synctime-dev-xxxxx.turso.io
TURSO_AUTH_TOKEN=<dev_auth_token>
```

**Railway Secrets (production):**
```
TURSO_CONNECTION_URL=libsql://synctime-prod-xxxxx.turso.io
TURSO_AUTH_TOKEN=<prod_auth_token>
```

---

## Code Changes

### 1. Dependencies

**Remove:**
- `better-sqlite3` (no longer needed after migration)

**Add:**
- `@libsql/client` (Turso client library)

**Keep:**
- `drizzle-orm` (schema layer, unchanged)
- All other dependencies unchanged

**Package.json scripts (no changes needed):**
- `npm run db:init` — simplified, no local file creation
- `npm run db:push` — works with Turso
- `npm run db:studio` — works with Turso

### 2. Database Connection Module (`db/index.js`)

**Changes:**
- Replace `better-sqlite3` import with `@libsql/client`
- Replace Drizzle's `better-sqlite3` driver with `libsql` driver
- Update `getSqlite()` to create Turso client
- Remove SQLite pragma optimizations (server-side on Turso)
- Remove WAL mode setup (not applicable; Turso manages this)
- Remove data directory creation logic

**Removed code:**
```javascript
// No longer needed
sqliteInstance.pragma('journal_mode = WAL');
sqliteInstance.pragma('synchronous = NORMAL');
sqliteInstance.pragma('cache_size = -20000');
sqliteInstance.pragma('mmap_size = 268435456');
```

### 3. Database Initialization (`db/init.js`)

**Changes:**
- Simplify schema creation (no local file creation)
- Keep SQL table creation logic (identical to SQLite)
- Run `npm run db:init` to create schema in Turso

**No changes to:**
- Table/index SQL definitions
- Function signatures
- Export structure

### 4. Everything Else (Unchanged)

**These require NO changes:**
- `db/schema.js` — Drizzle schema definition (Turso-compatible)
- `lib/repository.js` — data access layer
- `lib/comment-repository.js` — comment CRUD
- `routes/api.js` — API endpoints
- `routes/analytics.js` — analytics queries
- `routes/comments.js` — comment routes
- `app.js` — main application file
- All business logic

The Drizzle ORM abstraction isolates the database driver change from consumer code.

### 5. Removed/Cleaned Up

**Delete:**
- `data/app.db` (local SQLite file)
- `data/app.db-shm` (WAL shared memory)
- `data/app.db-wal` (WAL log)
- Directory references in code (e.g., `DATA_DIR` in `db/index.js`)

**Keep:**
- `data/backups/` directory (if backup system uses this; otherwise can clean up)

---

## Migration Workflow

### Phase A: Local Development Setup (Week 1)

**Prerequisites:**
1. Sign up for Turso account (turso.tech)
2. Create Turso database: `synctime-dev`
3. Generate auth token for dev database
4. Get connection string (format: `libsql://synctime-dev-xxxxx.turso.io`)

**Implementation steps:**
1. Install `@libsql/client`: `npm install @libsql/client`
2. Uninstall `better-sqlite3`: `npm uninstall better-sqlite3`
3. Update `db/index.js` to use Turso client (see Code Changes above)
4. Add `.env` variables: `TURSO_CONNECTION_URL` and `TURSO_AUTH_TOKEN`
5. Run `npm run db:init` to create schema in Turso dev database
6. Start local dev server: `npm run dev`
7. Verify: app starts, no connection errors in logs

**Deliverables:**
- Turso dev database created
- `db/index.js` updated
- `.env` configured for dev
- Schema initialized in Turso

### Phase B: Local Testing & Validation (Week 2-3)

**Testing scope:**
- All CRUD operations for 5 tables
- Form submissions (URL input) → events
- Comments creation and retrieval
- Survey responses
- Admin analytics queries
- Session tracking (users/sessions relationship)
- Multi-language support (locale column)
- Backup system integration (if applicable)

**Test checklist:**
- [ ] App starts without errors
- [ ] Submit URL → event logged in DB
- [ ] Create comment → appears in DB
- [ ] Submit survey → response saved
- [ ] Admin dashboards load (analytics)
- [ ] Rate limiting works
- [ ] Sessions track correctly
- [ ] All 4 locales (en, ko, jp, zh-tw) supported
- [ ] Concurrent requests handled correctly

**Success criteria:**
- Zero database errors in logs
- All CRUD operations complete
- Query performance acceptable (<100ms typical)
- No auth/connection timeouts

**Deliverables:**
- Tested and validated local development environment
- Any issues discovered and documented
- Code ready for production deployment

### Phase C: Production Deployment & Cutover (Week 4+)

**Prerequisites:**
1. Create Turso database: `synctime-prod`
2. Generate auth token for prod database
3. Get connection string

**Implementation steps:**
1. Deploy current code to Railway (which uses production environment variables)
2. Add Railway secrets:
   - `TURSO_CONNECTION_URL`: production Turso connection
   - `TURSO_AUTH_TOKEN`: production auth token
3. Trigger Railway deployment (code no longer changes; just env vars)
4. Verify production connection: check logs for errors
5. Run `npm run db:init` on production (via one-off dyno or manual connection)
6. Smoke test: verify analytics, create test comment, check logs
7. Monitor for 1 week: watch for any issues

**Monitoring:**
- No `libsql` errors in Railway logs
- Query latency acceptable
- No auth failures
- Analytics/admin dashboards working

**Success criteria:**
- Production Turso database functional
- All queries working
- No data loss (we're starting fresh, so no migration loss)
- Stable for 1 week

**Rollback plan (if needed):**
1. Revert code: `git revert <turso-migration-commit>`
2. Re-add `better-sqlite3` to dependencies
3. Revert `db/index.js` to use better-sqlite3
4. Deploy to Railway
5. Railway restarts with SQLite (requires mounted file; may need manual recovery)

Rollback is simple but requires re-establishing SQLite infrastructure on Railway.

---

## Testing & Validation

### Local Testing Checklist

**Database Connectivity:**
- [ ] App starts without SQLite errors
- [ ] No connection timeouts
- [ ] Turso auth token validated

**Core Features:**
- [ ] Form submission (check server time) → creates event in DB
- [ ] View stored events in database
- [ ] Comments creation and display
- [ ] Survey response submission and storage
- [ ] Admin analytics dashboard loads and shows data
- [ ] Rate limiting still functions (no DB-related failures)

**Data Integrity:**
- [ ] User creation and session tracking
- [ ] Sessions table records start_at and end_at correctly
- [ ] Events table stores latency_ms, locale, timestamp
- [ ] Comments stored with author, content, ip_hash
- [ ] Survey responses stored with satisfaction rating

**Multi-Language Support:**
- [ ] Locale column in events (en, ko, jp, zh-tw) populated
- [ ] All 4 language versions of app work
- [ ] i18n module functions correctly with Turso

**Edge Cases:**
- [ ] Concurrent requests don't cause errors
- [ ] Large text submissions (comments, feedback) stored correctly
- [ ] Null/empty values handled gracefully
- [ ] Duplicate prevention (IP hash tracking)

### Production Readiness Checks

**Before cutover:**
- [ ] Turso prod database created and accessible
- [ ] Auth tokens added to Railway secrets
- [ ] Schema initialized in prod via `db:init`
- [ ] Logs show no connection issues

**After deployment:**
- [ ] Production queries execute successfully
- [ ] Latency within acceptable range (<100ms typical)
- [ ] No errors related to LibSQL or auth
- [ ] Analytics queries work
- [ ] Admin moderation works
- [ ] Backup system compatible with Turso (if applicable)

**Monitoring (first week):**
- Daily check of Railway logs for errors
- Verify query patterns executing correctly
- Check analytics dashboard functionality
- Monitor for any data consistency issues

### Success Criteria

✅ **All criteria must be met before considering migration complete:**

1. **Connectivity:** No unresolved connection, auth, or timeout errors
2. **Data Operations:** All CRUD operations work across 5 tables
3. **Feature Completeness:** All app features function identically to SQLite version
4. **Performance:** Query latency acceptable (typically <100ms from US)
5. **Stability:** Production running for 1 week without issues
6. **No Regressions:** Analytics, comments, sessions, events all work as before

---

## Risk Mitigation

### Known Risks

| Risk | Impact | Mitigation |
|------|--------|-----------|
| **Turso connection latency** | Slow queries | Test locally with realistic data volume; typical latency <100ms US |
| **Auth token rotation/expiry** | Production downtime | Store tokens securely in Railway secrets; document renewal process |
| **Network connectivity (app → Turso)** | Intermittent failures | Implement retry logic in Drizzle/LibSQL config |
| **Concurrent connections limit** | Query failures under load | Turso's free tier: 100 concurrent; monitor and upgrade if needed |
| **Migration incomplete schema** | Data loss | Run `npm run db:init` and verify all 5 tables created before testing |

### Contingency Plans

**If local testing fails:**
- Revert `db/index.js` changes
- Reinstall `better-sqlite3`
- Investigate specific error (connection URL, auth token)
- Try again after fixing configuration

**If production has issues:**
- Use rollback plan (revert code, re-add better-sqlite3)
- Requires manual re-establishment of SQLite on Railway
- Keep SQLite file available for quick recovery if needed

**If query performance is unacceptable:**
- Check query patterns in logs
- Optimize slow queries (indexes, query structure)
- Consider upgrading Turso plan if hitting limits

---

## Dependencies

### New Packages to Install

```json
{
  "@libsql/client": "^latest"
}
```

### Packages to Remove

```json
{
  "better-sqlite3": "^12.5.0"
}
```

### Updated npm scripts

No changes needed — `db:push`, `db:studio`, `db:init` work with Turso.

---

## Files Modified/Created

### Modified:
- `db/index.js` — swap better-sqlite3 for Turso client
- `db/init.js` — simplify local file creation logic
- `package.json` — replace better-sqlite3 with @libsql/client
- `.env` — add TURSO_CONNECTION_URL and TURSO_AUTH_TOKEN

### Deleted:
- `data/app.db` (local SQLite file)
- `data/app.db-shm` (WAL shared memory file)
- `data/app.db-wal` (WAL log file)

### Unchanged (no code changes needed):
- `db/schema.js`
- `lib/repository.js`
- `lib/comment-repository.js`
- `routes/api.js`
- `routes/analytics.js`
- `routes/comments.js`
- `app.js`
- All other business logic

---

## Turso Account Setup (Manual Steps)

These are prerequisites before implementation begins:

1. **Create Turso account:** turso.tech
2. **Create `synctime-dev` database:**
   - CLI: `turso db create synctime-dev`
   - Get connection URL and token
3. **Create `synctime-prod` database:**
   - CLI: `turso db create synctime-prod`
   - Get connection URL and token
4. **Store credentials securely:**
   - Dev: `.env` local file
   - Prod: Railway secrets (never commit to git)

---

## Timeline

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| **A: Setup** | Week 1 | Local dev environment with Turso |
| **B: Testing** | Weeks 2-3 | Validated local environment, test results |
| **C: Production** | Week 4+ | Production database, deployment, monitoring |

Total: ~4 weeks with continuous validation before full cutover.

---

## Success Definition

Migration is **complete** when:
1. ✅ Local development uses Turso (`synctime-dev`)
2. ✅ All app features tested and working
3. ✅ Production deployed to Turso (`synctime-prod`)
4. ✅ Production stable for 1 week
5. ✅ Better-sqlite3 fully removed from codebase and production
6. ✅ All team members updated on new multi-environment setup

---

## Post-Migration

### Maintenance
- Monitor Railway logs for Turso errors (monthly)
- Keep Turso connection strings in Railway secrets updated
- Document backup/restore procedures if needed

### Future Improvements
- Set up automated backups from Turso (if mission-critical data develops)
- Monitor query performance and optimize as needed
- Evaluate Turso plan tier if approaching limits

---

## Appendix: Turso vs SQLite Overview

| Feature | SQLite | Turso |
|---------|--------|-------|
| **Type** | Embedded DB | Managed SQLite (cloud) |
| **Connection** | File-based | Network (LibSQL) |
| **Multi-env** | Manual file management | Built-in per-database |
| **Scaling** | Limited (single file) | Scalable (cloud-managed) |
| **Cost** | $0 (disk space) | Free tier: 5 DB, then paid |
| **Backups** | Manual | Optional (Turso feature) |
| **Compatibility** | 100% SQLite SQL | 100% SQLite SQL (LibSQL protocol) |
| **Latency** | Instant (local) | <100ms typical (network) |

Turso's main advantage for this project: **separate dev/prod databases without file management**.

