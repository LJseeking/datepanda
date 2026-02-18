import { NextRequest } from "next/server";
import { generateWeeklyMatchForUser, MatchRound } from "@/lib/matching/service";
import { expirePendingProposals } from "@/lib/matching/expire";
import { isEligibleForSecondChance } from "@/lib/matching/eligibility";
import { apiSuccess, apiError } from "@/lib/utils/http";
import { formatWeekKeyCN } from "@/lib/time/cn";
import { prisma } from "@/lib/db/prisma";
import { MATCH_KIND } from "@/lib/matching/types";

const MATCH_ADMIN_TOKEN = process.env.MATCH_ADMIN_TOKEN || "dev-admin-token";

export async function POST(req: NextRequest) {
  const token = req.headers.get("x-admin-token");
  if (token !== MATCH_ADMIN_TOKEN) {
    return apiError("UNAUTHORIZED", "Invalid admin token", 401);
  }

  try {
    let weekKey = formatWeekKeyCN();
    try {
        const body = await req.json();
        if (body.weekKey) weekKey = body.weekKey;
    } catch(e) {
        // ignore JSON parse error, use default weekKey
    }
    
    const round: MatchRound = "FRI";

    // 0. Auto-expire THU proposals before running FRI
    // This ensures pending THU proposals are marked EXPIRED and might become eligible if rule allows (though current rule says EXPIRED is not eligible, cleanup is still good)
    await expirePendingProposals(weekKey, "THU", 24);

    // 1. Find potential candidates: Users who have ACCEPTED their THU proposal
    // Instead of scanning all active users, we only look at those who might be eligible.
    // Eligibility Rule #1 is "THU status must be ACCEPTED".
    const potentialCandidates = await prisma.recommendation.findMany({
        where: {
            kind: MATCH_KIND,
            weekKey,
            round: "THU",
            status: "ACCEPTED"
        } as any,
        select: {
            proposerUserId: true
        }
    });

    // Extract user IDs
    // Note: proposerUserId is nullable in schema but should be present here for valid proposals
    const userIds = potentialCandidates
        .map(p => p.proposerUserId)
        .filter(id => id !== null) as string[];

    const results = {
        totalCandidates: userIds.length,
        eligible: 0,
        generated: 0,
        skipped: 0,
        errors: 0
    };

    for (const userId of userIds) {
        try {
            // Check full eligibility per user (checking mutual status, etc.)
            const eligible = await isEligibleForSecondChance(userId, weekKey);
            
            if (eligible) {
                results.eligible++;
                const proposal = await generateWeeklyMatchForUser(userId, round, weekKey);
                if (proposal) results.generated++;
                else results.skipped++;
            }
        } catch (e) {
            console.error(`Match gen error for ${userId}`, e);
            results.errors++;
        }
    }

    return apiSuccess({ weekKey, round, results });
  } catch (error: any) {
    console.error("[MatchRunFri]", error);
    return apiError("INTERNAL_ERROR", "Failed to run match", 500);
  }
}
