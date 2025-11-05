# JavaScript 파일 상세 개요

node_modules를 제외한 프로젝트 내 JavaScript 파일들의 역할, 주요 함수, 입출력, 예외/주의사항을 정리했습니다. 경로 참조는 클릭 가능한 상대 경로와 시작 라인 기준입니다.

## 서버 사이드

- app.js:1
  - 역할: Express 서버 초기화. 보안/성능 미들웨어 구성, 레이트 리밋, 정적 자원 제공, API 라우팅, 전역 에러 처리.
  - 주요 구성
    - 환경설정: `dotenv`, `PORT`, `TRUST_PROXY`.
    - 보안/성능: `helmet({ contentSecurityPolicy:false })`, `compression`, `express.json({ limit:'64kb' })`, `morgan`.
    - 레이트 리밋: `/api/check-time`에 `express-rate-limit` 적용(윈도 60s, `RATE_LIMIT_MAX` 기본 30).
    - 라우팅: `/api`를 `routes/api.js`에 위임. `public/` 정적 서빙(확장자 자동 `.html`). `/guide`, `/privacy` 직접 매핑.
    - 에러 처리: 404 JSON 핸들러, 전역 500 핸들러(콘솔 로깅).
  - 주의: 프록시 뒤에서만 `TRUST_PROXY` 설정. CSP는 false이므로 운영에서 강화 검토.

- routes/api.js:1
  - 역할: REST API 엔드포인트 구현.
  - 의존: `lib/timeFetch`, `lib/ssrf`(에러 타입), `lib/repository`, `lib/identity`, `nanoid`.
  - 엔드포인트
    - POST `/api/check-time`
      - 입력: `{ target_url: string }` (필수)
      - 처리: `measureServerTime(targetUrl)` 호출 → 결과 또는 `UrlSafetyError` 매핑 응답
      - 출력: `{ target_url, server_time_utc, server_time_estimated_epoch_ms, rtt_ms? }`
      - 오류 코드: 400/502/504/500 (에러 코드별 분기)
    - POST `/api/log-event`
      - 입력: `{ session_id: string, event_type: string, target_url?: string, latency_ms?: number }`
      - 처리: `repository.logEvent` 저장 (URL 2048자 절단, latency 정수화)
      - 출력: `{ ok: true }` 또는 500(DB_ERROR)
    - POST `/api/session-init`
      - 입력(선택): `{ user_id?, session_id?, user_agent?, region?, device_type? }`
      - 처리: 미제공 시 `nanoid` 생성, `req.ip` → `normalizeIp` → `hashIp`, `upsertUser`, `ensureSession`
      - 출력: `{ user_id, session_id, started_at }`
  - 주의: `TRUST_PROXY` 미설정 시 `req.ip`가 프록시 IP일 수 있음.

- lib/ssrf.js:1
  - 역할: URL 안전성 검증(SSRF 방지)과 관련 에러 표준화.
  - 상수: `MAX_URL_LENGTH=2048`, 차단 호스트(`localhost`), 접미사(`.local`, `.internal`), 차단 CIDR(사설/로컬/멀티캐스트/문서용 IPv4/IPv6).
  - 클래스: `UrlSafetyError(code, message)`.
  - 함수
    - `isBlockedHostname(hostname)`: 블록리스트/접미사 검사.
    - `isBlockedIp(address)`: `ipaddr.js`로 CIDR 매칭.
    - `resolveHostAddresses(hostname)`: IP면 그대로, 도메인이면 `dns.lookup(all:true)`로 모든 IP 반환. 실패 시 `DNS_LOOKUP_FAILED`.
    - `assertUrlIsSafe(targetUrl)`: 문자열/길이/URL 파싱/프로토콜/호스트/포트/IP·DNS 검사 후 `{ url, addresses }` 반환.
  - 예외: 모두 `UrlSafetyError`로 던짐. 호출측에서 상태코드로 매핑.

- lib/timeFetch.js:1
  - 역할: 안전 검증된 URL로 HEAD/GET 요청을 수행하고 HTTP `Date` 기반 서버 시각을 추정.
  - 상수: `REQUEST_TIMEOUT_MS=3000`, `MAX_REDIRECTS=3`, 리다이렉트 상태코드 집합.
  - 내부
    - `requestWithRedirects(initialUrl, options)`: `fetch(redirect:'manual')` + AbortController 타임아웃. 리다이렉트 시 `location`을 기준 URL과 합성, 각 홉마다 `assertUrlIsSafe` 재검증. 최종 `{ response, finalUrl }` 반환.
    - `computeTimeResult(dateHeader, tStart, tEnd)`: `Date` 파싱 → NaN이면 `TIME_UNAVAILABLE`. `rttMs=tEnd-tStart`, `estimated=serverUtc+(rtt/2)`.
  - 공개
    - `measureServerTime(targetUrl)`: `assertUrlIsSafe` → HEAD 시도 → 실패 시 Range GET(`bytes=0-0`) 재시도 → 결과 또는 저장된 `UrlSafetyError` 재던짐.
  - 주의: RTT/2 보정은 단순화 모델. 오차 존재. 본문은 즉시 `response.body?.cancel()`로 해제.

- lib/identity.js:1
  - 역할: IP 정규화 및 해시.
  - 상수: `IP_HASH_SALT`(.env, 기본 `default_ip_salt`).
  - 함수
    - `normalizeIp(rawIp)`: IPv6-mapped IPv4는 IPv4로 환원, 유효 IP면 정규 문자열, 실패 시 원문 반환.
    - `hashIp(ip)`: `sha256(IP_HASH_SALT:ip)` → hex. 입력 없으면 null.
  - 주의: 운영에서 반드시 강한 `IP_HASH_SALT` 설정.

- lib/repository.js:1
  - 역할: SQLite 접근 유틸.
  - 헬퍼: `withDb(fn)` 매 호출 연결 열고 닫음.
  - 함수
    - `upsertUser({ userId, ipHash, userAgent, region, deviceType })`: `users` UPSERT, 방문 수 증가/마지막 방문 갱신.
    - `ensureSession({ sessionId, userId })`: `sessions` UPSERT, `end_at` NULL 초기화.
    - `logEvent({ sessionId, eventType, targetUrl, latencyMs })`: `events` INSERT(`timestamp=datetime('now')`).
  - 주의: 고QPS 시 연결 오버헤드 고려. 트랜잭션이 필요한 복합연산은 별도 처리 권장.

- db/index.js:1
  - 역할: SQLite 연결과 파일 경로 관리.
  - 세부: `DATA_DIR` 보장, `DB_PATH`(.env 우선, 기본 `data/app.db`), `openDb()`.

- db/init.js:1
  - 역할: `schema.sql` 읽어서 적용. 단독 실행 시 초기화 로그 출력.

## 클라이언트 사이드

- public/js/main.js:1
  - 역할: 폼 제출 처리, `/api/check-time` 호출, 시계 렌더링 루프, 세션 초기화 및 이벤트 로깅.
  - 상태/참조: 폼/입력/버튼/오류 DOM, 시계 DOM, `sessionState`, `serverClockBase`, `serverClockStartPerf`, `animationFrameId`.
  - 초기화: `startClockLoop()`, `initSession()`, 폼 submit 바인딩.
  - 주요 함수
    - `handleSubmit()`: URL 유효성 검사(`/^https?:\/\//i`), 실패 시 `showError`.
    - `requestServerTime(targetUrl)`: 로딩 토글 → POST `/api/check-time` → JSON 파싱 → 에러 메시지 처리 또는 `applyTimeResult` → `sendEvent('click_button')`.
    - `applyTimeResult(result)`: 유효한 `server_time_estimated_epoch_ms`면 기준/기점 갱신 후 즉시 표시, 메타 라벨(`server_time_utc`) 갱신. 실패 시 플레이스홀더.
    - `startClockLoop()`: `requestAnimationFrame`로 경과시간을 더해 현재 시각 텍스트 갱신.
    - `sendEvent(eventType, extra)`: `/api/log-event` 비동기 전송(실패는 콘솔만).
    - UI 보조: `setLoading`, `showError`, `clearError`, `formatTimestamp`, `formatMetaLine` 등.
  - 예외/주의: 네트워크 오류 시 사용자 메시지 표출 + 콘솔 로깅. SSRF 차단 등 서버 측 에러는 일반화된 메시지로 안내.

---

질문이나 보완 요청이 있으면 알려주세요. 특정 함수의 흐름을 시퀀스 다이어그램으로 추가할 수도 있습니다.
