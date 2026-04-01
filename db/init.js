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
function initDb() {
  const db = getSqlite();

  // SQL 실행: 테이블 및 인덱스 생성
  // Drizzle ORM은 자동으로 테이블을 생성하지 않으므로 수동 실행 필요
  db.exec(`
    -- ==================== users 테이블 ====================
    -- 사용자 정보를 저장하는 테이블
    CREATE TABLE IF NOT EXISTS users (
      user_id TEXT PRIMARY KEY,          -- 사용자 고유 ID
      ip_hash TEXT,                      -- IP 주소 해시 (SHA-256)
      user_agent TEXT,                   -- 브라우저 User-Agent
      region TEXT,                       -- 지역 코드 (KR, US 등)
      device_type TEXT,                  -- 기기 타입 (desktop, mobile, tablet)
      first_visit_at DATETIME,           -- 최초 방문 시각
      last_visit_at DATETIME,            -- 최근 방문 시각
      visit_count INTEGER DEFAULT 1      -- 총 방문 횟수
    );

    -- ==================== sessions 테이블 ====================
    -- 사용자 세션 정보를 저장하는 테이블
    CREATE TABLE IF NOT EXISTS sessions (
      session_id TEXT PRIMARY KEY,       -- 세션 고유 ID
      user_id TEXT,                      -- 사용자 ID (외래 키)
      start_at DATETIME,                 -- 세션 시작 시각
      end_at DATETIME,                   -- 세션 종료 시각 (NULL = 진행 중)
      FOREIGN KEY (user_id) REFERENCES users(user_id)
    );

    -- ==================== events 테이블 ====================
    -- 사용자 이벤트 로그를 저장하는 테이블
    CREATE TABLE IF NOT EXISTS events (
      event_id INTEGER PRIMARY KEY AUTOINCREMENT,  -- 이벤트 고유 ID (자동 증가)
      session_id TEXT,                             -- 세션 ID (외래 키)
      event_type TEXT,                             -- 이벤트 타입 (button_click 등)
      target_url TEXT,                             -- 대상 URL
      latency_ms INTEGER,                          -- 지연 시간 (밀리초)
      locale TEXT DEFAULT 'en',                    -- 언어/지역 코드
      timestamp DATETIME,                          -- 이벤트 발생 시각
      FOREIGN KEY (session_id) REFERENCES sessions(session_id)
    );

    -- ==================== comments 테이블 ====================
    -- 익명 댓글 저장 테이블
    CREATE TABLE IF NOT EXISTS comments (
      comment_id INTEGER PRIMARY KEY AUTOINCREMENT,
      page_id TEXT NOT NULL,
      author TEXT NOT NULL,
      content TEXT NOT NULL,
      ip_hash TEXT NOT NULL,
      created_at DATETIME NOT NULL,
      is_deleted INTEGER DEFAULT 0,
      report_count INTEGER DEFAULT 0
    );

    -- ==================== survey_responses 테이블 ====================
    -- 설문조사 응답 저장 테이블
    CREATE TABLE IF NOT EXISTS survey_responses (
      response_id INTEGER PRIMARY KEY AUTOINCREMENT,
      satisfaction INTEGER NOT NULL,
      useful_feature TEXT NOT NULL,
      improvement TEXT,
      additional_feedback TEXT,
      ip_hash TEXT NOT NULL,
      created_at DATETIME NOT NULL
    );

    -- ==================== 인덱스 생성 ====================
    -- 성능 최적화를 위한 인덱스
    
    -- events 테이블 인덱스
    CREATE INDEX IF NOT EXISTS idx_events_session_id ON events(session_id);
    CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type);
    CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
    CREATE INDEX IF NOT EXISTS idx_events_locale ON events(locale);
    
    -- sessions 테이블 인덱스
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_start_at ON sessions(start_at);
    
    -- users 테이블 인덱스
    CREATE INDEX IF NOT EXISTS idx_users_first_visit ON users(first_visit_at);
    CREATE INDEX IF NOT EXISTS idx_users_last_visit ON users(last_visit_at);

    -- comments 테이블 인덱스
    CREATE INDEX IF NOT EXISTS idx_comments_page_id ON comments(page_id);
    CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at);
  `);

  console.log(`✅ Turso database schema initialized`);
}

// 직접 실행 시 (npm run db:init)
if (require.main === module) {
  try {
    initDb();
    closeDb();  // DB 연결 종료
  } catch (err) {
    console.error('❌ Failed to initialize database:', err);
    process.exitCode = 1;
  }
}

// 모듈로 사용 시 (다른 파일에서 import)
module.exports = {
  initDb
};



