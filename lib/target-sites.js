/**
 * 타겟 사이트 정보
 * 
 * 각 사이트별 전용 페이지를 위한 메타데이터
 */

const TARGET_SITES = {
    // 한국 사이트 (한국어 우선)
    interpark: {
        id: 'interpark',
        name: 'Interpark',
        nameKo: '인터파크',
        url: 'https://ticket.interpark.com',
        category: 'ticketing',
        icon: '🎫',
        color: '#e60012',
        priority: 'ko'
    },
    melon: {
        id: 'melon',
        name: 'Melon Ticket',
        nameKo: '멜론티켓',
        url: 'https://ticket.melon.com',
        category: 'ticketing',
        icon: '🎵',
        color: '#00cd3c',
        priority: 'ko'
    },
    yes24: {
        id: 'yes24',
        name: 'YES24',
        nameKo: '예스24',
        url: 'https://ticket.yes24.com',
        category: 'ticketing',
        icon: '📚',
        color: '#0066cc',
        priority: 'ko'
    },
    coupang: {
        id: 'coupang',
        name: 'Coupang',
        nameKo: '쿠팡',
        url: 'https://www.coupang.com',
        category: 'shopping',
        icon: '🛒',
        color: '#ff5a00',
        priority: 'ko'
    },

    // 영어권 사이트 (영어 우선)
    ticketmaster: {
        id: 'ticketmaster',
        name: 'Ticketmaster',
        nameKo: '티켓마스터',
        url: 'https://www.ticketmaster.com',
        category: 'ticketing',
        icon: '🎟️',
        color: '#026cdf',
        priority: 'en'
    },
    stubhub: {
        id: 'stubhub',
        name: 'StubHub',
        nameKo: '스텁허브',
        url: 'https://www.stubhub.com',
        category: 'ticketing',
        icon: '🎭',
        color: '#003168',
        priority: 'en'
    },
    amazon: {
        id: 'amazon',
        name: 'Amazon',
        nameKo: '아마존',
        url: 'https://www.amazon.com',
        category: 'shopping',
        icon: '📦',
        color: '#ff9900',
        priority: 'en'
    },
    ebay: {
        id: 'ebay',
        name: 'eBay',
        nameKo: '이베이',
        url: 'https://www.ebay.com',
        category: 'shopping',
        icon: '🏪',
        color: '#e53238',
        priority: 'en'
    },
    eventbrite: {
        id: 'eventbrite',
        name: 'Eventbrite',
        nameKo: '이벤트브라이트',
        url: 'https://www.eventbrite.com',
        category: 'ticketing',
        icon: '🎉',
        color: '#f05537',
        priority: 'en'
    },

    // 공통 (양쪽 모두)
    university: {
        id: 'university',
        name: 'University Registration',
        nameKo: '대학 수강신청',
        url: 'https://sugang.example.edu',
        category: 'registration',
        icon: '🎓',
        color: '#4a90e2',
        priority: 'both'
    }
};

/**
 * 카테고리별 사이트 목록 조회
 */
function getSitesByCategory(category) {
    return Object.values(TARGET_SITES).filter(site => site.category === category);
}

/**
 * ID로 사이트 정보 조회
 */
function getSiteById(id) {
    return TARGET_SITES[id] || null;
}

/**
 * 모든 사이트 목록 조회
 */
function getAllSites() {
    return Object.values(TARGET_SITES);
}

module.exports = {
    TARGET_SITES,
    getSitesByCategory,
    getSiteById,
    getAllSites
};
