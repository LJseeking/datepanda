import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { prisma } from "@/lib/db/prisma";
import { apiSuccess, apiError } from "@/lib/utils/http";
import { MATCH_KIND, MatchRound } from "@/lib/matching/types";
import { decodeReasons } from "@/lib/matching/serialize";
import { formatWeekKeyCN } from "@/lib/time/cn";
import { isEligibleForSecondChance } from "@/lib/matching/eligibility";

export async function GET(req: NextRequest) {
    try {
        const { userId } = await requireUser(req);

        // Asynchronously update last active time
        import("@/lib/db/prisma").then(({ prisma }) => {
            prisma.user.update({
                where: { id: userId },
                data: { lastActiveAt: new Date() }
            }).catch(e => console.error("[MatchingMe] Update lastActiveAt failed", e));
        });

        const today = new Date();
        const weekKey = formatWeekKeyCN(today);

        // 1. Fetch this week's proposals
        const proposals = await prisma.recommendation.findMany({
            where: {
                proposerUserId: userId,
                kind: MATCH_KIND,
                weekKey,
                round: { in: ["THU", "FRI"] }
            } as any,
            orderBy: { createdAt: "desc" }
        });

        // Find THU & FRI
        const thu = proposals.find((p: any) => p.round === "THU");
        const fri = proposals.find((p: any) => p.round === "FRI");

        // 2. Determine which one to show
        let activeRec: any = null;
        let thuStatus = thu?.status || "NONE";

        if (thu) {
            if (thu.status === "MUTUAL_ACCEPTED") {
                // Priority 1: MUTUAL_ACCEPTED (Chat Ready)
                activeRec = thu;
            } else {
                // Check eligibility for Second Chance
                // Rule: Only show FRI if user is ELIGIBLE (THU=ACCEPTED & Not Mutual) AND FRI exists
                // We don't use time-gating (Friday 20:00) strictly here, but rely on FRI existence + eligibility

                // Check eligibility strictly
                // Note: isEligibleForSecondChance returns true if THU=ACCEPTED and not mutual/other-accepted
                const eligible = await isEligibleForSecondChance(userId, weekKey);

                if (eligible && fri) {
                    // If eligible AND FRI round generated, show FRI
                    activeRec = fri;
                } else {
                    // Otherwise show THU (PENDING, ACCEPTED-but-waiting, REJECTED, EXPIRED)
                    activeRec = thu;
                }
            }
        } else if (fri) {
            // Fallback (shouldn't happen without THU usually)
            activeRec = fri;
        }

        if (!activeRec) {
            return apiSuccess({ proposal: null });
        }

        // 3. Prepare Match Card Data
        let reasons: string[] = [];
        if (activeRec.reasonsJson) {
            reasons = decodeReasons(activeRec.reasonsJson);
        } else {
            try {
                if (activeRec.reason && activeRec.reason.startsWith("{")) {
                    const parsed = JSON.parse(activeRec.reason);
                    if (parsed.reasons) reasons = parsed.reasons;
                }
            } catch (e) { }
        }

        // Fetch candidate detailed info for card
        const candidate = await prisma.user.findUnique({
            where: { id: activeRec.candidateUserId },
            select: {
                id: true,
                schoolId: true,
                cityCode: true,
                avatarUrl: true,
                photoVisibility: true,
                // In real app, fetch Profile for tags/photos
                profiles: {
                    take: 1,
                    orderBy: { createdAt: "desc" },
                    select: { profileSnapshot: true } // Assuming snapshot has tags
                }
            }
        });

        // 4. Check Chat Status first, before assembling UI payload
        let chatReady = false;
        let conversationId: string | null = null;

        if (activeRec.status === "MUTUAL_ACCEPTED") {
            chatReady = true;
            // Try to find conversation
            // Construct pairKey to find it
            const [u1, u2] = [userId, activeRec.candidateUserId].sort();
            const pairKey = `wk:${weekKey}:u1:${u1}:u2:${u2}`;
            const conv = await prisma.conversation.findUnique({
                where: { pairKey },
                select: { id: true }
            });
            if (conv) conversationId = conv.id;
        }

        // Apply Privacy Rules to Photo
        let photoUrlToReturn = null;
        if (candidate?.avatarUrl) {
            if (candidate.photoVisibility === "PUBLIC") {
                photoUrlToReturn = candidate.avatarUrl;
            } else if (candidate.photoVisibility === "MATCHED_ONLY" && chatReady) {
                photoUrlToReturn = candidate.avatarUrl;
            }
            // if HIDDEN or (MATCHED_ONLY & !chatReady), photo remains null
        }

        // Mock tags/photo for MVP if not in profile
        const matchCard = {
            score: activeRec.score,
            personalityTags: ["待探索", "匹配中"], // Fallback defaults
            commonPoints: reasons.slice(0, 3),
            basicInfo: {
                schoolId: candidate?.schoolId,
                cityCode: candidate?.cityCode,
                gender: "保密",
                grade: "未知"
            },
            photoUrl: photoUrlToReturn,
            photoVisibility: candidate?.photoVisibility || "MATCHED_ONLY", // Return rule for frontend hinting
            kikoDims: {
                you: null as any,
                match: null as any
            }
        };

        // Extract Kiko Dims and real profile details
        try {
            if (candidate?.profiles?.[0]?.profileSnapshot) {
                const snap = JSON.parse(candidate.profiles[0].profileSnapshot);
                if (snap.kikoDimensions) matchCard.kikoDims.match = snap.kikoDimensions;

                // Extract answers for display
                if (snap.answers) {
                    const ans = snap.answers;

                    const gradeMap: Record<string, string> = { freshman: "大一", sophomore: "大二", junior: "大三", senior: "大四", master: "研究生", phd: "博士", other: "其他" };
                    if (ans.basic_grade) matchCard.basicInfo.grade = gradeMap[ans.basic_grade as string] || "其他";

                    const genderMap: Record<string, string> = { male: "男生", female: "女生", non_binary: "多元性别", prefer_not_say: "保密" };
                    if (ans.identity_gender) matchCard.basicInfo.gender = genderMap[ans.identity_gender as string] || "保密";

                    const tags: string[] = [];
                    const topicsMap: Record<string, string> = { movies_music: "影音爱好者", games_anime: "游戏动漫", sports_fitness: "运动达人", food_coffee: "美食探店", travel_photography: "旅行摄影", books_learning: "阅读学习", tech: "科技数码", art_design: "看展艺术" };

                    if (Array.isArray(ans.interest_topics)) {
                        ans.interest_topics.forEach((t: string) => {
                            if (topicsMap[t]) tags.push(topicsMap[t]);
                        });
                    }

                    if (ans.lifestyle_weekend && Array.isArray(ans.lifestyle_weekend)) {
                        if (ans.lifestyle_weekend.includes("sleep")) tags.push("嗜睡喵");
                        if (ans.lifestyle_weekend.includes("explore")) tags.push("城市探索");
                        if (ans.lifestyle_weekend.includes("sports")) tags.push("户外运动");
                    }

                    if (tags.length > 0) {
                        // Keep up to 3 tags to keep UI clean
                        matchCard.personalityTags = tags.slice(0, 3);
                    } else {
                        matchCard.personalityTags = ["新人报到"];
                    }
                }
            }

            // Also fetch my profile for comparison
            const myProfile = await prisma.profile.findFirst({
                where: { userId },
                orderBy: { createdAt: "desc" }
            });
            if (myProfile?.profileSnapshot) {
                const mySnap = JSON.parse(myProfile.profileSnapshot);
                if (mySnap.kikoDimensions) matchCard.kikoDims.you = mySnap.kikoDimensions;
            }
        } catch (e) { }

        return apiSuccess({
            proposal: {
                id: activeRec.id,
                status: activeRec.status,
                round: activeRec.round,
                weekKey: activeRec.weekKey,
                thuStatus, // Return THU status context for frontend
                matchCard,
                chatReady,
                conversationId,
                candidateUserId: activeRec.candidateUserId
            }
        });

    } catch (error: any) {
        if (error instanceof Response) return error;
        if (error.code) return apiError(error.code, error.message, error.status);
        console.error("[MatchMe]", error);
        return apiError("INTERNAL_ERROR", "Failed to fetch match", 500);
    }
}
