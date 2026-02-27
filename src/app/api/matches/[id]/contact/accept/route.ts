import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { prisma } from "@/lib/db/prisma";
import { apiSuccess, apiError } from "@/lib/utils/http";
import {
    requireMatchParticipant,
    requireNotBlocked,
    writeContactLog,
} from "@/lib/matches/guards";

// POST /api/matches/[id]/contact/accept — accept other party's request
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await requireUser(req);
        const { id: matchId } = await params;
        const { match } = await requireMatchParticipant(matchId, userId);
        requireNotBlocked(match);

        // Must be in a REQUESTED state
        if (match.contactStatus !== "A_REQUESTED" && match.contactStatus !== "B_REQUESTED") {
            return apiError("CONFLICT", "No pending contact request to accept", 409);
        }

        // Must be the NON-requester accepting
        if (match.contactRequesterId === userId) {
            return apiError("FORBIDDEN", "You cannot accept your own request", 403);
        }

        await prisma.matchRoom.update({
            where: { id: matchId },
            data: {
                contactStatus: "MUTUAL_ACCEPTED",
                unlockedAt: new Date(),
            },
        });

        await writeContactLog(matchId, userId, "ACCEPTED");

        return apiSuccess({ status: "MUTUAL_ACCEPTED", message: "🎉 双方已互相同意，现在可以查看联系方式了！" });
    } catch (error: any) {
        if (error instanceof Response) return error;
        console.error("[POST /api/matches/[id]/contact/accept]", error);
        return apiError("INTERNAL_ERROR", "Failed to accept contact", 500);
    }
}
