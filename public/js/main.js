/**
 * 메인 애플리케이션
 * 모든 모듈을 통합하여 초기화
 */

import { createTimeDisplay } from './modules/time-display.js';
import { createAlarm } from './modules/alarm.js';
import { createSession } from './modules/session.js';
import { createSettings } from './modules/settings.js';
import { createApi } from './modules/api.js';

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

console.log('✅ Application initialized');
