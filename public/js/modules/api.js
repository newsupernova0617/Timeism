/**
 * API Module
 * 백엔드 API 통신 관련 함수
 */

const API_BASE = '/api';

// 다국어 메시지
function getMessages() {
  const lang = document.documentElement.lang || 'ko';
  const isKorean = lang === 'ko';

  return {
    invalidUrl: isKorean
      ? '올바른 URL을 입력해주세요. (예: google.com 또는 https://google.com)'
      : 'Please enter a valid URL (e.g., google.com or https://google.com)',
    serverTimeError: isKorean
      ? '해당 서버의 시간을 확인할 수 없습니다.'
      : 'Unable to check the server time.',
    networkError: isKorean
      ? '네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
      : 'A network error occurred. Please try again later.',
    checking: isKorean ? '확인 중...' : 'Checking...',
    measuring: isKorean ? '측정 중…' : 'Measuring…',
    checkTime: isKorean ? '시간 확인' : 'Check Time'
  };
}

export function createApi({
  form,
  urlInput,
  checkButton,
  formErrorEl,
  serverTimeEl,
  clockMeta,
  clockBlock,
  onTimeResult,
  onApiError,
  sendEvent
}) {
  /**
   * URL 정규화 함수
   * 프로토콜이 없는 URL에 자동으로 https:// 또는 http:// 추가
   * @param {string} input - 사용자 입력 URL
   * @returns {string} 정규화된 URL
   */
  function normalizeUrl(input) {
    let url = input.trim();

    // 이미 프로토콜이 있으면 그대로 반환
    if (/^https?:\/\//i.test(url)) {
      return url;
    }

    // localhost 또는 127.0.0.1은 http로 처리
    if (url.startsWith('localhost') || url.startsWith('127.0.0.1')) {
      return 'http://' + url;
    }

    // 그 외의 경우 https 적용
    return 'https://' + url;
  }

  function handleSubmit(event) {
    event.preventDefault();
    let targetUrl = urlInput.value.trim();

    // URL 정규화 (프로토콜 자동 추가)
    targetUrl = normalizeUrl(targetUrl);

    // 정규화된 URL을 입력 필드에 반영
    urlInput.value = targetUrl;

    if (!validateUrl(targetUrl)) {
      showError(getMessages().invalidUrl);
      return;
    }
    urlInput.removeAttribute('aria-invalid');
    requestServerTime(targetUrl);
  }

  async function requestServerTime(targetUrl) {
    clearError();
    setLoading(true);

    const startTime = performance.now();

    try {
      const response = await fetch(`${API_BASE}/check-time`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ target_url: targetUrl })
      });
      const payload = await response.json();
      const endTime = performance.now();  // JSON 파싱 후 측정
      const latencyMs = Math.round(endTime - startTime);

      if (!response.ok || payload.error) {
        const message = payload?.message || getMessages().serverTimeError;
        const errorType = payload?.error || 'UNKNOWN_ERROR';

        // 오류 추적
        sendEvent('check_time_error', {
          target_url: targetUrl,
          error_type: errorType,
          latency_ms: latencyMs,
          status_code: response.status
        });

        handleApiError(message);
        return;
      }

      // RTT/2 보정: 클라이언트-서버 네트워크 지연 보정
      const clientRTT = endTime - startTime;
      const adjustedPayload = {
        ...payload,
        server_time_estimated_epoch_ms: payload.server_time_estimated_epoch_ms + (clientRTT / 2),
        client_rtt_ms: clientRTT  // 디버깅용
      };

      if (onTimeResult) {
        onTimeResult(adjustedPayload, endTime);
      }

      // 성공 이벤트 (성능 메트릭 포함)
      sendEvent('click_button', {
        target_url: targetUrl,
        latency_ms: latencyMs,
        status: 'success'
      });
    } catch (err) {
      const latencyMs = Math.round(performance.now() - startTime);

      // 네트워크 오류 추적
      sendEvent('network_error', {
        target_url: targetUrl,
        error_type: err.name || 'UNKNOWN',
        error_message: err.message,
        latency_ms: latencyMs
      });

      handleApiError(getMessages().networkError);
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function validateUrl(value) {
    if (!value) {
      return false;
    }
    return /^https?:\/\//i.test(value);
  }

  function showError(message) {
    formErrorEl.classList.add('alert');
    formErrorEl.textContent = message;
    urlInput.setAttribute('aria-invalid', 'true');
    urlInput.focus();
  }

  function clearError() {
    formErrorEl.classList.remove('alert');
    formErrorEl.textContent = '';
    urlInput.removeAttribute('aria-invalid');
  }

  function handleApiError(message) {
    showError(message);
    if (onApiError) {
      onApiError();
    }
  }

  function setLoading(state) {
    const messages = getMessages();

    if (state) {
      checkButton.disabled = true;
      checkButton.textContent = messages.checking;
      serverTimeEl.textContent = messages.measuring;
      serverTimeEl.classList.add('skeleton');
      serverTimeEl.setAttribute('aria-busy', 'true');
      if (clockMeta) {
        clockMeta.textContent = '';
      }
      clockBlock?.setAttribute('data-state', 'loading');
      clockBlock?.setAttribute('aria-busy', 'true');
    } else {
      checkButton.disabled = false;
      checkButton.textContent = messages.checkTime;
      serverTimeEl.classList.remove('skeleton');
      serverTimeEl.removeAttribute('aria-busy');
      clockBlock?.removeAttribute('data-state');
      clockBlock?.removeAttribute('aria-busy');
    }
  }

  function init() {
    if (form) {
      form.addEventListener('submit', handleSubmit);
    }
  }

  return {
    init
  };
}
