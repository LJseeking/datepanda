// scripts/backfill-proposer.ts
import { prisma } from "./_prisma";
import { Prisma } from "@prisma/client";

async function main() {
  console.log("Starting backfill for proposerUserId...");

  try {
    // 1. Check count first (idempotency check)
    // We can just run the update, but checking first is nice for logs.
    const pendingCount = await prisma.recommendation.count({
        where: { proposerUserId: null } as any
    });
    
    if (pendingCount === 0) {
        console.log("No records to update (idempotent check passed).");
        return;
    }

    console.log(`Found ${pendingCount} pending records. Executing SQL update...`);

    // 2. Execute Update via raw SQL for performance and atomic operation
    // Note: Table names in Prisma SQLite are usually PascalCase matching model names
    const updatedCount = await prisma.$executeRaw(Prisma.sql`
        UPDATE "Recommendation" 
        SET proposerUserId = (
            SELECT userId FROM "DailyRecommendationBatch" 
            WHERE "DailyRecommendationBatch".id = "Recommendation".batchId
        ) 
        WHERE proposerUserId IS NULL AND batchId IS NOT NULL;
    `);

    console.log(`Backfill completed. Updated ${updatedCount} records.`);

  } catch (e: any) {
    console.error("Backfill failed:", e);
    process.exit(1);
  }
}

main();
