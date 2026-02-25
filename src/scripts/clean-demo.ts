import { prisma } from "@/lib/db/prisma";

async function clean() {
    await prisma.recommendation.deleteMany({
        where: {
            id: {
                startsWith: "rec_demo_"
            }
        }
    });

    await prisma.dailyRecommendationBatch.deleteMany({
        where: {
            id: {
                startsWith: "batch_demo_"
            }
        }
    });

    console.log("Deleted old demo records");
}

clean().catch(console.error).finally(() => prisma.$disconnect());
