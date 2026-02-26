import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { getMyProfile } from "@/lib/profile/service";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    try {
        const { userId } = await requireUser(req);

        const secretKey = process.env.TALKJS_SECRET_KEY;
        if (!secretKey) {
            console.error("[chat/token] TALKJS_SECRET_KEY is NOT set in environment!");
            return NextResponse.json({ error: "服务器缺少 TALKJS_SECRET_KEY 配置" }, { status: 500 });
        }
        console.log(`[chat/token] Generating signature for userId=${userId}`);

        const signature = crypto
            .createHmac("sha256", secretKey)
            .update(userId)
            .digest("hex");

        // Profile is optional for chat — use fallback values if missing
        let snapshotData: any = {};
        try {
            const profile = await getMyProfile(userId);
            if (profile?.profileSnapshot) {
                snapshotData = JSON.parse(profile.profileSnapshot);
            }
        } catch (e) {
            console.error("Failed to load profile for chat token", e);
        }

        return NextResponse.json({
            user: {
                id: userId,
                name: snapshotData.nickname || snapshotData.answers?.open_text_self_intro || "Panda User",
                photoUrl: snapshotData.avatarUrl || `https://api.dicebear.com/9.x/avataaars/svg?seed=${userId}`,
                role: "default"
            },
            signature
        });
    } catch (error: any) {
        console.error("[chat/token] Error:", error?.message || error);
        if (error?.status === 401 || error instanceof Response) {
            return NextResponse.json({ error: "未登录或会话已过期" }, { status: 401 });
        }
        return NextResponse.json({ error: "聊天认证服务异常" }, { status: 500 });
    }
}
