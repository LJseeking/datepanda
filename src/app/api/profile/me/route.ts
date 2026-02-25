import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { getMyProfile } from "@/lib/profile/service";
import { apiSuccess, apiError } from "@/lib/utils/http";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await requireUser(req);
    const profile = await getMyProfile(userId);

    // Asynchronously update last active time
    import("@/lib/db/prisma").then(({ prisma }) => {
      prisma.user.update({
        where: { id: userId },
        data: { lastActiveAt: new Date() }
      }).catch(e => console.error("[ProfileMe] Update lastActiveAt failed", e));
    });

    return apiSuccess({ profile });
  } catch (error: any) {
    if (error instanceof Response) return error;
    if (error.code) {
      return apiError(error.code, error.message, error.status || 400);
    }
    console.error("[ProfileMe]", error);
    return apiError("INTERNAL_ERROR", "Failed to fetch profile", 500);
  }
}
