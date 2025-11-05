# Timeism SEO 설정 가이드

## 개요

이 프로젝트는 SEO 최적화를 위해 다음과 같이 개선되었습니다:
- EJS 템플팅 엔진을 사용한 동적 메타 태그
- JSON-LD 구조화된 데이터
- 동적 도메인 환경변수 설정
- Open Graph 이미지 자동 생성
- 개선된 robots.txt 및 sitemap.xml

## 빠른 시작

### 1. 설치
```bash
npm install
```

### 2. 환경 설정
`.env` 파일의 `DOMAIN` 변수를 실제 배포 도메인으로 설정합니다:

```env
# 개발 환경
DOMAIN=http://localhost:3000

# 프로덕션 환경
DOMAIN=https://yourdomain.com
```

### 3. OG 이미지 생성 (선택사항)
```bash
# 자동 OG 이미지 생성
npm run og:generate

# OG 이미지 생성 가이드 보기
npm run og:guide
```

### 4. 서버 실행
```bash
# 개발
npm run dev

# 프로덕션
npm start
```

## SEO 기능 상세

### 1. 동적 메타 태그 (EJS 템플릿)

각 페이지의 메타 태그는 `DOMAIN` 환경변수를 사용하여 자동으로 생성됩니다:

**views/index.ejs**
- WebApplication 스키마
- Open Graph 태그
- Twitter Card 태그
- Mobile Web App 메타 태그

**views/guide.ejs**
- FAQPage 스키마 (4개의 Q&A 포함)
- Breadcrumb 네비게이션
- 내부 링크 최적화

**views/privacy.ejs**
- WebPage 스키마
- Breadcrumb 네비게이션
- 관련 페이지 링크

### 2. 구조화된 데이터 (JSON-LD)

모든 페이지에 JSON-LD 스키마가 포함되어 있습니다:

```bash
# 스키마 검증 도구
https://validator.schema.org/

# Google Rich Results Test
https://search.google.com/test/rich-results
```

### 3. robots.txt 동적 생성

```
GET /robots.txt
```

응답:
```
User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/

Sitemap: {DOMAIN}/sitemap.xml
```

### 4. sitemap.xml 동적 생성

```
GET /sitemap.xml
```

포함 페이지:
- / (priority: 1.0, daily)
- /guide (priority: 0.7, monthly)
- /privacy (priority: 0.5, monthly)

### 5. Open Graph 이미지

자동 생성된 OG 이미지 (1200x630px):
```
public/og-image.png
```

맞춤 이미지 생성:
```bash
npm run og:generate
```

## 배포 체크리스트

### Google Search Console
```
1. https://search.google.com/search-console 방문
2. 속성 추가 및 소유권 확인
3. Sitemap 제출: {DOMAIN}/sitemap.xml
4. robots.txt 검증: {DOMAIN}/robots.txt
```

### Rich Results 검증
```
1. https://search.google.com/test/rich-results 방문
2. 페이지 URL 입력
3. 모든 검증 통과 확인
```

### Social Media 미리보기
```
# Facebook
https://developers.facebook.com/tools/debug/

# Twitter
https://cards-dev.twitter.com/validator

# LinkedIn
https://www.linkedin.com/feed/#
```

## 환경 변수 설정

### .env 파일 예제

```env
# 서버 설정
PORT=3000
NODE_ENV=production

# SEO 도메인 설정 (필수!)
DOMAIN=https://yourdomain.com

# 레이트 리밋
RATE_LIMIT_MAX=30

# 프록시 설정 (리버스 프록시 사용 시)
TRUST_PROXY=1

# 보안
IP_HASH_SALT=your-secret-salt-here
ADMIN_TOKEN=your-admin-token-here

# 광고 (AdSense 사용 시)
ADSENSE_CLIENT=
ADSENSE_SLOT=
```

## 파일 구조

```
views/
  ├── index.ejs       # 홈페이지 (WebApplication 스키마)
  ├── guide.ejs       # 가이드 페이지 (FAQPage 스키마)
  └── privacy.ejs     # 개인정보 페이지 (WebPage 스키마)

public/
  ├── og-image.png    # OG 이미지 (1200x630px)
  ├── css/
  ├── js/
  ├── favicon.ico
  └── icons/

scripts/
  ├── create-og-image.js      # OG 이미지 자동 생성
  └── generate-og-image.js    # OG 이미지 생성 가이드

app.js                # Express 앱 (EJS 설정 포함)
package.json          # npm 스크립트 추가됨
```

## 주요 npm 스크립트

```bash
npm start                # 프로덕션 서버 실행
npm run dev             # 개발 서버 실행 (nodemon)
npm run db:init         # 데이터베이스 초기화
npm run og:generate     # OG 이미지 생성
npm run og:guide        # OG 이미지 생성 가이드 보기
npm test                # 테스트 실행
```

## 성능 최적화 팁

### Core Web Vitals 개선

1. **이미지 최적화**
   ```html
   <!-- WebP + PNG 폴백 -->
   <picture>
     <source srcset="image.webp" type="image/webp">
     <img src="image.png" alt="설명">
   </picture>
   ```

2. **CSS/JS 최소화**
   ```bash
   npm install --save-dev terser cssnano
   ```

3. **폰트 최적화**
   - font-display: swap 사용
   - 필요한 글자만 로드 (subset)

4. **캐시 정책**
   - Static 파일: Cache-Control: max-age=31536000
   - HTML: Cache-Control: no-cache

## 모니터링 및 분석

### Google Analytics 설정
```html
<!-- 페이지에 GA 스크립트 추가 -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_ID');
</script>
```

### Search Console 모니터링
- 주 1회 검색 성과 확인
- 월 1회 coverage 확인
- 에러 로그 정기 점검

## 문제 해결

### OG 이미지가 표시되지 않음
```bash
# 이미지 파일 확인
ls -la public/og-image.png

# 이미지 재생성
npm run og:generate

# DOMAIN 변수 확인
cat .env | grep DOMAIN
```

### 메타 태그가 업데이트되지 않음
```bash
# 브라우저 캐시 초기화
# Ctrl + Shift + R (Windows/Linux)
# Cmd + Shift + R (Mac)

# 또는 개발자 도구에서 "네트워크 조건" → "캐시 비활성화" 체크
```

### robots.txt 또는 sitemap.xml이 잘못됨
```bash
# 서버 재시작
npm run dev

# 접속 확인
curl http://localhost:3000/robots.txt
curl http://localhost:3000/sitemap.xml
```

## 자주 묻는 질문

**Q: 정적 HTML 파일을 여전히 사용할 수 있나요?**
A: 네, EJS 템플릿이 우선 실행되므로 `public/` 디렉토리의 HTML은 override 됩니다. 필요시 유지 가능합니다.

**Q: DOMAIN을 변경하면 모든 곳이 반영되나요?**
A: 네, app.js의 `DOMAIN` 변수와 EJS 템플릿에 자동 반영됩니다. robots.txt, sitemap.xml도 함께 갱신됩니다.

**Q: OG 이미지를 커스터마이징할 수 있나요?**
A: 네, `scripts/create-og-image.js`의 SVG를 수정하거나, 디자인 도구(Figma, Canva)로 이미지를 만들어 `public/og-image.png`에 저장하면 됩니다.

**Q: 다국어 지원은 어떻게 하나요?**
A: 현재는 한국어만 지원합니다. 추후 `hreflang` 메타 태그와 다국어 템플릿을 추가할 수 있습니다.

**Q: AMP(Accelerated Mobile Pages)를 지원하나요?**
A: 현재는 미지원합니다. PWA 방식으로 모바일 성능을 최적화했습니다.

---

**최종 업데이트**: 2025-11-06
**상태**: 프로덕션 준비 완료 ✅
