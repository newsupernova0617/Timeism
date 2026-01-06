/**
 * DB 마이그레이션: events 테이블에 locale 컬럼 추가
 * 
 * 실행 방법: node db/migrations/add-locale-to-events.js
 */

require('dotenv').config();

const { getSqlite, closeDb } = require('../index');

function migrateAddLocale() {
    const db = getSqlite();

    console.log('🔄 Starting migration: Add locale column to events table...');

    try {
        // 1. locale 컬럼 추가 (기본값: 'en')
        db.exec(`
      ALTER TABLE events 
      ADD COLUMN locale TEXT DEFAULT 'en';
    `);
        console.log('✅ Added locale column to events table');

        // 2. 성능 최적화 인덱스 추가
        db.exec(`
      CREATE INDEX IF NOT EXISTS idx_events_locale_timestamp 
      ON events(locale, timestamp DESC);
    `);
        console.log('✅ Created index on (locale, timestamp)');

        // 3. target_url 인덱스 추가 (트렌드 쿼리 최적화)
        db.exec(`
      CREATE INDEX IF NOT EXISTS idx_events_target_url 
      ON events(target_url);
    `);
        console.log('✅ Created index on target_url');

        console.log('🎉 Migration completed successfully!');
    } catch (err) {
        console.error('❌ Migration failed:', err);
        throw err;
    }
}

// 실행
if (require.main === module) {
    try {
        migrateAddLocale();
        closeDb();
    } catch (err) {
        console.error('❌ Failed to run migration:', err);
        process.exitCode = 1;
    }
}

module.exports = { migrateAddLocale };
