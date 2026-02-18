import { prisma } from "@/lib/db/prisma";
import { getMyProfile } from "@/lib/profile/service";
import { buildCandidatePool } from "./filters";
import { getCooldownExcludedIds } from "./cooldown";
import { calculateMatchScore } from "./scoring";
import { ProfileSnapshot } from "@/lib/profile/generate";
import { MATCH_KIND, MatchRound, MatchStatus } from "./types";
import { encodeReasons } from "./serialize";
import { formatWeekKeyCN } from "@/lib/time/cn";
import { expirePendingProposals } from "./expire";
import { isEligibleForSecondChance } from "./eligibility";

export type { MatchRound, MatchStatus };

// 幂等生成周匹配
export async function generateWeeklyMatchForUser(
    userId: string,
    round: MatchRound,
    weekKey: string, // Caller should provide CN week key
    threshold = 80
) {
    // 1. Check Idempotency (Batch exists?)
    const dateKey = `${weekKey}-${round}`;
    const existingBatch = await prisma.dailyRecommendationBatch.findUnique({
        where: { userId_dateKey: { userId, dateKey } },
        include: { recommendations: true }
    });

    if (existingBatch) {
        return existingBatch.recommendations[0] || null;
    }

    // 2. Get My Profile
    const myProfile = await getMyProfile(userId);
    if (!myProfile || !myProfile.profileSnapshot) return null; // No profile, no match

    let mySnap: ProfileSnapshot;
    try {
        mySnap = JSON.parse(myProfile.profileSnapshot);
    } catch (e) {
        return null;
    }

    // 3. Build Pool
    const candidateIds = await buildCandidatePool(userId, mySnap);
    const cooldownIds = await getCooldownExcludedIds(userId);

    // 4. Score & Rank
    const scoredCandidates = [];
    for (const cid of candidateIds) {
        if (cooldownIds.has(cid)) continue;

        const cProf = await getMyProfile(cid);
        if (!cProf || !cProf.profileSnapshot) continue;

        let cSnap: ProfileSnapshot;
        try {
            cSnap = JSON.parse(cProf.profileSnapshot);
        } catch (e) { continue; }

        const result = calculateMatchScore(mySnap, cSnap);
        if (result.score >= threshold) {
            scoredCandidates.push({ cid, ...result });
        }
    }

    // Sort by score desc
    scoredCandidates.sort((a, b) => b.score - a.score);

    // Pick top 1 (or random from top K? MVP top 1)
    const best = scoredCandidates[0];
    if (!best) return null; // No match found

    // 5. Write to DB (Batch + Recommendation)
    // Use transaction
    return await prisma.$transaction(async (tx) => {
        // Re-check idempotency inside tx
        const check = await tx.dailyRecommendationBatch.findUnique({
            where: { userId_dateKey: { userId, dateKey } }
        });
        if (check) return null; // Already created by parallel request

        const batch = await tx.dailyRecommendationBatch.create({
            data: {
                userId,
                dateKey: dateKey, // Use local var
                algoVersion: "MATCH_V1",
                policyChecksum: "N/A",
                policySnapshot: JSON.stringify({ kind: MATCH_KIND, round, weekKey, userId }),
                recommendations: {
                    create: {
                        proposerUserId: userId, // Set proposer
                        candidateUserId: best.cid,
                        score: best.score,
                        rank: 1,
                        status: "PENDING",

                        // New Fields
                        kind: MATCH_KIND,
                        weekKey,
                        round,
                        reasonsJson: encodeReasons(best.reasons),
                        metaJson: JSON.stringify({ algo: "v1" }),

                        // Legacy field (short summary)
                        reason: JSON.stringify({ reasons: best.reasons, score: best.score })
                    }
                }
            },
            include: { recommendations: true }
        });

        return batch.recommendations[0];
    });
}

export async function listUsersNeedingSecondChance(weekKey: string): Promise<string[]> {
    // Logic: User had a THU match in this week, but status is REJECTED or EXPIRED.
    // Query Batches for this weekKey + THU
    // Optimization: Query Recommendation directly via index
    // @@index([kind, weekKey, round, status])

    const failedProposals = await prisma.recommendation.findMany({
        where: {
            kind: MATCH_KIND,
            weekKey,
            round: "THU",
            status: { in: ["REJECTED", "EXPIRED"] }
        } as any, // Cast for new fields
        select: {
            batch: { select: { userId: true } }
        }
    });

    // Need to cast result because Prisma types might be old
    return Array.from(new Set(failedProposals.map((p: any) => p.batch.userId)));
}

// Wrapper for Cron Jobs
export async function runThuBatchAndListProposals(weekKey: string): Promise<any[]> {
    // 1. Find all active users
    const users = await prisma.user.findMany({
        where: { status: "ACTIVE" },
        select: { id: true }
    });

    const newProposals = [];

    for (const u of users) {
        try {
            const p = await generateWeeklyMatchForUser(u.id, "THU", weekKey);
            if (p) newProposals.push(p);
        } catch (e) {
            console.error(`Error generating THU for ${u.id}`, e);
        }
    }
    return newProposals;
}

export async function runFriBatchAndListProposals(weekKey: string): Promise<any[]> {
    // 0. Auto-expire THU proposals before running FRI
    await expirePendingProposals(weekKey, "THU", 24);

    // 1. Find potential candidates: Users who have ACCEPTED their THU proposal
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

    const userIds = potentialCandidates
        .map(p => p.proposerUserId)
        .filter(id => id !== null) as string[];

    const newProposals = [];

    for (const userId of userIds) {
        try {
            // Check full eligibility per user
            const eligible = await isEligibleForSecondChance(userId, weekKey);

            if (eligible) {
                const p = await generateWeeklyMatchForUser(userId, "FRI", weekKey);
                if (p) newProposals.push(p);
            }
        } catch (e) {
            console.error(`Error generating FRI for ${userId}`, e);
        }
    }

    return newProposals;
}
