import { prisma } from "@/lib/db/prisma";
import { QUESTIONNAIRE_VERSION, QUESTIONS, getQuestionMap } from "@/lib/questionnaire/utils";
import { generateProfileSnapshot } from "./generate";
import { apiError } from "@/lib/utils/http";

const PROFILE_SPEC_VERSION = "v1";
const PROFILE_TEMPLATE_VERSION = "v1";

export async function generateAndUpsertProfile(userId: string) {
  const versionId = QUESTIONNAIRE_VERSION;

  const responses = await prisma.response.findMany({
    where: { userId, questionnaireVersionId: versionId },
    orderBy: { createdAt: 'desc' },
    take: 1
  });

  const responseId = responses[0]?.id;

  if (!responseId) {
    throw apiError("QUESTIONNAIRE_NOT_SUBMITTED", "Please submit questionnaire first", 400);
  }

  const response = await prisma.response.findUnique({
    where: { id: responseId },
    include: {
      items: true,
      itemOptions: { include: { option: true } }
    }
  });

  if (!response) {
    throw apiError("INTERNAL_ERROR", "Response data missing", 500);
  }

  const answers: Record<string, any> = {};

  const questionIds = new Set([
    ...response.items.map(i => i.questionId),
    ...response.itemOptions.map(o => o.questionId)
  ]);

  const dbQuestions = await prisma.question.findMany({
    where: { id: { in: Array.from(questionIds) } }
  });
  const idToCode = new Map(dbQuestions.map(q => [q.id, q.code]));

  for (const item of response.items) {
    const code = idToCode.get(item.questionId);
    if (!code) continue;

    if (item.numericValue !== null) {
      answers[code] = item.numericValue;
    } else if (item.textValue !== null) {
      answers[code] = item.textValue;
    }
  }

  const multiAnswers: Record<string, string[]> = {};
  for (const opt of response.itemOptions) {
    const qCode = idToCode.get(opt.questionId);
    if (!qCode) continue;

    const prefix = `${opt.questionId}_`;
    if (opt.optionId.startsWith(prefix)) {
      const val = opt.optionId.slice(prefix.length);
      if (!multiAnswers[qCode]) multiAnswers[qCode] = [];
      multiAnswers[qCode].push(val);
    }
  }

  Object.assign(answers, multiAnswers);

  try {
    const { snapshot, checksum } = generateProfileSnapshot(QUESTIONS, answers);

    const profile = await prisma.profile.upsert({
      where: { responseId: response.id },
      create: {
        userId,
        responseId: response.id,
        questionnaireVersionId: versionId,
        profileSpecVersionId: PROFILE_SPEC_VERSION,
        templateVersionId: PROFILE_TEMPLATE_VERSION,
        policyChecksum: checksum,
        policySnapshot: JSON.stringify({ version: PROFILE_SPEC_VERSION }),
        profileSnapshot: JSON.stringify(snapshot),
      },
      update: {
        policyChecksum: checksum,
        profileSnapshot: JSON.stringify(snapshot),
      }
    });

    return profile;
  } catch (err: any) {
    const errorDump = err.stack ? String(err.stack) : String(err);
    throw apiError("INTERNAL_ERROR", errorDump, 500);
  }
}

export async function getMyProfile(userId: string) {
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
