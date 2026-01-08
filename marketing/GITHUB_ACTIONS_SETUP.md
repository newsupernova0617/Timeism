# 🤖 GitHub Actions 자동화 설정 가이드

## 📋 개요

GitHub Actions를 사용하여 매일 자동으로 내일 공연 트윗을 게시합니다.

## ⚙️ 설정 단계

### 1. GitHub Secrets 추가

Repository → Settings → Secrets and variables → Actions → New repository secret

#### 한국어 계정 (synctime_kr)
```
TWITTER_API_KEY_KO = m03nAPVsKbnxOTjZ7nPVwTaJw
TWITTER_API_SECRET_KO = savi8lzNhglYCuver4Zz4S0I7I8BeZnNUDlab76KUsVQRBSxFl
TWITTER_ACCESS_TOKEN_KO = 2008470794419236864-ypp5BOWMMlQXI5vIseD9IVdliaxKDG
TWITTER_ACCESS_SECRET_KO = 8Sf7AudZE6aHl6Joavv0Bd1W6vYkZZI1Cl9BkS1m9NOYD
```

#### 일본어 계정 (synctime_jp) - 선택사항
```
TWITTER_API_KEY_JP = your_key
TWITTER_API_SECRET_JP = your_secret
TWITTER_ACCESS_TOKEN_JP = your_token
TWITTER_ACCESS_SECRET_JP = your_secret
```

#### 영어/글로벌 계정 (synctime_global) - 선택사항
```
TWITTER_API_KEY_EN = your_key
TWITTER_API_SECRET_EN = your_secret
TWITTER_ACCESS_TOKEN_EN = your_token
TWITTER_ACCESS_SECRET_EN = your_secret
```

### 2. 워크플로우 활성화

1. 파일 커밋 및 푸시:
   ```bash
   git add .github/workflows/auto-tweet.yml
   git commit -m "Add GitHub Actions auto-tweet workflow"
   git push
   ```

2. GitHub Repository → Actions 탭에서 워크플로우 확인

### 3. 수동 실행 테스트

1. Actions → Auto Tweet - Tomorrow's Events
2. Run workflow 클릭
3. Locale 선택 (ko, jp, en, all)
4. Run workflow 실행

## 📅 실행 스케줄

- **매일 오전 10시** (KST) - 하루 시작 알림
- **매일 오후 6시** (KST) - 저녁 알림

## 🔍 작동 방식

```
1. GitHub Actions 실행 (스케줄 또는 수동)
   ↓
2. Python 환경 설정 & 의존성 설치
   ↓
3. tweet_scheduler.py 실행
   ↓
4. 내일 공연 찾기 (period 기반)
   ↓
5. 트윗 생성 & 게시
   ↓
6. JSON 파일 업데이트 (posted: true)
   ↓
7. Git 커밋 & 푸시
```

## 📊 모니터링

### 실행 로그 확인
1. Repository → Actions
2. 최근 워크플로우 실행 클릭
3. 각 Job의 로그 확인

### 성공 여부
- ✅ 녹색 체크: 성공
- ❌ 빨간 X: 실패
- 🟡 노란 점: 실행 중

## 🐛 문제 해결

### API 인증 실패 (401)
- GitHub Secrets가 올바르게 설정되었는지 확인
- Twitter API 키가 유효한지 확인
- Access Token이 "Read and Write" 권한인지 확인

### 트윗 게시 실패 (403)
- Twitter API Access Level 확인
- Free tier는 API v2 사용 (현재 설정됨)

### 내일 공연이 없음
- `marketing/output/synctime_kr.json` 파일 확인
- `period` 필드가 올바른지 확인
- 실제로 내일 공연이 있는지 확인

## 📝 로그 예시

### 성공
```
✅ Found 5 event(s) for tomorrow
[1/5] Processing: 조용필 콘서트...
  ✅ Posted successfully
Posted: 5
Skipped: 0
Failed: 0
```

### 공연 없음
```
❌ No events found for tomorrow
```

## 🔄 업데이트 프로세스

### 월간 데이터 업데이트
1. 로컬에서 HTML 다운로드:
   ```bash
   cd marketing
   bash download_html.sh
   ```

2. 데이터 추출:
   ```bash
   python extract_all_events.py
   ```

3. Git 커밋 & 푸시:
   ```bash
   git add output/
   git commit -m "Update event data"
   git push
   ```

## 📈 통계

- **실행 빈도**: 하루 2회
- **월간 트윗 수**: 최대 60개 (하루 2회 × 30일)
- **API 사용량**: Free tier 한도 내

## 🎯 다음 단계

1. ✅ GitHub Secrets 설정
2. ✅ 워크플로우 커밋 & 푸시
3. ✅ 수동 실행 테스트
4. ⏳ 스케줄 실행 대기
5. 📊 로그 모니터링

---

**Last Updated**: 2026-01-08  
**Status**: ✅ Ready to deploy
