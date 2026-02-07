"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../prisma"));
const auth_1 = require("../middleware/auth");
const upload_1 = require("../middleware/upload");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
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
                    description: true,
                    category: true,
                    status: true,
                    filePath: true,
                    createdAt: true,
                    submittedAt: true,
                    reviewerId: true,
                    reviewer: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    }
                }
            }),
            prisma_1.default.assignment.count({ where })
        ]);
        // Format assignments with status info
        const formattedAssignments = assignments.map((assignment) => ({
            id: assignment.id,
            title: assignment.title,
            description: assignment.description,
            category: assignment.category,
            status: assignment.status,
            statusLabel: STATUS_LABELS[assignment.status] || assignment.status,
            statusColor: STATUS_COLORS[assignment.status] || 'gray',
            filePath: assignment.filePath,
            createdAt: assignment.createdAt,
            submittedAt: assignment.submittedAt,
            reviewer: assignment.reviewer
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
// GET /student/assignments/:id - Get assignment details
router.get('/assignments/:id', auth_1.authenticateToken, (0, auth_1.requireRole)('STUDENT', 'PROFESSOR', 'HOD'), async (req, res) => {
    try {
        const userId = req.user.id;
        const assignmentId = parseInt(req.params.id, 10);
        if (isNaN(assignmentId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid assignment ID'
            });
        }
        // Allow access if user is the student or the reviewer (professor)
        const assignment = await prisma_1.default.assignment.findFirst({
            where: {
                id: assignmentId,
                OR: [
                    { studentId: userId },
                    { reviewerId: userId }
                ]
            },
            select: {
                id: true,
                title: true,
                description: true,
                category: true,
                status: true,
                filePath: true,
                createdAt: true,
                submittedAt: true,
                reviewerId: true,
                reviewer: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true
                    }
                },
                student: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                history: {
                    orderBy: {
                        createdAt: 'asc'
                    },
                    select: {
                        id: true,
                        action: true,
                        remark: true,
                        signature: true,
                        createdAt: true,
                        reviewer: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                role: true
                            }
                        }
                    }
                }
            }
        });
        if (!assignment) {
            return res.status(404).json({
                success: false,
                message: 'Assignment not found'
            });
        }
        // Format assignment with status info
        const formattedAssignment = {
            id: assignment.id,
            title: assignment.title,
            description: assignment.description,
            category: assignment.category,
            status: assignment.status,
            statusLabel: STATUS_LABELS[assignment.status] || assignment.status,
            statusColor: STATUS_COLORS[assignment.status] || 'gray',
            filePath: assignment.filePath,
            createdAt: assignment.createdAt,
            submittedAt: assignment.submittedAt,
            student: assignment.student,
            reviewer: assignment.reviewer,
            history: assignment.history.map((h) => ({
                id: h.id,
                action: h.action,
                remark: h.remark,
                signature: h.signature || h.reviewer.name,
                createdAt: h.createdAt,
                reviewer: {
                    id: h.reviewer.id,
                    name: h.reviewer.name,
                    email: h.reviewer.email,
                    role: h.reviewer.role
                }
            }))
        };
        return res.json({
            success: true,
            message: 'Assignment retrieved successfully',
            data: {
                assignment: formattedAssignment
            }
        });
    }
    catch (error) {
        console.error('Get assignment details error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error while retrieving assignment'
        });
    }
});
// GET /student/assignments/:id/download - Download assignment file
router.get('/assignments/:id/download', auth_1.authenticateToken, (0, auth_1.requireRole)('STUDENT', 'PROFESSOR', 'HOD'), async (req, res) => {
    try {
        const userId = req.user.id;
        const assignmentId = parseInt(req.params.id, 10);
        if (isNaN(assignmentId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid assignment ID'
            });
        }
        // Allow download if user is the student or the reviewer (professor)
        const assignment = await prisma_1.default.assignment.findFirst({
            where: {
                id: assignmentId,
                OR: [
                    { studentId: userId },
                    { reviewerId: userId }
                ]
            },
            select: {
                id: true,
                title: true,
                filePath: true
            }
        });
        if (!assignment) {
            return res.status(404).json({
                success: false,
                message: 'Assignment not found'
            });
        }
        if (!assignment.filePath) {
            return res.status(404).json({
                success: false,
                message: 'Assignment file not found'
            });
        }
        // Check if file exists
        const fs = require('fs');
        const path = require('path');
        const filePath = path.join(process.cwd(), assignment.filePath);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                message: 'Assignment file not found on server'
            });
        }
        // Send file
        const fileName = assignment.title.replace(/[^a-zA-Z0-9.-]/g, '_') + '.pdf';
        res.download(filePath, fileName, (err) => {
            if (err) {
                console.error('Error downloading file:', err);
                if (!res.headersSent) {
                    return res.status(500).json({
                        success: false,
                        message: 'Error downloading file'
                    });
                }
            }
        });
    }
    catch (error) {
        console.error('Download assignment error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error while downloading assignment'
        });
    }
});
// GET /student/professors - Get professors from student's department
router.get('/professors', auth_1.authenticateToken, (0, auth_1.requireRole)('STUDENT', 'PROFESSOR', 'HOD'), async (req, res) => {
    try {
        const userId = req.user.id;
        // Get current user to find their department
        const user = await prisma_1.default.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                departmentId: true
            }
        });
        if (!user || !user.departmentId) {
            return res.status(400).json({
                success: false,
                message: 'Student must be assigned to a department'
            });
        }
        // Get all professors from the same department
        const professors = await prisma_1.default.user.findMany({
            where: {
                departmentId: user.departmentId,
                role: 'PROFESSOR'
            },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true
            },
            orderBy: {
                name: 'asc'
            }
        });
        return res.json({
            success: true,
            message: 'Professors retrieved successfully',
            data: {
                professors
            }
        });
    }
    catch (error) {
        console.error('Get professors error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error while retrieving professors'
        });
    }
});
// POST /student/assignments/:id/submit - Submit draft assignment for review
router.post('/assignments/:id/submit', auth_1.authenticateToken, (0, auth_1.requireRole)('STUDENT', 'PROFESSOR', 'HOD'), async (req, res) => {
    try {
        const studentId = req.user.id;
        const assignmentId = parseInt(req.params.id, 10);
        const { reviewerId } = req.body;
        if (isNaN(assignmentId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid assignment ID'
            });
        }
        if (!reviewerId || typeof reviewerId !== 'number') {
            return res.status(400).json({
                success: false,
                message: 'Reviewer ID is required'
            });
        }
        // Get assignment and verify it belongs to the student
        const assignment = await prisma_1.default.assignment.findFirst({
            where: {
                id: assignmentId,
                studentId
            },
            select: {
                id: true,
                status: true,
                title: true
            }
        });
        if (!assignment) {
            return res.status(404).json({
                success: false,
                message: 'Assignment not found'
            });
        }
        // Verify assignment is in DRAFT status
        if (assignment.status !== 'DRAFT') {
            return res.status(400).json({
                success: false,
                message: `Assignment cannot be submitted. Current status: ${assignment.status}. Only DRAFT assignments can be submitted.`
            });
        }
        // Verify reviewer is a professor
        const reviewer = await prisma_1.default.user.findFirst({
            where: {
                id: reviewerId,
                role: 'PROFESSOR'
            },
            select: {
                id: true,
                name: true,
                email: true,
                departmentId: true
            }
        });
        if (!reviewer) {
            return res.status(404).json({
                success: false,
                message: 'Reviewer not found or is not a professor'
            });
        }
        // Verify reviewer is in the same department as student
        const student = await prisma_1.default.user.findUnique({
            where: { id: studentId },
            select: { departmentId: true }
        });
        if (!student || student.departmentId !== reviewer.departmentId) {
            return res.status(400).json({
                success: false,
                message: 'Reviewer must be from the same department as the student'
            });
        }
        // Update assignment status and set reviewer
        const updatedAssignment = await prisma_1.default.assignment.update({
            where: { id: assignmentId },
            data: {
                status: 'SUBMITTED',
                reviewerId: reviewerId,
                submittedAt: new Date()
            },
            select: {
                id: true,
                title: true,
                status: true,
                submittedAt: true,
                reviewer: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });
        // Create history entry for submission
        try {
            await prisma_1.default.assignmentHistory.create({
                data: {
                    assignmentId: assignmentId,
                    reviewerId: reviewerId,
                    action: 'SUBMITTED',
                    remark: `Assignment submitted for review to ${reviewer.name}`,
                    signature: reviewer.name
                }
            });
        }
        catch (historyError) {
            // Log error but don't fail the submission
            console.error('Error creating history entry:', historyError);
        }
        // Create notification for the professor
        try {
            await prisma_1.default.notification.create({
                data: {
                    message: `New assignment "${assignment.title}" submitted by student for review`,
                    type: 'ASSIGNMENT_SUBMITTED',
                    userId: reviewerId,
                    assignmentId: assignmentId,
                    read: false
                }
            });
        }
        catch (notificationError) {
            // Log error but don't fail the submission
            console.error('Error creating notification:', notificationError);
        }
        return res.json({
            success: true,
            message: 'Assignment submitted successfully for review',
            data: {
                assignment: {
                    id: updatedAssignment.id,
                    title: updatedAssignment.title,
                    status: updatedAssignment.status,
                    statusLabel: STATUS_LABELS[updatedAssignment.status] || updatedAssignment.status,
                    statusColor: STATUS_COLORS[updatedAssignment.status] || 'gray',
                    submittedAt: updatedAssignment.submittedAt,
                    reviewer: updatedAssignment.reviewer
                }
            }
        });
    }
    catch (error) {
        console.error('Submit assignment error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error while submitting assignment'
        });
    }
});
// POST /student/assignments/upload - Upload new assignment with file
router.post('/assignments/upload', auth_1.authenticateToken, (0, auth_1.requireRole)('STUDENT', 'PROFESSOR', 'HOD'), upload_1.uploadAssignment.single('file'), upload_1.handleUploadError, async (req, res) => {
    try {
        const studentId = req.user.id;
        const { title, description, category } = req.body;
        const file = req.file;
        // Validate required fields
        if (!title || typeof title !== 'string' || title.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Title is required and cannot be empty'
            });
        }
        // Validate file is provided
        if (!file) {
            return res.status(400).json({
                success: false,
                message: 'File is required. Please upload a PDF file.'
            });
        }
        // Validate file type (additional check)
        if (file.mimetype !== 'application/pdf') {
            return res.status(400).json({
                success: false,
                message: 'Only PDF files are allowed'
            });
        }
        // Validate category
        const normalizedCategory = category ? String(category).toUpperCase() : 'ASSIGNMENT';
        const allowedCategories = ['ASSIGNMENT', 'THESIS', 'REPORT'];
        if (!allowedCategories.includes(normalizedCategory)) {
            return res.status(400).json({
                success: false,
                message: `Invalid category. Allowed: ${allowedCategories.join(', ')}`
            });
        }
        // Create assignment with file path
        const assignment = await prisma_1.default.assignment.create({
            data: {
                title: title.trim(),
                description: description?.trim() || null,
                category: normalizedCategory,
                filePath: file.path,
                status: 'DRAFT', // Always start as DRAFT
                studentId
            },
            select: {
                id: true,
                title: true,
                description: true,
                category: true,
                filePath: true,
                status: true,
                createdAt: true
            }
        });
        return res.status(201).json({
            success: true,
            message: `Assignment uploaded successfully with ID: ${assignment.id}`,
            data: {
                assignment: {
                    id: assignment.id,
                    title: assignment.title,
                    description: assignment.description,
                    category: assignment.category,
                    status: assignment.status,
                    statusLabel: STATUS_LABELS[assignment.status] || assignment.status,
                    statusColor: STATUS_COLORS[assignment.status] || 'gray',
                    filePath: assignment.filePath,
                    createdAt: assignment.createdAt
                }
            }
        });
    }
    catch (error) {
        console.error('Upload assignment error:', error);
        // Clean up uploaded file if assignment creation failed
        if (req.file) {
            const fs = require('fs');
            try {
                fs.unlinkSync(req.file.path);
            }
            catch (unlinkError) {
                console.error('Error deleting uploaded file:', unlinkError);
            }
        }
        return res.status(500).json({
            success: false,
            message: 'Internal server error while creating assignment'
        });
    }
});
// POST /student/assignments/:id/resubmit - Resubmit rejected assignment
router.post('/assignments/:id/resubmit', auth_1.authenticateToken, (0, auth_1.requireRole)('STUDENT', 'PROFESSOR', 'HOD'), upload_1.uploadAssignment.single('file'), upload_1.handleUploadError, async (req, res) => {
    try {
        const studentId = req.user.id;
        const assignmentId = parseInt(req.params.id, 10);
        const { description } = req.body;
        const file = req.file;
        if (isNaN(assignmentId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid assignment ID'
            });
        }
        // Get assignment and verify it belongs to the student
        const assignment = await prisma_1.default.assignment.findFirst({
            where: {
                id: assignmentId,
                studentId
            },
            select: {
                id: true,
                title: true,
                status: true,
                description: true,
                filePath: true,
                reviewerId: true,
                reviewer: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });
        if (!assignment) {
            return res.status(404).json({
                success: false,
                message: 'Assignment not found'
            });
        }
        // Verify assignment is in REJECTED status
        if (assignment.status !== 'REJECTED') {
            // Clean up uploaded file if provided
            if (file) {
                try {
                    fs_1.default.unlinkSync(file.path);
                }
                catch (unlinkError) {
                    console.error('Error deleting uploaded file:', unlinkError);
                }
            }
            return res.status(400).json({
                success: false,
                message: `Assignment cannot be resubmitted. Current status: ${assignment.status}. Only REJECTED assignments can be resubmitted.`
            });
        }
        // Verify reviewer still exists
        if (!assignment.reviewerId || !assignment.reviewer) {
            if (file) {
                try {
                    fs_1.default.unlinkSync(file.path);
                }
                catch (unlinkError) {
                    console.error('Error deleting uploaded file:', unlinkError);
                }
            }
            return res.status(400).json({
                success: false,
                message: 'Original reviewer not found. Cannot resubmit.'
            });
        }
        // Prepare update data
        const updateData = {
            status: 'SUBMITTED',
            submittedAt: new Date()
        };
        // Update description if provided
        if (description !== undefined) {
            updateData.description = description.trim() || null;
        }
        // Update file if provided
        if (file) {
            // Validate file type
            if (file.mimetype !== 'application/pdf') {
                try {
                    fs_1.default.unlinkSync(file.path);
                }
                catch (unlinkError) {
                    console.error('Error deleting uploaded file:', unlinkError);
                }
                return res.status(400).json({
                    success: false,
                    message: 'Only PDF files are allowed'
                });
            }
            // Archive old file by moving it (optional - for now we just replace)
            // In production, you might want to keep old files in an archive folder
            const oldFilePath = assignment.filePath;
            if (oldFilePath) {
                const oldFileFullPath = path_1.default.join(process.cwd(), oldFilePath);
                // Optionally archive old file instead of deleting
                // For now, we'll keep the new file path
            }
            updateData.filePath = file.path;
        }
        // Update assignment
        const updatedAssignment = await prisma_1.default.assignment.update({
            where: { id: assignmentId },
            data: updateData,
            select: {
                id: true,
                title: true,
                status: true,
                description: true,
                filePath: true,
                submittedAt: true,
                reviewer: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });
        // Create history entry for resubmission
        try {
            await prisma_1.default.assignmentHistory.create({
                data: {
                    assignmentId: assignmentId,
                    reviewerId: assignment.reviewerId,
                    action: 'SUBMITTED',
                    remark: file
                        ? `Assignment resubmitted with new file. ${description ? 'Description updated.' : ''}`
                        : `Assignment resubmitted. ${description ? 'Description updated.' : 'Original file retained.'}`,
                    signature: 'Student Resubmission'
                }
            });
        }
        catch (historyError) {
            console.error('Error creating history entry:', historyError);
        }
        // Create notification for the original reviewer
        try {
            await prisma_1.default.notification.create({
                data: {
                    message: `Assignment "${assignment.title}" has been resubmitted by the student`,
                    type: 'ASSIGNMENT_RESUBMITTED',
                    userId: assignment.reviewerId,
                    assignmentId: assignmentId,
                    read: false
                }
            });
        }
        catch (notificationError) {
            console.error('Error creating notification:', notificationError);
        }
        return res.json({
            success: true,
            message: 'Assignment resubmitted successfully',
            data: {
                assignment: {
                    id: updatedAssignment.id,
                    title: updatedAssignment.title,
                    status: updatedAssignment.status,
                    statusLabel: STATUS_LABELS[updatedAssignment.status] || updatedAssignment.status,
                    statusColor: STATUS_COLORS[updatedAssignment.status] || 'gray',
                    description: updatedAssignment.description,
                    filePath: updatedAssignment.filePath,
                    submittedAt: updatedAssignment.submittedAt,
                    reviewer: updatedAssignment.reviewer
                }
            }
        });
    }
    catch (error) {
        console.error('Resubmit assignment error:', error);
        // Clean up uploaded file if assignment update failed
        const file = req.file;
        if (file) {
            try {
                fs_1.default.unlinkSync(file.path);
            }
            catch (unlinkError) {
                console.error('Error deleting uploaded file:', unlinkError);
            }
        }
        return res.status(500).json({
            success: false,
            message: 'Internal server error while resubmitting assignment'
        });
    }
});
// POST /student/assignments/bulk-upload - Upload multiple assignments at once
router.post('/assignments/bulk-upload', auth_1.authenticateToken, (0, auth_1.requireRole)('STUDENT', 'PROFESSOR', 'HOD'), upload_1.uploadAssignmentArray.array('files', 5), upload_1.handleUploadError, async (req, res) => {
    try {
        const studentId = req.user.id;
        const { description, category } = req.body;
        const files = req.files;
        // Validate files are provided
        if (!files || files.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'At least one file is required. Please upload PDF files.'
            });
        }
        // Validate file count (max 5)
        if (files.length > 5) {
            // Clean up uploaded files
            files.forEach((file) => {
                try {
                    fs_1.default.unlinkSync(file.path);
                }
                catch (unlinkError) {
                    console.error('Error deleting uploaded file:', unlinkError);
                }
            });
            return res.status(400).json({
                success: false,
                message: 'Maximum 5 files allowed'
            });
        }
        // Validate all files are PDFs
        for (const file of files) {
            if (file.mimetype !== 'application/pdf') {
                // Clean up uploaded files
                files.forEach((f) => {
                    try {
                        fs_1.default.unlinkSync(f.path);
                    }
                    catch (unlinkError) {
                        console.error('Error deleting uploaded file:', unlinkError);
                    }
                });
                return res.status(400).json({
                    success: false,
                    message: 'Only PDF files are allowed'
                });
            }
        }
        // Validate category
        const normalizedCategory = category ? String(category).toUpperCase() : 'ASSIGNMENT';
        const allowedCategories = ['ASSIGNMENT', 'THESIS', 'REPORT'];
        if (!allowedCategories.includes(normalizedCategory)) {
            // Clean up uploaded files
            files.forEach((file) => {
                try {
                    fs_1.default.unlinkSync(file.path);
                }
                catch (unlinkError) {
                    console.error('Error deleting uploaded file:', unlinkError);
                }
            });
            return res.status(400).json({
                success: false,
                message: `Invalid category. Allowed: ${allowedCategories.join(', ')}`
            });
        }
        // Process files and create assignments
        const createdAssignments = [];
        const errors = [];
        const uploadedFiles = [];
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            try {
                // Use original filename as title (without extension)
                const title = file.originalname.replace(/\.[^/.]+$/, '') || `Assignment ${i + 1}`;
                const assignment = await prisma_1.default.assignment.create({
                    data: {
                        title: title.trim(),
                        description: description?.trim() || null,
                        category: normalizedCategory,
                        filePath: file.path,
                        status: 'DRAFT', // Always start as DRAFT
                        studentId
                    },
                    select: {
                        id: true,
                        title: true,
                        description: true,
                        category: true,
                        filePath: true,
                        status: true,
                        createdAt: true
                    }
                });
                createdAssignments.push({
                    id: assignment.id,
                    title: assignment.title,
                    description: assignment.description,
                    category: assignment.category,
                    status: assignment.status,
                    statusLabel: STATUS_LABELS[assignment.status] || assignment.status,
                    statusColor: STATUS_COLORS[assignment.status] || 'gray',
                    filePath: assignment.filePath,
                    fileName: file.originalname,
                    createdAt: assignment.createdAt
                });
                uploadedFiles.push(file);
            }
            catch (error) {
                console.error(`Error creating assignment for file ${file.originalname}:`, error);
                errors.push({
                    fileName: file.originalname,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
                // Clean up this file
                try {
                    fs_1.default.unlinkSync(file.path);
                }
                catch (unlinkError) {
                    console.error('Error deleting uploaded file:', unlinkError);
                }
            }
        }
        // If all assignments failed, return error
        if (createdAssignments.length === 0) {
            return res.status(500).json({
                success: false,
                message: 'Failed to create assignments',
                errors
            });
        }
        // Return success with created assignments
        return res.status(201).json({
            success: true,
            message: `Successfully uploaded ${createdAssignments.length} assignment(s)`,
            data: {
                assignments: createdAssignments,
                summary: {
                    total: files.length,
                    successful: createdAssignments.length,
                    failed: errors.length
                },
                errors: errors.length > 0 ? errors : undefined
            }
        });
    }
    catch (error) {
        console.error('Bulk upload assignment error:', error);
        // Clean up uploaded files if any
        const files = req.files;
        if (files && Array.isArray(files)) {
            files.forEach((file) => {
                try {
                    fs_1.default.unlinkSync(file.path);
                }
                catch (unlinkError) {
                    console.error('Error deleting uploaded file:', unlinkError);
                }
            });
        }
        return res.status(500).json({
            success: false,
            message: 'Internal server error while creating assignments'
        });
    }
});
exports.default = router;
//# sourceMappingURL=student.js.map