import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { prisma } from "@/lib/db/prisma";
import { apiSuccess, apiError } from "@/lib/utils/http";
import { MATCH_KIND, MatchRound } from "@/lib/matching/types";
import { decodeReasons } from "@/lib/matching/serialize";
import { formatWeekKeyCN } from "@/lib/time/cn";
import { isEligibleForSecondChance } from "@/lib/matching/eligibility";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await requireUser(req);
    const today = new Date();
    const weekKey = formatWeekKeyCN(today);

    // 1. Fetch this week's proposals
    const proposals = await prisma.recommendation.findMany({
        where: {
            proposerUserId: userId, 
            kind: MATCH_KIND,
            weekKey,
            round: { in: ["THU", "FRI"] }
        } as any,
        orderBy: { createdAt: "desc" }
    });

    // Find THU & FRI
    const thu = proposals.find((p: any) => p.round === "THU");
    const fri = proposals.find((p: any) => p.round === "FRI");
    
    // 2. Determine which one to show
    let activeRec: any = null;
    let thuStatus = thu?.status || "NONE";

    if (thu) {
        if (thu.status === "MUTUAL_ACCEPTED") {
            // Priority 1: MUTUAL_ACCEPTED (Chat Ready)
            activeRec = thu;
        } else {
            // Check eligibility for Second Chance
            // Rule: Only show FRI if user is ELIGIBLE (THU=ACCEPTED & Not Mutual) AND FRI exists
            // We don't use time-gating (Friday 20:00) strictly here, but rely on FRI existence + eligibility
            
            // Check eligibility strictly
            // Note: isEligibleForSecondChance returns true if THU=ACCEPTED and not mutual/other-accepted
            const eligible = await isEligibleForSecondChance(userId, weekKey);

            if (eligible && fri) {
                // If eligible AND FRI round generated, show FRI
                activeRec = fri;
            } else {
                // Otherwise show THU (PENDING, ACCEPTED-but-waiting, REJECTED, EXPIRED)
                activeRec = thu;
            }
        }
    } else if (fri) {
        // Fallback (shouldn't happen without THU usually)
        activeRec = fri;
    }

    if (!activeRec) {
        return apiSuccess({ proposal: null });
    }

    // 3. Prepare Match Card Data
    let reasons: string[] = [];
    if (activeRec.reasonsJson) {
        reasons = decodeReasons(activeRec.reasonsJson);
    } else {
        try {
            if (activeRec.reason && activeRec.reason.startsWith("{")) {
                const parsed = JSON.parse(activeRec.reason);
                if (parsed.reasons) reasons = parsed.reasons;
            }
        } catch (e) {}
    }

    // Fetch candidate detailed info for card
    const candidate = await prisma.user.findUnique({
        where: { id: activeRec.candidateUserId },
        select: { 
            id: true, 
            schoolId: true,
            cityCode: true,
            // In real app, fetch Profile for tags/photos
            profiles: {
                take: 1,
                orderBy: { createdAt: "desc" },
                select: { profileSnapshot: true } // Assuming snapshot has tags
            }
        }
    });

    // Mock tags/photo for MVP if not in profile
    const matchCard = {
        score: activeRec.score,
        personalityTags: ["ENTJ", "电影迷", "猫奴"], // MVP mock or extract from profile
        commonPoints: reasons.slice(0, 3),
        basicInfo: {
            schoolId: candidate?.schoolId,
            cityCode: candidate?.cityCode,
            gender: "Unknown", // Need gender in User model usually
            grade: "Unknown"
        },
        photoUrl: null // Add photo URL logic here
    };

    // 4. Check Chat Status
    let chatReady = false;
    let conversationId: string | null = null;

    if (activeRec.status === "MUTUAL_ACCEPTED") {
        chatReady = true;
        // Try to find conversation
        // Construct pairKey to find it
        const [u1, u2] = [userId, activeRec.candidateUserId].sort();
        const pairKey = `wk:${weekKey}:u1:${u1}:u2:${u2}`;
        const conv = await prisma.conversation.findUnique({
            where: { pairKey },
            select: { id: true }
        });
        if (conv) conversationId = conv.id;
    }

    return apiSuccess({
        proposal: {
            id: activeRec.id,
            status: activeRec.status,
            round: activeRec.round,
            weekKey: activeRec.weekKey,
            thuStatus, // Return THU status context for frontend
            matchCard,
            chatReady,
            conversationId
        }
    });

  } catch (error: any) {
    if (error.code) return apiError(error.code, error.message, error.status);
    console.error("[MatchMe]", error);
    return apiError("INTERNAL_ERROR", "Failed to fetch match", 500);
  }
}
