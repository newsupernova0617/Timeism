# Timeism — 리메이크 기획서 (기능 명세)

> 버전: Remake v1.0  
> 작성일: 2026-03-22  
> 기존 서비스의 모든 기능을 유지하며, 테크스택을 현대화하는 리메이크입니다.

---

## 1. 서비스 개요

### 1.1 핵심 목적

**Timeism(SyncTime)**은 특정 웹사이트 서버의 현재 시각을 HTTP `Date` 헤더 기반으로 **밀리초(ms) 단위**로 실시간 조회해주는 서비스입니다.

티켓팅, 수강신청, 한정 판매 등 **0.1초 단위의 타이밍이 승부를 결정하는 상황**에서 서버 기준 시각을 정확하게 알아, 사용자의 성공률을 높이는 것이 핵심 목적입니다.

### 1.2 해결하는 문제

| 문제 상황 | 설명 |
|---|---|
| 티켓팅 실패 | 인터파크, YES24, 멜론티켓 오픈 시각에 내 PC 시계가 서버보다 느리거나 빠름 |
| 수강신청 실패 | 대학 수강신청 시스템 서버 시각과 사용자 시각 불일치 |
| 한정 판매 실패 | 쿠팡, Amazon 등 플래시 세일에서 타이밍 실패 |
| 해외 서비스 타임존 혼란 | 티켓마스터, StubHub 등 해외 사이트의 현지 시각 파악 불가 |

### 1.3 리메이크의 목표

- **기능 유지**: 기존 서비스의 모든 기능을 100% 동일하게 구현
- **글로벌 엣지 성능**: Cloudflare Edge Network를 통해 전 세계 사용자에게 동일한 응답 속도 보장
- **제로(0) 서버 유지비**: 서버리스(Serverless) 아키텍처로 인프라 비용 최소화
- **SEO 극대화**: SSG(정적 사이트 생성)를 통한 구글 검색 노출 최적화 (수익화 AdSense)
- **유지보수성 향상**: TypeScript 전면 도입으로 런타임 에러를 빌드 타임에 차단

---

## 2. 전체 페이지 목록

### 2.1 정적 페이지 (SSG 빌드) — 빌드 시점에 HTML 고정

이 페이지들은 CDN(Cloudflare Pages)에서 즉시 서빙되어 TTFB가 거의 0에 수렴합니다.

| 페이지 | URL 패턴 | 설명 |
|---|---|---|
| 가이드 | `/{locale}/guide` | 서비스 사용 방법 안내 |
| About | `/{locale}/about` | 서비스 소개 |
| Contact | `/{locale}/contact` | 문의 페이지 |
| 개인정보처리방침 | `/{locale}/privacy` | 개인정보 정책 |
| 이용약관 | `/{locale}/terms` | 이용 약관 |
| 블로그 목록 | `/{locale}/blog` | 블로그 포스트 목록 |
| 블로그 상세 | `/{locale}/blog/:slug` | 개별 포스트 (10개) |
| 사이트 전용 페이지 | `/{locale}/sites/:siteId` | 개별 사이트 가이드 (15개) |
| 404 | 없는 경로 | 에러 페이지 |

### 2.2 동적 페이지 (SSG 뼈대 + CSR 인터랙션)

뼈대(레이아웃, 텍스트)는 SSG로 미리 빌드되고, 인터랙티브 컴포넌트(시계, 알람 등)만 브라우저에서 CSR로 마운트됩니다.

| 페이지 | URL 패턴 | SSG 요소 | CSR 요소 |
|---|---|---|---|
| 메인 | `/{locale}/` | 레이아웃, 설명 텍스트, Quick Sites 목록 | 서버 시간 조회, 알람, 트렌딩 |
| 게임 | `/{locale}/game` | 레이아웃, 게임 설명 | 게임 로직 전체 |
| 트렌드 분석 | `/{locale}/trends` | 레이아웃, 헤더 | 통계 데이터 (API 호출) |
| 설문조사 | `/{locale}/survey` | 폼 레이아웃 | 폼 제출 로직 |
| 알람 테스트 | `/{locale}/alarm-test` | 레이아웃 | 알람 기능 전체 |

---

## 3. 핵심 기능 명세

### 3.1 서버 시간 조회

#### 흐름

```
사용자 URL 입력
    │
    ▼
URL 자동 정규화 (클라이언트)
(프로토콜 없으면 https:// 자동 추가)
    │
    ▼
POST https://api.timeism.com/check-time
(Hono.js on Cloudflare Workers — 사용자와 가장 가까운 엣지 실행)
    │
    ▼
SSRF 검증 → 5회 측정 (HEAD → GET Range 폴백)
RTT/2 보정 → 최솟값 선택
    │
    ▼
클라이언트: 응답 수신 + 추가 클라이언트 RTT/2 보정
requestAnimationFrame 루프로 실시간 시계 갱신
```

#### 표시 형식

```
2026-03-22 17:38:37.421 (UTC+9)
마지막 측정: 17:38:37 · 서버 UTC 헤더: 2026-03-22 08:38:37 UTC (SyncTime 서버 기준 보정됨)
```

#### URL 입력 처리

| 입력 | 변환 결과 |
|---|---|
| `google.com` | `https://google.com` |
| `localhost:3000` | `http://localhost:3000` |
| `https://ticket.yes24.com` | 그대로 |

---

### 3.2 알람 시스템

#### A. 목표 시간 알람

서버 기준 시각으로 목표 시각 설정 후 정밀 발동합니다.

**2-Phase 모니터링 (React `useEffect` 기반):**

| Phase | 조건 | 주기 | 목적 |
|---|---|---|---|
| Phase 1 (Coarse) | 목표 시각까지 > 2초 | 100ms | 배터리/성능 보호 |
| Phase 2 (Fine) | 목표 시각까지 ≤ 2초 | 10ms | 정밀 타이밍 |

**알람 발동 시 동작:**

1. Web Audio API로 1200Hz 사인파 0.8초 재생
2. Notifications API로 시스템 알림 표시
3. `delay_ms`, `accuracy` 이벤트 기록 (Turso DB)

**정확도 등급:**

| 등급 | 기준 |
|---|---|
| `precise` | 오차 ≤ 10ms |
| `good` | 오차 ≤ 100ms |
| `acceptable` | 오차 > 100ms |

#### B. 사전 알람 (Pre-Alarm)

목표 시각 N분 전 미리 알림. 설정은 `localStorage`에 영속화.

| 옵션 | 발동 조건 |
|---|---|
| 1분 전 | 남은 시간 60초~59초 |
| 2분 전 | 남은 시간 120초~119초 |
| 3분 전 | 남은 시간 180초~179초 |

#### C. 자동 알람 (Auto-Alarm)

정각 / 30분 직전 자동 작동. 사용자가 별도 설정 불필요.

| 시각 | 동작 |
|---|---|
| XX:59:50 ~ XX:59:59 | 화면 카운트다운 (10 → 1) |
| XX:59:55 | BBC 시보음 재생 (6회 짧은 비프 + 1회 긴 비프) |
| XX+1:00:00 | 화면 플래시 효과 + 클럭 하이라이트 |
| XX:29:50 ~ XX:29:59 | 위 동일 |
| XX:30:00 | 화면 플래시 효과 |

---

### 3.3 빠른 접속 사이트 (Quick Sites)

원클릭으로 주요 사이트 시간 바로 조회. **정적 데이터로 SSG 빌드 시 포함.**

| 사이트 | URL | 카테고리 | 지역 |
|---|---|---|---|
| 인터파크 | `ticket.interpark.com` | 티켓팅 | 🇰🇷 |
| 멜론티켓 | `ticket.melon.com` | 티켓팅 | 🇰🇷 |
| YES24 | `ticket.yes24.com` | 티켓팅 | 🇰🇷 |
| 쿠팡 | `coupang.com` | 쇼핑 | 🇰🇷 |
| Ticketmaster | `ticketmaster.com` | 티켓팅 | 🇺🇸 |
| StubHub | `stubhub.com` | 티켓팅 | 🇺🇸 |
| Amazon | `amazon.com` | 쇼핑 | 🇺🇸 |
| eBay | `ebay.com` | 쇼핑 | 🇺🇸 |
| Eventbrite | `eventbrite.com` | 티켓팅 | 🇺🇸 |
| KKTIX | `kktix.com` | 티켓팅 | 🇹🇼 |
| Ticketmaster TW | `ticketmaster.com.tw` | 티켓팅 | 🇹🇼 |
| 誠品售票 | `eslitecorp.com` | 티켓팅 | 🇹🇼 |
| 蝦皮購物 | `shopee.tw` | 쇼핑 | 🇹🇼 |
| momo購物網 | `momoshop.com.tw` | 쇼핑 | 🇹🇼 |
| 대학 수강신청 | (예시 URL) | 등록 | 공통 |

---

### 3.4 실시간 트렌딩 (Trending Sites)

현재 사용자들이 가장 많이 조회하는 URL 상위 5개를 실시간 표시.

- **데이터 기준**: 최근 1시간 이내 `url_check` 이벤트 (Turso DB 쿼리)
- **언어별 분리**: `locale` 파라미터로 언어별 독립 트렌드
- **자동 새로고침**: 5분마다 React `useEffect` + polling
- **클릭 인터랙션**: 클릭 시 해당 URL로 시간 조회 자동 실행

---

### 3.5 타임존 경고

사용자 로컬 타임존과 조회한 서버 타임존이 다를 시 경고 배너 표시.

- 서버 UTC 오프셋 vs 사용자 로컬 UTC 오프셋 비교
- 시차 계산 결과 표시
- **4개 언어** 경고 메시지 지원

---

### 3.6 트렌드 분석 페이지 (`/{locale}/trends`)

| 섹션 | 데이터 |
|---|---|
| 인기 URL Top 10 | 전체 기간 누적 조회 순 |
| 시간대별 현황 | 0~23시 이벤트 수 (최근 24시간) |
| 오늘 현황 | 오늘 총 조회 수, 고유 URL 수, 누적 총 조회 수 |

---

### 3.7 블로그 (`/{locale}/blog`)

10개 포스트, SSG로 완전 정적 HTML 빌드. 포스트별 댓글 연동.

| # | 슬러그 | 한국어 제목 |
|---|---|---|
| 1 | `server-time-guide` | 서버 시간 확인 가이드: 0.1초의 승부 |
| 2 | `ticketing-tips` | 티켓팅 성공을 위한 5가지 필승 전략 |
| 3 | `ntp-vs-http` | NTP와 HTTP 시간의 차이점 완벽 정리 |
| 4 | `ticketing-korea` | 한국 주요 티켓팅 사이트 완벽 가이드 |
| 5 | `course-registration` | 대학 수강신청 완벽 공략 가이드 |
| 6 | `time-sync-deep-dive` | 시간 동기화 기술: 밀리초의 세계로 |
| 7 | `ticketing-japan` | 일본 주요 티켓팅 사이트 완벽 가이드 |
| 8 | `ticketing-global` | 글로벌 티켓팅 플랫폼 완벽 가이드 |
| 9 | `mobile-vs-pc` | 모바일 vs PC 티켓팅: 어디가 더 유리한가? |
| 10 | `network-optimization` | 네트워크 최적화: 티켓팅 성공의 숨은 열쇠 |

---

### 3.8 댓글 시스템

| 항목 | 내용 |
|---|---|
| 작성자 | 완전 익명 (`anonymous`) |
| 내용 길이 | 최소 2자 ~ 최대 200자 |
| IP 레이트 리밋 | 5분 내 같은 IP로 3회 이상 불가 |
| 스팸 방지 | Honeypot 필드 + IP 해시 제한 |
| 자동 정리 | 페이지당 최신 10개 유지, 초과분 하드 삭제 |
| 소프트 삭제 | 관리자 삭제 시 `is_deleted = 1` 처리 |

---

### 3.9 관리자 대시보드 (`/admin`)

토큰 인증 후 서비스 전체 통계 열람.

| 섹션 | API | 데이터 |
|---|---|---|
| 사용자 현황 | `GET /analytics/users` | 총 사용자, 지역 수, 재방문율 |
| 이벤트 통계 | `GET /analytics/events` | 타입별 발생 수, 평균 지연 |
| 기기 분석 | `GET /analytics/devices` | desktop/mobile/tablet 비율 |
| URL 성능 | `GET /analytics/urls` | URL별 조회 수, 평균 RTT |
| 전체 성능 | `GET /analytics/performance` | 총 이벤트, 평균 지연, 느린 이벤트 |
| 종합 요약 | `GET /analytics/summary` | 위 전체 합산 요약 |

---

### 3.10 다국어 지원 (i18n)

**4개 언어**, URL 경로 기반으로 완전 분리.

| 언어 코드 | 언어 | URL |
|---|---|---|
| `en` | 영어 (기본값) | `/en/...` |
| `ko` | 한국어 | `/ko/...` |
| `jp` | 일본어 | `/jp/...` |
| `zh-tw` | 중국어번체 | `/zh-tw/...` |

**감지 우선순위:**

1. URL 경로 (`/ko/`, `/en/` 등)
2. 쿼리 파라미터 (`?lang=ko`)
3. `Accept-Language` HTTP 헤더
4. 기본값: `en`

vite-ssg 빌드 시 각 언어별 경로가 **독립 정적 HTML 파일**로 생성됩니다.
`hreflang` 태그는 React Helmet (또는 `react-helmet-async`)으로 각 페이지에 자동 주입.

---

### 3.11 세션 및 이벤트 추적

| 이벤트 타입 | 발생 시점 | 포함 데이터 |
|---|---|---|
| `view_time` | 페이지 로드 | 페이지 로드 시간, FCP, FP |
| `click_button` | 시간 조회 성공 | target_url, latency_ms |
| `check_time_error` | 시간 조회 실패 | target_url, error_type |
| `network_error` | 네트워크 오류 | error_type, error_message |
| `set_alarm` | 알람 설정 | mode, target_time |
| `alarm_triggered` | 알람 발동 | delay_ms, accuracy |
| `alarm_cancelled` | 알람 취소 | — |
| `pre_alarm_triggered` | 사전 알람 발동 | minutes_before |

---

### 3.12 보안

| 기능 | 방식 |
|---|---|
| SSRF 방어 | 18개 CIDR 블락 + DNS 이중 검증 |
| Rate Limiting | Hono 미들웨어 + Cloudflare Rate Limiting |
| IP 익명화 | SHA-256 해싱 (`IP_HASH_SALT:ip`) |
| 관리자 인증 | 환경변수 토큰 기반 |
| 캐시 제어 | `no-store` 헤더 (시간 조회 응답) |
| Honeypot | 숨겨진 필드 봇 감지 (댓글) |

---

### 3.13 기타 정보 페이지

| 페이지 | URL | 설명 |
|---|---|---|
| 가이드 | `/{locale}/guide` | 서비스 사용 방법 |
| About | `/{locale}/about` | 서비스 소개 |
| Contact | `/{locale}/contact` | 문의 |
| 개인정보처리방침 | `/{locale}/privacy` | 개인정보 정책 |
| 이용약관 | `/{locale}/terms` | 이용 약관 |
| 게임 | `/{locale}/game` | 타이밍 연습 게임 |
| 알람 테스트 | `/{locale}/alarm-test` | 알람 기능 테스트 |
| 404 | 없는 경로 | 친화적 에러 화면 |

---

## 4. SEO & 수익화

- `hreflang` 태그: 각 페이지 React Helmet으로 자동 주입
- `sitemap.xml`: 빌드 시 vite-ssg 플러그인으로 자동 생성
- `robots.txt`: `/api/`, `/admin/` Disallow
- OG 이미지: 정적 `og-image.png` 제공
- Google AdSense: 헤더/사이드/하단 배너 (`ad-banners.css`)
- PWA 매니페스트: `site.webmanifest`

---

## 5. 리메이크 시 신규 추가 예정 기능

| 항목 | 설명 |
|---|---|
| 설문조사 DB 저장 | POST `/survey` 실제 Turso DB 저장 구현 |
| 댓글 신고 API | `report_count` 필드 활용 신고 엔드포인트 |
| 일본어/중국어 사이트 페이지 | `/jp/sites/:id`, `/zh-tw/sites/:id` 전체 구현 |
| TypeScript 전면 도입 | 모든 API 페이로드, DB 스키마 타입 안전성 확보 |
| 테스트 코드 | Vitest 기반 단위 테스트 도입 |
