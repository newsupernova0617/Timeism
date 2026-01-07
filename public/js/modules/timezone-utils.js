/**
 * 시간대 유틸리티 모듈
 * 사용자 시간대 감지 및 시간 변환
 */

export function createTimezoneUtils() {
    // 사용자 시간대 정보 가져오기
    function getUserTimezoneInfo() {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const offset = -new Date().getTimezoneOffset() / 60; // 분 → 시간, 부호 반전
        const offsetString = formatOffset(offset);

        return {
            timezone,      // 예: "Asia/Seoul"
            offset,        // 예: 9
            offsetString   // 예: "UTC+9"
        };
    }

    // UTC 오프셋 포맷팅
    function formatOffset(offset) {
        const sign = offset >= 0 ? '+' : '';
        return `UTC${sign}${offset}`;
    }

    // 시간대 이름 가져오기 (약어)
    function getTimezoneAbbr(date = new Date()) {
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZoneName: 'short'
        });
        const parts = formatter.formatToParts(date);
        const timeZonePart = parts.find(part => part.type === 'timeZoneName');
        return timeZonePart ? timeZonePart.value : '';
    }

    // 서버 시간을 사용자 로컬 시간대로 변환
    function convertToLocalTimezone(serverTimeMs) {
        return new Date(serverTimeMs);
    }

    // 두 시간대의 차이 계산 (시간 단위)
    function getTimezoneDifference(offset1, offset2) {
        return Math.abs(offset1 - offset2);
    }

    // 시간대 경고가 필요한지 확인
    function shouldShowTimezoneWarning(serverOffset, userOffset) {
        return serverOffset !== userOffset;
    }

    // 경고 메시지 생성
    function getTimezoneWarningMessage(serverOffset, userOffset, lang = 'ko') {
        const diff = getTimezoneDifference(serverOffset, userOffset);
        const serverOffsetStr = formatOffset(serverOffset);
        const userOffsetStr = formatOffset(userOffset);

        const messages = {
            ko: {
                title: '⚠️ 주의: 서버와 내 시간대가 다릅니다!',
                server: `서버 시간대: ${serverOffsetStr}`,
                user: `내 시간대: ${userOffsetStr}`,
                diff: `시차: ${diff}시간`
            },
            en: {
                title: '⚠️ Warning: Server timezone differs from yours!',
                server: `Server timezone: ${serverOffsetStr}`,
                user: `Your timezone: ${userOffsetStr}`,
                diff: `Time difference: ${diff} hour${diff !== 1 ? 's' : ''}`
            },
            ja: {
                title: '⚠️ 注意: サーバーとタイムゾーンが異なります！',
                server: `サーバータイムゾーン: ${serverOffsetStr}`,
                user: `あなたのタイムゾーン: ${userOffsetStr}`,
                diff: `時差: ${diff}時間`
            },
            'zh-tw': {
                title: '⚠️ 注意：伺服器時區與您不同！',
                server: `伺服器時區: ${serverOffsetStr}`,
                user: `您的時區: ${userOffsetStr}`,
                diff: `時差: ${diff}小時`
            }
        };

        return messages[lang] || messages.ko;
    }

    return {
        getUserTimezoneInfo,
        formatOffset,
        getTimezoneAbbr,
        convertToLocalTimezone,
        getTimezoneDifference,
        shouldShowTimezoneWarning,
        getTimezoneWarningMessage
    };
}
