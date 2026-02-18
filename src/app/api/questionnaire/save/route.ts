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
