# Timeism — Remake Feature Specification

> Version: Remake v1.0  
> Date: 2026-03-22  
> This remake preserves all existing features while modernizing the tech stack.

---

## 1. Service Overview

### 1.1 Core Purpose

**Timeism (SyncTime)** is a service that queries the current time of a target web server's in real-time, with **millisecond (ms) precision**, based on the HTTP `Date` header.

Users enter any URL and the service sends a request to that server, measures its response time, corrects for half the round-trip time (RTT/2), and returns the **server-accurate current time**.

### 1.2 Problem Statement

| Scenario | Description |
|---|---|
| Ticketing failure | Local PC clock is ahead or behind the server clock at the moment a ticket sale opens (Interpark, YES24, Melon Ticket, etc.) |
| Course registration failure | Mismatch between university system server time and the student's local time |
| Flash sale failure | Missing split-second timing on Coupang, Amazon flash deals |
| Overseas timezone confusion | Unable to determine local time for services like Ticketmaster or StubHub |

### 1.3 Remake Goals

- **Feature parity**: Implement 100% of existing features identically
- **Global edge performance**: Deliver consistent response speeds worldwide via Cloudflare Edge Network
- **Zero server cost**: Serverless architecture to minimize infrastructure expenses
- **Maximum SEO**: Static Site Generation (SSG) for optimal Google search indexing (AdSense monetization)
- **Improved maintainability**: Full TypeScript adoption to catch runtime errors at build time

---

## 2. Full Page Inventory

### 2.1 Static Pages (SSG Build) — HTML fixed at build time

These pages are served immediately from CDN (Cloudflare Pages) with near-zero TTFB.

| Page | URL Pattern | Description |
|---|---|---|
| Guide | `/{locale}/guide` | How to use the service |
| About | `/{locale}/about` | Service introduction |
| Contact | `/{locale}/contact` | Contact form |
| Privacy Policy | `/{locale}/privacy` | Privacy policy |
| Terms of Service | `/{locale}/terms` | Terms and conditions |
| Blog List | `/{locale}/blog` | Blog post listing |
| Blog Post | `/{locale}/blog/:slug` | Individual posts (10 posts) |
| Site-Specific Page | `/{locale}/sites/:siteId` | Individual site guides (15 sites) |
| 404 | Invalid path | Error page |

### 2.2 Dynamic Pages (SSG shell + CSR interaction)

The skeleton (layout, text) is pre-built as SSG, while interactive components (clock, alarm, etc.) mount via CSR in the browser.

| Page | URL Pattern | SSG Elements | CSR Elements |
|---|---|---|---|
| Main | `/{locale}/` | Layout, text, Quick Sites list | Server time query, alarm, trending |
| Game | `/{locale}/game` | Layout, game description | Full game logic |
| Trend Analysis | `/{locale}/trends` | Layout, headers | Stats data (API call) |
| Survey | `/{locale}/survey` | Form layout | Form submission logic |
| Alarm Test | `/{locale}/alarm-test` | Layout | Full alarm functionality |

---

## 3. Core Feature Specifications

### 3.1 Server Time Query

#### Flow

```
User enters URL
    │
    ▼
Client-side URL normalization
(https:// prepended automatically if protocol is missing)
    │
    ▼
POST https://api.timeism.com/check-time
(Hono.js on Cloudflare Workers — executes at the edge closest to the user)
    │
    ▼
SSRF validation → 5 measurements (HEAD → GET Range fallback)
RTT/2 correction → select minimum RTT result
    │
    ▼
Client: receive response + additional client RTT/2 correction
requestAnimationFrame loop for real-time clock display
```

#### Display Format

```
2026-03-22 17:38:37.421 (UTC+9)
Last measured: 17:38:37 · Server UTC header: 2026-03-22 08:38:37 UTC (Calibrated by SyncTime server)
```

#### URL Input Normalization

| Input | Result |
|---|---|
| `google.com` | `https://google.com` |
| `localhost:3000` | `http://localhost:3000` |
| `https://ticket.yes24.com` | Unchanged |

---

### 3.2 Alarm System

#### A. Target Time Alarm

Set an alarm to a specific server-referenced time. Fires with precision.

**2-Phase Monitoring (React `useEffect` based):**

| Phase | Condition | Interval | Purpose |
|---|---|---|---|
| Phase 1 (Coarse) | More than 2 seconds until target | 100ms | Battery / performance protection |
| Phase 2 (Fine) | ≤ 2 seconds until target | 10ms | Precision timing |

**On Alarm Trigger:**

1. Web Audio API: 1200Hz sine wave for 0.8 seconds
2. Notifications API: system notification (if permitted)
3. Log event with `delay_ms` and `accuracy` to Turso DB

**Accuracy Grades:**

| Grade | Criterion |
|---|---|
| `precise` | Error ≤ 10ms |
| `good` | Error ≤ 100ms |
| `acceptable` | Error > 100ms |

#### B. Pre-Alarm

Notify the user N minutes before the target time. Settings are persisted in `localStorage`.

| Option | Trigger Condition |
|---|---|
| 1 minute before | Time remaining: 60–59 seconds |
| 2 minutes before | Time remaining: 120–119 seconds |
| 3 minutes before | Time remaining: 180–179 seconds |

#### C. Auto-Alarm

Fires automatically before each hour and half-hour. No user setup required.

| Time | Action |
|---|---|
| XX:59:50 – XX:59:59 | Screen countdown (10 → 1) |
| XX:59:55 | BBC chime sound (6 short beeps + 1 long beep) |
| XX+1:00:00 | Screen flash effect + clock highlight |
| XX:29:50 – XX:29:59 | Same as above |
| XX:30:00 | Screen flash effect |

---

### 3.3 Quick Sites

One-click access to major site time queries. **Included as static data in the SSG build.**

| Site | URL | Category | Region |
|---|---|---|---|
| Interpark | `ticket.interpark.com` | Ticketing | 🇰🇷 |
| Melon Ticket | `ticket.melon.com` | Ticketing | 🇰🇷 |
| YES24 | `ticket.yes24.com` | Ticketing | 🇰🇷 |
| Coupang | `coupang.com` | Shopping | 🇰🇷 |
| Ticketmaster | `ticketmaster.com` | Ticketing | 🇺🇸 |
| StubHub | `stubhub.com` | Ticketing | 🇺🇸 |
| Amazon | `amazon.com` | Shopping | 🇺🇸 |
| eBay | `ebay.com` | Shopping | 🇺🇸 |
| Eventbrite | `eventbrite.com` | Ticketing | 🇺🇸 |
| KKTIX | `kktix.com` | Ticketing | 🇹🇼 |
| Ticketmaster TW | `ticketmaster.com.tw` | Ticketing | 🇹🇼 |
| Eslite Tickets | `eslitecorp.com` | Ticketing | 🇹🇼 |
| Shopee TW | `shopee.tw` | Shopping | 🇹🇼 |
| momo Shopping | `momoshop.com.tw` | Shopping | 🇹🇼 |
| University Registration | (example URL) | Registration | 🌐 |

---

### 3.4 Real-Time Trending Sites

Displays the top 5 URLs currently being queried by other users in real-time.

- **Data basis**: `url_check` events within the last 1 hour (Turso DB query)
- **Locale separation**: Independent trending per language via `locale` parameter
- **Auto-refresh**: React `useEffect` polling every 5 minutes
- **Click interaction**: Clicking an item automatically triggers a time query for that URL

---

### 3.5 Timezone Warning

Displays a warning banner when the user's local timezone differs from the queried server's timezone.

- Compares server UTC offset vs. user's local UTC offset
- Displays calculated time difference
- Warning messages in **4 languages**

---

### 3.6 Trend Analysis Page (`/{locale}/trends`)

| Section | Data |
|---|---|
| Top 10 Popular URLs | Sorted by all-time cumulative query count |
| Hourly Breakdown | Event count per hour 0–23 (last 24 hours) |
| Today's Stats | Today's total query count, unique URL count, all-time total |

---

### 3.7 Blog (`/{locale}/blog`)

10 posts, fully built as static HTML via SSG. Per-post comments integration.

| # | Slug | Title |
|---|---|---|
| 1 | `server-time-guide` | Server Time Guide: Winning by 0.1 Seconds |
| 2 | `ticketing-tips` | Top 5 Strategies for Ticketing Success |
| 3 | `ntp-vs-http` | NTP vs HTTP Time: The Complete Guide |
| 4 | `ticketing-korea` | Complete Guide to Korean Ticketing Sites |
| 5 | `course-registration` | Complete University Course Registration Guide |
| 6 | `time-sync-deep-dive` | Time Synchronization Technology: Into the World of Milliseconds |
| 7 | `ticketing-japan` | Complete Guide to Japanese Ticketing Sites |
| 8 | `ticketing-global` | Complete Guide to Global Ticketing Platforms |
| 9 | `mobile-vs-pc` | Mobile vs PC Ticketing: Which is Better? |
| 10 | `network-optimization` | Network Optimization: The Hidden Key to Ticketing Success |

---

### 3.8 Comment System

| Item | Details |
|---|---|
| Author | Fully anonymous (`anonymous`) |
| Content length | Minimum 2 characters, maximum 200 characters |
| IP rate limit | Max 3 posts per 5 minutes from the same IP |
| Spam prevention | Honeypot field + IP hash rate limiting |
| Auto-cleanup | Keep the latest 10 per page; hard-delete excess |
| Soft delete | Admin deletion sets `is_deleted = 1` |

---

### 3.9 Admin Dashboard (`/admin`)

View full service statistics after token authentication.

| Section | API | Data |
|---|---|---|
| User stats | `GET /analytics/users` | Total users, region count, revisit rate |
| Event stats | `GET /analytics/events` | Count by type, avg latency |
| Device breakdown | `GET /analytics/devices` | desktop/mobile/tablet ratio |
| URL performance | `GET /analytics/urls` | Queries per URL, avg RTT |
| Overall performance | `GET /analytics/performance` | Total events, avg latency, slow events |
| Summary | `GET /analytics/summary` | Combined overview of all above |

---

### 3.10 Internationalization (i18n)

**4 languages**, fully separated by URL path.

| Locale | Language | URL |
|---|---|---|
| `en` | English (default) | `/en/...` |
| `ko` | Korean | `/ko/...` |
| `jp` | Japanese | `/jp/...` |
| `zh-tw` | Traditional Chinese | `/zh-tw/...` |

**Detection priority:**

1. URL path segment (`/ko/`, `/en/`, etc.)
2. Query parameter (`?lang=ko`)
3. `Accept-Language` HTTP header
4. Default: `en`

Each locale generates a **separate static HTML file** during the vite-ssg build.  
`hreflang` tags are injected per-page via React Helmet (or `react-helmet-async`).

---

### 3.11 Session & Event Tracking

| Event Type | Trigger | Payload |
|---|---|---|
| `view_time` | Page load | Page load time, FCP, FP |
| `click_button` | Successful time query | target_url, latency_ms |
| `check_time_error` | Time query failure | target_url, error_type |
| `network_error` | Network error | error_type, error_message |
| `set_alarm` | Alarm set | mode, target_time |
| `alarm_triggered` | Alarm fired | delay_ms, accuracy |
| `alarm_cancelled` | Alarm cancelled | — |
| `pre_alarm_triggered` | Pre-alarm fired | minutes_before |

---

### 3.12 Security

| Feature | Implementation |
|---|---|
| SSRF defense | 18 CIDR blocklist + dual DNS resolution check |
| Rate limiting | Hono middleware + Cloudflare Rate Limiting |
| IP anonymization | SHA-256 hash with `IP_HASH_SALT:ip` |
| Admin auth | Environment variable token-based |
| Cache control | `no-store` header on time query responses |
| Honeypot | Hidden field for bot detection (comments) |

---

### 3.13 Other Info Pages

| Page | URL | Description |
|---|---|---|
| Guide | `/{locale}/guide` | How to use the service |
| About | `/{locale}/about` | Service introduction |
| Contact | `/{locale}/contact` | Contact form |
| Privacy Policy | `/{locale}/privacy` | Privacy policy |
| Terms of Service | `/{locale}/terms` | Terms and conditions |
| Game | `/{locale}/game` | Timing practice game |
| Alarm Test | `/{locale}/alarm-test` | Standalone alarm test page |
| 404 | Invalid path | Locale-aware friendly error page |

---

## 4. SEO & Monetization

- `hreflang` tags: injected per page via React Helmet
- `sitemap.xml`: auto-generated at build time via vite-ssg plugin
- `robots.txt`: Disallow `/api/`, `/admin/`
- OG image: static `og-image.png`
- Google AdSense: header / sidebar / footer banners (`ad-banners.css`)
- PWA manifest: `site.webmanifest`

---

## 5. New Features Planned for Remake

| Item | Description |
|---|---|
| Survey DB storage | Implement actual Turso DB save on POST `/survey` |
| Comment report API | Implement report endpoint using `report_count` field |
| JP/ZH-TW site pages | Full implementation of `/jp/sites/:id`, `/zh-tw/sites/:id` |
| Full TypeScript | Type-safe API payloads, DB schema inference throughout |
| Test suite | Unit tests with Vitest |
