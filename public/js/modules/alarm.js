/**
 * 알람 모듈
 * 목표 시간 알람 및 자동 알람 (정각, 30분)
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
  let lastSoundTriggerMinute = -1;
  let lastVisualTriggerMinute = -1;
  let overlayElement = null;
  let countdownElement = null;
  let audioContext = null; // AudioContext 재사용

  // 알람 초기화
  function initNotifications() {
    if (setTargetAlarmBtn) {
      setTargetAlarmBtn.addEventListener('click', handleSetTargetAlarm);
    }

    if (cancelAlarmBtn) {
      cancelAlarmBtn.addEventListener('click', cancelAlarm);
    }

    if (testAlarmBtn) {
      testAlarmBtn.addEventListener('click', () => {
        initAudioContext(); // 사용자 클릭으로 활성화
        playBBCAlarmSound();
        console.log('🔊 BBC alarm sound test triggered');
      });
    }

    requestNotificationPermission();
    createVisualEffectElements();

    // 페이지 클릭으로 AudioContext 활성화
    document.addEventListener('click', initAudioContext, { once: true });
  }

  // AudioContext 초기화 (사용자 제스처 필요)
  function initAudioContext() {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      console.log('🎵 AudioContext initialized');
    }
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
  }

  // 알림 권한 요청
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

  // 목표 시간 알람 설정
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

    // 시:분:초 파싱
    const timeParts = timeValue.split(':').map(Number);
    const hours = timeParts[0];
    const minutes = timeParts[1];
    const seconds = timeParts[2] || 0;

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

    // 이벤트 로깅
    const timeUntilAlarm = alarmState.targetTime - Date.now();
    sendEvent('set_alarm', {
      mode: 'target',
      target_time: targetDate.toISOString(),
      time_until_alarm_ms: Math.max(0, timeUntilAlarm)
    });
  }

  // 알람 모니터링 시작 (2단계)
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

    // Phase 1: 목표 시간 2초 전까지 100ms 주기
    alarmState.coarseIntervalId = setInterval(() => {
      const remaining = alarmState.targetTime - Date.now();

      if (remaining <= 2000) {
        clearInterval(alarmState.coarseIntervalId);
        alarmState.coarseIntervalId = null;
        startFineCheck();
      }
    }, 100);

    // Phase 2: 마지막 2초는 10ms 주기 (정밀)
    function startFineCheck() {
      alarmState.fineIntervalId = setInterval(() => {
        const remaining = alarmState.targetTime - Date.now();

        if (remaining <= 0) {
          triggerAlarm();
        }
      }, 10);
    }
  }

  // 알람 상태 표시
  function showAlarmStatus() {
    alarmStatus.classList.remove('hidden');

    alarmTitle.textContent = '목표 시간 알림 활성화';
    const targetDate = new Date(alarmState.targetTime);
    const pad = (n) => String(n).padStart(2, '0');
    alarmTime.textContent = `${pad(targetDate.getHours())}:${pad(targetDate.getMinutes())}:${pad(targetDate.getSeconds())}`;
  }

  // 알람 발동
  function triggerAlarm() {
    // 타이머 정리
    if (alarmState.coarseIntervalId) {
      clearInterval(alarmState.coarseIntervalId);
      alarmState.coarseIntervalId = null;
    }
    if (alarmState.fineIntervalId) {
      clearInterval(alarmState.fineIntervalId);
      alarmState.fineIntervalId = null;
    }

    // 정확도 계산
    const actualTriggerTime = Date.now();
    const delayMs = actualTriggerTime - alarmState.targetTime;

    playAlarmSound();
    showNotification();

    alarmStatus.classList.add('hidden');
    alarmState.active = false;

    // 이벤트 로깅 (정확도 포함)
    sendEvent('alarm_triggered', {
      mode: alarmState.mode,
      target_time: new Date(alarmState.targetTime).toISOString(),
      delay_ms: delayMs,
      accuracy: Math.abs(delayMs) <= 10 ? 'precise' : Math.abs(delayMs) <= 100 ? 'good' : 'acceptable'
    });
  }

  // 알림 표시
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

  // 알람음 재생 (Web Audio API)
  function playAlarmSound() {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 1200;  // 1200Hz
    oscillator.type = 'sine';
    gainNode.gain.value = 0.6;  // 60% 음량

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.8);  // 0.8초
  }

  // 알람 취소
  function cancelAlarm() {
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

  // 자동 알람 체크 (티켓팅 시간 직전: 59분, 29분)
  function checkAutoAlarm(ms) {
    const date = new Date(ms);
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();
    const milliseconds = date.getMilliseconds();

    // 티켓팅 시간 직전 (59분 = 정각 전, 29분 = 30분 전)
    const isAlarmMinute = (minutes === 59 || minutes === 29);

    // 10초 전부터 카운트다운 시작
    if (isAlarmMinute && seconds >= 50) {
      const countdown = 60 - seconds;
      startCountdownEffect(countdown);
    }

    // BBC 시보음: 55초에 한 번만 시작
    if (isAlarmMinute && seconds === 55 && lastSoundTriggerMinute !== 55) {
      lastSoundTriggerMinute = 55;
      console.log(`🔔 BBC chime at ${minutes}:${seconds}.${milliseconds}`);

      initAudioContext(); // AudioContext 활성화
      try {
        playBBCAlarmSound();
        console.log('✅ BBC chime started');
      } catch (error) {
        console.error('❌ Failed:', error);
      }
    }

    // 00초에 시각 효과 (59분 다음은 0분, 29분 다음은 30분)
    const isTargetZero = (minutes === 0 || minutes === 30);
    if (isTargetZero && seconds === 0 && milliseconds < 100 && lastVisualTriggerMinute !== 0) {
      lastVisualTriggerMinute = 0;
      triggerVisualEffects();
    }

    // 리셋 (56초에 소리 리셋, 1초에 시각 리셋)
    if (seconds === 56) {
      lastSoundTriggerMinute = -1;
    }
    if (seconds === 1) {
      lastVisualTriggerMinute = -1;
    }

    // 카운트다운 종료 (정각/30분 00초에)
    if (isTargetZero && seconds === 0) {
      stopCountdownEffect();
    }
  }

  // 시각 효과용 DOM 요소 생성
  function createVisualEffectElements() {
    overlayElement = document.createElement('div');
    overlayElement.className = 'alarm-overlay';
    document.body.appendChild(overlayElement);

    countdownElement = document.createElement('div');
    countdownElement.className = 'alarm-countdown';
    document.body.appendChild(countdownElement);
  }

  // 카운트다운 효과 시작
  function startCountdownEffect(countdown) {
    if (!overlayElement || !countdownElement) return;

    countdownElement.textContent = countdown;
    countdownElement.classList.add('active');

    const intensity = Math.min(0.3, (10 - countdown) / 10 * 0.3);
    overlayElement.style.backgroundColor = `rgba(255, 0, 0, ${intensity})`;
    overlayElement.classList.add('active');
  }

  // 카운트다운 효과 중지
  function stopCountdownEffect() {
    if (!overlayElement || !countdownElement) return;

    overlayElement.classList.add('fadeout');
    countdownElement.classList.remove('active');

    setTimeout(() => {
      if (overlayElement) {
        overlayElement.style.backgroundColor = 'rgba(255, 0, 0, 0)';
        overlayElement.classList.remove('active', 'fadeout', 'flash');
      }
      if (countdownElement) {
        countdownElement.textContent = '';
      }
    }, 1000);
  }

  // 시각 효과만 트리거
  function triggerVisualEffects() {
    if (overlayElement) {
      overlayElement.classList.add('flash');
      overlayElement.style.backgroundColor = 'rgba(255, 255, 255, 1)';

      setTimeout(() => {
        if (overlayElement) {
          overlayElement.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';
        }
      }, 500);
    }

    const clockBlock = document.getElementById('clockBlock');
    if (clockBlock) {
      clockBlock.classList.add('clock-highlight');
      setTimeout(() => {
        clockBlock.classList.remove('clock-highlight');
      }, 500);
    }

    console.log('⚡ Visual effects at 00.0s');
  }

  // BBC 시보음 재생
  function playBBCAlarmSound() {
    if (!audioContext) {
      console.warn('⚠️ AudioContext not initialized. Click the page first.');
      return;
    }

    const now = audioContext.currentTime;

    for (let i = 0; i < 6; i++) {
      playBeep(audioContext, now + i * 0.8, 0.1, 1000, 0.4);
    }

    playBeep(audioContext, now + 6 * 0.8, 1.0, 1000, 0.5);
  }

  // 개별 비프음
  function playBeep(audioContext, startTime, duration, frequency, volume) {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    gainNode.gain.value = volume;

    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
  }

  // 레거시 함수
  function playAlarmSound() {
    playBBCAlarmSound();
  }

  return {
    init: initNotifications,
    checkAutoAlarm,
    playAlarmSound
  };
}
