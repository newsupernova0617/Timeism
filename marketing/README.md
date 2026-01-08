# 티켓팅 일정 데이터 수집 시스템

## 📋 개요

이 시스템은 주요 티켓팅 사이트에서 공연/이벤트 일정을 **반자동으로 수집**하여 JSON 파일로 저장합니다.

## 🎯 목적

- 월 1회 정도 수동으로 실행하여 티켓팅 일정 업데이트
- 컴퓨트 리소스 절약 (완전 자동화 대신 반자동화)
- 사람이 데이터 품질을 검토할 수 있는 구조

## 📁 프로젝트 구조

```
marketing/
├── extract_all_events.py    # 메인 실행 스크립트
├── requirements.txt          # Python 의존성
├── raw_html/                 # 다운로드된 HTML 파일들
│   ├── interpark_utf8.html
│   ├── melon_utf8.html
│   ├── yes24.html
│   ├── ticketmaster.html
│   └── ...
└── output/                   # 생성된 JSON 파일들
    ├── synctime_kr.json      # 한국 이벤트
    ├── synctime_jp.json      # 일본 이벤트
    └── synctime_global.json  # 글로벌 이벤트
```

## 🚀 사용 방법

### 1. 환경 설정

```bash
# 의존성 설치
pip install -r requirements.txt
```

### 2. HTML 다운로드 (WSL 사용)

```bash
# WSL에서 실행
cd /mnt/c/Users/yj437/OneDrive/Desktop/coding_windows/Timeism/marketing/raw_html

# 한국 사이트
curl -s 'http://ticket.interpark.com/TPGoodsList.asp?Ca=Liv' | iconv -f euc-kr -t utf-8 -c > interpark_utf8.html
curl -s 'https://ticket.melon.com/main/index.htm' | iconv -f euc-kr -t utf-8 -c > melon_utf8.html
curl -s 'https://ticket.yes24.com/New/Rank/ranking.aspx?genre=15456' -o yes24.html

# 글로벌 사이트
curl -s 'https://www.ticketmaster.com' -o ticketmaster.html
curl -s 'https://www.axs.com' -o axs.html
curl -s 'https://www.eventbrite.com' -o eventbrite.html
```

### 3. 데이터 추출

```bash
# Python 스크립트 실행
python extract_all_events.py
```

### 4. 결과 확인

```bash
# 생성된 JSON 파일 확인
cat output/synctime_kr.json
```

## 📊 현재 지원 사이트

### ✅ 구현 완료 (237개 이벤트)
- **인터파크** - 225개 이벤트 ✅
- **멜론티켓** - 12개 이벤트 ✅

### 📥 HTML 다운로드 완료 (파서 미구현)
- **YES24** - 동적 로딩 (AJAX API 필요)
- **티켓링크** - 파서 구현 필요
- **eplus** (일본) - 복잡한 구조, API 필요
- **Ticket Pia** (일본) - 파서 구현 필요
- **Ticketmaster** (글로벌) - 파서 구현 필요
- **AXS** (글로벌) - 파서 구현 필요
- **Eventbrite** (글로벌) - 파서 구현 필요
- **StubHub** (글로벌) - 파서 구현 필요

### 💡 참고사항
- 현재 **237개의 한국 티켓팅 일정**을 확보했습니다
- 나머지 사이트는 필요시 점진적으로 구현 가능
- 대부분의 사이트가 JavaScript 동적 로딩을 사용하므로 Selenium 또는 API 분석이 필요할 수 있음

## 📝 JSON 데이터 형식

```json
{
  "last_updated": "2026-01-08T15:35:18.704757",
  "event_count": 237,
  "events": [
    {
      "id": "interpark-concert-example",
      "name": "아이유 콘서트",
      "platform": "인터파크",
      "ticketing_time": "",
      "url": "http://ticket.interpark.com/...",
      "category": "concert",
      "venue": "고척스카이돔",
      "period": "2026.01.17~2026.01.18",
      "enabled": true,
      "priority": "medium"
    }
  ]
}
```

## 🔄 워크플로우

1. **월 1회 실행** (또는 필요시)
2. **HTML 다운로드** (curl 명령어)
3. **스크립트 실행** (`python extract_all_events.py`)
4. **데이터 검토** (output/ 폴더의 JSON 파일)
5. **필요시 수정** (수동 편집)
6. **Git 커밋** (버전 관리)

## 🛠️ 기술 스택

- **Python 3.x**
- **BeautifulSoup4** - HTML 파싱
- **WSL + curl** - HTML 다운로드

## 📌 주의사항

- 인코딩 문제: 한국 사이트는 EUC-KR → UTF-8 변환 필요
- 동적 사이트: YES24 등은 JavaScript로 데이터 로드 (별도 처리 필요)
- 사이트 구조 변경: 파서가 작동하지 않으면 HTML 구조 확인 필요

## 📈 통계

- **총 237개 이벤트** 수집 완료
  - 인터파크: 225개
  - 멜론티켓: 12개

## 🔜 향후 계획

1. YES24 파서 구현 (AJAX API 분석)
2. 일본 사이트 파서 구현
3. 글로벌 사이트 파서 구현
4. 데이터 정규화 및 중복 제거
5. 티켓 오픈 시간 정보 추가

## 📄 라이선스

이 프로젝트는 Timeism 프로젝트의 일부입니다.
