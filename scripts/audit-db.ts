/**
 * DatePanda Pre-Release DB Consistency Audit Script
 * Run: npx ts-node --skip-project scripts/audit-db.ts
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL!;
const pool = new Pool({
    connectionString,
    ssl: connectionString.includes("neon.tech") ? { rejectUnauthorized: false } : undefined,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

interface AuditResult {
    check: string;
    count: number;
    risk: "LOW" | "MEDIUM" | "HIGH";
    detail?: string;
    needsMigration?: boolean;
    needsFixScript?: boolean;
}

async function run() {
    const results: AuditResult[] = [];

    console.log("🔍 DatePanda Pre-Release DB Audit Starting...\n");

    // ── 1. Users with incomplete onboarding ────────────────────────────────────
    const incompleteOnboarding = await prisma.user.count({
        where: {
            status: "ACTIVE",
            schoolId: null,
        },
    });
    results.push({
        check: "Active users with no schoolId (incomplete onboarding)",
        count: incompleteOnboarding,
        risk: incompleteOnboarding > 0 ? "MEDIUM" : "LOW",
    });

    // ── 2. Users with no questionnaire submission ───────────────────────────────
    const noQuestionnaire = await prisma.user.count({
        where: {
            status: "ACTIVE",
            responses: { none: { status: "SUBMITTED" } },
        },
    });
    results.push({
        check: "Active users with no SUBMITTED questionnaire response",
        count: noQuestionnaire,
        risk: noQuestionnaire > 0 ? "MEDIUM" : "LOW",
    });

    // ── 3. Profiles not backed by any response ──────────────────────────────────
    const orphanProfiles = await prisma.profile.count({
        where: {
            response: { status: { not: "SUBMITTED" } },
        },
    });
    results.push({
        check: "Profiles backed by a non-SUBMITTED response",
        count: orphanProfiles,
        risk: orphanProfiles > 0 ? "HIGH" : "LOW",
        needsFixScript: orphanProfiles > 0,
    });

    // ── 4. Duplicate MatchRooms (same pair appearing twice) ─────────────────────
    const allRooms = await prisma.matchRoom.findMany({ select: { userAId: true, userBId: true } });
    const roomKeys = allRooms.map(r => [r.userAId, r.userBId].sort().join(":"));
    const roomKeySet = new Set<string>();
    let duplicateRooms = 0;
    for (const k of roomKeys) {
        if (roomKeySet.has(k)) duplicateRooms++;
        roomKeySet.add(k);
    }
    results.push({
        check: "Duplicate MatchRooms (same user pair > 1 room)",
        count: duplicateRooms,
        risk: duplicateRooms > 0 ? "HIGH" : "LOW",
        needsFixScript: duplicateRooms > 0,
        detail: duplicateRooms > 0 ? "Unique constraint on (userAId, userBId) should prevent this — investigate if found" : undefined,
    });

    // ── 5. Recommendations in ACCEPTED without MatchRoom ────────────────────────
    const acceptedProposals = await prisma.recommendation.findMany({
        where: { status: "ACCEPTED" },
        select: { proposerUserId: true, candidateUserId: true },
    });
    let missingMatchRoom = 0;
    for (const p of acceptedProposals) {
        const sorted = [p.proposerUserId, p.candidateUserId].sort();
        const a = sorted[0] as string;
        const b = sorted[1] as string;
        const room = await prisma.matchRoom.findFirst({ where: { userAId: a, userBId: b } });
        if (!room) missingMatchRoom++;
    }
    results.push({
        check: "ACCEPTED recommendations without a MatchRoom",
        count: missingMatchRoom,
        risk: missingMatchRoom > 0 ? "HIGH" : "LOW",
        needsFixScript: missingMatchRoom > 0,
        detail: "These users were mutually accepted but have no icebreaker room — they are stuck.",
    });

    // ── 6. Orphan Conversations (no matching Recommendation) ────────────────────
    const allConversations = await prisma.conversation.findMany({
        select: { id: true, pairKey: true },
    });
    // pairKey format: wk:{weekKey}:{userA}:{userB}
    let orphanConvs = 0;
    for (const conv of allConversations) {
        const parts = conv.pairKey?.split(":");
        if (!parts || parts.length < 4) { orphanConvs++; continue; }
        // Just count; full validation would require cross-referencing recs
    }
    results.push({
        check: "Conversations with malformed pairKey",
        count: orphanConvs,
        risk: orphanConvs > 0 ? "MEDIUM" : "LOW",
    });

    // ── 7. MatchRooms with BLOCKED contactStatus and no blockerId ───────────────
    const blockedNoBlocker = await prisma.matchRoom.count({
        where: { contactStatus: "BLOCKED", blockerId: null },
    });
    results.push({
        check: "BLOCKED MatchRooms with null blockerId",
        count: blockedNoBlocker,
        risk: blockedNoBlocker > 0 ? "MEDIUM" : "LOW",
        needsFixScript: blockedNoBlocker > 0,
    });

    // ── 8. IcebreakerAnswers pointing to non-existent MatchRoom ─────────────────
    const allAnswers = await prisma.icebreakerAnswer.findMany({ select: { matchId: true } });
    let orphanAnswers = 0;
    const roomIds = new Set((await prisma.matchRoom.findMany({ select: { id: true } })).map(r => r.id));
    for (const a of allAnswers) {
        if (!roomIds.has(a.matchId)) orphanAnswers++;
    }
    results.push({
        check: "IcebreakerAnswers pointing to non-existent MatchRoom",
        count: orphanAnswers,
        risk: orphanAnswers > 0 ? "HIGH" : "LOW",
        needsFixScript: orphanAnswers > 0,
    });

    // ── 9. UserContact rows with null wechatIdEnc ────────────────────────────────
    const contactsWithNullRaw = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count FROM "UserContact" WHERE "wechatIdEnc" IS NULL
  `;
    const contactsWithNull = Number(contactsWithNullRaw[0]?.count ?? 0);
    results.push({
        check: "UserContact rows with null wechatIdEnc",
        count: contactsWithNull,
        risk: contactsWithNull > 0 ? "MEDIUM" : "LOW",
    });

    // ── 10. Total user counts ─────────────────────────────────────────────────
    const totalUsers = await prisma.user.count();
    const activeUsers = await prisma.user.count({ where: { status: "ACTIVE" } });
    const totalRooms = await prisma.matchRoom.count();
    const totalAnswers = await prisma.icebreakerAnswer.count();
    const totalQuestions = await prisma.icebreakerQuestion.count({ where: { active: true } });

    // ── Print Results ──────────────────────────────────────────────────────────
    console.log("═══════════════════════════════════════════════════════");
    console.log("  DatePanda Pre-Release DB Audit Report");
    console.log("═══════════════════════════════════════════════════════\n");
    console.log(`📊 Database Snapshot:`);
    console.log(`   Total Users:         ${totalUsers}`);
    console.log(`   Active Users:        ${activeUsers}`);
    console.log(`   Total MatchRooms:    ${totalRooms}`);
    console.log(`   Active Questions:    ${totalQuestions}`);
    console.log(`   Total Answers:       ${totalAnswers}`);
    console.log("");

    console.log("🔎 Consistency Checks:\n");
    let hasCritical = false;
    for (const r of results) {
        const icon = r.risk === "HIGH" ? "🔴" : r.risk === "MEDIUM" ? "🟡" : "🟢";
        const status = r.count === 0 ? "✅ OK" : `⚠️  ${r.count} found`;
        console.log(`${icon} [${r.risk}] ${r.check}`);
        console.log(`       ${status}`);
        if (r.detail) console.log(`       ℹ️  ${r.detail}`);
        if (r.needsMigration) console.log(`       🗄️  Needs migration`);
        if (r.needsFixScript) console.log(`       🔧 Needs fix script`);
        console.log("");
        if (r.risk === "HIGH" && r.count > 0) hasCritical = true;
    }

    console.log("═══════════════════════════════════════════════════════");
    if (hasCritical) {
        console.log("❌ AUDIT FAILED — Critical issues found. Do not release.");
    } else {
        console.log("✅ AUDIT PASSED — No critical DB issues detected.");
    }
    console.log("═══════════════════════════════════════════════════════");

    await prisma.$disconnect();
    await pool.end();
    process.exit(hasCritical ? 1 : 0);
}

run().catch((e) => {
    console.error("Fatal audit error:", e);
    process.exit(1);
});
