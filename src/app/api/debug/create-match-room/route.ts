import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { normalizeMatchPair } from "@/lib/matches/guards";

/**
 * GET /api/debug/create-match-room?user=test01
 *
 * Creates (or resets) a MUTUAL_ACCEPTED MatchRoom between test01 and test02,
 * then redirects you to /matches as test01 (or test02 if ?user=test02).
 *
 * Only available in development or when ALLOW_DEBUG_ROUTES=true.
 */
export async function GET(req: NextRequest) {
    if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEBUG_ROUTES !== "true") {
        return NextResponse.json({ ok: false, error: "Not available in production" }, { status: 403 });
    }

    try {
        const asUser = req.nextUrl.searchParams.get("user") ?? "test01";

        // 1. Find test01 and test02 users via their OTP bypass email
        const v1 = await prisma.schoolVerification.findFirst({
            where: { evidence: { contains: "test01@datepanda.fun" } },
        });
        const v2 = await prisma.schoolVerification.findFirst({
            where: { evidence: { contains: "test02@datepanda.fun" } },
        });

        if (!v1 || !v2) {
            return NextResponse.json(
                { ok: false, error: "test01 or test02 users not found. Please run /api/debug/generate-test02 first." },
                { status: 404 }
            );
        }

        const test01Id = v1.userId;
        const test02Id = v2.userId;
        const { userAId, userBId } = normalizeMatchPair(test01Id, test02Id);

        // 2. Upsert MatchRoom (reset status to LOCKED for a clean test)
        const matchRoom = await prisma.matchRoom.upsert({
            where: { userAId_userBId: { userAId, userBId } },
            create: { userAId, userBId, contactStatus: "LOCKED" },
            update: {
                contactStatus: "LOCKED",
                contactRequesterId: null,
                requestedAt: null,
                unlockedAt: null,
                revokedAt: null,
                blockerId: null,
            },
        });

        // 3. Ensure icebreaker questions exist (seed 3 sample questions if none)
        const questionCount = await prisma.icebreakerQuestion.count({ where: { active: true } });
        if (questionCount === 0) {
            await prisma.icebreakerQuestion.createMany({
                data: [
                    { type: "CHOICE", prompt: "你更倾向的约会方式是？", optionsJson: JSON.stringify(["安静的咖啡馆", "户外徒步", "博物馆/展览", "家里宅着"]), sortOrder: 1 },
                    { type: "CHOICE", prompt: "遇到矛盾时你通常怎么处理？", optionsJson: JSON.stringify(["立刻沟通", "先冷静再聊", "发消息而不是打电话", "等对方先开口"]), sortOrder: 2 },
                    { type: "TEXT", prompt: "用一句话介绍你最近让你开心的一件小事？", sortOrder: 3 },
                    { type: "CHOICE", prompt: "你喜欢哪种相处节奏？", optionsJson: JSON.stringify(["每天联系", "想联系就联系", "保持一定空间", "看心情"]), sortOrder: 4 },
                    { type: "TEXT", prompt: "你认为伴侣关系里最重要的一件事是什么？", sortOrder: 5 },
                    { type: "CHOICE", prompt: "周末最理想的安排？", optionsJson: JSON.stringify(["出门探索新地方", "宅家充电", "见朋友聚会", "各做各的事但在一起"]), sortOrder: 6 },
                    { type: "CHOICE", prompt: "你更享受哪种交流方式？", optionsJson: JSON.stringify(["深夜长聊", "日常碎碎念", "偶尔深聊", "以行动代替言语"]), sortOrder: 7 },
                    { type: "TEXT", prompt: "如果只能带一样东西去旅行，你会带什么？", sortOrder: 8 },
                ],
                skipDuplicates: true,
            });
        }

        // 4. Set session cookie and redirect to /matches
        const sessionUserId = asUser === "test02" ? test02Id : test01Id;
        const res = NextResponse.redirect(new URL("/matches", req.url));
        res.cookies.set("dp_session", JSON.stringify({ userId: sessionUserId }), { path: "/", httpOnly: false });

        console.log(`[debug/create-match-room] MatchRoom ${matchRoom.id} ready. Logging in as ${asUser} (${sessionUserId})`);
        return res;

    } catch (e: any) {
        console.error("[debug/create-match-room]", e);
        return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
    }
}
