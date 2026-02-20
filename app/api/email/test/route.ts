import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email/resend';

export async function POST(request: Request) {
    try {
        const adminToken = request.headers.get('x-admin-token');
        const matchToken = process.env.MATCH_ADMIN_TOKEN;

        if (!matchToken || adminToken !== matchToken) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { to, subject, html, text } = body;

        if (!to || !subject || (!html && !text)) {
            return NextResponse.json(
                { error: 'Missing required fields: to, subject, html/text' },
                { status: 400 }
            );
        }

        const result = await sendEmail({ to, subject, html, text });

        return NextResponse.json({
            success: true,
            messageId: result.messageId,
        });
    } catch (error: any) {
        console.error('[Email Test API] Error:', error instanceof Error ? error.message : String(error));
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Failed to send email' },
            { status: 500 }
        );
    }
}
