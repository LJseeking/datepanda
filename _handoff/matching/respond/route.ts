import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { prisma } from "@/lib/db/prisma";
import { apiSuccess, apiError } from "@/lib/utils/http";
import { MATCH_KIND, MatchStatus } from "@/lib/matching/types";
import { encodeProposalMeta, decodeProposalMeta } from "@/lib/matching/serialize";
import { ensureConversationForPair } from "@/lib/messaging/ensureConversation";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireUser(req);
    const body = await req.json();
    const { proposalId, action, rejectReason } = body;

    if (!proposalId || !["ACCEPT", "REJECT"].includes(action)) {
      return apiError("VALIDATION_ERROR", "Invalid payload");
    }

    // 1. Transactional Update for Consistency
    // We fetch and lock (implicitly by update) or just check inside transaction
    // But since we need to make external calls or logic, we can just use $transaction for the critical path.
    // However, ensureConversationForPair uses its own transaction internally (for creation).
    // The requirement is to have respond logic in a single transaction.

    const result = await prisma.$transaction(async (tx) => {
        // A. Verify Ownership & Status
        const rec = await tx.recommendation.findUnique({
            where: { id: proposalId }
        }) as any;

        if (!rec) throw { code: "NOT_FOUND", message: "Proposal not found", status: 404 };
        
        // Ownership check
        const isOwner = rec.proposerUserId === userId; // Strict check on proposerUserId
        if (!isOwner) {
            // Fallback for old data if needed, but we backfilled. strict is better.
            if (rec.batchId) {
                 const batch = await tx.dailyRecommendationBatch.findUnique({
                    where: { id: rec.batchId },
                    select: { userId: true }
                });
                if (batch?.userId !== userId) throw { code: "NOT_FOUND", message: "Proposal not found", status: 404 };
            } else {
                throw { code: "NOT_FOUND", message: "Proposal not found", status: 404 };
            }
        }

        const currentStatus = rec.status;
        
        // B. Idempotency Check
        if (currentStatus === "ACCEPTED" && action === "ACCEPT") return { status: "ACCEPTED" };
        if (currentStatus === "REJECTED" && action === "REJECT") return { status: "REJECTED" };
        if (currentStatus === "MUTUAL_ACCEPTED") return { status: "MUTUAL_ACCEPTED", isMutual: true, weekKey: rec.weekKey, candidateId: rec.candidateUserId };
        if (["ACCEPTED", "REJECTED", "EXPIRED"].includes(currentStatus)) {
             throw { code: "INVALID_STATE", message: `Proposal is already ${currentStatus}`, status: 409 };
        }

        // C. Update Logic
        const now = new Date();
        const meta = decodeProposalMeta(rec.metaJson || (rec.reason && rec.reason.startsWith("{") ? rec.reason : null));
        if (action === "REJECT" && rejectReason) meta.rejectReason = rejectReason;

        if (action === "REJECT") {
            await tx.recommendation.update({
                where: { id: proposalId },
                data: { status: "REJECTED", actedAt: now, metaJson: encodeProposalMeta(meta) } as any
            });
            return { status: "REJECTED" };
        }

        // Action is ACCEPT
        // D. Check Mutual (inside transaction)
        // Find candidate's proposal pointing to ME
        const otherProposal = await tx.recommendation.findFirst({
            where: {
                kind: MATCH_KIND,
                weekKey: rec.weekKey,
                proposerUserId: rec.candidateUserId, 
                candidateUserId: userId,             
                status: "ACCEPTED", // Only match if they already ACCEPTED
                // round: "THU" | "FRI" // No restriction on round, THU and FRI share the same weekKey
            } as any
        });

        if (otherProposal) {
            // MUTUAL! Update BOTH to MUTUAL_ACCEPTED
            // Use updateMany for safety/simplicity
            await tx.recommendation.updateMany({
                where: { 
                    id: { in: [proposalId, otherProposal.id] },
                    status: { not: "MUTUAL_ACCEPTED" } // Prevent redundant updates
                },
                data: { 
                    status: "MUTUAL_ACCEPTED",
                    actedAt: now // Update actedAt for both? Or just me? 
                    // Requirement says: "将双方 proposal 以 updateMany 方式同步置 MUTUAL_ACCEPTED"
                    // Updating actedAt for other might be side-effect but acceptable for "mutual confirmation time".
                } as any
            });
            
            return { 
                status: "MUTUAL_ACCEPTED", 
                isMutual: true, 
                weekKey: rec.weekKey, 
                candidateId: rec.candidateUserId,
                myId: userId
            };
        } else {
            // Not mutual yet, just update mine
            await tx.recommendation.update({
                where: { id: proposalId },
                data: { status: "ACCEPTED", actedAt: now, metaJson: encodeProposalMeta(meta) } as any
            });
            return { status: "ACCEPTED" };
        }
    });

    // Post-transaction: Create Conversation if Mutual
    let conversationId: string | null = null;
    if (result.isMutual) {
        // Call ensureConversationForPair (idempotent)
        const conv = await ensureConversationForPair(result.myId || userId, result.candidateId, result.weekKey);
        conversationId = conv.conversationId;
    }

    return apiSuccess({ status: result.status, conversationId });

  } catch (error: any) {
    if (error.code && error.status) return apiError(error.code, error.message, error.status);
    console.error("[MatchRespond]", error);
    return apiError("INTERNAL_ERROR", "Failed to respond", 500);
  }
}
