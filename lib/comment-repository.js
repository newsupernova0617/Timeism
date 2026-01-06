/**
 * 댓글 Repository
 * 익명 댓글 시스템 + 자동 완전 삭제 (최근 10개만 유지)
 */

const { eq, sql, desc, and } = require('drizzle-orm');
const { getDb } = require('../db');
const { comments } = require('../db/schema');

// 댓글 작성
function createComment({ pageId, author, content, ipHash }) {
    const db = getDb();
    const nowIso = new Date().toISOString();

    const result = db.insert(comments).values({
        pageId,
        author: author.substring(0, 50),
        content: content.substring(0, 200),
        ipHash,
        createdAt: nowIso,
        isDeleted: 0,
        reportCount: 0
    }).run();

    return result.lastInsertRowid;
}

// 페이지별 댓글 조회
function getCommentsByPage(pageId, options = {}) {
    const db = getDb();
    const { limit = 10, offset = 0 } = options;

    return db.select()
        .from(comments)
        .where(and(
            eq(comments.pageId, pageId),
            eq(comments.isDeleted, 0)
        ))
        .orderBy(desc(comments.createdAt))
        .limit(limit)
        .offset(offset)
        .all();
}

// 댓글 개수 조회
function getCommentsCount(pageId) {
    const db = getDb();

    const result = db.select({ count: sql`COUNT(*)` })
        .from(comments)
        .where(and(
            eq(comments.pageId, pageId),
            eq(comments.isDeleted, 0)
        ))
        .get();

    return result?.count || 0;
}

// 댓글 삭제
function deleteComment(commentId) {
    const db = getDb();

    db.update(comments)
        .set({ isDeleted: 1 })
        .where(eq(comments.commentId, commentId))
        .run();
}

// IP별 최근 댓글 개수
function getRecentCommentCountByIp(ipHash, minutesAgo = 5) {
    const db = getDb();
    const cutoffTime = new Date(Date.now() - minutesAgo * 60 * 1000).toISOString();

    const result = db.select({ count: sql`COUNT(*)` })
        .from(comments)
        .where(and(
            eq(comments.ipHash, ipHash),
            sql`${comments.createdAt} > ${cutoffTime}`
        ))
        .get();

    return result?.count || 0;
}

// 오래된 댓글 완전 삭제 (최근 10개만 유지)
function cleanupOldComments(pageId, keepCount = 10) {
    const db = getDb();

    // 해당 페이지의 댓글 개수 확인
    const total = getCommentsCount(pageId);

    if (total <= keepCount) {
        return; // 삭제할 필요 없음
    }

    // 오래된 댓글 ID 찾기 (최근 10개 제외)
    const oldComments = db.select({ commentId: comments.commentId })
        .from(comments)
        .where(and(
            eq(comments.pageId, pageId),
            eq(comments.isDeleted, 0)
        ))
        .orderBy(desc(comments.createdAt))
        .limit(9999)
        .offset(keepCount)
        .all();

    // 오래된 댓글 완전 삭제 (하드 삭제 - DB 공간 절약)
    oldComments.forEach(comment => {
        db.delete(comments)
            .where(eq(comments.commentId, comment.commentId))
            .run();
    });

    if (oldComments.length > 0) {
        console.log(`🗑️ Permanently deleted ${oldComments.length} old comments for page ${pageId}`);
    }
}

module.exports = {
    createComment,
    getCommentsByPage,
    getCommentsCount,
    deleteComment,
    getRecentCommentCountByIp,
    cleanupOldComments
};
