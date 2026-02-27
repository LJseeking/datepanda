import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { prisma } from "@/lib/db/prisma";
import { apiSuccess, apiError } from "@/lib/utils/http";
import {
    requireMatchParticipant,
    requireNotBlocked,
    requireIcebreakerThreshold,
    writeContactLog,
} from "@/lib/matches/guards";

const MAX_DAILY_REQUESTS = 5;

// POST /api/matches/[id]/contact/request — request WeChat exchange
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await requireUser(req);
        const { id: matchId } = await params;
        const { match } = await requireMatchParticipant(matchId, userId);
        requireNotBlocked(match);

        // 1. Already unlocked?
        if (match.contactStatus === "MUTUAL_ACCEPTED") {
            return apiError("CONFLICT", "Contact already exchanged", 409);
        }

        // 2. Did I already request?
        if (
            (match.contactStatus === "A_REQUESTED" || match.contactStatus === "B_REQUESTED") &&
            match.contactRequesterId === userId
        ) {
            return apiError("CONFLICT", "You already requested contact exchange", 409);
        }

        // 3. If other party already requested, tell them to use accept instead
        const otherRequested =
            (match.contactStatus === "A_REQUESTED" || match.contactStatus === "B_REQUESTED") &&
            match.contactRequesterId !== userId;
        if (otherRequested) {
            return apiError("BAD_REQUEST", "对方已申请，请使用【同意】按钮确认", 400);
        }

        // 4. 24h revoke cooldown
        if (match.revokedAt) {
            const cooldownMs = 24 * 60 * 60 * 1000;
            const elapsed = Date.now() - match.revokedAt.getTime();
            if (elapsed < cooldownMs) {
                const remainingSec = Math.ceil((cooldownMs - elapsed) / 1000);
                const remainingH = Math.ceil(remainingSec / 3600);
                return apiError(
                    "RATE_LIMITED",
                    `撤回后需冷静 24 小时，还剩约 ${remainingH} 小时`,
                    429
                );
            }
        }

        // 5. Daily rate limit — max 5 REQUESTED events per user today
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayRequests = await prisma.contactUnlockLog.count({
            where: {
                userId,
                event: "REQUESTED",
                createdAt: { gte: todayStart },
            },
        });
        if (todayRequests >= MAX_DAILY_REQUESTS) {
            return apiError("RATE_LIMITED", `每日最多发起 ${MAX_DAILY_REQUESTS} 次申请，明天再试`, 429);
        }

        // 6. Icebreaker threshold
        await requireIcebreakerThreshold(matchId, userId);

        // 7. Determine new status
        const isUserA = match.userAId === userId;
        const newStatus = isUserA ? "A_REQUESTED" : "B_REQUESTED";

        await prisma.matchRoom.update({
            where: { id: matchId },
            data: {
                contactStatus: newStatus,
                contactRequesterId: userId,
                requestedAt: new Date(),
            },
        });

        await writeContactLog(matchId, userId, "REQUESTED");

        return apiSuccess({ status: newStatus, message: "已申请，等待对方同意" });
    } catch (error: any) {
        if (error instanceof Response) return error;
        console.error("[POST /api/matches/[id]/contact/request]", error);
        return apiError("INTERNAL_ERROR", "Failed to request contact", 500);
    }
}
