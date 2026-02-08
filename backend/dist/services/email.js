"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendOtpEmail = sendOtpEmail;
exports.sendRejectionEmail = sendRejectionEmail;
const nodemailer_1 = __importDefault(require("nodemailer"));
const transporter = nodemailer_1.default.createTransport({
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
        : undefined
});
async function sendOtpEmail(to, otp) {
    const subject = 'Assignment approval OTP - University Assignment Approval Platform';
    const text = `Your OTP for approving the assignment is: ${otp}\n\nThis code expires in 10 minutes. Do not share it with anyone.`;
    try {
        if (!process.env.SMTP_USER) {
            console.log('[Email] No SMTP configured. OTP for', to, ':', otp);
            return true;
        }
        await transporter.sendMail({
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to,
            subject,
            text
        });
        return true;
    }
    catch (err) {
        console.error('Failed to send OTP email:', err);
        return false;
    }
}
async function sendRejectionEmail(to, assignmentTitle, feedback) {
    const subject = `Assignment rejected: ${assignmentTitle} - University Assignment Approval Platform`;
    const text = `Your assignment "${assignmentTitle}" has been rejected.\n\nFeedback from reviewer:\n\n${feedback}\n\nYou can resubmit the assignment from your dashboard after making the requested improvements.`;
    try {
        if (!process.env.SMTP_USER) {
            console.log('[Email] No SMTP configured. Rejection notification for', to, ':', feedback.slice(0, 80) + '...');
            return true;
        }
        await transporter.sendMail({
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to,
            subject,
            text
        });
        return true;
    }
    catch (err) {
        console.error('Failed to send rejection email:', err);
        return false;
    }
}
//# sourceMappingURL=email.js.map