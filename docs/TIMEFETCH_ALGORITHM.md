# lib/timeFetch.js 알고리즘 분석 보고서

> 작성일: 2026-01-05  
> 파일: lib/timeFetch.js  
> 라인 수: 133줄

---

## 📋 목차

1. [모듈 개요](#-모듈-개요)
2. [핵심 알고리즘](#-핵심-알고리즘)
3. [함수별 상세 분석](#-함수별-상세-분석)
4. [RTT 보정 원리](#-rtt-보정-원리)
5. [에러 처리 전략](#-에러-처리-전략)
6. [성능 분석](#-성능-분석)
7. [개선 제안](#-개선-제안)

---

## 🎯 모듈 개요

### 목적
HTTP Date 헤더를 사용하여 원격 서버의 시간을 측정하고, 네트워크 왕복 시간(RTT)을 보정하여 정확한 서버 시간을 추정합니다.

### 핵심 기능
1. **리다이렉트 추적**: 최대 3회까지 자동 추적
2. **SSRF 방어**: 모든 단계에서 URL 검증
3. **타임아웃 처리**: 3초 제한
4. **폴백 전략**: HEAD 실패 시 GET Range 시도
5. **RTT 보정**: 네트워크 지연 보정

### 의존성
```javascript
ssrf.js  // SSRF 방어 (assertUrlIsSafe, UrlSafetyError)
```

---

## 🧮 핵심 알고리즘

### 1. RTT 보정 알고리즘

#### 기본 원리
```
클라이언트 시각: t1 (요청 시작)
서버 시각:     ts (Date 헤더)
클라이언트 시각: t2 (응답 수신)

RTT = t2 - t1
추정 서버 시각 = ts + (RTT / 2)
```

#### 가정
- 요청 전송 시간 = 응답 수신 시간 (대칭적)
- 네트워크 지연이 균등하게 분포

#### 수식
```javascript
const rttMs = tEnd - tStart;
const serverTimeEstimatedEpochMs = serverUtc.getTime() + rttMs / 2;
```

---

### 2. 측정 전략 (폴백 패턴)

```
┌─────────────────────────────────────┐
│  1. SSRF 검증                        │
│     assertUrlIsSafe(targetUrl)      │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  2. HEAD 요청 시도                   │
│     - 가볍고 빠름                    │
│     - Date 헤더 확인                 │
└──────────────┬──────────────────────┘
               │
         ┌─────┴─────┐
         │           │
    Date 있음    Date 없음
         │           │
         ▼           ▼
    ┌────────┐  ┌──────────────────────┐
    │ 성공   │  │ 3. GET Range 요청     │
    │ 반환   │  │    bytes=0-0          │
    └────────┘  └──────┬───────────────┘
                       │
                 ┌─────┴─────┐
                 │           │
            Date 있음    Date 없음
                 │           │
                 ▼           ▼
            ┌────────┐  ┌────────┐
            │ 성공   │  │ 실패   │
            │ 반환   │  │ 에러   │
            └────────┘  └────────┘
```

---

## 🔍 함수별 상세 분석

### 1. requestWithRedirects()

**목적**: 리다이렉트를 추적하며 HTTP 요청 수행

#### 알고리즘
```javascript
입력: initialUrl, options
출력: { response, finalUrl }

1. currentUrl = initialUrl
2. redirects = 0

3. WHILE redirects <= MAX_REDIRECTS:
   a. AbortController 생성 (타임아웃용)
   b. fetch(currentUrl, { redirect: 'manual' })
   c. IF 타임아웃:
      → THROW UrlSafetyError('TIMEOUT')
   
   d. IF 3xx 리다이렉트:
      i.  Location 헤더 확인
      ii. SSRF 재검증
      iii. currentUrl = nextUrl
      iv. redirects++
      v.  CONTINUE
   
   e. RETURN { response, finalUrl }

4. THROW UrlSafetyError('Too many redirects')
```

#### 시간 복잡도
- **최선**: O(1) - 리다이렉트 없음
- **최악**: O(n) - n = MAX_REDIRECTS (3)

#### 공간 복잡도
- O(1) - 상수 공간

---

### 2. computeTimeResult()

**목적**: RTT 보정된 서버 시간 계산

#### 알고리즘
```javascript
입력: dateHeader, tStart, tEnd
출력: { serverTimeUtcIso, serverTimeEstimatedEpochMs, rttMs }

1. serverUtc = new Date(dateHeader)
2. IF serverUtc is invalid:
   → THROW UrlSafetyError('Invalid Date header')

3. rttMs = tEnd - tStart
4. serverTimeEstimatedEpochMs = serverUtc.getTime() + (rttMs / 2)

5. RETURN {
     serverTimeUtcIso: serverUtc.toISOString(),
     serverTimeEstimatedEpochMs,
     rttMs
   }
```

#### RTT 보정 예시
```
tStart = 1000ms
tEnd = 1120ms
serverUtc = "2026-01-05T01:00:00.000Z" (1735948800000ms)

rttMs = 1120 - 1000 = 120ms
보정값 = 120 / 2 = 60ms
추정 서버 시각 = 1735948800000 + 60 = 1735948800060ms
```

#### 시간 복잡도
- O(1) - 상수 시간

---

### 3. measureServerTime()

**목적**: 서버 시간 측정 (메인 함수)

#### 알고리즘
```javascript
입력: targetUrl
출력: { serverTimeUtcIso, serverTimeEstimatedEpochMs, rttMs }

1. SSRF 검증
   url = assertUrlIsSafe(targetUrl)

2. HEAD 요청 시도
   a. tStart = Date.now()
   b. response = requestWithRedirects(url, { method: 'HEAD' })
   c. tEnd = Date.now()
   d. dateHeader = response.headers.get('date')
   e. IF dateHeader exists:
      → RETURN computeTimeResult(dateHeader, tStart, tEnd)
   f. ELSE:
      → lastError = 'Date header missing in HEAD'

3. GET Range 요청 (폴백)
   a. tStart = Date.now()
   b. response = requestWithRedirects(url, {
        method: 'GET',
        headers: { Range: 'bytes=0-0' }
      })
   c. tEnd = Date.now()
   d. dateHeader = response.headers.get('date')
   e. IF dateHeader exists:
      → RETURN computeTimeResult(dateHeader, tStart, tEnd)
   f. ELSE:
      → THROW lastError

4. 에러 처리
   - UrlSafetyError: 그대로 전파
   - 기타 에러: UrlSafetyError로 래핑
```

#### 시간 복잡도
- **최선**: O(1) - HEAD 요청 성공
- **최악**: O(2) - HEAD 실패 + GET 요청

---

## 📊 RTT 보정 원리

### 왜 RTT/2인가?

#### 네트워크 지연 모델
```
클라이언트 → 서버: RTT/2 (요청 전송)
서버 → 클라이언트: RTT/2 (응답 수신)
```

#### 타임라인 분석
```
t1 (클라이언트)  ────┐
                    │ RTT/2 (요청)
                    ▼
ts (서버)           ● Date 헤더 생성
                    │
                    │ RTT/2 (응답)
                    ▼
t2 (클라이언트)  ────┘

실제 서버 시각 ≈ ts + RTT/2
```

#### 수학적 증명
```
t1: 클라이언트 요청 시작 시각
ts: 서버 Date 헤더 생성 시각
t2: 클라이언트 응답 수신 시각

가정: 요청 시간 = 응답 시간 = RTT/2

ts ≈ t1 + RTT/2
현재 시각 ≈ t2 ≈ ts + RTT/2

따라서:
추정 서버 시각 = ts + RTT/2
```

---

### RTT 보정 정확도

#### 오차 요인
1. **비대칭 네트워크**: 업로드 ≠ 다운로드 속도
2. **서버 처리 시간**: Date 헤더 생성 지연
3. **네트워크 큐잉**: 라우터 대기 시간
4. **시계 드리프트**: 클라이언트 시계 부정확

#### 예상 오차 범위
```
로컬 네트워크: ±10ms
국내 서버:    ±50ms
해외 서버:    ±100ms
```

---

## ⚠️ 에러 처리 전략

### 에러 타입별 처리

#### 1. TIMEOUT (504)
```javascript
// AbortController로 3초 타임아웃
if (err.name === 'AbortError') {
  throw new UrlSafetyError('TIMEOUT', 'Request to target timed out.');
}
```

**원인**:
- 서버 응답 지연
- 네트워크 불안정
- 방화벽 차단

---

#### 2. TIME_UNAVAILABLE (502)
```javascript
if (!dateHeader) {
  throw new UrlSafetyError('TIME_UNAVAILABLE', 'Date header missing');
}
```

**원인**:
- 서버가 Date 헤더 미제공
- HEAD/GET 모두 실패
- 비표준 HTTP 서버

---

#### 3. SSRF 관련 (400)
```javascript
await assertUrlIsSafe(nextUrl.toString());
```

**원인**:
- 차단된 IP/호스트
- DNS 조회 실패
- 리다이렉트 루프

---

### 에러 복구 전략

```
HEAD 실패
  ↓
GET Range 시도 (폴백)
  ↓
둘 다 실패
  ↓
마지막 에러 반환
```

---

## ⚡ 성능 분석

### 요청 횟수 분석

#### 시나리오별 요청 수

| 시나리오 | HEAD | GET | 총 요청 | 시간 |
|---------|------|-----|---------|------|
| **최선** | 1 (성공) | 0 | 1 | ~100ms |
| **일반** | 1 (실패) | 1 (성공) | 2 | ~200ms |
| **최악** | 1 + 3 리다이렉트 | 1 + 3 리다이렉트 | 8 | ~800ms |

---

### 네트워크 대역폭

#### HEAD 요청
```
요청: ~200 bytes
응답: ~500 bytes (헤더만)
총:   ~700 bytes
```

#### GET Range 요청
```
요청: ~250 bytes (Range 헤더 포함)
응답: ~501 bytes (헤더 + 1바이트)
총:   ~751 bytes
```

**최적화**: GET Range는 최소 데이터만 전송

---

### 타임아웃 설정

```javascript
const REQUEST_TIMEOUT_MS = 3000;  // 3초
```

**근거**:
- 대부분의 HTTP 요청은 1초 이내
- 3초는 느린 서버도 커버
- 너무 길면 사용자 경험 저하

---

## 🔄 리다이렉트 처리

### 리다이렉트 추적 알고리즘

```javascript
const MAX_REDIRECTS = 3;
const REDIRECT_STATUS = new Set([301, 302, 303, 307, 308]);
```

#### 처리 흐름
```
1. 3xx 응답 감지
   ↓
2. Location 헤더 추출
   ↓
3. SSRF 재검증 ← 중요!
   ↓
4. 리다이렉트 카운터 증가
   ↓
5. 최대 3회까지 반복
```

#### 보안 고려사항
- **매 단계 SSRF 검증**: 리다이렉트로 우회 방지
- **최대 횟수 제한**: 무한 루프 방지
- **상대 URL 처리**: `new URL(location, currentUrl)`

---

## 📈 개선 제안

### 1. 다중 샘플링

**현재**: 1회 측정
**개선**: 3-5회 측정 후 중앙값 사용

```javascript
async function measureServerTimeMultiple(targetUrl, samples = 3) {
  const results = [];
  
  for (let i = 0; i < samples; i++) {
    const result = await measureServerTime(targetUrl);
    results.push(result);
  }
  
  // 중앙값 선택 (이상치 제거)
  results.sort((a, b) => a.rttMs - b.rttMs);
  return results[Math.floor(samples / 2)];
}
```

**효과**: 네트워크 지터 영향 감소

---

### 2. NTP 스타일 알고리즘

**현재**: 단순 RTT/2 보정
**개선**: NTP 알고리즘 적용

```javascript
// NTP 스타일 오프셋 계산
const offset = ((t2 - t1) - (t4 - t3)) / 2;
const delay = (t4 - t1) - (t3 - t2);
```

**필요 조건**: 서버에서 요청 수신/응답 시각 제공

---

### 3. 적응형 타임아웃

**현재**: 고정 3초
**개선**: 지역별 동적 조정

```javascript
const TIMEOUT_MAP = {
  'localhost': 1000,
  'domestic': 2000,
  'international': 5000
};
```

---

### 4. 캐싱

**현재**: 매번 새로 측정
**개선**: 최근 결과 캐싱

```javascript
const cache = new Map();

async function measureServerTimeCached(targetUrl, ttl = 60000) {
  const cached = cache.get(targetUrl);
  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.result;
  }
  
  const result = await measureServerTime(targetUrl);
  cache.set(targetUrl, { result, timestamp: Date.now() });
  return result;
}
```

**효과**: 동일 URL 반복 조회 시 성능 향상

---

### 5. WebSocket 지원

**현재**: HTTP 요청/응답
**개선**: WebSocket으로 실시간 동기화

```javascript
// 지속적인 시간 동기화
const ws = new WebSocket('wss://example.com/time');
ws.onmessage = (event) => {
  const serverTime = JSON.parse(event.data).timestamp;
  updateClock(serverTime);
};
```

---

## 📊 알고리즘 복잡도 요약

| 함수 | 시간 복잡도 | 공간 복잡도 | 네트워크 요청 |
|------|------------|------------|--------------|
| `requestWithRedirects` | O(n) | O(1) | 1-4회 |
| `computeTimeResult` | O(1) | O(1) | 0회 |
| `measureServerTime` | O(1) | O(1) | 1-8회 |

**n**: 리다이렉트 횟수 (최대 3)

---

## 🎯 핵심 특징

### 장점
1. ✅ **간단한 구현**: HTTP Date 헤더만 사용
2. ✅ **폴백 전략**: HEAD 실패 시 GET Range
3. ✅ **SSRF 방어**: 모든 단계에서 검증
4. ✅ **타임아웃 처리**: 3초 제한
5. ✅ **리다이렉트 추적**: 자동 처리

### 단점
1. ❌ **정확도 제한**: ±50-100ms 오차
2. ❌ **단일 샘플**: 네트워크 지터 영향
3. ❌ **비대칭 고려 안 함**: 업로드 ≠ 다운로드
4. ❌ **서버 처리 시간**: Date 생성 지연 미고려

---

## 📝 사용 예시

### 기본 사용
```javascript
const result = await measureServerTime('https://google.com');
console.log(result);
// {
//   serverTimeUtcIso: "2026-01-05T01:15:00.000Z",
//   serverTimeEstimatedEpochMs: 1735948500000,
//   rttMs: 120
// }
```

### 에러 처리
```javascript
try {
  const result = await measureServerTime('https://localhost');
} catch (err) {
  if (err instanceof UrlSafetyError) {
    console.log(err.code);  // 'BLOCKED_HOST'
  }
}
```

---

## 🔬 테스트 케이스

### 1. 정상 케이스
```javascript
// HEAD 요청 성공
URL: https://google.com
예상: 1회 요청, ~100ms, Date 헤더 있음
```

### 2. HEAD 실패 케이스
```javascript
// HEAD 없음, GET Range 성공
URL: https://some-api.com
예상: 2회 요청, ~200ms
```

### 3. 리다이렉트 케이스
```javascript
// 301 리다이렉트
URL: http://google.com → https://google.com
예상: 2회 요청, SSRF 재검증
```

### 4. 에러 케이스
```javascript
// SSRF 차단
URL: http://localhost
예상: UrlSafetyError('BLOCKED_HOST')
```

---

**작성일**: 2026-01-05  
**파일 버전**: 1.0.0  
**작성자**: Timeism Development Team
