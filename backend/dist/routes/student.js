"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../prisma"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Status color mapping for frontend
const STATUS_COLORS = {
    DRAFT: 'gray',
    SUBMITTED: 'orange',
    APPROVED: 'green',
    REJECTED: 'red',
    PENDING: 'yellow'
};
// Status labels for display
const STATUS_LABELS = {
    DRAFT: 'Draft',
    SUBMITTED: 'Submitted',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    PENDING: 'Pending'
};
router.get('/dashboard', auth_1.authenticateToken, (0, auth_1.requireRole)('STUDENT', 'PROFESSOR', 'HOD'), async (req, res) => {
    try {
        const studentId = req.user.id;
        // Get student information
        const student = await prisma_1.default.user.findUnique({
            where: { id: studentId },
            select: {
                id: true,
                name: true,
                email: true,
                role: true
            }
        });
        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'Student not found'
            });
        }
        // Aggregate assignments by status
        const grouped = await prisma_1.default.assignment.groupBy({
            by: ['status'],
            where: { studentId },
            _count: { status: true }
        });
        // Initialize totals for all statuses
        const totals = {
            DRAFT: 0,
            SUBMITTED: 0,
            APPROVED: 0,
            REJECTED: 0,
            PENDING: 0
        };
        // Populate totals from grouped results
        grouped.forEach((g) => {
            totals[g.status] = g._count.status;
        });
        // Get recent submissions (last 5)
        const recentSubmissions = await prisma_1.default.assignment.findMany({
            where: { studentId },
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: {
                id: true,
                title: true,
                status: true,
                createdAt: true
            }
        });
        // Format recent submissions with status info
        const formattedRecent = recentSubmissions.map((assignment) => ({
            id: assignment.id,
            title: assignment.title,
            status: assignment.status,
            statusLabel: STATUS_LABELS[assignment.status] || assignment.status,
            statusColor: STATUS_COLORS[assignment.status] || 'gray',
            createdAt: assignment.createdAt
        }));
        // Format status counts with color coding
        const statusCounts = [
            {
                status: 'DRAFT',
                label: STATUS_LABELS.DRAFT,
                count: totals.DRAFT,
                color: STATUS_COLORS.DRAFT
            },
            {
                status: 'SUBMITTED',
                label: STATUS_LABELS.SUBMITTED,
                count: totals.SUBMITTED,
                color: STATUS_COLORS.SUBMITTED
            },
            {
                status: 'APPROVED',
                label: STATUS_LABELS.APPROVED,
                count: totals.APPROVED,
                color: STATUS_COLORS.APPROVED
            },
            {
                status: 'REJECTED',
                label: STATUS_LABELS.REJECTED,
                count: totals.REJECTED,
                color: STATUS_COLORS.REJECTED
            }
        ];
        // Calculate total assignments
        const totalAssignments = Object.values(totals).reduce((sum, count) => sum + count, 0);
        return res.json({
            success: true,
            message: 'Dashboard data retrieved successfully',
            data: {
                // Frontend expected structure
                student: {
                    id: student.id,
                    email: student.email
                },
                assignments: {
                    total: totalAssignments,
                    pending: totals.PENDING,
                    approved: totals.APPROVED,
                    rejected: totals.REJECTED
                },
                // Additional data for enhanced features
                statistics: {
                    totalAssignments,
                    statusCounts,
                    summary: {
                        draft: totals.DRAFT,
                        submitted: totals.SUBMITTED,
                        approved: totals.APPROVED,
                        rejected: totals.REJECTED,
                        pending: totals.PENDING
                    }
                },
                recentSubmissions: formattedRecent,
                actions: {
                    uploadNew: {
                        method: 'POST',
                        url: '/student/assignments/upload',
                        label: 'Upload New Assignment'
                    },
                    viewAll: {
                        method: 'GET',
                        url: '/student/assignments',
                        label: 'View All Assignments'
                    }
                }
            }
        });
    }
    catch (error) {
        console.error('Student dashboard error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error while loading dashboard'
        });
    }
});
// GET /student/assignments - View all assignments
router.get('/assignments', auth_1.authenticateToken, (0, auth_1.requireRole)('STUDENT', 'PROFESSOR', 'HOD'), async (req, res) => {
    try {
        const studentId = req.user.id;
        const { status, page = '1', limit = '10' } = req.query;
        const pageNum = parseInt(page, 10) || 1;
        const limitNum = parseInt(limit, 10) || 10;
        const skip = (pageNum - 1) * limitNum;
        // Build where clause
        const where = { studentId };
        if (status && typeof status === 'string') {
            const normalizedStatus = status.toUpperCase();
            if (['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PENDING'].includes(normalizedStatus)) {
                where.status = normalizedStatus;
            }
        }
        // Get assignments with pagination
        const [assignments, total] = await Promise.all([
            prisma_1.default.assignment.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limitNum,
                select: {
                    id: true,
                    title: true,
                    status: true,
                    createdAt: true
                }
            }),
            prisma_1.default.assignment.count({ where })
        ]);
        // Format assignments with status info
        const formattedAssignments = assignments.map((assignment) => ({
            id: assignment.id,
            title: assignment.title,
            status: assignment.status,
            statusLabel: STATUS_LABELS[assignment.status] || assignment.status,
            statusColor: STATUS_COLORS[assignment.status] || 'gray',
            createdAt: assignment.createdAt
        }));
        return res.json({
            success: true,
            message: 'Assignments retrieved successfully',
            data: {
                assignments: formattedAssignments,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    totalPages: Math.ceil(total / limitNum),
                    hasNextPage: pageNum * limitNum < total,
                    hasPreviousPage: pageNum > 1
                }
            }
        });
    }
    catch (error) {
        console.error('Get assignments error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error while retrieving assignments'
        });
    }
});
// POST /student/assignments/upload - Upload new assignment
router.post('/assignments/upload', auth_1.authenticateToken, (0, auth_1.requireRole)('STUDENT', 'PROFESSOR', 'HOD'), async (req, res) => {
    try {
        const studentId = req.user.id;
        const { title, status } = req.body;
        if (!title || typeof title !== 'string' || title.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Title is required and cannot be empty'
            });
        }
        // Default to DRAFT status for new uploads
        const normalizedStatus = status ? String(status).toUpperCase() : 'DRAFT';
        const allowed = ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PENDING'];
        if (!allowed.includes(normalizedStatus)) {
            return res.status(400).json({
                success: false,
                message: `Invalid status. Allowed: ${allowed.join(', ')}`
            });
        }
        const assignment = await prisma_1.default.assignment.create({
            data: {
                title: title.trim(),
                status: normalizedStatus,
                studentId
            },
            select: {
                id: true,
                title: true,
                status: true,
                createdAt: true
            }
        });
        return res.status(201).json({
            success: true,
            message: 'Assignment created successfully',
            data: {
                assignment: {
                    ...assignment,
                    statusLabel: STATUS_LABELS[assignment.status] || assignment.status,
                    statusColor: STATUS_COLORS[assignment.status] || 'gray'
                }
            }
        });
    }
    catch (error) {
        console.error('Upload assignment error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error while creating assignment'
        });
    }
});
exports.default = router;
//# sourceMappingURL=student.js.map