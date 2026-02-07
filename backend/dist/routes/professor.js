"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../prisma"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// GET /professor/dashboard - Pending assignments for the professor
router.get('/dashboard', auth_1.authenticateToken, (0, auth_1.requireRole)('PROFESSOR'), async (req, res) => {
    try {
        const professorId = req.user.id;
        const pendingAssignments = await prisma_1.default.assignment.findMany({
            where: {
                reviewerId: professorId,
                status: 'SUBMITTED'
            },
            orderBy: {
                submittedAt: 'asc'
            },
            select: {
                id: true,
                title: true,
                submittedAt: true,
                student: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });
        const now = new Date();
        const assignments = pendingAssignments.map((a) => {
            const submittedAt = a.submittedAt ? new Date(a.submittedAt) : null;
            const daysPending = submittedAt
                ? Math.floor((now.getTime() - submittedAt.getTime()) / (1000 * 60 * 60 * 24))
                : 0;
            return {
                id: a.id,
                title: a.title,
                studentName: a.student.name,
                studentEmail: a.student.email,
                submittedAt: a.submittedAt,
                daysPending
            };
        });
        return res.json({
            success: true,
            message: 'Professor dashboard retrieved successfully',
            data: {
                pendingCount: assignments.length,
                assignments
            }
        });
    }
    catch (error) {
        console.error('Professor dashboard error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error while loading dashboard'
        });
    }
});
// GET /professor/notifications - Unread notifications for new submissions
router.get('/notifications', auth_1.authenticateToken, (0, auth_1.requireRole)('PROFESSOR'), async (req, res) => {
    try {
        const professorId = req.user.id;
        const notifications = await prisma_1.default.notification.findMany({
            where: {
                userId: professorId,
                read: false
            },
            orderBy: { createdAt: 'desc' },
            take: 20,
            select: {
                id: true,
                message: true,
                type: true,
                read: true,
                assignmentId: true,
                createdAt: true
            }
        });
        return res.json({
            success: true,
            message: 'Notifications retrieved successfully',
            data: {
                notifications
            }
        });
    }
    catch (error) {
        console.error('Professor notifications error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error while loading notifications'
        });
    }
});
// PATCH /professor/notifications/:id/read - Mark notification as read
router.patch('/notifications/:id/read', auth_1.authenticateToken, (0, auth_1.requireRole)('PROFESSOR'), async (req, res) => {
    try {
        const professorId = req.user.id;
        const notificationId = parseInt(req.params.id, 10);
        if (isNaN(notificationId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid notification ID'
            });
        }
        await prisma_1.default.notification.updateMany({
            where: {
                id: notificationId,
                userId: professorId
            },
            data: { read: true }
        });
        return res.json({
            success: true,
            message: 'Notification marked as read'
        });
    }
    catch (error) {
        console.error('Mark notification read error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});
exports.default = router;
//# sourceMappingURL=professor.js.map