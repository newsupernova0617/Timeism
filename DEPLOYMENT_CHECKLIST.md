# Railway 배포 전 최종 검토 체크리스트

## 📋 1단계: 로컬 검증 (배포 전)

### 1.1 환경 설정 확인
- [ ] `.env` 파일에서 `DOMAIN` 변수 확인
  ```bash
  # 현재 설정
  cat .env | grep DOMAIN
  # 출력: DOMAIN=http://localhost:3000
  ```
- [ ] `IP_HASH_SALT` 설정 확인 (프로덕션에서는 강력한 값 필요)
- [ ] `ADMIN_TOKEN` 설정 확인
- [ ] 기타 필수 환경 변수 확인:
  - `PORT` (Railway에서는 자동 할당)
  - `NODE_ENV` (production으로 설정)
  - `RATE_LIMIT_MAX`

### 1.2 로컬 서버 테스트
```bash
# DB 초기화
npm run db:init

# 개발 서버 실행
npm run dev

# 테스트 URL 접속
curl http://localhost:3000/
curl http://localhost:3000/guide
curl http://localhost:3000/privacy
curl http://localhost:3000/robots.txt
curl http://localhost:3000/sitemap.xml
```

### 1.3 SEO 메타 태그 검증
- [ ] 홈페이지 메타 태그 확인
  ```bash
  curl http://localhost:3000/ | grep -E 'og:url|og:title|canonical'
  ```
- [ ] /guide 페이지 확인
  ```bash
  curl http://localhost:3000/guide | grep -E 'og:url|@type.*FAQPage'
  ```
- [ ] /privacy 페이지 확인
  ```bash
  curl http://localhost:3000/privacy | grep -E 'og:url|@type.*WebPage'
  ```

### 1.4 OG 이미지 확인
- [ ] OG 이미지 파일 존재 확인
  ```bash
  ls -lh public/og-image.png
  # 예상: 289.94KB, 1200x630px
  ```

### 1.5 robots.txt & Sitemap 확인
```bash
# robots.txt 확인
curl http://localhost:3000/robots.txt
# 예상: /api/, /admin/ 제외, Sitemap 링크 포함

# sitemap.xml 확인
curl http://localhost:3000/sitemap.xml
# 예상: /, /guide, /privacy 포함
```

---

## 🚀 2단계: Railway 배포 설정

### 2.1 Railway 프로젝트 생성
```bash
# Railway CLI 설치 (필요시)
npm i -g @railway/cli

# Railway 로그인
railway login

# Railway 프로젝트 초기화
railway init
```

### 2.2 환경 변수 설정 (Railway Dashboard)
Railway Dashboard에서 다음 환경 변수를 설정:

```env
# 필수 환경 변수
DOMAIN=https://yourdomain.railway.app
NODE_ENV=production
PORT=3000

# 보안 설정
IP_HASH_SALT=your-strong-random-salt-here-min-32-chars
ADMIN_TOKEN=your-secure-admin-token

# 성능 설정
RATE_LIMIT_MAX=30
TRUST_PROXY=1

# 데이터베이스 경로
DB_PATH=/data/app.db
```

**⚠️ 중요**:
- `IP_HASH_SALT`는 32자 이상의 무작위 문자열
- `ADMIN_TOKEN`은 보안 토큰으로 설정
- Railway에서는 `PORT`가 자동으로 할당되므로 `.env`에서 제거 권장

### 2.3 Procfile 생성 (선택사항)
```bash
# Procfile 생성
cat > Procfile << EOF
release: npm run db:init
web: npm start
EOF
```

### 2.4 Railway 배포
```bash
# 코드 푸시 (Git 연결된 경우)
git push railway main

# 또는 Railway CLI로 직접 배포
railway up
```

---

## 🔍 3단계: 배포 후 검증

### 3.1 배포 상태 확인
- [ ] Railway Dashboard에서 배포 로그 확인
- [ ] 애플리케이션이 정상 실행 중 확인
- [ ] 배포된 URL 확인
  ```
  https://your-app.railway.app
  ```

### 3.2 배포된 사이트 기본 검증
```bash
# 홈페이지 접속 (Railway 도메인)
curl https://your-app.railway.app/

# robots.txt 확인
curl https://your-app.railway.app/robots.txt
# DOMAIN이 자동으로 업데이트되었는지 확인

# sitemap.xml 확인
curl https://your-app.railway.app/sitemap.xml

# 모든 페이지 접속 확인
curl https://your-app.railway.app/guide
curl https://your-app.railway.app/privacy
```

### 3.3 SEO 검증 (온라인 도구)

#### Google Rich Results Test
1. https://search.google.com/test/rich-results 방문
2. URL 입력: `https://your-app.railway.app`
3. 다음 스키마 검증 확인:
   - ✅ WebApplication (홈페이지)
   - ✅ FAQPage (가이드 페이지)
   - ✅ WebPage (개인정보 페이지)

#### Schema.org Validator
1. https://validator.schema.org/ 방문
2. URL 입력: `https://your-app.railway.app`
3. 오류 없음 확인

#### Meta Tags 검증
각 페이지의 메타 태그 확인:
```bash
# 홈페이지
curl https://your-app.railway.app/ | grep 'og:'

# 가이드
curl https://your-app.railway.app/guide | grep 'og:'

# 개인정보
curl https://your-app.railway.app/privacy | grep 'og:'
```

### 3.4 SNS 공유 미리보기 테스트

#### Facebook Share Debugger
1. https://developers.facebook.com/tools/debug/ 방문
2. 각 페이지 URL 입력
3. 미리보기 확인:
   - 제목 (og:title)
   - 설명 (og:description)
   - 이미지 (og:image)

#### Twitter Card Validator
1. https://cards-dev.twitter.com/validator 방문
2. 각 페이지 URL 입력
3. Twitter Card 정보 확인

### 3.5 모바일 반응형 테스트
```bash
# Chrome DevTools에서 모바일 시뮬레이션
# 또는 온라인 도구 사용:
https://search.google.com/test/mobile-friendly
```

- [ ] 모든 페이지가 모바일에서 정상 표시
- [ ] 텍스트 가독성 확인
- [ ] 버튼/폼이 터치 가능한 크기

### 3.6 성능 검증

#### Google PageSpeed Insights
1. https://pagespeed.web.dev/ 방문
2. `https://your-app.railway.app` 입력
3. 성능 점수 확인:
   - 목표: 75점 이상 (모바일)
   - 목표: 85점 이상 (데스크톱)

#### Core Web Vitals 확인
- [ ] Largest Contentful Paint (LCP) < 2.5s
- [ ] First Input Delay (FID) < 100ms
- [ ] Cumulative Layout Shift (CLS) < 0.1

---

## 🔐 4단계: 보안 검증

### 4.1 HTTPS 확인
- [ ] 모든 페이지가 HTTPS로 제공됨
- [ ] Mixed content 없음 (모든 리소스가 HTTPS)

### 4.2 보안 헤더 확인
```bash
curl -I https://your-app.railway.app

# 확인 사항:
# - X-Content-Type-Options: nosniff
# - X-Frame-Options: DENY
# - X-XSS-Protection: 1; mode=block
```

### 4.3 API 레이트 리밋 확인
```bash
# 빠른 요청으로 레이트 리밋 테스트
for i in {1..35}; do curl -s https://your-app.railway.app/api/check-time -d '{"target_url":"https://example.com"}' -H "Content-Type: application/json" | head -1; done

# 30번 이후 429 에러 확인
```

### 4.4 Admin 경로 보호 확인
```bash
# 토큰 없이 접속 시도 → 401 에러
curl https://your-app.railway.app/admin/dashboard

# 올바른 토큰으로 접속
curl https://your-app.railway.app/admin/dashboard?token=YOUR_ADMIN_TOKEN
```

---

## 📊 5단계: Google Search Console 등록

### 5.1 도메인 검증
1. https://search.google.com/search-console 방문
2. 속성 추가
3. 도메인 소유권 확인 (DNS/HTML 메타 태그 등)

### 5.2 Sitemap 제출
```
https://search.google.com/search-console/sitemaps
```
- URL: `https://your-app.railway.app/sitemap.xml`
- 제출 후 크롤링 요청

### 5.3 robots.txt 검증
```
https://search.google.com/search-console/robots.txt
```
- 문법 오류 없음 확인
- /api/, /admin/ 경로 제외 확인

### 5.4 URL 크롤링 요청
1. 홈페이지, 가이드, 개인정보 페이지 각각 요청
2. 색인 상태 모니터링

---

## 📈 6단계: 배포 후 모니터링

### 6.1 지속적 모니터링
- [ ] Railway Dashboard에서 로그 확인
- [ ] 에러 모니터링 (최소 일주일)
- [ ] 성능 메트릭 모니터링

### 6.2 Google Search Console 모니터링
- [ ] 색인 상태 확인 (주 1회)
- [ ] 에러 로그 확인 (수시)
- [ ] 검색 성과 분석 (월 1회)

### 6.3 analytics 모니터링 (구성한 경우)
- [ ] 방문자 수 추적
- [ ] 페이지 조회수
- [ ] 이벤트 로깅

---

## 🎯 7단계: 최종 확인 (배포 전날)

최종 배포 전에 다음을 모두 확인:

### 환경 설정
- [ ] `.env` 파일의 모든 변수 확인
- [ ] `.env` 파일이 `.gitignore`에 포함되어 있음
- [ ] `package.json` 스크립트 정상 작동 확인

### 데이터베이스
- [ ] SQLite DB 스키마 정상 (schema.sql 확인)
- [ ] 초기 데이터 설정 완료

### 배포 파일
- [ ] `Procfile` 생성 여부 확인
- [ ] 모든 필요한 파일이 Git에 커밋됨
- [ ] `.gitignore`에서 제외할 파일 확인:
  ```
  node_modules/
  .env
  .env.local
  .env.*.local
  data/
  *.db
  ```

### 최종 로컬 테스트
```bash
# 클린 설치 및 테스트
rm -rf node_modules package-lock.json
npm install
npm run db:init
npm run dev

# 모든 페이지 정상 작동 확인
# http://localhost:3000/
# http://localhost:3000/guide
# http://localhost:3000/privacy
# http://localhost:3000/robots.txt
# http://localhost:3000/sitemap.xml
```

---

## 📞 트러블슈팅

### 문제: Railway에 배포 후 DOMAIN이 잘못됨
**해결**: Railway Dashboard 환경 변수에서 `DOMAIN`을 정확한 Railway 도메인으로 설정
```env
DOMAIN=https://your-app.railway.app
```

### 문제: 데이터베이스가 초기화되지 않음
**해결**:
1. Railway 대시보드에서 배포 로그 확인
2. `npm run db:init` 실행 확인
3. `data/` 디렉토리에 볼륨 마운트 확인

### 문제: 404 에러 발생
**해결**:
1. 라우트 정의 확인 (app.js)
2. EJS 템플릿 파일 확인 (views/ 디렉토리)
3. 정적 파일 경로 확인 (public/ 디렉토리)

### 문제: SEO 메타 태그가 원래 도메인(https://example.com)으로 표시됨
**해결**:
1. Railway에서 `DOMAIN` 환경 변수 다시 설정
2. 애플리케이션 재시작
3. 브라우저 캐시 초기화 후 재확인

---

## ✅ 배포 완료 확인

다음을 모두 확인한 후 배포 완료로 간주:

- [ ] 모든 페이지가 Railway에서 정상 작동
- [ ] SEO 메타 태그가 올바른 도메인으로 표시
- [ ] Google Rich Results 테스트 통과
- [ ] robots.txt와 sitemap.xml이 정상 생성
- [ ] OG 이미지가 SNS에서 정상 표시
- [ ] 모바일 반응형 테스트 통과
- [ ] Google Search Console에 등록
- [ ] Sitemap 제출 완료

---

**배포 예상 소요 시간**: 30분 ~ 1시간
**최종 검수자**: 팀 리드 또는 운영담당자

**참고 문서**:
- SEO_IMPROVEMENTS.md
- SEO_SETUP.md
- README.md
