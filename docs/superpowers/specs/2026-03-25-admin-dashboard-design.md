# Admin Dashboard Design Specification

**Date**: 2026-03-25
**Project**: SyncTime Admin Panel
**Approach**: Balanced Architecture (Approach 2)

---

## Overview

Build a comprehensive admin dashboard for SyncTime that provides:
1. **Database Management UI** — Visual interface with search, filters, and CRUD operations across all tables
2. **Backup System** — Manual + automatic SQLite database backups with recovery capability

---

## Architecture

### Directory Structure

```
/home/yj437/coding/Timeism/
├── routes/
│   └── admin.js                    # Admin router (all routes)
├── lib/admin/
│   ├── service.js                  # Database CRUD operations
│   ├── backup.js                   # Backup logic (manual + scheduled)
│   └── validators.js               # Data validation rules
├── views/admin/
│   ├── dashboard.ejs               # Main dashboard layout
│   └── components.ejs              # Reusable UI partials
├── data/
│   └── backups/                    # Backup storage directory
└── app.js                          # Updated to include admin routes
```

### High-Level Data Flow

```
Browser
  ↓
GET /admin                  → Render dashboard.ejs
  ↓
DataTables JS (client)
  ↓
POST /api/admin/tables/:table?search=x&page=1
  ↓
routes/admin.js
  ↓
lib/admin/service.js → listRecords() → db query
  ↓
JSON response → DataTables renders table
```

---

## Core Features

### 1. Admin Dashboard UI

**Main Page: `/admin`**
- Protected by `verifyAdminToken` middleware
- Render `views/admin/dashboard.ejs`
- Navigation tabs for 5 tables:
  - Users
  - Sessions
  - Events
  - Comments
  - Survey Responses

**Table Features (per DataTables.js):**
- Search/filter input
- Sort by any column
- Pagination (10, 25, 50 rows per page)
- Edit button (opens modal with form)
- Delete button (with confirmation)
- Add New Record button (modal form)
- Bulk select + bulk delete (optional enhancement)

**Responsive Design:**
- Works on desktop (primary)
- Mobile-friendly for emergency access

### 2. CRUD Operations

All operations authenticated with admin token.

#### **List Records**
```
GET /api/admin/tables/:tableName?search=query&sortBy=field&sortOrder=asc&page=1&limit=25
Response: {
  data: [...],
  total: 1234,
  page: 1,
  pageSize: 25
}
```

**Rationale:** Standard REST GET for list operations. Query parameters allow easy caching and bookmarking. DataTables will send these params automatically.

#### **Get Single Record**
```
GET /api/admin/:tableName/:id
Response: { ...record }
```

#### **Create Record**
```
POST /api/admin/:tableName
Body: { field1: value1, field2: value2, ... }
Response: { success: true, id: "xxx" }
```

#### **Update Record**
```
PUT /api/admin/:tableName/:id
Body: { field1: newValue, ... }
Response: { success: true }
```

#### **Delete Record**
```
DELETE /api/admin/:tableName/:id
Response: { success: true, deleted: 1 }
```

### 3. Per-Table Configuration

**Schema Reference:** See `/db/schema.js` for exact field types and definitions.

**users table:**
- Fields: `userId` (PK), `ipHash`, `userAgent`, `region`, `deviceType`, `firstVisitAt`, `lastVisitAt`, `visitCount`
- Read all fields
- Editable: `region`, `deviceType`, `visitCount`
- Protected: `userId`, `ipHash`, `userAgent`, `firstVisitAt`, `lastVisitAt` (no edit)
- Delete: Allowed (cascades to sessions/events via foreign key)

**sessions table:**
- Fields: `sessionId` (PK), `userId` (FK), `startAt`, `endAt`
- Read-only view
- Show: `sessionId`, `userId`, `startAt`, `endAt`
- Deletable for cleanup
- Cannot edit (session history is immutable)

**events table:**
- Fields: `eventId` (PK, auto-increment), `sessionId` (FK), `eventType`, `targetUrl`, `latencyMs`, `locale`, `timestamp`
- Read-only view
- Show: `eventId`, `sessionId`, `eventType`, `targetUrl`, `latencyMs`, `locale`, `timestamp`
- Deletable for data cleanup
- Cannot edit (event logs are immutable)

**comments table:**
- Fields: `commentId` (PK, auto-increment), `pageId`, `author`, `content`, `ipHash`, `createdAt`, `isDeleted`, `reportCount`
- Full CRUD for moderation
- Editable: `author`, `content`, `reportCount`
- Protected: `pageId`, `ipHash`, `createdAt`, `commentId` (no edit)
- **Soft delete logic:** `listRecords()` filters `WHERE isDeleted = 0` by default. Show deleted comments in separate tab with restore button (sets `isDeleted = 0`)
- Hard delete only via admin API (removes entirely)

**survey_responses table:**
- Fields: `responseId` (PK, auto-increment), `satisfaction`, `usefulFeature`, `improvement`, `additionalFeedback`, `ipHash`, `createdAt`
- Full CRUD for data management
- All fields editable
- Deletable for GDPR compliance

### 4. Backup System

#### **Manual Backup - Button Trigger**

**UI:**
```html
<button onclick="downloadBackupNow()">Download Backup Now</button>
<button onclick="triggerBackup()">Trigger Manual Backup</button>
<div id="backup-list">
  <!-- List of recent backups with download links -->
</div>
```

**Endpoint:**
```
POST /api/admin/backup/download
Response: File download (synctime-backup-2026-03-25-120000.db)
```

#### **Cron/URL Trigger**

**Endpoint:**
```
GET /api/admin/backup/trigger?token=ADMIN_TOKEN
Response: { success: true, filename: "synctime-backup-...", size: 2048000 }
```

**Usage:** External cron job or monitoring tool can call this:
```bash
# crontab: trigger backup at 2 AM daily
0 2 * * * curl "https://synctime.keero.site/api/admin/backup/trigger?token=YOUR_ADMIN_TOKEN"
```

#### **Automatic Backup (Scheduled)**

**Implementation:**
- Use Node.js `node-cron` or native `setInterval`
- Run at 2 AM UTC daily (configurable via env var `BACKUP_SCHEDULE`)
- Create backup file in `/data/backups/`
- Auto-delete backups older than 7 days (keep last 7)

**File Naming Convention:**
```
synctime-backup-YYYY-MM-DD-HHMMSS.db
Example: synctime-backup-2026-03-25-020000.db
```

#### **Backup List**
```
GET /api/admin/backup/list
Response: [
  {
    filename: "synctime-backup-2026-03-25-020000.db",
    size: 2048000,
    createdAt: "2026-03-25T02:00:00Z",
    type: "automatic"
  },
  ...
]
Max: last 7 backups shown
```

#### **Restore from Backup**
```
POST /api/admin/backup/restore
Body: { filename: "synctime-backup-2026-03-25-020000.db" }
Response: { success: true, message: "Restore complete. App restart required." }
```

**Warning:** Restore replaces current database with backup. App must be restarted after restore. User must confirm with dialog in UI.

**Implementation:** Copy backup file to `./data/synctime.db`, delete other tables' data, require manual app restart (no auto-restart for safety).

#### **Backup Details**

- **Format**: SQLite `.db` binary file (exact database copy)
- **Storage Backend**: Cloudflare R2 (S3-compatible object storage)
- **Location**: `s3://your-r2-bucket/backups/` (configured via env vars)
- **Filename Pattern**: `synctime-backup-YYYY-MM-DD-HHMMSS.db`
- **Size**: ~1-10 MB (depends on data volume)
- **Retention**: Keep last 7 backups in R2, auto-delete older ones
- **Recovery**: Download backup from R2 UI or API, place in `./data/synctime.db`, restart app

#### **R2 Configuration**

Required environment variables (set in Railway):
```env
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=your-backup-bucket
R2_REGION=auto
```

Implementation:
- Use AWS SDK for JavaScript (`aws-sdk` or `@aws-sdk/client-s3`)
- Configure with R2 endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`
- Upload/download backups as S3 objects
- List backups from R2 (gets actual list, not filesystem)

---

## Database Layer (lib/admin/service.js)

### Core Functions

```javascript
/**
 * List records with pagination and filtering
 * @param {string} tableName
 * @param {object} filters { search, sortBy, sortOrder }
 * @param {object} pagination { page, limit }
 * @returns {object} { data, total, page, pageSize }
 */
async function listRecords(tableName, filters, pagination)

/**
 * Get single record by ID
 * @param {string} tableName
 * @param {string} id
 * @returns {object} record or null
 */
async function getRecord(tableName, id)

/**
 * Create new record
 * @param {string} tableName
 * @param {object} data
 * @returns {object} { success, id }
 */
async function createRecord(tableName, data)

/**
 * Update record
 * @param {string} tableName
 * @param {string} id
 * @param {object} data
 * @returns {object} { success, changes }
 */
async function updateRecord(tableName, id, data)

/**
 * Delete record
 * @param {string} tableName
 * @param {string} id
 * @returns {object} { success, deleted }
 */
async function deleteRecord(tableName, id)

/**
 * Validate data for table before insert/update
 * @param {string} tableName
 * @param {object} data
 * @returns {object} { valid: bool, errors: [...] }
 */
function validateData(tableName, data)
```

### Validation Rules

**users table:**
- `region`: 2-letter country code (optional)
- `deviceType`: one of [desktop, mobile, tablet]
- `visitCount`: positive integer

**comments table:**
- `author`: 1-50 characters, no HTML
- `content`: 1-1000 characters, sanitized
- `pageId`: required, alphanumeric + hyphens

**survey_responses table:**
- `satisfaction`: 1-5 integer
- `usefulFeature`: non-empty string
- `improvement`: optional string

---

## Backup Layer (lib/admin/backup.js)

```javascript
/**
 * Create backup of current database and upload to R2
 * @returns {object} { success, filename, size, timestamp, url }
 */
async function createBackup()

/**
 * List recent backups from R2
 * @param {number} limit default 7
 * @returns {array} backup metadata { filename, size, createdAt, url }
 */
async function listBackups(limit = 7)

/**
 * Delete old backups from R2 (keep only last N)
 * @param {number} keep default 7
 * @returns {object} { deleted, deletedFiles }
 */
async function cleanOldBackups(keep = 7)

/**
 * Start scheduled backup (runs daily at 2 AM)
 */
function startScheduledBackup()

/**
 * Download backup from R2 to browser
 * @param {string} filename
 * @returns {Stream} file stream for download
 */
async function downloadBackup(filename)

/**
 * Restore from backup: download from R2 and replace local database
 * @param {string} filename
 * @returns {object} { success, message }
 */
async function restoreBackup(filename)
```

### Backup Workflow

1. **Manual Download:**
   - User clicks "Download Backup Now"
   - POST to `/api/admin/backup/download`
   - Creates backup, uploads to R2
   - Downloads from R2 to browser
   - User's browser saves as `.db` file

2. **Manual Trigger (Cron/URL):**
   - External cron job: `GET /api/admin/backup/trigger?token=xxx`
   - Creates backup, uploads to R2
   - Returns { filename, size, timestamp, r2Url }
   - Cleans old backups (keeps last 7 in R2)
   - Example use: GitHub Actions, Jenkins, or external cron

3. **Automatic Scheduled (Daily at 2 AM):**
   - Node.js scheduler runs automatically at 2 AM
   - Creates backup, uploads to R2
   - Cleans up old backups (keeps last 7)
   - Logs completion (optional: notify admin via email/Slack)
   - No manual action needed

---

## Security & Validation

### Authentication
- All admin routes protected by `verifyAdminToken(req, res, next)` middleware
- Token from: query param `?token=xxx` or header `X-Admin-Token: xxx`
- Token stored in env var `ADMIN_TOKEN`

### Input Validation
- Sanitize table names (whitelist: users, sessions, events, comments, survey_responses)
- Validate IDs before querying (prevent injection)
- Sanitize text fields (remove HTML, SQL special chars)
- Validate field names (prevent column injection)
- Type validation per field (numbers as numbers, strings as strings)

### Data Protection
- Read-only fields per table (don't allow editing timestamps, IDs, hashes)
- Comments: soft delete only (don't hard-delete, set `isDeleted = 1`)
- Backup files: owned by app user, read-only permissions (0644)
- **Rate Limiting for Admin Routes:**
  - Backup download: max 5 per minute per IP (prevent abuse)
  - CRUD operations: max 30 per minute per IP (prevent brute force)
  - Implementation: Use existing `express-rate-limit` from `middleware/rate-limiter.js`
  - Create `adminLimiter` and `backupDownloadLimiter` limiters, apply to routes

### Error Handling
- Try-catch in all routes
- Log all errors with context
- Return generic errors to client (don't expose internals)
- Return specific errors to admin in UI (they're authenticated)

---

## UI Components (views/admin/)

### dashboard.ejs Structure
```html
<header>
  <h1>SyncTime Admin</h1>
  <nav>
    <button data-table="users">Users</button>
    <button data-table="sessions">Sessions</button>
    <button data-table="events">Events</button>
    <button data-table="comments">Comments</button>
    <button data-table="survey_responses">Survey</button>
    <button onclick="logout()">Logout</button>
  </nav>
</header>

<main>
  <!-- Active table section -->
  <section id="table-container">
    <div class="controls">
      <button onclick="showAddModal()">+ Add New</button>
      <input type="search" id="search" placeholder="Search...">
    </div>
    <table id="admin-table" class="display">
      <!-- DataTables will render here -->
    </table>
  </section>

  <!-- Backup section -->
  <aside id="backup-section">
    <h2>Database Backups</h2>
    <button onclick="downloadBackupNow()">Download Backup Now</button>
    <button onclick="triggerManualBackup()">Trigger Backup (Cron Test)</button>
    <div id="backup-list">
      <!-- Recent backups list -->
    </div>
  </aside>
</main>

<!-- Modals -->
<div id="edit-modal"></div>
<div id="add-modal"></div>
```

### JavaScript Features
- DataTables initialization (per-table config)
- AJAX handlers for CRUD operations
- Modal form handling
- Toast notifications (success/error)
- Auto-refresh after changes
- Confirm dialogs before delete
- Loading spinners

### Styling
- Use existing CSS from public/ (keep consistent with main site)
- Or add simple Bootstrap/Tailwind for quick styling
- Dark theme option for admin feel

---

## API Error Responses

```json
// 400 Bad Request - Validation error
{
  "error": "VALIDATION_ERROR",
  "message": "Invalid data",
  "details": { "author": "Too long (max 50)" }
}

// 401 Unauthorized
{
  "error": "UNAUTHORIZED",
  "message": "Invalid or missing admin token"
}

// 404 Not Found
{
  "error": "NOT_FOUND",
  "message": "Record not found"
}

// 500 Server Error
{
  "error": "SERVER_ERROR",
  "message": "Database error occurred"
}
```

---

## Implementation Checklist

**Setup:**
- [ ] Set up R2 bucket in Cloudflare
- [ ] Generate R2 API token (access key + secret)
- [ ] Add R2 environment variables to Railway settings:
  - `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`
- [ ] Install AWS SDK: `npm install @aws-sdk/client-s3`

**Development:**
- [ ] Create `/routes/admin.js` with all endpoints
- [ ] Create `/lib/admin/service.js` with CRUD functions
- [ ] Create `/lib/admin/backup.js` with R2 backup logic (upload/download/list/restore)
- [ ] Create `/lib/admin/validators.js` with validation rules
- [ ] Create `/views/admin/dashboard.ejs` with DataTables UI
- [ ] Create `/lib/admin/r2-client.js` for S3 client initialization
- [ ] Update `app.js`: add admin router + `verifyAdminToken` middleware
- [ ] Start scheduled backup at app startup (`startScheduledBackup()`)
- [ ] Install DataTables.js via CDN

**Testing:**
- [ ] Test all CRUD operations (create, read, update, delete)
- [ ] Test backup workflows:
  - [ ] Manual download (POST /api/admin/backup/download)
  - [ ] URL trigger (GET /api/admin/backup/trigger?token=xxx)
  - [ ] Automatic scheduled (runs at 2 AM)
  - [ ] Restore from backup
- [ ] Test authentication (valid/invalid tokens)
- [ ] Test error handling (invalid data, missing records, R2 connection failures)
- [ ] Test rate limiting on backup downloads
- [ ] Test R2 connectivity in Railway environment
- [ ] Verify backup retention (keep last 7, delete older)

---

## Future Enhancements

- Bulk import from CSV/JSON
- Data export to multiple formats
- Advanced analytics dashboard
- Audit log (track admin changes)
- User role-based permissions (not just one token)
- Backup encryption
- Restore from backup UI
- Email alerts on backup failure

---

## Environment Variables

**Admin Auth (already set in Railway):**
```env
ADMIN_TOKEN=your_secure_token_here
```

**Backup Configuration:**
```env
BACKUP_SCHEDULE=0 2 * * *      # Daily at 2 AM (cron format)
BACKUP_RETENTION_DAYS=7        # Keep last 7 days of backups
```

**R2 Cloud Storage (set in Railway):**
```env
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_access_key
R2_BUCKET_NAME=your-backup-bucket
R2_REGION=auto
```

**How to get R2 credentials:**
1. Go to Cloudflare Dashboard → R2
2. Create bucket (or use existing)
3. Create API token (Account → API Tokens)
4. Copy credentials to Railway environment variables
5. Test connection in local `.env.local` before deploying

