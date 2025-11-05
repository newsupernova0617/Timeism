const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');

const DB_PATH =
  process.env.DB_PATH ||
  path.join(DATA_DIR, 'app.db');

function ensureDataDirectory() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

async function openDb() {
  ensureDataDirectory();
  return open({
    filename: DB_PATH,
    driver: sqlite3.Database
  });
}

module.exports = {
  openDb,
  DB_PATH
};
