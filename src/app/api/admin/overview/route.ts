import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { apiSuccess, apiError } from "@/lib/utils/http";

const ADMIN_TOKEN = process.env.MATCH_ADMIN_TOKEN || "dev-admin-token";

export async function GET(req: NextRequest) {
    try {
        const adminToken = req.cookies.get("admin_token")?.value;

        if (adminToken !== ADMIN_TOKEN) {
            return apiError("UNAUTHORIZED", "Admin access required", 401);
        }

        // 1. Total Users
        const totalUsers = await prisma.user.count();

        // 2. Verified Users
        const verifiedUsers = await prisma.schoolVerification.count({
            where: { status: "VERIFIED" }
        });

        // 3. Completed Questionnaires (Users who have generated a Kiko Profile)
        const completedProfiles = await prisma.profile.count();

        // 4. Total Match Recommendations Generated
        const totalProposals = await prisma.recommendation.count();

        // 5. Successful Mutual Matches (Conversations Created)
        const totalMatches = await prisma.conversation.count();

        // 6. Calculate DAU (Active users in the last 24 hours)
        // Note: Assuming `updatedAt` on User or Profile acts as a proxy for activity, 
        // a real DAU might require a dedicated latestLogin tracking field.
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const dauCount = await prisma.user.count({
            where: {
                updatedAt: { gte: twentyFourHoursAgo }
            }
        });

        return apiSuccess({
            totalUsers,
            verifiedUsers,
            completedProfiles,
            totalProposals,
            totalMatches,
            dauCount
        });

    } catch (error) {
        console.error("[Admin Overview API Error]", error);
        return apiError("INTERNAL_ERROR", "Failed to load overview metrics", 500);
    }
}
