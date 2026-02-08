import { Router, Response } from 'express';
import crypto from 'crypto';
import prisma from '../prisma';
import { AuthRequest, authenticateToken, requireRole } from '../middleware/auth';
import { sendOtpEmail, sendRejectionEmail } from '../services/email';

const router = Router();

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  PENDING: 'Pending',
  FORWARDED: 'Forwarded'
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'gray',
  SUBMITTED: 'orange',
  APPROVED: 'green',
  REJECTED: 'red',
  PENDING: 'yellow'
};

// In-memory OTP store: key = assignmentId:professorId
const otpStore = new Map<
  string,
  { otp: string; expiresAt: number; remarks?: string; signature?: string }
>();

const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function signatureHash(signature: string): string {
  return crypto.createHash('sha256').update(signature).digest('hex');
}

// GET /professor/dashboard - Pending assignments for the professor/HOD
router.get(
  '/dashboard',
  authenticateToken,
  requireRole('PROFESSOR', 'HOD'),
  async (req: AuthRequest, res: Response) => {
    try {
      const professorId = req.user!.id;

      const pendingAssignments = await prisma.assignment.findMany({
        where: {
          reviewerId: professorId,
          status: { in: ['SUBMITTED', 'FORWARDED'] }
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
      type Row = (typeof pendingAssignments)[number];
      const assignments = pendingAssignments.map((a: Row) => {
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
    } catch (error) {
      console.error('Professor dashboard error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error while loading dashboard'
      });
    }
  }
);

// GET /professor/notifications - Unread notifications for new submissions
router.get(
  '/notifications',
  authenticateToken,
  requireRole('PROFESSOR'),
  async (req: AuthRequest, res: Response) => {
    try {
      const professorId = req.user!.id;

      const notifications = await prisma.notification.findMany({
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
    } catch (error) {
      console.error('Professor notifications error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error while loading notifications'
      });
    }
  }
);

// PATCH /professor/notifications/:id/read - Mark notification as read
router.patch(
  '/notifications/:id/read',
  authenticateToken,
  requireRole('PROFESSOR'),
  async (req: AuthRequest, res: Response) => {
    try {
      const professorId = req.user!.id;
      const idParam = req.params.id;
      const notificationId = typeof idParam === 'string' ? parseInt(idParam, 10) : NaN;

      if (isNaN(notificationId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid notification ID'
        });
      }

      await prisma.notification.updateMany({
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
    } catch (error) {
      console.error('Mark notification read error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

// GET /professor/assignments/:id/review - Get assignment for review (details + file info)
router.get(
  '/assignments/:id/review',
  authenticateToken,
  requireRole('PROFESSOR', 'HOD'),
  async (req: AuthRequest, res: Response) => {
    try {
      const professorId = req.user!.id;
      const idParam = req.params.id;
      const assignmentId = typeof idParam === 'string' ? parseInt(idParam, 10) : NaN;

      if (isNaN(assignmentId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid assignment ID'
        });
      }

      const assignment = await prisma.assignment.findFirst({
        where: {
          id: assignmentId,
          reviewerId: professorId,
          status: { in: ['SUBMITTED', 'FORWARDED'] }
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
            orderBy: { createdAt: 'asc' },
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
          message: 'Assignment not found or not pending your review'
        });
      }

      const formatted = {
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
        message: 'Assignment retrieved for review',
        data: { assignment: formatted }
      });
    } catch (error) {
      console.error('Professor review assignment error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error while loading assignment'
      });
    }
  }
);

// POST /professor/assignments/:id/approve/request-otp - Send OTP to professor's email
router.post(
  '/assignments/:id/approve/request-otp',
  authenticateToken,
  requireRole('PROFESSOR'),
  async (req: AuthRequest, res: Response) => {
    try {
      const professorId = req.user!.id;
      const professorEmail = req.user!.email;
      const idParam = req.params.id;
      const assignmentId = typeof idParam === 'string' ? parseInt(idParam, 10) : NaN;

      if (isNaN(assignmentId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid assignment ID'
        });
      }

      const { remarks, signature } = req.body as { remarks?: string; signature?: string };

      const assignment = await prisma.assignment.findFirst({
        where: {
          id: assignmentId,
          reviewerId: professorId,
          status: 'SUBMITTED'
        },
        select: { id: true, title: true }
      });

      if (!assignment) {
        return res.status(404).json({
          success: false,
          message: 'Assignment not found or not pending your review'
        });
      }

      const otp = generateOtp();
      const key = `${assignmentId}:${professorId}`;
      otpStore.set(key, {
        otp,
        expiresAt: Date.now() + OTP_EXPIRY_MS,
        ...(remarks ? { remarks } : {}),
        ...(signature ? { signature } : {})
      });

      const sent = await sendOtpEmail(professorEmail, otp);
      if (!sent) {
        otpStore.delete(key);
        return res.status(500).json({
          success: false,
          message: 'Failed to send OTP to your email. Please try again.'
        });
      }

      return res.json({
        success: true,
        message: 'OTP sent to your email. Enter it below to approve.'
      });
    } catch (error) {
      console.error('Request OTP error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

// POST /professor/assignments/:id/approve/verify - Verify OTP and approve assignment
router.post(
  '/assignments/:id/approve/verify',
  authenticateToken,
  requireRole('PROFESSOR'),
  async (req: AuthRequest, res: Response) => {
    try {
      const professorId = req.user!.id;
      const professorName = req.user!.email; // We'll get name from DB
      const idParam = req.params.id;
      const assignmentId = typeof idParam === 'string' ? parseInt(idParam, 10) : NaN;

      if (isNaN(assignmentId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid assignment ID'
        });
      }

      const { otp, remarks, signature } = req.body as {
        otp: string;
        remarks?: string;
        signature?: string;
      };

      if (!otp || typeof otp !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'OTP is required'
        });
      }

      const key = `${assignmentId}:${professorId}`;
      const stored = otpStore.get(key);
      if (!stored) {
        return res.status(400).json({
          success: false,
          message: 'No OTP found. Please request a new one.'
        });
      }
      if (Date.now() > stored.expiresAt) {
        otpStore.delete(key);
        return res.status(400).json({
          success: false,
          message: 'OTP has expired. Please request a new one.'
        });
      }
      if (stored.otp !== otp.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Invalid OTP. Please try again.'
        });
      }

      const finalRemarks = remarks ?? stored.remarks ?? '';
      const finalSignature = signature ?? stored.signature ?? professorName;

      const professor = await prisma.user.findUnique({
        where: { id: professorId },
        select: { name: true }
      });
      const signatureForHistory = finalSignature
        ? signatureHash(finalSignature)
        : (professor?.name ?? professorName);

      const assignment = await prisma.assignment.findFirst({
        where: {
          id: assignmentId,
          reviewerId: professorId,
          status: 'SUBMITTED'
        },
        select: { id: true, studentId: true, title: true }
      });

      if (!assignment) {
        otpStore.delete(key);
        return res.status(404).json({
          success: false,
          message: 'Assignment not found or already processed'
        });
      }

      await prisma.$transaction([
        prisma.assignment.update({
          where: { id: assignmentId },
          data: { status: 'APPROVED' }
        }),
        prisma.assignmentHistory.create({
          data: {
            assignmentId,
            reviewerId: professorId,
            action: 'APPROVED',
            remark: finalRemarks || null,
            signature: signatureForHistory
          }
        }),
        prisma.notification.create({
          data: {
            message: `Your assignment "${assignment.title}" has been approved.`,
            type: 'ASSIGNMENT_APPROVED',
            userId: assignment.studentId,
            assignmentId,
            read: false
          }
        })
      ]);

      otpStore.delete(key);

      return res.json({
        success: true,
        message: 'Assignment approved successfully. The student has been notified.'
      });
    } catch (error) {
      console.error('Verify approve error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

// GET /professor/forward-recipients - Professors and HOD in same department (for forwarding)
router.get(
  '/forward-recipients',
  authenticateToken,
  requireRole('PROFESSOR', 'HOD'),
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { departmentId: true }
      });
      if (!user?.departmentId) {
        return res.status(400).json({
          success: false,
          message: 'You must be assigned to a department to forward assignments'
        });
      }
      const recipients = await prisma.user.findMany({
        where: {
          departmentId: user.departmentId,
          id: { not: userId },
          role: { in: ['PROFESSOR', 'HOD'] }
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        },
        orderBy: [{ role: 'asc' }, { name: 'asc' }]
      });
      return res.json({
        success: true,
        message: 'Forward recipients retrieved',
        data: { recipients }
      });
    } catch (error) {
      console.error('Forward recipients error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

// POST /professor/assignments/:id/forward - Forward assignment to another professor/HOD
router.post(
  '/assignments/:id/forward',
  authenticateToken,
  requireRole('PROFESSOR', 'HOD'),
  async (req: AuthRequest, res: Response) => {
    try {
      const professorId = req.user!.id;
      const idParam = req.params.id;
      const assignmentId = typeof idParam === 'string' ? parseInt(idParam, 10) : NaN;

      if (isNaN(assignmentId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid assignment ID'
        });
      }

      const { newReviewerId, note } = req.body as { newReviewerId?: number; note?: string };
      if (newReviewerId == null || typeof newReviewerId !== 'number') {
        return res.status(400).json({
          success: false,
          message: 'Please select a recipient to forward to'
        });
      }

      if (newReviewerId === professorId) {
        return res.status(400).json({
          success: false,
          message: 'You cannot forward an assignment to yourself'
        });
      }

      const currentUser = await prisma.user.findUnique({
        where: { id: professorId },
        select: { departmentId: true }
      });
      if (!currentUser?.departmentId) {
        return res.status(400).json({
          success: false,
          message: 'You must be in a department to forward assignments'
        });
      }

      const newReviewer = await prisma.user.findFirst({
        where: {
          id: newReviewerId,
          departmentId: currentUser.departmentId,
          role: { in: ['PROFESSOR', 'HOD'] }
        }
      });
      if (!newReviewer) {
        return res.status(400).json({
          success: false,
          message: 'Selected recipient is not a valid professor or HOD in your department'
        });
      }

      const assignment = await prisma.assignment.findFirst({
        where: {
          id: assignmentId,
          reviewerId: professorId,
          status: { in: ['SUBMITTED', 'FORWARDED'] }
        },
        select: { id: true, title: true }
      });

      if (!assignment) {
        return res.status(404).json({
          success: false,
          message: 'Assignment not found or not under your review'
        });
      }

      const professor = await prisma.user.findUnique({
        where: { id: professorId },
        select: { name: true }
      });
      const forwardNote = typeof note === 'string' ? note.trim() : '';
      const signatureForHistory = professor?.name ?? req.user!.email;

      await prisma.$transaction([
        prisma.assignment.update({
          where: { id: assignmentId },
          data: { reviewerId: newReviewerId, status: 'FORWARDED' }
        }),
        prisma.assignmentHistory.create({
          data: {
            assignmentId,
            reviewerId: professorId,
            action: 'FORWARDED',
            remark: forwardNote || null,
            signature: signatureForHistory
          }
        }),
        prisma.notification.create({
          data: {
            message: forwardNote
              ? `Assignment "${assignment.title}" forwarded to you for review. Note: ${forwardNote.slice(0, 150)}${forwardNote.length > 150 ? '...' : ''}`
              : `Assignment "${assignment.title}" has been forwarded to you for review.`,
            type: 'ASSIGNMENT_FORWARDED',
            userId: newReviewerId,
            assignmentId,
            read: false
          }
        })
      ]);

      return res.json({
        success: true,
        message: 'Assignment forwarded successfully. The new reviewer has been notified.'
      });
    } catch (error) {
      console.error('Forward assignment error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

// POST /professor/assignments/:id/reject - Reject assignment with mandatory feedback
router.post(
  '/assignments/:id/reject',
  authenticateToken,
  requireRole('PROFESSOR'),
  async (req: AuthRequest, res: Response) => {
    try {
      const professorId = req.user!.id;
      const idParam = req.params.id;
      const assignmentId = typeof idParam === 'string' ? parseInt(idParam, 10) : NaN;

      if (isNaN(assignmentId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid assignment ID'
        });
      }

      const { remark } = req.body as { remark?: string };
      const trimmedRemark = typeof remark === 'string' ? remark.trim() : '';

      if (trimmedRemark.length < 10) {
        return res.status(400).json({
          success: false,
          message: 'Feedback is required and must be at least 10 characters so the student can improve.'
        });
      }

      const assignment = await prisma.assignment.findFirst({
        where: {
          id: assignmentId,
          reviewerId: professorId,
          status: 'SUBMITTED'
        },
        select: {
          id: true,
          title: true,
          studentId: true,
          student: { select: { email: true, name: true } }
        }
      });

      if (!assignment) {
        return res.status(404).json({
          success: false,
          message: 'Assignment not found or not pending your review'
        });
      }

      const professor = await prisma.user.findUnique({
        where: { id: professorId },
        select: { name: true }
      });
      const signatureForHistory = professor?.name ?? req.user!.email;

      await prisma.$transaction([
        prisma.assignment.update({
          where: { id: assignmentId },
          data: { status: 'REJECTED', reviewerId: null }
        }),
        prisma.assignmentHistory.create({
          data: {
            assignmentId,
            reviewerId: professorId,
            action: 'REJECTED',
            remark: trimmedRemark,
            signature: signatureForHistory
          }
        }),
        prisma.notification.create({
          data: {
            message: `Your assignment "${assignment.title}" has been rejected. Feedback: ${trimmedRemark.slice(0, 100)}${trimmedRemark.length > 100 ? '...' : ''}`,
            type: 'ASSIGNMENT_REJECTED',
            userId: assignment.studentId,
            assignmentId,
            read: false
          }
        })
      ]);

      await sendRejectionEmail(
        assignment.student.email,
        assignment.title,
        trimmedRemark
      );

      return res.json({
        success: true,
        message: 'Assignment rejected. The student has been notified and can resubmit.'
      });
    } catch (error) {
      console.error('Reject assignment error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
);

export default router;
