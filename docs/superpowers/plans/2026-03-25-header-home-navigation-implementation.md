# SyncTime 헤더 홈 네비게이션 버튼 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 헤더의 제목과 부제목을 클릭 가능한 홈 네비게이션 버튼으로 변환하여, 모든 페이지에서 해당 언어의 홈으로 이동할 수 있게 함.

**Architecture:** EJS 템플릿에서 제목/부제목을 `<a>` 태그로 감싸고, CSS에 호버 효과와 포커스 스타일을 추가합니다. `locale` 변수는 미들웨어에서 이미 제공되므로 추가 백엔드 변경은 필요 없습니다.

**Tech Stack:** EJS 템플릿, CSS3 (transition, opacity, focus-visible)

---

## 파일 구조

**Modify:**
- `views/partials/header.ejs` - 제목/부제목을 `<a>` 태그로 감싸기
- `public/css/style.css` - `.header-link` CSS 규칙 추가

**No files created**

---

## 태스크 분해

### Task 1: 헤더 템플릿 수정 (HTML)

**Files:**
- Modify: `views/partials/header.ejs:1-24`

- [ ] **Step 1: 현재 헤더 파일 확인**

파일 경로: `views/partials/header.ejs`

현재 구조 (라인 1-10):
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
```

- [ ] **Step 2: 제목/부제목을 `<a>` 태그로 감싸기**

변경 후:
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
```

완전한 파일 내용:
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
            <% const currentPath=typeof originalUrl !=='undefined' ? originalUrl : '/' ; %>
                <% const basePath=currentPath.replace(/^\/(en|ko|jp|zh-tw)/, '' ); %>
                    <a href="/en<%= basePath %>" class="lang-btn <%= locale === 'en' ? 'active' : '' %>"
                        title="English">EN</a>
                    <a href="/ko<%= basePath %>" class="lang-btn <%= locale === 'ko' ? 'active' : '' %>"
                        title="한국어">KO</a>
                    <a href="/jp<%= basePath %>" class="lang-btn <%= locale === 'jp' ? 'active' : '' %>"
                        title="日本語">JP</a>
                    <a href="/zh-tw<%= basePath %>" class="lang-btn <%= locale === 'zh-tw' ? 'active' : '' %>"
                        title="繁體中文">TW</a>
        </div>
    </div>
</header>
```

- [ ] **Step 3: 파일 저장 및 확인**

저장 후, 파일이 올바르게 수정되었는지 확인:
```bash
head -15 views/partials/header.ejs
```

Expected output:
```
<header class="page-header">
    <div class="header-content">
        <a href="/<%= locale %>/" class="header-link">
            <div class="header-text">
                <h1>
                    <%= translations.header.title %>
```

- [ ] **Step 4: Commit**

```bash
git add views/partials/header.ejs
git commit -m "feat: wrap header title and subtitle in home navigation link"
```

---

### Task 2: CSS 스타일 추가

**Files:**
- Modify: `public/css/style.css`

- [ ] **Step 1: style.css 열기 및 위치 확인**

파일 경로: `public/css/style.css`

현재 헤더 관련 CSS가 있는 위치를 확인:
```bash
grep -n "page-header {" public/css/style.css | head -1
```

Expected: 첫 번째 `.page-header` 규칙의 라인 번호 (약 35번)

- [ ] **Step 2: 헤더 규칙 직후에 CSS 추가**

`.page-header` 규칙 직후 (약 46번 라인 근처)에 다음 CSS를 추가:

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

정확한 위치 찾기:
```bash
grep -n "^\}" public/css/style.css | head -3
```

`.page-header` 블록이 끝나는 위치를 찾아서, 그 직후에 위의 CSS를 추가합니다.

- [ ] **Step 3: 파일 저장 및 문법 확인**

저장 후, CSS가 올바르게 추가되었는지 확인:
```bash
grep -A 5 "\.header-link {" public/css/style.css
```

Expected output:
```
.header-link {
  display: block;
  text-decoration: none;
  color: inherit;
  cursor: pointer;
  transition: opacity 0.2s ease;
}
```

- [ ] **Step 4: Commit**

```bash
git add public/css/style.css
git commit -m "style: add header link hover and focus styles"
```

---

### Task 3: 로컬 테스트 및 검증

**Files:**
- Test: 수동 테스트 (아래 항목 확인)

- [ ] **Step 1: 개발 서버 실행 (필요시)**

아직 서버가 실행 중이지 않다면:
```bash
npm run dev
# 또는
npm start
```

예상: 서버가 http://localhost:3000 에서 실행 시작

- [ ] **Step 2: 각 언어별 인덱스 페이지에서 헤더 클릭 테스트**

브라우저에서 다음 URL 방문 및 헤더 클릭 테스트:

1. **한국어**: http://localhost:3000/ko/
   - 헤더("SyncTime" + 부제목) 클릭
   - 페이지 이동 안함 (이미 `/ko/` 에 있음)
   - 마우스 호버 시 불투명도 감소 확인

2. **영어**: http://localhost:3000/en/
   - 헤더 클릭
   - 페이지 이동 안함
   - 호버 효과 확인

3. **일본어**: http://localhost:3000/jp/
   - 헤더 클릭
   - 페이지 이동 안함
   - 호버 효과 확인

4. **중국어(대만)**: http://localhost:3000/zh-tw/
   - 헤더 클릭
   - 페이지 이동 안함
   - 호버 효과 확인

- [ ] **Step 3: 다른 페이지에서 언어 간 이동 테스트**

1. **한국어 가이드에서 한국어 홈으로**:
   - URL: http://localhost:3000/ko/guide
   - 헤더 클릭
   - 예상: `/ko/` 로 이동

2. **영어 개인정보 페이지에서 영어 홈으로**:
   - URL: http://localhost:3000/en/privacy
   - 헤더 클릭
   - 예상: `/en/` 로 이동

3. **일본어 블로그에서 일본어 홈으로**:
   - URL: http://localhost:3000/jp/blog
   - 헤더 클릭
   - 예상: `/jp/` 로 이동

- [ ] **Step 4: 호버 및 포커스 효과 검증**

1. **마우스 호버**:
   - 헤더 위에 마우스를 올리면 불투명도가 감소해야 함
   - 커서가 포인터(손가락 모양)로 변해야 함

2. **키보드 포커스**:
   - Tab 키로 헤더 링크에 포커스
   - 2px 파란색 outline과 border-radius 가 표시되어야 함
   - 마우스로 클릭한 후 focus 되지 않아야 함 (`:focus:not(:focus-visible)`)

- [ ] **Step 5: 크로스 브라우저 확인 (옵션)**

다음 브라우저에서도 동일하게 작동하는지 확인:
- Chrome/Edge
- Firefox
- Safari (경우에 따라)

기본 확인사항:
- 헤더가 클릭 가능한가?
- 호버 효과가 있는가?
- 포커스 인디케이터가 있는가?

- [ ] **Step 6: 기존 기능 확인**

다음 기능들이 여전히 정상 작동하는지 확인:
- 언어 전환 버튼 (EN, KO, JP, TW) 정상 작동
- 서버 시간 확인 폼 정상 작동
- 다른 페이지 링크(가이드, 블로그 등) 정상 작동

- [ ] **Step 7: 결과 기록**

테스트 결과를 간단히 정리 (모두 패스된 경우):
```
✅ 한국어 홈: 헤더 클릭 → 페이지 이동 없음 (이미 /ko/)
✅ 영어 홈: 헤더 클릭 → 페이지 이동 없음 (이미 /en/)
✅ 한국어 가이드: 헤더 클릭 → /ko/ 이동
✅ 영어 개인정보: 헤더 클릭 → /en/ 이동
✅ 호버 효과: 불투명도 감소 확인
✅ 포커스 인디케이터: 파란색 outline 확인
✅ 기존 기능: 모두 정상 작동
```

---

## 예상 소요 시간

- Task 1 (HTML): 3-5분
- Task 2 (CSS): 2-3분
- Task 3 (테스트): 5-10분
- **총 시간**: 10-20분

---

## 롤백 방법

문제 발생 시:
```bash
git revert HEAD~1  # 마지막 커밋 되돌리기
# 또는
git reset --hard HEAD~2  # 2개 커밋 되돌리기
```

---

## 체크리스트

- [ ] Task 1: 헤더 템플릿 수정 완료
- [ ] Task 2: CSS 스타일 추가 완료
- [ ] Task 3: 수동 테스트 완료 (모든 체크 항목 통과)
- [ ] 모든 커밋 푸시 (원격 저장소)
