/**
 * 서버 시간 측정 모듈
 * HTTP Date 헤더 + RTT 보정
 */

const { assertUrlIsSafe, UrlSafetyError } = require('./ssrf');

const REQUEST_TIMEOUT_MS = 3000;  // 3초 타임아웃
const MAX_REDIRECTS = 3;          // 최대 리다이렉트 3회
const REDIRECT_STATUS = new Set([301, 302, 303, 307, 308]);

// 리다이렉트 추적하며 HTTP 요청
async function requestWithRedirects(initialUrl, options) {
  let currentUrl = initialUrl;
  let redirects = 0;

  while (redirects <= MAX_REDIRECTS) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let response;
    try {
      response = await fetch(currentUrl.toString(), {
        ...options,
        redirect: 'manual',
        signal: controller.signal
      });
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new UrlSafetyError('TIMEOUT', 'Request to target timed out.');
      }
      throw new UrlSafetyError('TIME_UNAVAILABLE', err.message);
    } finally {
      clearTimeout(timeout);
    }

    // 리다이렉트 처리
    if (REDIRECT_STATUS.has(response.status)) {
      const location = response.headers.get('location');
      response.body?.cancel();

      if (!location) {
        throw new UrlSafetyError('TIME_UNAVAILABLE', 'Redirect response missing location header.');
      }
      if (redirects === MAX_REDIRECTS) {
        throw new UrlSafetyError('TIME_UNAVAILABLE', 'Too many redirects when fetching target URL.');
      }

      const nextUrl = new URL(location, currentUrl);
      await assertUrlIsSafe(nextUrl.toString());
      currentUrl = nextUrl;
      redirects += 1;
      continue;
    }

    return { response, finalUrl: currentUrl };
  }

  throw new UrlSafetyError('TIME_UNAVAILABLE', 'Too many redirects when fetching target URL.');
}

// RTT 보정된 서버 시간 계산
// 알고리즘: server_time + (RTT / 2)
function computeTimeResult(dateHeader, tStart, tEnd) {
  const serverUtc = new Date(dateHeader);

  if (Number.isNaN(serverUtc.getTime())) {
    throw new UrlSafetyError('TIME_UNAVAILABLE', 'Invalid Date header received from target server.');
  }

  const rttMs = tEnd - tStart;
  const serverTimeEstimatedEpochMs = serverUtc.getTime() + rttMs / 2;

  return {
    serverTimeUtcIso: serverUtc.toISOString(),
    serverTimeEstimatedEpochMs,
    rttMs
  };
}

// 서버 시간 측정 (단일 측정)
async function measureServerTimeSingle(targetUrl) {
  const { url } = await assertUrlIsSafe(targetUrl);

  let lastError;

  // 1. HEAD 요청 시도
  try {
    const headStart = Date.now();
    const { response } = await requestWithRedirects(url, { method: 'HEAD' });
    const headEnd = Date.now();

    const dateHeader = response.headers.get('date');
    response.body?.cancel();

    if (dateHeader) {
      return computeTimeResult(dateHeader, headStart, headEnd);
    }

    lastError = new UrlSafetyError('TIME_UNAVAILABLE', 'Date header missing in HEAD response.');
  } catch (err) {
    lastError = err instanceof UrlSafetyError ? err : new UrlSafetyError('TIME_UNAVAILABLE', err.message);
  }

  // 2. GET Range 요청 (폴백)
  const getStart = Date.now();
  const { response } = await requestWithRedirects(url, {
    method: 'GET',
    headers: { Range: 'bytes=0-0' }
  });
  const getEnd = Date.now();

  const dateHeader = response.headers.get('date');
  response.body?.cancel();

  if (!dateHeader) {
    throw lastError instanceof UrlSafetyError
      ? lastError
      : new UrlSafetyError('TIME_UNAVAILABLE', 'Target server did not provide a Date header.');
  }

  return computeTimeResult(dateHeader, getStart, getEnd);
}

// 대기 함수
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 서버 시간 측정 (5회 측정 + 최소값)
async function measureServerTime(targetUrl) {
  const SAMPLES = 5;        // 측정 횟수
  const DELAY_MS = 100;     // 측정 간격 (0.1초)

  const results = [];

  // 5회 측정
  for (let i = 0; i < SAMPLES; i++) {
    const result = await measureServerTimeSingle(targetUrl);
    results.push(result);

    // 마지막 측정이 아니면 대기
    if (i < SAMPLES - 1) {
      await sleep(DELAY_MS);
    }
  }

  // RTT 기준으로 정렬 (오름차순)
  results.sort((a, b) => a.rttMs - b.rttMs);

  // 최소값 선택 (RTT가 가장 작은 = 가장 정확한 측정)
  return results[0];
}

module.exports = {
  measureServerTime
};
