import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { getMyProfile } from "@/lib/profile/service";
import crypto from "crypto";

export async function GET(req: NextRequest) {
    try {
        const { userId } = await requireUser(req);
        const profile = await getMyProfile(userId);

        if (!profile) {
            return NextResponse.json({ error: "Profile not found" }, { status: 404 });
        }

        const secretKey = process.env.TALKJS_SECRET_KEY;
        if (!secretKey) {
            console.error("Missing TALKJS_SECRET_KEY in environment variables");
            return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
        }

        const signature = crypto
            .createHmac("sha256", secretKey)
            .update(userId)
            .digest("hex");

        let snapshotData: any = {};
        if (profile.profileSnapshot) {
            try {
                snapshotData = JSON.parse(profile.profileSnapshot);
            } catch (e) {
                console.error("Failed to parse profileSnapshot", e);
            }
        }

        return NextResponse.json({
            user: {
                id: userId,
                name: snapshotData.nickname || "User",
                photoUrl: snapshotData.avatarUrl || `https://api.dicebear.com/9.x/avataaars/svg?seed=${userId}`,
                email: "user@example.com", // Hidden or actual
                role: "default"
            },
            signature
        });
    } catch (error: any) {
        if (error?.status === 401) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        console.error("Error generating TalkJS token & profile:", error);
        return NextResponse.json({ error: "Failed to load chat auth data" }, { status: 500 });
    }
}
