import { prisma } from "@/lib/db/prisma";

/**
 * 确保两个用户之间在特定周次建立聊天会话
 * 幂等操作：如果已存在则直接返回 ID
 */
export async function ensureConversationForPair(userAId: string, userBId: string, weekKey: string): Promise<{ conversationId: string }> {
  // 1. 构造 pairKey (字典序排序 ID 以保证唯一性)
  const [u1, u2] = [userAId, userBId].sort();
  const pairKey = `wk:${weekKey}:u1:${u1}:u2:${u2}`;

  // 2. 尝试查找
  const existing = await prisma.conversation.findUnique({
    where: { pairKey }
  });

  if (existing) {
    return { conversationId: existing.id };
  }

  // 3. 创建 (使用事务确保原子性)
  // 虽然 pairKey 有 unique 约束，但在高并发下 findUnique -> create 仍可能冲突，
  // 这里的事务主要为了同时创建 Member
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Double check inside transaction (optional but safe)
      const check = await tx.conversation.findUnique({ where: { pairKey } });
      if (check) return check;

      return await tx.conversation.create({
        data: {
          pairKey,
          status: "ACTIVE",
          // unlock is optional in schema now
          members: {
            create: [
              { userId: u1, lastReadAt: new Date() }, 
              { userId: u2, lastReadAt: new Date() }
            ]
          }
        }
      });
    });

    return { conversationId: result.id };
  } catch (e: any) {
    // 捕获唯一约束冲突 (P2002)，说明并发创建了，查出来返回即可
    if (e.code === "P2002") {
      const retry = await prisma.conversation.findUnique({ where: { pairKey } });
      if (retry) return { conversationId: retry.id };
    }
    throw e;
  }
}
