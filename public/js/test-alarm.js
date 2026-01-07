/**
 * 알람 테스트 페이지 전용 스크립트
 * main.js를 기반으로 하되, 시계가 50초부터 시작하도록 수정
 */

import { createAlarm } from './modules/alarm.js';
import { createSettings } from './modules/settings.js';

// DOM 요소
const serverTimeEl = document.getElementById('serverTime');
const clockMeta = document.getElementById('clockMeta');
const clockBlock = document.getElementById('clockBlock');
const showMillisToggle = document.getElementById('showMillis');

// 테스트 시작 시간
let testStartTime = null;
let clockInterval = null;
let showMilliseconds = true;

// 설정 모듈
const settings = createSettings(showMillisToggle);

// 알람 모듈 초기화
const alarm = createAlarm({
    targetTimeInput: null,
    setTargetAlarmBtn: null,
    alarmStatus: null,
    alarmTitle: null,
    alarmTime: null,
    cancelAlarmBtn: null,
    testAlarmBtn: null,
    sendEvent: () => { }, // 테스트 모드에서는 이벤트 로깅 비활성화
    getServerClockBase: () => null
});

// 밀리초 표시 설정
showMillisToggle.addEventListener('change', () => {
    showMilliseconds = showMillisToggle.checked;
});

// 시계 업데이트 함수
function updateTestClock() {
    const elapsed = Date.now() - testStartTime;

    // 정각 10초 전부터 시작 (23:59:50)
    const testTime = new Date();
    testTime.setHours(23);
    testTime.setMinutes(59);
    testTime.setSeconds(50);
    testTime.setMilliseconds(0);

    const currentTestTime = new Date(testTime.getTime() + elapsed);

    const hours = String(currentTestTime.getHours()).padStart(2, '0');
    const minutes = String(currentTestTime.getMinutes()).padStart(2, '0');
    const seconds = String(currentTestTime.getSeconds()).padStart(2, '0');
    const ms = String(currentTestTime.getMilliseconds()).padStart(3, '0');

    // 시간 표시
    if (showMilliseconds) {
        serverTimeEl.textContent = `${hours}:${minutes}:${seconds}.${ms}`;
    } else {
        serverTimeEl.textContent = `${hours}:${minutes}:${seconds}`;
    }

    // 알람 체크
    alarm.checkAutoAlarm(currentTestTime.getTime());

    // 00:00:02에 자동 정지 (알람 발동 후 2초)
    if (currentTestTime.getHours() === 0 && currentTestTime.getMinutes() === 0 && currentTestTime.getSeconds() >= 2) {
        stopTest();
        clockMeta.textContent = '테스트 완료! BBC 시보음의 긴 비프음이 정각에 울렸습니다. 페이지를 새로고침하여 다시 시작하세요.';
    }
}

// 테스트 시작
function startTest() {
    testStartTime = Date.now();

    if (clockInterval) {
        clearInterval(clockInterval);
    }

    // 밀리초 표시 여부에 따라 업데이트 주기 조정
    const updateInterval = showMilliseconds ? 10 : 100;
    clockInterval = setInterval(updateTestClock, updateInterval);

    console.log('🧪 Alarm test started from 23:59:50 (10 seconds before midnight, BBC chime at 55.2s)');
}

// 테스트 중지
function stopTest() {
    if (clockInterval) {
        clearInterval(clockInterval);
        clockInterval = null;
    }
    console.log('🛑 Test stopped');
}

// 밀리초 토글 시 업데이트 주기 변경
showMillisToggle.addEventListener('change', () => {
    if (clockInterval) {
        clearInterval(clockInterval);
        const updateInterval = showMillisToggle.checked ? 10 : 100;
        clockInterval = setInterval(updateTestClock, updateInterval);
    }
});

// 초기화
settings.init();
alarm.init();

// 테스트 시작 버튼 클릭 시 시작
const startBtn = document.querySelector('button[onclick="location.reload()"]');
if (startBtn) {
    startBtn.textContent = '🚀 테스트 시작 (클릭하세요!)';
    startBtn.onclick = (e) => {
        e.preventDefault();
        startTest();
        startBtn.textContent = '🔄 테스트 다시 시작';
        startBtn.onclick = () => location.reload();
    };
}

// 또는 페이지 클릭으로 시작 (첫 클릭)
document.addEventListener('click', () => {
    if (!testStartTime) {
        startTest();
    }
}, { once: true });

console.log('✅ Alarm test page initialized - Click anywhere to start!');
