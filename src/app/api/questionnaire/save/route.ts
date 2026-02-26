import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { upsertDraftAnswers } from "@/lib/questionnaire/service";
import { apiSuccess, apiError } from "@/lib/utils/http";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireUser(req);
    const body = await req.json();
    const { answers } = body;

    if (!Array.isArray(answers)) {
      return apiError("INVALID_PAYLOAD", "answers must be an array");
    }

    console.log(`[QuestionnaireSave] saving ${answers.length} answers...`);
    const answerKeys = answers.map(a => a.questionKey);
    console.log(`[QuestionnaireSave] Missing comm_problem_solving? ${!answerKeys.includes("comm_problem_solving")}`);
    console.log(`[QuestionnaireSave] Missing match_personality_complement? ${!answerKeys.includes("match_personality_complement")}`);

    const result = await upsertDraftAnswers(userId, answers);
    return apiSuccess(result);
  } catch (error: any) {
    if (error.code) {
      return apiError(error.code, error.message, error.status || 400);
    }
    console.error("[QuestionnaireSave]", error);
    return apiError("INTERNAL_ERROR", "Failed to save answers", 500);
  }
}
