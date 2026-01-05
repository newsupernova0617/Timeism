# Timeism 프로젝트 구조 분석 보고서

> 작성일: 2026-01-05  
> 버전: 1.0.0  
> 분석 대상: Timeism - HTTP Date 헤더 기반 서버 시간 비교 서비스

---

## 📋 목차

1. [프로젝트 개요](#-프로젝트-개요)
2. [기술 스택](#-기술-스택)
3. [디렉토리 구조](#-디렉토리-구조)
4. [핵심 모듈 분석](#-핵심-모듈-분석)
5. [데이터베이스 설계](#-데이터베이스-설계)
6. [API 명세](#-api-명세)
7. [보안 및 개인정보 보호](#-보안-및-개인정보-보호)
8. [프론트엔드 아키텍처](#-프론트엔드-아키텍처)
9. [배포 및 운영](#-배포-및-운영)
10. [향후 개선 사항](#-향후-개선-사항)

---

## 🎯 프로젝트 개요

**Timeism**은 사용자가 입력한 대상 URL의 HTTP `Date` 헤더를 안전하게 조회하여, 네트워크 왕복시간(RTT)의 절반을 보정한 서버 기준 현재 시각의 근사치를 제공하는 웹 애플리케이션입니다.

### 주요 특징

- ✅ **정확한 시간 측정**: RTT 보정을 통한 서버 시간 추정
- 🔒 **강력한 보안**: SSRF 방어, IP 해싱, 레이트 리밋
- 📊 **분석 기능**: 사용자/이벤트/성능 통계 대시보드
- 🎨 **접근성**: 다크모드, 시맨틱 HTML, ARIA 속성
- 🚀 **SEO 최적화**: 동적 메타 태그, 사이트맵, OG 이미지

### 사용 사례

1. 원격 서버의 현재 시간 확인
2. 네트워크 지연 시간 측정
3. 시간 동기화 검증
4. 글로벌 서버 시간 비교

---

## 🛠 기술 스택

### 백엔드

| 기술 | 버전 | 용도 |
|------|------|------|
| **Node.js** | 20.x | 런타임 환경 |
| **Express** | 5.1.0 | 웹 프레임워크 |
| **EJS** | 3.1.10 | 템플릿 엔진 |
| **SQLite** | 5.1.7 | 데이터베이스 |
| **Helmet** | 8.1.0 | 보안 헤더 |
| **Express Rate Limit** | 8.1.0 | API 요청 제한 |

### 프론트엔드

- **바닐라 JavaScript** (ES6+ 모듈)
- **CSS3** (CSS Variables, Flexbox, Grid)
- **HTML5** (시맨틱 마크업)

### 개발 도구

| 도구 | 용도 |
|------|------|
| **nodemon** | 개발 서버 핫 리로드 |
| **dotenv** | 환경 변수 관리 |
| **morgan** | HTTP 로깅 |
| **compression** | Gzip 압축 |

---

## 📁 디렉토리 구조

```
Timeism/
│
├── 📄 app.js                      # Express 애플리케이션 진입점
├── 📄 package.json                # 프로젝트 의존성 및 스크립트
├── 📄 Dockerfile                  # Docker 컨테이너 설정
├── 📄 Procfile                    # Heroku 배포 설정
├── 📄 .env                        # 환경 변수 (Git 제외)
├── 📄 .gitignore                  # Git 제외 파일 목록
├── 📄 README.md                   # 프로젝트 문서
├── 📄 AGENTS.md                   # 개발 가이드라인
│
├── 📂 routes/                     # API 라우트
│   └── api.js                     # REST API 엔드포인트
│
├── 📂 lib/                        # 핵심 비즈니스 로직
│   ├── timeFetch.js               # HTTP Date 헤더 측정 및 RTT 보정
│   ├── ssrf.js                    # SSRF 방어 시스템
│   ├── identity.js                # IP 정규화 및 해싱
│   └── repository.js              # SQLite 데이터 접근 계층
│
├── 📂 db/                         # 데이터베이스
│   ├── schema.sql                 # 테이블 스키마 및 인덱스
│   ├── index.js                   # DB 연결 관리
│   └── init.js                    # 스키마 초기화 스크립트
│
├── 📂 views/                      # EJS 템플릿
│   ├── index.ejs                  # 메인 페이지
│   ├── guide.ejs                  # 사용 가이드
│   └── privacy.ejs                # 개인정보 처리방침
│
├── 📂 public/                     # 정적 파일
│   ├── index.html                 # 정적 HTML (백업)
│   ├── guide.html                 # 가이드 정적 페이지
│   ├── privacy.html               # 개인정보 정적 페이지
│   ├── og-image.png               # Open Graph 이미지
│   ├── google316361f253ab40e9.html # Google Search Console 인증
│   │
│   ├── 📂 css/
│   │   ├── tokens.css             # CSS 변수 (색상, 폰트, 간격)
│   │   └── style.css              # 메인 스타일시트
│   │
│   ├── 📂 js/
│   │   ├── main.js                # JavaScript 진입점
│   │   └── 📂 modules/
│   │       ├── api.js             # API 통신 모듈
│   │       ├── session.js         # 세션 관리
│   │       ├── time-display.js    # 시계 표시 로직
│   │       ├── alarm.js           # 알람 기능
│   │       └── settings.js        # 설정 관리
│   │
│   └── 📂 admin/
│       ├── dashboard.html         # 관리자 대시보드 UI
│       └── dashboard.js           # 대시보드 로직
│
├── 📂 data/                       # 런타임 데이터
│   └── app.db                     # SQLite 데이터베이스 (런타임 생성)
│
├── 📂 scripts/                    # 유틸리티 스크립트
│   ├── create-og-image.js         # OG 이미지 생성 (Canvas)
│   ├── create-og-image-puppeteer.js # OG 이미지 생성 (Puppeteer)
│   ├── generate-og-image.js       # OG 이미지 생성 헬퍼
│   └── verify-seo.ps1             # SEO 검증 PowerShell 스크립트
│
└── 📂 docs/                       # 프로젝트 문서
    ├── AGENTS.md                  # 개발 가이드라인
    ├── DEPLOYMENT_CHECKLIST.md    # 배포 체크리스트
    ├── RAILWAY_DEPLOYMENT.md      # Railway 배포 가이드
    ├── SEO_SETUP.md               # SEO 설정 가이드
    ├── SEO_IMPROVEMENTS.md        # SEO 개선 사항
    ├── SEO_COMPLETE.md            # SEO 완료 보고서
    ├── DEPLOY_SEO_FIX.md          # SEO 수정 배포 가이드
    └── JS_OVERVIEW.md             # JavaScript 구조 개요
```

---

## 🔧 핵심 모듈 분석

### 1. 백엔드 아키텍처

#### **`app.js`** - 애플리케이션 진입점

**역할**: Express 애플리케이션 설정 및 라우팅

**주요 기능**:
- 미들웨어 설정 (보안, 압축, 로깅)
- API 라우팅
- EJS 템플릿 렌더링
- 정적 파일 서빙
- SEO 파일 동적 생성 (robots.txt, sitemap.xml)
- 관리자 인증

**미들웨어 체인**:
```javascript
1. helmet()                    // 보안 헤더
2. compression()               // Gzip 압축
3. express.json()              // JSON 파싱 (최대 64KB)
4. morgan()                    // HTTP 로깅
5. checkTimeLimiter            // 레이트 리밋 (분당 30회)
```

**라우팅 구조**:
```
GET  /                         → index.ejs 렌더링
GET  /guide                    → guide.ejs 렌더링
GET  /privacy                  → privacy.ejs 렌더링
GET  /robots.txt               → 동적 생성
GET  /sitemap.xml              → 동적 생성
GET  /admin/dashboard          → 관리자 대시보드 (토큰 인증)
POST /api/check-time           → 시간 조회 API
POST /api/log-event            → 이벤트 로깅
POST /api/session-init         → 세션 초기화
GET  /api/analytics/*          → 분석 데이터 조회
```

---

#### **`routes/api.js`** - REST API 엔드포인트

**총 라인 수**: 318줄  
**엔드포인트 수**: 8개

##### 1️⃣ `POST /api/check-time`

**목적**: 대상 URL의 서버 시간 조회

**요청**:
```json
{
  "target_url": "https://example.com"
}
```

**응답** (성공):
```json
{
  "target_url": "https://example.com",
  "server_time_utc": "2026-01-05T00:38:00.000Z",
  "server_time_estimated_epoch_ms": 1735948680000,
  "rtt_ms": 120  // debug=1일 때만 포함
}
```

**에러 코드**:
- `400`: `INVALID_URL`, `BLOCKED_HOST`, `BLOCKED_IP`
- `502`: `DNS_LOOKUP_FAILED`, `TIME_UNAVAILABLE`
- `504`: `TIMEOUT`
- `500`: 내부 오류

**처리 흐름**:
```
1. URL 유효성 검사
2. SSRF 방어 검증 (lib/ssrf.js)
3. HTTP Date 헤더 측정 (lib/timeFetch.js)
4. RTT 보정 계산
5. 응답 반환
```

---

##### 2️⃣ `POST /api/log-event`

**목적**: 사용자 이벤트 로깅

**요청**:
```json
{
  "session_id": "abc123",
  "event_type": "button_click",
  "target_url": "https://example.com",  // 선택
  "latency_ms": 150                     // 선택
}
```

**응답**:
```json
{
  "ok": true
}
```

**저장 데이터**:
- 세션 ID
- 이벤트 타입
- 대상 URL (최대 2048자)
- 지연 시간 (정수 반올림)
- 타임스탬프

---

##### 3️⃣ `POST /api/session-init`

**목적**: 사용자 세션 초기화

**요청** (모두 선택):
```json
{
  "user_id": "user123",
  "session_id": "session456",
  "user_agent": "Mozilla/5.0...",
  "region": "KR",
  "device_type": "desktop"
}
```

**응답**:
```json
{
  "user_id": "generated_user_id",
  "session_id": "generated_session_id",
  "started_at": "2026-01-05T00:38:00.000Z"
}
```

**처리 로직**:
1. 미제공 시 `nanoid()`로 ID 생성
2. 클라이언트 IP 정규화 및 해싱
3. `users` 테이블 upsert
4. `sessions` 테이블 upsert

---

##### 4️⃣ `GET /api/analytics/users`

**목적**: 사용자 통계 조회

**응답**:
```json
{
  "total_users": 1250,
  "regions": 45,
  "total_visits": 8900,
  "avg_visits_per_user": 7.12
}
```

---

##### 5️⃣ `GET /api/analytics/events`

**목적**: 이벤트 통계 조회

**쿼리 파라미터**:
- `event_type`: 특정 이벤트 타입 필터
- `limit`: 결과 개수 (기본 100, 최대 1000)
- `offset`: 오프셋 (기본 0)

**응답**:
```json
{
  "events": [
    {
      "event_id": 1,
      "session_id": "abc123",
      "event_type": "button_click",
      "target_url": "https://example.com",
      "latency_ms": 150,
      "timestamp": "2026-01-05T00:38:00.000Z"
    }
  ],
  "total": 5000,
  "limit": 100,
  "offset": 0
}
```

---

##### 6️⃣ `GET /api/analytics/devices`

**목적**: 기기별 분석

**응답**:
```json
{
  "devices": [
    {
      "device_type": "desktop",
      "total_users": 800,
      "total_sessions": 3200,
      "total_events": 15000
    },
    {
      "device_type": "mobile",
      "total_users": 450,
      "total_sessions": 1800,
      "total_events": 7500
    }
  ]
}
```

---

##### 7️⃣ `GET /api/analytics/urls`

**목적**: URL별 성능 분석

**쿼리 파라미터**:
- `limit`: 결과 개수 (기본 50, 최대 500)
- `offset`: 오프셋 (기본 0)

**응답**:
```json
{
  "urls": [
    {
      "target_url": "https://example.com",
      "total_requests": 1200,
      "avg_latency_ms": 145.5,
      "min_latency_ms": 80,
      "max_latency_ms": 350
    }
  ]
}
```

---

##### 8️⃣ `GET /api/analytics/summary`

**목적**: 전체 분석 요약

**응답**: 모든 분석 데이터를 하나의 객체로 반환
```json
{
  "users": { /* 사용자 통계 */ },
  "events": { /* 이벤트 통계 */ },
  "devices": { /* 기기별 분석 */ },
  "performance": { /* 성능 통계 */ }
}
```

---

### 2. 핵심 라이브러리 모듈

#### **`lib/timeFetch.js`** - 시간 측정 엔진

**총 라인 수**: 110줄  
**주요 함수**: 3개

##### 함수 1: `requestWithRedirects(initialUrl, options)`

**목적**: 리다이렉트를 추적하며 HTTP 요청 수행

**특징**:
- 최대 3회 리다이렉트 허용
- 각 리다이렉트마다 SSRF 재검증
- 3초 타임아웃
- `AbortController`로 요청 취소

**처리 흐름**:
```
1. fetch() 요청 (redirect: 'manual')
2. 3xx 응답 시 Location 헤더 확인
3. 새 URL에 대해 SSRF 검증
4. 리다이렉트 카운터 증가
5. 최종 응답 반환
```

---

##### 함수 2: `computeTimeResult(dateHeader, tStart, tEnd)`

**목적**: RTT 보정된 서버 시간 계산

**알고리즘**:
```javascript
RTT = tEnd - tStart
server_time_estimated = server_time + (RTT / 2)
```

**반환값**:
```javascript
{
  serverTimeUtcIso: "2026-01-05T00:38:00.000Z",
  serverTimeEstimatedEpochMs: 1735948680000,
  rttMs: 120
}
```

---

##### 함수 3: `measureServerTime(targetUrl)`

**목적**: 대상 URL의 서버 시간 측정

**전략**: HEAD 우선 → GET Range 폴백

**처리 흐름**:
```
1. URL 안전성 검증 (SSRF)
2. HEAD 요청 시도
   ├─ Date 헤더 있음 → 결과 반환
   └─ Date 헤더 없음 → 3단계로
3. GET Range 요청 (bytes=0-0)
   ├─ Date 헤더 있음 → 결과 반환
   └─ Date 헤더 없음 → TIME_UNAVAILABLE 에러
```

**에러 처리**:
- `TIMEOUT`: 3초 초과
- `TIME_UNAVAILABLE`: Date 헤더 부재
- `UrlSafetyError`: SSRF 차단

---

#### **`lib/ssrf.js`** - SSRF 방어 시스템

**총 라인 수**: 135줄  
**주요 함수**: 4개

##### 상수 정의

**차단 호스트명**:
```javascript
BLOCKED_HOSTNAMES = ['localhost']
BLOCKED_SUFFIXES = ['.local', '.internal']
```

**차단 IP 대역** (34개 CIDR):
```javascript
IPv4:
- 0.0.0.0/8        (현재 네트워크)
- 10.0.0.0/8       (사설망 A)
- 127.0.0.0/8      (루프백)
- 169.254.0.0/16   (링크 로컬)
- 172.16.0.0/12    (사설망 B)
- 192.168.0.0/16   (사설망 C)
- 224.0.0.0/4      (멀티캐스트)
- 240.0.0.0/4      (예약)
- 기타 문서용/테스트용 대역

IPv6:
- ::1/128          (루프백)
- fc00::/7         (고유 로컬)
- fe80::/10        (링크 로컬)
- ff00::/8         (멀티캐스트)
```

---

##### 함수 1: `isBlockedHostname(hostname)`

**목적**: 호스트명 차단 여부 확인

**검사 항목**:
1. `BLOCKED_HOSTNAMES`에 포함 여부
2. `BLOCKED_SUFFIXES`로 끝나는지 확인

---

##### 함수 2: `isBlockedIp(address)`

**목적**: IP 주소 차단 여부 확인

**알고리즘**:
```javascript
1. IP 유효성 검사 (ipaddr.isValid)
2. IP 파싱 (ipaddr.parse)
3. 34개 CIDR 블록과 매칭 (ipaddr.match)
```

---

##### 함수 3: `resolveHostAddresses(hostname)`

**목적**: 호스트명을 모든 IP 주소로 해석

**처리**:
```javascript
1. IP 주소인 경우 → 그대로 반환
2. 도메인인 경우 → dns.lookup(all: true)
3. 실패 시 → DNS_LOOKUP_FAILED 에러
```

---

##### 함수 4: `assertUrlIsSafe(targetUrl)`

**목적**: URL 안전성 종합 검증

**검증 단계**:
```
1. URL 형식 검증 (new URL)
2. 길이 제한 (최대 2048자)
3. 프로토콜 검증 (http/https만 허용)
4. 호스트명 차단 확인
5. 포트 범위 검증 (1-65535)
6. IP 직접 입력 시 차단 확인
7. DNS 조회 후 모든 IP 차단 확인
```

**반환값**:
```javascript
{
  url: URL 객체,
  addresses: ['1.2.3.4', '5.6.7.8']
}
```

---

#### **`lib/identity.js`** - IP 정규화 및 해싱

**주요 기능**:
1. **IP 정규화**: IPv4/IPv6 표준 형식 변환
2. **IP 해싱**: SHA-256 + 솔트로 익명화

**해싱 알고리즘**:
```javascript
hash = SHA-256(IP_HASH_SALT + ":" + normalized_ip)
```

**보안 특징**:
- 원본 IP 저장 안 함
- 솔트 기반 해싱 (레인보우 테이블 방어)
- 일방향 암호화 (복호화 불가)

---

#### **`lib/repository.js`** - 데이터 접근 계층

**주요 함수**:
1. `upsertUser()`: 사용자 생성/업데이트
2. `ensureSession()`: 세션 관리
3. `logEvent()`: 이벤트 기록
4. `getAnalyticsUsers()`: 사용자 통계
5. `getAnalyticsEvents()`: 이벤트 통계
6. `getAnalyticsDevices()`: 기기별 분석
7. `getAnalyticsUrls()`: URL별 성능
8. `getAnalyticsEventsByType()`: 이벤트 타입별 통계
9. `getAnalyticsPerformance()`: 전체 성능 통계

**설계 패턴**: Repository Pattern (데이터 접근 추상화)

---

## 💾 데이터베이스 설계

### 스키마 구조

#### **테이블 1: `users`**

**목적**: 사용자 정보 저장

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `user_id` | TEXT (PK) | 사용자 고유 ID |
| `ip_hash` | TEXT | IP 주소 해시 (SHA-256) |
| `user_agent` | TEXT | 브라우저 User-Agent |
| `region` | TEXT | 지역 코드 (예: KR) |
| `device_type` | TEXT | 기기 타입 (desktop/mobile/tablet) |
| `first_visit_at` | DATETIME | 최초 방문 시각 |
| `last_visit_at` | DATETIME | 최근 방문 시각 |
| `visit_count` | INTEGER | 방문 횟수 (기본값 1) |

**인덱스**:
- `idx_users_first_visit` (first_visit_at)
- `idx_users_last_visit` (last_visit_at)

---

#### **테이블 2: `sessions`**

**목적**: 세션 정보 저장

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `session_id` | TEXT (PK) | 세션 고유 ID |
| `user_id` | TEXT (FK) | 사용자 ID (users 테이블 참조) |
| `start_at` | DATETIME | 세션 시작 시각 |
| `end_at` | DATETIME | 세션 종료 시각 (NULL 가능) |

**인덱스**:
- `idx_sessions_user_id` (user_id)
- `idx_sessions_start_at` (start_at)

---

#### **테이블 3: `events`**

**목적**: 사용자 이벤트 로그 저장

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `event_id` | INTEGER (PK) | 이벤트 고유 ID (자동 증가) |
| `session_id` | TEXT (FK) | 세션 ID (sessions 테이블 참조) |
| `event_type` | TEXT | 이벤트 타입 (button_click 등) |
| `target_url` | TEXT | 대상 URL (최대 2048자) |
| `latency_ms` | INTEGER | 지연 시간 (밀리초) |
| `timestamp` | DATETIME | 이벤트 발생 시각 |

**인덱스**:
- `idx_events_session_id` (session_id)
- `idx_events_event_type` (event_type)
- `idx_events_timestamp` (timestamp)

---

### ER 다이어그램

```
┌─────────────────┐
│     users       │
├─────────────────┤
│ user_id (PK)    │◄─────┐
│ ip_hash         │      │
│ user_agent      │      │
│ region          │      │
│ device_type     │      │
│ first_visit_at  │      │
│ last_visit_at   │      │
│ visit_count     │      │
└─────────────────┘      │
                         │
                         │ 1:N
                         │
┌─────────────────┐      │
│    sessions     │      │
├─────────────────┤      │
│ session_id (PK) │◄─────┼─────┐
│ user_id (FK)    │──────┘     │
│ start_at        │            │
│ end_at          │            │
└─────────────────┘            │
                               │ 1:N
                               │
┌─────────────────┐            │
│     events      │            │
├─────────────────┤            │
│ event_id (PK)   │            │
│ session_id (FK) │────────────┘
│ event_type      │
│ target_url      │
│ latency_ms      │
│ timestamp       │
└─────────────────┘
```

---

## 🔐 보안 및 개인정보 보호

### SSRF 방어 시스템

#### 다층 방어 전략

```
레이어 1: URL 형식 검증
  ├─ 프로토콜 제한 (http/https만)
  ├─ 길이 제한 (최대 2048자)
  └─ 포트 범위 검증 (1-65535)

레이어 2: 호스트명 차단
  ├─ localhost
  ├─ *.local
  └─ *.internal

레이어 3: IP 주소 차단 (34개 CIDR)
  ├─ 사설망 (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
  ├─ 루프백 (127.0.0.0/8, ::1/128)
  ├─ 링크 로컬 (169.254.0.0/16, fe80::/10)
  └─ 멀티캐스트/예약 대역

레이어 4: DNS 조회 검증
  └─ 모든 해석된 IP 주소 재검증

레이어 5: 리다이렉트 추적
  ├─ 최대 3회 제한
  └─ 각 단계마다 전체 검증 반복
```

---

### 레이트 리밋

**설정**:
- **윈도우**: 60초
- **최대 요청**: 30회 (환경 변수로 조정 가능)
- **헤더**: `draft-7` 표준

**에러 응답**:
```json
{
  "error": "RATE_LIMITED",
  "message": "Too many requests. Try again later."
}
```

---

### 개인정보 보호

#### 수집 데이터

| 데이터 | 수집 방법 | 저장 형태 | 목적 |
|--------|----------|----------|------|
| **IP 주소** | `req.ip` | SHA-256 해시 | 중복 방문 식별 |
| **User-Agent** | HTTP 헤더 | 원문 | 기기/브라우저 분석 |
| **지역** | 클라이언트 제공 | 원문 | 지역별 통계 |
| **기기 타입** | 클라이언트 제공 | 원문 | 기기별 분석 |
| **대상 URL** | 사용자 입력 | 원문 | URL별 성능 분석 |
| **이벤트 로그** | 사용자 행동 | 원문 | 서비스 개선 |

#### 보안 조치

1. **IP 해싱**: 원본 IP 저장 안 함
2. **솔트 사용**: 레인보우 테이블 공격 방어
3. **HTTPS 강제**: 전송 중 암호화
4. **최소 수집 원칙**: 필요한 데이터만 수집

---

## 🎨 프론트엔드 아키텍처

### 모듈 구조

```
public/js/
├── main.js                  # 진입점 (모듈 초기화)
└── modules/
    ├── api.js               # API 통신
    ├── session.js           # 세션 관리
    ├── time-display.js      # 시계 표시
    ├── alarm.js             # 알람 기능
    └── settings.js          # 설정 관리
```

---

### 모듈별 상세 분석

#### **`modules/api.js`** - API 통신 모듈

**주요 함수**:

1. **`checkTime(targetUrl, debug = false)`**
   - 서버 시간 조회
   - 에러 처리 및 재시도 로직

2. **`logEvent(sessionId, eventType, targetUrl, latencyMs)`**
   - 이벤트 로깅
   - 백그라운드 전송 (사용자 경험 방해 안 함)

3. **`initSession(userData)`**
   - 세션 초기화
   - LocalStorage에 세션 ID 저장

**에러 처리**:
```javascript
try {
  const response = await fetch('/api/check-time', { ... });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }
  return await response.json();
} catch (error) {
  console.error('API Error:', error);
  throw error;
}
```

---

#### **`modules/session.js`** - 세션 관리

**주요 기능**:

1. **세션 ID 생성 및 저장**
   ```javascript
   const sessionId = localStorage.getItem('session_id') || generateSessionId();
   localStorage.setItem('session_id', sessionId);
   ```

2. **기기 타입 감지**
   ```javascript
   function detectDeviceType() {
     const ua = navigator.userAgent;
     if (/mobile/i.test(ua)) return 'mobile';
     if (/tablet/i.test(ua)) return 'tablet';
     return 'desktop';
   }
   ```

3. **지역 감지**
   - `navigator.language` 사용
   - 예: `ko-KR` → `KR`

---

#### **`modules/time-display.js`** - 시계 표시

**핵심 알고리즘**:

```javascript
// 서버 시간 추정값 저장
let serverTimeEstimated = response.server_time_estimated_epoch_ms;
let referenceTime = performance.now();

// 실시간 업데이트
function updateClock() {
  const elapsed = performance.now() - referenceTime;
  const currentTime = serverTimeEstimated + elapsed;
  
  displayTime(new Date(currentTime));
  requestAnimationFrame(updateClock);
}
```

**특징**:
- `performance.now()` 사용 (고정밀 타이머)
- `requestAnimationFrame`으로 부드러운 애니메이션
- 밀리초 단위 정확도

---

#### **`modules/alarm.js`** - 알람 기능

**주요 기능**:

1. **알람 설정**
   ```javascript
   function setAlarm(targetTime) {
     const alarms = JSON.parse(localStorage.getItem('alarms') || '[]');
     alarms.push({ time: targetTime, enabled: true });
     localStorage.setItem('alarms', JSON.stringify(alarms));
   }
   ```

2. **알람 체크**
   ```javascript
   function checkAlarms(currentTime) {
     const alarms = getAlarms();
     alarms.forEach(alarm => {
       if (alarm.enabled && currentTime >= alarm.time) {
         triggerAlarm(alarm);
       }
     });
   }
   ```

3. **알람 트리거**
   - 브라우저 알림 (Notification API)
   - 오디오 재생
   - 시각적 효과

---

#### **`modules/settings.js`** - 설정 관리

**설정 항목**:
- 다크모드 토글
- 시간 형식 (12시간/24시간)
- 알람 사운드
- 언어 설정

**LocalStorage 사용**:
```javascript
const settings = {
  darkMode: localStorage.getItem('darkMode') === 'true',
  timeFormat: localStorage.getItem('timeFormat') || '24h',
  alarmSound: localStorage.getItem('alarmSound') || 'default'
};
```

---

### CSS 아키텍처

#### **`css/tokens.css`** - 디자인 토큰

**CSS 변수 정의**:
```css
:root {
  /* 색상 */
  --color-primary: #3b82f6;
  --color-secondary: #8b5cf6;
  --color-success: #10b981;
  --color-error: #ef4444;
  
  /* 폰트 */
  --font-family-base: 'Inter', sans-serif;
  --font-size-base: 16px;
  
  /* 간격 */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 2rem;
  
  /* 그림자 */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
}
```

---

#### **`css/style.css`** - 메인 스타일

**주요 섹션**:
1. 리셋 및 기본 스타일
2. 레이아웃 (Flexbox/Grid)
3. 컴포넌트 스타일
4. 다크모드
5. 반응형 디자인
6. 애니메이션

**다크모드 구현**:
```css
[data-theme="dark"] {
  --color-bg: #1a1a1a;
  --color-text: #f5f5f5;
  --color-border: #333;
}
```

---

## 🚀 배포 및 운영

### 환경 변수

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `PORT` | 3000 | 서버 포트 |
| `NODE_ENV` | development | 환경 (production/development) |
| `DOMAIN` | https://timeism.keero.site | 도메인 (SEO용) |
| `RATE_LIMIT_MAX` | 30 | 분당 최대 요청 수 |
| `TRUST_PROXY` | - | 프록시 신뢰 hop 수 |
| `IP_HASH_SALT` | - | IP 해시 솔트 (필수) |
| `DB_PATH` | data/app.db | SQLite 파일 경로 |
| `ADMIN_TOKEN` | - | 관리자 인증 토큰 |

---

### NPM 스크립트

```json
{
  "start": "node app.js",           // 프로덕션 실행
  "dev": "nodemon app.js",          // 개발 서버 (핫 리로드)
  "db:init": "node db/init.js",     // DB 초기화
  "test": "echo \"No tests configured\" && exit 0"
}
```

---

### Docker 배포

**Dockerfile 주요 내용**:
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
VOLUME /app/data
EXPOSE 3000
CMD ["npm", "start"]
```

**실행 명령**:
```bash
docker build -t timeism .
docker run -d \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -e IP_HASH_SALT=your_secret_salt \
  -e ADMIN_TOKEN=your_admin_token \
  timeism
```

---

### Railway 배포

**설정 파일**: `docs/RAILWAY_DEPLOYMENT.md` 참조

**주요 단계**:
1. GitHub 연동
2. 환경 변수 설정
3. 볼륨 마운트 (`/app/data`)
4. 자동 배포 설정

---

## 📊 API 명세

### 요청/응답 형식

**공통 사항**:
- Base URL: `/api`
- Content-Type: `application/json`
- 문자 인코딩: UTF-8

**에러 응답 형식**:
```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable error message"
}
```

---

### 엔드포인트 요약

| 메서드 | 경로 | 설명 | 인증 |
|--------|------|------|------|
| POST | `/api/check-time` | 서버 시간 조회 | ❌ |
| POST | `/api/log-event` | 이벤트 로깅 | ❌ |
| POST | `/api/session-init` | 세션 초기화 | ❌ |
| GET | `/api/analytics/users` | 사용자 통계 | ✅ |
| GET | `/api/analytics/events` | 이벤트 통계 | ✅ |
| GET | `/api/analytics/devices` | 기기별 분석 | ✅ |
| GET | `/api/analytics/urls` | URL별 성능 | ✅ |
| GET | `/api/analytics/performance` | 전체 성능 | ✅ |
| GET | `/api/analytics/summary` | 종합 요약 | ✅ |

---

## 🔮 향후 개선 사항

### 1. 기능 개선

- [ ] **NTP 클락 소스 도입**: 서버 자체 시간 동기화
- [ ] **다중 샘플링**: 여러 번 측정 후 평균/중앙값 계산
- [ ] **이상치 제거**: 통계적 방법으로 부정확한 측정값 필터링
- [ ] **WebSocket 지원**: 실시간 시간 동기화
- [ ] **히스토리 기능**: 과거 조회 기록 저장 및 비교

---

### 2. 보안 강화

- [ ] **CSP 정책 강화**: Content Security Policy 세밀 조정
- [ ] **CORS 설정**: 허용 도메인 명시
- [ ] **입력 검증 강화**: 추가 XSS/SQL Injection 방어
- [ ] **2FA 관리자 인증**: 관리자 대시보드 보안 강화

---

### 3. 성능 최적화

- [ ] **Redis 캐싱**: 자주 조회되는 URL 결과 캐싱
- [ ] **CDN 도입**: 정적 파일 전송 속도 향상
- [ ] **DB 인덱스 최적화**: 쿼리 성능 분석 및 개선
- [ ] **이미지 최적화**: WebP 포맷, Lazy Loading

---

### 4. 테스트 및 품질

- [ ] **단위 테스트**: Jest/Mocha로 핵심 로직 테스트
- [ ] **통합 테스트**: API 엔드포인트 테스트
- [ ] **E2E 테스트**: Playwright/Cypress로 사용자 시나리오 테스트
- [ ] **CI/CD 파이프라인**: GitHub Actions로 자동 테스트/배포

---

### 5. 사용자 경험

- [ ] **PWA 지원**: 오프라인 모드, 앱 설치
- [ ] **다국어 지원**: i18n 라이브러리 도입
- [ ] **접근성 개선**: WCAG 2.1 AA 준수
- [ ] **모바일 최적화**: 터치 제스처, 반응형 개선

---

### 6. 관리 도구

- [ ] **관리자 대시보드 확장**: 
  - 실시간 모니터링
  - 사용자 관리
  - 시스템 설정
- [ ] **로그 분석 도구**: ELK 스택 도입
- [ ] **알림 시스템**: 이상 트래픽 감지 시 알림

---

## 📝 문서 현황

### 기존 문서

| 문서 | 경로 | 설명 |
|------|------|------|
| README | `README.md` | 프로젝트 개요 및 사용법 |
| 개발 가이드 | `AGENTS.md` | 코딩 스타일 및 컨벤션 |
| 배포 체크리스트 | `docs/DEPLOYMENT_CHECKLIST.md` | 배포 전 확인 사항 |
| Railway 배포 | `docs/RAILWAY_DEPLOYMENT.md` | Railway 배포 가이드 |
| SEO 설정 | `docs/SEO_SETUP.md` | SEO 최적화 가이드 |
| SEO 개선 | `docs/SEO_IMPROVEMENTS.md` | SEO 개선 사항 |
| SEO 완료 | `docs/SEO_COMPLETE.md` | SEO 작업 완료 보고서 |
| SEO 수정 배포 | `docs/DEPLOY_SEO_FIX.md` | SEO 수정 배포 가이드 |
| JS 구조 | `docs/JS_OVERVIEW.md` | JavaScript 구조 개요 |

---

## 🎓 학습 리소스

### 핵심 개념

1. **HTTP Date 헤더**: RFC 7231 표준
2. **RTT (Round-Trip Time)**: 네트워크 왕복 시간
3. **SSRF (Server-Side Request Forgery)**: 서버 측 요청 위조 공격
4. **NTP (Network Time Protocol)**: 네트워크 시간 프로토콜

### 참고 문서

- [Express.js 공식 문서](https://expressjs.com/)
- [SQLite 공식 문서](https://www.sqlite.org/docs.html)
- [OWASP SSRF 방어](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html)
- [MDN Web Docs](https://developer.mozilla.org/)

---

## 📞 연락처

문의 사항은 `public/privacy.html`의 연락처 이메일을 참고하세요.

---

**문서 버전**: 1.0.0  
**최종 업데이트**: 2026-01-05  
**작성자**: Timeism Development Team
