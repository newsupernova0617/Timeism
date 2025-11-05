require('dotenv').config();

const fs = require('fs');
const path = require('path');

const { openDb, DB_PATH } = require('./index');

async function initDb() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf-8');

  const db = await openDb();
  try {
    await db.exec(schemaSql);
  } finally {
    await db.close();
  }
}

if (require.main === module) {
  initDb()
    .then(() => {
      console.log(`SQLite database initialized at ${DB_PATH}`);
    })
    .catch((err) => {
      console.error('Failed to initialize database:', err);
      process.exitCode = 1;
    });
}

module.exports = {
  initDb
};
