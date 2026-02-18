import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { getQuestionnaireState } from "@/lib/questionnaire/service";
import { apiSuccess, apiError } from "@/lib/utils/http";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await requireUser(req);
    const result = await getQuestionnaireState(userId);
    return apiSuccess(result);
  } catch (error: any) {
     if (error.code) {
        return apiError(error.code, error.message, error.status || 400);
    }
    return apiError("INTERNAL_ERROR", "Failed to get state", 500);
  }
}
