# Timeism — 리메이크 아키텍처 설계서

> 버전: Remake v1.0  
> 작성일: 2026-03-22  
> 테크스택: Vite + React + vite-ssg | Hono (Cloudflare Workers) | Turso (libSQL) | Drizzle ORM

---

## 1. 아키텍처 개요

### 1.1 전체 구조 다이어그램

```
┌─────────────────────────────────────────────────────────────────┐
│                  사용자 브라우저 (전 세계)                         │
└──────────┬──────────────────────────────┬───────────────────────┘
           │                              │
           │ 정적 에셋 요청               │ API 요청
           ▼                              ▼
┌──────────────────────┐    ┌─────────────────────────────┐
│  Cloudflare Pages    │    │   Cloudflare Workers (Edge) │
│  (CDN 전 세계 배포)   │    │   Hono.js                   │
│                      │    │                             │
│  /en/                │    │  POST /check-time           │
│  /ko/                │    │  POST /session-init         │
│  /jp/                │    │  POST /log-event            │
│  /zh-tw/             │    │  GET  /trending-urls        │
│  /en/blog/...        │    │  GET  /comments/:pageId     │
│  /en/sites/...       │    │  POST /comments             │
│  (모두 정적 HTML)     │    │  GET  /analytics/*          │
└──────────────────────┘    └──────────────┬──────────────┘
                                            │
                                            ▼
                              ┌─────────────────────────┐
                              │  Turso (libSQL / SQLite) │
                              │  — 글로벌 엣지 복제본     │
                              │  users, sessions,        │
                              │  events, comments,       │
                              │  survey_responses         │
                              └─────────────────────────┘
                                            │
                                            ▼
                              ┌─────────────────────────┐
                              │  외부 타겟 서버           │
                              │  (Interpark, YES24...)   │
                              │  HEAD / GET Range 요청   │
                              └─────────────────────────┘
```

### 1.2 핵심 렌더링 전략

| 영역 | 방식 | 이유 |
|---|---|---|
| 블로그, 가이드, 약관, 소개 | **SSG** (완전 정적 HTML) | 변경이 없어 빌드 시 미리 생성. 최고 속도 + SEO |
| 메인 페이지 레이아웃/텍스트 | **SSG** | 구조는 정적이므로 미리 생성 |
| 시계 조회 / 알람 컴포넌트 | **CSR** (React Island) | 사용자 인터랙션에 의존, 서버 렌더링 불필요 |
| 트렌딩 순위 | **CSR** (API 폴링) | 실시간 데이터, 5분마다 갱신 |
| 트렌드 분석 페이지 통계 | **CSR** (API 호출) | DB 실시간 쿼리 결과 |
| 관리자 대시보드 | **CSR** | 인증 후 접근, 빌드에서 제외 |

---

## 2. 기술 스택 전체 목록

### 2.1 프론트엔드

| 분류 | 기술 | 버전/방식 | 역할 |
|---|---|---|---|
| 빌드 도구 | **Vite** | ^6.x | 초고속 번들링, HMR, SSG 진입점 |
| UI 프레임워크 | **React** | ^19.x | 컴포넌트 기반 UI |
| SSG 플러그인 | **vite-ssg** | latest | 빌드 시 전 라우트를 정적 HTML로 생성 |
| 언어 | **TypeScript** | ^5.x | 전체 코드 타입 안전성 |
| 라우팅 | **react-router-dom** | ^7.x | `createBrowserRouter` 기반 라우팅 |
| 다국어(i18n) | **react-i18next** | ^15.x | JSON 번역 파일 + 훅 기반 |
| SEO 메타 태그 | **react-helmet-async** | latest | `hreflang`, OG 태그 동적 주입 |
| HTTP 클라이언트 | **ky** 또는 `fetch` | — | API 호출 (경량 fetch wrapper) |
| 상태 관리 | **Zustand** | ^5.x | 알람 상태, 세션 상태 글로벌 관리 |
| 테스트 | **Vitest** | latest | 단위 테스트 |

### 2.2 백엔드 (API)

| 분류 | 기술 | 버전 | 역할 |
|---|---|---|---|
| 런타임 | **Cloudflare Workers** | — | V8 엔진 기반 Edge 서버리스 실행 |
| 웹 프레임워크 | **Hono** | ^4.x | Express 유사 API 프레임워크 (Edge 특화) |
| 언어 | **TypeScript** | ^5.x | |
| 점진적 패키지 관리 | **pnpm workspaces** | — | 모노레포에서 패키지 공유 |

### 2.3 데이터베이스

| 분류 | 기술 | 역할 |
|---|---|---|
| DB 엔진 | **Turso (libSQL)** | SQLite 호환 서버리스 DB, 글로벌 엣지 복제본 |
| DB 클라이언트 | **@libsql/client** | Turso 전용 클라이언트 (HTTP 기반) |
| ORM | **Drizzle ORM** | 기존 스키마 100% 재사용, 드라이버만 교체 |
| ORM CLI | **drizzle-kit** | 스키마 push/generate |

### 2.4 배포 및 인프라

| 분류 | 기술 | 역할 |
|---|---|---|
| 프론트엔드 호스팅 | **Cloudflare Pages** | SSG 정적 파일 CDN 무료 호스팅 |
| 백엔드 호스팅 | **Cloudflare Workers** | API 엣지 실행 (월 10만 요청 무료) |
| 데이터베이스 | **Turso** | 무료 플랜: 500 DB, 10억 Row 읽기/월 |
| CI/CD | **GitHub Actions** | PR 머지 시 자동 빌드 & 배포 |
| DNS / CDN | **Cloudflare** | 전 세계 수백 개 PoP (Point of Presence) |

### 2.5 공유 패키지 (모노레포)

기존 프로젝트의 SSRF 방어 로직, Drizzle 스키마, 타겟 사이트 메타데이터, i18n 번역 데이터 등을 **`packages/shared` 패키지로 추출**하여 프론트엔드와 백엔드가 타입을 공유합니다.

---

## 3. 프로젝트 디렉토리 구조 (모노레포)

```
timeism/                              ← pnpm workspaces 루트
│
├── package.json                      ← 루트 패키지 (workspaces 정의)
├── pnpm-workspace.yaml
├── turbo.json                        ← (선택) Turborepo 설정
│
├── apps/
│   ├── web/                          ← 프론트엔드 (Vite + React + vite-ssg)
│   │   ├── package.json
│   │   ├── vite.config.ts            ← vite-ssg 플러그인 설정
│   │   ├── tsconfig.json
│   │   ├── index.html
│   │   ├── src/
│   │   │   ├── main.tsx              ← CSR 진입점 (브라우저)
│   │   │   ├── main.ssg.tsx          ← SSG 진입점 (빌드 시)
│   │   │   ├── router.tsx            ← react-router-dom 라우트 정의
│   │   │   │
│   │   │   ├── pages/                ← 페이지 컴포넌트 (라우트 단위)
│   │   │   │   ├── home/
│   │   │   │   │   ├── HomePage.tsx          ← 메인 (SSG + CSR Islands)
│   │   │   │   │   ├── ClockIsland.tsx       ← 시간 조회 컴포넌트 (CSR)
│   │   │   │   │   ├── AlarmIsland.tsx       ← 알람 컴포넌트 (CSR)
│   │   │   │   │   └── TrendingIsland.tsx    ← 트렌딩 컴포넌트 (CSR)
│   │   │   │   ├── blog/
│   │   │   │   │   ├── BlogListPage.tsx      ← 블로그 목록 (SSG)
│   │   │   │   │   └── BlogPostPage.tsx      ← 포스트 상세 (SSG)
│   │   │   │   ├── sites/
│   │   │   │   │   └── SitePage.tsx          ← 사이트 전용 페이지 (SSG)
│   │   │   │   ├── trends/
│   │   │   │   │   └── TrendsPage.tsx        ← 트렌드 분석 (SSG+CSR)
│   │   │   │   ├── game/GamePage.tsx
│   │   │   │   ├── guide/GuidePage.tsx
│   │   │   │   ├── about/AboutPage.tsx
│   │   │   │   ├── contact/ContactPage.tsx
│   │   │   │   ├── privacy/PrivacyPage.tsx
│   │   │   │   ├── terms/TermsPage.tsx
│   │   │   │   ├── survey/SurveyPage.tsx
│   │   │   │   ├── alarm-test/AlarmTestPage.tsx
│   │   │   │   └── not-found/NotFoundPage.tsx
│   │   │   │
│   │   │   ├── components/           ← 재사용 UI 컴포넌트
│   │   │   │   ├── layout/
│   │   │   │   │   ├── Header.tsx
│   │   │   │   │   ├── Footer.tsx
│   │   │   │   │   └── LanguageSwitcher.tsx
│   │   │   │   ├── common/
│   │   │   │   │   ├── SeoMeta.tsx           ← react-helmet-async 래퍼
│   │   │   │   │   ├── Breadcrumb.tsx
│   │   │   │   │   ├── CookieConsent.tsx
│   │   │   │   │   └── AdBanner.tsx
│   │   │   │   ├── clock/
│   │   │   │   │   ├── ServerClock.tsx       ← rAF 루프 시계 표시
│   │   │   │   │   └── TimezoneWarning.tsx
│   │   │   │   ├── alarm/
│   │   │   │   │   ├── AlarmControl.tsx
│   │   │   │   │   ├── PreAlarmControl.tsx
│   │   │   │   │   └── AlarmOverlay.tsx      ← 카운트다운 시각 효과
│   │   │   │   ├── comments/
│   │   │   │   │   ├── CommentList.tsx
│   │   │   │   │   └── CommentForm.tsx
│   │   │   │   └── quick-sites/
│   │   │   │       └── QuickSiteButton.tsx
│   │   │   │
│   │   │   ├── hooks/                ← 커스텀 React 훅
│   │   │   │   ├── useServerTime.ts          ← 시간 조회 + rAF 루프
│   │   │   │   ├── useAlarm.ts               ← 2-Phase 알람 로직
│   │   │   │   ├── usePreAlarms.ts           ← 사전 알람
│   │   │   │   ├── useSession.ts             ← 세션 초기화 + 이벤트 전송
│   │   │   │   ├── useTrending.ts            ← 트렌딩 URL 폴링
│   │   │   │   └── useTimezoneWarning.ts     ← 타임존 감지
│   │   │   │
│   │   │   ├── stores/               ← Zustand 전역 상태
│   │   │   │   ├── sessionStore.ts           ← userId, sessionId
│   │   │   │   ├── alarmStore.ts             ← 알람 상태
│   │   │   │   └── settingsStore.ts          ← 표시 설정 (밀리초 등)
│   │   │   │
│   │   │   ├── lib/
│   │   │   │   ├── api-client.ts             ← Hono API 호출 함수들
│   │   │   │   └── url-normalizer.ts         ← URL 정규화
│   │   │   │
│   │   │   └── styles/               ← Vanilla CSS (CSS Modules)
│   │   │       ├── global.css
│   │   │       ├── tokens.css
│   │   │       ├── components/
│   │   │       │   ├── alarm.module.css
│   │   │       │   ├── clock.module.css
│   │   │       │   ├── trending.module.css
│   │   │       │   └── ...
│   │   │       └── pages/
│   │   │           ├── home.module.css
│   │   │           └── blog.module.css
│   │   │
│   │   └── dist/                     ← 빌드 산출물 (SSG HTML + 에셋)
│   │
│   └── admin/                        ← 관리자 대시보드 (별도 SPA)
│       ├── package.json
│       ├── vite.config.ts
│       └── src/
│           ├── main.tsx
│           └── pages/
│               ├── LoginPage.tsx
│               └── DashboardPage.tsx
│
├── packages/
│   ├── shared/                       ← 프론트/백엔드 공유 코드
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── types/
│   │   │   │   ├── api.ts            ← API 요청/응답 타입 정의
│   │   │   │   └── events.ts         ← 이벤트 타입 enum
│   │   │   ├── constants/
│   │   │   │   ├── target-sites.ts   ← 타겟 사이트 메타데이터
│   │   │   │   └── blog-data.ts      ← 블로그 포스트 메타데이터
│   │   │   └── i18n/
│   │   │       └── locales/
│   │   │           ├── en.json
│   │   │           ├── ko.json
│   │   │           ├── jp.json
│   │   │           └── zh-tw.json
│   │   └── tsconfig.json
│   │
│   └── db/                           ← DB 스키마 및 레포지토리 (공유)
│       ├── package.json
│       ├── src/
│       │   ├── schema.ts             ← Drizzle ORM 스키마 (TypeScript)
│       │   ├── client.ts             ← Turso 클라이언트 초기화
│       │   ├── repository.ts         ← users, sessions, events CRUD
│       │   └── comment-repository.ts ← 댓글 CRUD
│       └── drizzle.config.ts
│
└── docs/
    ├── REMAKE_FEATURES.md            ← 리메이크 기능 기획서 (이 파일의 쌍)
    └── REMAKE_ARCHITECTURE.md        ← 리메이크 아키텍처 설계서 (이 파일)
```

---

## 4. 데이터베이스 스키마 (Drizzle ORM — TypeScript)

기존 sqlite 스키마를 **100% 유지**하며, `better-sqlite3` → `@libsql/client`로 드라이버만 교체합니다.

### 4.1 스키마 변경점

```diff
- const { sqliteTable, text, integer, index } = require('drizzle-orm/sqlite-core');
- const Database = require('better-sqlite3');
- const { drizzle } = require('drizzle-orm/better-sqlite3');
+ import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
+ import { createClient } from '@libsql/client';
+ import { drizzle } from 'drizzle-orm/libsql';

- const sqlite = new Database('./data/app.db');
+ const client = createClient({
+   url: process.env.TURSO_DATABASE_URL!,
+   authToken: process.env.TURSO_AUTH_TOKEN!,
+ });
+ export const db = drizzle(client);
```

### 4.2 테이블 정의 (변경 없음)

```typescript
// packages/db/src/schema.ts

export const users = sqliteTable('users', {
  userId:       text('user_id').primaryKey(),
  ipHash:       text('ip_hash'),
  userAgent:    text('user_agent'),
  region:       text('region'),
  deviceType:   text('device_type'),
  firstVisitAt: text('first_visit_at'),
  lastVisitAt:  text('last_visit_at'),
  visitCount:   integer('visit_count').default(1).notNull()
});

export const sessions = sqliteTable('sessions', {
  sessionId: text('session_id').primaryKey(),
  userId:    text('user_id').references(() => users.userId),
  startAt:   text('start_at'),
  endAt:     text('end_at')
});

export const events = sqliteTable('events', {
  eventId:   integer('event_id').primaryKey({ autoIncrement: true }),
  sessionId: text('session_id').references(() => sessions.sessionId),
  eventType: text('event_type'),
  targetUrl: text('target_url'),
  latencyMs: integer('latency_ms'),
  locale:    text('locale').default('en'),
  timestamp: text('timestamp')
});

export const comments = sqliteTable('comments', {
  commentId:   integer('comment_id').primaryKey({ autoIncrement: true }),
  pageId:      text('page_id').notNull(),
  author:      text('author').notNull(),
  content:     text('content').notNull(),
  ipHash:      text('ip_hash').notNull(),
  createdAt:   text('created_at').notNull(),
  isDeleted:   integer('is_deleted').default(0).notNull(),
  reportCount: integer('report_count').default(0).notNull()
});

export const surveyResponses = sqliteTable('survey_responses', {
  responseId:         integer('response_id').primaryKey({ autoIncrement: true }),
  satisfaction:       integer('satisfaction').notNull(),
  usefulFeature:      text('useful_feature').notNull(),
  improvement:        text('improvement'),
  additionalFeedback: text('additional_feedback'),
  ipHash:             text('ip_hash').notNull(),
  createdAt:          text('created_at').notNull()
});
```

---

## 5. API 엔드포인트 명세 (Hono.js)

### 5.1 기본 설정

```typescript
// apps/api/src/index.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { rateLimiter } from 'hono-rate-limiter';
import checkTimeRoute from './routes/check-time';
import sessionRoute from './routes/session';
import eventsRoute from './routes/events';
import trendingRoute from './routes/trending';
import commentsRoute from './routes/comments';
import analyticsRoute from './routes/analytics';

const app = new Hono();

app.use('/api/*', cors({ origin: 'https://timeism.com' }));

export default app;
```

### 5.2 공개 API

| 메서드 | 경로 | Rate Limit | 설명 |
|---|---|---|---|
| `POST` | `/api/check-time` | 10회/분 | 타겟 URL 서버 시간 조회 |
| `POST` | `/api/session-init` | 30회/분 | 세션 초기화 |
| `POST` | `/api/log-event` | 30회/분 | 이벤트 로깅 |
| `GET` | `/api/trending-urls` | 10회/분 | 실시간 트렌딩 URL |
| `GET` | `/api/comments/:pageId` | — | 댓글 조회 |
| `POST` | `/api/comments` | 3회/5분 (IP) | 댓글 작성 |
| `DELETE` | `/api/comments/:commentId` | — | 댓글 삭제 (관리자) |

### 5.3 요청/응답 타입 (TypeScript — shared 패키지)

```typescript
// packages/shared/src/types/api.ts

export interface CheckTimeRequest {
  target_url: string;
}

export interface CheckTimeResponse {
  target_url: string;
  server_time_utc: string;
  server_time_estimated_epoch_ms: number;
  SyncTime_server_time_ms: number;
  rtt_ms?: number; // debug=1 시만 포함
}

export interface SessionInitRequest {
  user_id?: string;
  session_id?: string;
  user_agent?: string;
  region?: string;
  device_type?: 'desktop' | 'mobile' | 'tablet';
}

export interface SessionInitResponse {
  user_id: string;
  session_id: string;
  started_at: string;
}

export interface LogEventRequest {
  session_id: string;
  event_type: string;
  target_url?: string;
  latency_ms?: number;
}

export interface TrendingUrlsResponse {
  locale: string;
  trending: Array<{
    url: string;
    name: string;
    count: number;
    lastChecked: string;
  }>;
  timestamp: string;
}

export interface CommentResponse {
  id: number;
  content: string;
  createdAt: string;
}
```

### 5.4 관리자 API

모든 관리자 API는 `adminAuth` 미들웨어(헤더 또는 쿼리 토큰 검증) 적용.

| 메서드 | 경로 | 설명 |
|---|---|---|
| `GET` | `/api/analytics/users` | 사용자 통계 |
| `GET` | `/api/analytics/events` | 이벤트 통계 |
| `GET` | `/api/analytics/devices` | 기기별 분석 |
| `GET` | `/api/analytics/urls` | URL별 성능 |
| `GET` | `/api/analytics/performance` | 전체 성능 |
| `GET` | `/api/analytics/summary` | 종합 요약 |

---

## 6. 서버 시간 측정 알고리즘 (변경 없음)

`timeFetch.ts`로 TypeScript 이식. 알고리즘 자체는 기존과 동일합니다.

```
measureServerTime(url)
  │
  ├─ [5회 반복] measureServerTimeSingle(url)
  │     ├─ SSRF 검증 (18개 CIDR 블락 + DNS 이중 검증)
  │     ├─ HEAD 요청 → Date 헤더 추출
  │     │    └─ 실패 시 GET Range: bytes=0-0 폴백
  │     └─ computeTimeResult: server_time + (RTT / 2)
  │
  ├─ RTT 오름차순 정렬
  └─ 최솟값(RTT 최소 = 가장 정확) 반환
```

**Cloudflare Workers 환경의 추가 이점**:
- Workers는 글로벌 엣지에서 실행되므로 한국 사용자, 미국 사용자 모두 각자 가장 가까운 PoP에서 타겟 서버로 핑을 보냅니다.
- RTT가 대폭 감소하여 시간 측정 정확도가 향상됩니다.

---

## 7. 프론트엔드 핵심 커스텀 훅

### 7.1 `useServerTime`

```typescript
// apps/web/src/hooks/useServerTime.ts
export function useServerTime() {
  const [serverClockBase, setServerClockBase] = useState<number | null>(null);
  const [serverClockStartPerf, setServerClockStartPerf] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 시간 조회 함수
  const checkTime = async (targetUrl: string) => { ... };

  // requestAnimationFrame 루프 (현재 서버 시각 실시간 계산)
  // current = serverClockBase + (performance.now() - serverClockStartPerf)
  
  return { currentServerTime, checkTime, isLoading, error };
}
```

### 7.2 `useAlarm`

```typescript
// apps/web/src/hooks/useAlarm.ts
export function useAlarm(getServerTime: () => number | null) {
  // Phase 1: setInterval(100ms) — 목표 시각-2초까지
  // Phase 2: setInterval(10ms)  — 마지막 2초, 정밀 타이밍
  // triggerAlarm(): Web Audio API + Notifications API
  
  return { setAlarm, cancelAlarm, alarmState };
}
```

### 7.3 `useSession`

```typescript
// apps/web/src/hooks/useSession.ts
export function useSession() {
  // localStorage['timecheck.session'] 에서 로드
  // POST /api/session-init 서버 동기화
  // sendEvent() 함수 제공
  
  return { sessionState, sendEvent };
}
```

---

## 8. SSG 빌드 전략

### 8.1 vite-ssg 설정

```typescript
// apps/web/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { ViteSSG } from 'vite-ssg';

export default defineConfig({
  plugins: [
    react(),
    ViteSSG({
      // 빌드 시 모든 라우트 크롤링하여 정적 HTML 생성
      criticalCss: true,
    })
  ]
});
```

### 8.2 각 언어별 정적 페이지 수 (빌드 산출물)

| 페이지 | 언어 수 | 예상 HTML 파일 수 |
|---|---|---|
| 메인 | 4 | 4 |
| 가이드/About/Contact/Privacy/Terms | 4 × 5 | 20 |
| 게임 / 트렌드 / 설문 / 알람 테스트 | 4 × 4 | 16 |
| 블로그 목록 | 4 | 4 |
| 블로그 포스트 | 4 × 10 | 40 |
| 사이트 전용 페이지 | 4 × 15 | 60 |
| **총계** | | **약 150개 HTML 파일** |

### 8.3 동적 컴포넌트 처리 (React Island 패턴)

```tsx
// 페이지 컴포넌트 예시
// SSG 빌드 시에는 Suspense fallback이 렌더링됨
// 브라우저에서 hydration 후 실제 컴포넌트가 마운트됨

export default function HomePage() {
  return (
    <Layout>
      {/* SSG: 정적으로 빌드됨 */}
      <HeroSection />
      <QuickSitesSection sites={targetSites} />

      {/* CSR Island: 브라우저에서만 마운트 */}
      <Suspense fallback={<ClockSkeleton />}>
        <ClockIsland />
      </Suspense>

      <Suspense fallback={<TrendingSkeleton />}>
        <TrendingIsland locale={locale} />
      </Suspense>
    </Layout>
  );
}
```

---

## 9. 다국어 전략 (react-i18next + vite-ssg)

### 9.1 라우트 정의

```typescript
// apps/web/src/router.tsx
const LOCALES = ['en', 'ko', 'jp', 'zh-tw'] as const;

export const routes = LOCALES.flatMap(locale => [
  { path: `/${locale}/`,              element: <HomePage /> },
  { path: `/${locale}/guide`,         element: <GuidePage /> },
  { path: `/${locale}/blog`,          element: <BlogListPage /> },
  { path: `/${locale}/blog/:slug`,    element: <BlogPostPage /> },
  { path: `/${locale}/sites/:siteId`, element: <SitePage /> },
  // ... 나머지 페이지
]);
```

### 9.2 번역 파일 구조 (packages/shared에서 공유)

```
packages/shared/src/i18n/locales/
├── en.json     ← 영어 번역
├── ko.json     ← 한국어 번역
├── jp.json     ← 일본어 번역
└── zh-tw.json  ← 중국어 번체 번역
```

---

## 10. Rate Limiting 전략 (Hono)

| Limiter | 경로 | 윈도우 | 최대 | 비고 |
|---|---|---|---|---|
| `checkTimeLimiter` | `POST /api/check-time` | 1분 | 10회 | 4개 언어 에러 메시지 |
| `trendingLimiter` | `GET /api/trending-urls` | 1분 | 10회 | — |
| `sessionInitLimiter` | `POST /api/session-init` | 1분 | 30회 | — |
| `logEventLimiter` | `POST /api/log-event` | 1분 | 30회 | — |
| `commentIpLimiter` | `POST /api/comments` | 5분 | 3회 | IP 해시 기반 |

Cloudflare Workers 자체의 **Cloudflare Rate Limiting** 룰을 추가로 적용하면 DDoS 방어까지 커버 가능합니다.

---

## 11. 환경변수 전체 목록

### 11.1 프론트엔드 (`apps/web/.env`)

| 변수 | 설명 |
|---|---|
| `VITE_API_BASE_URL` | Hono API 기본 URL (예: `https://api.timeism.com`) |
| `VITE_DOMAIN` | 서비스 도메인 (sitemap, OG 태그용) |

### 11.2 백엔드 (`apps/api/.env` / Cloudflare Workers 환경변수)

| 변수 | 기본값 | 설명 |
|---|---|---|
| `TURSO_DATABASE_URL` | — | Turso DB URL (`libsql://...turso.io`) |
| `TURSO_AUTH_TOKEN` | — | Turso 인증 토큰 |
| `ADMIN_TOKEN` | (변경 필수) | 관리자 인증 토큰 |
| `IP_HASH_SALT` | (변경 필수) | IP 해싱 솔트 |
| `CORS_ORIGIN` | `https://timeism.com` | 허용 Origin |

---

## 12. CI/CD 파이프라인 (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
on:
  push:
    branches: [main]

jobs:
  deploy-web:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - run: pnpm install
      - run: pnpm --filter web build      # vite-ssg 정적 빌드
      - uses: cloudflare/pages-action@v1  # Cloudflare Pages 배포
        with:
          apiToken: ${{ secrets.CF_API_TOKEN }}
          directory: apps/web/dist

  deploy-api:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - run: pnpm install
      - run: pnpm --filter api deploy     # wrangler publish
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CF_API_TOKEN }}
```

---

## 13. 기존 대비 개선 사항 요약

| 항목 | 기존 (Express + EJS) | 리메이크 (Vite + Hono + Turso) |
|---|---|---|
| **렌더링** | SSR (매 요청마다 서버 렌더링) | SSG + CSR Island (정적 배포) |
| **서버 비용** | 서버 인스턴스 24시간 유지 필요 | Cloudflare Workers (서버리스, 무료 플랜) |
| **글로벌 성능** | 단일 서버 지역에 종속 | Cloudflare 전 세계 PoP에서 엣지 실행 |
| **DB** | 로컬 파일 SQLite (볼륨 마운트 필요) | Turso (글로벌 엣지 복제, 클라우드) |
| **타입 안전성** | Vanilla JS (런타임 에러 위험) | TypeScript 전면 도입 (빌드 타임 검증) |
| **SEO** | SSR(양호) | SSG(최상, TTFB 0에 수렴) |
| **API 마이그레이션** | N/A | Express → Hono: 문법 90% 동일 |
| **DB 마이그레이션** | N/A | better-sqlite3 → @libsql/client: 드라이버만 교체 |
| **테스트** | 없음 | Vitest 단위 테스트 도입 |
| **배포 트래픽 내성** | 수강신청/티켓팅 시 서버 부하 위험 | Cloudflare Workers 자동 스케일, 무제한 처리 |
