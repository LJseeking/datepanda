import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { prisma } from "@/lib/db/prisma";
import { apiSuccess, apiError } from "@/lib/utils/http";
import { requireMatchParticipant } from "@/lib/matches/guards";

// POST /api/matches/[id]/report — report the other party
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await requireUser(req);
        const { id: matchId } = await params;
        const { otherId } = await requireMatchParticipant(matchId, userId);

        const body = await req.json();
        const { reasonCode, detail } = body;

        if (!reasonCode || typeof reasonCode !== "string") {
            return apiError("VALIDATION_ERROR", "reasonCode is required", 400);
        }

        // Check for duplicate report (1 report per match per reporter)
        const existing = await prisma.report.findFirst({
            where: { reporterId: userId, targetUserId: otherId },
        });
        if (existing) {
            return apiError("CONFLICT", "你已经举报过对方", 409);
        }

        await prisma.report.create({
            data: {
                reporterId: userId,
                targetUserId: otherId,
                reasonCode,
                status: "OPEN",
            },
        });

        return apiSuccess({ message: "举报已提交，我们会尽快处理" });
    } catch (error: any) {
        if (error instanceof Response) return error;
        console.error("[POST /api/matches/[id]/report]", error);
        return apiError("INTERNAL_ERROR", "Failed to report", 500);
    }
}
