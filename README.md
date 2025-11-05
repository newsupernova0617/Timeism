# 서버 시간 비교 서비스 (HTTP Date 기반)

이 프로젝트는 사용자가 입력한 대상 URL의 HTTP `Date` 헤더를 안전하게 조회하여, 네트워크 왕복시간(RTT)의 절반을 보정한 서버 기준 현재 시각의 근사치를 제공하는 웹 애플리케이션입니다. 프런트엔드는 실시간으로 시계를 표시하고, 백엔드는 SSRF 방어와 레이트 리밋, SQLite 기반 이벤트 로깅을 제공합니다.

- 런타임: Node.js 20 (CommonJS)
- 프레임워크: Express
- 데이터베이스: SQLite (파일형)
- 프런트: 정적 HTML/CSS/JS (접근성/다크모드 고려)

## 목차
- 프로젝트 구조
- 동작 개요
- API 사양
- 보안과 개인 정보
- 로컬 개발 및 실행
- 배포 가이드
- 수동 테스트 체크리스트
- 문제 해결 및 FAQ
- 향후 개선 사항

## 프로젝트 구조
```
.
├─ app.js                  # Express 엔트리: 미들웨어/정적서빙/라우팅/에러
├─ routes/
│  └─ api.js               # /api/check-time, /api/log-event, /api/session-init
├─ lib/
│  ├─ timeFetch.js         # 안전 검증 후 HEAD/GET으로 Date 헤더 측정 및 추정
│  ├─ ssrf.js              # SSRF 방어(URL/DNS/IP 검증, 리다이렉트 재검증)
│  ├─ identity.js          # IP 정규화/해시(SHA-256 + 솔트)
│  └─ repository.js        # SQLite 저장소 유틸(users/sessions/events)
├─ db/
│  ├─ schema.sql           # SQLite 스키마 (users/sessions/events)
│  ├─ index.js             # DB 열기/경로/디렉토리 보장
│  └─ init.js              # 스키마 적용(초기화/마이그레이션)
├─ public/
│  ├─ index.html           # 메인 UI(주소 입력 → 시계 표시)
│  ├─ guide.html           # 사용 가이드
│  ├─ privacy.html         # 데이터 수집/광고 안내
│  ├─ js/main.js           # 폼처리/API 연동/시계 애니메이션/세션관리
│  └─ css/{tokens,style}.css
├─ data/                   # 런타임 SQLite DB(app.db) 저장 위치(운영: 볼륨 마운트)
├─ Dockerfile              # 컨테이너 배포 스캐폴드
├─ .env                    # 환경 변수 예시(운영 시 비밀로 관리)
├─ package.json            # 스크립트/의존성
└─ AGENTS.md               # 레포 작업 가이드
```

## 동작 개요
1) 사용자가 메인 페이지(`public/index.html`)에서 대상 URL을 입력하고 제출합니다.
2) 프런트(`public/js/main.js`)는 백엔드 `/api/check-time`에 요청을 보냅니다.
3) 백엔드(`lib/ssrf.js`)는 URL 유효성 및 안전성 검사(SSRF 방어)를 수행합니다.
4) 안전하면 `lib/timeFetch.js`가 HEAD 요청으로 `Date` 헤더를 우선 시도합니다. 부재/실패 시 Range `GET bytes=0-0`으로 재시도합니다.
5) 왕복시간 RTT를 측정하고 `server_time_estimated_epoch_ms = serverUtc + (RTT/2)`로 근사치를 계산합니다.
6) 프런트는 이 근사치와 `performance.now()` 기준으로 실시간 시계를 렌더링합니다.
7) 최초 방문 시 `/api/session-init`으로 유저/세션을 초기화하고, 버튼 클릭 등은 `/api/log-event`로 수집합니다.

## API 사양

공통 사항
- Base URL: `/api`
- Content-Type: `application/json`
- 에러 응답: `{ error: string, message: string }`

POST `/api/check-time`
- 요청 바디: `{ "target_url": string }`
- 쿼리: `?debug=1`일 때 `rtt_ms` 포함
- 성공 응답:
  - `target_url`: 요청한 URL
  - `server_time_utc`: 대상 서버의 HTTP `Date` 헤더(ISO8601 UTC)
  - `server_time_estimated_epoch_ms`: RTT/2 보정된 서버 시각의 에포크(ms)
  - `rtt_ms?`: debug=1일 때 왕복시간(ms)
- 상태 코드
  - 200: 성공
  - 400: `INVALID_URL`, `BLOCKED_HOST`, `BLOCKED_IP`
  - 502: `DNS_LOOKUP_FAILED`, `TIME_UNAVAILABLE`
  - 504: `TIMEOUT`
  - 500: 기타 내부 오류

POST `/api/log-event`
- 요청 바디: `{ "session_id": string, "event_type": string, "target_url"?: string, "latency_ms"?: number }`
- 유효성: `session_id`, `event_type` 필수
- 처리: SQLite `events` 테이블에 저장(최대 URL 2048자, `latency_ms` 정수 반올림)
- 응답: `{ ok: true }` 또는 500(DB_ERROR)

POST `/api/session-init`
- 요청 바디(선택): `{ "user_id"?, "session_id"?, "user_agent"?, "region"?, "device_type"? }`
- 미제공 시 `user_id`, `session_id`는 nanoid로 생성
- 서버는 `req.ip`을 정규화/해시(`SHA-256(IP_HASH_SALT:ip)`)하여 저장
- 처리: `users` upsert, `sessions` upsert(start_at 설정, end_at NULL)
- 응답: `{ "user_id": string, "session_id": string, "started_at": string(ISO) }`

## 보안과 개인 정보

SSRF 방어(`lib/ssrf.js`)
- 프로토콜 제한: `http`, `https`만 허용
- 호스트 차단: `localhost`, 접미사 `.local`, `.internal`
- 포트 검사: 1~65535 범위만 허용
- IP/CIDR 차단: 로컬/사설/멀티캐스트/문서용(IPv4/IPv6) 광범위 차단
- DNS 조회: `dns.lookup(all: true)`로 모든 결과 IP를 검사
- 리다이렉트 추적: 각 Location 이동 시마다 재검증(최대 3회)

개인 정보 보호
- 클라이언트 IP는 원문을 저장하지 않고 솔트 기반 해시(`IP_HASH_SALT`)만 저장합니다.
- 수집 데이터 범주: user_agent, 추정 지역/디바이스, 세션 식별자/방문 시각, 서비스 내 행동 이벤트, 대상 URL(익명 통계용)
- 자세한 항목은 `public/privacy.html` 참고

운영 구성 안전장치
- `express-rate-limit`으로 `/api/check-time`에 분당 요청 수 제한(기본 30)
- `helmet` 기본 보안 헤더(필요 시 CSP 고도화 가능)
- `compression`, `express.json({ limit: '64kb' })`, `morgan` 로깅
- 리버스 프록시 환경에서는 `TRUST_PROXY` 설정으로 올바른 클라이언트 IP 처리

## 로컬 개발 및 실행

사전 준비
- Node.js 20.x
- npm

설치
```
npm install
```

환경 변수 설정(`.env`)
```
PORT=3000
NODE_ENV=development
RATE_LIMIT_MAX=30
TRUST_PROXY=
IP_HASH_SALT=your_production_salt_here
DB_PATH=
```
- 운영에서는 반드시 `IP_HASH_SALT`를 고유하고 충분히 랜덤한 값으로 설정하세요.

데이터베이스 초기화
```
npm run db:init
```
- `db/schema.sql`을 적용하여 `data/app.db`를 생성/마이그레이션 합니다.

개발 서버 실행
```
npm run dev
```
- `http://localhost:3000` 접속
- 정적 페이지: `/`, `/guide`, `/privacy`

프로덕션 실행
```
npm start
```
- 또는 `node -e "require('./app')"`로 간단한 구문/런타임 스모크 체크

## 배포 가이드

Docker 사용
- `Dockerfile`을 기반으로 이미지를 빌드하고 실행할 수 있습니다.
- `data/`를 볼륨 마운트하여 SQLite 파일의 내구성을 확보하세요.
- 역프록시(Nginx/ALB 등) 뒤에서 구동 시 `TRUST_PROXY=1` 설정을 권장합니다.
- AdSense 사용 시 `public/index.html`의 주석 스니펫 활성화 및 클라이언트/슬롯 ID 주입 필요

환경 변수(요약)
- `PORT`: 서버 포트(기본 3000)
- `NODE_ENV`: `production` 권장
- `RATE_LIMIT_MAX`: `/api/check-time` 분당 요청 허용값(기본 30)
- `TRUST_PROXY`: 프록시 신뢰 hop 수(예: `1`)
- `IP_HASH_SALT`: IP 해시 솔트(필수)
- `DB_PATH`: SQLite 파일 경로(기본 `data/app.db`)

스토리지 및 백업
- `data/app.db`는 애플리케이션 상태의 핵심입니다. 운영에서는 영속 볼륨 마운트 및 주기적 백업을 구성하세요.

## 수동 테스트 체크리스트

기본 동작
- `/` 접속 후 URL 입력 → "시간 확인" 클릭 → 시계 표시
- `debug=1`로 호출 시 `rtt_ms` 포함 확인(예: 툴로 직접 호출)

SSRF 방어 확인
- 차단되어야 함: `http://localhost`, `http://127.0.0.1`, `http://10.0.0.1`, `http://[::1]` → 400
- 존재하지 않는 도메인: `DNS_LOOKUP_FAILED` → 502
- 리다이렉트 다단계: 3회 초과 시 차단
- `.local`, `.internal` 접미사 차단 확인

세션/이벤트
- 페이지 최초 접근 시 `/api/session-init` 성공(응답 JSON에 user_id, session_id)
- 버튼 클릭 등 후 `/api/log-event` → `{ ok: true }`

성능/레이트리밋
- 짧은 시간 많은 호출 시 `/api/check-time`에서 429 응답 및 에러 메시지 확인

## 문제 해결 및 FAQ

- Q. 대상 서버가 `Date` 헤더를 주지 않아요.
  - A. HEAD/GET Range 순으로 시도하며, 둘 다 없으면 `TIME_UNAVAILABLE(502)`가 발생합니다. 서버가 `Date`를 제공하도록 설정하거나 다른 URL을 사용하세요.

- Q. 측정값이 실제와 몇백 ms 차이 납니다.
  - A. 네트워크 지연/큐잉/타임스탬프 보정 등으로 오차가 발생할 수 있습니다. 본 서비스는 참고용이며, 정확한 동기화는 NTP를 권장합니다.

- Q. 사설망/내부망 주소는 왜 안 되나요?
  - A. SSRF 방지를 위해 로컬/사설/멀티캐스트 등 안전하지 않은 주소 대역과 특정 호스트를 차단합니다.

- Q. 프록시 뒤에서 클라이언트 IP가 이상합니다.
  - A. 운영 환경에서 `TRUST_PROXY`를 알맞게 설정하세요. 그렇지 않으면 레이트 리밋 및 IP 해시가 프록시 IP로 계산됩니다.

## 향후 개선 사항
- 서버측 NTP 클락 소스 도입 및 고정밀 기준시 제공
- 다중 샘플 수집 및 이상치 제거로 오차 축소
- 관리자용 간단 대시보드(사용/이벤트 통계)
- 기본 테스트 스위트(`tests/`) 및 CI 도입
- CSP 정책 강화 및 보안 헤더 고도화

---

문의/제안: `public/privacy.html`의 연락처 이메일을 참고하세요.
