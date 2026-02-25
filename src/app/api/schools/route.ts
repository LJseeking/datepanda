import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { apiSuccess, apiError } from "@/lib/utils/http";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const schools = await prisma.school.findMany({
            where: { isEnabled: true },
            select: {
                id: true,
                name: true,
                domains: {
                    where: { isEnabled: true },
                    select: { domain: true },
                },
            },
            orderBy: { name: "asc" },
        });

        // Pre-defined ranking by general prestige/popularity in Hangzhou
        const PRESTIGE_RANKING: Record<string, number> = {
            "浙江大学": 1,
            "中国美术学院": 2, // Top art school
            "浙江工业大学": 3,
            "杭州电子科技大学": 4,
            "浙江工商大学": 5,
            "杭州师范大学": 6,
            "浙江中医药大学": 7,
            "中国计量大学": 8,
            "浙江农林大学": 9,
            "浙江传媒学院": 10,
            "浙江外国语学院": 11,
            "浙江树人学院": 12,
            "浙江水利水电学院": 13,
            "杭州医学院": 14,
        };

        const formatted = schools
            .map((s) => ({
                id: s.id,
                name: s.name,
                domains: s.domains.map((d) => d.domain),
            }))
            .filter((s) => s.domains.length > 0)
            .sort((a, b) => {
                const rankA = PRESTIGE_RANKING[a.name] || 999;
                const rankB = PRESTIGE_RANKING[b.name] || 999;
                if (rankA !== rankB) {
                    return rankA - rankB;
                }
                return a.name.localeCompare(b.name);
            });

        return apiSuccess({ schools: formatted });
    } catch (error) {
        console.error("[GetSchools] Error:", error);
        return apiError("INTERNAL_ERROR", "Failed to fetch schools", 500);
    }
}
