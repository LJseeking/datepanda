import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { getMyProfile } from "@/lib/profile/service";
import crypto from "crypto";

export async function GET(req: NextRequest) {
    try {
        const { userId } = await requireUser(req);

        const secretKey = process.env.TALKJS_SECRET_KEY;
        if (!secretKey) {
            console.error("Missing TALKJS_SECRET_KEY in environment variables");
            return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
        }

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
                email: null,
                role: "default"
            },
            signature
        });
    } catch (error: any) {
        console.error("Error generating TalkJS token:", error);
        if (error?.status === 401 || error instanceof Response) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        return NextResponse.json({ error: "Failed to load chat auth data" }, { status: 500 });
    }
}
