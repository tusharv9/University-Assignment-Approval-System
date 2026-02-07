import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
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

export async function sendOtpEmail(to: string, otp: string): Promise<boolean> {
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
  } catch (err) {
    console.error('Failed to send OTP email:', err);
    return false;
  }
}

export async function sendRejectionEmail(
  to: string,
  assignmentTitle: string,
  feedback: string
): Promise<boolean> {
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
  } catch (err) {
    console.error('Failed to send rejection email:', err);
    return false;
  }
}
