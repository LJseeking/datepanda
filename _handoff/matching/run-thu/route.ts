import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { generateWeeklyMatchForUser, MatchRound } from "@/lib/matching/service";
import { apiSuccess, apiError } from "@/lib/utils/http";
import { formatWeekKeyCN } from "@/lib/time/cn";

// Simple admin token protection
const MATCH_ADMIN_TOKEN = process.env.MATCH_ADMIN_TOKEN || "dev-admin-token";

export async function POST(req: NextRequest) {
  const token = req.headers.get("x-admin-token");
  if (token !== MATCH_ADMIN_TOKEN) {
    return apiError("UNAUTHORIZED", "Invalid admin token", 401);
  }

  try {
    const body = await req.json();
    // Use CN week key by default
    const weekKey = body.weekKey || formatWeekKeyCN(); 
    const round: MatchRound = "THU";

    // 1. Fetch eligible users (Active, Has Profile, Not Banned)
    // For MVP, just fetch all active users with profiles
    const users = await prisma.user.findMany({
        where: {
            status: "ACTIVE",
            deletedAt: null,
            profiles: { some: {} } // Has profile
        },
        select: { id: true }
    });

    const results = {
        total: users.length,
        generated: 0,
        skipped: 0,
        errors: 0
    };

    for (const u of users) {
        try {
            const proposal = await generateWeeklyMatchForUser(u.id, round, weekKey);
            if (proposal) results.generated++;
            else results.skipped++;
        } catch (e) {
            console.error(`Match gen error for ${u.id}`, e);
            results.errors++;
        }
    }

    return apiSuccess({ weekKey, round, results });
  } catch (error: any) {
    console.error("[MatchRunThu]", error);
    return apiError("INTERNAL_ERROR", "Failed to run match", 500);
  }
}
