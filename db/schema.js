/**
 * Drizzle ORM 스키마 정의
 * 
 * SQLite 데이터베이스의 테이블 구조를 정의합니다.
 * Drizzle ORM을 통해 타입 안정성과 자동완성을 제공합니다.
 */

const { sqliteTable, text, integer, index } = require('drizzle-orm/sqlite-core');
const { sql } = require('drizzle-orm');

// ==================== users 테이블 ====================
// 사용자 정보를 저장하는 테이블
const users = sqliteTable('users', {
    // 사용자 고유 ID (기본 키)
    userId: text('user_id').primaryKey(),

    // IP 주소 해시 (SHA-256, 개인정보 보호)
    ipHash: text('ip_hash'),

    // 브라우저 User-Agent 문자열
    userAgent: text('user_agent'),

    // 지역 코드 (예: KR, US, JP)
    region: text('region'),

    // 기기 타입 (desktop, mobile, tablet)
    deviceType: text('device_type'),

    // 최초 방문 시각 (ISO 8601 형식)
    firstVisitAt: text('first_visit_at'),

    // 최근 방문 시각 (ISO 8601 형식)
    lastVisitAt: text('last_visit_at'),

    // 총 방문 횟수
    visitCount: integer('visit_count').default(1).notNull()
}, (table) => ({
    // 인덱스: 최초 방문 시각 기준 조회 최적화
    firstVisitIdx: index('idx_users_first_visit').on(table.firstVisitAt),

    // 인덱스: 최근 방문 시각 기준 조회 최적화
    lastVisitIdx: index('idx_users_last_visit').on(table.lastVisitAt)
}));

// ==================== sessions 테이블 ====================
// 사용자 세션 정보를 저장하는 테이블
const sessions = sqliteTable('sessions', {
    // 세션 고유 ID (기본 키)
    sessionId: text('session_id').primaryKey(),

    // 사용자 ID (외래 키: users.user_id)
    userId: text('user_id').references(() => users.userId),

    // 세션 시작 시각 (ISO 8601 형식)
    startAt: text('start_at'),

    // 세션 종료 시각 (NULL = 진행 중)
    endAt: text('end_at')
}, (table) => ({
    // 인덱스: 사용자 ID 기준 세션 조회 최적화
    userIdIdx: index('idx_sessions_user_id').on(table.userId),

    // 인덱스: 세션 시작 시각 기준 조회 최적화
    startAtIdx: index('idx_sessions_start_at').on(table.startAt)
}));

// ==================== events 테이블 ====================
// 사용자 이벤트 로그를 저장하는 테이블
const events = sqliteTable('events', {
    // 이벤트 고유 ID (자동 증가)
    eventId: integer('event_id').primaryKey({ autoIncrement: true }),

    // 세션 ID (외래 키: sessions.session_id)
    sessionId: text('session_id').references(() => sessions.sessionId),

    // 이벤트 타입 (예: button_click, page_view)
    eventType: text('event_type'),

    // 대상 URL (시간 조회한 URL)
    targetUrl: text('target_url'),

    // 지연 시간 (밀리초, RTT 등)
    latencyMs: integer('latency_ms'),

    // 이벤트 발생 시각 (ISO 8601 형식)
    timestamp: text('timestamp')
}, (table) => ({
    // 인덱스: 세션 ID 기준 이벤트 조회 최적화
    sessionIdIdx: index('idx_events_session_id').on(table.sessionId),

    // 인덱스: 이벤트 타입 기준 조회 최적화
    eventTypeIdx: index('idx_events_event_type').on(table.eventType),

    // 인덱스: 타임스탬프 기준 시계열 조회 최적화
    timestampIdx: index('idx_events_timestamp').on(table.timestamp)
}));

// 스키마 내보내기
module.exports = {
    users,
    sessions,
    events
};
