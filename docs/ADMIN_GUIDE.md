# Admin Dashboard Guide

## Overview

The SyncTime Admin Dashboard provides a comprehensive interface for managing database records and backups. Access it at `/admin` with your admin token.

---

## Accessing the Dashboard

Navigate to your SyncTime instance and add the admin token to the URL:

```
https://synctime.keero.site/admin?token=YOUR_ADMIN_TOKEN
```

The `ADMIN_TOKEN` is set in your environment variables (`.env` or Railway variables).

**Note:** Without a valid token, you'll receive a 401 Unauthorized error.

---

## Dashboard Sections

### 1. Header & Navigation

The header contains:
- **SyncTime Admin Dashboard** - Title and branding
- **Table Navigation Buttons** - Quick access to each database table
- **Logout Button** - Sign out and return to home page

### 2. Table Section (Main Area)

This is where you manage database records.

#### Controls

- **+ Add New** - Open form to create a new record
- **Search Box** - Filter table by any field value (searches all columns)
- **Page Size Selector** - Choose 10, 25, or 50 rows per page

#### Table Display

Each row shows all fields for a record with action buttons:
- **Edit** - Modify the record
- **Delete** - Remove the record

### 3. Backup Section (Right Sidebar)

Manage database backups with two buttons and a list of recent backups.

---

## Managing Records

### View Records

1. Click a table tab (Users, Sessions, Events, Comments, Survey)
2. Records load automatically
3. Use search and page size controls to filter

### Create a Record

1. Click **+ Add New**
2. Fill in the form fields
3. Click **Create**
4. Table reloads with the new record

**Note:** Different tables have different validation rules:
- **Users:** region (2 letters), deviceType (desktop/mobile/tablet), visitCount (positive number)
- **Comments:** author (1-50 chars), content (1-1000 chars), pageId (alphanumeric + hyphens)
- **Survey:** satisfaction (1-5), usefulFeature (required), improvement (optional)

### Edit a Record

1. Click **Edit** on any row
2. Modify field values in the modal
3. Click **Save**
4. Table reloads with updated data

**Protected Fields:** Some fields cannot be edited:
- **Users:** userId, ipHash, userAgent, timestamps
- **Sessions:** sessionId, userId, start/end times
- **Events:** eventId, sessionId, event details, timestamp
- **Comments:** commentId, pageId, ipHash, createdAt
- **Survey:** None (all editable)

### Delete a Record

1. Click **Delete** on any row
2. Confirm the deletion dialog
3. Record is removed (soft-deleted for comments, hard-deleted for others)

**Soft Delete:** Comments are marked as deleted (`isDeleted = 1`) but not removed. This preserves audit trail.

---

## Backup Management

### Manual Download

Backup your current database and download it to your computer:

1. Click **Download Backup Now**
2. Browser saves `.db` file (e.g., `synctime-backup-2026-03-25.db`)
3. Keep the file safe for recovery

### Manual Trigger

Trigger a backup programmatically (useful for external cron jobs):

1. Click **Trigger Manual Backup**
2. Backup is created and stored in R2 cloud storage
3. Filename appears in recent backups list

### Recent Backups

List shows the last 7 backups with:
- Filename (date-time stamp)
- File size (MB)
- Creation date/time
- **Download** - Get backup file
- **Restore** - Replace current database with this backup

### Automatic Backups

Backups run automatically every day at **2:00 AM UTC**:
- Scheduled via cron job: `0 2 * * *`
- Stored in Cloudflare R2
- Last 7 backups kept (older ones deleted)

To change the schedule, update `BACKUP_SCHEDULE` environment variable using cron format.

### Restore from Backup

**Warning:** This replaces your current database. Cannot be undone without another backup!

1. Click **Restore** on a backup in the list
2. Read the warning carefully
3. Click **Restore** to confirm
4. **You must restart the app** for changes to take effect

---

## Environment Variables

### Admin Authentication

```env
ADMIN_TOKEN=your_secure_token_here
```

Set a strong, unique token. Change it regularly.

### R2 Cloud Storage (Backups)

```env
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=your-backup-bucket
R2_REGION=auto
```

**How to get R2 credentials:**
1. Go to Cloudflare Dashboard → R2
2. Create a bucket (or use existing)
3. Go to Account → API Tokens
4. Create a new R2 API token
5. Copy credentials to environment variables

### Backup Configuration

```env
BACKUP_SCHEDULE=0 2 * * *          # Daily at 2 AM (cron format)
BACKUP_RETENTION_DAYS=7            # Keep last 7 days
```

---

## Keyboard Shortcuts

- **Tab** - Navigate between form fields
- **Enter** - Submit form (in modals)
- **Escape** - Close modal (edit, add, or restore)
- **Click outside modal** - Close without saving

---

## Troubleshooting

### Can't access dashboard

**Problem:** 401 Unauthorized error

**Solution:**
- Verify token in URL: `?token=YOUR_TOKEN`
- Check `ADMIN_TOKEN` in `.env` matches URL token
- Restart the app if you just updated the token

### Table won't load

**Problem:** Blank table or "No records found"

**Solution:**
- Check browser console (F12) for errors
- Verify API endpoint: `/api/admin/tables/users`
- Check network tab to see if request succeeded
- Restart the app

### Backup fails

**Problem:** "Backup failed" or download button doesn't work

**Solution:**
- If downloading locally: Works without R2 credentials
- If on Railway: Verify R2 credentials in Railway variables
- Check app logs for error details
- Ensure R2 bucket exists and is accessible

### Restore not working

**Problem:** Restore clicks but nothing happens

**Solution:**
- Ensure you confirmed the warning dialog
- Check app logs for errors
- **Remember: You must restart the app after restore**
- Verify backup file exists in R2 list

### Search not working

**Problem:** Search box doesn't filter results

**Solution:**
- Make sure you've loaded a table first
- Type slowly - search filters as you type
- Check that search term matches field values
- Clear search box to show all records

---

## API Reference

All endpoints require `?token=ADMIN_TOKEN` or `X-Admin-Token` header.

### CRUD Operations

```
GET    /api/admin/tables/:table?page=1&limit=25&search=query
GET    /api/admin/:table/:id
POST   /api/admin/:table
PUT    /api/admin/:table/:id
DELETE /api/admin/:table/:id?softDelete=true
```

### Backup Operations

```
GET    /api/admin/backup/trigger
POST   /api/admin/backup/download
GET    /api/admin/backup/list
POST   /api/admin/backup/restore
```

---

## Rate Limits

To prevent abuse, the admin dashboard has rate limits:

- **CRUD Operations:** 30 requests per minute
- **Backup Downloads:** 5 downloads per minute

If you exceed limits, wait a minute and try again.

---

## Security Notes

1. **Admin Token:** Keep it secret. Change it regularly.
2. **R2 Credentials:** Never commit to git. Use environment variables only.
3. **Database Backups:** Store backups securely. They contain all your data.
4. **Access Control:** Only share admin dashboard with trusted staff.
5. **Audit Trail:** Comments use soft delete to preserve history.

---

## Support

For issues or questions:

1. Check the logs: `npm run dev` or Railway dashboard
2. Review error messages in browser console
3. Verify environment variables are set correctly
4. Check that all modules loaded (see "Backup initialized" message)

---

## Version History

- **v1.0.0** (2026-03-25) - Initial admin dashboard release
  - CRUD operations for all tables
  - R2 cloud backup system
  - Scheduled automatic backups
  - DataTables integration with search/sort/pagination

---

**Last Updated:** 2026-03-25
