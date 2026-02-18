import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { generateAndUpsertProfile } from "@/lib/profile/service";
import { apiSuccess, apiError } from "@/lib/utils/http";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireUser(req);
    const profile = await generateAndUpsertProfile(userId);
    return apiSuccess({ profile });
  } catch (error: any) {
    if (error.code) {
        return apiError(error.code, error.message, error.status || 400);
    }
    console.error("[ProfileGenerate]", error);
    return apiError("INTERNAL_ERROR", "Failed to generate profile", 500);
  }
}
