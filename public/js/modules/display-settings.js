/**
 * 화면 설정 모듈
 * 날짜 숨기기, 색상 모드 등 UI 커스터마이징
 */

export function createDisplaySettings() {
    const hideDateToggle = document.getElementById('hideDateToggle');
    const noRedColorToggle = document.getElementById('noRedColorToggle');

    // localStorage에서 설정 불러오기
    const savedHideDate = localStorage.getItem('hideDate') === 'true';
    const savedNoRedColor = localStorage.getItem('noRedColor') === 'true';

    if (hideDateToggle) {
        hideDateToggle.checked = savedHideDate;
        applyHideDateSetting(savedHideDate);

        hideDateToggle.addEventListener('change', (e) => {
            const isHidden = e.target.checked;
            localStorage.setItem('hideDate', isHidden);
            applyHideDateSetting(isHidden);
        });
    }

    if (noRedColorToggle) {
        noRedColorToggle.checked = savedNoRedColor;
        applyNoRedColorSetting(savedNoRedColor);

        noRedColorToggle.addEventListener('change', (e) => {
            const noRed = e.target.checked;
            localStorage.setItem('noRedColor', noRed);
            applyNoRedColorSetting(noRed);
        });
    }
}

function applyHideDateSetting(hideDate) {
    const clockValue = document.getElementById('serverTime');
    if (!clockValue) return;

    if (hideDate) {
        clockValue.classList.add('hide-date');
    } else {
        clockValue.classList.remove('hide-date');
    }
}

function applyNoRedColorSetting(noRed) {
    if (noRed) {
        document.documentElement.classList.add('no-red-mode');
    } else {
        document.documentElement.classList.remove('no-red-mode');
    }
}
