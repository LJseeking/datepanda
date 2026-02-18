import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { apiError } from "@/lib/utils/http";

const COOKIE_NAME = "dp_session";

export async function requireUser(req: NextRequest): Promise<{ userId: string }> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(COOKIE_NAME);

  if (!sessionCookie || !sessionCookie.value) {
    throw apiError("UNAUTHENTICATED", "Not logged in", 401);
  }

  try {
    const payload = JSON.parse(sessionCookie.value);
    if (!payload.userId || typeof payload.userId !== "string") {
      throw new Error("Invalid payload");
    }
    return { userId: payload.userId };
  } catch (e) {
    throw apiError("UNAUTHENTICATED", "Invalid session", 401);
  }
}
