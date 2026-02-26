import { PrismaClient } from '@prisma/client';
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { submitQuestionnaire, upsertDraftAnswers } from '../src/lib/questionnaire/service';
import { generateAndUpsertProfile } from '../src/lib/profile/service';

const connectionString = process.env.DATABASE_URL || "postgresql://user:pass@localhost:5432/db";
const pool = new Pool({ connectionString, ssl: connectionString.includes("neon.tech") ? { rejectUnauthorized: false } : undefined });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function runSmokeTest() {
    console.log("🚀 Starting Questionnaire Smoke Test...");
    const testEmail = `test.smoke.${Date.now()}@datepanda.fun`;

    try {
        // 1. Create Test User
        let school = await prisma.school.findFirst({ where: { name: 'datepanda.fun' } });
        if (!school) {
            school = await prisma.school.create({ data: { name: 'datepanda.fun', cityCode: 'HZ' } });
        }

        const testUser = await prisma.user.create({
            data: {
                status: "ACTIVE",
                cityCode: "HZ",
                schoolId: school.id,
            }
        });

        console.log(`✅ Test User Created: ${testUser.id}`);

        // 2. Mock Base Answers + Kiko Answers
        const mockAnswers = [
            { questionKey: "basic_age_range", value: "20-21" },
            { questionKey: "basic_grade", value: "sophomore" },
            { questionKey: "basic_school", value: "zju" },
            { questionKey: "boundary_visibility", value: "balanced" },
            { questionKey: "boundary_contact_speed", value: "immediately" },
            { questionKey: "boundary_photo_policy", value: "must_have" },
            { questionKey: "boundary_first_meet", value: "public_place" },
            { questionKey: "identity_gender", value: "male" },
            { questionKey: "orientation", value: "heterosexual" },
            { questionKey: "match_gender_preference", values: ["female"] },
            { questionKey: "relationship_goal", value: "serious" },
            { questionKey: "relationship_exclusivity", value: "exclusive" },
            { questionKey: "relationship_pace", value: "medium" },
            { questionKey: "lgbtq_friendly", value: "support" },
            { questionKey: "privacy_orientation", value: "visible" },
            { questionKey: "personality_intro_extro", value: "3" },
            { questionKey: "personality_rational_emotion", value: "4" },
            { questionKey: "personality_planning", value: "4" },
            { questionKey: "value_honesty", value: "5" },
            { questionKey: "value_growth", value: "4" },
            { questionKey: "value_conflict_style", value: "talk_now" },
            { questionKey: "value_alone_time", value: "3" },
            { questionKey: "value_trust_speed", value: "medium" },
            { questionKey: "lifestyle_schedule", value: "normal" },
            { questionKey: "lifestyle_smoke", value: "no" },
            { questionKey: "lifestyle_drink", value: "no" },
            { questionKey: "lifestyle_cleanliness", value: "4" },
            { questionKey: "lifestyle_distance", value: "weekly" },
            { questionKey: "lifestyle_time_budget", value: "some" },
            { questionKey: "comm_reply_speed", value: "normal" },
            { questionKey: "comm_boundaries_talk", value: "direct" },
            { questionKey: "comm_problem_solving", value: "solve" },
            { questionKey: "interest_date_style", values: ["coffee", "walk"] },
            { questionKey: "match_distance", value: "same_city" },
            { questionKey: "match_personality_complement", value: "complement" }
        ];

        const kikoKeys = ["A01", "A02", "A03", "A04", "A05", "A06", "A07", "A08", "A09", "A10", "A11", "A12", "C01", "C02", "C03", "C04", "C05", "C06", "C07", "C08", "C09", "C10", "C11", "C12", "M01", "M02", "M03", "M04", "M05", "M06", "M07", "M08", "M09", "M10", "M11", "M12", "P01", "P02", "P03", "P04", "P05", "P06", "P07", "P08", "P09", "P10", "P11", "P12", "E01", "E02", "E03", "E04", "E05", "E06", "E07", "E08", "E09", "E10", "E11", "E12"];
        kikoKeys.forEach(key => {
            mockAnswers.push({ questionKey: key, value: "3" }); // Provide neutral answer 3
        });

        console.log("📥 Submitting answers...");
        await upsertDraftAnswers(testUser.id, mockAnswers as any);

        console.log("✅ Answers upserted successfully.");

        // 3. Submit Questionnaire
        await submitQuestionnaire(testUser.id);
        console.log("✅ Questionnaire submitted successfully.");

        // 4. Generate Profile
        const profile = await generateAndUpsertProfile(testUser.id);
        console.log(`✅ Profile generated: ${profile.id}`);
        console.log(`Profile snapshot checksum: ${profile.policyChecksum}`);

        const snapshot = JSON.parse(profile.profileSnapshot as string);
        if (!snapshot) {
            throw new Error("FAIL: snapshot is null");
        }

        console.log("🎉 All Tests PASS!");

        // Clean up
        try {
            await prisma.userQuestionnaireState.deleteMany({ where: { userId: testUser.id } });
            const userResponses = await prisma.response.findMany({ where: { userId: testUser.id } });
            for (const r of userResponses) {
                await prisma.responseItemOption.deleteMany({ where: { responseId: r.id } });
                await prisma.responseItem.deleteMany({ where: { responseId: r.id } });
            }
            await prisma.profile.deleteMany({ where: { userId: testUser.id } });
            await prisma.response.deleteMany({ where: { userId: testUser.id } });
            await prisma.user.delete({ where: { id: testUser.id } });
            console.log("🧹 Cleanup complete.");
        } catch (cleanupErr) {
            console.warn("⚠️ Cleanup partially failed due to constraints, but test passed.", cleanupErr);
        }
    } catch (error: any) {
        console.error("❌ TEST FAIL:", error.message || error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

runSmokeTest();
