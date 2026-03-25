// routes/admin.js
/**
 * Admin dashboard routes
 *
 * All routes protected by verifyAdminToken middleware
 * Endpoints:
 * - GET /admin - render dashboard
 * - GET /api/admin/tables/:table - list records
 * - GET /api/admin/:table/:id - get record
 * - POST /api/admin/:table - create record
 * - PUT /api/admin/:table/:id - update record
 * - DELETE /api/admin/:table/:id - delete record
 * - GET /api/admin/backup/trigger - manual backup trigger
 * - POST /api/admin/backup/download - download backup
 * - GET /api/admin/backup/list - list backups
 * - POST /api/admin/backup/restore - restore from backup
 */

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const service = require('../lib/admin/service');
const backup = require('../lib/admin/backup');
const { validateData } = require('../lib/admin/validators');

// Rate limiters
const adminLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'RATE_LIMITED', message: 'Too many requests' }
});

const backupDownloadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: 'RATE_LIMITED', message: 'Too many backup downloads' }
});

// ==================== BACKUP ROUTES (must come before generic routes) ====================

// BACKUP: MANUAL TRIGGER
router.get('/backup/trigger', async (req, res) => {
  try {
    const result = await backup.createBackup();
    res.json(result);
  } catch (error) {
    console.error('Backup trigger error:', error);
    res.status(500).json({
      error: 'BACKUP_ERROR',
      message: error.message
    });
  }
});

// BACKUP: DOWNLOAD
router.post('/backup/download', backupDownloadLimiter, async (req, res) => {
  try {
    const result = await backup.createBackup();
    const buffer = await backup.downloadBackup(result.filename);

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(buffer);
  } catch (error) {
    console.error('Backup download error:', error);
    res.status(500).json({
      error: 'DOWNLOAD_ERROR',
      message: error.message
    });
  }
});

// BACKUP: LIST
router.get('/backup/list', adminLimiter, async (req, res) => {
  try {
    const backups = await backup.listBackups();
    res.json(backups);
  } catch (error) {
    console.error('List backups error:', error);
    res.status(500).json({
      error: 'LIST_ERROR',
      message: error.message
    });
  }
});

// BACKUP: RESTORE
router.post('/backup/restore', adminLimiter, async (req, res) => {
  try {
    const { filename } = req.body;

    if (!filename) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'filename is required'
      });
    }

    const result = await backup.restoreBackup(filename);
    res.json(result);
  } catch (error) {
    console.error('Restore error:', error);
    res.status(500).json({
      error: 'RESTORE_ERROR',
      message: error.message
    });
  }
});

// ==================== LIST RECORDS ====================
router.get('/tables/:tableName', adminLimiter, async (req, res) => {
  try {
    const { tableName } = req.params;
    const { search, sortBy, sortOrder, page = 1, limit = 25 } = req.query;

    const result = await service.listRecords(
      tableName,
      { search, sortBy, sortOrder },
      { page: parseInt(page), limit: parseInt(limit) }
    );

    res.json(result);
  } catch (error) {
    console.error('List error:', error);
    res.status(400).json({
      error: 'LIST_ERROR',
      message: error.message
    });
  }
});

// ==================== GET RECORD ====================
router.get('/:tableName/:id', adminLimiter, async (req, res) => {
  try {
    const { tableName, id } = req.params;
    const record = await service.getRecord(tableName, id);

    if (!record) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Record not found'
      });
    }

    res.json(record);
  } catch (error) {
    console.error('Get error:', error);
    res.status(400).json({
      error: 'GET_ERROR',
      message: error.message
    });
  }
});

// ==================== CREATE RECORD ====================
router.post('/:tableName', adminLimiter, async (req, res) => {
  try {
    const { tableName } = req.params;
    const data = req.body;

    const result = await service.createRecord(tableName, data);
    res.status(201).json(result);
  } catch (error) {
    console.error('Create error:', error);
    res.status(400).json({
      error: 'CREATE_ERROR',
      message: error.message
    });
  }
});

// ==================== UPDATE RECORD ====================
router.put('/:tableName/:id', adminLimiter, async (req, res) => {
  try {
    const { tableName, id } = req.params;
    const data = req.body;

    const result = await service.updateRecord(tableName, id, data);
    res.json(result);
  } catch (error) {
    console.error('Update error:', error);
    res.status(400).json({
      error: 'UPDATE_ERROR',
      message: error.message
    });
  }
});

// ==================== DELETE RECORD ====================
router.delete('/:tableName/:id', adminLimiter, async (req, res) => {
  try {
    const { tableName, id } = req.params;
    const { softDelete } = req.query;

    const result = await service.deleteRecord(tableName, id, softDelete === 'true');
    res.json(result);
  } catch (error) {
    console.error('Delete error:', error);
    res.status(400).json({
      error: 'DELETE_ERROR',
      message: error.message
    });
  }
});

module.exports = router;
