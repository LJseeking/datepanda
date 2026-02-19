import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { apiSuccess, apiError } from "@/lib/utils/http";
import { formatWeekKeyCN } from "@/lib/time/cn";

const MATCH_ADMIN_TOKEN = process.env.MATCH_ADMIN_TOKEN || "dev-admin-token";

export async function GET(req: NextRequest) {
    const token = req.headers.get("x-admin-token");
    if (token !== MATCH_ADMIN_TOKEN) {
        return apiError("UNAUTHORIZED", "Invalid admin token", 401);
    }

    try {
        const searchParams = req.nextUrl.searchParams;
        const weekKey = searchParams.get("weekKey") || formatWeekKeyCN();

        // Fetch logs with details
        const logs = await prisma.notificationLog.findMany({
            where: { weekKey },
            orderBy: { createdAt: 'desc' },
            // include: {
            //     // Can include relations if needed, but standard fields are usually enough
            // } // No relations needed for now
        });

        // Group by user
        const userLogs: Record<string, any[]> = {};
        for (const log of logs) {
            if (!userLogs[log.userId]) userLogs[log.userId] = [];
            userLogs[log.userId].push(log);
        }

        // Enrich with User info if possible (optional, might be slow for many users)
        // For now just return raw logs focused on week

        return apiSuccess({
            weekKey,
            count: logs.length,
            logs
        });

    } catch (error: any) {
        console.error("[DebugNotifications]", error);
        return apiError("INTERNAL_ERROR", error.message, 500);
    }
}
