# X 마케팅 자동화 시스템 TODO

## 📋 Phase 1: GitHub Secrets 설정

### 1.1 GitHub Repository Secrets 추가
- [ ] GitHub Repository → Settings → Secrets and variables → Actions 이동
- [ ] 다음 Secrets 추가:

#### synctime_jp (일본어 계정)
```
TWITTER_API_KEY_JP=WE1Kb0ZBaVRzeFJ2aWtnOEwwb0Y6MTpjaQ
TWITTER_API_SECRET_JP=XDmDzNKTZ83GPWWmW1jFyzlhbUI1QiJnbh5KXBrJtcJA-B4Okh
TWITTER_ACCESS_TOKEN_JP=2008477674386452483-ellAEeaXaV7ZJsby0V4wuP3xFyivCy
TWITTER_ACCESS_SECRET_JP=aVaSyymLgteVov2ImmAXKCLreqlYBrnVj3sg2kGRUb5OS
```

#### synctime_kr (한국어 계정)
```
TWITTER_API_KEY_KO=bmJNZVczMGxQMkxGb2syTTFrX3M6MTpjaQ
TWITTER_API_SECRET_KO=TLk_fnARRJdopFjvo4352GRNWx3FigSjoR5aNvd8c61zVl5Gfu
TWITTER_ACCESS_TOKEN_KO=2008470794419236864-sGeo2uDcRj6PPk4ClkdwXgPZhnfj13
TWITTER_ACCESS_SECRET_KO=Im5tlYmMmvpxizTa7VoCAs5LVDP2QIgTtdYQCcsmS6O7S
```

#### synctime_global (영어/글로벌 계정)
```
TWITTER_API_KEY_EN=RqTEVk3jnfnN3Fp6FoPNgV8dD
TWITTER_API_SECRET_EN=fJgVcebNphyIgf110u6VixxUBFPAo8lYarHtAt8FenJai3oHJE
TWITTER_ACCESS_TOKEN_EN=2008476200906395648-ArQJx11Vij2aQOaASec4EF2FW2bbon
TWITTER_ACCESS_SECRET_EN=Lmyc4DIkRlgYWrghbzz42Cw8oR0oIgJwtXUAJp57aChdG
```

---

## 📁 Phase 2: 프로젝트 구조 생성

### 2.1 디렉토리 생성
- [ ] `marketing/events/` 폴더 생성
- [ ] `marketing/templates/` 폴더 생성
- [ ] `marketing/scripts/` 폴더 생성

### 2.2 Python 의존성 파일 생성
- [ ] `marketing/requirements.txt` 생성
  ```txt
  tweepy==4.14.0
  python-dateutil==2.8.2
  pytz==2024.1
  ```

---

## 🎯 Phase 3: 이벤트 데이터 파일 작성

### 3.1 한국어 이벤트 (`marketing/events/ko.json`)
- [ ] 파일 생성
- [ ] 주요 티켓팅 이벤트 추가:
  - [ ] 인터파크 콘서트
  - [ ] 멜론티켓 공연
  - [ ] YES24 이벤트
  - [ ] 기타 한국 티켓팅 사이트

**예시 구조:**
```json
{
  "events": [
    {
      "id": "interpark-concert-2026-01-15",
      "name": "아이유 콘서트",
      "platform": "인터파크",
      "ticketing_time": "2026-01-15T20:00:00+09:00",
      "url": "https://synctime.keero.site/ko/sites/interpark",
      "category": "concert",
      "artist": "아이유",
      "enabled": true,
      "priority": "high"
    }
  ]
}
```

### 3.2 일본어 이벤트 (`marketing/events/jp.json`)
- [ ] 파일 생성
- [ ] 일본 티켓팅 이벤트 추가:
  - [ ] イープラス (eplus)
  - [ ] チケットぴあ (Ticket Pia)
  - [ ] 기타 일본 티켓팅 사이트

### 3.3 영어 이벤트 (`marketing/events/en.json`)
- [ ] 파일 생성
- [ ] 글로벌 티켓팅 이벤트 추가:
  - [ ] Ticketmaster
  - [ ] StubHub
  - [ ] Eventbrite

---

## 💬 Phase 4: 트윗 템플릿 작성

### 4.1 한국어 템플릿 (`marketing/templates/ko.json`)
- [ ] 파일 생성
- [ ] 카테고리별 템플릿 작성:
  - [ ] concert (콘서트)
  - [ ] festival (페스티벌)
  - [ ] sports (스포츠)
  - [ ] default (기본)

**예시:**
```json
{
  "templates": {
    "concert": [
      "{artist} 콘서트 티켓팅 30분 전입니다! 🎤\n서버시계 켜두세요 ⏰\n\n{url}\n\n#티켓팅 #{artist} #SyncTime",
      "오늘 참전하는 분들 다 1열 잡게 해주세요 🙏\n{artist} 티켓팅 30분 전!\n\n{url}"
    ]
  }
}
```

### 4.2 일본어 템플릿 (`marketing/templates/jp.json`)
- [ ] 파일 생성
- [ ] 일본어 트윗 템플릿 작성

### 4.3 영어 템플릿 (`marketing/templates/en.json`)
- [ ] 파일 생성
- [ ] 영어 트윗 템플릿 작성

---

## 🐍 Phase 5: Python 스크립트 작성

### 5.1 Twitter 클라이언트 (`marketing/scripts/twitter_client.py`)
- [ ] 파일 생성
- [ ] Tweepy 클라이언트 초기화
- [ ] 트윗 게시 함수 구현
- [ ] 에러 핸들링 추가

### 5.2 이벤트 관리자 (`marketing/scripts/event_manager.py`)
- [ ] 파일 생성
- [ ] 이벤트 로드 함수
- [ ] 30분 후 이벤트 찾기 함수
- [ ] 트윗 생성 함수
- [ ] 이벤트 완료 표시 함수

### 5.3 메인 스케줄러 (`marketing/scripts/tweet_scheduler.py`)
- [ ] 파일 생성
- [ ] 메인 로직 구현
- [ ] 환경 변수 처리
- [ ] 로깅 추가

---

## ⚙️ Phase 6: GitHub Actions 워크플로우

### 6.1 워크플로우 파일 생성 (`.github/workflows/auto-tweet.yml`)
- [ ] 파일 생성
- [ ] 크론 스케줄 설정 (10분마다)
- [ ] 3개 Job 설정:
  - [ ] tweet-ko (한국어)
  - [ ] tweet-jp (일본어)
  - [ ] tweet-en (영어/글로벌)
- [ ] 각 Job에 환경 변수 설정
- [ ] Git commit/push 로직 추가

---

## 🧪 Phase 7: 테스트

### 7.1 로컬 테스트
- [ ] Python 환경 설정
- [ ] 의존성 설치: `pip install -r requirements.txt`
- [ ] `.env` 파일 생성 (로컬 테스트용)
- [ ] 각 언어별 스크립트 실행:
  ```bash
  LOCALE=ko python marketing/scripts/tweet_scheduler.py
  LOCALE=jp python marketing/scripts/tweet_scheduler.py
  LOCALE=en python marketing/scripts/tweet_scheduler.py
  ```

### 7.2 GitHub Actions 테스트
- [ ] 워크플로우 수동 실행 (workflow_dispatch)
- [ ] 로그 확인
- [ ] 트윗 게시 확인
- [ ] 에러 처리 확인

---

## 🚀 Phase 8: 배포 및 모니터링

### 8.1 프로덕션 배포
- [ ] 모든 파일 커밋
- [ ] GitHub에 푸시
- [ ] GitHub Actions 활성화 확인

### 8.2 모니터링 설정
- [ ] GitHub Actions 실행 로그 모니터링
- [ ] X 계정에서 트윗 확인
- [ ] API 사용량 모니터링 (월 1,500개 제한)

### 8.3 문서화
- [ ] README.md 업데이트
- [ ] 운영 가이드 작성
- [ ] 트러블슈팅 가이드 작성

---

## 📊 Phase 9: 최적화 및 개선

### 9.1 기능 추가 (선택사항)
- [ ] 이미지 첨부 기능
- [ ] 스레드 기능
- [ ] A/B 테스팅
- [ ] 통계 수집
- [ ] 긴급 알림 (5분 전)

### 9.2 성능 최적화
- [ ] 중복 방지 로직 강화
- [ ] 재시도 로직 구현
- [ ] 에러 알림 설정

---

## ✅ 체크리스트 요약

### 필수 작업
- [ ] GitHub Secrets 설정 완료
- [ ] 이벤트 데이터 파일 3개 작성 (ko, jp, en)
- [ ] 트윗 템플릿 3개 작성 (ko, jp, en)
- [ ] Python 스크립트 3개 작성
- [ ] GitHub Actions 워크플로우 작성
- [ ] 로컬 테스트 성공
- [ ] 프로덕션 배포

### 선택 작업
- [ ] 이미지 첨부 기능
- [ ] 통계 수집
- [ ] A/B 테스팅

---

## 🎯 우선순위

### High Priority (즉시 시작)
1. GitHub Secrets 설정
2. 이벤트 데이터 파일 작성 (최소 1-2개 이벤트)
3. 트윗 템플릿 작성
4. Python 스크립트 작성

### Medium Priority (다음 단계)
5. GitHub Actions 워크플로우
6. 테스트

### Low Priority (나중에)
7. 최적화 및 개선

---

**시작일**: 2026-01-07
**예상 완료일**: TBD
**담당자**: @user

---

## 📝 노트

- API 사용 제한: 월 1,500 트윗
- 크론 스케줄: 10분마다 실행
- 중복 방지: `posted: true` 플래그 사용
- 타임존: 각 이벤트의 ISO 8601 형식 사용

---

Last Updated: 2026-01-07 16:46 KST
