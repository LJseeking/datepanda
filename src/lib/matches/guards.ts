import { prisma } from "@/lib/db/prisma";
import { apiError } from "@/lib/utils/http";

export const ICEBREAKER_TOTAL = 8;
export const ICEBREAKER_THRESHOLD = 4; // min answers needed to request contact

export type MatchRole = "A" | "B";

export interface MatchContext {
    match: Awaited<ReturnType<typeof getMatchOrThrow>>;
    role: MatchRole;
    otherId: string;
}

async function getMatchOrThrow(matchId: string) {
    const match = await prisma.matchRoom.findUnique({
        where: { id: matchId },
    });
    if (!match) throw apiError("NOT_FOUND", "Match not found", 404);
    return match;
}

/**
 * Ensure the current user is a participant (A or B) of this MatchRoom.
 * Returns the match and which role the current user plays.
 */
export async function requireMatchParticipant(matchId: string, userId: string): Promise<MatchContext> {
    const match = await getMatchOrThrow(matchId);

    let role: MatchRole;
    let otherId: string;

    if (match.userAId === userId) {
        role = "A";
        otherId = match.userBId;
    } else if (match.userBId === userId) {
        role = "B";
        otherId = match.userAId;
    } else {
        throw apiError("FORBIDDEN", "You are not a participant of this match", 403);
    }

    return { match, role, otherId };
}

/**
 * Throw if match is in BLOCKED state.
 */
export function requireNotBlocked(match: { contactStatus: string }) {
    if (match.contactStatus === "BLOCKED") {
        throw apiError("FORBIDDEN", "This match has been blocked", 403);
    }
}

/**
 * Count how many icebreaker questions the current user has answered in this match.
 */
export async function countMyAnswers(matchId: string, userId: string): Promise<number> {
    return prisma.icebreakerAnswer.count({
        where: { matchId, userId },
    });
}

/**
 * Ensure user has answered minimum icebreaker questions required to request contact.
 */
export async function requireIcebreakerThreshold(matchId: string, userId: string) {
    const count = await countMyAnswers(matchId, userId);
    if (count < ICEBREAKER_THRESHOLD) {
        throw apiError(
            "THRESHOLD_NOT_MET",
            `还需要再回答 ${ICEBREAKER_THRESHOLD - count} 道破冰题才能申请交换联系方式`,
            400
        );
    }
}

/**
 * Write an audit log entry.
 */
export async function writeContactLog(matchId: string, userId: string, event: string) {
    await prisma.contactUnlockLog.create({
        data: { matchId, userId, event },
    });
}

/**
 * Normalize a user pair into (userAId, userBId) using lexicographic sort.
 * This ensures only one MatchRoom per pair regardless of who initiates.
 */
export function normalizeMatchPair(u1: string, u2: string): { userAId: string; userBId: string } {
    const [userAId, userBId] = [u1, u2].sort();
    return { userAId, userBId };
}
