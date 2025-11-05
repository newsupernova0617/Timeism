/**
 * Time Display Module
 * 서버 시간 표시 및 시계 업데이트 관련 함수
 */

export function createTimeDisplay({
  serverTimeEl,
  clockMeta,
  clockBlock,
  settings
}) {
  let serverClockBase = null;
  let serverClockStartPerf = null;
  let animationFrameId = null;

  return {
    getServerClockBase: () => serverClockBase,
    setServerClock: (base, startPerf) => {
      serverClockBase = base;
      serverClockStartPerf = startPerf;
    },
    startClockLoop: (onTick) => {
      function tick() {
        if (serverClockBase !== null && serverClockStartPerf !== null) {
          const elapsed = performance.now() - serverClockStartPerf;
          const current = serverClockBase + elapsed;
          serverTimeEl.textContent = formatTimestamp(current, settings);

          // Callback for external listeners (e.g., auto alarm check)
          if (onTick) onTick(current);
        }

        animationFrameId = window.requestAnimationFrame(tick);
      }

      if (animationFrameId === null && typeof window !== 'undefined') {
        animationFrameId = window.requestAnimationFrame(tick);
      }
    },
    applyTimeResult: (result) => {
      const estimatedEpochMs = result.server_time_estimated_epoch_ms;
      if (typeof estimatedEpochMs === 'number' && Number.isFinite(estimatedEpochMs)) {
        serverTimeEl.classList.remove('muted');
        serverTimeEl.textContent = formatTimestamp(estimatedEpochMs, settings);
        serverTimeEl.classList.remove('skeleton');
        if (clockMeta && result.server_time_utc) {
          clockMeta.textContent = formatMetaLine(result.server_time_utc);
        }
      } else {
        serverTimeEl.classList.add('muted');
        serverTimeEl.textContent = '--:--:--.---';
        if (clockMeta) {
          clockMeta.textContent = '';
        }
      }
    },
    resetClock: () => {
      serverClockBase = null;
      serverClockStartPerf = null;
      serverTimeEl.textContent = '확인 실패';
      serverTimeEl.classList.add('muted');
      serverTimeEl.classList.remove('skeleton');
      serverTimeEl.removeAttribute('aria-busy');
      if (clockMeta) {
        clockMeta.textContent = '';
      }
    }
  };
}

function formatTimestamp(ms, settings) {
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) {
    return '--:--:--.---';
  }

  const pad = (num, size = 2) => String(num).padStart(size, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  const millis = pad(date.getMilliseconds(), 3);

  let timeStr = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

  if (settings.showMillis) {
    timeStr += `.${millis}`;
  }

  return timeStr;
}

function formatMetaLine(serverUtcIso) {
  const nowLocal = new Date();
  const localFormatter = new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  const localStamp = localFormatter.format(nowLocal);

  let utcStamp = '';
  try {
    utcStamp = new Date(serverUtcIso).toISOString().replace('T', ' ').replace('Z', ' UTC');
  } catch (_err) {
    utcStamp = '';
  }

  return utcStamp
    ? `마지막 측정: ${localStamp} · 서버 UTC 헤더: ${utcStamp}`
    : `마지막 측정: ${localStamp}`;
}
