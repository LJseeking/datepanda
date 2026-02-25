import { prisma } from "@/lib/db/prisma";
import {
  getQuestionMap,
  validateAnswer,
  isValidQuestionKey,
  getRequiredKeys,
  QUESTIONNAIRE_VERSION
} from "./utils";
import { apiError } from "@/lib/utils/http";

class ServiceError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export type AnswerInput = {
  questionKey: string;
  value?: string;
  values?: string[]; // For multi-select
};

// 获取或创建 Response (Transaction helper)
// 注意：MVP 简化，每个 User 每个 Version 只有一个 Response
// 如果已提交，则不允许修改
async function getOrCreateResponse(tx: any, userId: string, versionId: string) {
  let response = await tx.response.findFirst({
    where: { userId, questionnaireVersionId: versionId },
  });

  if (!response) {
    response = await tx.response.create({
      data: {
        userId,
        questionnaireVersionId: versionId,
        status: "IN_PROGRESS",
        clientMeta: "{}",
      },
    });

    // Create state record if not exists
    await tx.userQuestionnaireState.create({
      data: {
        userId,
        questionnaireVersionId: versionId,
        activeResponseId: response.id,
      }
    }).catch(() => {
      // Ignore unique constraint error if parallel create
    });
  }
  return response;
}

export async function upsertDraftAnswers(userId: string, answers: AnswerInput[]) {
  const versionId = QUESTIONNAIRE_VERSION;
  const questionMap = getQuestionMap();

  // 1. Validate Payload
  for (const ans of answers) {
    if (!isValidQuestionKey(ans.questionKey)) {
      throw new ServiceError("INVALID_QUESTION_KEY", `Unknown question: ${ans.questionKey}`);
    }
    const q = questionMap.get(ans.questionKey)!;

    // Normalize answer format for validation
    let val: any = ans.value;
    if (q.type === "multi") val = ans.values;
    if (q.type === "scale") val = Number(ans.value);

    const validation = validateAnswer(q, val);
    if (!validation.ok) {
      throw new ServiceError(validation.code || "INVALID_ANSWER", validation.message || "Invalid answer");
    }
  }

  // 2. Transaction Write
  return await prisma.$transaction(async (tx) => {
    // Check lock state
    const state = await tx.userQuestionnaireState.findUnique({
      where: { userId_questionnaireVersionId: { userId, questionnaireVersionId: versionId } },
    });

    if (state?.submittedResponseId) {
      throw new ServiceError("QUESTIONNAIRE_LOCKED", "Questionnaire already submitted", 409);
    }

    const response = await getOrCreateResponse(tx, userId, versionId);

    // Fast path: Pre-fetch all available questions
    const questionKeys = answers.map(a => a.questionKey);
    const existingQuestions = await tx.question.findMany({ where: { code: { in: questionKeys } } });
    const questionMapDb = new Map(existingQuestions.map(q => [q.code, q.id]));

    // Fast path: Create missing questions sequentially (usually only happens once)
    for (const key of questionKeys) {
      if (!questionMapDb.has(key)) {
        const newRecord = await tx.question.create({ data: { code: key } });
        questionMapDb.set(key, newRecord.id);
      }
    }

    // Prepare batch operations
    const itemUpsertPromises = [];
    const missingOptionDefs: { id: string, questionId: string }[] = [];
    const responseItemOptionsData: { responseId: string, questionId: string, optionId: string }[] = [];
    const questionIdsToClearOptions = new Set<string>();

    for (const ans of answers) {
      const q = questionMap.get(ans.questionKey)!;
      const questionId = questionMapDb.get(ans.questionKey)!;

      const itemData: any = {
        responseId: response.id,
        questionId: questionId,
      };

      if (q.type === "scale") {
        itemData.numericValue = Number(ans.value);
      } else if (q.type === "single" || q.type === "text") {
        itemData.textValue = ans.value;
      }

      itemUpsertPromises.push(
        tx.responseItem.upsert({
          where: { responseId_questionId: { responseId: response.id, questionId: questionId } },
          create: itemData,
          update: itemData,
        })
      );

      // Handle Multi Options
      if (q.type === "multi" && ans.values) {
        questionIdsToClearOptions.add(questionId);

        for (const val of ans.values) {
          const optionId = `${questionId}_${val}`;
          missingOptionDefs.push({ id: optionId, questionId: questionId });
          responseItemOptionsData.push({
            responseId: response.id,
            questionId: questionId,
            optionId: optionId,
          });
        }
      }
    }

    // Execute ResponseItem upserts in parallel (Prisma supports this if not conflicting)
    await Promise.all(itemUpsertPromises);

    // Multi-select bulk inserts
    if (questionIdsToClearOptions.size > 0) {
      await tx.responseItemOption.deleteMany({
        where: {
          responseId: response.id,
          questionId: { in: Array.from(questionIdsToClearOptions) }
        }
      });

      // Lazy bulk insert of Option definitions (skipDuplicates avoids conflict)
      if (missingOptionDefs.length > 0) {
        await tx.option.createMany({
          data: missingOptionDefs,
          skipDuplicates: true,
        });
      }

      // Bulk insert of the selected options
      if (responseItemOptionsData.length > 0) {
        await tx.responseItemOption.createMany({
          data: responseItemOptionsData,
        });
      }
    }

    return { responseId: response.id };
  }, {
    maxWait: 5000,
    timeout: 20000, // 20 seconds to accommodate remote DB latency
  });
}

export async function submitQuestionnaire(userId: string) {
  const versionId = QUESTIONNAIRE_VERSION;

  return await prisma.$transaction(async (tx) => {
    // 1. Get Response
    const response = await tx.response.findFirst({
      where: { userId, questionnaireVersionId: versionId, status: "IN_PROGRESS" },
      include: { items: true, itemOptions: { include: { option: true } } } // Need to load answers to validate
    });

    // Check if already submitted
    const state = await tx.userQuestionnaireState.findUnique({
      where: { userId_questionnaireVersionId: { userId, questionnaireVersionId: versionId } },
    });
    if (state?.submittedResponseId) {
      return { submittedAt: state.submittedAt }; // Idempotent success
    }

    if (!response) {
      throw new ServiceError("NO_DRAFT", "No in-progress questionnaire found", 400);
    }

    // 2. Validate All Required Questions Answered
    const requiredKeys = getRequiredKeys();
    // We need to map DB items back to keys.
    // This is expensive if we don't have Question code loaded.
    // Let's fetch all questions referenced
    const questionIds = new Set([
      ...response.items.map(i => i.questionId),
      ...response.itemOptions.map(o => o.questionId)
    ]);

    const dbQuestions = await tx.question.findMany({
      where: { id: { in: Array.from(questionIds) } }
    });
    const idToCode = new Map(dbQuestions.map(q => [q.id, q.code]));

    const answeredKeys = new Set<string>();

    // Single/Text/Scale items
    response.items.forEach(i => {
      const code = idToCode.get(i.questionId);
      if (code) answeredKeys.add(code);
    });
    // Multi options
    response.itemOptions.forEach(o => {
      const code = idToCode.get(o.questionId);
      if (code) answeredKeys.add(code);
    });

    const missing = requiredKeys.filter(k => !answeredKeys.has(k));
    if (missing.length > 0) {
      throw new ServiceError("MISSING_REQUIRED", `Missing answers for: ${missing.join(", ")}`, 400);
    }

    // 3. Lock & Update
    const now = new Date();
    await tx.response.update({
      where: { id: response.id },
      data: { status: "SUBMITTED", submittedAt: now }
    });

    await tx.userQuestionnaireState.upsert({
      where: { userId_questionnaireVersionId: { userId, questionnaireVersionId: versionId } },
      create: {
        userId,
        questionnaireVersionId: versionId,
        submittedResponseId: response.id,
        submittedAt: now,
        activeResponseId: response.id
      },
      update: {
        submittedResponseId: response.id,
        submittedAt: now
      }
    });

    return { submittedAt: now };
  }, {
    maxWait: 5000,
    timeout: 20000,
  });
}

export async function getQuestionnaireState(userId: string) {
  const versionId = QUESTIONNAIRE_VERSION;
  const state = await prisma.userQuestionnaireState.findUnique({
    where: { userId_questionnaireVersionId: { userId, questionnaireVersionId: versionId } },
  });

  let answers: Record<string, any> = {};

  if (state?.activeResponseId) {
    const response = await prisma.response.findUnique({
      where: { id: state.activeResponseId },
      include: {
        items: { include: { question: true } },
        itemOptions: { include: { question: true, option: true } }
      }
    });

    if (response) {
      // Reconstruct answers map
      response.items.forEach(item => {
        if (item.question && item.question.code) {
          if (item.numericValue !== null) {
            answers[item.question.code] = item.numericValue;
          } else if (item.textValue !== null) {
            answers[item.question.code] = item.textValue;
          }
        }
      });

      // Group multi-options
      const multiMap: Record<string, string[]> = {};
      response.itemOptions.forEach(opt => {
        const code = opt.question?.code;
        const value = opt.optionId.split('_').slice(1).join('_'); // Recovers the value from `questionId_value` formatting
        if (code && value) {
          if (!multiMap[code]) multiMap[code] = [];
          multiMap[code].push(value);
        }
      });

      answers = { ...answers, ...multiMap };
    }
  }

  return {
    locked: !!state?.submittedResponseId,
    submittedAt: state?.submittedAt,
    responseId: state?.activeResponseId,
    answers
  };
}
