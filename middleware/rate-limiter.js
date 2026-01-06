/**
 * Rate Limiting 미들웨어
 * API 남용 방지 및 서버 보호
 */

const rateLimit = require('express-rate-limit');

// 일반 API Rate Limiter (10 requests / 분)
const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1분
    max: 10, // 최대 10 requests
    message: {
        error: 'Too many requests from this IP, please try again after a minute.',
        retryAfter: 60
    },
    standardHeaders: true, // RateLimit-* 헤더 반환
    legacyHeaders: false,
    // IP 기반 제한
    keyGenerator: (req) => {
        return req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
    },
    // 에러 핸들러
    handler: (req, res) => {
        const lang = req.params.locale || 'en';
        const messages = {
            ko: '너무 많은 요청입니다. 1분 후 다시 시도해주세요.',
            en: 'Too many requests. Please try again after a minute.',
            ja: 'リクエストが多すぎます。1分後に再試行してください。',
            'zh-tw': '請求過多。請在1分鐘後重試。'
        };

        res.status(429).json({
            error: messages[lang] || messages.en,
            retryAfter: 60
        });
    }
});

// 트렌드 API Rate Limiter (10 requests / 분)
const trendingLimiter = rateLimit({
    windowMs: 60 * 1000, // 1분
    max: 10, // 최대 10 requests
    message: {
        error: 'Too many trending requests, please try again later.',
        retryAfter: 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        return req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
    },
    handler: (req, res) => {
        const lang = req.query.locale || 'en';
        const messages = {
            ko: '트렌드 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
            en: 'Too many trending requests. Please try again later.',
            ja: 'トレンドリクエストが多すぎます。しばらくしてから再試行してください。',
            'zh-tw': '趨勢請求過多。請稍後重試。'
        };

        res.status(429).json({
            error: messages[lang] || messages.en,
            retryAfter: 60
        });
    }
});

// 엄격한 Rate Limiter (알람 설정 등)
const strictLimiter = rateLimit({
    windowMs: 60 * 1000, // 1분
    max: 20, // 최대 20 requests
    message: {
        error: 'Too many requests, please slow down.',
        retryAfter: 60
    },
    standardHeaders: true,
    legacyHeaders: false
});

module.exports = {
    apiLimiter,
    trendingLimiter,
    strictLimiter
};
