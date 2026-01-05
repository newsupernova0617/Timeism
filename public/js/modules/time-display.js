/**
 * 시간 표시 모듈
 * 서버 시간 표시 및 실시간 시계 업데이트
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

    // 서버 시계 설정
    setServerClock: (base, startPerf) => {
      serverClockBase = base;
      serverClockStartPerf = startPerf;
    },

    // 시계 루프 시작
    startClockLoop: (onTick) => {
      function tick() {
        if (serverClockBase !== null && serverClockStartPerf !== null) {
          const elapsed = performance.now() - serverClockStartPerf;
          const current = serverClockBase + elapsed;
          serverTimeEl.textContent = formatTimestamp(current, settings);

          // 외부 리스너 콜백 (알람 체크 등)
          if (onTick) onTick(current);
        }

        animationFrameId = window.requestAnimationFrame(tick);
      }

      if (animationFrameId === null && typeof window !== 'undefined') {
        animationFrameId = window.requestAnimationFrame(tick);
      }
    },

    // 시간 결과 적용
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

    // 시계 리셋
    resetClock: () => {
      const lang = document.documentElement.lang || 'ko';
      const failedText = lang === 'ko' ? '확인 실패' : 'Check failed';

      serverClockBase = null;
      serverClockStartPerf = null;
      serverTimeEl.textContent = failedText;
      serverTimeEl.classList.add('muted');
      serverTimeEl.classList.remove('skeleton');
      serverTimeEl.removeAttribute('aria-busy');
      if (clockMeta) {
        clockMeta.textContent = '';
      }
    }
  };
}

// 타임스탬프 포맷팅
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

// 메타 정보 포맷팅
function formatMetaLine(serverUtcIso) {
  // 현재 페이지 언어 감지
  const lang = document.documentElement.lang || 'ko';
  const isKorean = lang === 'ko';

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

  // 다국어 텍스트
  const lastMeasured = isKorean ? '마지막 측정' : 'Last measured';
  const serverUtcHeader = isKorean ? '서버 UTC 헤더' : 'Server UTC header';

  return utcStamp
    ? `${lastMeasured}: ${localStamp} · ${serverUtcHeader}: ${utcStamp}`
    : `${lastMeasured}: ${localStamp}`;
}
