const path = require('path');
const { createClient } = require('@libsql/client');
const { drizzle } = require('drizzle-orm/libsql');
const schema = require('./schema');

const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');

const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'app.db');

// better-sqlite3 인스턴스 (싱글톤)
let sqliteInstance = null;

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

// Drizzle ORM 인스턴스 (싱글톤)
let drizzleInstance = null;

function getDb() {
  if (!drizzleInstance) {
    const sqlite = getSqlite();
    drizzleInstance = drizzle(sqlite, { schema });
  }
  return drizzleInstance;
}

// DB 연결 종료 (프로세스 종료 시 호출)
function closeDb() {
  if (sqliteInstance) {
    sqliteInstance.close();
    sqliteInstance = null;
    drizzleInstance = null;
  }
}

module.exports = {
  getDb,
  getSqlite,
  closeDb,
  DB_PATH
};
