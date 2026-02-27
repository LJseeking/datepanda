import { PrismaClient } from '@prisma/client';
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { ensureConversationForPair } from '../src/lib/messaging/ensureConversation';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const connectionString = process.env.DATABASE_URL || "postgresql://user:pass@localhost:5432/db";
const pool = new Pool({ connectionString, ssl: connectionString.includes("neon.tech") ? { rejectUnauthorized: false } : undefined });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function run() {
    const email1 = process.argv[2] || "wanglujie1987@gmail.com";
    const email2 = process.argv[3] || "test02@datepanda.fun";

    console.log(`🚀 Forcing a chat conversation between ${email1} and ${email2}...`);

    // Find user 1
    const v1 = await prisma.schoolVerification.findFirst({ where: { evidence: { contains: email1 } } });
    if (!v1) {
        console.error(`❌ Could not find user with email ${email1}`);
        process.exit(1);
    }

    // Find user 2
    const v2 = await prisma.schoolVerification.findFirst({ where: { evidence: { contains: email2 } } });
    if (!v2) {
        console.error(`❌ Could not find user with email ${email2}`);
        process.exit(1);
    }

    const { conversationId } = await ensureConversationForPair(v1.userId, v2.userId, "2026-FORCE");

    console.log(`✅ Success! TalkJS Conversation created with pairKey: \${conversationId}`);
    console.log(`   You can now go to the /messages page and you should see the chat!`);
    await prisma.$disconnect();
}

run().catch(e => {
    console.error(e);
    process.exit(1);
});
