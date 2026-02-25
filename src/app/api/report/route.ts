import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { prisma } from "@/lib/db/prisma";
import { apiSuccess, apiError } from "@/lib/utils/http";

export async function POST(req: NextRequest) {
    try {
        const { userId } = await requireUser(req);
        const { targetUserId, reasonCode } = await req.json();

        if (!targetUserId || !reasonCode) {
            return apiError("BAD_REQUEST", "Missing required fields", 400);
        }

        const report = await prisma.report.create({
            data: {
                reporterId: userId,
                targetUserId,
                reasonCode,
                status: "OPEN",
            }
        });

        // Optionally, if the user reports their current match proposal, we might automatically reject it
        // Or at least log the report

        return apiSuccess({ reportId: report.id });
    } catch (error: any) {
        console.error("[Report API Error]", error);
        return apiError("INTERNAL_SERVER_ERROR", "Failed to submit report", 500);
    }
}
