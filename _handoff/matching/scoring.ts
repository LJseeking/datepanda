import { ProfileSnapshot } from "@/lib/profile/generate";

export type MatchResult = {
  score: number;
  reasons: string[];
};

// 辅助：获取 single/text 答案
function getSingle(snap: ProfileSnapshot, key: string): string | undefined {
  const val = snap.answers[key];
  if (Array.isArray(val)) return undefined; // Should be single
  return val as string;
}

// 辅助：获取 scale 答案
function getScale(snap: ProfileSnapshot, key: string): number | undefined {
  return snap.traits[key];
}

// 辅助：获取 multi 答案
function getMulti(snap: ProfileSnapshot, key: string): string[] {
  const val = snap.answers[key];
  if (Array.isArray(val)) return val;
  if (val) return [val as string];
  return [];
}

// A 桶：关系目标 (35分)
function scoreSectionA(a: ProfileSnapshot, b: ProfileSnapshot): { score: number; reason?: string } {
  let score = 0;
  
  // 1. 关系目标 (15分)
  const goalA = getSingle(a, "relationship_goal");
  const goalB = getSingle(b, "relationship_goal");
  if (goalA && goalB) {
    if (goalA === goalB) {
        score += 15;
    } else if (
        (goalA === "serious" && goalB === "dating") || 
        (goalA === "dating" && goalB === "serious") ||
        (goalA === "friends_first" && goalB === "dating")
    ) {
        score += 8; // 部分兼容
    }
  }

  // 2. 排他性 (10分)
  const exclA = getSingle(a, "relationship_exclusivity");
  const exclB = getSingle(b, "relationship_exclusivity");
  if (exclA && exclB) {
      if (exclA === exclB) score += 10;
      else if (exclA === "open_to_discuss" || exclB === "open_to_discuss") score += 5;
  }

  // 3. 推进节奏 (10分)
  const paceA = getSingle(a, "relationship_pace");
  const paceB = getSingle(b, "relationship_pace");
  if (paceA && paceB) {
      if (paceA === paceB) score += 10;
      else if ((paceA === "medium" && paceB !== "medium") || (paceB === "medium" && paceA !== "medium")) score += 5;
  }

  return { score, reason: score >= 25 ? "关系目标与节奏高度一致" : undefined };
}

// B 桶：生活习惯 (25分)
function scoreSectionB(a: ProfileSnapshot, b: ProfileSnapshot): { score: number; reason?: string } {
    let score = 0;
    
    // 1. 作息 (7分)
    const schA = getSingle(a, "lifestyle_schedule");
    const schB = getSingle(b, "lifestyle_schedule");
    if (schA && schB && schA === schB) score += 7;

    // 2. 吸烟 (6分) - 必须都不吸烟才加分，或都吸烟
    const smkA = getSingle(a, "lifestyle_smoke");
    const smkB = getSingle(b, "lifestyle_smoke");
    if (smkA === "no" && smkB === "no") score += 6;
    else if (smkA === smkB) score += 6;

    // 3. 饮酒 (6分)
    const drkA = getSingle(a, "lifestyle_drink");
    const drkB = getSingle(b, "lifestyle_drink");
    if (drkA === drkB) score += 6;

    // 4. 整洁度 (6分) - scale diff
    const clnA = getScale(a, "lifestyle_cleanliness");
    const clnB = getScale(b, "lifestyle_cleanliness");
    if (clnA !== undefined && clnB !== undefined) {
        const diff = Math.abs(clnA - clnB);
        score += Math.max(0, 6 - diff * 2);
    }

    return { score, reason: score >= 20 ? "生活作息与习惯非常合拍" : undefined };
}

// C 桶：价值观与沟通 (25分)
function scoreSectionC(a: ProfileSnapshot, b: ProfileSnapshot): { score: number; reason?: string } {
    let score = 0;

    // 1. 冲突处理 (9分)
    const conA = getSingle(a, "value_conflict_style");
    const conB = getSingle(b, "value_conflict_style");
    if (conA && conB && conA === conB) score += 9;

    // 2. 回复速度 (8分)
    const repA = getSingle(a, "comm_reply_speed");
    const repB = getSingle(b, "comm_reply_speed");
    if (repA && repB) {
        if (repA === repB) score += 8;
        else if (repA === "normal" || repB === "normal") score += 4;
    }

    // 3. 独处空间 (8分) - scale diff
    const alnA = getScale(a, "value_alone_time");
    const alnB = getScale(b, "value_alone_time");
    if (alnA !== undefined && alnB !== undefined) {
        const diff = Math.abs(alnA - alnB);
        score += Math.max(0, 8 - diff * 2);
    }

    return { score, reason: score >= 20 ? "沟通方式与相处模式契合" : undefined };
}

// D 桶：兴趣 (15分)
function scoreSectionD(a: ProfileSnapshot, b: ProfileSnapshot): { score: number; reason?: string } {
    let score = 0;
    
    // Topics + Date Style
    const topicsA = getMulti(a, "interest_topics");
    const topicsB = getMulti(b, "interest_topics");
    const dateA = getMulti(a, "interest_date_style");
    const dateB = getMulti(b, "interest_date_style");

    const poolA = new Set([...topicsA, ...dateA]);
    const poolB = new Set([...topicsB, ...dateB]);
    
    // Intersection
    let common = 0;
    const commonItems: string[] = [];
    for (const item of poolA) {
        if (poolB.has(item)) {
            common++;
            commonItems.push(item); // Note: item is key (e.g. "coffee"), need mapping to label if we want display
        }
    }

    // Simple scoring: 1 common = 2 pts, max 15
    score = Math.min(15, common * 3);

    // Map common items to Chinese labels (Simplified hardcoded mapping for MVP reasons)
    // In real app we should use Question Options map.
    // For MVP reasons, we return a generic string if matched.
    // Ideally we pass `commonItems` out but type signature restricts.
    // Let's just return a generic reason if high score.
    
    return { score, reason: score >= 9 ? "兴趣爱好与约会偏好重合度高" : undefined };
}

export function calculateMatchScore(a: ProfileSnapshot, b: ProfileSnapshot): MatchResult {
  const resA = scoreSectionA(a, b);
  const resB = scoreSectionB(a, b);
  const resC = scoreSectionC(a, b);
  const resD = scoreSectionD(a, b);

  const totalScore = resA.score + resB.score + resC.score + resD.score;
  const reasons: string[] = [];
  
  if (resA.reason) reasons.push(resA.reason);
  if (resB.reason) reasons.push(resB.reason);
  if (resC.reason) reasons.push(resC.reason);
  if (resD.reason) reasons.push(resD.reason);

  // Fallback reason if score is high but no specific bucket dominated
  if (totalScore >= 80 && reasons.length === 0) {
      reasons.push("综合匹配度很高");
  }

  return {
      score: Math.min(100, totalScore), // Cap at 100
      reasons: reasons.slice(0, 3) // Top 3
  };
}
