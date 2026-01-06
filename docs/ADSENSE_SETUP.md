# 💰 Google AdSense 설정 가이드

## 📌 목차
1. [현재 상태](#현재-상태)
2. [AdSense 승인 받기](#adsense-승인-받기)
3. [광고 단위 생성](#광고-단위-생성)
4. [광고 크기 설정](#광고-크기-설정)
5. [코드 업데이트](#코드-업데이트)
6. [배포 및 확인](#배포-및-확인)
7. [문제 해결](#문제-해결)

---

## 🎯 현재 상태

현재 Timeism에는 **3개의 광고 자리**가 준비되어 있습니다:

### 광고 배치 위치
```
1. 📍 Banner Ad #1 (Primary)
   위치: 시계 패널 바로 아래
   예상 노출률: 80-90%
   
2. 📍 Banner Ad #2 (Secondary)
   위치: 알림 설정 섹션 아래
   예상 노출률: 60-70%
   
3. 📍 Banner Ad #3 (Content)
   위치: SEO 콘텐츠 중간
   예상 노출률: 40-50%
```

### 현재 코드 상태
```html
<ins class="adsbygoogle"
     data-ad-client="ca-pub-2995631331341713"  ✅ 실제 ID (변경 불필요)
     data-ad-slot="1234567890"                  ❌ 가짜 ID (변경 필요!)
     data-ad-format="auto"                      ✅ 반응형 설정
     data-full-width-responsive="true"></ins>   ✅ 전체 너비 반응형
```

---

## 📝 AdSense 승인 받기

### Step 1: AdSense 신청
1. https://www.google.com/adsense 접속
2. Google 계정으로 로그인
3. 사이트 URL 입력: `https://timeism.com`
4. 결제 정보 입력

### Step 2: 승인 기준 확인
- ✅ **고유한 콘텐츠**: Timeism은 서버 시간 확인이라는 고유 서비스 제공
- ✅ **충분한 콘텐츠**: SEO 콘텐츠, 블로그, 가이드 페이지 존재
- ✅ **사용자 경험**: 깔끔한 디자인, 빠른 로딩 속도
- ✅ **정책 준수**: 불법 콘텐츠 없음, 저작권 준수

### Step 3: 승인 대기
- 일반적으로 **1-2주** 소요
- 이메일로 승인 결과 통보
- 거절 시 이유 확인 후 재신청 가능

---

## 🎨 광고 단위 생성

승인 후 AdSense 대시보드에서 광고 단위를 생성합니다.

### 광고 단위 #1: Primary Banner (시계 아래)

```
1. AdSense 대시보드 → 광고 → 광고 단위별
2. "디스플레이 광고" 선택
3. 설정:
   - 이름: "Timeism - Primary Banner (Clock Below)"
   - 광고 크기: 반응형 (권장) ⭐
   - 광고 유형: 디스플레이 광고
4. "만들기" 클릭
5. 생성된 코드에서 data-ad-slot 값 복사
   예: data-ad-slot="8765432109"
```

### 광고 단위 #2: Secondary Banner (알림 아래)

```
1. "디스플레이 광고" 선택
2. 설정:
   - 이름: "Timeism - Secondary Banner (Notification Below)"
   - 광고 크기: 반응형 (권장)
3. data-ad-slot 값 복사
```

### 광고 단위 #3: In-Article (SEO 콘텐츠)

```
1. "인피드 광고" 또는 "인아티클 광고" 선택
2. 설정:
   - 이름: "Timeism - In-Article (SEO Content)"
   - 광고 크기: 반응형
3. data-ad-slot 값 복사
```

---

## 📐 광고 크기 설정

### Q: 광고 크기는 누가 정하나요?

**A: 둘 다 가능합니다!**

### Option 1: 반응형 광고 (권장) ⭐

**Google이 자동으로 크기 결정**

```html
<ins class="adsbygoogle"
     data-ad-format="auto"                    ← Google이 자동 결정
     data-full-width-responsive="true"></ins> ← 화면 크기에 맞춤
```

**장점:**
- ✅ 모든 화면 크기에 최적화
- ✅ Google이 수익 최적화
- ✅ 관리 편함

**단점:**
- ⚠️ 크기 예측 불가능
- ⚠️ 레이아웃이 약간 변할 수 있음

**현재 Timeism 설정:**
```css
/* ad-banners.css */
.adsbygoogle {
    min-height: 90px;    ← 최소 높이 설정
    max-height: 280px;   ← 최대 높이 제한
    width: 100%;         ← 전체 너비 사용
}
```

---

### Option 2: 고정 크기 광고

**우리가 직접 크기 지정**

#### 일반적인 광고 크기:

| 크기 | 이름 | 용도 | 권장 위치 |
|------|------|------|----------|
| 728x90 | Leaderboard | 상단 배너 | Primary |
| 300x250 | Medium Rectangle | 사이드바, 콘텐츠 중간 | Secondary, Content |
| 336x280 | Large Rectangle | 콘텐츠 중간 | Content |
| 320x50 | Mobile Banner | 모바일 하단 | Mobile |
| 970x90 | Large Leaderboard | 상단 와이드 배너 | Primary (PC만) |

#### 고정 크기 사용 예시:

```html
<!-- 728x90 Leaderboard -->
<ins class="adsbygoogle"
     style="display:inline-block;width:728px;height:90px"
     data-ad-client="ca-pub-2995631331341713"
     data-ad-slot="1234567890"></ins>
```

**장점:**
- ✅ 레이아웃 예측 가능
- ✅ 디자인 일관성

**단점:**
- ❌ 모바일 대응 어려움
- ❌ 수익 최적화 어려움

---

### 🎯 Timeism 권장 설정

**현재 설정 (반응형) 유지 권장!**

이유:
1. 4개 언어 지원 (ko, en, ja, zh-tw) → 다양한 화면 크기
2. 모바일 트래픽 비중 높음
3. Google이 자동으로 수익 최적화

**만약 고정 크기를 원한다면:**

```html
<!-- PC: 728x90, Mobile: 320x50 -->
<ins class="adsbygoogle"
     style="display:block"
     data-ad-client="ca-pub-2995631331341713"
     data-ad-slot="1234567890"
     data-ad-format="horizontal"  ← 가로형 고정
     data-full-width-responsive="false"></ins>
```

---

## 🔧 코드 업데이트

### 파일 위치: `views/index.ejs`

#### 📍 위치 1: 시계 패널 아래 (라인 ~127)

**변경 전:**
```html
<div class="ad-banner ad-banner-primary">
  <ins class="adsbygoogle"
       style="display:block"
       data-ad-client="ca-pub-2995631331341713"
       data-ad-slot="1234567890"  ← 가짜 ID
       data-ad-format="auto"
       data-full-width-responsive="true"></ins>
  <script>
       (adsbygoogle = window.adsbygoogle || []).push({});
  </script>
</div>
```

**변경 후:**
```html
<div class="ad-banner ad-banner-primary">
  <ins class="adsbygoogle"
       style="display:block"
       data-ad-client="ca-pub-2995631331341713"
       data-ad-slot="8765432109"  ← AdSense에서 받은 실제 ID
       data-ad-format="auto"
       data-full-width-responsive="true"></ins>
  <script>
       (adsbygoogle = window.adsbygoogle || []).push({});
  </script>
</div>
```

#### 📍 위치 2: 알림 설정 아래 (라인 ~338)

```html
data-ad-slot="9876543210"  ← 두 번째 광고 단위 ID
```

#### 📍 위치 3: SEO 콘텐츠 중간 (라인 ~424)

```html
data-ad-slot="1122334455"  ← 세 번째 광고 단위 ID
```

---

## 🚀 배포 및 확인

### Step 1: 코드 커밋 및 푸시

```bash
git add views/index.ejs
git commit -m "Update AdSense ad slots with real IDs"
git push origin main
```

### Step 2: Cloudflare Pages 자동 배포 대기

- Cloudflare Pages가 자동으로 빌드 및 배포
- 보통 2-5분 소요

### Step 3: 실제 사이트에서 확인

1. https://timeism.com 접속
2. 개발자 도구 열기 (F12)
3. Console 탭에서 에러 확인
4. 광고 영역 확인 (처음엔 빈 공간일 수 있음)

### Step 4: AdSense 대시보드 확인

- AdSense → 사이트 → 사이트별 광고
- "광고 게재 중" 상태 확인
- 24시간 후 수익 확인 가능

---

## ⚠️ 주의사항

### 1. 로컬 환경에서는 광고 안 보임

```
❌ http://localhost:3000  → 광고 표시 안 됨
✅ https://timeism.com    → 광고 표시됨
```

### 2. 광고 표시까지 시간 소요

- 첫 광고 표시: **최대 24시간**
- 처음엔 빈 공간으로 보일 수 있음
- 인내심을 가지고 기다리세요!

### 3. 정책 준수 필수

**절대 금지:**
- ❌ 자신의 광고 클릭
- ❌ "광고 클릭하세요" 같은 유도
- ❌ 광고 위치 조작 (이미 적절히 배치됨)

**권장 사항:**
- ✅ 광고와 콘텐츠 명확히 구분 (이미 "Advertisement" 라벨 있음)
- ✅ 사용자 경험 우선
- ✅ 정기적으로 정책 확인

---

## 🐛 문제 해결

### 문제 1: 광고가 표시되지 않아요

**확인 사항:**
1. AdSense 계정 승인 완료?
2. `data-ad-slot` 값 정확히 입력?
3. 실제 도메인에서 확인? (localhost 아님)
4. 24시간 이상 대기?
5. 광고 차단 프로그램 비활성화?

**해결 방법:**
```javascript
// Console에서 확인
console.log(window.adsbygoogle);  // 배열이어야 함
```

### 문제 2: 광고 크기가 이상해요

**CSS 확인:**
```css
/* ad-banners.css */
.adsbygoogle {
    min-height: 90px;    ← 너무 작으면 증가
    max-height: 280px;   ← 너무 크면 감소
}
```

### 문제 3: 수익이 너무 적어요

**개선 방법:**
1. 트래픽 증가 (SEO 최적화)
2. 광고 위치 조정 (A/B 테스트)
3. 콘텐츠 품질 향상
4. 사용자 체류 시간 증가

---

## 📊 예상 수익

### 트래픽별 예상 월 수익 (USD)

| 일 방문자 | 페이지뷰 | 광고 노출 | 예상 수익 |
|----------|---------|---------|----------|
| 100명 | 300 | 900 | $5-15 |
| 500명 | 1,500 | 4,500 | $30-80 |
| 1,000명 | 3,000 | 9,000 | $60-150 |
| 5,000명 | 15,000 | 45,000 | $300-800 |
| 10,000명 | 30,000 | 90,000 | $600-1,500 |

**계산 기준:**
- 페이지뷰당 3개 광고 노출
- CTR (클릭률): 1-3%
- CPC (클릭당 비용): $0.20-0.50

---

## ✅ 체크리스트

승인 후 다음을 순서대로 진행하세요:

- [ ] AdSense 계정 승인 완료
- [ ] 광고 단위 3개 생성 완료
- [ ] 각 광고 단위의 `data-ad-slot` ID 복사
- [ ] `views/index.ejs` 파일에서 3곳 수정
- [ ] Git 커밋 및 푸시
- [ ] Cloudflare Pages 배포 확인
- [ ] 실제 사이트에서 광고 확인
- [ ] 24시간 후 AdSense 대시보드 확인

---

## 📚 참고 자료

- [Google AdSense 고객센터](https://support.google.com/adsense)
- [AdSense 정책](https://support.google.com/adsense/answer/48182)
- [광고 크기 가이드](https://support.google.com/adsense/answer/6002621)
- [반응형 광고 설정](https://support.google.com/adsense/answer/3213689)

---

## 🎉 완료!

AdSense 승인만 받으면 **`data-ad-slot` 값 3개만 변경**하면 끝입니다!

궁금한 점이 있으면 언제든지 문의하세요! 💰
