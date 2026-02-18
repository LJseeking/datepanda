// scripts/check-questions.ts
import { assertAllQuestionsUnique, QUESTIONS } from "../src/lib/questionnaire/utils";

console.log("Checking questionnaire integrity...");
try {
    assertAllQuestionsUnique();
    console.log("✅ Success! Questionnaire contains " + QUESTIONS.length + " unique questions.");
} catch (e: any) {
    console.error("❌ Failed:", e.message);
    process.exit(1);
}
