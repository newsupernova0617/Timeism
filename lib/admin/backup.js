// lib/admin/backup.js
/**
 * Database backup system with R2 cloud storage
 *
 * Features:
 * - Manual backup (download or trigger)
 * - Automatic scheduled backups (daily at 2 AM)
 * - Automatic cleanup (keep last 7 backups)
 * - List, download, and restore operations
 */

const fs = require('fs');
const path = require('path');
const { createReadStream, writeFileSync } = require('fs');
const { copyFileSync } = require('fs');
const cron = require('node-cron');
const { PutObjectCommand, GetObjectCommand, ListObjectsV2Command, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { createR2Client } = require('./r2-client');
const db = require('../repository');

const DATA_DIR = path.join(__dirname, '../../data');
const DB_PATH = path.join(DATA_DIR, 'synctime.db');
const TEMP_DIR = path.join(DATA_DIR, 'backups');

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

let r2Client = null;

function getR2Client() {
  if (!r2Client) {
    r2Client = createR2Client();
  }
  return r2Client;
}

function getBackupFilename() {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, ''); // HHMMSS
  return `synctime-backup-${dateStr}-${timeStr}.db`;
}

/**
 * Create backup and upload to R2
 * @returns {object} { success, filename, size, timestamp, url }
 */
async function createBackup() {
  try {
    const filename = getBackupFilename();
    const tempPath = path.join(TEMP_DIR, filename);

    // Copy database to temp file
    copyFileSync(DB_PATH, tempPath);

    // Read file for upload
    const fileBuffer = fs.readFileSync(tempPath);
    const fileSize = fileBuffer.length;

    // Upload to R2
    const client = getR2Client();
    const bucketName = process.env.R2_BUCKET_NAME;

    await client.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: `backups/${filename}`,
      Body: fileBuffer,
      ContentType: 'application/octet-stream'
    }));

    // Clean up local temp file
    fs.unlinkSync(tempPath);

    // Clean old backups
    await cleanOldBackups();

    return {
      success: true,
      filename,
      size: fileSize,
      timestamp: new Date().toISOString(),
      url: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/backups/${filename}`
    };
  } catch (error) {
    console.error('Backup creation failed:', error);
    throw new Error(`Backup failed: ${error.message}`);
  }
}

/**
 * List backups from R2
 * @param {number} limit default 7
 * @returns {array} backup metadata
 */
async function listBackups(limit = 7) {
  try {
    const client = getR2Client();
    const bucketName = process.env.R2_BUCKET_NAME;

    const response = await client.send(new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: 'backups/',
      MaxKeys: limit + 5 // Get extra for filtering
    }));

    if (!response.Contents) {
      return [];
    }

    return response.Contents
      .sort((a, b) => b.LastModified - a.LastModified)
      .slice(0, limit)
      .map(obj => ({
        filename: path.basename(obj.Key),
        size: obj.Size,
        createdAt: obj.LastModified.toISOString(),
        type: 'automatic',
        url: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${obj.Key}`
      }));
  } catch (error) {
    console.error('List backups failed:', error);
    return [];
  }
}

/**
 * Delete old backups (keep only last N)
 * @param {number} keep default 7
 * @returns {object} { deleted, deletedFiles }
 */
async function cleanOldBackups(keep = 7) {
  try {
    const client = getR2Client();
    const bucketName = process.env.R2_BUCKET_NAME;
    const backups = await listBackups(100);

    const toDelete = backups.slice(keep);
    const deletedFiles = [];

    for (const backup of toDelete) {
      await client.send(new DeleteObjectCommand({
        Bucket: bucketName,
        Key: `backups/${backup.filename}`
      }));
      deletedFiles.push(backup.filename);
    }

    return { deleted: deletedFiles.length, deletedFiles };
  } catch (error) {
    console.error('Cleanup failed:', error);
    return { deleted: 0, deletedFiles: [] };
  }
}

/**
 * Download backup file from R2
 * @param {string} filename
 * @returns {Promise<Buffer>} file content
 */
async function downloadBackup(filename) {
  try {
    const client = getR2Client();
    const bucketName = process.env.R2_BUCKET_NAME;

    const response = await client.send(new GetObjectCommand({
      Bucket: bucketName,
      Key: `backups/${filename}`
    }));

    // Convert stream to buffer
    const chunks = [];
    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  } catch (error) {
    console.error('Download backup failed:', error);
    throw new Error(`Download failed: ${error.message}`);
  }
}

/**
 * Restore database from backup
 * @param {string} filename
 * @returns {object} { success, message }
 */
async function restoreBackup(filename) {
  try {
    // Download from R2
    const buffer = await downloadBackup(filename);
    const backupPath = path.join(TEMP_DIR, filename);

    // Write to temp location
    fs.writeFileSync(backupPath, buffer);

    // Replace current database (backup old one first)
    const backupOld = path.join(TEMP_DIR, `synctime-old-${Date.now()}.db`);
    if (fs.existsSync(DB_PATH)) {
      copyFileSync(DB_PATH, backupOld);
    }

    // Copy restored backup to active location
    copyFileSync(backupPath, DB_PATH);

    // Clean up temp file
    fs.unlinkSync(backupPath);

    return {
      success: true,
      message: 'Restore complete. Please restart the application to apply changes.'
    };
  } catch (error) {
    console.error('Restore failed:', error);
    throw new Error(`Restore failed: ${error.message}`);
  }
}

/**
 * Start scheduled automatic backup (daily at 2 AM)
 */
function startScheduledBackup() {
  const schedule = process.env.BACKUP_SCHEDULE || '0 2 * * *'; // Default 2 AM

  cron.schedule(schedule, async () => {
    try {
      console.log('[Backup] Starting scheduled backup...');
      const result = await createBackup();
      console.log(`[Backup] Success: ${result.filename} (${result.size} bytes)`);
    } catch (error) {
      console.error('[Backup] Failed:', error.message);
    }
  });

  console.log(`[Backup] Scheduled backup initialized (${schedule})`);
}

module.exports = {
  createBackup,
  listBackups,
  cleanOldBackups,
  downloadBackup,
  restoreBackup,
  startScheduledBackup
};
