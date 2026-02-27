import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { prisma } from "@/lib/db/prisma";
import { apiSuccess, apiError } from "@/lib/utils/http";
import { requireMatchParticipant, requireNotBlocked } from "@/lib/matches/guards";

// POST /api/matches/[id]/icebreakers/[qid]/answer — upsert an icebreaker answer
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string; qid: string }> }
) {
    try {
        const { userId } = await requireUser(req);
        const { id: matchId, qid: questionId } = await params;
        const { match } = await requireMatchParticipant(matchId, userId);
        requireNotBlocked(match);

        const body = await req.json();
        const { answerText, answerOption } = body;

        if (!answerText && !answerOption) {
            return apiError("VALIDATION_ERROR", "answerText or answerOption is required", 400);
        }

        // Verify the question exists and is active
        const question = await prisma.icebreakerQuestion.findUnique({ where: { id: questionId } });
        if (!question || !question.active) {
            return apiError("NOT_FOUND", "Question not found or inactive", 404);
        }

        // Validate CHOICE answer is a valid option
        if (question.type === "CHOICE" && answerOption) {
            const options: string[] = question.optionsJson ? JSON.parse(question.optionsJson) : [];
            if (!options.includes(answerOption)) {
                return apiError("VALIDATION_ERROR", "Invalid option selected", 400);
            }
        }

        // Upsert answer (idempotent)
        const answer = await prisma.icebreakerAnswer.upsert({
            where: { matchId_questionId_userId: { matchId, questionId, userId } },
            update: {
                answerText: question.type === "TEXT" ? (answerText ?? null) : null,
                answerOption: question.type === "CHOICE" ? (answerOption ?? null) : null,
                updatedAt: new Date(),
            },
            create: {
                matchId,
                questionId,
                userId,
                answerText: question.type === "TEXT" ? (answerText ?? null) : null,
                answerOption: question.type === "CHOICE" ? (answerOption ?? null) : null,
            },
        });

        return apiSuccess({ answer: { id: answer.id, questionId, answerText: answer.answerText, answerOption: answer.answerOption } });
    } catch (error: any) {
        if (error instanceof Response) return error;
        console.error("[POST /api/matches/[id]/icebreakers/[qid]/answer]", error);
        return apiError("INTERNAL_ERROR", "Failed to save answer", 500);
    }
}
