import { prisma } from "@/lib/db/prisma";
import { 
  getQuestionMap, 
  validateAnswer, 
  isValidQuestionKey, 
  getRequiredKeys,
  QUESTIONNAIRE_VERSION 
} from "./utils";
import { apiError } from "@/lib/utils/http";

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
      throw apiError("INVALID_QUESTION_KEY", `Unknown question: ${ans.questionKey}`);
    }
    const q = questionMap.get(ans.questionKey)!;
    
    // Normalize answer format for validation
    let val: any = ans.value;
    if (q.type === "multi") val = ans.values;
    if (q.type === "scale") val = Number(ans.value);

    const validation = validateAnswer(q, val);
    if (!validation.ok) {
      throw apiError(validation.code || "INVALID_ANSWER", validation.message || "Invalid answer");
    }
  }

  // 2. Transaction Write
  return await prisma.$transaction(async (tx) => {
    // Check lock state
    const state = await tx.userQuestionnaireState.findUnique({
      where: { userId_questionnaireVersionId: { userId, questionnaireVersionId: versionId } },
    });

    if (state?.submittedResponseId) {
      throw apiError("QUESTIONNAIRE_LOCKED", "Questionnaire already submitted", 409);
    }

    const response = await getOrCreateResponse(tx, userId, versionId);

    for (const ans of answers) {
      const q = questionMap.get(ans.questionKey)!;
      
      // Upsert ResponseItem
      // Note: We use questionKey as questionId for now since schema uses String ID
      // In real world, Question table should exist. Here we assume questionKey IS the ID or we map it.
      // Schema: ResponseItem (responseId, questionId) unique
      // We need to map questionKey -> questionId. 
      // MVP simplification: We assume Question table is NOT populated or we insert on fly?
      // Based on schema, ResponseItem has relation to Question.
      // So we MUST have Question records.
      // Fix: We need to ensure Question records exist for keys.
      // For MVP, let's assume we create them if missing or seed them.
      // Let's upsert Question first to be safe (or assume seeded).
      // Optimization: In real prod, Questions are seeded. Here we lazy create.
      
      let questionRecord = await tx.question.findFirst({ where: { code: ans.questionKey } });
      if (!questionRecord) {
          questionRecord = await tx.question.create({ data: { code: ans.questionKey } });
      }

      const itemData: any = {
        responseId: response.id,
        questionId: questionRecord.id,
      };

      if (q.type === "scale") {
        itemData.numericValue = Number(ans.value);
      } else if (q.type === "single" || q.type === "text") {
        itemData.textValue = ans.value;
      }
      
      // Upsert Item
      const item = await tx.responseItem.upsert({
        where: {
          responseId_questionId: { responseId: response.id, questionId: questionRecord.id },
        },
        create: itemData,
        update: itemData,
      });

      // Handle Multi Options
      if (q.type === "multi" && ans.values) {
        // Clear old options
        // Schema: ResponseItemOption (responseId, questionId, optionId) unique
        await tx.responseItemOption.deleteMany({
            where: {
                responseId: response.id,
                questionId: questionRecord.id,
            }
        });

        // Insert new options
        // Need Option records too
        for (const val of ans.values) {
            // Lazy create Option record
            // Option schema: id, questionId, question (relation)
            // It seems Option doesn't have a 'code' or 'value' field in the schema provided previously?
            // Let's check Schema... 
            // Model Option { id, questionId } ... Wait, where is the value?
            // Ah, I need to check schema again. If Option is just ID, we can't store value.
            // Assuming Option has 'id' and we just link it.
            // But we need to know WHICH option it is.
            // Let's assume for MVP we just created Option records blindly or we need to fix Schema/Code.
            // Re-reading Schema provided in previous turn:
            // model Option { id, questionId, question @relation... } -> It has NO value/code field!
            // This is a schema gap. But I cannot change schema now easily without migration.
            // Wait, ResponseItemOption links to Option.
            // If Option table is empty, we can't link.
            // WORKAROUND for MVP without changing schema:
            // We use `responseItem.textValue` to store multi values as JSON string? No, requirement says use relation.
            // Let's assume Option has `id` and we use the `val` (string) as the ID if it's a CUID, or we map it?
            // Actually, for a real questionnaire, Options are static data.
            // If I can't change schema, I will skip creating Option record and just not link it? No, FK constraint.
            // I MUST have an Option record.
            // Let's assume I can create an Option with just ID.
            // I will use a deterministic ID generation or lookup?
            // Since I can't add fields to Option, I will create Option if not exists, but I can't store the 'value' label.
            // This makes Option table useless for retrieval unless ID = value.
            // Let's try to use the `val` (e.g. "coffee") as the Option ID if it fits?
            // Option.id is String @default(cuid()).
            // I can override ID on create.
            
            const optionId = `${questionRecord.id}_${val}`; // Composite ID to be unique and deterministic
            
            // Try find or create with specific ID
            let optionRecord = await tx.option.findUnique({ where: { id: optionId } });
            if (!optionRecord) {
                optionRecord = await tx.option.create({
                    data: { id: optionId, questionId: questionRecord.id }
                });
            }

            await tx.responseItemOption.create({
                data: {
                    responseId: response.id,
                    questionId: questionRecord.id,
                    optionId: optionRecord.id,
                }
            });
        }
      }
    }

    return { responseId: response.id };
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
        throw apiError("NO_DRAFT", "No in-progress questionnaire found", 400);
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
        throw apiError("MISSING_REQUIRED", `Missing answers for: ${missing.join(", ")}`, 400);
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
  });
}

export async function getQuestionnaireState(userId: string) {
    const versionId = QUESTIONNAIRE_VERSION;
    const state = await prisma.userQuestionnaireState.findUnique({
        where: { userId_questionnaireVersionId: { userId, questionnaireVersionId: versionId } },
    });
    
    return {
        locked: !!state?.submittedResponseId,
        submittedAt: state?.submittedAt,
        responseId: state?.activeResponseId
    };
}
