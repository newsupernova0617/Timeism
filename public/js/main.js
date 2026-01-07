/**
 * 메인 애플리케이션
 * 모든 모듈을 통합하여 초기화
 */

import { createTimeDisplay } from './modules/time-display.js';
import { createAlarm } from './modules/alarm.js';
import { createSession } from './modules/session.js';
import { createSettings } from './modules/settings.js';
import { createApi } from './modules/api.js';
import { createDisplaySettings } from './modules/display-settings.js';
import { createPreAlarms } from './modules/pre-alarms.js';
import { createTrendingSites } from './modules/trending-sites.js';

// DOM 요소
const form = document.getElementById('checkForm');
const urlInput = document.getElementById('urlInput');
const checkButton = document.getElementById('checkBtn');
const formErrorEl = document.getElementById('formError');

const clockBlock = document.getElementById('clockBlock');
const serverTimeEl = document.getElementById('serverTime');
const clockMeta = document.getElementById('clockMeta');

const showMillisToggle = document.getElementById('showMillis');

const targetTimeInput = document.getElementById('targetTime');
const setTargetAlarmBtn = document.getElementById('setTargetAlarm');
const alarmStatus = document.getElementById('alarmStatus');
const alarmTitle = document.getElementById('alarmTitle');
const alarmTime = document.getElementById('alarmTime');
const cancelAlarmBtn = document.getElementById('cancelAlarm');
const testAlarmBtn = document.getElementById('testAlarmBtn');

// 모듈 초기화
const settings = createSettings(showMillisToggle);
const session = createSession();

const timeDisplay = createTimeDisplay({
  serverTimeEl,
  clockMeta,
  clockBlock,
  settings: settings.get()
});

const alarm = createAlarm({
  targetTimeInput,
  setTargetAlarmBtn,
  alarmStatus,
  alarmTitle,
  alarmTime,
  cancelAlarmBtn,
  testAlarmBtn,
  sendEvent: session.sendEvent,
  getServerClockBase: () => timeDisplay.getServerClockBase()
});

const api = createApi({
  form,
  urlInput,
  checkButton,
  formErrorEl,
  serverTimeEl,
  clockMeta,
  clockBlock,
  onTimeResult: (result, endTime) => {
    const base = result.server_time_estimated_epoch_ms;  // 이미 RTT/2 보정됨
    timeDisplay.setServerClock(base, endTime);  // 응답 수신 시각 사용
    timeDisplay.applyTimeResult(result);
  },
  onApiError: () => {
    timeDisplay.resetClock();
  },
  sendEvent: session.sendEvent
});

// 시계 루프 시작 (알람 체크 포함)
timeDisplay.startClockLoop((currentTime) => {
  alarm.checkAutoAlarm(currentTime);
});

// 모든 모듈 초기화
settings.init();
api.init();
session.init();
alarm.init();

// 화면 설정 초기화
createDisplaySettings();

// 사전 알람 초기화
const preAlarms = createPreAlarms({
  sendEvent: session.sendEvent,
  playAlarmSound: alarm.playAlarmSound
});

// 실시간 트렌드 사이트 초기화
const trendingSites = createTrendingSites();
trendingSites.init();

// 빠른 사이트 버튼 핸들러
const quickSiteButtons = document.querySelectorAll('.site-quick-btn');
quickSiteButtons.forEach(button => {
  button.addEventListener('click', () => {
    const url = button.dataset.url;
    const name = button.dataset.name;

    // URL 입력 필드에 자동 입력
    urlInput.value = url;

    // 포커스 효과
    urlInput.focus();

    // 자동으로 시간 확인 트리거
    setTimeout(() => {
      checkButton.click();
    }, 100);

    console.log(`✅ Quick site selected: ${name} (${url})`);
  });
});

// 알람 설정 시 사전 알람도 함께 설정
const originalSetTargetAlarm = setTargetAlarmBtn;
if (originalSetTargetAlarm) {
  originalSetTargetAlarm.addEventListener('click', () => {
    // 알람이 설정되면 사전 알람도 활성화
    setTimeout(() => {
      const targetTimeValue = targetTimeInput.value;
      if (targetTimeValue) {
        const timeParts = targetTimeValue.split(':').map(Number);
        const now = new Date();
        const targetDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          timeParts[0],
          timeParts[1],
          timeParts[2] || 0
        );
        preAlarms.setTargetTime(targetDate.getTime());
      }
    }, 100);
  });
}

// 알람 취소 시 사전 알람도 중지
if (cancelAlarmBtn) {
  cancelAlarmBtn.addEventListener('click', () => {
    preAlarms.stopMonitoring();
  });
}

console.log('✅ SyncTime initialized with all Phase 4-B Batch 1 features');
console.log('✅ Application initialized');
