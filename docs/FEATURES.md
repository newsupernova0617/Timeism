# Timeism (SyncTime) — 서비스 기획서

> 최종 업데이트: 2026-03-22  
> 서비스 도메인: `https://synctime.keero.site`  
> 패키지명: `synctime` (package.json 기준)

---

## 1. 서비스 개요

### 1.1 핵심 목적

**Timeism(SyncTime)**은 특정 웹사이트 서버의 현재 시각을 HTTP `Date` 헤더 기반으로 **밀리초(ms) 단위**로 실시간 조회해주는 서비스입니다.

사용자가 직접 조회하고 싶은 URL을 입력하면, 해당 서버에 요청을 보내 서버가 응답한 시각을 측정하고, 네트워크 왕복 시간(RTT)의 절반을 보정하여 **서버 기준의 현재 시각**을 반환합니다.

### 1.2 해결하는 문제

| 문제 상황 | 설명 |
|---|---|
| 티켓팅 실패 | 인터파크, YES24, 멜론티켓 등에서 오픈 시각에 맞춰 요청해야 하지만 로컬 PC 시계가 서버 시각과 달라 늦게 또는 일찍 요청 |
| 수강신청 실패 | 대학 수강신청 시스템의 서버 시각과 사용자 시각 불일치 |
| 한정 판매 실패 | 쿠팡, Amazon 등 플래시 세일에서 타이밍 문제 |
| 해외 서비스 타임존 혼란 | 티켓마스터, StubHub 등 해외 사이트의 현지 시각을 파악하지 못함 |

### 1.3 타겟 사용자

- 한국/일본/글로벌 티켓팅 경쟁에 참여하는 사용자
- 대학 수강신청에서 0.1초를 다투는 학생
- 정확한 서버 시각 정보가 필요한 개발자 및 파워 유저

---

## 2. 핵심 기능 상세

### 2.1 서버 시간 조회

#### 기능 흐름

```
사용자 URL 입력
    │
    ▼
URL 자동 정규화
(프로토콜 없으면 자동으로 https:// 추가)
    │
    ▼
POST /api/check-time
    │
    ▼
서버측: 5회 측정 실행
  ├─ HEAD 요청 시도 → Date 헤더 추출
  └─ 실패 시 GET Range: bytes=0-0 폴백
    │
  각 측정 → RTT 계산 → RTT/2 보정으로 추정 서버 시각 산출
    │
  5회 중 RTT가 가장 작은 값 선택 (가장 정확)
    │
    ▼
클라이언트: 응답 수신 후 추가 RTT/2 보정
(클라이언트-서버 사이의 네트워크 지연 보정)
    │
    ▼
requestAnimationFrame 루프로 실시간 시계 갱신
(performance.now() 기반 고정밀 경과 시간 추적)
```

#### 표시 형식

- 기본: `2026-03-22 17:38:37 (UTC+9)`
- 밀리초 표시 옵션: `2026-03-22 17:38:37.421 (UTC+9)`
- 메타 정보: `마지막 측정: 17:38:37 · 서버 UTC 헤더: 2026-03-22 08:38:37 UTC`
- SyncTime 보정 표시: `(SyncTime 서버 기준 보정됨)`

#### URL 입력 처리

| 입력 | 변환 결과 |
|---|---|
| `google.com` | `https://google.com` |
| `http://example.com` | `http://example.com` (그대로) |
| `localhost:3000` | `http://localhost:3000` |
| `https://ticket.yes24.com` | `https://ticket.yes24.com` (그대로) |

---

### 2.2 알람 시스템

#### 2.2.1 목표 시간 알람

사용자가 시각을 입력하면 서버 기준 시각으로 알람을 설정합니다.

**동작 단계 (2-Phase 모니터링):**

| Phase | 조건 | 주기 | 목적 |
|---|---|---|---|
| Phase 1 (Coarse) | 목표 시각까지 > 2초 | 100ms | 전력 절약, 배터리 보호 |
| Phase 2 (Fine) | 목표 시각까지 ≤ 2초 | 10ms | 정밀 타이밍 보장 |

**알람 발동 시 동작:**
1. Web Audio API로 1200Hz 싸인파 0.8초 재생
2. 브라우저 Notification API로 시스템 알림 표시 (권한 있을 경우)
3. 알람 발동 정확도를 이벤트 로그에 기록 (`delay_ms`, `accuracy` 필드)

**정확도 등급:**
- `precise`: 실제 발동 오차 ≤ 10ms
- `good`: 오차 ≤ 100ms
- `acceptable`: 오차 > 100ms

#### 2.2.2 사전 알람 (Pre-Alarm)

목표 시각 N분 전에 미리 알림을 보내는 기능입니다.

| 옵션 | 발동 조건 | 설명 |
|---|---|---|
| 1분 전 알람 | 남은 시간 60초~59초 | `preAlarm1Min` 체크박스 |
| 2분 전 알람 | 남은 시간 120초~119초 | `preAlarm2Min` 체크박스 |
| 3분 전 알람 | 남은 시간 180초~179초 | `preAlarm3Min` 체크박스 |

- 사전 알람 설정은 `localStorage`에 저장되어 페이지 새로고침 후에도 유지
- 중복 발동 방지: `Set<string>` 기반 tracked 알람 관리
- 100ms 주기로 모니터링, 목표 시각 경과 후 자동 중지

#### 2.2.3 자동 알람 (Auto-Alarm)

사용자가 별도 설정 없이 **정각/30분** 직전에 자동으로 동작합니다.

| 시각 | 동작 |
|---|---|
| N시 59분 50~59초 | 카운트다운 화면 표시 (최대 10 → 1) |
| N시 59분 55초 | BBC 시보음 재생 시작 |
| N+1시 00분 00초 | 화면 플래시 효과 + 클럭 블록 하이라이트 |
| N시 29분 50~59초 | 카운트다운 화면 표시 |
| N시 29분 55초 | BBC 시보음 재생 시작 |
| N시 30분 00초 | 화면 플래시 효과 |

**BBC 시보음 구성:**
- 짧은 비프음(0.1초, 1000Hz) × 6회 → 0.8초 간격
- 긴 비프음(1.0초, 1000Hz) × 1회
- Web Audio API의 `OscillatorNode` + `GainNode` 사용

**카운트다운 시각 효과:**
- `alarm-overlay` div: 빨간 반투명 배경 (점점 진해짐)
- `alarm-countdown` div: 남은 초 숫자 표시
- 정각 도달 시 `flash` 클래스로 흰 색 플래시
- 1초 후 자동으로 페이드아웃

---

### 2.3 빠른 접속 사이트 (Quick Sites)

메인 페이지에서 주요 사이트를 원클릭으로 바로 시간 조회할 수 있는 기능입니다.

#### 등록된 사이트 목록

| 사이트 | URL | 카테고리 | 우선 지역 |
|---|---|---|---|
| 인터파크 (Interpark) | `https://ticket.interpark.com` | 티켓팅 | 한국 |
| 멜론티켓 (Melon Ticket) | `https://ticket.melon.com` | 티켓팅 | 한국 |
| YES24 | `https://ticket.yes24.com` | 티켓팅 | 한국 |
| 쿠팡 (Coupang) | `https://www.coupang.com` | 쇼핑 | 한국 |
| Ticketmaster | `https://www.ticketmaster.com` | 티켓팅 | 영어권 |
| StubHub | `https://www.stubhub.com` | 티켓팅 | 영어권 |
| Amazon | `https://www.amazon.com` | 쇼핑 | 영어권 |
| eBay | `https://www.ebay.com` | 쇼핑 | 영어권 |
| Eventbrite | `https://www.eventbrite.com` | 티켓팅 | 영어권 |
| KKTIX | `https://kktix.com` | 티켓팅 | 대만 |
| Ticketmaster Taiwan (拓元) | `https://www.ticketmaster.com.tw` | 티켓팅 | 대만 |
| 誠品售票 (Eslite) | `https://www.eslitecorp.com` | 티켓팅 | 대만 |
| 蝦皮購物 (Shopee TW) | `https://shopee.tw` | 쇼핑 | 대만 |
| momo購物網 | `https://www.momoshop.com.tw` | 쇼핑 | 대만 |
| 대학 수강신청 | (예시 URL) | 등록 | 공통 |

**동작 방식:**
- 버튼 클릭 → URL 입력 필드에 자동 입력 → 100ms 후 자동으로 Check Time 버튼 클릭
- 트렌딩 목록의 항목 클릭 시에도 동일한 방식으로 동작

---

### 2.4 실시간 트렌딩 (Trending Sites)

현재 다른 사용자들이 가장 많이 조회한 URL 상위 5개를 실시간으로 표시합니다.

- **데이터 기준**: 최근 1시간 이내 `url_check` 이벤트 기준
- **언어별 분리**: URL 조회 시 사용한 언어 코드(`locale`)별로 다른 트렌드 표시
- **자동 새로고침**: 5분마다 `/api/trending-urls?locale={locale}&limit=5` 자동 호출
- **클릭 인터랙션**: 항목 클릭 시 해당 URL로 시간 조회 자동 실행
- **빈 상태 처리**: 데이터 부족 시 4개 언어로 안내 메시지 표시

---

### 2.5 타임존 경고

사용자의 로컬 타임존이 조회한 서버의 타임존과 다를 경우 경고 배너를 표시합니다.

**표시 정보:**
- 서버의 UTC 오프셋 (예: UTC+9)
- 사용자의 UTC 오프셋 (예: UTC-5)
- 시차 계산 결과 (예: 14시간 차이)
- 경고 메시지: 한국어/영어/일본어/중국어번체 지원

---

### 2.6 트렌드 분석 페이지 (`/{locale}/trends`)

전체 서비스의 통계 데이터를 시각화합니다.

| 섹션 | 표시 데이터 |
|---|---|
| 인기 URL Top 10 | 전체 기간 동안 가장 많이 조회된 URL 및 조회 횟수 |
| 시간대별 통계 | 0~23시 각 시간대별 이벤트 수 (최근 24시간) |
| 오늘의 현황 | 오늘 총 `time_check` 이벤트 수 |
| 고유 URL 수 | 지금까지 조회된 중복 제거 URL 총수 |
| 전체 조회 수 | 누적 `time_check` 이벤트 총수 |

---

### 2.7 블로그 (`/{locale}/blog`)

서비스와 관련된 기술 가이드 및 티켓팅 전략을 10개 포스트로 제공합니다.

| # | 슬러그 | 한국어 제목 | 작성일 |
|---|---|---|---|
| 1 | `server-time-guide` | 서버 시간 확인 가이드: 0.1초의 승부 | 2026-01-05 |
| 2 | `ticketing-tips` | 티켓팅 성공을 위한 5가지 필승 전략 | 2026-01-05 |
| 3 | `ntp-vs-http` | NTP와 HTTP 시간의 차이점 완벽 정리 | 2026-01-05 |
| 4 | `ticketing-korea` | 한국 주요 티켓팅 사이트 완벽 가이드 | 2026-01-10 |
| 5 | `course-registration` | 대학 수강신청 완벽 공략 가이드 | 2026-01-10 |
| 6 | `time-sync-deep-dive` | 시간 동기화 기술: 밀리초의 세계로 | 2026-01-10 |
| 7 | `ticketing-japan` | 일본 주요 티켓팅 사이트 완벽 가이드 | 2026-01-10 |
| 8 | `ticketing-global` | 글로벌 티켓팅 플랫폼 완벽 가이드 | 2026-01-10 |
| 9 | `mobile-vs-pc` | 모바일 vs PC 티켓팅: 어디가 더 유리한가? | 2026-01-10 |
| 10 | `network-optimization` | 네트워크 최적화: 티켓팅 성공의 숨은 열쇠 | 2026-01-10 |

- 각 포스트는 한국어/영어 양쪽으로 제목·설명 제공
- 블로그 포스트별로 댓글 기능 연동 (`pageId`: `blog-{slug}`)
- 포스트별 SNS 공유 버튼 제공 (`social-share.ejs` 파셜)

---

### 2.8 사이트 전용 페이지 (`/{locale}/sites/:siteId`)

각 주요 사이트에 대한 전용 소개 페이지를 제공합니다. 4개 언어(en/ko) 지원.

- 사이트별 아이콘, 색상, 이름, URL, 카테고리 표시
- 해당 언어의 번역 데이터에서 `sites.{siteId}` 키의 설명 내용 렌더링
- sitemap.xml에 자동으로 4개 언어 버전이 포함됨

---

### 2.9 댓글 시스템

메인 페이지 및 블로그 포스트에 익명 댓글 기능이 있습니다.

#### 댓글 정책

| 항목 | 내용 |
|---|---|
| 작성자 | 완전 익명 (서버에서 `Anonymous`로 저장) |
| 내용 길이 | 최소 2자 ~ 최대 200자 |
| IP 레이트 리밋 | 5분 내 동일 IP에서 3회 이상 작성 불가 |
| 스팸 방지 | Honeypot 필드 (봇 감지) + IP 해시 기반 제한 |
| 자동 정리 | 페이지당 최근 10개만 유지 (초과분 하드 삭제) |
| 삭제 방식 | 관리자 삭제는 소프트 삭제 (`is_deleted = 1`) |

#### 페이지 식별자 (`pageId`) 예시

| 페이지 | pageId |
|---|---|
| 메인 페이지 | `main-page` |
| 블로그: 서버 시간 가이드 | `blog-server-time-guide` |
| 블로그: 티켓팅 팁 | `blog-ticketing-tips` |

---

### 2.10 관리자 대시보드 (`/admin`)

토큰 기반 인증 후 서비스 전체 통계를 확인할 수 있습니다.

#### 인증 방식

```
GET /admin         → 로그인 페이지 (login.html)
GET /admin/dashboard?token=XXX
또는
GET /admin/dashboard + 헤더: X-Admin-Token: XXX
```

환경변수 `ADMIN_TOKEN`과 일치해야 통과 (기본값: `admin_secret_token_change_me`).

#### 대시보드 Analytics 섹션

| 섹션 | API 엔드포인트 | 주요 데이터 |
|---|---|---|
| 사용자 현황 | `GET /api/analytics/users` | 총 사용자, 지역 수, 총 방문 횟수, 평균 방문, 최대 방문 |
| 이벤트 통계 | `GET /api/analytics/events` | 이벤트 타입별 발생 수, 평균/최소/최대 지연 시간, 세션 수 |
| 기기 분석 | `GET /api/analytics/devices` | desktop/mobile/tablet별 사용자/세션/이벤트 수 |
| URL 성능 | `GET /api/analytics/urls` | URL별 요청 수, 평균 지연, 세션 수 |
| 전체 성능 | `GET /api/analytics/performance` | 총 이벤트, 평균 지연, 느린 이벤트(>1초) 수 |
| 종합 요약 | `GET /api/analytics/summary` | 위 모든 데이터의 요약 |

---

### 2.11 설문조사 페이지 (`/{locale}/survey`)

서비스 사용 경험에 대한 피드백을 수집합니다.

**수집 항목:**
- 서비스 만족도 (1~5점)
- 가장 유용한 기능 선택
- 개선 희망 사항 (텍스트)
- 추가 의견 (텍스트)

> ⚠️ **현재 상태**: 폼 제출은 동작하지만 DB 저장 로직이 구현되어 있지 않음 (TODO 주석 존재)

---

### 2.12 다국어 지원

**지원 언어 4개:**

| 언어 코드 | 언어명 | URL 경로 | hreflang |
|---|---|---|---|
| `en` | 영어 (기본값) | `/en/...` | `en` |
| `ko` | 한국어 | `/ko/...` | `ko` |
| `jp` | 일본어 | `/jp/...` | `jp` |
| `zh-tw` | 중국어 번체 | `/zh-tw/...` | `zh-Hant` |

**언어 감지 우선순위 (순서대로):**

1. URL 경로 첫 번째 세그먼트 (`/ko/`, `/jp/` 등)
2. 쿼리 파라미터 (`?lang=ko`)
3. `Accept-Language` HTTP 헤더 (첫 번째 언어 코드)
4. 기본값: `en`

**번역 파일 위치:** `lib/i18n/locales/{locale}.json`

**SEO 지원:**
- 모든 페이지에 `hreflang` 링크 자동 생성
- `sitemap.xml` 동적 생성 (모든 페이지 × 4개 언어)

---

### 2.13 세션 및 이벤트 추적

서비스 개선을 위한 익명 사용 데이터를 수집합니다.

#### 세션 흐름

```
페이지 첫 로드
    │
localStorage에서 기존 세션 확인
    │
없으면 새 user_id / session_id 생성 (crypto.randomUUID)
    │
POST /api/session-init (서버 동기화)
    │
세션 정보 localStorage에 저장
    │
view_time 이벤트 기록 (페이지 성능 메트릭 포함)
```

#### 수집되는 이벤트 타입

| 이벤트 타입 | 발생 시점 | 포함 데이터 |
|---|---|---|
| `view_time` | 페이지 로드 | 페이지 로드 시간, DOMReady, FCP, FP |
| `click_button` | 시간 조회 성공 | target_url, latency_ms |
| `check_time_error` | 시간 조회 실패 | target_url, error_type, status_code |
| `network_error` | 네트워크 오류 | target_url, error_type, error_message |
| `set_alarm` | 알람 설정 | mode, target_time, time_until_alarm_ms |
| `alarm_triggered` | 알람 발동 | mode, target_time, delay_ms, accuracy |
| `alarm_cancelled` | 알람 취소 | — |
| `pre_alarm_triggered` | 사전 알람 발동 | minutes_before |

---

### 2.14 보안 기능

| 보안 기능 | 구현 방식 | 대상 |
|---|---|---|
| SSRF 방어 | 내부 IP CIDR 블락리스트 + DNS 룩업 후 재검증 | `/api/check-time` |
| Rate Limiting | express-rate-limit (IP 기반) | 모든 API |
| IP 익명화 | SHA-256 해시 (`IP_HASH_SALT:ip` 조합) | 사용자/댓글 저장 |
| Helmet | X-Frame-Options, HSTS, XSS 보호 등 | 전체 응답 |
| 캐시 제어 | `Cache-Control: no-store` | 시간 조회 응답 |
| Honeypot | 숨겨진 필드로 봇 감지 | 댓글 작성 |
| 관리자 토큰 | 쿼리 파라미터 또는 헤더 기반 인증 | 관리자 페이지/API |

---

### 2.15 기타 정보 페이지

| 페이지 | URL 패턴 | 주요 내용 |
|---|---|---|
| 가이드 | `/{locale}/guide` | 서비스 사용 방법 단계별 안내 |
| About | `/{locale}/about` | 서비스 소개, 개발 배경 |
| Contact | `/{locale}/contact` | 문의 양식 |
| 개인정보처리방침 | `/{locale}/privacy` | 개인정보 수집/이용 방침 |
| 이용약관 | `/{locale}/terms` | 서비스 이용 조건 |
| 게임 | `/{locale}/game` | 서버 타이밍 연습 게임 |
| 알람 테스트 | `/{locale}/alarm-test` | 알람 기능 독립 테스트 페이지 |
| 404 | 없는 경로 | 언어 감지 후 친화적 에러 화면 |

---

## 3. 미구현 / TODO 항목

| 항목 | 위치 | 상태 |
|---|---|---|
| 설문조사 DB 저장 로직 | `app.js` POST `/*/survey` | `// TODO` 주석 존재 |
| 일본어/중국어 사이트 전용 페이지 | `app.js` | `/jp/sites/:siteId`, `/zh-tw/sites/:siteId` 라우트 없음 (en/ko만 존재) |
| 설문 응답 중복 방지 (DB 로직) | `routes/api.js` | IP 해시 기반 중복 확인 미구현 |
| 테스트 코드 | `package.json` | `npm test` → `echo No tests && exit 0` |
| 댓글 신고 기능 | `comment-repository.js` | `reportCount` 필드는 있으나 신고 API 없음 |

---

## 4. 광고 (수익화)

- Google AdSense 배너 통합
- 광고 영역: 헤더 상단, 콘텐츠 사이드바, 하단
- `ads.txt` 파일: `/public/ads.txt`
- 관련 CSS: `public/css/ad-banners.css`
- `docs/ADSENSE_*.md`: AdSense 단계별 구현 문서 존재

---

## 5. SEO 최적화

- `robots.txt` 동적 생성 (`/api/`, `/admin/` 차단)
- `sitemap.xml` 동적 생성 (기본 페이지 + 사이트별 + 블로그 × 4개 언어)
- `og-image.png` OG 이미지 제공 (Puppeteer 기반 생성 스크립트 존재)
- `site.webmanifest` PWA 매니페스트
- 페이지별 동적 메타 태그 (`views/partials/meta.ejs`)
- 브레드크럼 내비게이션 (`views/partials/breadcrumb.ejs`)
- Trust Indicators 섹션 (`views/partials/trust-indicators.ejs`)
