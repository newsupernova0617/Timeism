# ✅ GitHub Actions 배포 체크리스트

## 🎯 배포 전 확인사항

### 1. 로컬 테스트 완료
- [x] 트윗 생성 테스트
- [x] 실제 트윗 게시 성공
- [x] JSON 파일 업데이트 확인

### 2. 파일 준비
- [x] `.github/workflows/auto-tweet.yml` 생성
- [x] `marketing/scripts/twitter_client.py` (API v2)
- [x] `marketing/scripts/event_manager.py`
- [x] `marketing/scripts/tweet_scheduler.py`
- [x] `marketing/templates/ko.json`
- [x] `marketing/output/synctime_kr.json` (231개 이벤트)

### 3. GitHub Secrets 설정 (필수!)

#### 한국어 계정
```
Name: TWITTER_API_KEY_KO
Value: m03nAPVsKbnxOTjZ7nPVwTaJw

Name: TWITTER_API_SECRET_KO
Value: savi8lzNhglYCuver4Zz4S0I7I8BeZnNUDlab76KUsVQRBSxFl

Name: TWITTER_ACCESS_TOKEN_KO
Value: 2008470794419236864-ypp5BOWMMlQXI5vIseD9IVdliaxKDG

Name: TWITTER_ACCESS_SECRET_KO
Value: 8Sf7AudZE6aHl6Joavv0Bd1W6vYkZZI1Cl9BkS1m9NOYD
```

**설정 방법:**
1. GitHub Repository 열기
2. Settings → Secrets and variables → Actions
3. New repository secret 클릭
4. 위 4개 Secret 추가

### 4. Git 커밋 & 푸시

```bash
# 현재 상태 확인
git status

# 모든 변경사항 추가
git add .

# 커밋
git commit -m "🤖 Add GitHub Actions auto-tweet system

- Add workflow for daily auto-tweets
- Add Twitter API v2 client
- Add event manager with period-based detection
- Add Korean tweet templates
- Add 231 Korean events data"

# 푸시
git push origin main
```

### 5. GitHub Actions 활성화 확인

1. Repository → Actions 탭
2. "Auto Tweet - Tomorrow's Events" 워크플로우 확인
3. 녹색 체크 또는 "Enable workflow" 버튼

### 6. 수동 실행 테스트

1. Actions → Auto Tweet - Tomorrow's Events
2. Run workflow 클릭
3. Locale: `ko` 선택
4. Run workflow 실행
5. 실행 로그 확인

**예상 결과:**
```
✅ Found 5 event(s) for tomorrow
Posted: 5
Skipped: 0
Failed: 0
```

### 7. 스케줄 확인

- **다음 실행 시간**: 
  - 오전 10시 (KST) - 매일
  - 오후 6시 (KST) - 매일

## 🚨 주의사항

### API 사용 제한
- Twitter API Free tier: 월 1,500 트윗
- 현재 설정: 하루 최대 10개 (2회 × 5개)
- 월간 예상: 최대 300개 (여유 있음)

### 중복 방지
- `posted: true` 플래그로 중복 방지
- 같은 이벤트는 한 번만 트윗

### 데이터 업데이트
- 월 1회 수동으로 HTML 다운로드 & 파싱 필요
- 자동화는 트윗만 담당

## 📊 모니터링 계획

### 매일 확인
- [ ] Actions 탭에서 실행 성공 여부
- [ ] X 계정에서 트윗 확인

### 주간 확인
- [ ] API 사용량 (Twitter Developer Portal)
- [ ] 에러 로그 검토

### 월간 작업
- [ ] 이벤트 데이터 업데이트
- [ ] 통계 리뷰

## 🎉 배포 완료 후

### 즉시
1. ✅ GitHub Secrets 설정
2. ✅ Git 푸시
3. ✅ 수동 실행 테스트
4. ✅ 첫 트윗 확인

### 24시간 내
1. ⏳ 스케줄 실행 확인 (오전 10시)
2. ⏳ 스케줄 실행 확인 (오후 6시)

### 1주일 내
1. 📊 일일 실행 로그 검토
2. 📈 트윗 반응 확인
3. 🐛 버그 수정 (필요시)

## 🔄 롤백 계획

문제 발생 시:
1. Workflow 비활성화:
   - `.github/workflows/auto-tweet.yml` 삭제 또는
   - Workflow 파일에서 `on:` 섹션 주석 처리
2. Git 푸시
3. 문제 해결 후 재배포

---

**배포 준비 완료!** 🚀

다음 명령어로 배포하세요:
```bash
git add .
git commit -m "🤖 Add GitHub Actions auto-tweet system"
git push
```
