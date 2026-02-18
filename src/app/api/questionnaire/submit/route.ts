import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { submitQuestionnaire } from "@/lib/questionnaire/service";
import { apiSuccess, apiError } from "@/lib/utils/http";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireUser(req);
    const result = await submitQuestionnaire(userId);
    return apiSuccess(result);
  } catch (error: any) {
    if (error.code) {
        return apiError(error.code, error.message, error.status || 400);
    }
    console.error("[QuestionnaireSubmit]", error);
    return apiError("INTERNAL_ERROR", "Failed to submit questionnaire", 500);
  }
}
