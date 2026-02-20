import 'server-only';
import { Resend } from 'resend';

export interface SendEmailOptions {
    to: string | string[];
    subject: string;
    html?: string;
    text?: string;
    replyTo?: string | string[];
}

export async function sendEmail({ to, subject, html, text, replyTo }: SendEmailOptions) {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.MAIL_FROM;

    if (!apiKey) {
        throw new Error('Missing RESEND_API_KEY environment variable. Please configure it to send emails.');
    }

    if (!from) {
        throw new Error('Missing MAIL_FROM environment variable. Please configure it to send emails.');
    }

    const resend = new Resend(apiKey);

    try {
        const response = await resend.emails.send({
            from,
            to: Array.isArray(to) ? to : [to],
            subject,
            html: html || '',
            text,
            reply_to: replyTo,
        });

        if (response.error) {
            throw new Error(`Resend API Error: ${response.error.message}`);
        }

        return {
            success: true,
            messageId: response.data?.id,
        };
    } catch (error) {
        console.error('[Email] Failed to send email:', error instanceof Error ? error.message : String(error));
        throw error;
    }
}
