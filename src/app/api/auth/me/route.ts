import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { apiSuccess, apiError } from "@/lib/utils/http";
import { requireUser } from "@/lib/auth/requireUser";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await requireUser(req);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        schoolVerifications: {
          include: { school: true }
        }
      }
    });

    if (!user) {
      return apiError("UNAUTHORIZED", "User not found", 401);
    }

    return apiSuccess({ user });
  } catch (error: any) {
    if (error?.status === 401) return error;
    console.error("[Me] Error:", error);
    return apiError("INTERNAL_ERROR", "Something went wrong", 500);
  }
}
