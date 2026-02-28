import nodemailer from 'nodemailer';
import { Resend } from 'resend';

interface EmailSender {
  send(to: string, subject: string, html: string, text?: string): Promise<boolean>;
}

class ConsoleEmailSender implements EmailSender {
  async send(to: string, subject: string, html: string, text?: string): Promise<boolean> {
    console.log('--- [EMAIL MOCK] ---');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Text: ${text || '(no text fallback)'}`);
    console.log(`HTML: ${html.substring(0, 100)}... (truncated)`);
    console.log('--------------------');
    return true;
  }
}

class SmtpEmailSender implements EmailSender {
  private transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async send(to: string, subject: string, html: string, text?: string): Promise<boolean> {
    try {
      const info = await this.transporter.sendMail({
        from: process.env.SMTP_FROM || '"DatePanda" <noreply@datepanda.com>',
        to,
        subject,
        text,
        html,
      });
      console.log(`[SMTP] Message sent: ${info.messageId}`);
      return true;
    } catch (error) {
      console.error('[SMTP] Error sending email:', error);
      return false;
    }
  }
}

class ResendEmailSender implements EmailSender {
  private client = new Resend(process.env.RESEND_API_KEY);

  async send(to: string, subject: string, html: string): Promise<boolean> {
    try {
      const from = process.env.MAIL_FROM || '"DatePanda" <noreply@datepanda.fun>';
      const { error } = await this.client.emails.send({ from, to, subject, html });
      if (error) { console.error('[Resend] Error:', error); return false; }
      console.log(`[Resend] Email sent to ${to}`);
      return true;
    } catch (err) {
      console.error('[Resend] Exception:', err);
      return false;
    }
  }
}

function getEmailSender(): EmailSender {
  if (process.env.EMAIL_PROVIDER === 'smtp') return new SmtpEmailSender();
  if (process.env.EMAIL_PROVIDER === 'resend') return new ResendEmailSender();
  return new ConsoleEmailSender();
}

// Legacy wrapper for OTP
export async function sendOtpEmail(email: string, code: string): Promise<boolean> {
  const subject = "【DatePanda】您的登录验证码";
  const text = `您的验证码是：${code}。有效期5分钟，请勿泄露给他人。`;
  const html = `
    <div style="font-family: sans-serif; padding: 20px;">
      <h2>DatePanda 登录验证</h2>
      <p>您的验证码是：<strong style="font-size: 24px; color: #E91E63;">${code}</strong></p>
      <p>有效期5分钟，请勿泄露给他人。</p>
    </div>
  `;
  return getEmailSender().send(email, subject, html, text);
}

// Generic send function
export async function sendEmail(to: string, subject: string, html: string, text?: string): Promise<boolean> {
  return getEmailSender().send(to, subject, html, text);
}
