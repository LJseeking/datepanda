import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import "dotenv/config";

const pool = new Pool({
    connectionString: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const SCHOOLS: { schoolName: string; domains: string[] }[] = [
    { schoolName: "浙江大学", domains: ["zju.edu.cn"] },
    { schoolName: "杭州电子科技大学", domains: ["hdu.edu.cn"] },
    { schoolName: "浙江工业大学", domains: ["zjut.edu.cn"] },
    { schoolName: "浙江理工大学", domains: ["zstu.edu.cn"] },
    { schoolName: "浙江农林大学", domains: ["zafu.edu.cn"] },
    { schoolName: "浙江中医药大学", domains: ["zcmu.edu.cn"] },
    { schoolName: "杭州师范大学", domains: ["hznu.edu.cn", "stu.hznu.edu.cn"] },
    { schoolName: "浙江工商大学", domains: ["zjgsu.edu.cn", "mail.zjgsu.edu.cn", "pop.zjgsu.edu.cn"] },
    { schoolName: "中国美术学院", domains: ["caa.edu.cn"] },
    { schoolName: "中国计量大学", domains: ["cjlu.edu.cn"] },
    { schoolName: "浙江科技大学", domains: ["zust.edu.cn"] },
    { schoolName: "浙江水利水电学院", domains: ["zjweu.edu.cn"] },
    { schoolName: "浙江财经大学", domains: ["zufe.edu.cn"] },
    { schoolName: "浙江警察学院", domains: ["zjjcxy.cn"] },
    { schoolName: "浙江传媒学院", domains: ["cuz.edu.cn", "stu.cuz.edu.cn"] },
    { schoolName: "杭州医学院", domains: ["hmc.edu.cn"] },
    { schoolName: "浙江外国语学院", domains: ["zisu.edu.cn"] },
    { schoolName: "浙江音乐学院", domains: ["zjcm.edu.cn"] },
    { schoolName: "浙江树人学院", domains: ["zjsru.edu.cn", "stu.zjsru.edu.cn"] },
    { schoolName: "西湖大学", domains: ["westlake.edu.cn"] },
];

async function main() {
    console.log("🌱 Seeding school domains...");

    for (const entry of SCHOOLS) {
        const school = await prisma.school.upsert({
            where: { name: entry.schoolName },
            create: {
                name: entry.schoolName,
                cityCode: "hz",
                isEnabled: true,
            },
            update: {
                cityCode: "hz",
                isEnabled: true,
            },
        });

        for (const domain of entry.domains) {
            await prisma.allowedEmailDomain.upsert({
                where: { domain },
                create: {
                    domain,
                    schoolId: school.id,
                    emailType: "student",
                    isEnabled: true,
                },
                update: {
                    schoolId: school.id,
                    isEnabled: true,
                },
            });
            console.log(`  ✓ ${entry.schoolName} → ${domain}`);
        }
    }

    const totalSchools = await prisma.school.count();
    const totalDomains = await prisma.allowedEmailDomain.count();
    console.log(`\n✅ Done: ${totalSchools} schools, ${totalDomains} domains`);
}

main()
    .catch((e) => {
        console.error("Seed error:", e);
        process.exit(1);
    })
    .finally(() => process.exit(0));
