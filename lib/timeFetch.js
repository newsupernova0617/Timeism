const { assertUrlIsSafe, UrlSafetyError } = require('./ssrf');

const REQUEST_TIMEOUT_MS = 3000;
const MAX_REDIRECTS = 3;

const REDIRECT_STATUS = new Set([301, 302, 303, 307, 308]);

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

async function measureServerTime(targetUrl) {
  const { url } = await assertUrlIsSafe(targetUrl);

  let lastError;

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

  const getStart = Date.now();
  const { response } = await requestWithRedirects(url, {
    method: 'GET',
    headers: {
      Range: 'bytes=0-0'
    }
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

module.exports = {
  measureServerTime
};
