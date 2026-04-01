/**
 * 댓글 API 라우트
 * 익명 댓글 시스템 (닉네임 없음, 자동 정리)
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const commentRepo = require('../lib/comment-repository');

// IP 해시 생성
function hashIp(ip) {
    return crypto.createHash('sha256').update(ip + (process.env.IP_SALT || 'SyncTime-salt')).digest('hex');
}

// 댓글 조회
router.get('/comments/:pageId', async (req, res) => {
    try {
        const { pageId } = req.params;
        const { limit = 20, offset = 0 } = req.query;

        const comments = await commentRepo.getCommentsByPage(pageId, {
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        const total = await commentRepo.getCommentsCount(pageId);

        res.json({
            success: true,
            comments: comments.map(c => ({
                id: c.commentId,
                content: c.content,
                createdAt: c.createdAt
            })),
            total,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
    } catch (error) {
        console.error('Error fetching comments:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch comments'
        });
    }
});

// 댓글 작성 (익명, 닉네임 없음)
router.post('/comments', async (req, res) => {
    try {
        const { pageId, content, honeypot } = req.body;

        // Honeypot 스팸 방지
        if (honeypot) {
            return res.status(400).json({
                success: false,
                error: 'Invalid request'
            });
        }

        // 필수 필드 검증
        if (!pageId || !content) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields'
            });
        }

        // 길이 검증 (200자)
        if (content.length > 200) {
            return res.status(400).json({
                success: false,
                error: 'Content too long (max 200 characters)'
            });
        }

        if (content.length < 2) {
            return res.status(400).json({
                success: false,
                error: 'Content too short (min 2 characters)'
            });
        }

        // IP 기반 Rate Limiting
        const clientIp = req.ip || req.connection.remoteAddress;
        const ipHash = hashIp(clientIp);

        const recentCount = commentRepo.getRecentCommentCountByIp(ipHash, 5);
        if (recentCount >= 3) {
            return res.status(429).json({
                success: false,
                error: 'Too many comments. Please wait a few minutes.'
            });
        }

        // 댓글 저장 (익명)
        const commentId = commentRepo.createComment({
            pageId,
            author: 'Anonymous',
            content: content.trim(),
            ipHash
        });

        // 오래된 댓글 자동 삭제 (최근 10개만 유지)
        await commentRepo.cleanupOldComments(pageId, 10);

        res.json({
            success: true,
            commentId,
            message: 'Comment posted successfully'
        });
    } catch (error) {
        console.error('Error creating comment:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to post comment'
        });
    }
});

// 댓글 삭제 (관리자 전용)
router.delete('/comments/:commentId', (req, res) => {
    try {
        const { commentId } = req.params;

        commentRepo.deleteComment(parseInt(commentId));

        res.json({
            success: true,
            message: 'Comment deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting comment:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete comment'
        });
    }
});

module.exports = router;
