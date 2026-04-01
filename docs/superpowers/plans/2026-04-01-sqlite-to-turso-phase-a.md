# SQLite to Turso Migration - Phase A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up local development environment with Turso dev database, replace SQLite with LibSQL client, and verify connectivity.

**Architecture:** Swap better-sqlite3 with @libsql/client in db/index.js, update dependencies, initialize schema in Turso dev database, verify with manual testing.

**Tech Stack:** Node.js/Express, Drizzle ORM, Turso (LibSQL), @libsql/client

**Duration:** ~2 hours hands-on time (excluding waiting for npm installs)

---

## Prerequisites (Manual Setup - Do Before Starting Tasks)

These steps must be completed before beginning the implementation tasks:

1. **Create Turso account:** Visit https://turso.tech and sign up
2. **Create `synctime-dev` database:**
   ```bash
   turso db create synctime-dev
   ```
3. **Get connection string:** Run `turso db show synctime-dev` and copy the `Connection URL` (format: `libsql://synctime-dev-xxxxx.turso.io`)
4. **Get auth token:** Run `turso db tokens create synctime-dev` and copy the token
5. **Have these ready:** You'll need both the connection URL and auth token for Task 5

---

## File Structure

**Files to modify:**
- `package.json` — update dependencies
- `db/index.js` — swap SQLite client for Turso
- `db/init.js` — remove local file creation logic
- `.env.example` — document new environment variables
- `.env` — (local only, not committed) add Turso credentials

**Files to delete:**
- `data/app.db` — local SQLite database
- `data/app.db-shm` — SQLite WAL shared memory
- `data/app.db-wal` — SQLite WAL log

**Files unchanged:**
- `db/schema.js` — Drizzle schema (100% compatible with Turso)
- All routes, repositories, and app.js

---

## Implementation Tasks

### Task 1: Update package.json dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Remove better-sqlite3 from dependencies**

Open `package.json` and locate the `dependencies` section. Find the line:
```json
"better-sqlite3": "^12.5.0",
```

Delete this entire line. Your dependencies should now look like:
```json
"dependencies": {
  "@aws-sdk/client-s3": "^3.1016.0",
  "compression": "^1.8.1",
  "dotenv": "^17.2.3",
  "drizzle-orm": "^0.45.1",
  ...
}
```

- [ ] **Step 2: Add @libsql/client to dependencies**

In the same `dependencies` section, add the new package. Insert this line in alphabetical order (after `@aws-sdk/`):
```json
"@libsql/client": "^0.6.0",
```

Your dependencies should now include both `@aws-sdk/client-s3` and `@libsql/client` at the top.

- [ ] **Step 3: Verify package.json syntax**

Run: `node -e "require('./package.json')"`
Expected: No output (valid JSON)

- [ ] **Step 4: Commit changes**

```bash
git add package.json
git commit -m "deps: Replace better-sqlite3 with @libsql/client for Turso support"
```

---

### Task 2: Update db/index.js - Part 1: Replace imports

**Files:**
- Modify: `db/index.js` (lines 1-10)

- [ ] **Step 1: Locate the imports section**

Open `db/index.js`. The first 10 lines should look like:
```javascript
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { drizzle } = require('drizzle-orm/better-sqlite3');
const schema = require('./schema');
```

- [ ] **Step 2: Replace better-sqlite3 imports**

Change lines 3-4 from:
```javascript
const Database = require('better-sqlite3');
const { drizzle } = require('drizzle-orm/better-sqlite3');
```

To:
```javascript
const { createClient } = require('@libsql/client');
const { drizzle } = require('drizzle-orm/libsql');
```

After this change, the file should start with:
```javascript
const fs = require('fs');
const path = require('path');
const { createClient } = require('@libsql/client');
const { drizzle } = require('drizzle-orm/libsql');
const schema = require('./schema');
```

- [ ] **Step 3: Verify the file syntax**

Run: `node -c db/index.js`
Expected: No output (syntax check passes)

---

### Task 3: Update db/index.js - Part 2: Rewrite getSqlite() function

**Files:**
- Modify: `db/index.js` (lines 19-77)

- [ ] **Step 1: Locate the getSqlite() function**

Find the function starting at line 19:
```javascript
function getSqlite() {
  if (!sqliteInstance) {
    ensureDataDirectory();
    sqliteInstance = new Database(DB_PATH);
    // ... pragmas follow ...
  }
  return sqliteInstance;
}
```

- [ ] **Step 2: Replace entire getSqlite() function**

Delete everything from line 19 to line 77 (the entire function and all pragma settings). Replace with:

```javascript
function getSqlite() {
  if (!sqliteInstance) {
    const url = process.env.TURSO_CONNECTION_URL;
    const token = process.env.TURSO_AUTH_TOKEN;

    if (!url || !token) {
      throw new Error(
        'Missing Turso credentials. Set TURSO_CONNECTION_URL and TURSO_AUTH_TOKEN in .env'
      );
    }

    sqliteInstance = createClient({
      url,
      authToken: token
    });
  }
  return sqliteInstance;
}
```

After this change, your file should have:
- Removed: `ensureDataDirectory()` call
- Removed: All pragma configurations (WAL, synchronous, cache_size, mmap_size, etc.)
- Removed: `new Database(DB_PATH)` instantiation
- Added: Turso client creation with environment variables

- [ ] **Step 3: Verify syntax**

Run: `node -c db/index.js`
Expected: No output (syntax valid)

---

### Task 4: Update db/index.js - Part 3: Remove ensureDataDirectory() function

**Files:**
- Modify: `db/index.js`

- [ ] **Step 1: Remove the ensureDataDirectory() function**

Find this function (should be around line 12):
```javascript
// 데이터 디렉토리 확인 및 생성
function ensureDataDirectory() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}
```

Delete the entire function.

- [ ] **Step 2: Remove unused imports**

Since we no longer need `fs` or `path`, check if they're used elsewhere in the file:
- If `fs` is not used elsewhere, remove: `const fs = require('fs');`
- If `path` is not used elsewhere, remove: `const path = require('path');`

Look through the rest of the file:
- `path.join()`, `path.resolve()` should not appear
- `fs.existsSync()`, `fs.mkdirSync()` should not appear

If the file is clean, remove both imports from the top.

The updated top of the file should be:
```javascript
const { createClient } = require('@libsql/client');
const { drizzle } = require('drizzle-orm/libsql');
const schema = require('./schema');
```

- [ ] **Step 3: Remove unused constants**

Find and remove these constants (they're no longer needed):
```javascript
const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'app.db');
```

They should not appear in the updated file.

- [ ] **Step 4: Verify final syntax**

Run: `node -c db/index.js`
Expected: No output

- [ ] **Step 5: Commit**

```bash
git add db/index.js
git commit -m "refactor: Replace SQLite client with Turso LibSQL client

- Remove better-sqlite3 instantiation
- Remove SQLite pragma optimizations
- Add Turso client creation with env vars
- Remove local file/directory creation logic"
```

---

### Task 5: Update db/init.js - Simplify for Turso

**Files:**
- Modify: `db/init.js` (lines 10-28)

- [ ] **Step 1: Locate the initDb() function**

Find the function starting around line 22:
```javascript
function initDb() {
  const db = getSqlite();

  // SQL 실행: 테이블 및 인덱스 생성
  // Drizzle ORM은 자동으로 테이블을 생성하지 않으므로 수동 실행 필요
  db.exec(`
    -- ... SQL follows ...
  `);

  console.log(`✅ SQLite database initialized at ${DB_PATH}`);
}
```

- [ ] **Step 2: Update the console.log message**

Change this line:
```javascript
console.log(`✅ SQLite database initialized at ${DB_PATH}`);
```

To:
```javascript
console.log(`✅ Turso database schema initialized`);
```

(We're removing the file path since Turso is cloud-based, not file-based.)

- [ ] **Step 3: Verify the SQL remains unchanged**

The SQL commands inside `db.exec()` should remain **exactly the same**. They create the same tables and indexes. Verify these are still present:
- CREATE TABLE users
- CREATE TABLE sessions
- CREATE TABLE events
- CREATE TABLE comments
- CREATE TABLE survey_responses
- All CREATE INDEX statements

(No changes to the SQL itself.)

- [ ] **Step 4: Verify syntax**

Run: `node -c db/init.js`
Expected: No output

- [ ] **Step 5: Commit**

```bash
git add db/init.js
git commit -m "refactor: Update db initialization for Turso

- Remove file-based initialization logging
- Keep SQL schema unchanged (Turso compatible)"
```

---

### Task 6: Update .env.example with new variables

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Open .env.example**

This file documents what environment variables are needed. It should currently have entries like:
```
PORT=3000
DOMAIN=https://synctime.keero.site
NODE_ENV=development
ADMIN_TOKEN=admin_secret_token_change_me
...
```

- [ ] **Step 2: Add Turso environment variables**

Add these two lines to the file (at the end, or after PORT/DOMAIN):
```
# Turso database configuration
TURSO_CONNECTION_URL=libsql://synctime-dev-xxxxx.turso.io
TURSO_AUTH_TOKEN=your_auth_token_here
```

- [ ] **Step 3: Verify file**

The file should now list both old (DOMAIN, etc.) and new (TURSO_*) variables.

- [ ] **Step 4: Commit**

```bash
git add .env.example
git commit -m "docs: Add Turso environment variables to .env.example"
```

---

### Task 7: Configure local .env with Turso credentials

**Files:**
- Modify (local only): `.env` — NOT committed

- [ ] **Step 1: Open or create .env file**

If `.env` doesn't exist, create it in the project root. If it exists, open it.

- [ ] **Step 2: Add or update Turso credentials**

Add/update these lines with YOUR credentials (from the prerequisites):
```
TURSO_CONNECTION_URL=libsql://synctime-dev-XXXXX.turso.io
TURSO_AUTH_TOKEN=your_actual_token_here
```

Replace:
- `synctime-dev-XXXXX` with your actual Turso database name
- `your_actual_token_here` with your actual auth token from Turso

**Important:** Do NOT commit this file. It contains secrets.

- [ ] **Step 3: Verify .env is in .gitignore**

Run: `cat .gitignore`
Expected: Should include `.env` in the ignore list

If `.env` is not in `.gitignore`, add it now:
```bash
echo ".env" >> .gitignore
git add .gitignore
git commit -m "chore: Ensure .env is in gitignore"
```

---

### Task 8: Install dependencies

**Files:**
- Modify: `package-lock.json` (generated)

- [ ] **Step 1: Install dependencies**

Run: `npm install`
Expected: Installs @libsql/client, removes better-sqlite3, other packages unchanged

This command will:
- Read `package.json`
- Download @libsql/client and dependencies
- Remove better-sqlite3 from node_modules
- Update `package-lock.json`

- [ ] **Step 2: Verify better-sqlite3 is gone**

Run: `npm list better-sqlite3`
Expected: Output shows "better-sqlite3@not installed" or similar error

- [ ] **Step 3: Verify @libsql/client is installed**

Run: `npm list @libsql/client`
Expected: Output shows "@libsql/client@x.x.x" with a version number

- [ ] **Step 4: Commit**

```bash
git add package-lock.json
git commit -m "build: Update dependencies for Turso migration

- Install @libsql/client@0.6.0
- Remove better-sqlite3"
```

---

### Task 9: Initialize schema in Turso dev database

**Files:**
- No files modified (database operation only)

- [ ] **Step 1: Run the initialization script**

Run: `npm run db:init`
Expected: Output shows `✅ Turso database schema initialized`

This command:
- Reads Turso credentials from `.env`
- Connects to your `synctime-dev` database
- Creates all 5 tables (users, sessions, events, comments, survey_responses)
- Creates all indexes
- Closes connection

- [ ] **Step 2: Verify in Turso**

(Optional) Verify the schema was created:
```bash
turso db shell synctime-dev
```

Then in the Turso shell, run:
```sql
.tables
```

Expected output should list: `comments`, `events`, `sessions`, `survey_responses`, `users`

Type `.exit` to quit the shell.

- [ ] **Step 3: No commit needed**

This is a database state change (not code). No commit required.

---

### Task 10: Start dev server and verify connectivity

**Files:**
- No files modified (verification only)

- [ ] **Step 1: Start the development server**

Run: `npm run dev`
Expected: Server starts without errors, output shows:
```
> nodemon app.js
[nodemon] X.X.X
[nodemon] to restart at any time, type `rs`
[nodemon] watching path(s): *.*
[nodemon] watching extensions: js,json
[nodemon] starting `node app.js`
...
Server started on port 3000
```

- [ ] **Step 2: Verify no Turso connection errors**

Check the logs carefully. You should NOT see:
- `Error: Missing Turso credentials`
- `Error: Failed to connect to Turso`
- `ECONNREFUSED`
- `auth failed`

You SHOULD see successful startup logs.

- [ ] **Step 3: Leave server running**

Keep the server running for the next task. In a new terminal tab, continue to Task 11.

---

### Task 11: Manual functional testing

**Files:**
- No files modified (testing only)

- [ ] **Step 1: Open the app in browser**

Open: `http://localhost:3000`
Expected: SyncTime homepage loads, no connection errors in browser console

- [ ] **Step 2: Test basic functionality - Submit a URL**

In the app:
1. Enter a URL (e.g., `https://google.com`) in the "Check Server Time" form
2. Click "Check" button
3. Observe: Should show the server's time
4. Check dev server logs (terminal): Should show the request was processed

Expected: No database errors in logs like `libsql error` or `unauthorized`

- [ ] **Step 3: Test comments (if available)**

Navigate to a page with comments or use the comment API:
1. Open dev tools (F12)
2. Navigate to `http://localhost:3000` (main page with comments)
3. Try submitting a comment (if comment form exists)
4. Verify comment appears and is saved

Expected: Comment saved in database without errors

- [ ] **Step 4: Test analytics dashboard (admin)**

If applicable, test the admin analytics:
1. Open: `http://localhost:3000/admin?token=admin_secret_token_change_me` (use actual admin token from `.env`)
2. Verify analytics queries work (showing events, statistics)
3. Check dev server logs for any database errors

Expected: Analytics load and display data without errors

- [ ] **Step 5: Stop the dev server**

In the terminal where the server is running:
```
Ctrl + C
```

Expected: Server stops gracefully

- [ ] **Step 6: Verify no errors in logs**

Review the full log output from running the server. There should be NO lines containing:
- `error`
- `Error`
- `ERROR`
- `failed`
- `FAIL`
- Database connection issues

If errors appear, note them and fix in a follow-up task.

---

### Task 12: Delete local SQLite files

**Files:**
- Delete: `data/app.db`
- Delete: `data/app.db-shm`
- Delete: `data/app.db-wal`

- [ ] **Step 1: Remove SQLite database files**

Run:
```bash
rm -f data/app.db data/app.db-shm data/app.db-wal
```

Expected: No output (files deleted)

- [ ] **Step 2: Verify files are gone**

Run: `ls -la data/`
Expected: Only shows `backups/` directory, SQLite files are gone

- [ ] **Step 3: Commit the deletion**

```bash
git add -A
git commit -m "chore: Remove local SQLite database files

- Deleted data/app.db (local SQLite database)
- Deleted data/app.db-shm (WAL shared memory)
- Deleted data/app.db-wal (WAL log)
- Using Turso cloud database from now on"
```

---

### Task 13: Verify git state and final commit

**Files:**
- No files to modify (verification only)

- [ ] **Step 1: Check git status**

Run: `git status`
Expected: Output shows "nothing to commit, working tree clean" (or similar)

All uncommitted changes should be committed. If anything shows as "modified" or "untracked", commit it in a new task.

- [ ] **Step 2: View commit history**

Run: `git log --oneline -10`
Expected: Shows all your phase A commits in order:
1. deps: Replace better-sqlite3 with @libsql/client
2. refactor: Replace SQLite client with Turso LibSQL client
3. refactor: Update db initialization for Turso
4. docs: Add Turso environment variables
5. build: Update dependencies for Turso migration
6. chore: Remove local SQLite database files

- [ ] **Step 3: Summary**

Phase A is complete. You now have:
- ✅ Local development environment using Turso `synctime-dev` database
- ✅ App code migrated from SQLite to LibSQL/Turso
- ✅ Dependencies updated
- ✅ Schema initialized in Turso
- ✅ Basic functionality verified

Proceed to Phase B (testing) when ready.

---

## Success Criteria

Phase A is successful when:

- ✅ All 13 tasks completed with commits
- ✅ `npm run dev` starts without connection errors
- ✅ App loads in browser (http://localhost:3000)
- ✅ Form submission works (URL input → event logged)
- ✅ Comments (if applicable) save to database
- ✅ Admin analytics accessible
- ✅ No database-related errors in logs
- ✅ Turso dev database has 5 tables with data

---

## Troubleshooting

### "Missing Turso credentials" error

**Problem:** Server fails to start with error message about missing credentials

**Solution:**
1. Verify `.env` file exists in project root
2. Verify it contains `TURSO_CONNECTION_URL` and `TURSO_AUTH_TOKEN`
3. Verify values are correct (copy from Turso dashboard)
4. Restart server: `npm run dev`

### "Unauthorized" or auth errors

**Problem:** Server can't authenticate with Turso

**Solution:**
1. Check auth token is correct (regenerate if needed)
2. Verify token matches the database it's trying to access
3. Update `.env` with new token
4. Restart server

### "Failed to connect" or timeout

**Problem:** Server can't reach Turso service

**Solution:**
1. Verify internet connection is working
2. Verify Turso service status (check turso.tech)
3. Verify connection URL is correctly formatted (`libsql://...`)
4. Try pinging Turso: `curl -s https://turso.tech` (should respond)
5. Try again in a few minutes

### "No such table" error

**Problem:** Schema wasn't initialized

**Solution:**
1. Run `npm run db:init` again
2. Verify output shows `✅ Turso database schema initialized`
3. Verify using `turso db shell` that tables exist
4. Restart server

---

## Next Steps

After Phase A completion:
- **Phase B (Week 2-3):** Extended testing, edge cases, performance validation
- **Phase C (Week 4+):** Production database setup and cutover

See: `docs/superpowers/specs/2026-04-01-sqlite-to-turso-migration-design.md` for full context.
