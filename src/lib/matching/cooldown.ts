import { prisma } from "@/lib/db/prisma";
import { MATCH_KIND } from "./types";

export async function getCooldownExcludedIds(userId: string): Promise<Set<string>> {
  // 规则：4周内拒绝过的用户
  // 使用新字段查询: kind=MATCH_KIND, status=REJECTED, actedAt >= 4 weeks ago
  
  const fourWeeksAgo = new Date();
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

  const rejected = await prisma.recommendation.findMany({
    where: {
      batch: { userId }, // My actions
      kind: MATCH_KIND,
      status: "REJECTED",
      actedAt: { gte: fourWeeksAgo }
    } as any,
    select: { candidateUserId: true }
  });

  return new Set(rejected.map((r: any) => r.candidateUserId));
}
