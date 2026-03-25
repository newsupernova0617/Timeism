# SyncTime 헤더를 홈 네비게이션 버튼으로 변환 설계서

**작성일**: 2026-03-25
**상태**: 설계 승인 완료
**범위**: 프론트엔드 UI/UX 개선

---

## 개요

페이지 헤더의 "SyncTime" 제목과 부제목을 클릭 가능한 홈 네비게이션 버튼으로 변환합니다. 사용자가 어느 페이지에서든 헤더를 클릭하면 현재 언어의 홈(`/locale/`)으로 이동합니다.

---

## 요구사항

### 기능 요구사항
- 헤더의 제목과 부제목 영역이 클릭 가능해야 함
- 클릭 시 현재 언어의 홈으로 이동
  - `/ko/guide` → `/ko/` (한국어)
  - `/en/privacy` → `/en/` (영어)
  - `/jp/about` → `/jp/` (일본어)
  - `/zh-tw/contact` → `/zh-tw/` (중국어)

### 디자인 요구사항
- 현재 제목 스타일 유지
- 호버 시 시각적 피드백 (불투명도 변경)
- 마우스 커서가 포인터로 변함
- 모든 페이지에서 동일하게 작동

### 접근성 요구사항
- 시맨틱한 링크 구조 유지
- 키보드 포커스 인디케이터 제공
- 스크린 리더 호환성

---

## 설계

### 파일 변경 사항

#### 1. `views/partials/header.ejs` (HTML 구조)

**변경 전:**
```html
<header class="page-header">
    <div class="header-content">
        <div class="header-text">
            <h1>
                <%= translations.header.title %>
            </h1>
            <p class="subtitle">
                <%= translations.header.subtitle %>
            </p>
        </div>
        <div class="language-switcher">
            <!-- ... -->
        </div>
    </div>
</header>
```

**변경 후:**
```html
<header class="page-header">
    <div class="header-content">
        <a href="/<%= locale %>/" class="header-link">
            <div class="header-text">
                <h1>
                    <%= translations.header.title %>
                </h1>
                <p class="subtitle">
                    <%= translations.header.subtitle %>
                </p>
            </div>
        </a>
        <div class="language-switcher">
            <!-- ... -->
        </div>
    </div>
</header>
```

**변경 설명:**
- `<a>` 태그로 제목과 부제목 영역을 감싸기
- `href` 속성에 EJS 템플릿 변수 `locale` 사용
- 기존 `.header-text` div를 그대로 유지하여 레이아웃 변경 최소화

#### 2. CSS 스타일 추가

스타일 파일(예: `public/css/style.css`)에 다음 CSS 규칙 추가:

```css
/* 헤더 네비게이션 링크 */
.header-link {
  display: block;
  text-decoration: none;
  color: inherit;
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.header-link:hover {
  opacity: 0.8;
}

.header-link:focus {
  outline: 2px solid var(--color-focus, #4a90e2);
  outline-offset: 2px;
  border-radius: 4px;
}

.header-link:focus:not(:focus-visible) {
  outline: none;
}
```

**스타일 설명:**
- `display: block`: 링크가 전체 영역을 차지하도록
- `text-decoration: none`: 기본 링크 언더라인 제거
- `color: inherit`: 기존 텍스트 색상 유지
- `cursor: pointer`: 마우스 호버 시 포인터 커서 표시
- `transition`: 부드러운 호버 효과
- `opacity: 0.8`: 호버 시 불투명도 감소로 시각적 피드백
- `focus` 스타일: 접근성을 위한 포커스 인디케이터

---

## 기술 세부사항

### locale 변수 가용성

EJS 템플릿에서 `locale` 변수는 `app.js`의 다국어 미들웨어에서 이미 설정되어 있습니다:

```javascript
app.use((req, res, next) => {
  const locale = i18n.detectLocale(req);
  res.locals.locale = locale;  // ← 이미 설정됨
  // ...
});
```

따라서 별도의 추가 작업 없이 EJS 템플릿에서 `<%= locale %>` 직접 사용 가능합니다.

### 경로 예시

| 현재 페이지 | locale | 이동 경로 |
|----------|--------|---------|
| `/ko/guide` | `ko` | `/ko/` |
| `/en/privacy` | `en` | `/en/` |
| `/jp/about` | `jp` | `/jp/` |
| `/zh-tw/contact` | `zh-tw` | `/zh-tw/` |

---

## 영향 범위

### 변경되는 부분
- 헤더 부분의 제목과 부제목이 하이퍼링크로 변환
- 호버 시 불투명도 감소 (시각적 피드백)

### 영향받는 페이지
- 모든 페이지 (헤더는 모든 페이지에 포함됨)
  - 인덱스 페이지
  - 가이드 페이지
  - 블로그 페이지
  - 개인정보 보호 정책
  - 약관 등

### 기존 기능 유지
- 언어 전환 버튼: 영향 없음
- 다른 네비게이션: 영향 없음
- 서버 시간 확인 기능: 영향 없음

---

## 테스트 계획

### 수동 테스트
1. 각 언어별 페이지(`/ko/`, `/en/`, `/jp/`, `/zh-tw/`)에서 헤더 클릭
2. 해당 언어의 홈 페이지로 정상 이동 확인
3. 부제목 포함 영역 클릭 시에도 정상 이동 확인
4. 호버 시 불투명도 감소 시각적 효과 확인

### 크로스 브라우저 테스트
- Chrome/Edge (Chromium)
- Firefox
- Safari

### 접근성 테스트
- 키보드 탭 네비게이션: 포커스 인디케이터 확인
- 스크린 리더(NVDA, JAWS): 링크로 인식되는지 확인

---

## 롤백 계획

변경 내용이 매우 제한적이므로 필요한 경우 간단히 되돌릴 수 있습니다:
- `<a>` 태그 제거
- CSS 규칙 제거

---

## 우선순위 및 일정

- **우선순위**: 낮음 (선택적 개선 기능)
- **예상 구현 시간**: 15-20분
- **복잡도**: 매우 낮음

---

## 승인 상태

- ✅ 설계 승인: 2026-03-25
- 대기 중: 구현 계획 작성
