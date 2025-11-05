/**
 * API Module
 * 백엔드 API 통신 관련 함수
 */

const API_BASE = '/api';

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
  function handleSubmit(event) {
    event.preventDefault();
    const targetUrl = urlInput.value.trim();
    if (!validateUrl(targetUrl)) {
      showError('http:// 또는 https:// 로 시작하는 올바른 주소를 입력해주세요.');
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
      const latencyMs = Math.round(performance.now() - startTime);

      if (!response.ok || payload.error) {
        const message = payload?.message || '해당 서버의 시간을 확인할 수 없습니다.';
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

      if (onTimeResult) {
        onTimeResult(payload);
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

      handleApiError('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
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
    if (state) {
      checkButton.disabled = true;
      checkButton.textContent = '확인 중...';
      serverTimeEl.textContent = '측정 중…';
      serverTimeEl.classList.add('skeleton');
      serverTimeEl.setAttribute('aria-busy', 'true');
      if (clockMeta) {
        clockMeta.textContent = '';
      }
      clockBlock?.setAttribute('data-state', 'loading');
      clockBlock?.setAttribute('aria-busy', 'true');
    } else {
      checkButton.disabled = false;
      checkButton.textContent = '시간 확인';
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
