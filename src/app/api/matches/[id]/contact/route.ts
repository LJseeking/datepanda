import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { prisma } from "@/lib/db/prisma";
import { apiSuccess, apiError } from "@/lib/utils/http";
import {
    requireMatchParticipant,
    requireNotBlocked,
    writeContactLog,
} from "@/lib/matches/guards";
import { decryptWechat } from "@/lib/crypto/contact";

// GET /api/matches/[id]/contact — reveal WeChat IDs (MUTUAL_ACCEPTED only)
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await requireUser(req);
        const { id: matchId } = await params;
        const { match, otherId } = await requireMatchParticipant(matchId, userId);
        requireNotBlocked(match);

        if (match.contactStatus !== "MUTUAL_ACCEPTED") {
            return apiError("FORBIDDEN", "联系方式尚未解锁，双方均需同意后才可查看", 403);
        }

        // Fetch both parties' encrypted contacts
        const [myContact, theirContact] = await Promise.all([
            prisma.userContact.findUnique({ where: { userId } }),
            prisma.userContact.findUnique({ where: { userId: otherId } }),
        ]);

        // Write VIEWED audit log (non-blocking)
        writeContactLog(matchId, userId, "VIEWED").catch(console.error);

        const myWechat = myContact ? decryptWechat(myContact.wechatIdEnc) : null;
        const theirWechat = theirContact ? decryptWechat(theirContact.wechatIdEnc) : null;

        return apiSuccess({
            myWechat,
            theirWechat,
            theirWechatMissing: !theirWechat,
            tip: !theirWechat
                ? "对方尚未填写微信号，请提醒 TA 前往「我的」→「联系方式」填写"
                : null,
            unlockedAt: match.unlockedAt,
        });
    } catch (error: any) {
        if (error instanceof Response) return error;
        console.error("[GET /api/matches/[id]/contact]", error);
        return apiError("INTERNAL_ERROR", "Failed to reveal contact", 500);
    }
}
