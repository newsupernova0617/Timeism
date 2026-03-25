/**
 * Admin database service layer
 *
 * Provides CRUD operations for all tables with validation
 */

const { getDb } = require('../../db');
const { users, sessions, events, comments, surveyResponses } = require('../../db/schema');
const { validateData, isValidTableName } = require('./validators');
const { eq, desc, asc } = require('drizzle-orm');

const tableMap = {
  users,
  sessions,
  events,
  comments,
  survey_responses: surveyResponses
};

/**
 * List records with pagination and filtering
 */
async function listRecords(tableName, filters = {}, pagination = {}) {
  if (!isValidTableName(tableName)) {
    throw new Error('Invalid table name');
  }

  const table = tableMap[tableName];
  const { search, sortBy, sortOrder } = filters;
  const { page = 1, limit = 25 } = pagination;
  const offset = (page - 1) * limit;

  try {
    const db = getDb();
    let query = db.select().from(table);

    // Add sorting
    if (sortBy && table[sortBy]) {
      const sortCol = table[sortBy];
      query = db.select().from(table).orderBy(
        sortOrder === 'desc' ? desc(sortCol) : asc(sortCol)
      );
    }

    // Execute query with pagination
    const data = await query.limit(limit).offset(offset);

    // Filter search in-memory (simplified approach)
    let filtered = data;
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = data.filter(row =>
        Object.values(row).some(val =>
          val && val.toString().toLowerCase().includes(searchLower)
        )
      );
    }

    // Get total count
    const countQuery = db.select().from(table);
    const countData = await countQuery;
    const total = countData.length;

    return {
      data: filtered,
      total,
      page,
      pageSize: limit
    };
  } catch (error) {
    throw new Error(`List failed for ${tableName}: ${error.message}`);
  }
}

/**
 * Get single record by ID
 */
async function getRecord(tableName, id) {
  if (!isValidTableName(tableName)) {
    throw new Error('Invalid table name');
  }

  const table = tableMap[tableName];
  const idCol = getIdColumn(tableName);

  try {
    const db = getDb();
    const result = await db.select().from(table).where(
      eq(table[idCol], id)
    );
    return result[0] || null;
  } catch (error) {
    throw new Error(`Get failed for ${tableName}: ${error.message}`);
  }
}

/**
 * Create new record
 */
async function createRecord(tableName, data) {
  if (!isValidTableName(tableName)) {
    throw new Error('Invalid table name');
  }

  // Validate data
  const validation = validateData(tableName, data);
  if (!validation.valid) {
    throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
  }

  const table = tableMap[tableName];

  try {
    const db = getDb();
    const result = await db.insert(table).values(data);
    return { success: true, lastId: result.lastInsertRowid };
  } catch (error) {
    throw new Error(`Create failed for ${tableName}: ${error.message}`);
  }
}

/**
 * Update record
 */
async function updateRecord(tableName, id, data) {
  if (!isValidTableName(tableName)) {
    throw new Error('Invalid table name');
  }

  // Don't allow updating protected fields
  const protectedFields = getProtectedFields(tableName);
  for (const field of protectedFields) {
    delete data[field];
  }

  // Validate remaining data
  const validation = validateData(tableName, data);
  if (!validation.valid) {
    throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
  }

  const table = tableMap[tableName];
  const idCol = getIdColumn(tableName);

  try {
    const db = getDb();
    const result = await db.update(table).set(data).where(
      eq(table[idCol], id)
    );
    return { success: true, changes: result.rowsAffected };
  } catch (error) {
    throw new Error(`Update failed for ${tableName}: ${error.message}`);
  }
}

/**
 * Delete record (or soft delete for comments)
 */
async function deleteRecord(tableName, id, softDelete = false) {
  if (!isValidTableName(tableName)) {
    throw new Error('Invalid table name');
  }

  const table = tableMap[tableName];
  const idCol = getIdColumn(tableName);

  try {
    const db = getDb();

    // Soft delete for comments
    if (tableName === 'comments' && softDelete) {
      const result = await db.update(table).set({ isDeleted: 1 }).where(
        eq(table[idCol], id)
      );
      return { success: true, deleted: result.rowsAffected };
    }

    // Hard delete
    const result = await db.delete(table).where(
      eq(table[idCol], id)
    );
    return { success: true, deleted: result.rowsAffected };
  } catch (error) {
    throw new Error(`Delete failed for ${tableName}: ${error.message}`);
  }
}

/**
 * Get ID column name for table
 */
function getIdColumn(tableName) {
  const idMap = {
    users: 'userId',
    sessions: 'sessionId',
    events: 'eventId',
    comments: 'commentId',
    survey_responses: 'responseId'
  };
  return idMap[tableName];
}

/**
 * Get protected fields for table (cannot be edited)
 */
function getProtectedFields(tableName) {
  const protectedMap = {
    users: ['userId', 'ipHash', 'userAgent', 'firstVisitAt', 'lastVisitAt'],
    sessions: ['sessionId', 'userId', 'startAt', 'endAt'],
    events: ['eventId', 'sessionId', 'eventType', 'targetUrl', 'latencyMs', 'timestamp'],
    comments: ['commentId', 'pageId', 'ipHash', 'createdAt'],
    survey_responses: []
  };
  return protectedMap[tableName] || [];
}

module.exports = {
  listRecords,
  getRecord,
  createRecord,
  updateRecord,
  deleteRecord
};
