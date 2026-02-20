import { KIKO_QUESTIONS, Dimension, KikoQuestion } from "../questionnaire/kikoQuestions";

export type KikoDimensionScores = Record<Dimension, number>;

export type KikoValidationResult = {
    isValid: boolean;
    contradictionCount: number;
    missingCount: number;
};

// Map questions by ID for fast lookup
const Q_MAP = new Map<string, KikoQuestion>(KIKO_QUESTIONS.map(q => [q.id, q]));

/**
 * Mirror pairs for cheat/consistency checking
 * (Positive vs Reverse logic on the same underlying concept)
 */
const MIRROR_PAIRS: [string, string][] = [
    ["A02", "A07"],
    ["A03", "A08"],
    ["C01", "C07"],
    ["C03", "C08"],
    ["M01", "M07"],
    ["M04", "M08"],
    ["P02", "P07"],
    ["P04", "P08"],
    ["E01", "E07"],
    ["E03", "E08"]
];

/**
 * 1. CHEAT CHECK: Check for mirrored contradictions.
 * If A02 (reverse) and A07 (positive) BOTH get a 5, that's a maximum contradiction.
 * Expected: ans_A02 + ans_A07 roughly equals 6. (e.g., 5+1=6, 4+2=6, 3+3=6).
 * If the sum is 10 (5+5) or 2 (1+1), inconsistency is 4.
 */
export function checkKikoConsistency(traits: Record<string, number>): KikoValidationResult {
    let contradictionCount = 0;
    let missingCount = 0;

    for (const q of KIKO_QUESTIONS) {
        if (traits[q.id] === undefined) {
            missingCount++;
        }
    }

    for (const [id1, id2] of MIRROR_PAIRS) {
        const a1 = traits[id1];
        const a2 = traits[id2];

        if (a1 !== undefined && a2 !== undefined) {
            const sum = a1 + a2;
            const inconsistency = Math.abs(sum - 6);

            // If sum is >= 9 (e.g. 5+4=9 or 5+5=10) or <= 3 (1+2=3, 1+1=2)
            if (inconsistency >= 3) {
                contradictionCount++;
            }
        }
    }

    // If >3 contradictions, flag as invalid (random guessing)
    const isValid = contradictionCount <= 3;

    return { isValid, contradictionCount, missingCount };
}

/**
 * 2. DIMENSION SCORING
 * Converts 1-5 Answers into a 0-100 Dimension Score based on weights and direction.
 */
export function calculateKikoDimensions(traits: Record<string, number>): KikoDimensionScores {
    const scores: Record<Dimension, { totalWeight: number; rawScore: number }> = {
        AttachmentSecurity: { totalWeight: 0, rawScore: 0 },
        ConflictRisk: { totalWeight: 0, rawScore: 0 },
        RelationshipMaturity: { totalWeight: 0, rawScore: 0 },
        PaceAlignment: { totalWeight: 0, rawScore: 0 },
        EmotionalNeedIntensity: { totalWeight: 0, rawScore: 0 }
    };

    for (const [id, value] of Object.entries(traits)) {
        const q = Q_MAP.get(id);
        if (!q) continue;

        const v = Number(value);
        if (isNaN(v) || v < 1 || v > 5) continue;

        // Positive: 1 -> 0 pts, 5 -> 4 pts  // (ans - 1)
        // Reverse:  1 -> 4 pts, 5 -> 0 pts  // (5 - ans)
        const normalizedValue = q.direction === "positive" ? (v - 1) : (5 - v);

        // Scale 0-4 to 0-100 raw contribution
        const itemScore = (normalizedValue / 4) * 100 * q.weight;

        scores[q.dimension].totalWeight += q.weight;
        scores[q.dimension].rawScore += itemScore;
    }

    // Normalize by total weight to get final 0-100 for each dimension
    const result = {} as KikoDimensionScores;
    for (const dim in scores) {
        const d = dim as Dimension;
        const bucket = scores[d];
        result[d] = bucket.totalWeight > 0 ? Math.round(bucket.rawScore / bucket.totalWeight) : 50; // default 50 if missing
    }

    return result;
}

export type PairMatchResult = {
    score: number; // 0-100
    reasons: string[];
};

/**
 * 3. DIFFERENCE-PENALTY PAIR MATCHING
 * Dimension diff penalty. High matches High = good. Low matches Low = good.
 */
export function calculateKikoPairMatch(
    dimsA: KikoDimensionScores,
    dimsB: KikoDimensionScores
): PairMatchResult {
    let totalScore = 0;
    const reasons: string[] = [];

    const checkDim = (
        dim: Dimension,
        weight: number,
        reasonHighMatch: string,
        reasonLowMatch: string
    ) => {
        const a = dimsA[dim];
        const b = dimsB[dim];

        // Compatibility is 100 minus the difference between them
        const diff = Math.abs(a - b);
        let compatibility = 100 - diff;

        // Special adjustments can be overlaid here (e.g. if both have high ConflictRisk, penalize anyway)
        if (dim === "ConflictRisk" && a < 40 && b < 40) {
            // both high risk (lower score = higher risk in our scale)
            compatibility *= 0.8;
        }

        totalScore += compatibility * weight;

        // Generate specific reasons if the match is excellent (<15 diff)
        if (diff < 15) {
            if (a >= 75 && b >= 75) reasons.push(reasonHighMatch);
            else if (a <= 35 && b <= 35) reasons.push(reasonLowMatch);
        }
    };

    // Assign weights to the 5 dimensions
    // Total weight = 5.0 -> final score will be divided by 5
    checkDim("AttachmentSecurity", 1.0,
        "你们的情绪内核都很稳定安全，彼此信任",
        "你们对感情都很敏锐，能给对方强烈的专属感"
    );
    checkDim("ConflictRisk", 1.0,
        "你们都倾向于理智且温和的沟通方式，相处会很舒服",
        "你们都不喜欢冷战，遇到矛盾会直接表达出来"
    );
    checkDim("RelationshipMaturity", 1.0,
        "你们都是极具责任感且目光长远的长择型恋人",
        "你们更享受当下的快乐，不被条条框框束缚"
    );
    checkDim("PaceAlignment", 1.0,
        "你们在感情推进上都属于深思熟虑的慢热型，节奏一致",
        "你们认定对方后都很愿意热烈投入，是双向奔赴的快节奏"
    );
    checkDim("EmotionalNeedIntensity", 1.0,
        "你们都能在恋爱中保持独立，给彼此留足私人空间",
        "你们都极度需要高质量的陪伴与关注，特别黏人且契合"
    );

    return {
        score: Math.round(totalScore / 5.0),
        reasons
    };
}
