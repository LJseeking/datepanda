import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { prisma } from "@/lib/db/prisma";
import { apiSuccess, apiError } from "@/lib/utils/http";
import { requireMatchParticipant, writeContactLog } from "@/lib/matches/guards";

// POST /api/matches/[id]/block — block the other party
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await requireUser(req);
        const { id: matchId } = await params;
        const { match } = await requireMatchParticipant(matchId, userId);

        // Already blocked
        if (match.contactStatus === "BLOCKED") {
            return apiError("CONFLICT", "Already blocked", 409);
        }

        await prisma.matchRoom.update({
            where: { id: matchId },
            data: {
                contactStatus: "BLOCKED",
                blockerId: userId,
                unlockedAt: null, // clear contact visibility
            },
        });

        await writeContactLog(matchId, userId, "BLOCKED");

        return apiSuccess({ status: "BLOCKED", message: "已拉黑，对方将无法与你继续互动" });
    } catch (error: any) {
        if (error instanceof Response) return error;
        console.error("[POST /api/matches/[id]/block]", error);
        return apiError("INTERNAL_ERROR", "Failed to block", 500);
    }
}
