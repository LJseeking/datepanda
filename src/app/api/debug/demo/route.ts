import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { ensureConversationForPair } from "@/lib/messaging/ensureConversation";

export async function GET(req: NextRequest) {
    try {
        const u1Id = "usr_demo_A_" + Date.now();
        const u2Id = "usr_demo_B_" + Date.now();

        // Ensure Users exist
        const u1 = await prisma.user.create({
            data: {
                id: u1Id,
                status: "ACTIVE",
                schoolId: "demo-school-id",
                avatarUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=A"
            }
        });
        // 2. We need a Response to attach the Profile to, since Profile requires a responseId
        const respA = await prisma.response.create({
            data: {
                id: "resp_A_" + Date.now(),
                userId: u1Id,
                status: "SUBMITTED",
                questionnaireVersionId: "demo",
                clientMeta: "{}"
            }
        });

        await prisma.profile.create({
            data: {
                userId: u1Id,
                responseId: respA.id,
                profileSnapshot: JSON.stringify({ nickname: "Alice (Test)" }),
                questionnaireVersionId: "demo",
                profileSpecVersionId: "v1",
                templateVersionId: "v1",
                policyChecksum: "demo",
                policySnapshot: "{}"
            }
        });

        const u2 = await prisma.user.create({
            data: {
                id: u2Id,
                status: "ACTIVE",
                schoolId: "demo-school-id",
                avatarUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=B"
            }
        });

        const respB = await prisma.response.create({
            data: {
                id: "resp_B_" + Date.now(),
                userId: u2Id,
                status: "SUBMITTED",
                questionnaireVersionId: "demo",
                clientMeta: "{}"
            }
        });

        await prisma.profile.create({
            data: {
                userId: u2Id,
                responseId: respB.id,
                profileSnapshot: JSON.stringify({ nickname: "Bob (Test)", avatarUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=B" }),
                questionnaireVersionId: "demo",
                profileSpecVersionId: "v1",
                templateVersionId: "v1",
                policyChecksum: "demo",
                policySnapshot: "{}"
            }
        });

        // Ensure TalkJS conversation is created behind the scenes
        await ensureConversationForPair(u1Id, u2Id, "2026W10");

        // Redirect to /messages and set iron-session cookie
        const res = NextResponse.redirect(new URL("/messages", req.url));
        const { getIronSession } = await import("iron-session");
        const { sessionOptions } = await import("@/lib/auth/session");
        const session = await getIronSession<{ userId?: string }>(req, res, sessionOptions);
        session.userId = u1Id;
        await session.save();

        return res;
    } catch (e: any) {
        return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
    }
}
