import crypto from "crypto";
import { Question } from "@/lib/questionnaire/questions";
import { calculateKikoDimensions, checkKikoConsistency } from "@/lib/matching/kiko";

export type ProfileSnapshot = {
  traits: Record<string, number>;
  answers: Record<string, string | string[]>;
  bio: string;
  kikoDimensions?: Record<string, number>;
  kikoFlags?: {
    contradictions: number;
    isValid: boolean;
  };
};

// 稳定 Stringify (按 key 排序)
function stableStringify(obj: any): string {
  if (obj === null || typeof obj !== "object") {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return "[" + obj.map(stableStringify).join(",") + "]";
  }
  const keys = Object.keys(obj).sort();
  return (
    "{" +
    keys.map((k) => JSON.stringify(k) + ":" + stableStringify(obj[k])).join(",") +
    "}"
  );
}

export function generateProfileSnapshot(
  questions: readonly Question[],
  answers: Record<string, any>
): { snapshot: ProfileSnapshot; checksum: string } {
  const snapshot: ProfileSnapshot = {
    traits: {},
    answers: {},
    bio: "",
  };

  for (const q of questions) {
    const val = answers[q.key];
    if (val === undefined || val === null) continue;

    if (q.type === "scale") {
      snapshot.traits[q.key] = Number(val);
    } else if (q.type === "text" && q.key === "open_text_self_intro") {
      snapshot.bio = String(val);
      // Also store in answers for completeness
      snapshot.answers[q.key] = val;
    } else {
      snapshot.answers[q.key] = val;
    }
  }

  // Inject Kiko processing over traits
  const kikoCheck = checkKikoConsistency(snapshot.traits);
  snapshot.kikoFlags = {
    contradictions: kikoCheck.contradictionCount,
    isValid: kikoCheck.isValid
  };
  snapshot.kikoDimensions = calculateKikoDimensions(snapshot.traits);

  const jsonStr = stableStringify(snapshot);
  const checksum = crypto.createHash("sha256").update(jsonStr).digest("hex");

  return { snapshot, checksum };
}
