# SEO 문제 해결 가이드

## ✅ 이미 해결된 사항

### 1. app.js DOMAIN 기본값 수정 완료
- **변경 전**: `const DOMAIN = process.env.DOMAIN || 'https://example.com'`
- **변경 후**: `const DOMAIN = process.env.DOMAIN || 'https://timeism.keero.site'`

이제 환경변수가 설정되지 않아도 올바른 도메인을 사용합니다.

### 2. SEO 검증 스크립트 생성 완료
- **파일**: `scripts/verify-seo.ps1`
- 배포 후 실행하여 모든 SEO 설정이 올바른지 자동 검증

---

## 🚀 배포 단계

### 1단계: 코드 배포

```bash
# Git에 변경사항 커밋
git add app.js scripts/verify-seo.ps1
git commit -m "Fix: Update DOMAIN default to production URL for SEO"
git push

# 또는 Railway CLI 사용 시
railway up
```

### 2단계: 배포 플랫폼에서 환경변수 확인 (선택사항)

app.js의 기본값이 이미 수정되었으므로, 환경변수가 없어도 작동합니다.
하지만 명시적으로 설정하는 것을 권장합니다:

#### Railway
```bash
railway variables set DOMAIN=https://timeism.keero.site
```

#### Cloudflare Pages
```
Dashboard > Settings > Environment variables
DOMAIN = https://timeism.keero.site
```

### 3단계: 배포 완료 후 검증

```powershell
# SEO 검증 스크립트 실행
.\scripts\verify-seo.ps1
```

이 스크립트가 자동으로 확인합니다:
- ✅ robots.txt의 Sitemap URL
- ✅ sitemap.xml의 모든 URL
- ✅ 홈페이지 메타 태그 (og:url, canonical, og:image, JSON-LD)
- ✅ Guide 페이지의 FAQPage 스키마
- ✅ HTTPS 사용 여부

---

## 📊 검증 결과가 100%일 경우

### Google Search Console 등록

1. **Search Console 접속**
   - https://search.google.com/search-console

2. **속성 추가**
   - "URL 접두어" 선택
   - `https://timeism.keero.site` 입력

3. **소유권 확인** (방법 1 - HTML 태그 추천)
   
   Search Console에서 제공하는 메타 태그를 `views/index.ejs`에 추가:
   
   ```html
   <!-- Google Search Console 소유권 확인 -->
   <meta name="google-site-verification" content="여기에_제공받은_코드_입력" />
   ```

4. **Sitemap 제출**
   - Sitemaps 메뉴 선택
   - 새 사이트맵 추가: `sitemap.xml`
   - 제출

5. **URL 검사 및 색인 요청**
   ```
   https://timeism.keero.site/
   https://timeism.keero.site/guide
   https://timeism.keero.site/privacy
   ```
   각 URL에 대해 "색인 생성 요청" 클릭

---

## 🧪 추가 검증 도구

### 1. Google Rich Results Test
```
https://search.google.com/test/rich-results?url=https://timeism.keero.site
```
- WebApplication 스키마 확인
- AggregateRating 확인

### 2. Schema.org Validator
```
https://validator.schema.org/
```
- "Fetch URL" 탭에서 `https://timeism.keero.site` 검증

### 3. Facebook Sharing Debugger
```
https://developers.facebook.com/tools/debug/
```
- OG 이미지 미리보기 확인

### 4. Twitter Card Validator
```
https://cards-dev.twitter.com/validator
```
- Twitter 카드 미리보기 확인

### 5. Google PageSpeed Insights
```
https://pagespeed.web.dev/
```
- 성능 점수 확인 (목표: 모바일 75+, 데스크톱 85+)

---

## 📅 지속적 모니터링

### 첫 주 (일일 체크)
- [ ] Search Console 크롤링 에러 확인
- [ ] 사이트 정상 작동 확인

### 매주
- [ ] "실적" 탭에서 노출수/클릭수 확인
- [ ] "적용 범위" 탭에서 색인된 페이지 수 확인

### 매월
- [ ] 검색 트래픽 분석
- [ ] Core Web Vitals 지표 확인
- [ ] 주요 키워드 순위 확인

---

## 🎯 체크리스트

```
배포 전
├─ [x] app.js DOMAIN 기본값 수정
├─ [x] SEO 검증 스크립트 생성
└─ [ ] Git commit & push

배포 후
├─ [ ] SEO 검증 스크립트 실행 (.\scripts\verify-seo.ps1)
├─ [ ] 100% 성공 확인
└─ [ ] Google Search Console 등록

Search Console 설정
├─ [ ] 속성 추가
├─ [ ] 소유권 확인
├─ [ ] Sitemap 제출
└─ [ ] URL 색인 요청 (3개 페이지)

추가 검증
├─ [ ] Rich Results Test
├─ [ ] Facebook Sharing Test
├─ [ ] Twitter Card Test
└─ [ ] PageSpeed Insights
```

---

## 💡 예상 타임라인

- **배포**: ~5분
- **검증 스크립트 실행**: ~1분
- **Search Console 설정**: ~10분
- **추가 검증 도구**: ~10분
- **첫 크롤링/색인**: 1-3일
- **검색 결과 노출**: 1-2주

---

**문제가 발생하면**: 검증 스크립트 결과를 확인하고, 실패한 항목을 집중적으로 재검토하세요.
