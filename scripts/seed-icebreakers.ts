import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL!;
if (!connectionString) throw new Error("DATABASE_URL not set");
const pool = new Pool({ connectionString, ssl: connectionString.includes("neon.tech") ? { rejectUnauthorized: false } : undefined });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

const QUESTIONS = [
    {
        type: "CHOICE",
        prompt: "🌅 你理想的周末是怎样的？",
        options: ["宅在家刷剧/游戏", "出去爬山徒步", "逛展 / 咖啡馆看书", "约朋友聚会 / 夜店"],
        sortOrder: 1,
    },
    {
        type: "CHOICE",
        prompt: "😤 和朋友产生误会时，你通常怎么处理？",
        options: ["当面直说，及时解决", "冷静几天再谈", "顺着冷处理，等对方开口", "靠幽默化解尴尬"],
        sortOrder: 2,
    },
    {
        type: "CHOICE",
        prompt: "❤️ 你觉得长期关系里最重要的是？",
        options: ["共同的兴趣爱好", "价值观一致", "相互包容", "情绪稳定不作"],
        sortOrder: 3,
    },
    {
        type: "CHOICE",
        prompt: "🌙 你更喜欢哪种约会方式？",
        options: ["一起做饭/家里看电影", "逛美食 / 餐厅吃饭", "一起运动/爬山", "看展览/逛书店"],
        sortOrder: 4,
    },
    {
        type: "TEXT",
        prompt: "🐼 如果用一种动物来形容你自己，你会选什么，为什么？",
        options: null,
        sortOrder: 5,
    },
    {
        type: "CHOICE",
        prompt: "⏰ 你算哪种人？",
        options: ["超级早鸟（5-7 点起床）", "正常节奏（7-9 点）", "夜猫子（12点后才睡）", "作息混乱，看心情"],
        sortOrder: 6,
    },
    {
        type: "TEXT",
        prompt: "💭 最近有什么特别想做但还没做的事吗？",
        options: null,
        sortOrder: 7,
    },
    {
        type: "CHOICE",
        prompt: "🤝 你更倾向于在关系里扮演哪种角色？",
        options: ["照顾者（关心对方多一点）", "被宠爱者（喜欢被关心）", "平等互动不分彼此", "随缘，看和谁在一起"],
        sortOrder: 8,
    },
];

async function main() {
    console.log("🌱 Seeding 8 icebreaker questions...");

    for (const q of QUESTIONS) {
        await prisma.icebreakerQuestion.upsert({
            where: { id: q.prompt.slice(0, 10) },
            update: {},
            create: {
                id: `iq_${q.sortOrder}`,
                type: q.type,
                prompt: q.prompt,
                optionsJson: q.options ? JSON.stringify(q.options) : null,
                sortOrder: q.sortOrder,
                active: true,
            },
        });
    }

    const count = await prisma.icebreakerQuestion.count({ where: { active: true } });
    console.log(`✅ Done! ${count} active icebreaker questions in DB.`);
    await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
