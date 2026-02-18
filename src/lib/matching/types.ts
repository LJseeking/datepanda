export type MatchRound = "THU" | "FRI";

export type MatchStatus = 
  | "PENDING" 
  | "ACCEPTED" 
  | "REJECTED" 
  | "EXPIRED" 
  | "MUTUAL_ACCEPTED";

export const MATCH_KIND = "MATCH_PROPOSAL";

export type ProposalMeta = {
  // Can hold extra info not in top-level columns
  algoVersion?: string;
  threshold?: number;
  rejectReason?: string;
  debug?: any;
};
