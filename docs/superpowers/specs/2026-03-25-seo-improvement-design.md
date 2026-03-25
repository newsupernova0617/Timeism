# SEO Score Improvement Plan

> **For agentic workers:** Use superpowers:writing-plans to create the implementation plan for this design.

**Goal:** Systematically improve Google search ranking for the SyncTime homepage and increase organic traffic through phased technical, content, and strategic SEO improvements.

**Architecture:** Three-phase phased approach starting with technical fixes and baseline establishment, followed by keyword-driven content optimization, and concluding with advanced SEO strategy refinement.

**Tech Stack:** Google Search Console, Lighthouse/PageSpeed Insights, Schema.org structured data, Express.js routing optimization, EJS templating, SQLite database for analytics

---

## Current SEO State

### Strengths
- ✅ Well-structured multi-language support (ko, en, ja, zh-tw) with proper hreflang tags
- ✅ Comprehensive robots.txt and sitemap.xml
- ✅ Meta tags properly configured (title, description, keywords, canonical)
- ✅ Open Graph tags for social sharing
- ✅ Schema.org JSON-LD structured data on homepage
- ✅ Google Analytics and AdSense integration
- ✅ Proper use of semantic HTML (header, main, section, nav)
- ✅ Mobile-responsive design

### Issues Found
- ❌ **CRITICAL:** site-page.ejs has duplicate `<main>` tags and malformed HTML structure
- ❌ Stale sitemap.xml (lastmod: 2026-01-10)
- ❌ No structured data markup for blog articles
- ❌ No breadcrumb schema implementation
- ❌ Limited internal linking between related content
- ❌ No baseline performance metrics established
- ❌ Meta descriptions may need CTR optimization

---

## Phase 1: Technical SEO Foundation (Week 1)

### Objectives
1. Fix critical HTML validation errors
2. Establish baseline performance scores
3. Optimize Core Web Vitals
4. Ensure consistent meta tagging

### Components

#### 1.1 HTML Structure Fixes

**File:** `views/site-page.ejs`

**Issues:**
- Line 45: `<main class="content-page">` (first main tag)
- Line 56: `<main class="layout">` (second main tag, invalid)
- Lines 48-75: Clock block section (first instance)
- Lines 59-74: Clock block section (duplicate, inside second main)
- Line 54: `<%- include('partials/header') %>` placed incorrectly (inside `<p>` tag)

**Solution:**
- Remove the duplicate `<main class="layout">` wrapper
- Keep only one `<main>` element
- Move header include outside of clock-block section
- Ensure proper semantic nesting
- Validate against W3C HTML validator

**Expected Result:** Valid HTML document that passes W3C validation

#### 1.2 Sitemap & Robots Updates

**File:** `public/sitemap.xml`

**Tasks:**
- Update all `<lastmod>` dates to current date (2026-03-25)
- Verify all published pages are included:
  - Homepage (all language variants)
  - Blog posts
  - Guide pages
  - About, Contact, Privacy, Terms pages
  - Exclude admin pages, survey pages
- Set appropriate `<changefreq>` (daily for homepage, weekly for blog, monthly for static pages)
- Test with Google Search Console

**File:** `public/robots.txt`

**Tasks:**
- Verify Sitemap URL is correct
- Confirm all bot rules are appropriate
- Update lastmod comment if needed

#### 1.3 Baseline Performance Audit

**Tools:** Google PageSpeed Insights, Lighthouse, Google Search Console

**Metrics to Establish:**
- Desktop Lighthouse score
- Mobile Lighthouse score
- Core Web Vitals (LCP, FID, CLS)
- Performance score breakdown (Accessibility, Best Practices, SEO)
- Page load time
- First Contentful Paint (FCP)
- Time to Interactive (TTI)

**Deliverable:** Baseline metrics document for comparison after each phase

#### 1.4 Core Web Vitals Optimization

**Areas:**
- **Images:** Implement lazy-loading, use modern formats (WebP with fallback), optimize file sizes
- **CSS/JS:** Review minification, consider code-splitting for unused styles
- **Fonts:** Analyze font loading strategy (system fonts vs web fonts), implement font-display: swap
- **Layout Shift:** Identify and fix elements causing CLS (e.g., ads, image placeholders)
- **Interactivity:** Optimize button click handlers, reduce JavaScript execution time

#### 1.5 Meta Tag Audit

**Files to audit:** `views/index.ejs`, `views/site-page.ejs`, `views/partials/meta.ejs`, blog post templates

**Checklist:**
- ✅ Each page has unique `<title>` (50-60 chars, includes keyword)
- ✅ Each page has unique `<meta name="description">` (150-160 chars, includes keyword)
- ✅ Canonical URLs are present and correct
- ✅ Hreflang tags for multi-language pages
- ✅ Open Graph tags complete
- ✅ No duplicate meta tags
- ✅ Viewport meta tag present
- ✅ Character encoding specified

**Expected Result:** All pages pass meta tag validation in Google Search Console

---

## Phase 2: Content SEO & Keyword Optimization (Week 2-3)

### Objectives
1. Identify and target high-value keywords
2. Optimize content for search intent
3. Implement advanced schema markup
4. Improve content structure and readability

### Components

#### 2.1 Keyword Research

**Target Keywords (Examples - to be refined):**
- Primary: "server time checker", "NTP time sync", "ticketing guide"
- Secondary: "server latency check", "time synchronization", "concert ticketing tips"
- Long-tail: "how to sync server time", "best time to buy tickets", "server time difference"

**Process:**
1. Use Google Search Console to identify current search impressions/clicks
2. Research competitor keywords (check top-ranking sites for related terms)
3. Identify search intent: informational, transactional, navigational
4. Find keyword gaps (keywords competitors rank for that you don't)
5. Analyze keyword difficulty vs. opportunity

**Tools:** Google Search Console, SEMrush/Ahrefs alternatives, Answer the Public

#### 2.2 Homepage Content Optimization

**File:** `views/index.ejs`

**Optimizations:**
- **H1 Tag:** Ensure primary keyword is naturally included, clear value proposition
- **Meta Description:** Rewrite for CTR improvement, include primary keyword, end with CTA
- **Intro Paragraph:** First 160 chars should summarize page content and target keyword
- **Above-the-Fold Content:** Make primary CTA (form/button) visible without scrolling
- **Internal Links:** Link to top blog posts and guides from homepage
- **Schema Enhancement:** Ensure Organization schema is complete with contact info

#### 2.3 Blog Post Optimization

**Files:** `views/blog/posts/*.ejs`

**Per-Post Optimizations:**
1. **Title Optimization:** Include primary keyword, optimize for CTR (power words, numbers)
2. **Meta Description:** Unique, keyword-rich, compelling
3. **Structure:** H2 for major sections, H3 for subsections (proper hierarchy)
4. **Table of Contents:** Add for articles >1500 words (improves UX and SEO)
5. **Internal Links:** 3-5 contextual links to other blog posts or homepage
6. **Images:** Alt text for every image (descriptive, include keyword naturally)
7. **Content Length:** Target 1200+ words for competitive topics
8. **Keyword Distribution:** Natural 1-2% keyword density
9. **CTA Placement:** Add internal CTA near end of article

#### 2.4 Schema Markup Expansion

**Article Schema** - For blog posts

```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Article Title",
  "description": "Article description",
  "image": "featured-image-url",
  "datePublished": "2026-01-15",
  "dateModified": "2026-03-20",
  "author": {
    "@type": "Person",
    "name": "SyncTime Team"
  }
}
```

**BreadcrumbList Schema** - For navigation

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "https://synctime.keero.site/en"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "Blog",
      "item": "https://synctime.keero.site/en/blog"
    }
  ]
}
```

**FAQPage Schema** (if applicable) - For guide pages

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is server time synchronization?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Answer content..."
      }
    }
  ]
}
```

#### 2.5 Content Gap Analysis

**Deliverable:** Report identifying:
- Keywords competitors rank for that SyncTime doesn't
- Content clusters missing from current blog
- Quick-win topics (low difficulty, some search volume)
- Topic expansion opportunities

---

## Phase 3: Advanced SEO Strategy & Refinement (Week 4-5)

### Objectives
1. Implement strategic internal linking
2. Optimize content architecture
3. Establish ongoing SEO monitoring
4. Build technical foundation for link building

### Components

#### 3.1 Internal Linking Strategy

**Content Clusters (Examples):**
- **Ticketing Cluster:** "ticketing-tips" → "ticketing-korea" → "ticketing-japan" → "ticketing-global"
- **Time Sync Cluster:** "server-time-guide" → "time-sync-deep-dive" → "ntp-vs-http" → "network-optimization"
- **Troubleshooting Cluster:** Related guides and error solutions

**Implementation:**
1. Map content clusters in spreadsheet
2. Identify hub pages (pillar content that links to cluster articles)
3. Add 3-5 contextual internal links per article
4. Optimize anchor text (use target keyword naturally)
5. Link from homepage to top 3-5 cluster hubs
6. Create "Related Articles" section at end of each post

**Tools:** Internal link audit script or manual crawl review

#### 3.2 Technical SEO Refinement

**Structured Data Validation:**
- Test all schema markup with Google Rich Results Test
- Fix any validation errors
- Add missing Organization contact information

**Mobile UX:**
- Test mobile usability in Google Search Console
- Ensure tap targets are adequately sized (48px minimum)
- Verify mobile viewport configuration
- Check mobile page speed

**Image Optimization:**
- Add descriptive alt text to all images
- Implement lazy-loading for below-the-fold images
- Convert to WebP format with PNG fallback
- Compress image file sizes

#### 3.3 Performance Fine-Tuning

**Caching Strategy:**
- Set appropriate cache headers for static assets (CSS, JS, images)
- Consider CDN for static asset delivery
- Implement service worker for offline support (advanced)

**Server Response:**
- Monitor Time to First Byte (TTFB)
- Optimize database queries if applicable
- Consider HTTP/2 push for critical resources

#### 3.4 SEO Monitoring & Analytics

**Google Search Console Setup:**
- Verify site ownership (if not already done)
- Monitor Search Performance dashboard
- Track impressions, clicks, CTR, average position
- Check for crawl errors
- Monitor Core Web Vitals in CWV report

**Google Analytics Goals:**
- Set up conversion goals (form submissions, time on page)
- Track keyword performance with UTM parameters
- Create custom dashboard for SEO metrics

**Monthly Reporting:**
- Template for monthly SEO report (impressions, clicks, CTR, ranking changes)
- Compare metrics against baseline (Phase 1)
- Identify top-performing pages and keywords

#### 3.5 Link Building Foundation

**White-hat Link Building:**
- Identify broken backlinks (using Google Search Console)
- Create content worth linking to (comprehensive guides, original research)
- Reach out to relevant websites for guest posting opportunities
- Add internal links to authority pages to increase their strength

---

## Technical Specifications

### Database Queries (if needed for SEO analytics)
- Track page views per URL
- Identify low-traffic pages needing optimization
- Monitor bounce rate by page

### Files to Modify (Summary)
- `views/site-page.ejs` - Fix HTML structure
- `views/index.ejs` - Optimize content, add internal links
- `views/blog/posts/*.ejs` - Add schema, optimize content
- `public/sitemap.xml` - Update dates and content
- `public/robots.txt` - Verify configuration
- `views/partials/meta.ejs` - Ensure consistent meta tags

### New Files to Create
- `docs/seo/baseline-metrics.md` - Phase 1 results
- `docs/seo/keyword-research.md` - Phase 2 keyword findings
- `docs/seo/content-strategy.md` - Phase 2 content plan
- `docs/seo/monthly-seo-report-template.md` - Phase 3 monitoring

---

## Success Metrics

### Phase 1
- ✅ site-page.ejs passes W3C HTML validation
- ✅ Lighthouse score established for baseline
- ✅ Mobile PageSpeed Insights score established
- ✅ Core Web Vitals baseline metrics recorded

### Phase 2
- ✅ Keyword research document completed
- ✅ 20+ high-value keywords identified
- ✅ All blog posts include Article schema
- ✅ Internal linking map created and implemented
- ✅ Improvement in target keyword rankings

### Phase 3
- ✅ Internal linking strategy fully implemented
- ✅ 30%+ increase in organic impressions
- ✅ Google Search Console monitoring active
- ✅ Monthly SEO report template established
- ✅ Month-over-month ranking improvements

---

## Implementation Order

1. **Phase 1 Tasks (Week 1):**
   - Fix site-page.ejs HTML structure
   - Update sitemap.xml and robots.txt
   - Run baseline Lighthouse/PageSpeed audits
   - Optimize Core Web Vitals
   - Complete meta tag audit

2. **Phase 2 Tasks (Week 2-3):**
   - Conduct keyword research
   - Optimize homepage content
   - Optimize blog post content
   - Implement Article schema
   - Complete content gap analysis

3. **Phase 3 Tasks (Week 4-5):**
   - Build internal linking strategy
   - Implement internal links
   - Refine technical SEO
   - Set up monitoring and analytics
   - Create link building foundation

---

## Error Handling & Contingencies

- **If baseline scores are lower than expected:** Prioritize Core Web Vitals optimization before Phase 2
- **If keyword research shows no demand:** Explore topic clusters and long-tail alternatives
- **If internal linking causes crawl issues:** Implement robots.txt rules to prevent crawl traps
- **If schema validation fails:** Use Google Rich Results Test to identify and fix errors

---

## Security & Compliance

- No sensitive data in meta tags or structured data
- All schema markup uses standard Schema.org types
- No malicious redirects or cloaking
- Robots.txt respects user privacy (no blocking of analytics)

---

## Testing Strategy

1. **Unit:** Validate each schema markup independently
2. **Integration:** Test internal links don't create crawl loops
3. **E2E:** Verify homepage improvements show in search results after 4-6 weeks
4. **Performance:** Benchmark Lighthouse scores before/after each phase

---

**Status:** Ready for implementation planning

