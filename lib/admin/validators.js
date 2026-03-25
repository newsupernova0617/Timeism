// lib/admin/validators.js
/**
 * Data validation rules per table
 */

const validators = {
  users: {
    region: (val) => !val || (typeof val === 'string' && val.length === 2),
    deviceType: (val) => ['desktop', 'mobile', 'tablet'].includes(val),
    visitCount: (val) => Number.isInteger(val) && val > 0
  },
  comments: {
    author: (val) => typeof val === 'string' && val.length > 0 && val.length <= 50,
    content: (val) => typeof val === 'string' && val.length > 0 && val.length <= 1000,
    pageId: (val) => typeof val === 'string' && /^[a-z0-9\-]+$/.test(val),
    reportCount: (val) => Number.isInteger(val) && val >= 0
  },
  survey_responses: {
    satisfaction: (val) => Number.isInteger(val) && val >= 1 && val <= 5,
    usefulFeature: (val) => typeof val === 'string' && val.length > 0,
    improvement: (val) => !val || typeof val === 'string',
    additionalFeedback: (val) => !val || typeof val === 'string'
  }
};

/**
 * Validate data for a table
 * @param {string} tableName
 * @param {object} data
 * @returns {object} { valid: bool, errors: [...] }
 */
function validateData(tableName, data) {
  const rules = validators[tableName] || {};
  const errors = [];

  for (const [field, value] of Object.entries(data)) {
    if (rules[field] && !rules[field](value)) {
      errors.push(`${field}: invalid value`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Whitelist of allowed table names
 */
function isValidTableName(tableName) {
  return ['users', 'sessions', 'events', 'comments', 'survey_responses'].includes(tableName);
}

module.exports = { validateData, isValidTableName };
