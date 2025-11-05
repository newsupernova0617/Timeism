/**
 * Session Module
 * 세션 및 사용자 추적 관련 함수
 */

const SESSION_STORAGE_KEY = 'timecheck.session';
const API_BASE = '/api';

export function createSession() {
  let sessionState = loadSessionState();

  function loadSessionState() {
    try {
      const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (err) {
      console.warn('Failed to read session from storage:', err);
    }
    return {
      userId: createId('user'),
      sessionId: createId('sess'),
      startedAt: Date.now(),
      lastSyncedAt: 0
    };
  }

  function persistSessionState() {
    try {
      window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionState));
    } catch (err) {
      console.warn('Failed to persist session state:', err);
    }
  }

  function createId(prefix) {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
    }
    return `${prefix}_${Math.random().toString(36).slice(2, 14)}`;
  }

  async function initSession() {
    const payload = {
      user_id: sessionState.userId,
      session_id: sessionState.sessionId,
      user_agent: navigator.userAgent,
      region: Intl.DateTimeFormat().resolvedOptions().timeZone || navigator.language,
      device_type: detectDeviceType()
    };

    try {
      const response = await fetch(`${API_BASE}/session-init`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        const body = await response.json();
        sessionState.userId = body.user_id || sessionState.userId;
        sessionState.sessionId = body.session_id || sessionState.sessionId;
        sessionState.lastSyncedAt = Date.now();
        persistSessionState();
      }
    } catch (err) {
      console.warn('Session initialization failed:', err);
    } finally {
      // 페이지 로드 성능 메트릭 수집
      const perfData = getPageLoadMetrics();
      sendEvent('view_time', perfData);
    }
  }

  function getPageLoadMetrics() {
    try {
      // Navigation Timing API를 사용하여 성능 메트릭 수집
      const navTiming = performance.getEntriesByType('navigation')[0];
      const paintEntries = performance.getEntriesByType('paint');

      if (navTiming) {
        const pageLoadTime = Math.round(navTiming.loadEventEnd - navTiming.fetchStart);
        const domReadyTime = Math.round(navTiming.domContentLoadedEventEnd - navTiming.fetchStart);
        const firstPaint = paintEntries.find((p) => p.name === 'first-paint');
        const firstContentfulPaint = paintEntries.find((p) => p.name === 'first-contentful-paint');

        return {
          page_load_time_ms: pageLoadTime > 0 ? pageLoadTime : undefined,
          dom_ready_time_ms: domReadyTime > 0 ? domReadyTime : undefined,
          first_paint_ms: firstPaint ? Math.round(firstPaint.startTime) : undefined,
          first_contentful_paint_ms: firstContentfulPaint ? Math.round(firstContentfulPaint.startTime) : undefined
        };
      }
    } catch (err) {
      console.debug('Failed to collect page load metrics:', err);
    }
    return {};
  }

  function detectDeviceType() {
    const ua = navigator.userAgent.toLowerCase();
    if (/tablet|ipad/.test(ua)) {
      return 'tablet';
    }
    if (/mobile|iphone|android/.test(ua)) {
      return 'mobile';
    }
    return 'desktop';
  }

  async function sendEvent(eventType, extra = {}) {
    const payload = {
      session_id: sessionState.sessionId,
      event_type: eventType,
      ...extra
    };

    try {
      await fetch(`${API_BASE}/log-event`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
    } catch (err) {
      console.warn('Failed to send event log:', err);
    }
  }

  return {
    state: sessionState,
    init: initSession,
    sendEvent
  };
}
