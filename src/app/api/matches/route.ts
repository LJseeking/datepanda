import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { prisma } from "@/lib/db/prisma";
import { apiSuccess, apiError } from "@/lib/utils/http";
import { countMyAnswers, ICEBREAKER_TOTAL, ICEBREAKER_THRESHOLD } from "@/lib/matches/guards";

// GET /api/matches — list all my MatchRooms with progress
export async function GET(req: NextRequest) {
    try {
        const { userId } = await requireUser(req);

        const rooms = await prisma.matchRoom.findMany({
            where: {
                OR: [{ userAId: userId }, { userBId: userId }],
                contactStatus: { not: "BLOCKED" },
            },
            orderBy: { updatedAt: "desc" },
            include: {
                userA: { select: { id: true, avatarUrl: true, profiles: { take: 1, orderBy: { createdAt: "desc" } } } },
                userB: { select: { id: true, avatarUrl: true, profiles: { take: 1, orderBy: { createdAt: "desc" } } } },
            },
        });

        // Enrich with icebreaker progress
        const enriched = await Promise.all(
            rooms.map(async (room) => {
                const otherId = room.userAId === userId ? room.userBId : room.userAId;
                const otherUser = room.userAId === userId ? room.userB : room.userA;

                // Profile snapshot for display name
                let otherName = "Panda User";
                try {
                    const snap = otherUser.profiles?.[0]?.profileSnapshot;
                    if (snap) {
                        const parsed = JSON.parse(snap);
                        otherName = parsed.nickname || parsed.answers?.open_text_self_intro || "Panda User";
                    }
                } catch { }

                const [myAnswerCount, otherAnswerCount] = await Promise.all([
                    countMyAnswers(room.id, userId),
                    countMyAnswers(room.id, otherId),
                ]);

                return {
                    id: room.id,
                    contactStatus: room.contactStatus,
                    contactRequesterId: room.contactRequesterId,
                    requestedAt: room.requestedAt,
                    unlockedAt: room.unlockedAt,
                    revokedAt: room.revokedAt,
                    other: {
                        id: otherId,
                        name: otherName,
                        avatarUrl: otherUser.avatarUrl,
                    },
                    progress: {
                        mine: myAnswerCount,
                        theirs: otherAnswerCount,
                        total: ICEBREAKER_TOTAL,
                        threshold: ICEBREAKER_THRESHOLD,
                        canRequest: myAnswerCount >= ICEBREAKER_THRESHOLD,
                    },
                    createdAt: room.createdAt,
                };
            })
        );

        return apiSuccess({ matches: enriched });
    } catch (error: any) {
        if (error instanceof Response) return error;
        console.error("[GET /api/matches]", error);
        return apiError("INTERNAL_ERROR", "Failed to fetch matches", 500);
    }
}
