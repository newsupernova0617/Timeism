/**
 * 사전 알람 모듈
 * 1/2/3분 전 알람 기능
 */

export function createPreAlarms({ sendEvent, playAlarmSound }) {
    const preAlarm1Min = document.getElementById('preAlarm1Min');
    const preAlarm2Min = document.getElementById('preAlarm2Min');
    const preAlarm3Min = document.getElementById('preAlarm3Min');

    let targetTime = null;
    let firedAlarms = new Set(); // 중복 발동 방지
    let checkIntervalId = null;

    // localStorage에서 설정 불러오기
    const saved1Min = localStorage.getItem('preAlarm1Min') === 'true';
    const saved2Min = localStorage.getItem('preAlarm2Min') === 'true';
    const saved3Min = localStorage.getItem('preAlarm3Min') === 'true';

    if (preAlarm1Min) {
        preAlarm1Min.checked = saved1Min;
        preAlarm1Min.addEventListener('change', (e) => {
            localStorage.setItem('preAlarm1Min', e.target.checked);
        });
    }

    if (preAlarm2Min) {
        preAlarm2Min.checked = saved2Min;
        preAlarm2Min.addEventListener('change', (e) => {
            localStorage.setItem('preAlarm2Min', e.target.checked);
        });
    }

    if (preAlarm3Min) {
        preAlarm3Min.checked = saved3Min;
        preAlarm3Min.addEventListener('change', (e) => {
            localStorage.setItem('preAlarm3Min', e.target.checked);
        });
    }

    function setTargetTime(time) {
        targetTime = time;
        firedAlarms.clear();
        startMonitoring();
    }

    function startMonitoring() {
        if (checkIntervalId) {
            clearInterval(checkIntervalId);
        }

        checkIntervalId = setInterval(() => {
            if (!targetTime) return;

            const now = Date.now();
            const remaining = targetTime - now;

            // 1분 전 알람
            if (preAlarm1Min && preAlarm1Min.checked && !firedAlarms.has('1min')) {
                if (remaining <= 60000 && remaining > 59000) {
                    firedAlarms.add('1min');
                    playAlarmSound();
                    showPreAlarmNotification('1분 전');
                    sendEvent('pre_alarm_triggered', { minutes_before: 1 });
                }
            }

            // 2분 전 알람
            if (preAlarm2Min && preAlarm2Min.checked && !firedAlarms.has('2min')) {
                if (remaining <= 120000 && remaining > 119000) {
                    firedAlarms.add('2min');
                    playAlarmSound();
                    showPreAlarmNotification('2분 전');
                    sendEvent('pre_alarm_triggered', { minutes_before: 2 });
                }
            }

            // 3분 전 알람
            if (preAlarm3Min && preAlarm3Min.checked && !firedAlarms.has('3min')) {
                if (remaining <= 180000 && remaining > 179000) {
                    firedAlarms.add('3min');
                    playAlarmSound();
                    showPreAlarmNotification('3분 전');
                    sendEvent('pre_alarm_triggered', { minutes_before: 3 });
                }
            }

            // 목표 시간 지나면 모니터링 중지
            if (remaining <= 0) {
                stopMonitoring();
            }
        }, 100); // 100ms 주기로 체크
    }

    function stopMonitoring() {
        if (checkIntervalId) {
            clearInterval(checkIntervalId);
            checkIntervalId = null;
        }
        targetTime = null;
        firedAlarms.clear();
    }

    function showPreAlarmNotification(timeText) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('사전 알람', {
                body: `목표 시간 ${timeText}입니다!`,
                icon: '/icons/apple-touch-icon.png',
                tag: 'pre-alarm'
            });
        }
    }

    return {
        setTargetTime,
        stopMonitoring
    };
}
