import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { getMyProfile } from "@/lib/profile/service";
import { apiSuccess, apiError } from "@/lib/utils/http";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await requireUser(req);
    const profile = await getMyProfile(userId);
    return apiSuccess({ profile });
  } catch (error: any) {
    if (error.code) {
        return apiError(error.code, error.message, error.status || 400);
    }
    console.error("[ProfileMe]", error);
    return apiError("INTERNAL_ERROR", "Failed to fetch profile", 500);
  }
}
