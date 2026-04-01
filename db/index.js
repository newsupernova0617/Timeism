const fs = require('fs');
const path = require('path');
const { createClient } = require('@libsql/client');
const { drizzle } = require('drizzle-orm/libsql');
const schema = require('./schema');

const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');

const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'app.db');

// 데이터 디렉토리 확인 및 생성
function ensureDataDirectory() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// better-sqlite3 인스턴스 (싱글톤)
let sqliteInstance = null;

function getSqlite() {
  if (!sqliteInstance) {
    ensureDataDirectory();
    sqliteInstance = new Database(DB_PATH);

    // ==================== SQLite 성능 최적화 설정 ====================

    // 1. WAL 모드 활성화 (Write-Ahead Logging)
    // - 읽기/쓰기 동시성 향상
    // - 쓰기 성능 대폭 향상
    sqliteInstance.pragma('journal_mode = WAL');

    // 2. 동기화 모드 설정 (NORMAL)
    // - FULL: 가장 안전하지만 느림
    // - NORMAL: 균형잡힌 설정 (권장)
    // - OFF: 가장 빠르지만 위험 (크래시 시 데이터 손실 가능)
    sqliteInstance.pragma('synchronous = NORMAL');

    // 3. 캐시 크기 설정 (20MB)
    // - 기본값: -2000 (2MB)
    // - 음수: KB 단위, 양수: 페이지 수
    // - -20000 = 20MB 캐시
    sqliteInstance.pragma('cache_size = -20000');

    // 4. 임시 저장소를 메모리에 저장
    // - 임시 테이블, 인덱스를 메모리에서 처리
    // - 디스크 I/O 감소
    sqliteInstance.pragma('temp_store = MEMORY');

    // 5. 메모리 맵 I/O 활성화 (256MB)
    // - 파일을 메모리에 매핑하여 읽기 성능 향상
    // - 0 = 비활성화, 양수 = 바이트 단위
    sqliteInstance.pragma('mmap_size = 268435456'); // 256MB

    // 6. 페이지 크기 설정 (4KB)
    // - 기본값: 4096 (4KB)
    // - 일반적으로 4KB가 최적
    // - 변경 시 VACUUM 필요
    // sqliteInstance.pragma('page_size = 4096');

    // 7. 자동 VACUUM 활성화 (INCREMENTAL)
    // - NONE: 비활성화
    // - FULL: 전체 VACUUM (느림)
    // - INCREMENTAL: 점진적 VACUUM (권장)
    // sqliteInstance.pragma('auto_vacuum = INCREMENTAL');

    // 8. 외래 키 제약 조건 활성화
    // - 데이터 무결성 보장
    sqliteInstance.pragma('foreign_keys = ON');

    // 9. 쿼리 최적화 활성화
    // - 쿼리 플래너 개선
    sqliteInstance.pragma('optimize');
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
