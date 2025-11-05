/**
 * Settings Module
 * 사용자 설정 관리
 */

const SETTINGS_STORAGE_KEY = 'timecheck.settings';

export function createSettings(showMillisToggle) {
  let settings = loadSettings();

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
      showMillis: true
    };
  }

  function saveSettings() {
    try {
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (err) {
      console.warn('Failed to save settings:', err);
    }
  }

  function initSettings() {
    if (showMillisToggle) {
      showMillisToggle.checked = settings.showMillis;
      showMillisToggle.addEventListener('change', (e) => {
        settings.showMillis = e.target.checked;
        saveSettings();
      });
    }
  }

  return {
    get: () => settings,
    init: initSettings
  };
}
