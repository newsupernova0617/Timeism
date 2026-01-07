/**
 * 설정 모듈
 * 사용자 설정 관리 (밀리초 표시 등)
 */

const SETTINGS_STORAGE_KEY = 'timecheck.settings';

export function createSettings(showMillisToggle) {
  let settings = loadSettings();

  // localStorage에서 설정 로드
  function loadSettings() {
    try {
      const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (err) {
      console.warn('Failed to load settings:', err);
    }
    return {
      showMillis: true  // 기본값: 밀리초 표시
    };
  }

  // localStorage에 설정 저장
  function saveSettings() {
    try {
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (err) {
      console.warn('Failed to save settings:', err);
    }
  }

  // 밀리초 표시 토글
  function handleToggleChange() {
    settings.showMillis = showMillisToggle.checked;
    saveSettings();
  }

  // 초기화
  function init() {
    if (showMillisToggle) {
      showMillisToggle.checked = settings.showMillis;
      showMillisToggle.addEventListener('change', handleToggleChange);
    }
  }

  return {
    get: () => settings,
    init
  };
}
