import { PrismaClient } from '@prisma/client';
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { Resend } from 'resend';

const connectionString = process.env.DATABASE_URL || "postgresql://user:pass@localhost:5432/db";
const pool = new Pool({ connectionString, ssl: connectionString.includes("neon.tech") ? { rejectUnauthorized: false } : undefined });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function run() {
    console.log("🚀 Starting simulation for test01 and test02 match...");

    const email01 = "test01@datepanda.fun";
    const email02 = "test02@datepanda.fun";
    const receiverEmail = "wanglujie1987@gmail.com";

    // Ensure we have test01 and test02 user accounts
    let v1 = await prisma.schoolVerification.findFirst({ where: { evidence: { contains: email01 } } });
    if (!v1) {
        const u1 = await prisma.user.create({ data: { status: "ACTIVE" } });
        v1 = await prisma.schoolVerification.create({
            data: { userId: u1.id, schoolId: "test-school-bypass", status: "VERIFIED", method: "EMAIL", evidence: JSON.stringify({ email: email01 }) }
        });
        console.log(`Created test01 user: ${u1.id}`);
    }

    let v2 = await prisma.schoolVerification.findFirst({ where: { evidence: { contains: email02 } } });
    if (!v2) {
        const u2 = await prisma.user.create({ data: { status: "ACTIVE" } });
        v2 = await prisma.schoolVerification.create({
            data: { userId: u2.id, schoolId: "test-school-bypass", status: "VERIFIED", method: "EMAIL", evidence: JSON.stringify({ email: email02 }) }
        });
        console.log(`Created test02 user: ${u2.id}`);
    }

    const test01UserId = v1.userId;
    const test02UserId = v2.userId;

    const dateKey = "2026-02-26";
    const weekKey = "2026-09";
    const round = "THU";
    const type = "MATCH_READY";

    // Delete any existing log to force email resent (matching the strict unique constraint)
    await prisma.notificationLog.deleteMany({
        where: { userId: test01UserId, weekKey, round, type }
    });

    console.log(`✉️ Simulating Email Dispatch for test01 to ${receiverEmail}...`);

    const candidateInfo = {
        schoolName: "浙江大学 (Test Mock)",
        grade: "研二",
        majorCategory: "工科"
    };

    const reasons = [
        "你们都倾向于理智且温和的沟通方式，相处会很舒服",
        "你们认定对方后都很愿意热烈投入，是双向奔赴的快节奏",
        "兴趣爱好：都在寻找能一起喝咖啡、看电影的平替周末"
    ];

    const score = 95;
    const subject = "【DatePanda】本周匹配已生成（周四）- 去看看你的匹配对象";

    const commonPointsHtml = reasons.map(r => `<li>${r}</li>`).join("");
    const appBaseUrl = process.env.APP_BASE_URL || "https://datepanda.vercel.app";
    const link = `${appBaseUrl}/matching`;
    const introHtml = `<p>本周的匹配结果已生成！对方与你的匹配度高达 <strong>${score}分</strong>。</p>`;

    const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
      <h2 style="color: #E91E63;">${subject}</h2>
      ${introHtml}
      
      <div style="background: #f9f9f9; padding: 15px; border-radius: 6px; margin: 20px 0;">
        <h3 style="margin-top: 0;">对方概况</h3>
        <p><strong>匹配分数：</strong> ${score}</p>
        <p><strong>共同点：</strong></p>
        <ul>${commonPointsHtml}</ul>
        <p><strong>基本信息：</strong> ${candidateInfo.schoolName} (更多信息请在站内查看)</p>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${link}" style="background-color: #E91E63; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">前往查看匹配</a>
      </div>
      
      <p style="color: #666; font-size: 12px;">需要在站内点“同意/拒绝”，双方同意才会开启聊天。</p>
    </div>
    `;

    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.MAIL_FROM || "noreply@datepanda.fun";

    if (apiKey) {
        const resend = new Resend(apiKey);
        const response = await resend.emails.send({
            from,
            to: receiverEmail,
            subject,
            html
        });
        console.log(`✅ Mail Server Dispatch Result:`, response);
    } else {
        console.log(`⚠️ Resend API Key missing. Printed HTML outline to console.`);
        console.log(html);
    }

    // Create the actual Match record in the database so the UI can find it
    await prisma.recommendation.deleteMany({
        where: { proposerUserId: test01UserId, candidateUserId: test02UserId, weekKey, round }
    });

    // Create a dummy batch if it doesn't exist to satisfy the foreign key constraint
    let batch = await prisma.dailyRecommendationBatch.findFirst({
        where: { userId: test01UserId, dateKey }
    });

    if (!batch) {
        batch = await prisma.dailyRecommendationBatch.create({
            data: {
                userId: test01UserId,
                dateKey,
                algoVersion: "TEST_MOCK_1.0",
                policyChecksum: "mock",
                policySnapshot: "{}"
            }
        });
    }

    const recommendation = await prisma.recommendation.create({
        data: {
            proposerUserId: test01UserId,
            candidateUserId: test02UserId,
            batchId: batch.id,
            weekKey,
            round,
            kind: "MATCH",
            score,
            status: "PENDING",
            reasonsJson: JSON.stringify({ reasons }),
            rank: 1,
            createdAt: new Date(),
        }
    });

    // Log success
    await prisma.notificationLog.create({
        data: {
            userId: test01UserId, weekKey, round, type,
            toEmail: receiverEmail,
            status: "SENT",
            proposalId: recommendation.id,
            metaJson: JSON.stringify({ score }),
            sentAt: new Date(),
        }
    });

    console.log(`✅ Process Finished! Match created: ${recommendation.id}`);
    process.exit(0);
}

run().catch(e => {
    console.error(e);
    process.exit(1);
});
