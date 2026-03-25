# SEO Score Improvement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Execute a phased 6-week SEO improvement program to increase Google search ranking for SyncTime homepage from baseline to top rankings.

**Architecture:** Three sequential phases: (1) Technical fixes & baseline establishment, (2) Keyword-driven content optimization, (3) Advanced strategy & monitoring setup.

**Tech Stack:** Google Search Console, Lighthouse/PageSpeed Insights CLI, W3C HTML validator, Schema.org markup, EJS templating, Express.js.

---

## File Structure Overview

### Files to Modify
- **`views/site-page.ejs`** - Fix duplicate main tags, header nesting issues
- **`public/sitemap.xml`** - Update lastmod dates, verify completeness
- **`public/robots.txt`** - Verify configuration
- **`views/index.ejs`** - Optimize meta tags and content for primary keywords
- **`views/partials/meta.ejs`** - Ensure consistent meta tag structure
- **`views/blog/posts/*.ejs`** (10 files) - Add Article schema, optimize for keywords, internal links

### Files to Create
- **`docs/seo/phase1-baseline-metrics.md`** - Record baseline Lighthouse, PageSpeed, Core Web Vitals scores
- **`docs/seo/phase2-keyword-research.md`** - Document keyword research findings and optimization roadmap
- **`docs/seo/phase2-content-strategy.md`** - Content optimization checklist and internal linking map
- **`docs/seo/phase3-seo-report-template.md`** - Monthly SEO monitoring report template

---

## PHASE 1: Technical SEO Foundation (Week 1-2)

### Task 1: Fix site-page.ejs HTML Structure (CRITICAL)

**Files:**
- Modify: `views/site-page.ejs`

- [ ] **Step 1: Understand current structure**

Read the file to identify the exact issues:
- Lines 45-56: Two `<main>` tags
- Line 54: Header include nested incorrectly inside `<p>` tag
- Lines 48-75 and 59-74: Duplicate clock-block sections

- [ ] **Step 2: Remove the second `<main class="layout">` wrapper**

Find and delete:
```html
<main class="layout">
  <%# Existing content %>
    <section class="clock-panel" aria-live="polite">
      <div class="clock-block single" id="clockBlock">
```

And its closing tag (around line 126). Keep only the first `<main class="content-page">` element.

- [ ] **Step 3: Move header include to proper location**

Move this line:
```html
<%- include('partials/header') %>
```

From inside the `<p id="serverTime">` element (line 54) to **before** the `<main>` tag (after the `<header>` closing tag).

**Correct placement (after line 43, before line 45):**
```html
</header>

<%- include('partials/header') %>

<main class="content-page">
```

- [ ] **Step 4: Remove duplicate clock-block content**

Keep only ONE clock-block section. Delete the second instance (lines 59-74) and merge unique content if needed. The first instance (lines 48-75) should remain.

- [ ] **Step 5: Validate HTML structure**

```bash
cd /home/yj437/coding/Timeism
# Validate locally (if you have validator installed)
# OR use online: https://validator.w3.org/ and paste file contents
# Expected: Zero errors reported
```

- [ ] **Step 6: Test page rendering**

```bash
npm start  # or npm run dev
# Open http://localhost:3000/en/sites/google (or any site page)
# Verify: Page renders correctly, no console errors, clock displays
```

- [ ] **Step 7: Commit**

```bash
git add views/site-page.ejs
git commit -m "fix: Remove duplicate main tags and fix header nesting in site-page.ejs"
```

---

### Task 2: Update sitemap.xml with Current Content

**Files:**
- Modify: `public/sitemap.xml`

- [ ] **Step 1: Update lastmod dates to current date**

Replace all `<lastmod>2026-01-10</lastmod>` with `<lastmod>2026-03-25</lastmod>`

Command:
```bash
sed -i 's/<lastmod>2026-01-10/<lastmod>2026-03-25/g' public/sitemap.xml
```

- [ ] **Step 2: Verify all major pages are included**

Check that sitemap contains:
- ✅ Homepage (all 4 language variants: ko, en, jp, zh-tw)
- ✅ Guide pages (/guide, /trends, /about, /contact, /privacy, /terms)
- ✅ Blog posts (should have 10+ `/blog/posts/` entries)
- ✅ Site pages (/sites/google, /sites/naver, etc. if applicable)

Add missing entries following the existing XML structure:
```xml
<url>
  <loc>https://synctime.keero.site/en/sites/YOUR_SITE_ID</loc>
  <lastmod>2026-03-25</lastmod>
  <changefreq>weekly</changefreq>
  <priority>0.8</priority>
</url>
```

- [ ] **Step 3: Verify XML validity**

```bash
# Install xmllint if needed: apt-get install libxml2-utils
xmllint --noout public/sitemap.xml
# Expected: Document is valid
```

- [ ] **Step 4: Test sitemap accessibility**

```bash
npm start
# In browser: http://localhost:3000/sitemap.xml
# Expected: XML renders properly, valid structure
```

- [ ] **Step 5: Commit**

```bash
git add public/sitemap.xml
git commit -m "chore: Update sitemap.xml lastmod dates and verify content completeness"
```

---

### Task 3: Establish Baseline Performance Metrics

**Files:**
- Create: `docs/seo/phase1-baseline-metrics.md`

- [ ] **Step 1: Get homepage URL ready**

Use: `https://synctime.keero.site/en` (English homepage)

- [ ] **Step 2: Run Lighthouse audit (Desktop)**

```bash
# Install: npm install -g lighthouse
# Run:
lighthouse https://synctime.keero.site/en --chrome-flags="--headless" --output-path=./lighthouse-desktop.json
# OR visit: https://developers.google.com/web/tools/lighthouse
```

Record these metrics:
- Overall score (target: ≥65 now, ≥80 by end of Phase 1)
- Performance score
- Accessibility score
- Best Practices score
- SEO score
- Core Web Vitals: LCP, FID, CLS

- [ ] **Step 3: Run Lighthouse audit (Mobile)**

```bash
lighthouse https://synctime.keero.site/en --chrome-flags="--headless" --emulated-form-factor=mobile --output-path=./lighthouse-mobile.json
```

Record same metrics for mobile.

- [ ] **Step 4: Check Google PageSpeed Insights**

Visit: https://pagespeed.web.dev/

Test: `https://synctime.keero.site/en`

Record:
- Mobile score (target: ≥60 now, ≥70 by Phase 3)
- Desktop score
- Core Web Vitals status

- [ ] **Step 5: Verify Google Search Console access**

Visit: https://search.google.com/search-console

Verify:
- ✅ Site is registered
- ✅ Can view Search Performance data
- ✅ Can view Core Web Vitals report
- ✅ Can view coverage report

- [ ] **Step 6: Document all baseline metrics**

Create `docs/seo/phase1-baseline-metrics.md` with:

```markdown
# Phase 1 Baseline Metrics (2026-03-25)

## Lighthouse (Desktop)
- Overall Score: XX/100
- Performance: XX/100
- Accessibility: XX/100
- Best Practices: XX/100
- SEO: XX/100

## Lighthouse (Mobile)
- Overall Score: XX/100
- Performance: XX/100
- [same as desktop]

## Core Web Vitals (from PageSpeed)
- LCP: XXms (target: ≤2500ms)
- FID: XXms (target: ≤100ms)
- CLS: X.XX (target: ≤0.1)

## PageSpeed Insights
- Mobile: XX/100
- Desktop: XX/100

## Google Search Console
- Impressions: XX
- Clicks: XX
- Average position: XX
- Coverage: XX indexed pages

## Target Improvements (by end of Week 2)
- Lighthouse Desktop: current→80
- Lighthouse Mobile: current→75
- LCP: current→2500ms
- CLS: current→0.1
```

- [ ] **Step 7: Commit**

```bash
git add docs/seo/phase1-baseline-metrics.md
git commit -m "docs: Record Phase 1 baseline SEO metrics (Lighthouse, PageSpeed, CWV)"
```

---

### Task 4: Optimize Core Web Vitals

**Files:**
- Modify: `views/index.ejs`, `views/partials/meta.ejs`, CSS files

- [ ] **Step 1: Optimize images (Largest Contentful Paint)**

Identify largest images in index.ejs:
```bash
# Check what images are used
grep -n "<img\|<picture" views/index.ejs | head -20
```

For each `<img>` tag:
- Add `loading="lazy"` for below-the-fold images
- Optimize file size (compress with ImageOptim, TinyPNG, etc.)
- Consider WebP format with PNG fallback

Example:
```html
<!-- Before -->
<img src="/images/banner.png" alt="description" />

<!-- After -->
<img src="/images/banner.png" alt="description" loading="lazy" />
```

- [ ] **Step 2: Reduce Cumulative Layout Shift (CLS)**

Add `width` and `height` attributes to all `<img>` tags to prevent reflow:

```html
<img src="/path/to/image.png" alt="description" width="1200" height="630" loading="lazy" />
```

If ads are present, add placeholder dimensions:
```html
<div style="width: 300px; height: 250px;">
  <!-- Ad inserted here -->
</div>
```

- [ ] **Step 3: Minimize render-blocking JavaScript**

In `views/partials/meta.ejs`, add `async` or `defer` to scripts:

```html
<!-- Before -->
<script src="https://www.googletagmanager.com/gtag/js?id=G-J8YD8M558V"></script>

<!-- After -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-J8YD8M558V"></script>
```

- [ ] **Step 4: Enable GZIP compression (if not already enabled)**

In `app.js`, verify compression middleware is active:
```javascript
const compression = require('compression');
app.use(compression());  // Should be present
```

If missing, add it before routes.

- [ ] **Step 5: Minimize CSS/JS files (optional optimization)**

Check if CSS/JS files are minified. If not, consider enabling minification in response headers or serving from CDN.

- [ ] **Step 6: Test Core Web Vitals improvements**

```bash
# Re-run PageSpeed Insights: https://pagespeed.web.dev/
# Expected: LCP, FID, CLS improvements from baseline
```

- [ ] **Step 7: Commit**

```bash
git add views/index.ejs views/partials/meta.ejs
git commit -m "perf: Optimize Core Web Vitals (lazy loading, remove layout shifts)"
```

---

### Task 5: Complete Meta Tag Audit

**Files:**
- Check: `views/index.ejs`, `views/site-page.ejs`, `views/partials/meta.ejs`, `views/blog/posts/*.ejs`, `views/guide.ejs`, `views/about.ejs`, `views/privacy.ejs`, `views/terms.ejs`

- [ ] **Step 1: Create meta tag checklist**

For EACH page file, verify:

```markdown
## Meta Tag Checklist

### Page: views/index.ejs
- [ ] `<title>` present (50-60 chars) - _______________
- [ ] `<meta name="description">` present (150-160 chars) - _______________
- [ ] `<meta name="keywords">` present - _______________
- [ ] `<link rel="canonical">` correct - _______________
- [ ] `<meta property="og:type">` present - _______________
- [ ] `<meta property="og:title">` present - _______________
- [ ] `<meta property="og:description">` present - _______________
- [ ] `<meta property="og:image">` present - _______________
- [ ] No duplicate meta tags - YES / NO
- [ ] Viewport meta tag present - YES / NO
```

- [ ] **Step 2: Audit index.ejs (homepage)**

Verify current tags in `views/index.ejs` lines 4-27:
- Title should include primary keyword "server time checker"
- Description should be 150-160 chars, include keyword
- Canonical should be correct for home
- og:image should reference valid image

- [ ] **Step 3: Audit site-page.ejs (individual site pages)**

Check lines 4-32 in `views/site-page.ejs`:
- Title uses `<%= site.name %>` variable (good)
- Description is relevant to each site
- Canonical uses site ID correctly

- [ ] **Step 4: Audit blog post templates**

Sample check on one blog post (e.g., `views/blog/posts/server-time-guide.ejs`):
- Must have unique title
- Must have unique description
- Must have canonical link
- Must have og:image

If any blog posts are missing these, add them.

- [ ] **Step 5: Remove duplicate meta tags**

Check `views/partials/meta.ejs` for duplicates with page-specific meta.ejs in `<head>`.

Example: If both meta.ejs and index.ejs define `<meta name="theme-color">`, remove duplicate.

- [ ] **Step 6: Validate with Google Search Console**

Submit meta tag information to Google Search Console:
1. Visit https://search.google.com/search-console
2. Go to "Enhancements" → "Rich Results"
3. Verify no errors for title, description, canonical

- [ ] **Step 7: Commit**

```bash
git add views/index.ejs views/site-page.ejs views/partials/meta.ejs
git commit -m "fix: Audit and ensure consistent meta tags across all pages"
```

---

### Task 6: Verify Phase 1 Completion

**Files:**
- Reference: `docs/seo/phase1-baseline-metrics.md`

- [ ] **Step 1: Re-run Lighthouse audit**

```bash
lighthouse https://synctime.keero.site/en --chrome-flags="--headless" --output-path=./lighthouse-final-phase1.json
```

Record scores and compare to baseline.

- [ ] **Step 2: Verify W3C HTML validation**

Visit: https://validator.w3.org/

Test all major pages:
- [ ] https://synctime.keero.site/en (homepage)
- [ ] https://synctime.keero.site/en/sites/google (sample site page after fix)
- [ ] https://synctime.keero.site/en/blog (blog index)

**Expected:** Zero errors on all pages

- [ ] **Step 3: Check Google PageSpeed Insights**

https://pagespeed.web.dev/

Test: https://synctime.keero.site/en

**Expected:** Scores improved from baseline

- [ ] **Step 4: Update Phase 1 baseline doc with results**

Add final section to `docs/seo/phase1-baseline-metrics.md`:

```markdown
## Phase 1 Final Results (End of Week 2)

### Lighthouse (Desktop) - AFTER
- Overall Score: XX/100 (improvement: +XX)
- Performance: XX/100
- [same metrics]

### Improvements Achieved
- HTML validation: ✅ Zero errors
- Core Web Vitals: ✅ All metrics improved
- Meta tags: ✅ Audit completed across all pages
- Images optimized: ✅ Lazy loading added
```

- [ ] **Step 5: Final commit for Phase 1**

```bash
git add docs/seo/phase1-baseline-metrics.md
git commit -m "docs: Phase 1 complete - baseline metrics established and optimizations verified"
```

---

## PHASE 2: Content SEO & Keyword Optimization (Week 3-4)

### Task 7: Conduct Keyword Research

**Files:**
- Create: `docs/seo/phase2-keyword-research.md`

- [ ] **Step 1: Access Google Search Console data**

Visit: https://search.google.com/search-console

Go to **Search Performance** and download:
- Current search queries you're already ranking for
- Average position
- Click-through rate (CTR)
- Impressions

- [ ] **Step 2: Identify primary keywords**

List keywords by category:

```markdown
## Primary Keywords (Homepage Focus)

### Informational
- "server time checker"
- "check server time"
- "server time sync"

### Transactional (Ticketing)
- "ticketing tips"
- "concert ticket guide"
- "server time ticketing"

### Branded
- "SyncTime"
- "synctime server checker"
```

- [ ] **Step 3: Research keyword difficulty**

Use free tools:
- Google Search Console (what you rank for)
- Google Trends (search volume trends)
- Answer the Public (related questions)
- Google autocomplete (related searches)

For each keyword, note:
- Search volume (high/medium/low)
- Competition (high/medium/low)
- Your current ranking position (if any)

- [ ] **Step 4: Identify content gaps**

Look at Google search results for your primary keywords:
- What content do competitors rank for?
- What topics are mentioned frequently?
- What questions are answered in top results?
- What content types rank best (blog, guide, list)?

Example: If searching "server time checker", what questions appear in "People also ask"?

- [ ] **Step 5: Find quick-win keywords**

Identify 3-5 keywords where:
- Low to medium difficulty
- Some search volume (at least 10+ searches/month)
- Not highly competitive

These should be targeted in blog posts with new content.

- [ ] **Step 6: Document findings**

Create `docs/seo/phase2-keyword-research.md`:

```markdown
# Phase 2 Keyword Research (2026-03-25)

## Primary Keywords (Homepage)
- Keyword: "server time checker"
  - Search volume: XXX/month
  - Current position: #XX
  - Target: #1-3

## Secondary Keywords (Blog)
- Keyword: "how to sync server time"
  - Volume: XX/month
  - Difficulty: Medium
  - Target page: server-time-guide.ejs

[... more keywords ...]

## Content Gaps Found
- Missing: "NTP vs HTTP time sync comparison"
- Missing: "Ticketing server time guide for [region]"
- Missing: "Top 10 server time mistakes"

## Quick-Win Keywords (for new content)
- "server time check tool" (low diff, ~50 searches/month)
- "concert ticketing time tips" (medium diff, ~100 searches/month)
```

- [ ] **Step 7: Commit**

```bash
git add docs/seo/phase2-keyword-research.md
git commit -m "docs: Complete keyword research and content gap analysis"
```

---

### Task 8: Optimize Homepage Content for Primary Keyword

**Files:**
- Modify: `views/index.ejs` (lines 1-100 approximately)

- [ ] **Step 1: Review current homepage structure**

Check:
- Lines 6-10: Title and meta description
- Lines 29-57: Above-the-fold content (first section visible)
- Lines 88-130: Form section

- [ ] **Step 2: Optimize `<title>` tag**

Current approach: Usually generic. Rewrite to include primary keyword naturally.

**Before:**
```html
<title><%= translations.meta.title %></title>
```

**After (example):**
```html
<title>
  <%= translations.meta.title %> - Server Time Checker & NTP Sync Guide <%= locale === 'ko' ? '| 서버시간 확인' : '' %>
</title>
```

Ensure:
- 50-60 characters
- Includes primary keyword: "server time checker"
- Includes secondary keyword: "NTP sync"
- Ends with brand name if space allows

- [ ] **Step 3: Optimize meta description**

Current might be generic. Rewrite to:
- Include primary keyword naturally
- Include value proposition
- Include CTA
- Be 150-160 characters

**Example:**
```html
<meta name="description" content="Free server time checker tool. Verify NTP synchronization, check latency, and sync your system clock with accurate server time. Perfect for ticketing and time-sensitive tasks." />
```

- [ ] **Step 4: Enhance H1 and intro paragraph**

In the first section of content (around lines 89-95), ensure:
- **H1 contains primary keyword**: "Server Time Checker & NTP Synchronization"
- **First paragraph (50-100 words):** Explains what tool does, uses target keywords naturally
- **Value proposition clear:** Why user should use this tool

Example:
```html
<h1>Check Server Time & Sync Your Clock with NTP Guide</h1>
<p>Our free server time checker helps you verify network time protocol (NTP) synchronization instantly. Perfect for ticketing, streaming, and time-sensitive online activities. No installation needed - just enter a URL.</p>
```

- [ ] **Step 5: Add internal links to top blog posts**

After the form section, add "Related Resources" section:

```html
<section class="related-resources">
  <h2>Learn More About Server Time</h2>
  <ul>
    <li><a href="/<%= locale %>/blog/posts/server-time-guide">Complete Server Time Synchronization Guide</a></li>
    <li><a href="/<%= locale %>/blog/posts/ntp-vs-http">NTP vs HTTP: Which Time Sync Method is Better?</a></li>
    <li><a href="/<%= locale %>/blog/posts/ticketing-tips">Ticketing Tips: Master Server Time for Concert Purchases</a></li>
  </ul>
</section>
```

- [ ] **Step 6: Test homepage changes**

```bash
npm start
# Visit: http://localhost:3000/en
# Verify:
# - Title displays correctly in browser tab
# - Meta description visible in browser inspector
# - Content flows naturally
# - Internal links work
# - No console errors
```

- [ ] **Step 7: Commit**

```bash
git add views/index.ejs
git commit -m "feat: Optimize homepage content for primary keywords and add internal links"
```

---

### Task 9: Optimize Blog Posts (Schema Markup + Keywords + Internal Links)

**Files:**
- Modify: `views/blog/posts/*.ejs` (all 10 blog files)

**Note:** Each blog post should get similar treatment. This task covers the pattern; apply to all 10 files.

- [ ] **Step 1: Select first blog post to optimize**

Example: `views/blog/posts/server-time-guide.ejs`

- [ ] **Step 2: Add Article schema markup**

At the top of the `<head>` section (after title/meta, before closing `</head>`), add:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "<%= article.title %>",
  "description": "<%= article.description %>",
  "image": "<%= domain %>/og-image.png",
  "datePublished": "<%= article.publishedDate %>",
  "dateModified": "<%= article.modifiedDate %>",
  "author": {
    "@type": "Person",
    "name": "SyncTime Team"
  },
  "publisher": {
    "@type": "Organization",
    "name": "SyncTime",
    "url": "<%= domain %>"
  }
}
</script>
```

**Note:** Ensure your blog posts pass `article.title`, `article.description`, `article.publishedDate`, `article.modifiedDate` from the rendering context.

- [ ] **Step 3: Optimize article title and meta description**

Ensure:
- Title includes target keyword for this article (from keyword research)
- Meta description is unique, 150-160 chars, includes keyword
- Matches keyword research findings for this article

Example for "server-time-guide.ejs":
```html
<title>Complete Server Time Synchronization Guide | Check & Sync NTP</title>
<meta name="description" content="Learn how to synchronize server time using NTP. Step-by-step guide for troubleshooting sync issues, checking latency, and optimizing time accuracy for ticketing and online activities." />
```

- [ ] **Step 4: Add internal links within article**

Scan the article body for opportunities to link to:
- Other blog posts (related topics)
- Homepage (primary CTA)
- Other site pages (contextual)

Example:
```html
<!-- In article body -->
<p>
  When synchronizing time with NTP, you should understand the difference between
  <a href="/<%= locale %>/blog/posts/ntp-vs-http">NTP and HTTP time sync methods</a>.
</p>
```

Add 3-5 internal links per article, naturally placed in relevant paragraphs.

- [ ] **Step 5: Add "Related Articles" section at end**

After article body, before comments, add:

```html
<section class="related-articles">
  <h3>Related Articles</h3>
  <ul>
    <li><a href="/<%= locale %>/blog/posts/ntp-vs-http">NTP vs HTTP Time Sync Comparison</a></li>
    <li><a href="/<%= locale %>/blog/posts/network-optimization">Network Optimization for Accurate Time</a></li>
    <li><a href="/<%= locale %>/blog/posts/ticketing-tips">Using Server Time Checker for Ticketing Success</a></li>
  </ul>
</section>
```

- [ ] **Step 6: Test first blog post**

```bash
npm start
# Visit: http://localhost:3000/en/blog/posts/server-time-guide
# Verify:
# - Schema markup validates at https://schema.org/validator (paste HTML)
# - Title and meta description display
# - Internal links work and don't have 404s
# - Related articles section displays
# - No console errors
```

Validate schema:
```bash
# Copy the schema markup from page source and paste into:
https://schema.org/validator
# Expected: Valid markup, no errors
```

- [ ] **Step 7: Repeat for all 10 blog posts**

Apply same pattern to remaining blog posts:
- `ticketing-tips.ejs`
- `ticketing-korea.ejs`
- `ticketing-japan.ejs`
- `ticketing-global.ejs`
- `time-sync-deep-dive.ejs`
- `ntp-vs-http.ejs`
- `network-optimization.ejs`
- `mobile-vs-pc.ejs`
- `course-registration.ejs`

Each gets:
- Article schema markup
- Optimized title/description
- 3-5 internal links
- Related articles section

- [ ] **Step 8: Final validation**

```bash
# Test all blog posts load without errors
for post in views/blog/posts/*.ejs; do
  echo "Checking $post..."
  grep -l "@type.*Article" "$post" || echo "  Missing Article schema!"
done
```

- [ ] **Step 9: Commit all blog post changes**

```bash
git add views/blog/posts/
git commit -m "feat: Add Article schema, optimize keywords, and internal linking to all blog posts"
```

---

### Task 10: Implement BreadcrumbList Schema

**Files:**
- Modify: `views/partials/breadcrumb.ejs` or create new breadcrumb section in layouts

- [ ] **Step 1: Check if breadcrumb partial exists**

```bash
ls -la views/partials/breadcrumb.ejs
# If exists, examine current structure
# If not exists, this might be a new feature to add
```

- [ ] **Step 2: Create or update breadcrumb schema**

Add breadcrumb schema markup in page layouts where applicable:

**For homepage:**
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "<%= domain %>/<%= locale %>"
    }
  ]
}
</script>
```

**For blog posts:**
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "<%= domain %>/<%= locale %>"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "Blog",
      "item": "<%= domain %>/<%= locale %>/blog"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "<%= article.title %>",
      "item": "<%= domain %>/<%= locale %>/blog/posts/<%= article.slug %>"
    }
  ]
}
</script>
```

- [ ] **Step 3: Add to relevant pages**

Add breadcrumb schema to:
- [ ] `views/blog/index.ejs`
- [ ] All `views/blog/posts/*.ejs` files
- [ ] `views/guide.ejs` (if applicable)

- [ ] **Step 4: Validate breadcrumb schema**

```bash
# For each page with breadcrumb schema:
# 1. Visit page in browser
# 2. Copy page source
# 3. Paste into https://schema.org/validator
# Expected: BreadcrumbList validates with no errors
```

- [ ] **Step 5: Commit**

```bash
git add views/blog/ views/partials/
git commit -m "feat: Add BreadcrumbList schema markup to blog and guide pages"
```

---

### Task 11: Document Content Strategy

**Files:**
- Create: `docs/seo/phase2-content-strategy.md`

- [ ] **Step 1: Map content clusters**

Based on blog posts, create clusters:

```markdown
# Content Clusters

## Ticketing Cluster
- Hub: `/blog/posts/ticketing-tips` (most comprehensive)
- Related:
  - `/blog/posts/ticketing-korea` (regional specific)
  - `/blog/posts/ticketing-japan` (regional specific)
  - `/blog/posts/ticketing-global` (broad guide)

## Time Sync Cluster
- Hub: `/blog/posts/server-time-guide`
- Related:
  - `/blog/posts/time-sync-deep-dive` (technical)
  - `/blog/posts/ntp-vs-http` (comparison)
  - `/blog/posts/network-optimization` (optimization)

## Usage Cluster
- Hub: `/blog/posts/course-registration` (timing for registrations)
- Related:
  - `/blog/posts/mobile-vs-pc` (device differences)
```

- [ ] **Step 2: Document internal linking strategy**

For each cluster, specify:
- Hub page (pillar content)
- Related articles
- Anchor text for links (use target keywords)

Example:
```markdown
## Ticketing Cluster Links

### From ticketing-tips to others:
- "concert ticketing in Korea" → `/ticketing-korea`
- "Japanese ticket purchase guide" → `/ticketing-japan`
- "global event ticketing" → `/ticketing-global`

### From regional pages back to hub:
- "ticketing tips for [region]" → `/ticketing-tips`
```

- [ ] **Step 3: Document meta optimization results**

Record what was optimized:
```markdown
## Meta Tag Optimization Results

### Homepage
- Title: "Server Time Checker & NTP Sync Guide | SyncTime"
- Description: "Free server time checker..."
- Target keywords: "server time checker, NTP sync"

### Blog Posts Optimized
- Total: 10 posts
- Schema added: Article schema (100%)
- Internal links added: 3-5 per post (100%)
- Related articles section: Added to all (100%)
```

- [ ] **Step 4: Commit**

```bash
git add docs/seo/phase2-content-strategy.md
git commit -m "docs: Document content clustering and internal linking strategy"
```

---

## PHASE 3: Advanced SEO Strategy & Refinement (Week 5-6)

### Task 12: Implement Internal Linking Strategy

**Files:**
- Modify: `views/index.ejs`, `views/blog/posts/*.ejs`, relevant layout files

- [ ] **Step 1: Review content cluster map from Task 11**

Reference: `docs/seo/phase2-content-strategy.md`

- [ ] **Step 2: Implement cluster hub pages**

For each hub (e.g., ticketing-tips.ejs), after the article body, add:

```html
<section class="cluster-links">
  <h3><%= locale === 'ko' ? '이 주제의 다른 글' : 'More on This Topic' %></h3>
  <ul>
    <li>
      <a href="/<%= locale %>/blog/posts/ticketing-korea">
        <%= locale === 'ko' ? '한국 콘서트 티켓팅 가이드' : 'Korean Concert Ticketing Guide' %>
      </a>
    </li>
    <li>
      <a href="/<%= locale %>/blog/posts/ticketing-japan">
        <%= locale === 'ko' ? '일본 예매 팁' : 'Japanese Ticketing Tips' %>
      </a>
    </li>
    <li>
      <a href="/<%= locale %>/blog/posts/ticketing-global">
        <%= locale === 'ko' ? '전세계 예매 가이드' : 'Global Ticketing Guide' %>
      </a>
    </li>
  </ul>
</section>
```

- [ ] **Step 3: Add backward links from satellite pages**

In `ticketing-korea.ejs`, after article body, add link back to hub:

```html
<p>
  <%= locale === 'ko' ?
    '<a href="/' + locale + '/blog/posts/ticketing-tips">전체 티켓팅 팁 가이드로 돌아가기</a>를 참고하세요.' :
    'See our complete <a href="/' + locale + '/blog/posts/ticketing-tips">ticketing tips guide</a> for more strategies.'
  %>
</p>
```

- [ ] **Step 4: Link from homepage to cluster hubs**

In `views/index.ejs`, update the "Related Resources" section to prioritize cluster hubs:

```html
<section class="related-resources">
  <h2><%= locale === 'ko' ? '추천 글' : 'Popular Guides' %></h2>
  <ul>
    <!-- Hub pages first -->
    <li><a href="/<%= locale %>/blog/posts/ticketing-tips">Ticketing Tips Hub</a></li>
    <li><a href="/<%= locale %>/blog/posts/server-time-guide">Server Time Hub</a></li>
    <!-- Then secondary articles -->
    <li><a href="/<%= locale %>/blog/posts/ntp-vs-http">NTP vs HTTP Comparison</a></li>
  </ul>
</section>
```

- [ ] **Step 5: Optimize anchor text**

Audit all internal links - ensure anchor text:
- Uses target keywords (avoid generic "click here")
- Is descriptive
- Matches link destination context

**Bad:** `<a href="/blog/posts/server-time-guide">Learn more</a>`
**Good:** `<a href="/blog/posts/server-time-guide">Complete Server Time Synchronization Guide</a>`

- [ ] **Step 6: Test link structure**

```bash
npm start
# Manually test:
# 1. Visit homepage, click internal links
# 2. Verify no 404 errors
# 3. Check that related articles links work
# 4. Ensure cluster links form a connected network
```

Use browser dev tools to check for broken links:
```bash
# Install broken-link-checker (optional)
npm install -g broken-link-checker
# OR manually test critical paths
```

- [ ] **Step 7: Verify no crawl loops**

Check that internal links form a sensible hierarchy, not circular:

```
Homepage → Blog Hub → Related Article → Back to Hub → Back to Homepage
```

NOT: `Page A → Page B → Page C → Page A` (circular)

- [ ] **Step 8: Commit**

```bash
git add views/index.ejs views/blog/
git commit -m "feat: Implement strategic internal linking between content clusters"
```

---

### Task 13: Set Up SEO Monitoring & Analytics

**Files:**
- Create: `docs/seo/phase3-seo-report-template.md`
- Reference: Google Search Console, Google Analytics

- [ ] **Step 1: Set up Google Search Console monitoring**

Visit: https://search.google.com/search-console

Set up alerts for:
- New crawl errors (critical)
- Indexing issues
- Core Web Vitals degradation

- [ ] **Step 2: Configure Google Analytics goals**

Visit: https://analytics.google.com

Create conversion goals:
- [ ] Form submission (primary conversion)
- [ ] 3+ minutes on site (engagement)
- [ ] Visit to blog posts (content engagement)
- [ ] Click to external resource (knowledge transfer)

- [ ] **Step 3: Create monthly SEO report template**

Create `docs/seo/phase3-seo-report-template.md`:

```markdown
# Monthly SEO Report - [Month/Year]

## Metrics Comparison (Month-over-Month)

### Google Search Console
- Impressions: XXX → YYY (change: +/- %)
- Clicks: XXX → YYY
- CTR: X.X% → Y.Y%
- Average position: X.X → Y.Y

### Lighthouse Score
- Desktop: XX → YY (+/- points)
- Mobile: XX → YY

### Organic Traffic (Google Analytics)
- Sessions: XXX → YYY
- Page views: XXX → YYY
- Bounce rate: X.X% → Y.Y%
- Avg session duration: XXs → YYs

### Keyword Rankings
- Keywords in top 10: X → Y
- Keywords in top 20: X → Y
- Average position change: -X positions

## Top Performing Pages
1. Page: [URL] - Impressions: XXX, Clicks: YYY, CTR: Z.Z%
2. Page: [URL]
3. Page: [URL]

## Issues Found
- [ ] Crawl errors (if any)
- [ ] Core Web Vitals issues
- [ ] Indexing problems
- [ ] Mobile usability issues

## Actions Taken This Month
- [ ] [Action 1]
- [ ] [Action 2]

## Next Month Priorities
- [ ] [Priority 1]
- [ ] [Priority 2]

---

**Report prepared:** [Date]
**Next report due:** [Date + 1 month]
```

- [ ] **Step 4: Set up ranking tracker**

Choose tool (free options):
- Google Search Console (manual tracking)
- Rank Tracker CLI if available
- Spreadsheet-based tracking

Create tracking sheet for top 10 target keywords:
```
Keyword | Current Position | Previous Month | Change | Target
"server time checker" | #8 | #12 | +4 | #3
"NTP sync guide" | #15 | N/A | New | #5
...
```

- [ ] **Step 5: Create monthly monitoring checklist**

```bash
# Last day of each month, run:
1. Lighthouse audit on homepage
2. PageSpeed Insights check
3. Google Search Console Performance report
4. Google Analytics report for organic traffic
5. Check for new crawl errors
6. Update keyword ranking tracker
7. Document findings in monthly SEO report
```

- [ ] **Step 6: Commit template**

```bash
git add docs/seo/phase3-seo-report-template.md
git commit -m "docs: Create SEO monitoring template and reporting structure"
```

---

### Task 14: Establish Link Building Foundation

**Files:**
- Create: `docs/seo/link-building-opportunities.md`

- [ ] **Step 1: Audit existing backlinks**

Check Google Search Console:
- Links report (if available)
- Referring domains
- Top linked pages

- [ ] **Step 2: Identify broken backlinks**

Look for:
- 404 errors in Google Search Console
- Pages that used to rank but now don't
- Missing content that was previously linked

If found, create new content to replace or redirect.

- [ ] **Step 3: Identify link building opportunities**

Research:
- [ ] What types of websites link to competitors?
- [ ] Are there resource pages or lists we could be in?
- [ ] Are there guest posting opportunities?
- [ ] Are there broken links on relevant sites?

Example opportunities for SyncTime:
- Tech blogs covering "server synchronization"
- Ticketing platforms mentioning "time accuracy"
- Educational sites about NTP
- Dev communities discussing network timing

- [ ] **Step 4: Create linkable content**

Ensure your site has content worth linking to:
- [ ] Comprehensive guides (server-time-guide.ejs exists)
- [ ] Original research or data (consider adding benchmarks)
- [ ] Helpful tools (time checker is the tool)
- [ ] Unique perspectives

- [ ] **Step 5: Identify high-authority pages to strengthen**

Pages that should get internal links (authority boost):
- [ ] Homepage (primary)
- [ ] Server time guide (hub page)
- [ ] Ticketing tips hub

Ensure these get 5-10 internal links from other pages.

- [ ] **Step 6: Document link building strategy**

Create `docs/seo/link-building-opportunities.md`:

```markdown
# Link Building Opportunities & Strategy

## Current Backlink Profile
- Referring domains: XX
- Total backlinks: XXX
- Top linked page: [page]

## Broken Link Opportunities
- [List any broken links found]

## Guest Posting Targets
1. [Blog A] - Contact: [email]
   - Topics: Server time, NTP
   - Audience: Developers
   - Link opportunity: Author bio

2. [Blog B]

## Resource Page Opportunities
- [Resource list URL] - Topics related to [your content]

## Content to Link To (Authority Pages)
1. Homepage - Target: 10+ internal links
2. Server Time Guide - Target: 8+ internal links
3. Ticketing Tips Hub - Target: 6+ internal links

## Link Building Action Plan
- [ ] Reach out to 5 guest posting targets (Month 1)
- [ ] Fix 3 broken links (Month 1)
- [ ] Build 2 new pieces of linkable content (Month 2)
- [ ] Implement internal linking from weak to strong pages (ongoing)
```

- [ ] **Step 7: Commit**

```bash
git add docs/seo/link-building-opportunities.md
git commit -m "docs: Create link building strategy and opportunities list"
```

---

### Task 15: Final Phase 3 Verification

**Files:**
- Reference: All SEO documentation created

- [ ] **Step 1: Run final Lighthouse audit**

```bash
lighthouse https://synctime.keero.site/en --chrome-flags="--headless" --output-path=./lighthouse-final-phase3.json
```

**Target (from baseline):**
- Desktop score: ≥80 (from baseline ≥65)
- Mobile score: ≥75 (from baseline)
- SEO score: ≥90
- Core Web Vitals: All green

- [ ] **Step 2: Check Google Search Console progress**

Compare current metrics to Phase 1 baseline:
- Impressions: Should increase 10-20%
- Clicks: Should increase 15-30%
- Average position: Should improve (lower number)

- [ ] **Step 3: Verify all schema markup is valid**

Test top pages with Google Rich Results:
- [ ] Homepage
- [ ] 2-3 blog posts
- [ ] Site pages

All should validate with no errors.

- [ ] **Step 4: Confirm internal linking structure**

Spot check:
- [ ] Homepage links to 3-5 hub pages
- [ ] Each hub has 3+ related articles linked
- [ ] No broken links in internal navigation
- [ ] No circular redirects

- [ ] **Step 5: Verify monitoring is active**

Checklist:
- [ ] Google Search Console email alerts configured
- [ ] Google Analytics goals set up
- [ ] Keyword ranking tracker active
- [ ] Monthly reporting template ready

- [ ] **Step 6: Create final Phase 3 summary**

Add to `docs/seo/phase1-baseline-metrics.md` (or new summary doc):

```markdown
# SEO Improvement Program - Final Results

## Timeline Completed
- Phase 1 (Week 1-2): Technical fixes and baseline ✅
- Phase 2 (Week 3-4): Content optimization ✅
- Phase 3 (Week 5-6): Strategy and monitoring ✅

## Improvements Achieved

### Lighthouse Scores
- Desktop: [Baseline] → [Final] (+[X] points)
- Mobile: [Baseline] → [Final] (+[X] points)

### Search Performance (Month 1 of monitoring)
- Impressions: +X%
- Clicks: +X%
- Average position: [Baseline] → [Final]

### Technical SEO
- W3C validation: ✅ Zero errors
- Schema markup: ✅ Article, BreadcrumbList implemented
- Core Web Vitals: ✅ All metrics optimized

### Content SEO
- Keywords researched: 20+
- Blog posts optimized: 10/10
- Internal links implemented: 50+
- Content clusters mapped: 3 clusters

### Monitoring
- Google Search Console alerts: Active
- Monthly reporting: Established
- Keyword tracking: Active

## Ongoing Actions (Post-Phase 3)
- Monitor rankings monthly
- Update content quarterly
- Build 1-2 linkable assets per quarter
- Test new content for ranking impact

## Success Criteria Met
- [ ] Homepage ranking improved
- [ ] Organic traffic increased
- [ ] Core Web Vitals all green
- [ ] Internal linking structure optimized
- [ ] Monitoring and reporting system in place
```

- [ ] **Step 7: Final commit for Phase 3**

```bash
git add docs/seo/
git commit -m "docs: Phase 3 complete - advanced SEO strategy and monitoring established"
```

- [ ] **Step 8: Create summary for next quarter**

Plan next steps:
- Q2 Focus: Continue monitoring, build 1-2 guest posts, refresh top content
- Q3 Focus: Expand content clusters, explore new keyword opportunities
- Q4 Focus: Analyze year-over-year progress, plan 2027 strategy

---

## Success Criteria Checklist

**Phase 1 Completion:**
- [ ] site-page.ejs passes W3C validation
- [ ] Lighthouse score ≥80 (desktop)
- [ ] Meta tags audited across all pages
- [ ] Sitemap updated and verified

**Phase 2 Completion:**
- [ ] 20+ keywords researched and documented
- [ ] Homepage optimized for primary keywords
- [ ] All 10 blog posts have Article schema
- [ ] 50+ internal links implemented across site

**Phase 3 Completion:**
- [ ] Internal linking strategy fully deployed
- [ ] Google Search Console monitoring active
- [ ] Monthly SEO report template ready
- [ ] Link building foundation documented
- [ ] Overall Lighthouse score ≥80
- [ ] Organic traffic showing improvement trend

---

## Rollback Plan

If issues occur during implementation:

1. **HTML validation fails:** Revert site-page.ejs to last working version in git
2. **Core Web Vitals worsen:** Check image optimization, revert CSS changes that slow page
3. **Internal links break:** Check URL paths match actual routes, test before committing
4. **Schema validation fails:** Revalidate using schema.org/validator, check variable bindings

Use git to revert:
```bash
git revert [commit-hash]
# OR
git reset --hard [previous-commit]
```

---

**Plan Status:** Ready for implementation

---

## Implementation Model Notes

This plan is structured for **Subagent-Driven Development**:
- Each task is independent and can be reviewed separately
- Tasks follow TDD principles where applicable (verify before implementing)
- Two-stage review: spec compliance, then code quality
- Fresh subagent per task with focused scope

**Estimated timeline:** 6 weeks (realistic with solid execution)

