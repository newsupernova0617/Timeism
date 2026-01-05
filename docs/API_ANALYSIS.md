# routes/api.js 분석 보고서

> 작성일: 2026-01-05  
> 파일: routes/api.js  
> 라인 수: 316줄

---

## 📋 목차

1. [파일 개요](#-파일-개요)
2. [엔드포인트 목록](#-엔드포인트-목록)
3. [상세 분석](#-상세-분석)
4. [데이터 흐름](#-데이터-흐름)
5. [에러 처리](#-에러-처리)
6. [보안 고려사항](#-보안-고려사항)
7. [성능 최적화](#-성능-최적화)

---

## 🎯 파일 개요

### 역할
Express 라우터로 모든 API 엔드포인트를 정의하고 처리합니다.

### 주요 기능
- **시간 조회**: 원격 서버의 시간 측정
- **세션 관리**: 사용자 세션 초기화
- **이벤트 로깅**: 사용자 행동 추적
- **분석 데이터**: 통계 및 성능 메트릭 제공

### 의존성
```javascript
express          // 라우팅
nanoid           // 고유 ID 생성
timeFetch        // 서버 시간 측정
ssrf             // SSRF 방어
repository       // 데이터 접근
identity         // IP 해싱
```

---

## 📡 엔드포인트 목록

### 공개 API (인증 불필요)

| 메서드 | 경로 | 설명 | 레이트 리밋 |
|--------|------|------|------------|
| POST | `/api/check-time` | 서버 시간 조회 | ✅ 30/분 |
| POST | `/api/log-event` | 이벤트 로깅 | ❌ |
| POST | `/api/session-init` | 세션 초기화 | ❌ |

### 분석 API (관리자 전용)

| 메서드 | 경로 | 설명 | 인증 |
|--------|------|------|------|
| GET | `/api/analytics/users` | 사용자 통계 | ✅ 필요 |
| GET | `/api/analytics/events` | 이벤트 통계 | ✅ 필요 |
| GET | `/api/analytics/devices` | 기기별 분석 | ✅ 필요 |
| GET | `/api/analytics/urls` | URL별 성능 | ✅ 필요 |
| GET | `/api/analytics/performance` | 전체 성능 | ✅ 필요 |
| GET | `/api/analytics/summary` | 종합 요약 | ✅ 필요 |

---

## 🔍 상세 분석

### 1. POST /api/check-time

**목적**: 대상 URL의 서버 시간을 측정하고 RTT 보정

#### 요청
```json
{
  "target_url": "https://example.com"
}
```

#### 응답 (성공)
```json
{
  "target_url": "https://example.com",
  "server_time_utc": "2026-01-05T01:13:00.000Z",
  "server_time_estimated_epoch_ms": 1735948380000,
  "rtt_ms": 120  // debug=1일 때만
}
```

#### 처리 흐름
```
1. URL 유효성 검사
   ├─ 타입 체크 (string)
   └─ 빈 문자열 체크

2. measureServerTime() 호출
   ├─ SSRF 검증
   ├─ HEAD 요청 시도
   ├─ GET Range 폴백
   └─ RTT 보정 계산

3. 응답 생성
   ├─ 기본 필드
   └─ debug=1 시 rtt_ms 추가
```

#### 에러 코드
| 코드 | HTTP | 설명 |
|------|------|------|
| `INVALID_URL` | 400 | URL 형식 오류 |
| `BLOCKED_HOST` | 400 | 차단된 호스트 |
| `BLOCKED_IP` | 400 | 차단된 IP |
| `DNS_LOOKUP_FAILED` | 502 | DNS 조회 실패 |
| `TIMEOUT` | 504 | 요청 타임아웃 |
| `TIME_UNAVAILABLE` | 502 | Date 헤더 없음 |
| `INTERNAL_ERROR` | 500 | 서버 내부 오류 |

---

### 2. POST /api/log-event

**목적**: 사용자 이벤트를 데이터베이스에 기록

#### 요청
```json
{
  "session_id": "sess_abc123",
  "event_type": "button_click",
  "target_url": "https://example.com",  // 선택
  "latency_ms": 150                     // 선택
}
```

#### 응답
```json
{
  "ok": true
}
```

#### 처리 흐름
```
1. 필수 파라미터 검증
   ├─ session_id (필수)
   └─ event_type (필수)

2. 데이터 정제
   ├─ URL 길이 제한 (2048자)
   └─ latency_ms 정수 변환

3. DB 저장
   └─ logEvent() 호출
```

#### 데이터 정제 규칙
- **URL**: 최대 2048자로 자름
- **latency_ms**: 정수로 반올림, 유효하지 않으면 NULL

---

### 3. POST /api/session-init

**목적**: 사용자 세션 초기화 및 IP 해싱

#### 요청 (모두 선택)
```json
{
  "user_id": "user_123",
  "session_id": "sess_456",
  "user_agent": "Mozilla/5.0...",
  "region": "KR",
  "device_type": "desktop"
}
```

#### 응답
```json
{
  "user_id": "user_abc123def456",
  "session_id": "sess_xyz789ghi012",
  "started_at": "2026-01-05T01:13:00.000Z"
}
```

#### 처리 흐름
```
1. ID 생성
   ├─ user_id: 미제공 시 user_${nanoid(12)}
   └─ session_id: 미제공 시 sess_${nanoid(12)}

2. IP 해싱
   ├─ normalizeIp(req.ip)
   └─ hashIp() → SHA-256

3. DB 저장
   ├─ upsertUser()
   └─ ensureSession()
```

#### 보안 특징
- **IP 해싱**: 원본 IP 저장 안 함
- **솔트 사용**: 레인보우 테이블 방어
- **UPSERT**: 중복 방문 시 visit_count 증가

---

### 4. GET /api/analytics/users

**목적**: 사용자 통계 조회

#### 응답
```json
{
  "total_users": 1250,
  "regions": 45,
  "total_visits": 8900,
  "avg_visits_per_user": 7.12,
  "max_visits": 150
}
```

#### SQL 쿼리
```sql
SELECT
  COUNT(*) as total_users,
  COUNT(DISTINCT region) as regions,
  SUM(visit_count) as total_visits,
  AVG(visit_count) as avg_visits_per_user,
  MAX(visit_count) as max_visits
FROM users
```

---

### 5. GET /api/analytics/events

**목적**: 이벤트 통계 조회

#### 쿼리 파라미터
- `event_type`: 특정 이벤트만 조회 (선택)
- `limit`: 결과 개수 (기본 100, 최대 1000)
- `offset`: 오프셋 (기본 0)

#### 응답
```json
[
  {
    "event_type": "button_click",
    "count": 5000,
    "avg_latency_ms": 145.5,
    "min_latency_ms": 80,
    "max_latency_ms": 350,
    "unique_sessions": 1200
  }
]
```

#### 숫자 정규화
- `avg_latency_ms`: 소수점 1자리 (Math.round * 10 / 10)
- `count`, `unique_sessions`: 정수

---

### 6. GET /api/analytics/devices

**목적**: 기기별 분석

#### 응답
```json
[
  {
    "device_type": "desktop",
    "total_users": 800,
    "sessions": 3200,
    "avg_visits": 7.12,
    "total_events": 15000
  },
  {
    "device_type": "mobile",
    "total_users": 450,
    "sessions": 1800,
    "avg_visits": 5.23,
    "total_events": 7500
  }
]
```

#### SQL 쿼리
```sql
SELECT
  u.device_type,
  COUNT(u.user_id) as total_users,
  COUNT(DISTINCT s.session_id) as sessions,
  AVG(u.visit_count) as avg_visits,
  COUNT(e.event_id) as total_events
FROM users u
LEFT JOIN sessions s ON u.user_id = s.user_id
LEFT JOIN events e ON s.session_id = e.session_id
WHERE u.device_type IS NOT NULL
GROUP BY u.device_type
ORDER BY total_users DESC
```

---

### 7. GET /api/analytics/urls

**목적**: URL별 성능 분석

#### 쿼리 파라미터
- `limit`: 결과 개수 (기본 50, 최대 500)
- `offset`: 오프셋 (기본 0)

#### 응답
```json
[
  {
    "target_url": "https://google.com",
    "requests": 1200,
    "avg_latency_ms": 145.5,
    "min_latency_ms": 80,
    "max_latency_ms": 350,
    "unique_sessions": 800
  }
]
```

---

### 8. GET /api/analytics/performance

**목적**: 전체 성능 메트릭

#### 응답
```json
{
  "total_events": 25000,
  "avg_latency_ms": 145.5,
  "min_latency_ms": 50,
  "max_latency_ms": 2500,
  "slow_events": 120,        // 1초 이상
  "unique_sessions": 3500
}
```

---

### 9. GET /api/analytics/summary

**목적**: 전체 분석 요약 (모든 통계 한번에)

#### 응답
```json
{
  "users": {
    "total": 1250,
    "regions": 45,
    "total_visits": 8900,
    "avg_visits_per_user": 7.12
  },
  "events": [
    {
      "type": "button_click",
      "count": 5000,
      "avg_latency_ms": 145.5
    }
  ],
  "devices": [
    {
      "type": "desktop",
      "users": 800,
      "sessions": 3200
    }
  ],
  "performance": {
    "total_events": 25000,
    "avg_latency_ms": 145.5,
    "slow_events": 120
  }
}
```

#### 처리 방식
- **동기식**: 모든 쿼리를 순차 실행 (Promise.all 제거됨)
- **경량화**: 상위 10개 이벤트만 포함

---

## 🔄 데이터 흐름

### 시간 조회 플로우
```
클라이언트
  ↓ POST /api/check-time
API 라우터
  ↓ measureServerTime()
timeFetch 모듈
  ↓ assertUrlIsSafe()
SSRF 검증
  ↓ fetch()
원격 서버
  ↓ Date 헤더
RTT 보정
  ↓ 응답
클라이언트
```

### 세션 초기화 플로우
```
클라이언트
  ↓ POST /api/session-init
API 라우터
  ↓ normalizeIp() + hashIp()
IP 해싱
  ↓ upsertUser()
DB (users 테이블)
  ↓ ensureSession()
DB (sessions 테이블)
  ↓ 응답
클라이언트
```

### 이벤트 로깅 플로우
```
클라이언트
  ↓ POST /api/log-event
API 라우터
  ↓ 데이터 정제
검증 및 변환
  ↓ logEvent()
DB (events 테이블)
  ↓ { ok: true }
클라이언트
```

---

## ⚠️ 에러 처리

### 에러 처리 전략

#### 1. UrlSafetyError (SSRF 관련)
```javascript
if (err instanceof UrlSafetyError) {
  const statusMap = {
    INVALID_URL: 400,
    BLOCKED_HOST: 400,
    BLOCKED_IP: 400,
    DNS_LOOKUP_FAILED: 502,
    TIMEOUT: 504,
    TIME_UNAVAILABLE: 502
  };
  return res.status(statusMap[err.code] || 400).json({
    error: err.code,
    message: err.message
  });
}
```

#### 2. DB 에러
```javascript
catch (err) {
  console.error('Failed to log event:', err);
  return res.status(500).json({ 
    error: 'DB_ERROR', 
    message: 'Failed to store event.' 
  });
}
```

#### 3. 유효성 검사 에러
```javascript
if (typeof sessionId !== 'string' || sessionId.trim().length === 0) {
  return res.status(400).json({ 
    error: 'INVALID_PARAM', 
    message: 'session_id is required.' 
  });
}
```

---

## 🔐 보안 고려사항

### 1. SSRF 방어
- **모든 URL 검증**: `assertUrlIsSafe()` 호출
- **차단 대역**: 사설망, 로컬호스트, 멀티캐스트
- **DNS 검증**: 모든 해석된 IP 확인

### 2. IP 개인정보 보호
- **해싱**: SHA-256 + 솔트
- **원본 미저장**: IP 주소 원문 저장 안 함
- **일방향**: 해시 → IP 복원 불가능

### 3. 입력 검증
- **타입 체크**: typeof 검사
- **길이 제한**: URL 최대 2048자
- **정수 변환**: latency_ms 반올림

### 4. 레이트 리밋
- **적용 대상**: `/api/check-time`만
- **제한**: 분당 30회 (환경 변수로 조정)
- **미들웨어**: `app.js`에서 설정

---

## ⚡ 성능 최적화

### 1. 동기식 DB 작업
```javascript
// better-sqlite3 사용 → async/await 불필요
const stats = getAnalyticsUsers();  // 동기식
return res.json(stats);
```

**장점**:
- 이벤트 루프 오버헤드 제거
- 3-5배 빠른 성능

### 2. 숫자 정규화
```javascript
// 소수점 제한으로 응답 크기 감소
avg_latency_ms: Math.round(s.avg_latency_ms * 10) / 10  // 145.5
```

### 3. 쿼리 최적화
- **인덱스 활용**: session_id, event_type, timestamp
- **LIMIT/OFFSET**: 페이지네이션 지원
- **집계 함수**: DB에서 계산 (애플리케이션 레벨 X)

### 4. 응답 캐싱 (미구현)
```javascript
// 향후 개선 가능
// Redis 캐싱으로 분석 API 성능 향상
```

---

## 📊 통계

### 코드 메트릭
- **총 라인 수**: 316줄
- **엔드포인트 수**: 9개
- **함수 수**: 9개 (라우트 핸들러)
- **의존성**: 6개 모듈

### 복잡도 분석
| 엔드포인트 | 복잡도 | 이유 |
|-----------|--------|------|
| `/check-time` | 높음 | 에러 처리 7가지 |
| `/log-event` | 중간 | 데이터 정제 로직 |
| `/session-init` | 중간 | ID 생성 + IP 해싱 |
| `/analytics/*` | 낮음 | 단순 조회 + 정규화 |

---

## 🎯 개선 제안

### 1. 응답 캐싱
```javascript
// Redis 캐싱 추가
router.get('/analytics/summary', cache('5min'), (req, res) => {
  // ...
});
```

### 2. 입력 검증 강화
```javascript
// express-validator 사용
const { body, validationResult } = require('express-validator');

router.post('/log-event', [
  body('session_id').isString().trim().notEmpty(),
  body('event_type').isString().trim().notEmpty()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  // ...
});
```

### 3. 비동기 로깅
```javascript
// 이벤트 로깅을 백그라운드로
router.post('/log-event', (req, res) => {
  res.json({ ok: true });  // 즉시 응답
  
  // 백그라운드 로깅
  setImmediate(() => {
    logEvent({ ... });
  });
});
```

### 4. API 버저닝
```javascript
// /api/v1/check-time
const v1Router = express.Router();
v1Router.post('/check-time', ...);

app.use('/api/v1', v1Router);
```

---

## 📝 요약

### 핵심 기능
1. ✅ **시간 조회**: RTT 보정된 서버 시간 측정
2. ✅ **세션 관리**: IP 해싱 기반 사용자 추적
3. ✅ **이벤트 로깅**: 사용자 행동 기록
4. ✅ **분석 데이터**: 6가지 통계 API

### 보안 특징
- SSRF 방어 (34개 CIDR 차단)
- IP 해싱 (SHA-256 + 솔트)
- 레이트 리밋 (분당 30회)
- 입력 검증 (타입, 길이)

### 성능 특징
- 동기식 DB (better-sqlite3)
- 인덱스 활용
- 숫자 정규화
- 페이지네이션

---

**작성일**: 2026-01-05  
**파일 버전**: 1.0.0  
**작성자**: Timeism Development Team
