import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { apiSuccess, apiError } from "@/lib/utils/http";

const ADMIN_TOKEN = process.env.MATCH_ADMIN_TOKEN || "dev-admin-token";

export async function GET(req: NextRequest) {
    try {
        const cookieStore = req.cookies;
        const adminToken = cookieStore.get("admin_token")?.value;

        if (adminToken !== ADMIN_TOKEN) {
            return apiError("UNAUTHORIZED", "Admin access required", 401);
        }

        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get("page") || "1", 10);
        const limit = parseInt(searchParams.get("limit") || "50", 10);
        const skip = (page - 1) * limit;

        const users = await prisma.user.findMany({
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
            include: {
                schoolVerifications: {
                    take: 1,
                    orderBy: { createdAt: "desc" },
                    select: { status: true, evidence: true }
                },
                profiles: {
                    take: 1,
                    orderBy: { createdAt: "desc" },
                    select: { profileSnapshot: true }
                }
            }
        });

        const totalCount = await prisma.user.count();

        return apiSuccess({
            users: users.map((user: any) => ({
                id: user.id,
                schoolId: user.schoolId,
                cityCode: user.cityCode,
                status: user.status,
                createdAt: user.createdAt,
                photoVisibility: user.photoVisibility,
                avatarUrl: user.avatarUrl,
                verificationStatus: user.schoolVerifications[0]?.status || "NONE",
                emailHandle: user.schoolVerifications[0]?.evidence ? (JSON.parse(user.schoolVerifications[0].evidence).emailBaseId || "未绑定") : "未绑定",
                profileSnapshot: user.profiles[0]?.profileSnapshot || null
            })),
            pagination: {
                page,
                limit,
                totalCount,
                totalPages: Math.ceil(totalCount / limit)
            }
        });

    } catch (error: any) {
        console.error("[Admin Users API Error]", error);
        return apiError("INTERNAL_ERROR", "Failed to fetch users", 500);
    }
}
