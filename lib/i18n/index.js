/**
 * i18n (Internationalization) 헬퍼
 * 
 * 다국어 지원을 위한 간단한 번역 시스템
 * - 언어별 JSON 파일 로드
 * - 번역 문자열 조회
 * - 브라우저 언어 감지
 */

const fs = require('fs');
const path = require('path');

// 지원 언어 목록
const SUPPORTED_LOCALES = ['en', 'ko', 'jp', 'zh-tw'];
const DEFAULT_LOCALE = 'en';

// 번역 데이터 캐시
const translations = {};

/**
 * 번역 파일 로드
 */
function loadTranslations() {
    SUPPORTED_LOCALES.forEach(locale => {
        const filePath = path.join(__dirname, 'locales', `${locale}.json`);
        try {
            translations[locale] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        } catch (error) {
            console.error(`Failed to load translation file: ${filePath}`, error);
            translations[locale] = {};
        }
    });
}

// 초기 로드
loadTranslations();

/**
 * 요청에서 언어 감지
 * 
 * 우선순위:
 * 1. URL 경로 (/ko, /en)
 * 2. 쿼리 파라미터 (?lang=ko)
 * 3. Accept-Language 헤더
 * 4. 기본값 (en)
 */
function detectLocale(req) {
    // 1. URL 경로에서 감지
    const pathLocale = req.path.split('/')[1];
    if (SUPPORTED_LOCALES.includes(pathLocale)) {
        return pathLocale;
    }

    // 2. 쿼리 파라미터
    if (req.query.lang && SUPPORTED_LOCALES.includes(req.query.lang)) {
        return req.query.lang;
    }

    // 3. Accept-Language 헤더
    const acceptLanguage = req.headers['accept-language'];
    if (acceptLanguage) {
        const preferredLang = acceptLanguage.split(',')[0].split('-')[0];
        if (SUPPORTED_LOCALES.includes(preferredLang)) {
            return preferredLang;
        }
    }

    // 4. 기본값
    return DEFAULT_LOCALE;
}

/**
 * 번역 문자열 조회
 * 
 * @param {string} locale - 언어 코드 (en, ko)
 * @param {string} key - 번역 키 (예: 'header.title')
 * @returns {string} 번역된 문자열
 */
function t(locale, key) {
    const keys = key.split('.');
    let value = translations[locale] || translations[DEFAULT_LOCALE];

    for (const k of keys) {
        value = value[k];
        if (!value) {
            console.warn(`Translation missing: ${locale}.${key}`);
            return key;
        }
    }

    return value;
}

/**
 * 전체 번역 객체 반환
 */
function getTranslations(locale) {
    return translations[locale] || translations[DEFAULT_LOCALE];
}

/**
 * hreflang 링크 생성
 * 
 * @param {string} domain - 도메인 (예: https://timeism.com)
 * @param {string} currentPath - 현재 경로 (예: /ko/, /en/guide)
 * @returns {Array} hreflang 링크 배열
 */
function getHreflangLinks(domain, currentPath = '/') {
    // 경로에서 언어 코드 제거 (예: /ko/guide -> /guide, /en/ -> /)
    let basePath = currentPath;
    SUPPORTED_LOCALES.forEach(locale => {
        if (basePath.startsWith(`/${locale}/`)) {
            basePath = basePath.substring(locale.length + 1);
        } else if (basePath === `/${locale}`) {
            basePath = '/';
        }
    });

    // 각 언어별 hreflang 링크 생성
    return SUPPORTED_LOCALES.map(locale => ({
        rel: 'alternate',
        hreflang: locale,
        href: `${domain}/${locale}${basePath}`
    })).concat([{
        rel: 'alternate',
        hreflang: 'x-default',
        href: `${domain}${basePath}`
    }]);
}

module.exports = {
    SUPPORTED_LOCALES,
    DEFAULT_LOCALE,
    detectLocale,
    t,
    getTranslations,
    getHreflangLinks,
    loadTranslations
};
