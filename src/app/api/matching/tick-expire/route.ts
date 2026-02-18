import { NextRequest } from "next/server";
import { expirePendingProposals } from "@/lib/matching/expire";
import { apiSuccess, apiError } from "@/lib/utils/http";
import { formatWeekKeyCN } from "@/lib/time/cn";

const MATCH_ADMIN_TOKEN = process.env.MATCH_ADMIN_TOKEN || "dev-admin-token";

export async function POST(req: NextRequest) {
  const token = req.headers.get("x-admin-token");
  if (token !== MATCH_ADMIN_TOKEN) {
    return apiError("UNAUTHORIZED", "Invalid admin token", 401);
  }

  try {
    const body = await req.json();
    const weekKey = body.weekKey || formatWeekKeyCN(); 
    const result = await expirePendingProposals(weekKey, "THU", 24);
    return apiSuccess(result);
  } catch (error: any) {
    console.error("[MatchTickExpire]", error);
    return apiError("INTERNAL_ERROR", "Failed to expire proposals", 500);
  }
}
