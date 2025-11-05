# Railway 빠른 배포 가이드

## 🚀 Railway 배포 3단계

### 1단계: Railway 프로젝트 연결 (5분)

```bash
# Railway CLI 설치 (첫 배포시만)
npm i -g @railway/cli

# Railway 로그인
railway login

# 프로젝트 폴더에서 프로젝트 초기화
cd /path/to/navism_clone
railway init
```

### 2단계: 환경 변수 설정 (5분)

#### 방법 A: Railway Dashboard (권장)
1. https://railway.app 에서 프로젝트 오픈
2. `Variables` 탭 클릭
3. 다음 환경 변수 추가:

```env
# 필수 설정
DOMAIN=https://your-app.railway.app
NODE_ENV=production

# 보안 (강력한 값으로 설정하세요!)
IP_HASH_SALT=generate-strong-random-string-here-min32chars
ADMIN_TOKEN=your-secure-admin-token-here

# 성능
RATE_LIMIT_MAX=30
TRUST_PROXY=1

# 데이터베이스 (Railway의 /var/run/secrets 디렉토리 사용)
DB_PATH=/tmp/app.db
```

#### 방법 B: CLI 설정 (선택)
```bash
railway variables set DOMAIN=https://your-app.railway.app
railway variables set NODE_ENV=production
railway variables set IP_HASH_SALT=your-strong-salt
railway variables set ADMIN_TOKEN=your-token
railway variables set RATE_LIMIT_MAX=30
railway variables set TRUST_PROXY=1
```

**강력한 SALT 생성 명령**:
```bash
# macOS/Linux
openssl rand -base64 32

# Windows PowerShell
[System.Convert]::ToBase64String([System.Random]::new().GetBytes(32))
```

### 3단계: 배포 (5분)

#### 방법 A: Git Push (권장)
```bash
# GitHub과 연결된 경우, 자동으로 배포
git add .
git commit -m "Prepare for Railway deployment"
git push origin main

# Railway는 자동으로 배포 시작
```

#### 방법 B: CLI 배포
```bash
railway up
```

#### 방법 C: Railway Dashboard
1. `Deployments` 탭에서 `Deploy` 버튼 클릭
2. 배포 로그 실시간 확인

---

## 📊 배포 확인 (2분)

배포가 완료되면 다음을 확인하세요:

### 배포 상태 확인
```bash
# Railway에서 할당한 도메인 확인
railway status

# 또는 Dashboard의 "Public URL" 확인
```

### 배포된 사이트 테스트
```bash
# 홈페이지 확인
curl https://your-app.railway.app/

# robots.txt 확인 (DOMAIN이 자동으로 업데이트됨)
curl https://your-app.railway.app/robots.txt

# sitemap.xml 확인
curl https://your-app.railway.app/sitemap.xml

# 모든 페이지 확인
curl https://your-app.railway.app/guide
curl https://your-app.railway.app/privacy
```

---

## 🔍 SEO 검증 (10분)

배포 후 필수 검증:

### Google Rich Results Test
```
1. https://search.google.com/test/rich-results 방문
2. https://your-app.railway.app 입력
3. ✅ WebApplication, FAQPage, WebPage 스키마 확인
```

### robots.txt 확인
```bash
# 터미널에서
curl https://your-app.railway.app/robots.txt

# 확인 사항:
# - Disallow: /api/
# - Disallow: /admin/
# - Sitemap: https://your-app.railway.app/sitemap.xml
```

### Sitemap 확인
```bash
curl https://your-app.railway.app/sitemap.xml

# 확인 사항:
# - 3개 URL (/, /guide, /privacy)
# - 올바른 도메인으로 표시
```

### OG 이미지 확인
```bash
# Facebook Share Debugger: https://developers.facebook.com/tools/debug/
# 입력: https://your-app.railway.app

# 확인 사항:
# - og:title, og:description 표시
# - og:image (1200x630px) 표시
# - 영어 텍스트: "Server Time Comparison Service"
```

---

## 🌐 Google Search Console 등록 (5분)

### 1. 도메인 소유권 확인
```
https://search.google.com/search-console
```
- `+ Create property` → `https://your-app.railway.app` 입력
- DNS 또는 HTML 메타 태그로 소유권 확인

### 2. Sitemap 제출
```
Search Console → Sitemaps
URL: https://your-app.railway.app/sitemap.xml
Submit
```

### 3. 크롤링 요청
```
Search Console → URL Inspection
각 URL 입력:
- https://your-app.railway.app/
- https://your-app.railway.app/guide
- https://your-app.railway.app/privacy

Request Indexing 클릭
```

---

## 📈 모니터링 (지속적)

### Railway Dashboard 모니터링
- **Logs**: 에러 로그 실시간 확인
- **Metrics**: CPU, 메모리 사용량 모니터링
- **Deployments**: 배포 이력 확인

### Google Search Console 모니터링
- **Performance**: 검색 트래픽 분석
- **Coverage**: 색인 상태 확인
- **Enhancements**: Rich Results 상태 확인

---

## 🔧 문제 해결

### 문제: 배포 후 DOMAIN이 잘못되어 있음
```bash
# Railway Dashboard에서 확인
# Variables → DOMAIN=https://your-app.railway.app 로 수정
# → Redeploy 실행
```

### 문제: 데이터베이스 에러
```bash
# Railway Logs에서 오류 확인
# 일반적으로 DB_PATH 문제

# 해결: DB_PATH=/tmp/app.db 또는 /data/app.db 설정 후 재배포
railway variables set DB_PATH=/tmp/app.db
railway up
```

### 문제: 배포 후 500 에러
```bash
# Railway Logs 확인
railway logs

# 일반적인 원인:
# 1. 환경 변수 누락 → 모든 환경 변수 확인
# 2. npm 의존성 문제 → package.json 확인
# 3. 포트 설정 → PORT 환경 변수 제거 (Railway 자동 할당)
```

### 문제: 느린 배포 시간
```bash
# Railway는 첫 배포가 5~10분 소요 가능
# 이후 배포는 1~2분

# 배포 상태 확인:
railway status
```

---

## ✅ 배포 완료 체크리스트

최종 확인:
- [ ] Railway 대시보드에서 배포 완료 표시
- [ ] `https://your-app.railway.app` 접속 가능
- [ ] 모든 페이지 정상 작동
- [ ] OG 이미지 SNS에서 표시
- [ ] Google Rich Results 통과
- [ ] robots.txt, sitemap.xml 정상 생성
- [ ] Google Search Console 등록 및 Sitemap 제출
- [ ] 모바일 반응형 정상 작동

---

## 📚 참고 링크

- [Railway 공식 문서](https://docs.railway.app)
- [Node.js 배포 가이드](https://docs.railway.app/getting-started)
- [환경 변수 설정](https://docs.railway.app/guides/variables)
- [Google Search Console](https://search.google.com/search-console)
- [Google Rich Results Test](https://search.google.com/test/rich-results)

---

**배포 소요 시간**: 약 30분 (검증 포함)
**지원**: DEPLOYMENT_CHECKLIST.md 참고

배포 완료를 축하합니다! 🎉
