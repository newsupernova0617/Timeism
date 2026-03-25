# Timeism — Remake Architecture Specification

> Version: Remake v1.0  
> Date: 2026-03-22  
> Tech Stack: Vite + React + vite-ssg | Hono (Cloudflare Workers) | Turso (libSQL) | Drizzle ORM

---

## 1. Architecture Overview

### 1.1 System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     User Browser (Worldwide)                     │
└──────────┬──────────────────────────────┬───────────────────────┘
           │                              │
           │  Static asset request        │  API request
           ▼                              ▼
┌──────────────────────┐    ┌─────────────────────────────┐
│  Cloudflare Pages    │    │   Cloudflare Workers (Edge) │
│  (Global CDN)        │    │   Hono.js                   │
│                      │    │                             │
│  /en/                │    │  POST /check-time           │
│  /ko/                │    │  POST /session-init         │
│  /jp/                │    │  POST /log-event            │
│  /zh-tw/             │    │  GET  /trending-urls        │
│  /en/blog/...        │    │  GET  /comments/:pageId     │
│  /en/sites/...       │    │  POST /comments             │
│  (All static HTML)   │    │  GET  /analytics/*          │
└──────────────────────┘    └──────────────┬──────────────┘
                                            │
                                            ▼
                              ┌─────────────────────────┐
                              │  Turso (libSQL / SQLite) │
                              │  — Global edge replicas  │
                              │  users, sessions,        │
                              │  events, comments,       │
                              │  survey_responses        │
                              └─────────────────────────┘
                                            │
                                            ▼
                              ┌─────────────────────────┐
                              │  Target External Server  │
                              │  (Interpark, YES24...)   │
                              │  HEAD / GET Range req.   │
                              └─────────────────────────┘
```

### 1.2 Rendering Strategy

| Area | Strategy | Reason |
|---|---|---|
| Blog, guide, terms, about | **SSG** (fully static HTML) | Content never changes; pre-built for max speed + SEO |
| Main page layout/text | **SSG** | Structure is static; pre-build for instant paint |
| Clock query / alarm component | **CSR** (React Island) | Depends on user interaction; server rendering unnecessary |
| Trending sites | **CSR** (API polling) | Real-time data, refreshed every 5 minutes |
| Trend analysis page stats | **CSR** (API call) | Real-time DB query results |
| Admin dashboard | **CSR** | Accessed post-auth; excluded from build |

---

## 2. Full Tech Stack

### 2.1 Frontend

| Category | Package | Version | Role |
|---|---|---|---|
| Build tool | **Vite** | ^6.x | Ultra-fast bundling, HMR, SSG entry point |
| UI framework | **React** | ^19.x | Component-based UI |
| SSG plugin | **vite-ssg** | latest | Generates static HTML for all routes at build time |
| Language | **TypeScript** | ^5.x | End-to-end type safety |
| Router | **react-router-dom** | ^7.x | `createBrowserRouter`-based routing |
| i18n | **react-i18next** | ^15.x | JSON translation files + hook API |
| SEO meta tags | **react-helmet-async** | latest | `hreflang`, OG tag injection per page |
| HTTP client | **ky** or native `fetch` | — | API calls (lightweight fetch wrapper) |
| State management | **Zustand** | ^5.x | Global state for alarm, session |
| Testing | **Vitest** | latest | Unit testing |

### 2.2 Backend (API)

| Category | Package | Version | Role |
|---|---|---|---|
| Runtime | **Cloudflare Workers** | — | V8-engine-based edge serverless execution |
| Web framework | **Hono** | ^4.x | Express-like API framework (edge-optimized) |
| Language | **TypeScript** | ^5.x | |
| Package manager | **pnpm workspaces** | — | Package sharing in monorepo |

### 2.3 Database

| Category | Package | Role |
|---|---|---|
| DB engine | **Turso (libSQL)** | SQLite-compatible serverless DB with global edge replicas |
| DB client | **@libsql/client** | Turso-specific HTTP-based client |
| ORM | **Drizzle ORM** | Reuse existing schema 100%; swap driver only |
| ORM CLI | **drizzle-kit** | Schema push / generate |

### 2.4 Deployment & Infrastructure

| Category | Service | Role |
|---|---|---|
| Frontend hosting | **Cloudflare Pages** | SSG static files on global CDN (free tier) |
| Backend hosting | **Cloudflare Workers** | Edge API execution (100k req/day free) |
| Database | **Turso** | Free tier: 10B row reads/month, 500 DBs |
| CI/CD | **GitHub Actions** | Auto build & deploy on merge to main |
| DNS / CDN | **Cloudflare** | Hundreds of global PoPs (Points of Presence) |

### 2.5 Shared Packages (Monorepo)

SSRF defense logic, Drizzle schema, target site metadata, and i18n translation data are extracted into a **`packages/shared` package** so both frontend and backend share types.

---

## 3. Project Directory Structure (Monorepo)

```
timeism/                              ← pnpm workspaces root
│
├── package.json                      ← Root package (workspaces definition)
├── pnpm-workspace.yaml
├── turbo.json                        ← (Optional) Turborepo config
│
├── apps/
│   ├── web/                          ← Frontend (Vite + React + vite-ssg)
│   │   ├── package.json
│   │   ├── vite.config.ts            ← vite-ssg plugin config
│   │   ├── tsconfig.json
│   │   ├── index.html
│   │   ├── src/
│   │   │   ├── main.tsx              ← CSR entry point (browser)
│   │   │   ├── main.ssg.tsx          ← SSG entry point (build time)
│   │   │   ├── router.tsx            ← Route definitions (react-router-dom)
│   │   │   │
│   │   │   ├── pages/                ← Page components (one per route)
│   │   │   │   ├── home/
│   │   │   │   │   ├── HomePage.tsx          ← Main (SSG shell + CSR Islands)
│   │   │   │   │   ├── ClockIsland.tsx       ← Time query component (CSR)
│   │   │   │   │   ├── AlarmIsland.tsx       ← Alarm component (CSR)
│   │   │   │   │   └── TrendingIsland.tsx    ← Trending component (CSR)
│   │   │   │   ├── blog/
│   │   │   │   │   ├── BlogListPage.tsx      ← Blog listing (SSG)
│   │   │   │   │   └── BlogPostPage.tsx      ← Post detail (SSG)
│   │   │   │   ├── sites/
│   │   │   │   │   └── SitePage.tsx          ← Site-specific page (SSG)
│   │   │   │   ├── trends/
│   │   │   │   │   └── TrendsPage.tsx        ← Trend analysis (SSG+CSR)
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
│   │   │   ├── components/           ← Reusable UI components
│   │   │   │   ├── layout/
│   │   │   │   │   ├── Header.tsx
│   │   │   │   │   ├── Footer.tsx
│   │   │   │   │   └── LanguageSwitcher.tsx
│   │   │   │   ├── common/
│   │   │   │   │   ├── SeoMeta.tsx           ← react-helmet-async wrapper
│   │   │   │   │   ├── Breadcrumb.tsx
│   │   │   │   │   ├── CookieConsent.tsx
│   │   │   │   │   └── AdBanner.tsx
│   │   │   │   ├── clock/
│   │   │   │   │   ├── ServerClock.tsx       ← rAF loop clock display
│   │   │   │   │   └── TimezoneWarning.tsx
│   │   │   │   ├── alarm/
│   │   │   │   │   ├── AlarmControl.tsx
│   │   │   │   │   ├── PreAlarmControl.tsx
│   │   │   │   │   └── AlarmOverlay.tsx      ← Countdown visual effect
│   │   │   │   ├── comments/
│   │   │   │   │   ├── CommentList.tsx
│   │   │   │   │   └── CommentForm.tsx
│   │   │   │   └── quick-sites/
│   │   │   │       └── QuickSiteButton.tsx
│   │   │   │
│   │   │   ├── hooks/                ← Custom React hooks
│   │   │   │   ├── useServerTime.ts          ← Time query + rAF loop
│   │   │   │   ├── useAlarm.ts               ← 2-Phase alarm logic
│   │   │   │   ├── usePreAlarms.ts           ← Pre-alarm (N min before)
│   │   │   │   ├── useSession.ts             ← Session init + event dispatch
│   │   │   │   ├── useTrending.ts            ← Trending URL polling
│   │   │   │   └── useTimezoneWarning.ts     ← Timezone detection
│   │   │   │
│   │   │   ├── stores/               ← Zustand global state stores
│   │   │   │   ├── sessionStore.ts           ← userId, sessionId
│   │   │   │   ├── alarmStore.ts             ← Alarm state
│   │   │   │   └── settingsStore.ts          ← Display settings (millis, etc.)
│   │   │   │
│   │   │   ├── lib/
│   │   │   │   ├── api-client.ts             ← Hono API call functions
│   │   │   │   └── url-normalizer.ts         ← URL normalization
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
│   │   └── dist/                     ← Build output (SSG HTML + assets)
│   │
│   └── admin/                        ← Admin dashboard (separate SPA)
│       ├── package.json
│       ├── vite.config.ts
│       └── src/
│           ├── main.tsx
│           └── pages/
│               ├── LoginPage.tsx
│               └── DashboardPage.tsx
│
├── packages/
│   ├── shared/                       ← Code shared between frontend and backend
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── types/
│   │   │   │   ├── api.ts            ← API request/response type definitions
│   │   │   │   └── events.ts         ← Event type enums
│   │   │   ├── constants/
│   │   │   │   ├── target-sites.ts   ← Target site metadata
│   │   │   │   └── blog-data.ts      ← Blog post metadata
│   │   │   └── i18n/
│   │   │       └── locales/
│   │   │           ├── en.json
│   │   │           ├── ko.json
│   │   │           ├── jp.json
│   │   │           └── zh-tw.json
│   │   └── tsconfig.json
│   │
│   └── db/                           ← DB schema and repositories (shared)
│       ├── package.json
│       ├── src/
│       │   ├── schema.ts             ← Drizzle ORM schema (TypeScript)
│       │   ├── client.ts             ← Turso client initialization
│       │   ├── repository.ts         ← users, sessions, events CRUD
│       │   └── comment-repository.ts ← Comments CRUD
│       └── drizzle.config.ts
│
└── docs/
    ├── REMAKE_FEATURES.md            ← Korean feature spec
    ├── REMAKE_FEATURES_EN.md         ← English feature spec (this file's pair)
    ├── REMAKE_ARCHITECTURE.md        ← Korean architecture spec
    └── REMAKE_ARCHITECTURE_EN.md     ← English architecture spec (this file)
```

---

## 4. Database Schema (Drizzle ORM — TypeScript)

The existing SQLite schema is preserved **100%**. Only the driver is swapped from `better-sqlite3` to `@libsql/client`.

### 4.1 Schema Migration Diff

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

### 4.2 Table Definitions (unchanged)

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

## 5. API Endpoint Specification (Hono.js)

### 5.1 Base Setup

```typescript
// apps/api/src/index.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { rateLimiter } from 'hono-rate-limiter';

const app = new Hono();
app.use('/api/*', cors({ origin: 'https://timeism.com' }));

export default app;
```

### 5.2 Public API

| Method | Path | Rate Limit | Description |
|---|---|---|---|
| `POST` | `/api/check-time` | 10/min | Query target URL server time |
| `POST` | `/api/session-init` | 30/min | Initialize session |
| `POST` | `/api/log-event` | 30/min | Log user event |
| `GET` | `/api/trending-urls` | 10/min | Real-time trending URLs |
| `GET` | `/api/comments/:pageId` | — | Fetch comments |
| `POST` | `/api/comments` | 3/5min (IP) | Post a comment |
| `DELETE` | `/api/comments/:commentId` | — | Delete comment (admin) |

### 5.3 TypeScript Shared Types

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
  rtt_ms?: number; // only when debug=1
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
```

### 5.4 Admin API

All admin APIs pass through the `adminAuth` middleware (header or query token validation).

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/analytics/users` | User statistics |
| `GET` | `/api/analytics/events` | Event statistics |
| `GET` | `/api/analytics/devices` | Device breakdown |
| `GET` | `/api/analytics/urls` | URL performance |
| `GET` | `/api/analytics/performance` | Overall performance |
| `GET` | `/api/analytics/summary` | Combined overview |

---

## 6. Server Time Measurement Algorithm (Unchanged)

Ported to `timeFetch.ts` in TypeScript. Algorithm is identical to the existing implementation.

```
measureServerTime(url)
  │
  ├─ [5 iterations] measureServerTimeSingle(url)
  │     ├─ SSRF validation (18 CIDR blocks + dual DNS check)
  │     ├─ HEAD request → extract Date header
  │     │    └─ Fallback to GET Range: bytes=0-0 if HEAD fails
  │     └─ computeTimeResult: server_time + (RTT / 2)
  │
  ├─ Sort results by RTT ascending
  └─ Return minimum RTT result (lowest RTT = most accurate)
```

**Additional benefit with Cloudflare Workers**:  
Workers run at global edge PoPs, so a US user querying Ticketmaster and a Korean user querying Interpark both get measurements from the edge server closest to each target — dramatically reducing RTT and improving measurement accuracy.

---

## 7. Key Frontend Custom Hooks

### 7.1 `useServerTime`

```typescript
export function useServerTime() {
  const [serverClockBase, setServerClockBase] = useState<number | null>(null);
  const [serverClockStartPerf, setServerClockStartPerf] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // checkTime(): POST /api/check-time + client RTT/2 correction

  // requestAnimationFrame loop:
  // current = serverClockBase + (performance.now() - serverClockStartPerf)

  return { currentServerTime, checkTime, isLoading, error };
}
```

### 7.2 `useAlarm`

```typescript
export function useAlarm(getServerTime: () => number | null) {
  // Phase 1: setInterval(100ms) — until 2 seconds before target
  // Phase 2: setInterval(10ms)  — last 2 seconds, precision timing
  // triggerAlarm(): Web Audio API + Notifications API

  return { setAlarm, cancelAlarm, alarmState };
}
```

### 7.3 `useSession`

```typescript
export function useSession() {
  // Load from localStorage['timecheck.session']
  // POST /api/session-init to sync with server
  // Expose sendEvent() for logging user events

  return { sessionState, sendEvent };
}
```

---

## 8. SSG Build Strategy

### 8.1 vite-ssg Configuration

```typescript
// apps/web/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { ViteSSG } from 'vite-ssg';

export default defineConfig({
  plugins: [
    react(),
    ViteSSG({ criticalCss: true })
  ]
});
```

### 8.2 Expected Static HTML Output at Build Time

| Page | Languages | Est. HTML Files |
|---|---|---|
| Main | 4 | 4 |
| Guide / About / Contact / Privacy / Terms | 4 × 5 | 20 |
| Game / Trends / Survey / Alarm Test | 4 × 4 | 16 |
| Blog list | 4 | 4 |
| Blog posts | 4 × 10 | 40 |
| Site-specific pages | 4 × 15 | 60 |
| **Total** | | **~150 HTML files** |

### 8.3 Dynamic Component Handling (React Island Pattern)

```tsx
export default function HomePage() {
  return (
    <Layout>
      {/* SSG: rendered as static HTML at build time */}
      <HeroSection />
      <QuickSitesSection sites={targetSites} />

      {/* CSR Island: only mounts in the browser after hydration */}
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

## 9. i18n Strategy (react-i18next + vite-ssg)

### 9.1 Route Definition

```typescript
// apps/web/src/router.tsx
const LOCALES = ['en', 'ko', 'jp', 'zh-tw'] as const;

export const routes = LOCALES.flatMap(locale => [
  { path: `/${locale}/`,              element: <HomePage /> },
  { path: `/${locale}/guide`,         element: <GuidePage /> },
  { path: `/${locale}/blog`,          element: <BlogListPage /> },
  { path: `/${locale}/blog/:slug`,    element: <BlogPostPage /> },
  { path: `/${locale}/sites/:siteId`, element: <SitePage /> },
  // ... remaining pages
]);
```

### 9.2 Translation Files (shared via packages/shared)

```
packages/shared/src/i18n/locales/
├── en.json
├── ko.json
├── jp.json
└── zh-tw.json
```

---

## 10. Rate Limiting Strategy (Hono)

| Limiter | Path | Window | Max | Notes |
|---|---|---|---|---|
| `checkTimeLimiter` | `POST /api/check-time` | 1 min | 10 | 4-language error messages |
| `trendingLimiter` | `GET /api/trending-urls` | 1 min | 10 | — |
| `sessionInitLimiter` | `POST /api/session-init` | 1 min | 30 | — |
| `logEventLimiter` | `POST /api/log-event` | 1 min | 30 | — |
| `commentIpLimiter` | `POST /api/comments` | 5 min | 3 | IP hash based |

Supplementary **Cloudflare Rate Limiting** rules at the network layer provide additional DDoS protection.

---

## 11. Environment Variables

### 11.1 Frontend (`apps/web/.env`)

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | Hono API base URL (e.g., `https://api.timeism.com`) |
| `VITE_DOMAIN` | Service domain (for sitemap, OG tags) |

### 11.2 Backend (`apps/api` / Cloudflare Workers env)

| Variable | Default | Description |
|---|---|---|
| `TURSO_DATABASE_URL` | — | Turso DB URL (`libsql://...turso.io`) |
| `TURSO_AUTH_TOKEN` | — | Turso authentication token |
| `ADMIN_TOKEN` | **(must change)** | Admin authentication token |
| `IP_HASH_SALT` | **(must change)** | Salt for IP hashing |
| `CORS_ORIGIN` | `https://timeism.com` | Allowed CORS origin |

---

## 12. CI/CD Pipeline (GitHub Actions)

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
      - run: pnpm --filter web build       # vite-ssg static build
      - uses: cloudflare/pages-action@v1   # Deploy to Cloudflare Pages
        with:
          apiToken: ${{ secrets.CF_API_TOKEN }}
          directory: apps/web/dist

  deploy-api:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - run: pnpm install
      - run: pnpm --filter api deploy      # wrangler publish to Workers
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CF_API_TOKEN }}
```

---

## 13. Improvements Over Existing Implementation

| Aspect | Current (Express + EJS) | Remake (Vite + Hono + Turso) |
|---|---|---|
| **Rendering** | SSR (server renders on every request) | SSG + CSR Island (static deploy) |
| **Server cost** | Dedicated instance running 24/7 | Cloudflare Workers (serverless, free tier) |
| **Global performance** | Tied to single server region | Edge execution at Cloudflare PoPs worldwide |
| **Database** | Local SQLite file (requires volume mount) | Turso (global edge replicas, cloud-native) |
| **Type safety** | Vanilla JS (runtime error risk) | TypeScript end-to-end (build-time validation) |
| **SEO** | SSR (good) | SSG (best; TTFB approaches 0) |
| **API migration** | N/A | Express → Hono: 90% identical syntax |
| **DB migration** | N/A | better-sqlite3 → @libsql/client: driver swap only |
| **Testing** | None | Vitest unit tests |
| **Traffic resilience** | Risk of overload during peak ticketing/registration | Cloudflare Workers auto-scales; handles unlimited concurrent requests |
