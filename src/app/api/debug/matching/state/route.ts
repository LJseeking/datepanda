import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { apiSuccess, apiError } from "@/lib/utils/http";
import { formatWeekKeyCN } from "@/lib/time/cn";
import { MATCH_KIND } from "@/lib/matching/types";

const MATCH_ADMIN_TOKEN = process.env.MATCH_ADMIN_TOKEN || "dev-admin-token";

export async function GET(req: NextRequest) {
    const token = req.headers.get("x-admin-token");
    if (token !== MATCH_ADMIN_TOKEN) {
        return apiError("UNAUTHORIZED", "Invalid admin token", 401);
    }

    try {
        const searchParams = req.nextUrl.searchParams;
        const weekKey = searchParams.get("weekKey") || formatWeekKeyCN();

        // 1. Fetch all proposals for the week
        const targetWeekKey = searchParams.get("weekKey") || formatWeekKeyCN();

        const proposals = await prisma.recommendation.findMany({
            where: {
                kind: MATCH_KIND,
                weekKey: targetWeekKey
            } as any,
            orderBy: [
                { proposerUserId: 'asc' },
                { round: 'asc' }
            ],
            select: {
                id: true,
                proposerUserId: true,
                candidateUserId: true,
                round: true,
                status: true,
                score: true,
                createdAt: true,
                actedAt: true
            }
        });

        // 2. Fetch all conversations for the week
        const conversations = await prisma.conversation.findMany({
            where: {
                pairKey: {
                    startsWith: `wk:${targetWeekKey}:`
                }
            },
            select: {
                id: true,
                pairKey: true,
                status: true,
                createdAt: true
            }
        });

        // 3. Fetch Notification Logs
        const notificationLogs = await prisma.notificationLog.findMany({
            where: {
                weekKey: targetWeekKey
            },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                userId: true,
                round: true,
                type: true,
                status: true,
                sentAt: true,
                error: true,
                retryCount: true,
                toEmail: true,
                proposalId: true,
                updatedAt: true
            }
        });

        // 4. Calculate Stats
        const stats = {
            proposalsCount: proposals.length,
            conversationsCount: conversations.length,
            notifications: {
                total: notificationLogs.length,
                sent: notificationLogs.filter(l => l.status === "SENT").length,
                failed: notificationLogs.filter(l => l.status === "FAILED").length,
                pending: notificationLogs.filter(l => l.status === "PENDING").length
            }
        };

        return apiSuccess({
            weekKey: targetWeekKey,
            stats,
            proposals,
            conversations,
            notificationLogs
        });

    } catch (error: any) {
        console.error("[DebugState]", error);
        return apiError("INTERNAL_ERROR", error.message, 500);
    }
}
