import { prisma } from "@/lib/db/prisma";
import { sendEmail } from "@/lib/email/resend";

const APP_BASE_URL = process.env.APP_BASE_URL || "http://localhost:3000";

type MatchEmailData = {
    userId: string;
    proposalId?: string; // Optional for tracking
    email: string;
    weekKey: string;
    round: "THU" | "FRI";
    score: number;
    reasons: string[];
    candidateInfo: {
        schoolName?: string; // or schoolId
        grade?: string;
        majorCategory?: string;
        // ...
    }
};

export type SendNotificationResult =
    | "SENT"
    | "SKIPPED_ALREADY_SENT"
    | "SKIPPED_NOT_VERIFIED"
    | "SKIPPED_INVALID_EMAIL"
    | "FAILED";

/**
 * 渲染并发送匹配通知邮件
 */
export async function sendMatchNotification(data: MatchEmailData): Promise<SendNotificationResult> {
    const { userId, proposalId, email, weekKey, round, score, reasons, candidateInfo } = data;
    const type = round === "THU" ? "MATCH_READY" : "SECOND_CHANCE";
    const MAX_RETRIES = 3;
    const PENDING_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

    // 1. Check Idempotency (NotificationLog)
    // @@unique([userId, weekKey, round, type])
    const existingLog = await prisma.notificationLog.findUnique({
        where: {
            userId_weekKey_round_type: {
                userId, weekKey, round, type
            }
        }
    });

    if (existingLog) {
        if (existingLog.status === "SENT") {
            // Already sent success
            return "SKIPPED_ALREADY_SENT";
        } else if (existingLog.status === "FAILED") {
            // Check retry count
            if (existingLog.retryCount >= MAX_RETRIES) {
                console.log(`[Email] Max retries reached for ${userId} ${type}`);
                return "FAILED";
            }
            // Allow retry: update retryCount later
        } else if (existingLog.status === "PENDING") {
            // Check updatedAt to see if it's stale
            const timeDiff = Date.now() - existingLog.updatedAt.getTime();
            if (timeDiff < PENDING_TIMEOUT_MS) {
                // Still fresh pending, likely another process working
                console.log(`[Email] Concurrent pending for ${userId} ${type}`);
                return "SKIPPED_ALREADY_SENT"; // Treat as handled
            }
            // Stale pending, allow retry
            console.log(`[Email] Stale pending for ${userId} ${type}, retrying...`);
        }
    }

    // 2. Prepare Content
    const subject = round === "THU"
        ? "【DatePanda】本周匹配已生成（周四）- 去看看你的匹配对象"
        : "【DatePanda】你有一次新的匹配机会（周五第二次）";

    const commonPointsHtml = reasons.slice(0, 3).map(r => `<li>${r}</li>`).join("");
    const commonPointsText = reasons.slice(0, 3).map(r => `- ${r}`).join("\n");

    const link = `${APP_BASE_URL}/matching`;

    let introHtml = "";
    let introText = "";

    if (round === "THU") {
        introHtml = `<p>本周的匹配结果已生成！对方与你的匹配度高达 <strong>${score}分</strong>。</p>`;
        introText = `本周的匹配结果已生成！对方与你的匹配度高达 ${score}分。`;
    } else {
        introHtml = `<p>你在周四点了“同意”，但对方未匹配成功，系统为你生成了<strong>第二次机会</strong>。</p>`;
        introText = `你在周四点了“同意”，但对方未匹配成功，系统为你生成了第二次机会。`;
    }

    const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
      <h2 style="color: #E91E63;">${subject}</h2>
      ${introHtml}
      
      <div style="background: #f9f9f9; padding: 15px; border-radius: 6px; margin: 20px 0;">
        <h3 style="margin-top: 0;">对方概况</h3>
        <p><strong>匹配分数：</strong> ${score}</p>
        <p><strong>共同点：</strong></p>
        <ul>${commonPointsHtml}</ul>
        <p><strong>基本信息：</strong> ${candidateInfo.schoolName || '未知学校'} (更多信息请在站内查看)</p>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${link}" style="background-color: #E91E63; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">前往查看匹配</a>
      </div>
      
      <p style="color: #666; font-size: 12px;">需要在站内点“同意/拒绝”，双方同意才会开启聊天。</p>
    </div>
    `;

    const text = `
    ${subject}
    
    ${introText}
    
    [对方概况]
    匹配分数：${score}
    共同点：
    ${commonPointsText}
    基本信息：${candidateInfo.schoolName || '未知学校'}
    
    请前往查看并响应：${link}
    
    (双方同意才会开启聊天)
    `;

    // 3. Send Check (Console vs SMTP)
    const emailProvider = process.env.EMAIL_PROVIDER || "smtp";
    if (emailProvider === "console") {
        console.log(`[Email:Console] 
        To: ${email}
        Subject: ${subject}
        Preview: ${introText}
        Link: ${link}
        `);

        // Write SENT log directly
        try {
            const data = {
                userId, weekKey, round, type,
                toEmail: email,
                status: "SENT",
                proposalId,
                metaJson: JSON.stringify({ score }),
                sentAt: new Date(),
                retryCount: existingLog ? (existingLog.retryCount + 1) : 0
            };

            if (existingLog) {
                await prisma.notificationLog.update({ where: { id: existingLog.id }, data });
            } else {
                await prisma.notificationLog.create({ data });
            }
            return "SENT";
        } catch (e: any) {
            console.error(`[Email:Console] Failed to save log`, e);
            if (e.code === 'P2002') return "SKIPPED_ALREADY_SENT";
            return "FAILED";
        }
    }

    // 4. Send via SMTP (Real/Resend)

    try {
        let logId = existingLog?.id;

        if (!logId) {
            // Create New Pending Log
            try {
                const log = await prisma.notificationLog.create({
                    data: {
                        userId, weekKey, round, type,
                        toEmail: email,
                        status: "PENDING",
                        proposalId,
                        metaJson: JSON.stringify({ score })
                    }
                });
                logId = log.id;
            } catch (e: any) {
                if (e.code === 'P2002') return "SKIPPED_ALREADY_SENT"; // Concurrent
                throw e;
            }
        } else {
            // Update Existing to Pending (Retry)
            await prisma.notificationLog.update({
                where: { id: logId },
                data: { status: "PENDING", retryCount: { increment: 1 } }
            });
        }

        const result = await sendEmail({ to: email, subject, html, text });
        const success = result.success;

        await prisma.notificationLog.update({
            where: { id: logId },
            data: {
                status: success ? "SENT" : "FAILED",
                sentAt: success ? new Date() : undefined,
                error: success ? null : "Send returned false"
            }
        });

        return success ? "SENT" : "FAILED";

    } catch (e: any) {
        console.error(`[Email] Failed to process for ${userId}`, e);
        // Try update log to failed if we have ID
        if (existingLog?.id) {
            try {
                await prisma.notificationLog.update({
                    where: { id: existingLog.id },
                    data: {
                        status: "FAILED",
                        error: e.message?.substring(0, 200) || "Unknown error"
                    }
                });
            } catch (_) { }
        }
        return "FAILED";
    }
}
