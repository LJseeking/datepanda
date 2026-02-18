import { NextRequest } from "next/server";
import { verifyCronAuth } from "@/lib/cron/auth";
import { runThuBatchAndListProposals } from "@/lib/matching/service";
import { sendMatchNotification } from "@/lib/notifications/matchEmail";
import { formatWeekKeyCN } from "@/lib/time/cn";
import { apiSuccess, apiError } from "@/lib/utils/http";
import { prisma } from "@/lib/db/prisma";
import { decodeReasons } from "@/lib/matching/serialize";
import { getSchoolEmailDomains } from "@/lib/config/schoolEmailDomains";

export async function POST(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return apiError("UNAUTHORIZED", "Invalid cron secret", 401);
  }

  const start = Date.now();
  try {
    const weekKey = formatWeekKeyCN();
    console.log(`[Cron:THU] Starting for ${weekKey}`);

    // 1. Generate Proposals
    // runThuBatchAndListProposals now returns the list of NEWLY created or existing valid proposals for this run
    const proposals = await runThuBatchAndListProposals(weekKey);
    console.log(`[Cron:THU] Generated ${proposals.length} proposals`);

    // 2. Send Emails
    const stats = {
        sent: 0,
        skippedAlreadySent: 0,
        skippedNotVerified: 0,
        skippedInvalidEmail: 0,
        failed: 0
    };
    
    const allowedDomains = getSchoolEmailDomains();

    for (const p of proposals) {
        if (!p.proposerUserId) continue;

        // Check if user has verified email
        const verification = await prisma.schoolVerification.findUnique({
            where: { userId: p.proposerUserId }
        });

        if (!verification || verification.status !== "VERIFIED") {
            stats.skippedNotVerified++;
            continue;
        }

        let email = "";
        try {
            const evidence = JSON.parse(verification.evidence);
            if (evidence.email) email = evidence.email;
        } catch(e) {}

        if (!email) {
            stats.skippedNotVerified++; // Or separate skippedNoEmail
            continue;
        }

        // Domain Check
        const domain = email.split("@")[1];
        if (!domain || !allowedDomains.includes(domain)) {
            stats.skippedInvalidEmail++;
            continue;
        }

        // Fetch candidate info for email
        const candidate = await prisma.user.findUnique({
            where: { id: p.candidateUserId },
            select: { schoolId: true }
        });
        
        let schoolName = "未知学校";
        if (candidate?.schoolId) {
            const s = await prisma.school.findUnique({ where: { id: candidate.schoolId } });
            if (s) schoolName = s.name;
        }

        const result = await sendMatchNotification({
            userId: p.proposerUserId,
            proposalId: p.id,
            email,
            weekKey,
            round: "THU",
            score: p.score,
            reasons: decodeReasons(p.reasonsJson),
            candidateInfo: {
                schoolName,
                grade: "保密",
                majorCategory: "保密"
            }
        });

        if (result === "SENT") {
            stats.sent++;
        } else if (result === "SKIPPED_ALREADY_SENT") {
            stats.skippedAlreadySent++;
        } else if (result === "SKIPPED_NOT_VERIFIED") {
            stats.skippedNotVerified++;
        } else if (result === "SKIPPED_INVALID_EMAIL") {
            stats.skippedInvalidEmail++;
        } else {
            stats.failed++;
        }
    }

    const durationMs = Date.now() - start;
    console.log(`[Cron:THU] Finished in ${durationMs}ms`, stats);

    return apiSuccess({ 
        weekKey, 
        round: "THU", 
        createdProposalsCount: proposals.length, 
        emails: stats,
        durationMs
    });

  } catch (error: any) {
    console.error("[Cron:THU]", error);
    return apiError("INTERNAL_ERROR", error.message, 500);
  }
}
