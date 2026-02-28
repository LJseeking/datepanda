/**
 * Fix script: backfill missing MatchRooms for ACCEPTED recommendation pairs.
 * Run: npx dotenv-cli -e .env -- npx tsx scripts/fix-backfill-matchrooms.ts
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

function normalizeMatchPair(a: string, b: string) {
    return a < b ? { userAId: a, userBId: b } : { userAId: b, userBId: a };
}

async function run() {
    console.log("🔧 Backfilling missing MatchRooms...\n");

    const accepted = await prisma.recommendation.findMany({
        where: { status: "ACCEPTED" },
        select: { id: true, proposerUserId: true, candidateUserId: true, weekKey: true, round: true },
    });

    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const rec of accepted) {
        const { userAId, userBId } = normalizeMatchPair(rec.proposerUserId, rec.candidateUserId);
        try {
            const existing = await prisma.matchRoom.findFirst({ where: { userAId, userBId } });
            if (existing) { skipped++; continue; }

            await prisma.matchRoom.create({
                data: { userAId, userBId, contactStatus: "LOCKED" },
            });
            console.log(`  ✅ Created MatchRoom for (${userAId.slice(0, 8)}…, ${userBId.slice(0, 8)}…) [rec ${rec.id}]`);
            created++;
        } catch (e: any) {
            console.error(`  ❌ Error for rec ${rec.id}:`, e.message);
            errors++;
        }
    }

    console.log(`\n═══════════════════════════════════════`);
    console.log(`  Backfill Complete`);
    console.log(`  Created:  ${created}`);
    console.log(`  Skipped:  ${skipped} (already existed)`);
    console.log(`  Errors:   ${errors}`);
    console.log(`═══════════════════════════════════════`);

    await prisma.$disconnect();
    await pool.end();
}

run().catch(e => { console.error(e); process.exit(1); });
