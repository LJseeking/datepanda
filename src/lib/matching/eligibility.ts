import { prisma } from "@/lib/db/prisma";
import { MATCH_KIND } from "./types";

/**
 * 判断用户是否具备周五补录资格 (Second Chance)
 * 规则：
 * 1. 必须有本周 THU 轮次的提案
 * 2. THU 提案状态必须为 ACCEPTED
 * 3. THU 提案不能是 MUTUAL_ACCEPTED (否则已经开聊)
 * 4. 对方的状态不能是 ACCEPTED/MUTUAL_ACCEPTED (否则应该已经开聊或即将开聊)
 * 
 * 简而言之：我同意了，但还没配对成功（对方拒绝、过期或还没响应），且对方没同意我。
 * (如果对方也同意了，那就是 MUTUAL_ACCEPTED，应该去聊天而不是补录)
 */
export async function isEligibleForSecondChance(userId: string, weekKey: string): Promise<boolean> {
  // 1. 查询我本周 THU 的提案
  const myThu = await prisma.recommendation.findFirst({
    where: {
      proposerUserId: userId,
      kind: MATCH_KIND,
      weekKey,
      round: "THU"
    } as any,
    select: {
      id: true,
      status: true,
      candidateUserId: true
    }
  });

  // 规则 1: 必须存在本周 THU 提案
  if (!myThu) {
    return false;
  }

  // 规则 3: 如果已经是互选成功，不需要补录（必须在规则2之前检查）
  if (myThu.status === "MUTUAL_ACCEPTED") {
    return false;
  }

  // 规则 2: 我必须已接受
  if (myThu.status !== "ACCEPTED") {
    return false;
  }

  // 规则 4: 检查对方的状态 (对向查询使用 round="THU")
  // 对方的提案：proposer = my.candidate, candidate = me
  const otherThu = await prisma.recommendation.findFirst({
    where: {
      proposerUserId: myThu.candidateUserId,
      candidateUserId: userId,
      kind: MATCH_KIND,
      weekKey,
      round: "THU"
    } as any,
    select: {
      status: true
    }
  });

  // 如果对方存在且状态为 ACCEPTED 或 MUTUAL_ACCEPTED，则不给补录机会
  // (理应触发互选逻辑，如果还没触发，可能是时序问题，但不应发新得人)
  if (otherThu && ["ACCEPTED", "MUTUAL_ACCEPTED"].includes(otherThu.status)) {
    return false;
  }

  // 其他情况 (对方拒绝、过期、未响应、或数据缺失) -> 给补录机会
  return true;
}
