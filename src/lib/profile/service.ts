import { prisma } from "@/lib/db/prisma";
import { QUESTIONNAIRE_VERSION, QUESTIONS, getQuestionMap } from "@/lib/questionnaire/utils";
import { generateProfileSnapshot } from "./generate";
import { apiError } from "@/lib/utils/http";

const PROFILE_SPEC_VERSION = "v1";
const PROFILE_TEMPLATE_VERSION = "v1";

export async function generateAndUpsertProfile(userId: string) {
  const versionId = QUESTIONNAIRE_VERSION;

  // 1. Check if submitted
  const state = await prisma.userQuestionnaireState.findUnique({
    where: { userId_questionnaireVersionId: { userId, questionnaireVersionId: versionId } },
  });

  if (!state?.submittedResponseId) {
    throw apiError("QUESTIONNAIRE_NOT_SUBMITTED", "Please submit questionnaire first", 400);
  }

  // 2. Fetch Response & Answers
  const response = await prisma.response.findUnique({
    where: { id: state.submittedResponseId },
    include: {
      items: true,
      itemOptions: { include: { option: true } }
    }
  });

  if (!response) {
    throw apiError("INTERNAL_ERROR", "Response data missing", 500);
  }

  // 3. Assemble Answers Map
  const answers: Record<string, any> = {};

  // Need to map questionId back to Key.
  // In MVP we used lazy create Question with code=key.
  // So we can fetch questions by IDs to get codes.
  const questionIds = new Set([
    ...response.items.map(i => i.questionId),
    ...response.itemOptions.map(o => o.questionId)
  ]);

  const dbQuestions = await prisma.question.findMany({
    where: { id: { in: Array.from(questionIds) } }
  });
  const idToCode = new Map(dbQuestions.map(q => [q.id, q.code]));

  // Fill items
  for (const item of response.items) {
    const code = idToCode.get(item.questionId);
    if (!code) continue;

    if (item.numericValue !== null) {
      answers[code] = item.numericValue;
    } else if (item.textValue !== null) {
      answers[code] = item.textValue;
    }
  }

  // Fill options (multi)
  // For multi, we need to aggregate.
  const multiAnswers: Record<string, string[]> = {};
  for (const opt of response.itemOptions) {
    const qCode = idToCode.get(opt.questionId);
    if (!qCode) continue;

    // In service.ts we used `option.id` as `${questionId}_${val}`.
    // But we need the original value.
    // Schema Option doesn't have value.
    // But we constructed ID as `${qId}_${val}`.
    // So we can extract it? Or we can query Option if we added value field?
    // Wait, we didn't add value field to Option.
    // We rely on ID structure? That's risky but MVP workaround.
    // Let's check `opt.optionId`.
    // It is `qId_val`.
    // Let's split by `_`? But val might contain `_`.
    // Ideally we should have `code` in Option.
    // But we didn't migrate.
    // Let's assume we can fetch Option and if it has code, good.
    // If we used the `id` hack, we can try to recover.
    // Actually, for Profile Generation, we need the `value` to match Question Option value.
    // If we can't recover value, we are stuck.
    // Let's check if we can fetch Option.code?
    // In service.ts we did `data: { id: optionId, questionId: ... }`.
    // We did NOT save `code`.
    // This is a blocker.
    // FIX: In service.ts, we should save `code` if schema allows?
    // Schema for Option: `model Option { id, questionId }` ... NO CODE field.
    // This is the "Prisma Schema gap" I mentioned.
    // But wait, `questions.ts` defines options static.
    // We can iterate QUESTIONS and map? No, we need to know WHICH option user selected.
    // We have `optionId`.
    // If `optionId` = `${qId}_${val}`, we can strip prefix.
    // `val` is the option value.
    // `qId` is CUID (usually 25 chars).
    // Let's assume we can strip `${questionId}_`.

    const prefix = `${opt.questionId}_`;
    if (opt.optionId.startsWith(prefix)) {
      const val = opt.optionId.slice(prefix.length);
      if (!multiAnswers[qCode]) multiAnswers[qCode] = [];
      multiAnswers[qCode].push(val);
    }
  }

  Object.assign(answers, multiAnswers);

  // 4. Generate Snapshot
  const { snapshot, checksum } = generateProfileSnapshot(QUESTIONS, answers);

  // 5. Upsert Profile
  // Schema: Profile unique(responseId)
  const profile = await prisma.profile.upsert({
    where: { responseId: response.id },
    create: {
      userId,
      responseId: response.id,
      questionnaireVersionId: versionId,
      profileSpecVersionId: PROFILE_SPEC_VERSION,
      templateVersionId: PROFILE_TEMPLATE_VERSION,
      policyChecksum: checksum, // Using profile checksum as policy checksum for MVP? Or should be Policy Config checksum?
      // Requirement says: profile checksum: sha256(stable stringify(snapshot))
      // Schema has `policyChecksum` and `policySnapshot`.
      // And `profileSnapshot`?
      // Schema: `policySnapshot String // Json`, `profileSnapshot String? // Json`
      // Let's store generated snapshot in `profileSnapshot`.
      // `policySnapshot` should be the RULES used.
      // MVP: we don't have dynamic rules yet.
      // Let's store empty or minimal policy snapshot.
      policySnapshot: JSON.stringify({ version: PROFILE_SPEC_VERSION }),
      profileSnapshot: JSON.stringify(snapshot),
    },
    update: {
      // Re-generate if called again
      policyChecksum: checksum,
      profileSnapshot: JSON.stringify(snapshot),
    }
  });

  return profile;
}

export async function getMyProfile(userId: string) {
  // Get latest profile
  // Schema doesn't have `activeProfileId` on User yet (based on last schema file content).
  // We can query Profile by userId order by createdAt desc?
  // Schema Profile has `userId` and `createdAt`.

  const profile = await prisma.profile.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          avatarUrl: true,
          photoVisibility: true
        }
      }
    }
  });

  return profile;
}
