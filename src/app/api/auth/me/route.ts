import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { apiSuccess, apiError } from "@/lib/utils/http";

const COOKIE_NAME = "dp_session";

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(COOKIE_NAME);

    if (!sessionCookie || !sessionCookie.value) {
      return apiError("UNAUTHORIZED", "Not logged in", 401);
    }

    let userId: string;
    try {
      const payload = JSON.parse(sessionCookie.value);
      userId = payload.userId;
    } catch (e) {
      return apiError("UNAUTHORIZED", "Invalid session", 401);
    }

    if (!userId) {
      return apiError("UNAUTHORIZED", "Invalid session payload", 401);
    }

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
  } catch (error) {
    console.error("[Me] Error:", error);
    return apiError("INTERNAL_ERROR", "Something went wrong", 500);
  }
}
