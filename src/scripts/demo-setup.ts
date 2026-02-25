import { prisma } from "@/lib/db/prisma";
import { formatWeekKeyCN } from "@/lib/time/cn";

async function main() {
    const users = await prisma.user.findMany({
        include: { profiles: true },
        take: 2
    });
    if (users.length < 2) {
        console.log("Need at least 2 users");
        return;
    }
    const u1 = users[0];
    const u2 = users[1];

    const weekKey = formatWeekKeyCN();
    const dateKeyStr = new Date().toISOString().split("T")[0]; // Use current date for dateKey

    // We append weekKey to the IDs to avoid constraint conflicts from previous testing
    const u1BatchId = "batch_demo_" + u1.id + "_" + weekKey;
    const u2BatchId = "batch_demo_" + u2.id + "_" + weekKey;

    // Ensure DailyRecommendationBatch exists for u1
    await prisma.dailyRecommendationBatch.upsert({
        where: { userId_dateKey: { userId: u1.id, dateKey: dateKeyStr } },
        update: {},
        create: {
            id: u1BatchId,
            userId: u1.id,
            dateKey: dateKeyStr,
            algoVersion: "demo_v1",
            policyChecksum: "demo_checksum",
            policySnapshot: JSON.stringify({})
        }
    });

    // Ensure DailyRecommendationBatch exists for u2
    await prisma.dailyRecommendationBatch.upsert({
        where: { userId_dateKey: { userId: u2.id, dateKey: dateKeyStr } },
        update: {},
        create: {
            id: u2BatchId,
            userId: u2.id,
            dateKey: dateKeyStr,
            algoVersion: "demo_v1",
            policyChecksum: "demo_checksum",
            policySnapshot: JSON.stringify({})
        }
    });

    // Force User 1 to ALREADY have accepted User 2
    await prisma.recommendation.upsert({
        where: {
            proposerUserId_kind_weekKey_round: {
                proposerUserId: u1.id,
                kind: "MATCH_PROPOSAL",
                weekKey: weekKey,
                round: "THU"
            }
        },
        update: { status: "ACCEPTED", reasonsJson: JSON.stringify(["都喜欢猫", "都在杭州"]) },
        create: {
            id: "rec_demo_" + u1.id + "_" + u2.id + "_" + weekKey,
            batchId: u1BatchId, // Add batchId (required relation)
            weekKey: weekKey,
            round: "THU",
            kind: "MATCH_PROPOSAL",
            status: "ACCEPTED",
            score: 95,
            rank: 1, // Add rank (required integer value)
            proposerUserId: u1.id,
            candidateUserId: u2.id,
            reasonsJson: JSON.stringify(["都喜欢猫", "都在杭州"])
        }
    });

    // Force User 2 to have a PENDING recommendation for User 1
    await prisma.recommendation.upsert({
        where: {
            proposerUserId_kind_weekKey_round: {
                proposerUserId: u2.id,
                kind: "MATCH_PROPOSAL",
                weekKey: weekKey,
                round: "THU"
            }
        },
        update: { status: "PENDING", reasonsJson: JSON.stringify(["都喜欢猫", "都在杭州"]) },
        create: {
            id: "rec_demo_" + u2.id + "_" + u1.id + "_" + weekKey,
            batchId: u2BatchId, // Add batchId (required relation)
            weekKey: weekKey,
            round: "THU",
            kind: "MATCH_PROPOSAL",
            status: "PENDING",
            score: 95,
            rank: 1, // Add rank (required integer value)
            proposerUserId: u2.id,
            candidateUserId: u1.id,
            reasonsJson: JSON.stringify(["都喜欢猫", "都在杭州"])
        }
    });

    // Output DP_SESSION cookie string for User 2 so the agent can log in
    const dpSessionCookie = encodeURIComponent(JSON.stringify({ userId: u2.id }));
    console.log(`\n\n=== RUN DEMO FOR USER 2 ===`);
    console.log(`User 2 ID: ${u2.id}`);
    console.log(`Please set your browser cookie 'dp_session' to: ${dpSessionCookie}`);
    console.log(`Then visit /matching, click ACCEPT on the match with User 1 (${u1.id}), and go to /messages`);
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
