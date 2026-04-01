/**
 * 데이터베이스 초기화 스크립트
 * 
 * SQLite 데이터베이스의 테이블과 인덱스를 생성합니다.
 * Drizzle ORM을 사용하지만, 테이블 생성은 SQL로 직접 수행합니다.
 * 
 * 실행 방법: npm run db:init
 */

require('dotenv').config();

const { getSqlite, closeDb, DB_PATH } = require('./index');

/**
 * 데이터베이스 초기화 함수
 *
 * 1. users 테이블 생성 (사용자 정보)
 * 2. sessions 테이블 생성 (세션 정보)
 * 3. events 테이블 생성 (이벤트 로그)
 * 4. 성능 최적화 인덱스 생성
 */
async function initDb() {
  const db = getSqlite();

  // SQL 문장들을 개별적으로 실행
  const statements = [
    // ==================== users 테이블 ====================
    `CREATE TABLE IF NOT EXISTS users (
      user_id TEXT PRIMARY KEY,
      ip_hash TEXT,
      user_agent TEXT,
      region TEXT,
      device_type TEXT,
      first_visit_at DATETIME,
      last_visit_at DATETIME,
      visit_count INTEGER DEFAULT 1
    )`,

    // ==================== sessions 테이블 ====================
    `CREATE TABLE IF NOT EXISTS sessions (
      session_id TEXT PRIMARY KEY,
      user_id TEXT,
      start_at DATETIME,
      end_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES users(user_id)
    )`,

    // ==================== events 테이블 ====================
    `CREATE TABLE IF NOT EXISTS events (
      event_id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT,
      event_type TEXT,
      target_url TEXT,
      latency_ms INTEGER,
      locale TEXT DEFAULT 'en',
      timestamp DATETIME,
      FOREIGN KEY (session_id) REFERENCES sessions(session_id)
    )`,

    // ==================== comments 테이블 ====================
    `CREATE TABLE IF NOT EXISTS comments (
      comment_id INTEGER PRIMARY KEY AUTOINCREMENT,
      page_id TEXT NOT NULL,
      author TEXT NOT NULL,
      content TEXT NOT NULL,
      ip_hash TEXT NOT NULL,
      created_at DATETIME NOT NULL,
      is_deleted INTEGER DEFAULT 0,
      report_count INTEGER DEFAULT 0
    )`,

    // ==================== survey_responses 테이블 ====================
    `CREATE TABLE IF NOT EXISTS survey_responses (
      response_id INTEGER PRIMARY KEY AUTOINCREMENT,
      satisfaction INTEGER NOT NULL,
      useful_feature TEXT NOT NULL,
      improvement TEXT,
      additional_feedback TEXT,
      ip_hash TEXT NOT NULL,
      created_at DATETIME NOT NULL
    )`,

    // ==================== 인덱스 생성 ====================
    // events 테이블 인덱스
    `CREATE INDEX IF NOT EXISTS idx_events_session_id ON events(session_id)`,
    `CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type)`,
    `CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp)`,
    `CREATE INDEX IF NOT EXISTS idx_events_locale ON events(locale)`,

    // sessions 테이블 인덱스
    `CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_sessions_start_at ON sessions(start_at)`,

    // users 테이블 인덱스
    `CREATE INDEX IF NOT EXISTS idx_users_first_visit ON users(first_visit_at)`,
    `CREATE INDEX IF NOT EXISTS idx_users_last_visit ON users(last_visit_at)`,

    // comments 테이블 인덱스
    `CREATE INDEX IF NOT EXISTS idx_comments_page_id ON comments(page_id)`,
    `CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at)`
  ];

  // 각 SQL 문장을 순서대로 실행
  for (const statement of statements) {
    await db.execute(statement);
  }

  console.log(`✅ Turso database schema initialized`);
}

// 직접 실행 시 (npm run db:init)
if (require.main === module) {
  (async () => {
    try {
      await initDb();
      closeDb();  // DB 연결 종료
    } catch (err) {
      console.error('❌ Failed to initialize database:', err);
      process.exitCode = 1;
    }
  })();
}

// 모듈로 사용 시 (다른 파일에서 import)
module.exports = {
  initDb
};



