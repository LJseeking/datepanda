import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { prisma } from "@/lib/db/prisma";
import { apiSuccess, apiError } from "@/lib/utils/http";
import {
    requireMatchParticipant,
    requireNotBlocked,
    writeContactLog,
} from "@/lib/matches/guards";

// POST /api/matches/[id]/contact/revoke — revoke mutual contact exchange
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await requireUser(req);
        const { id: matchId } = await params;
        const { match } = await requireMatchParticipant(matchId, userId);
        requireNotBlocked(match);

        // Can only revoke from MUTUAL_ACCEPTED
        if (match.contactStatus !== "MUTUAL_ACCEPTED") {
            return apiError("CONFLICT", "只有在双方已同意后才能撤回", 409);
        }

        await prisma.matchRoom.update({
            where: { id: matchId },
            data: {
                contactStatus: "REVOKED",
                revokedAt: new Date(),
                unlockedAt: null,
            },
        });

        await writeContactLog(matchId, userId, "REVOKED");

        return apiSuccess({
            status: "REVOKED",
            message: "已撤回联系方式，24 小时内无法再次申请",
        });
    } catch (error: any) {
        if (error instanceof Response) return error;
        console.error("[POST /api/matches/[id]/contact/revoke]", error);
        return apiError("INTERNAL_ERROR", "Failed to revoke contact", 500);
    }
}
