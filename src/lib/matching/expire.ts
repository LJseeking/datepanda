import { prisma } from "@/lib/db/prisma";
import { MATCH_KIND, MatchRound } from "./types";

export async function expirePendingProposals(weekKey: string, round: MatchRound = "THU", ttlHours = 24) {
  const cutoff = new Date();
  cutoff.setHours(cutoff.getHours() - ttlHours);

  // Update status to EXPIRED for pending proposals older than TTL
  // weekKey is provided by caller (using CN time)
  const result = await prisma.recommendation.updateMany({
    where: {
      kind: MATCH_KIND,
      weekKey,
      round,
      status: "PENDING",
      createdAt: { lt: cutoff }
    } as any,
    data: {
      status: "EXPIRED",
      actedAt: new Date()
    } as any
  });

  return { expiredCount: result.count };
}
