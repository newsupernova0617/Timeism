# Timeism (SyncTime) — 아키텍처 및 설계서

> 최종 업데이트: 2026-03-22  
> 런타임: Node.js 20 (CommonJS)  
> 패키지 이름: `synctime`

---

## 1. 기술 스택 전체 목록

### 1.1 백엔드 (Server-side)

| 분류 | 패키지 | 버전 | 역할 |
|---|---|---|---|
| 런타임 | Node.js | 20.x | JavaScript 실행 환경 |
| 웹 프레임워크 | express | ^5.1.0 | HTTP 서버, 라우팅, 미들웨어 |
| 템플릿 엔진 | ejs | ^3.1.10 | 서버사이드 HTML 렌더링 |
| DB 드라이버 | better-sqlite3 | ^12.5.0 | 동기식 SQLite 바인딩 (Node 네이티브) |
| ORM | drizzle-orm | ^0.45.1 | 타입 안정 SQL 쿼리 빌더 |
| ORM CLI | drizzle-kit | ^0.31.4 | 스키마 push/generate/studio |
| 보안 헤더 | helmet | ^8.1.0 | XSS, clickjacking, HSTS 등 |
| 레이트 리밋 | express-rate-limit | ^8.2.1 | IP 기반 요청 제한 |
| gzip 압축 | compression | ^1.8.1 | 응답 크기 최적화 |
| HTTP 로그 | morgan | ^1.10.1 | dev/combined 포맷 접근 로그 |
| IP 파싱 | ipaddr.js | ^2.2.0 | IPv4/IPv6/매핑 주소 정규화 |
| ID 생성 | nanoid | ^5.1.6 | 충돌 방지 세션/사용자 ID |
| 환경변수 | dotenv | ^17.2.3 | `.env` 파일 로드 |
| 개발용 감시 | nodemon | ^3.1.10 (dev) | 파일 변경 감지 자동 재시작 |

### 1.2 프론트엔드 (Client-side)

| 기술 | 버전/방식 | 설명 |
|---|---|---|
| HTML5 | EJS 템플릿 렌더링 | 서버사이드 렌더링, 동적 메타 태그 |
| CSS | Vanilla CSS (모듈별 분리) | 번들러 없음, 직접 `<link>` 로드 |
| JavaScript | Vanilla ES Modules | `import/export` 사용, 번들러 없음 |
| Web Audio API | 브라우저 내장 | 알람음 합성 (OscillatorNode) |
| Notifications API | 브라우저 내장 | 시스템 알림 |
| requestAnimationFrame | 브라우저 내장 | 고정밀 시계 루프 |
| performance.now() | 브라우저 내장 | 고정밀 경과 시간 측정 |
| localStorage | 브라우저 내장 | 세션 및 설정 영속화 |
| Intl API | 브라우저 내장 | 타임존 감지, 날짜 포맷 |

### 1.3 데이터베이스

| 구성 요소 | 설명 |
|---|---|
| SQLite | 단일 파일 DB (`data/app.db`), 프로세스 내 임베디드 |
| WAL 모드 | `journal_mode = WAL` — 읽기/쓰기 동시성 향상 |
| 동기화 모드 | `synchronous = NORMAL` — 성능/안정성 균형 |
| 캐시 크기 | `cache_size = -20000` — 20MB 페이지 캐시 |
| 메모리 맵 | `mmap_size = 268435456` — 256MB 메모리 매핑 |
| 임시 저장소 | `temp_store = MEMORY` — 임시 연산 메모리 처리 |
| 외래 키 | `foreign_keys = ON` — 참조 무결성 강제 |
| 쿼리 최적화 | `optimize` pragma | 쿼리 플래너 자동 최적화 |

### 1.4 배포 인프라

| 구성 요소 | 기술 | 설명 |
|---|---|---|
| 컨테이너화 | Docker | `Dockerfile` 포함 |
| 프로세스 선언 | Procfile | `web: npm start` — Railway/Heroku 호환 |
| CI/CD | GitHub Actions | `.github/workflows/` 정의 |
| 리버스 프록시 | Nginx (선택) | `TRUST_PROXY=1` 환경변수로 활성화 |

---

## 2. 전체 디렉토리 구조

```
Timeism/ (프로젝트 루트)
│
├── app.js                        ← Express 애플리케이션 진입점 (994줄)
│                                    미들웨어, 라우팅, 에러 핸들러 전체 정의
├── package.json                  ← 의존성, npm 스크립트
├── drizzle.config.js             ← Drizzle ORM 설정 (schema, out, dialect)
├── Dockerfile                    ← Docker 이미지 빌드 정의
├── Procfile                      ← Railway/Heroku 프로세스 선언
├── .env.example                  ← 환경변수 예시 (실제 .env는 gitignore)
├── .gitignore
├── AGENTS.md                     ← 개발 가이드 (AI 에이전트용)
├── README.md                     ← 서비스 소개
│
├── routes/                       ← Express 라우터 모듈
│   ├── api.js                    ← 핵심 REST API (381줄)
│   │                                check-time, session-init, log-event,
│   │                                analytics/*, trending-urls
│   └── comments.js               ← 댓글 CRUD API (143줄)
│                                    GET/POST /api/comments/:pageId
│                                    DELETE /api/comments/:commentId
│
├── lib/                          ← 공유 비즈니스 로직 & 유틸리티
│   ├── timeFetch.js              ← 서버 시간 측정 알고리즘 (158줄) ★핵심★
│   │                                HEAD → GET Range 폴백, 5회 측정, RTT 보정
│   ├── ssrf.js                   ← SSRF 방어 모듈 (135줄)
│   │                                18개 CIDR 블락, DNS 이중 검증
│   ├── repository.js             ← Drizzle ORM DB 접근 레이어 (267줄)
│   │                                users, sessions, events CRUD + analytics 쿼리
│   ├── comment-repository.js     ← 댓글 전용 DB 레이어 (129줄)
│   │                                CRUD + IP 레이트 리밋 + 자동 정리
│   ├── identity.js               ← IP 정규화 & SHA-256 해싱 (35줄)
│   ├── blog-data.js              ← 블로그 포스트 메타데이터 (135줄, 정적)
│   ├── target-sites.js           ← 타겟 사이트 메타데이터 (200줄, 정적)
│   └── i18n/
│       ├── index.js              ← 다국어 헬퍼 (140줄)
│       │                            locale 감지, t(), hreflang 생성
│       └── locales/
│           ├── en.json           ← 영어 번역 데이터
│           ├── ko.json           ← 한국어 번역 데이터
│           ├── jp.json           ← 일본어 번역 데이터
│           └── zh-tw.json        ← 중국어번체 번역 데이터
│
├── db/                           ← 데이터베이스 관련
│   ├── schema.js                 ← Drizzle ORM 테이블 스키마 (175줄)
│   │                                users, sessions, events, comments, survey_responses
│   ├── index.js                  ← DB 초기화 & 싱글톤 (105줄)
│   │                                SQLite pragma 최적화 설정 포함
│   ├── init.js                   ← DB 초기화 스크립트 (최초 실행용)
│   └── migrations/
│       └── add-locale-to-events.js ← events 테이블에 locale 컬럼 추가 마이그레이션
│
├── middleware/
│   └── rate-limiter.js           ← 레이트 리밋 전략 (80줄)
│                                    apiLimiter(10회/분), trendingLimiter(10회/분),
│                                    strictLimiter(20회/분) — 다국어 에러 메시지 포함
│
├── views/                        ← EJS 템플릿 (서버사이드 렌더링)
│   ├── index.ejs                 ← 메인 페이지 (35KB, 핵심 UI)
│   ├── game.ejs                  ← 게임 페이지 (30KB)
│   ├── trends.ejs                ← 트렌드 분석 페이지
│   ├── guide.ejs                 ← 사용 가이드
│   ├── about.ejs                 ← About 페이지
│   ├── contact.ejs               ← Contact 페이지
│   ├── privacy.ejs               ← 개인정보처리방침 (41KB)
│   ├── privacy-detail.ejs        ← 상세 개인정보 처리 (41KB)
│   ├── terms.ejs                 ← 이용약관 (40KB)
│   ├── survey.ejs                ← 설문조사 페이지
│   ├── site-page.ejs             ← 개별 사이트 전용 소개 페이지
│   ├── alarm-test.ejs            ← 알람 기능 독립 테스트 페이지
│   ├── 404.ejs                   ← 404 에러 페이지
│   ├── blog/
│   │   ├── index.ejs             ← 블로그 목록
│   │   ├── post.ejs              ← 블로그 포스트 레이아웃
│   │   └── posts/                ← 개별 포스트 EJS (10개)
│   │       ├── server-time-guide.ejs
│   │       ├── ticketing-tips.ejs
│   │       ├── ntp-vs-http.ejs
│   │       ├── ticketing-korea.ejs (32KB)
│   │       ├── course-registration.ejs (28KB)
│   │       ├── time-sync-deep-dive.ejs (38KB, 최대)
│   │       ├── ticketing-japan.ejs
│   │       ├── ticketing-global.ejs
│   │       ├── mobile-vs-pc.ejs
│   │       └── network-optimization.ejs
│   └── partials/                 ← 재사용 컴포넌트
│       ├── header.ejs            ← 공통 헤더 (언어 전환 포함)
│       ├── footer.ejs            ← 공통 푸터
│       ├── meta.ejs              ← SEO 메타 태그, OG 태그
│       ├── breadcrumb.ejs        ← 브레드크럼 내비게이션
│       ├── comments.ejs          ← 댓글 컴포넌트 UI
│       ├── cookie-consent.ejs    ← 쿠키 동의 배너
│       ├── newsletter.ejs        ← 뉴스레터 구독 폼
│       ├── social-share.ejs      ← SNS 공유 버튼
│       └── trust-indicators.ejs  ← 신뢰도 지표 섹션 (13KB)
│
├── public/                       ← 정적 파일 (express.static 서빙)
│   ├── css/
│   │   ├── style.css             ← 메인 스타일시트 (15KB)
│   │   ├── tokens.css            ← CSS 디자인 토큰 (변수 정의)
│   │   ├── ad-banners.css        ← Google AdSense 배너 영역
│   │   ├── alarm-effects.css     ← 알람 시각 효과 (오버레이, 카운트다운)
│   │   ├── language-switcher.css ← 언어 전환 버튼 UI
│   │   ├── quick-sites.css       ← 빠른 접속 사이트 섹션
│   │   ├── seo-content.css       ← SEO용 추가 콘텐츠 섹션 (6.6KB)
│   │   ├── three-column-layout.css ← 3컬럼 반응형 레이아웃
│   │   ├── timezone-warning.css  ← 타임존 경고 배너
│   │   └── trending-sites.css    ← 트렌딩 사이트 목록 UI
│   ├── js/
│   │   ├── main.js               ← 메인 진입점 (156줄, 모듈 오케스트레이터)
│   │   ├── test-alarm.js         ← 알람 테스트 페이지용
│   │   └── modules/              ← ES Modules
│   │       ├── alarm.js          ← 알람 전체 로직 (434줄) ★복잡★
│   │       ├── api.js            ← fetch 래퍼, URL 정규화, 에러 처리 (213줄)
│   │       ├── time-display.js   ← 서버 시간 UI 렌더링 + 타임존 경고 (209줄)
│   │       ├── session.js        ← 세션 초기화, 이벤트 전송 (148줄)
│   │       ├── settings.js       ← 표시 설정 (밀리초 on/off 등)
│   │       ├── display-settings.js ← 디스플레이 옵션 초기화
│   │       ├── pre-alarms.js     ← 1/2/3분 전 사전 알람 (119줄)
│   │       ├── timezone-utils.js ← 타임존 감지, 경고 메시지 생성
│   │       └── trending-sites.js ← 트렌딩 URL API 호출 + 렌더링 (137줄)
│   └── admin/
│       ├── login.html            ← 관리자 로그인 페이지
│       ├── dashboard.html        ← 관리자 대시보드 (10KB)
│       └── dashboard.js          ← 대시보드 JS (analytics API 호출, 9.4KB)
│
├── data/
│   └── app.db                   ← SQLite DB 파일 (런타임 생성, gitignore)
│
├── scripts/                      ← 유틸리티 스크립트
│   ├── create-og-image.js       ← OG 이미지 생성 (Canvas API)
│   ├── create-og-image-puppeteer.js ← OG 이미지 생성 (Puppeteer)
│   ├── generate-og-image.js     ← OG 이미지 생성 (단순 버전)
│   └── verify-seo.ps1           ← SEO 검증 (PowerShell, 7.2KB)
│
├── marketing/                    ← 마케팅 자료 및 데이터 수집 도구
│   ├── README.md
│   ├── TODO.md
│   ├── extract_all_events.py    ← 이벤트 전체 추출
│   ├── extract_events.py        ← 이벤트 추출
│   ├── fetch_schedules.py       ← 공연 스케줄 수집
│   ├── parse_schedules.py       ← 스케줄 파싱
│   ├── generate_jp_global_data.py ← 일본/글로벌 데이터 생성
│   ├── clean_corrupted_events.py ← 손상 이벤트 정리
│   ├── requirements.txt         ← Python 의존성
│   └── output/                  ← 추출 데이터 저장 디렉토리
│
└── docs/                         ← 프로젝트 문서 (29개 파일)
    ├── FEATURES.md               ← 기능 기획서 (이 문서와 쌍)
    ├── ARCHITECTURE.md           ← 아키텍처 설계서 (이 문서)
    ├── PROJECT_STRUCTURE.md      ← 상세 구조 (31KB)
    ├── TIMEFETCH_ALGORITHM.md    ← 시간 측정 알고리즘 심층 분석 (14KB)
    ├── DRIZZLE_MIGRATION.md      ← DB 마이그레이션 가이드
    ├── API_ANALYSIS.md           ← API 분석 보고서
    ├── IMPLEMENTATION_PLAN.md    ← 구현 계획
    ├── DEPLOYMENT_CHECKLIST.md   ← 배포 체크리스트
    ├── RAILWAY_DEPLOYMENT.md     ← Railway 배포 가이드
    ├── ADSENSE_*.md              ← AdSense 구현 단계별 문서 (5개)
    ├── SEO_*.md                  ← SEO 관련 문서 (여러 개)
    └── ...                       ← 기타 문서
```

---

## 3. 데이터베이스 스키마 (Drizzle ORM)

### 3.1 `users` 테이블

```sql
CREATE TABLE users (
  user_id       TEXT     PRIMARY KEY,          -- nanoid 생성 고유 ID
  ip_hash       TEXT,                          -- IP SHA-256 해시
  user_agent    TEXT,                          -- 브라우저 User-Agent
  region        TEXT,                          -- 타임존 또는 언어 코드 (Intl 기반)
  device_type   TEXT,                          -- desktop | mobile | tablet
  first_visit_at TEXT,                         -- ISO 8601 최초 방문
  last_visit_at TEXT,                          -- ISO 8601 최근 방문
  visit_count   INTEGER NOT NULL DEFAULT 1     -- 총 방문 횟수
);

CREATE INDEX idx_users_first_visit ON users(first_visit_at);
CREATE INDEX idx_users_last_visit  ON users(last_visit_at);
```

**UPSERT 전략:**  
`ON CONFLICT(user_id) DO UPDATE SET` → 재방문 시 `last_visit_at` 갱신, `visit_count += 1`

---

### 3.2 `sessions` 테이블

```sql
CREATE TABLE sessions (
  session_id TEXT PRIMARY KEY,          -- nanoid 생성 세션 ID
  user_id    TEXT REFERENCES users(user_id),
  start_at   TEXT,                      -- ISO 8601 세션 시작
  end_at     TEXT                       -- ISO 8601 세션 종료 (NULL = 진행 중)
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_start_at ON sessions(start_at);
```

**UPSERT 전략:**  
`ON CONFLICT(session_id) DO UPDATE SET` → 기존 세션이면 `end_at = NULL` (재개)

---

### 3.3 `events` 테이블

```sql
CREATE TABLE events (
  event_id   INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT REFERENCES sessions(session_id),
  event_type TEXT,                      -- 이벤트 타입 (view_time, click_button 등)
  target_url TEXT,                      -- 조회한 URL (nullable)
  latency_ms INTEGER,                   -- RTT 밀리초 (nullable)
  locale     TEXT DEFAULT 'en',         -- 언어 코드
  timestamp  TEXT                       -- ISO 8601 이벤트 발생 시각
);

CREATE INDEX idx_events_session_id  ON events(session_id);
CREATE INDEX idx_events_event_type  ON events(event_type);
CREATE INDEX idx_events_timestamp   ON events(timestamp);
```

---

### 3.4 `comments` 테이블

```sql
CREATE TABLE comments (
  comment_id   INTEGER PRIMARY KEY AUTOINCREMENT,
  page_id      TEXT    NOT NULL,        -- 페이지 식별자
  author       TEXT    NOT NULL,        -- 항상 'Anonymous'
  content      TEXT    NOT NULL,        -- 최대 200자
  ip_hash      TEXT    NOT NULL,        -- IP SHA-256 해시
  created_at   TEXT    NOT NULL,        -- ISO 8601
  is_deleted   INTEGER NOT NULL DEFAULT 0,   -- 소프트 삭제 플래그
  report_count INTEGER NOT NULL DEFAULT 0    -- 신고 횟수
);

CREATE INDEX idx_comments_page_id    ON comments(page_id);
CREATE INDEX idx_comments_created_at ON comments(created_at);
CREATE INDEX idx_comments_ip_hash    ON comments(ip_hash);
```

**자동 정리**: 새 댓글 추가 후 `cleanupOldComments(pageId, 10)` 호출 → 페이지당 최신 10개만 유지, 초과분은 **하드 삭제** (DB 공간 절약)

---

### 3.5 `survey_responses` 테이블

```sql
CREATE TABLE survey_responses (
  response_id         INTEGER PRIMARY KEY AUTOINCREMENT,
  satisfaction        INTEGER NOT NULL,        -- 1~5점
  useful_feature      TEXT    NOT NULL,        -- 가장 유용한 기능
  improvement         TEXT,                    -- 개선 희망 사항
  additional_feedback TEXT,                    -- 추가 의견
  ip_hash             TEXT    NOT NULL,        -- 중복 제출 방지
  created_at          TEXT    NOT NULL         -- ISO 8601
);

CREATE INDEX idx_survey_created_at ON survey_responses(created_at);
CREATE INDEX idx_survey_ip_hash    ON survey_responses(ip_hash);
```

---

## 4. API 엔드포인트 전체 명세

### 4.1 공개 API

#### `POST /api/check-time`
- **Rate Limit**: 10회/분 (apiLimiter), app.js에서 30회/분 추가 적용 (중복)
- **Request Body**: `{ "target_url": "https://example.com" }`
- **Response 200**:
  ```json
  {
    "target_url": "https://example.com",
    "server_time_utc": "2026-03-22T08:38:37.000Z",
    "server_time_estimated_epoch_ms": 1742636317421,
    "SyncTime_server_time_ms": 1742636317500
  }
  ```
- **Debug 모드** (`?debug=1`): `rtt_ms` 필드 추가 포함
- **캐시 정책**: `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate`
- **에러 응답**:

| HTTP | 에러 코드 | 조건 |
|---|---|---|
| 400 | `INVALID_URL` | URL 형식 오류 또는 비HTTP |
| 400 | `BLOCKED_HOST` | localhost, .local, .internal |
| 400 | `BLOCKED_IP` | 내부 IP 범위 접근 |
| 502 | `DNS_LOOKUP_FAILED` | DNS 조회 실패 |
| 502 | `TIME_UNAVAILABLE` | Date 헤더 없음 또는 파싱 불가 |
| 504 | `TIMEOUT` | 3초 이내 응답 없음 |
| 429 | `RATE_LIMITED` | 레이트 리밋 초과 |

---

#### `POST /api/session-init`
- **Rate Limit**: 30회/분
- **Request Body**:
  ```json
  {
    "user_id": "user_abc123",
    "session_id": "sess_xyz789",
    "user_agent": "Mozilla/5.0...",
    "region": "Asia/Seoul",
    "device_type": "desktop"
  }
  ```
- **동작**: user_id/session_id 없으면 서버에서 nanoid로 새로 생성
- **Response 200**:
  ```json
  {
    "user_id": "user_abc123",
    "session_id": "sess_xyz789",
    "started_at": "2026-03-22T08:38:37.000Z"
  }
  ```

---

#### `POST /api/log-event`
- **Rate Limit**: 30회/분
- **Request Body**:
  ```json
  {
    "session_id": "sess_xyz789",
    "event_type": "click_button",
    "target_url": "https://ticket.yes24.com",
    "latency_ms": 342
  }
  ```
- **검증**: `session_id`, `event_type` 필수 / URL 최대 2048자 / latency_ms 정수 변환
- **Response 200**: `{ "ok": true }`

---

#### `GET /api/trending-urls`
- **Rate Limit**: 10회/분 (trendingLimiter)
- **Query Params**: `locale` (기본: en), `limit` (기본: 5, 최대: 10)
- **데이터 기준**: 최근 1시간 이내 `url_check` 이벤트
- **Response 200**:
  ```json
  {
    "locale": "ko",
    "trending": [
      {
        "url": "https://ticket.yes24.com",
        "name": "ticket.yes24.com",
        "count": 42,
        "lastChecked": "2026-03-22T08:35:12.000Z"
      }
    ],
    "timestamp": "2026-03-22T08:38:37.000Z"
  }
  ```

---

#### `GET /api/comments/:pageId`
- **Query Params**: `limit` (기본: 20), `offset` (기본: 0)
- **Response**: `{ success, comments: [{id, content, createdAt}], total, limit, offset }`
- 삭제된 댓글(`is_deleted = 1`) 제외, `createdAt` 내림차순

#### `POST /api/comments`
- **Request Body**: `{ "pageId": "main-page", "content": "...", "honeypot": "" }`
- **검증**: content 2~200자, 5분 내 같은 IP 3회 이상 시 429
- **동작**: 저장 후 `cleanupOldComments(pageId, 10)` 자동 호출
- **Response**: `{ success, commentId, message }`

#### `DELETE /api/comments/:commentId`
- **동작**: 소프트 삭제 (`is_deleted = 1`)
- **Response**: `{ success, message }`

---

### 4.2 관리자 전용 API

모든 관리자 API는 `verifyAdminToken` 미들웨어를 통해 인증:
- 쿼리 파라미터: `?token=ADMIN_TOKEN`
- HTTP 헤더: `X-Admin-Token: ADMIN_TOKEN`

#### `GET /api/analytics/users`
```json
{
  "total_users": 1234,
  "regions": 15,
  "total_visits": 5678,
  "avg_visits_per_user": 4.6,
  "max_visits": 89
}
```

#### `GET /api/analytics/events`
- **Query Params**: `event_type`, `limit` (최대 1000), `offset`
```json
[
  {
    "event_type": "click_button",
    "count": 3421,
    "avg_latency_ms": 234.5,
    "min_latency_ms": 45,
    "max_latency_ms": 2341,
    "unique_sessions": 891
  }
]
```

#### `GET /api/analytics/devices`
```json
[
  {
    "device_type": "desktop",
    "total_users": 890,
    "sessions": 1243,
    "avg_visits": 3.2,
    "total_events": 4521
  }
]
```

#### `GET /api/analytics/urls`
- **Query Params**: `limit` (최대 500), `offset`
```json
[
  {
    "target_url": "https://ticket.yes24.com",
    "requests": 234,
    "avg_latency_ms": 187.3,
    "min_latency_ms": 89,
    "max_latency_ms": 891,
    "unique_sessions": 145
  }
]
```

#### `GET /api/analytics/performance`
```json
{
  "total_events": 12345,
  "avg_latency_ms": 213.4,
  "min_latency_ms": 34,
  "max_latency_ms": 5234,
  "slow_events": 89,
  "unique_sessions": 1234
}
```

> `slow_events`: `latency_ms > 1000` 인 이벤트 수

#### `GET /api/analytics/summary`
위의 users, events(상위 10개), devices, performance를 하나의 응답으로 합산하여 반환.

---

## 5. 라우팅 구조 전체

### 5.1 다국어 URL 매핑

```
/                → locale 감지 후 /{locale}/ 리다이렉트 (default: en)
/{locale}/       → views/index.ejs

/{locale}/guide     → views/guide.ejs
/{locale}/about     → views/about.ejs
/{locale}/contact   → views/contact.ejs
/{locale}/privacy   → views/privacy.ejs
/{locale}/terms     → views/terms.ejs
/{locale}/game      → views/game.ejs
/{locale}/alarm-test → views/alarm-test.ejs
/{locale}/trends    → views/trends.ejs (DB 쿼리 포함)
/{locale}/survey    → views/survey.ejs (GET/POST)
/{locale}/blog      → views/blog/index.ejs (en, ko만 구현)
/{locale}/blog/:slug → views/blog/post.ejs + views/blog/posts/{slug}.ejs
/{locale}/sites/:siteId → views/site-page.ejs (en, ko만 구현)
```

`{locale}` = `en` | `ko` | `jp` | `zh-tw`

### 5.2 레거시 경로 (리다이렉트)

```
/guide      → /{detected-locale}/guide
/privacy    → /{detected-locale}/privacy
/about      → /{detected-locale}/about
/contact    → /{detected-locale}/contact
/terms      → /{detected-locale}/terms
/alarm-test → /{detected-locale}/alarm-test
```

### 5.3 관리자 경로

```
GET  /admin                   → public/admin/login.html
GET  /admin/dashboard?token=  → public/admin/dashboard.html (토큰 인증)
GET  /api/analytics/:endpoint → api.js analytics 라우터 (토큰 인증 후 전달)
```

### 5.4 SEO 경로

```
GET /robots.txt   → 동적 생성 (Disallow: /api/, /admin/)
GET /sitemap.xml  → 동적 생성 (전체 페이지 × 4개 언어)
GET /ads.txt      → 정적 파일
```

---

## 6. 서버 시간 측정 알고리즘 (timeFetch.js)

### 6.1 전체 흐름

```
measureServerTime(targetUrl)
│
├─ [1~5회 반복] measureServerTimeSingle(targetUrl)
│   │
│   ├─ assertUrlIsSafe(url)
│   │   ├─ URL 파싱 검증 (new URL())
│   │   ├─ protocol 검증 (http/https만 허용)
│   │   ├─ 호스트명 블락 검사 (localhost, .local, .internal)
│   │   ├─ 직접 IP 입력 시 CIDR 블락 검사
│   │   └─ DNS 룩업 후 해석된 IP도 CIDR 블락 재검사
│   │
│   ├─ [시도 1] HEAD 요청 (method: 'HEAD')
│   │   ├─ tStart = Date.now()
│   │   ├─ requestWithRedirects(url, {method:'HEAD'})
│   │   │   └─ 리다이렉트 최대 3회 추적
│   │   │       각 리다이렉트 URL도 SSRF 재검증
│   │   ├─ tEnd = Date.now()
│   │   ├─ Date 헤더 추출
│   │   └─ computeTimeResult(dateHeader, tStart, tEnd)
│   │       → serverTime + RTT/2 = 추정 서버 시각
│   │
│   └─ [시도 2, 폴백] HEAD 실패 시 GET Range 요청
│       (headers: {'Range': 'bytes=0-0'})
│       → Date 헤더 추출 → computeTimeResult()
│
├─ 5회 측정 결과를 RTT 오름차순 정렬
└─ 최솟값(RTT 가장 작은 측정 = 가장 정확) 반환
```

### 6.2 RTT 보정 공식

```
server_time_estimated = Date(dateHeader).getTime() + (RTT / 2)
```

**근거**: 요청 전송부터 응답 수신까지의 왕복 시간(RTT)의 절반이 응답 헤더가 생성된 시점에서 클라이언트가 수신한 시점까지의 지연이라고 가정.

### 6.3 클라이언트측 추가 보정

`api.js` 클라이언트 모듈에서 API 호출 전후 `performance.now()`로 측정한 클라이언트-서버 RTT의 절반을 추가 합산:

```javascript
const adjustedMs = payload.server_time_estimated_epoch_ms + (clientRTT / 2);
```

### 6.4 실시간 시계 갱신

`time-display.js`에서 `requestAnimationFrame` 루프로 표시:

```javascript
const elapsed = performance.now() - serverClockStartPerf;
const current = serverClockBase + elapsed;
// serverClockBase: 서버 시간 응답 수신 당시의 추정 epoch ms
// serverClockStartPerf: 응답 수신 당시의 performance.now()
```

→ `performance.now()` 기반 경과 시간은 서버 시간 + 경과 = 현재 서버 시각. 브라우저 `Date.now()`보다 고정밀.

### 6.5 SSRF 방어 상세 (ssrf.js)

차단되는 IP 범위 (18개 CIDR):

| CIDR | 설명 |
|---|---|
| `0.0.0.0/8` | 미할당 주소 |
| `10.0.0.0/8` | 사설 네트워크 A |
| `100.64.0.0/10` | 공유 주소 공간 (CGNAT) |
| `127.0.0.0/8` | 루프백 |
| `169.254.0.0/16` | 링크-로컬 (AWS IMDS: 169.254.169.254) |
| `172.16.0.0/12` | 사설 네트워크 B |
| `192.0.0.0/24` | IETF 프로토콜 |
| `192.0.2.0/24` | 문서용 예약 |
| `192.88.99.0/24` | 예약 |
| `192.168.0.0/16` | 사설 네트워크 C |
| `198.18.0.0/15` | 벤치마크 테스트 |
| `198.51.100.0/24` | 문서용 예약 |
| `203.0.113.0/24` | 문서용 예약 |
| `224.0.0.0/4` | 멀티캐스트 |
| `240.0.0.0/4` | 예약 |
| `255.255.255.255/32` | 브로드캐스트 |
| `::1/128` | IPv6 루프백 |
| `fc00::/7` | IPv6 사설 (ULA) |
| `fe80::/10` | IPv6 링크-로컬 |
| `ff00::/8` | IPv6 멀티캐스트 |

차단 호스트명:
- 정확 일치: `localhost`
- 접미사: `.local`, `.internal`

---

## 7. 프론트엔드 모듈 상세

### 7.1 모듈 의존 관계

```
main.js (오케스트레이터)
├── settings.js         ← localStorage 기반 표시 설정
├── session.js          ← 세션 초기화, sendEvent()
├── time-display.js     ← 시계 루프, 렌더링
│   └── timezone-utils.js  ← 타임존 감지
├── alarm.js            ← 알람 상태 관리
│   (getServerClockBase 콜백 → time-display.js 연결)
├── api.js              ← fetch + URL 정규화
│   (onTimeResult 콜백 → time-display.js로 결과 전달)
├── display-settings.js ← 추가 표시 옵션
├── pre-alarms.js       ← 사전 알람 (1/2/3분 전)
└── trending-sites.js   ← 트렌딩 URL 로드/렌더링
```

### 7.2 모듈별 역할 상세

#### `session.js`
- `localStorage['timecheck.session']`에 `{userId, sessionId, startedAt, lastSyncedAt}` 저장
- 브라우저의 `crypto.randomUUID()`로 ID 생성 (폴백: `Math.random()`)
- `device_type` 감지: `navigator.userAgent` 파싱 (`tablet` > `mobile` > `desktop`)
- `region` 감지: `Intl.DateTimeFormat().resolvedOptions().timeZone` (예: `Asia/Seoul`)
- `view_time` 이벤트 시 `PerformanceNavigationTiming`으로 pageLoadTime, domReadyTime, FP, FCP 수집

#### `alarm.js` (2-Phase 모니터링)
- **Phase 1**: `setInterval(100ms)` → 목표 시각-2초 도달 시 Phase 2 전환
- **Phase 2**: `setInterval(10ms)` → 목표 시각 도달 시 `triggerAlarm()` 호출
- **BBC 시보음**: `OscillatorNode` 6개 × 짧은 비프(100ms) + 1개 긴 비프(1000ms)
- `AudioContext` 재사용: 사용자 첫 클릭 시 한 번만 초기화, 이후 재사용

#### `api.js`
- `normalizeUrl()`: 프로토콜 없으면 `https://` 추가 (`localhost` → `http://`)
- 응답 수신 후 클라이언트 RTT/2 추가 보정
- 에러 타입별 다국어 메시지 (한국어/영어)
- `skeleton` 클래스로 로딩 상태 표시
- `sendEvent('check_time_error', ...)` — 에러 발생 시에도 이벤트 기록

#### `time-display.js`
- `requestAnimationFrame` 루프 → 서버 시계 실시간 갱신
- UTC 오프셋 표시: `Intl.DateTimeFormat` 기반 (`UTC+9`, `UTC-5` 등)
- 밀리초 표시 옵션: `settings.showMillis` 플래그
- 타임존 경고: 서버 UTC vs 사용자 로컬 UTC 비교 후 불일치 시 `#timezoneWarning` 표시

#### `pre-alarms.js`
- `setInterval(100ms)` 루프로 남은 시간 모니터링
- `Set<string>` (`firedAlarms`)으로 중복 발동 방지
- 각 알람 옵션 설정값을 `localStorage`에 영속화

#### `trending-sites.js`
- `escapeHtml()` — XSS 방지 (DOM `textContent` 이용)
- 5분마다 자동 새로고침 (`setInterval(5 * 60 * 1000)`)
- 빈 상태: 4개 언어 안내 메시지

---

## 8. 다국어 시스템 (i18n)

### 8.1 번역 데이터 구조

`lib/i18n/locales/{locale}.json` 형식으로 저장. EJS 템플릿에서 `t('key.path')` 또는 `translations.sites.interpark` 형태로 접근.

### 8.2 서버 측 locale 감지 (i18n/index.js)

```javascript
function detectLocale(req) {
  // 1. URL 경로: /ko/, /en/, /jp/, /zh-tw/
  const pathLocale = req.path.split('/')[1];
  if (SUPPORTED_LOCALES.includes(pathLocale)) return pathLocale;

  // 2. 쿼리 파라미터: ?lang=ko
  if (req.query.lang && SUPPORTED_LOCALES.includes(req.query.lang))
    return req.query.lang;

  // 3. Accept-Language 첫 번째 언어
  const acceptLang = req.headers['accept-language']?.split(',')[0].split('-')[0];
  if (SUPPORTED_LOCALES.includes(acceptLang)) return acceptLang;

  // 4. 기본값
  return 'en';
}
```

### 8.3 hreflang 링크 자동 생성 예시

`/ko/blog/ticketing-tips` 접근 시 생성되는 hreflang:
```html
<link rel="alternate" hreflang="en"     href="https://synctime.keero.site/en/blog/ticketing-tips">
<link rel="alternate" hreflang="ko"     href="https://synctime.keero.site/ko/blog/ticketing-tips">
<link rel="alternate" hreflang="jp"     href="https://synctime.keero.site/jp/blog/ticketing-tips">
<link rel="alternate" hreflang="zh-Hant" href="https://synctime.keero.site/zh-tw/blog/ticketing-tips">
<link rel="alternate" hreflang="x-default" href="https://synctime.keero.site/blog/ticketing-tips">
```

---

## 9. Rate Limiting 전략

| Limiter | 적용 경로 | 윈도우 | 최대 요청 | 에러 メッセージ |
|---|---|---|---|---|
| `checkTimeLimiter` (app.js) | `POST /api/check-time` | 1분 | 30 | 다국어 불지원 (기본) |
| `logEventLimiter` (app.js) | `POST /api/log-event` | 1분 | 30 | 기본 |
| `sessionInitLimiter` (app.js) | `POST /api/session-init` | 1분 | 30 | 기본 |
| `apiLimiter` (middleware) | `POST /api/check-time` | 1분 | 10 | **4개 언어** 에러 메시지 |
| `trendingLimiter` (middleware) | `GET /api/trending-urls` | 1분 | 10 | **4개 언어** 에러 메시지 |
| `strictLimiter` (middleware) | (현재 미사용) | 1분 | 20 | 기본 |
| 댓글 IP 제한 | `POST /api/comments` | 5분 | 3 | 하드코딩 (코드 레벨) |

> ⚠️ `checkTimeLimiter`(30/분)과 `apiLimiter`(10/분)이 둘 다 `/api/check-time`에 적용. 실질적으로 10회/분이 effective limit.

---

## 10. 환경변수 전체 목록

| 변수 | 기본값 | 설명 |
|---|---|---|
| `PORT` | `3000` | Express 서버 포트 |
| `DOMAIN` | `https://synctime.keero.site` | sitemap/hreflang/OG 이미지 URL |
| `NODE_ENV` | — | `production` 시 morgan combined, 정적 파일 캐시 |
| `TRUST_PROXY` | — | `1` 설정 시 `app.set('trust proxy', 1)` |
| `RATE_LIMIT_MAX` | `30` | checkTimeLimiter 분당 최대 요청 수 |
| `ADMIN_TOKEN` | `admin_secret_token_change_me` | 관리자 인증 토큰 (**운영 시 반드시 변경**) |
| `IP_HASH_SALT` | `default_ip_salt` | IP 해싱용 솔트값 (**운영 시 반드시 변경**) |
| `DB_PATH` | `./data/app.db` | SQLite DB 파일 경로 |

---

## 11. npm 스크립트

| 스크립트 | 명령어 | 설명 |
|---|---|---|
| `npm start` | `node app.js` | 프로덕션 서버 실행 |
| `npm run dev` | `nodemon app.js` | 개발 서버 (파일 변경 자동 재시작) |
| `npm run db:init` | `node db/init.js` | DB 초기화 (최초 실행 또는 리셋) |
| `npm run db:push` | `drizzle-kit push` | 스키마 → DB 직접 반영 (마이그레이션 없음) |
| `npm run db:generate` | `drizzle-kit generate` | 마이그레이션 파일 생성 |
| `npm run db:studio` | `drizzle-kit studio` | Drizzle Studio 웹 GUI 실행 |
| `npm test` | `echo No tests && exit 0` | 테스트 미구현 |

---

## 12. 배포 아키텍처

```
  사용자 브라우저
       │  HTTPS
       ▼
  [CDN / 리버스 프록시 - Nginx 등]
       │  TRUST_PROXY=1 설정 필요
       │  IP 전달: X-Forwarded-For
       ▼
  [Node.js / Express]   PORT: 3000
    ├─ /public/*  ──→  express.static (캐시 가능)
    ├─ /api/*     ──→  Routes (apiRouter, commentsRouter)
    │                  Rate Limit → 처리 → SQLite
    ├─ /{locale}/* ──→ EJS 렌더링 → HTML 응답
    └─ /admin/*   ──→  Token 검증 → dashboard.html
       │
       ▼
  [SQLite: data/app.db]
    (Docker 볼륨 마운트 권장: /app/data)
       │
       ▼ (외부 사이트 요청)
  [Target Server]  ex: ticket.yes24.com
    Data Flow: HEAD/GET → Date 헤더 → RTT 보정 → 응답
```

**Docker 배포 시:**
```dockerfile
VOLUME /app/data   # SQLite 데이터 영속화
```

**Railway/Heroku 배포:**
```
Procfile: web: npm start
```

---

## 13. 코딩 컨벤션

| 항목 | 규칙 |
|---|---|
| 모듈 시스템 | CommonJS (`require/module.exports`) — 서버 |
| 모듈 시스템 | ES Modules (`import/export`) — 프론트엔드 JS |
| 들여쓰기 | 2 spaces (서버) / 4 spaces (프론트엔드 일부) |
| 문자열 | 작은따옴표 |
| JSON 필드 | snake_case (`target_url`, `session_id`) |
| JS 변수 | camelCase |
| CSS 클래스 | kebab-case |
| 파일명 | kebab-case |
| 비동기 | `async/await` 우선, 조기 반환 패턴 |
| 줄 길이 | ~100자 |
| 에러 처리 | `UrlSafetyError` 커스텀 에러 클래스 (code + message) |
