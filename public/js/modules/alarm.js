/**
 * Alarm Module
 * 알림 및 알람음 관련 함수
 */

export function createAlarm({
  targetTimeInput,
  setTargetAlarmBtn,
  alarmStatus,
  alarmTitle,
  alarmTime,
  cancelAlarmBtn,
  testAlarmBtn,
  sendEvent,
  getServerClockBase
}) {
  let alarmState = {
    active: false,
    targetTime: null,
    mode: 'target',
    coarseIntervalId: null,
    fineIntervalId: null
  };
  let lastAutoAlarmMinute = -1;

  function initNotifications() {
    if (setTargetAlarmBtn) {
      setTargetAlarmBtn.addEventListener('click', handleSetTargetAlarm);
    }

    if (cancelAlarmBtn) {
      cancelAlarmBtn.addEventListener('click', cancelAlarm);
    }

    if (testAlarmBtn) {
      testAlarmBtn.addEventListener('click', () => {
        playAlarmSound();
        console.log('🔊 Alarm sound test triggered');
      });
    }

    requestNotificationPermission();
  }

  async function requestNotificationPermission() {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return;
    }

    if (Notification.permission === 'default') {
      try {
        await Notification.requestPermission();
      } catch (err) {
        console.warn('Failed to request notification permission:', err);
      }
    }
  }

  function handleSetTargetAlarm() {
    const timeValue = targetTimeInput.value;
    if (!timeValue) {
      alert('목표 시간을 입력해주세요.');
      return;
    }

    const serverClockBase = getServerClockBase();
    if (serverClockBase === null) {
      alert('먼저 서버 시간을 확인해주세요.');
      return;
    }

    // 시:분:초 파싱 (초는 선택사항)
    const timeParts = timeValue.split(':').map(Number);
    const hours = timeParts[0];
    const minutes = timeParts[1];
    const seconds = timeParts[2] || 0; // 초가 없으면 0

    // 서버 시간 기준으로 목표 시간 계산
    const serverDate = new Date(serverClockBase);
    const targetDate = new Date(
      serverDate.getFullYear(),
      serverDate.getMonth(),
      serverDate.getDate(),
      hours,
      minutes,
      seconds,
      0
    );

    const now = Date.now();
    if (targetDate.getTime() <= now) {
      alert('현재 시간 이후의 시간을 선택해주세요.');
      return;
    }

    alarmState.active = true;
    alarmState.targetTime = targetDate.getTime();
    alarmState.mode = 'target';

    startAlarmMonitoring();
    showAlarmStatus();

    // 알람 설정 정보 기록 (예상 시간까지 남은 시간 포함)
    const timeUntilAlarm = alarmState.targetTime - Date.now();
    sendEvent('set_alarm', {
      mode: 'target',
      target_time: targetDate.toISOString(),
      time_until_alarm_ms: Math.max(0, timeUntilAlarm)
    });
  }

  function startAlarmMonitoring() {
    // 기존 타이머 정리
    if (alarmState.coarseIntervalId) {
      clearInterval(alarmState.coarseIntervalId);
      alarmState.coarseIntervalId = null;
    }
    if (alarmState.fineIntervalId) {
      clearInterval(alarmState.fineIntervalId);
      alarmState.fineIntervalId = null;
    }

    // Phase 1: 목표 시간 2초 전까지 100ms 주기 체크 (가벼움)
    alarmState.coarseIntervalId = setInterval(() => {
      const remaining = alarmState.targetTime - Date.now();

      if (remaining <= 2000) {  // 2초 전 도달
        clearInterval(alarmState.coarseIntervalId);
        alarmState.coarseIntervalId = null;
        startFineCheck();  // Phase 2로 전환
      }
    }, 100);

    // Phase 2: 마지막 2초는 10ms 주기 체크 (정밀함)
    function startFineCheck() {
      alarmState.fineIntervalId = setInterval(() => {
        const remaining = alarmState.targetTime - Date.now();

        if (remaining <= 0) {
          triggerAlarm();
        }
      }, 10);
    }
  }

  function showAlarmStatus() {
    alarmStatus.classList.remove('hidden');

    alarmTitle.textContent = '목표 시간 알림 활성화';
    const targetDate = new Date(alarmState.targetTime);
    const pad = (n) => String(n).padStart(2, '0');
    alarmTime.textContent = `${pad(targetDate.getHours())}:${pad(targetDate.getMinutes())}:${pad(targetDate.getSeconds())}`;
  }

  function triggerAlarm() {
    // Clear both phase intervals
    if (alarmState.coarseIntervalId) {
      clearInterval(alarmState.coarseIntervalId);
      alarmState.coarseIntervalId = null;
    }
    if (alarmState.fineIntervalId) {
      clearInterval(alarmState.fineIntervalId);
      alarmState.fineIntervalId = null;
    }

    // 알람 정확도 계산 (목표 시간 대비 실제 발생 시간의 차이)
    const actualTriggerTime = Date.now();
    const delayMs = actualTriggerTime - alarmState.targetTime;

    playAlarmSound();
    showNotification();

    alarmStatus.classList.add('hidden');
    alarmState.active = false;

    // 알람 정확도 정보 포함
    sendEvent('alarm_triggered', {
      mode: alarmState.mode,
      target_time: new Date(alarmState.targetTime).toISOString(),
      delay_ms: delayMs,  // 양수면 지연, 음수면 조기
      accuracy: Math.abs(delayMs) <= 10 ? 'precise' : Math.abs(delayMs) <= 100 ? 'good' : 'acceptable'
    });
  }

  function showNotification() {
    if (!('Notification' in window)) {
      alert('⏰ 알림 시간입니다!');
      return;
    }

    if (Notification.permission === 'granted') {
      const notification = new Notification('서버 시간 알림', {
        body: '목표 시간에 도달했습니다!',
        icon: '/icons/apple-touch-icon.png',
        badge: '/icons/apple-touch-icon.png',
        tag: 'time-alarm',
        requireInteraction: true
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } else {
      alert('⏰ 알림 시간입니다!');
    }
  }

  function playAlarmSound() {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 1200;  // 경쾌한 주파수
    oscillator.type = 'sine';
    gainNode.gain.value = 0.6;  // 음량: 60%

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.8);  // 0.8초 재생
  }

  function cancelAlarm() {
    // Clear both phase intervals
    if (alarmState.coarseIntervalId) {
      clearInterval(alarmState.coarseIntervalId);
      alarmState.coarseIntervalId = null;
    }
    if (alarmState.fineIntervalId) {
      clearInterval(alarmState.fineIntervalId);
      alarmState.fineIntervalId = null;
    }

    alarmState.active = false;
    alarmState.targetTime = null;
    alarmStatus.classList.add('hidden');

    targetTimeInput.value = '';

    sendEvent('alarm_cancelled');
  }

  function checkAutoAlarm(ms) {
    const date = new Date(ms);
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();

    // Trigger alarm only at 0 second mark, on hour and 30 minutes
    if ((minutes === 0 || minutes === 30) && seconds === 0) {
      const currentMinute = minutes;

      if (currentMinute !== lastAutoAlarmMinute) {
        lastAutoAlarmMinute = currentMinute;
        playAlarmSound();
      }
    } else if (seconds > 0) {
      // Reset the minute tracker after moving past 0 seconds
      lastAutoAlarmMinute = -1;
    }
  }

  return {
    init: initNotifications,
    checkAutoAlarm,
    playAlarmSound
  };
}
