import { prisma } from "@/lib/db/prisma";
import { generateIcebreaker } from "@/lib/ai/deepseek";
import { sendTalkJsSystemMessage } from "@/lib/messaging/talkjs";


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

  // 3. 准备生成 Kiko 破冰词
  try {
    // 提取他们的匹配共鸣点 (从其中一方的推荐记录里抓)
    const recommend = await prisma.recommendation.findFirst({
      where: {
        weekKey,
        proposerUserId: userAId,
        candidateUserId: userBId,
        status: "MUTUAL_ACCEPTED"
      } as any
    });

    let reasons: string[] = ["你们有着奇妙的灵魂共振"];
    if (recommend && recommend.reasonsJson) {
      try {
        const parsed = JSON.parse(recommend.reasonsJson);
        if (Array.isArray(parsed) && parsed.length > 0) reasons = parsed;
      } catch (e) { }
    }

    // 获取一点用户基础信息（供大模型发散）
    const users = await prisma.user.findMany({
      where: { id: { in: [userAId, userBId] } },
      include: { profiles: { take: 1 } }
    });
    const userA = users.find(u => u.id === userAId);
    const userB = users.find(u => u.id === userBId);

    const getInfo = (u: any) => ({
      gender: "保密", // Can add gender if supported later
      mbti: u?.profiles[0]?.mbti || ""
    });

    // 调用大模型
    const icebreaker = await generateIcebreaker(reasons, getInfo(userA), getInfo(userB));

    // 4. 创建 (使用事务确保原子性)
    const result = await prisma.$transaction(async (tx) => {
      const check = await tx.conversation.findUnique({ where: { pairKey } });
      if (check) return check;

      return await tx.conversation.create({
        data: {
          pairKey,
          status: "ACTIVE",
          members: {
            create: [
              { userId: u1, lastReadAt: new Date() },
              { userId: u2, lastReadAt: new Date() }
            ]
          }
        }
      });
    });

    // 5. 将大模型破冰话术推入 TalkJS 云端渲染
    // Note: TalkJS REST API treats the `pairKey` as the unique Conversation ID
    // (which matches how the frontend syncs it).
    await sendTalkJsSystemMessage(pairKey, icebreaker);

    return { conversationId: result.id };

  } catch (e: any) {
    if (e.code === "P2002") {
      const retry = await prisma.conversation.findUnique({ where: { pairKey } });
      if (retry) return { conversationId: retry.id };
    }
    throw e;
  }
}
