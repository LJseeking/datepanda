import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { prisma } from "@/lib/db/prisma";
import { apiSuccess, apiError } from "@/lib/utils/http";
import { requireMatchParticipant, requireNotBlocked, countMyAnswers, ICEBREAKER_TOTAL, ICEBREAKER_THRESHOLD } from "@/lib/matches/guards";

// GET /api/matches/[id]/icebreakers — questions + both parties' answers + progress
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await requireUser(req);
        const { id: matchId } = await params;
        const { match, otherId } = await requireMatchParticipant(matchId, userId);
        requireNotBlocked(match);

        const questions = await prisma.icebreakerQuestion.findMany({
            where: { active: true },
            orderBy: { sortOrder: "asc" },
        });

        const allAnswers = await prisma.icebreakerAnswer.findMany({
            where: { matchId },
        });

        const myAnswers = allAnswers.filter((a) => a.userId === userId);
        const theirAnswers = allAnswers.filter((a) => a.userId === otherId);

        const questionsWithAnswers = questions.map((q) => {
            const myAnswer = myAnswers.find((a) => a.questionId === q.id);
            const theirAnswer = theirAnswers.find((a) => a.questionId === q.id);

            return {
                id: q.id,
                type: q.type,
                prompt: q.prompt,
                options: q.optionsJson ? JSON.parse(q.optionsJson) : null,
                myAnswer: myAnswer
                    ? { answerText: myAnswer.answerText, answerOption: myAnswer.answerOption }
                    : null,
                theirAnswer: theirAnswer
                    ? { answerText: theirAnswer.answerText, answerOption: theirAnswer.answerOption }
                    : null,
            };
        });

        const myCount = myAnswers.length;
        const theirCount = theirAnswers.length;

        return apiSuccess({
            questions: questionsWithAnswers,
            progress: {
                mine: myCount,
                theirs: theirCount,
                total: ICEBREAKER_TOTAL,
                threshold: ICEBREAKER_THRESHOLD,
                canRequest: myCount >= ICEBREAKER_THRESHOLD,
            },
            contactStatus: match.contactStatus,
            contactRequesterId: match.contactRequesterId,
        });
    } catch (error: any) {
        if (error instanceof Response) return error;
        console.error("[GET /api/matches/[id]/icebreakers]", error);
        return apiError("INTERNAL_ERROR", "Failed to fetch icebreakers", 500);
    }
}
