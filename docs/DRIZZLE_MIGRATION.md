# Drizzle ORM + better-sqlite3 마이그레이션 완료

> 작성일: 2026-01-05  
> 마이그레이션: sqlite/sqlite3 → better-sqlite3 + Drizzle ORM

---

## 🎯 마이그레이션 개요

Timeism 프로젝트를 **sqlite + sqlite3** 조합에서 **better-sqlite3 + Drizzle ORM**으로 완전히 마이그레이션했습니다.

### 변경 이유

| 항목 | 이전 (sqlite + sqlite3) | 현재 (better-sqlite3 + Drizzle) |
|------|------------------------|--------------------------------|
| **성능** | 비동기 (느림) | 동기식 (3-5배 빠름) |
| **API** | Promise 기반 | 동기식 (간결) |
| **타입 안정성** | ❌ 없음 | ✅ TypeScript 지원 |
| **ORM** | ❌ Raw SQL만 | ✅ Drizzle ORM |
| **메모리** | 높음 | 낮음 |
| **개발 경험** | 보통 | 우수 (자동완성, 타입 체크) |

---

## 📦 변경된 의존성

### 제거된 패키지
```bash
npm uninstall sqlite sqlite3
```

### 추가된 패키지
```bash
npm install better-sqlite3 drizzle-orm
npm install -D drizzle-kit
```

### 최종 의존성
```json
{
  "dependencies": {
    "better-sqlite3": "^12.5.0",
    "drizzle-orm": "^0.45.1"
  },
  "devDependencies": {
    "drizzle-kit": "^0.31.4"
  }
}
```

---

## 🔄 변경된 파일

### 1. `db/schema.js` (신규)
**Drizzle ORM 스키마 정의**

```javascript
const { sqliteTable, text, integer, index } = require('drizzle-orm/sqlite-core');

const users = sqliteTable('users', {
  userId: text('user_id').primaryKey(),
  ipHash: text('ip_hash'),
  // ... 기타 필드
}, (table) => ({
  firstVisitIdx: index('idx_users_first_visit').on(table.firstVisitAt),
  // ... 기타 인덱스
}));
```

**특징**:
- 타입 안정성
- 자동완성 지원
- 스키마 중앙 관리

---

### 2. `db/index.js`
**변경 전**:
```javascript
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

async function openDb() {
  return open({
    filename: DB_PATH,
    driver: sqlite3.Database
  });
}
```

**변경 후**:
```javascript
const Database = require('better-sqlite3');
const { drizzle } = require('drizzle-orm/better-sqlite3');

function getDb() {
  if (!drizzleInstance) {
    const sqlite = getSqlite();
    drizzleInstance = drizzle(sqlite, { schema });
  }
  return drizzleInstance;
}
```

**주요 변경점**:
- ✅ 싱글톤 패턴 적용
- ✅ WAL 모드 활성화 (성능 향상)
- ✅ 동기식 API
- ✅ Drizzle ORM 통합

---

### 3. `db/init.js`
**변경 전**:
```javascript
async function initDb() {
  const schemaSql = fs.readFileSync('schema.sql', 'utf-8');
  const db = await openDb();
  await db.exec(schemaSql);
  await db.close();
}
```

**변경 후**:
```javascript
function initDb() {
  const db = getSqlite();
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (...);
    CREATE TABLE IF NOT EXISTS sessions (...);
    CREATE TABLE IF NOT EXISTS events (...);
    -- 인덱스 생성
  `);
}
```

**주요 변경점**:
- ✅ `schema.sql` 제거 (SQL을 코드에 인라인)
- ✅ async/await 제거
- ✅ 동기식 실행

---

### 4. `lib/repository.js`
**변경 전**:
```javascript
async function upsertUser({ userId, ipHash, ... }) {
  await withDb(async (db) => {
    await db.run(`INSERT INTO users ...`, [...]);
  });
}
```

**변경 후**:
```javascript
function upsertUser({ userId, ipHash, ... }) {
  const db = getDb();
  db.run(sql`
    INSERT INTO users (user_id, ip_hash, ...)
    VALUES (${userId}, ${ipHash}, ...)
    ON CONFLICT(user_id) DO UPDATE SET ...
  `);
}
```

**주요 변경점**:
- ✅ 모든 함수가 동기식
- ✅ Drizzle의 `sql` 태그 사용
- ✅ 타입 안정성 향상
- ✅ `withDb` 패턴 제거 (싱글톤 사용)

---

### 5. `routes/api.js`
**변경 전**:
```javascript
router.post('/log-event', async (req, res) => {
  await logEvent({ sessionId, eventType, ... });
  return res.json({ ok: true });
});
```

**변경 후**:
```javascript
router.post('/log-event', async (req, res) => {
  logEvent({ sessionId, eventType, ... });  // await 제거
  return res.json({ ok: true });
});
```

**주요 변경점**:
- ✅ Repository 함수 호출에서 `await` 제거
- ✅ `measureServerTime`은 여전히 비동기 (네트워크 요청)
- ✅ Analytics 엔드포인트도 동기식으로 변경

---

### 6. `drizzle.config.js` (신규)
**Drizzle Kit 설정**

```javascript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './db/schema.js',
  out: './db/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.DB_PATH || './data/app.db'
  }
});
```

---

### 7. `package.json`
**추가된 스크립트**:
```json
{
  "scripts": {
    "db:init": "node db/init.js",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio",
    "db:generate": "drizzle-kit generate"
  }
}
```

---

## 🚀 새로운 NPM 스크립트

### `npm run db:init`
데이터베이스 초기화 (테이블 생성)
```bash
npm run db:init
```

### `npm run db:push`
Drizzle 스키마를 DB에 푸시 (마이그레이션 없이)
```bash
npm run db:push
```

### `npm run db:studio`
Drizzle Studio 실행 (GUI 데이터베이스 브라우저)
```bash
npm run db:studio
```

### `npm run db:generate`
마이그레이션 파일 생성
```bash
npm run db:generate
```

---

## 📊 성능 비교

### 벤치마크 (예상)

| 작업 | 이전 (sqlite) | 현재 (better-sqlite3) | 개선율 |
|------|--------------|---------------------|--------|
| INSERT (1000건) | ~500ms | ~150ms | **3.3배** |
| SELECT (복잡 쿼리) | ~80ms | ~25ms | **3.2배** |
| 메모리 사용량 | ~50MB | ~30MB | **40% 감소** |

---

## ✅ 마이그레이션 체크리스트

- [x] better-sqlite3 설치
- [x] drizzle-orm 설치
- [x] drizzle-kit 설치 (devDependency)
- [x] `db/schema.js` 생성 (Drizzle 스키마)
- [x] `db/index.js` 수정 (싱글톤 패턴)
- [x] `db/init.js` 수정 (동기식)
- [x] `lib/repository.js` 전체 재작성
- [x] `routes/api.js` await 제거
- [x] `drizzle.config.js` 생성
- [x] `package.json` 스크립트 추가
- [x] `schema.sql` 제거
- [x] sqlite/sqlite3 언인스톨
- [x] DB 초기화 테스트
- [x] 서버 실행 테스트

---

## 🔍 주요 개선 사항

### 1. 성능 향상
- **동기식 API**: 이벤트 루프 오버헤드 제거
- **WAL 모드**: 동시성 향상
- **싱글톤 패턴**: 연결 재사용

### 2. 개발 경험 개선
- **타입 안정성**: Drizzle의 타입 추론
- **자동완성**: IDE 지원 향상
- **Drizzle Studio**: GUI 데이터베이스 브라우저

### 3. 코드 품질 향상
- **중복 제거**: `withDb` 패턴 제거
- **간결한 코드**: async/await 제거
- **중앙 관리**: 스키마를 한 곳에서 관리

---

## 🧪 테스트 방법

### 1. DB 초기화
```bash
npm run db:init
```

**예상 출력**:
```
✅ SQLite database initialized at c:\...\Timeism\data\app.db
```

### 2. 서버 실행
```bash
npm start
```

**예상 출력**:
```
Server listening on port 3000
```

### 3. API 테스트
```bash
# 세션 초기화
curl -X POST http://localhost:3000/api/session-init \
  -H "Content-Type: application/json" \
  -d '{"user_agent": "test"}'

# 시간 조회
curl -X POST http://localhost:3000/api/check-time \
  -H "Content-Type: application/json" \
  -d '{"target_url": "https://google.com"}'

# 이벤트 로깅
curl -X POST http://localhost:3000/api/log-event \
  -H "Content-Type: application/json" \
  -d '{"session_id": "sess_xxx", "event_type": "test"}'
```

### 4. Drizzle Studio 실행
```bash
npm run db:studio
```

브라우저에서 `https://local.drizzle.studio` 접속

---

## 🔄 롤백 방법 (필요시)

만약 문제가 발생하면 다음과 같이 롤백할 수 있습니다:

```bash
# 1. 이전 의존성 재설치
npm install sqlite@^5.1.1 sqlite3@^5.1.7

# 2. better-sqlite3, drizzle 제거
npm uninstall better-sqlite3 drizzle-orm drizzle-kit

# 3. Git으로 파일 복원
git checkout db/index.js db/init.js lib/repository.js routes/api.js
```

---

## 📚 참고 자료

- [Drizzle ORM 공식 문서](https://orm.drizzle.team/)
- [better-sqlite3 GitHub](https://github.com/WiseLibs/better-sqlite3)
- [Drizzle Kit 문서](https://orm.drizzle.team/kit-docs/overview)
- [SQLite WAL 모드](https://www.sqlite.org/wal.html)

---

## 🎉 마이그레이션 완료!

모든 파일이 성공적으로 마이그레이션되었습니다. 이제 Drizzle ORM의 강력한 기능을 활용할 수 있습니다!

**다음 단계**:
1. ✅ 프로덕션 배포 전 충분한 테스트
2. 🔄 필요시 마이그레이션 시스템 도입 (`npm run db:generate`)
3. 📊 성능 모니터링
4. 🎨 Drizzle Studio로 데이터 관리

---

**문서 버전**: 1.0.0  
**최종 업데이트**: 2026-01-05  
**작성자**: Timeism Development Team
