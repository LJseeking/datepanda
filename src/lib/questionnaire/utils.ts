import { QUESTIONS, Question, QuestionType, QUESTIONNAIRE_VERSION } from "./questions";

export { QUESTIONS, QUESTIONNAIRE_VERSION };

export function getQuestionMap(): Map<string, Question> {
  const map = new Map<string, Question>();
  for (const q of QUESTIONS) {
    map.set(q.key, q);
  }
  return map;
}

export function isValidQuestionKey(key: string): boolean {
  return getQuestionMap().has(key);
}

export type ValidateAnswerResult =
  | { ok: true }
  | { ok: false; code: string; message: string };

export function validateAnswer(
  question: Question,
  answer: any
): ValidateAnswerResult {
  if (question.required) {
    // Check missing values
    if (answer === undefined || answer === null || answer === "") {
      return {
        ok: false,
        code: "MISSING_REQUIRED",
        message: `Question '${question.title}' is required`,
      };
    }
    if (question.type === "multi" && (!Array.isArray(answer) || answer.length === 0)) {
       return {
        ok: false,
        code: "MISSING_REQUIRED",
        message: `Question '${question.title}' is required`,
      };
    }
  } else {
    // Optional questions: allow empty/null/undefined
    if (answer === undefined || answer === null || answer === "") {
      return { ok: true };
    }
    if (question.type === "multi" && Array.isArray(answer) && answer.length === 0) {
      return { ok: true };
    }
  }

  // Type specific validation
  switch (question.type) {
    case "single":
      if (typeof answer !== "string") {
        return {
          ok: false,
          code: "INVALID_PAYLOAD",
          message: "Single choice answer must be a string",
        };
      }
      if (question.options) {
        const validValues = new Set(question.options.map((o) => o.value));
        if (!validValues.has(answer)) {
          return {
            ok: false,
            code: "INVALID_OPTION",
            message: `Value '${answer}' is not a valid option`,
          };
        }
      }
      break;

    case "multi":
      if (!Array.isArray(answer)) {
        return {
          ok: false,
          code: "INVALID_PAYLOAD",
          message: "Multi choice answer must be an array",
        };
      }
      if (question.options) {
        const validValues = new Set(question.options.map((o) => o.value));
        for (const val of answer) {
          if (typeof val !== "string" || !validValues.has(val)) {
             return {
              ok: false,
              code: "INVALID_OPTION",
              message: `Value '${val}' is not a valid option`,
            };
          }
        }
      }
      break;

    case "scale":
      if (typeof answer !== "number") {
         return {
          ok: false,
          code: "INVALID_PAYLOAD",
          message: "Scale answer must be a number",
        };
      }
      if (question.scale) {
        const { min, max } = question.scale;
        if (answer < min || answer > max) {
          return {
            ok: false,
            code: "INVALID_SCALE_RANGE",
            message: `Value ${answer} is out of scale range [${min}, ${max}]`,
          };
        }
      }
      break;

    case "text":
      if (typeof answer !== "string") {
        return {
          ok: false,
          code: "INVALID_PAYLOAD",
          message: "Text answer must be a string",
        };
      }
      if (answer.length > 200) {
        return {
          ok: false,
          code: "TEXT_TOO_LONG",
          message: "Text answer exceeds 200 characters",
        };
      }
      break;
  }

  return { ok: true };
}

export function getRequiredKeys(): string[] {
  return QUESTIONS.filter((q) => q.required).map((q) => q.key);
}

export function assertAllQuestionsUnique(): void {
  if (QUESTIONS.length !== 60) {
    throw new Error(`Questionnaire integrity check failed: Expected 60 questions, found ${QUESTIONS.length}`);
  }
  const keys = new Set<string>();
  for (const q of QUESTIONS) {
    if (keys.has(q.key)) {
      throw new Error(`Questionnaire integrity check failed: Duplicate key '${q.key}'`);
    }
    keys.add(q.key);
  }
}

// Auto-run check on module load (safe in Node/Next.js environment)
// In production or development, we want to fail fast if questionnaire is broken
assertAllQuestionsUnique();
