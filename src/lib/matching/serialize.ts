import { ProposalMeta } from "./types";

export function encodeProposalMeta(meta: ProposalMeta): string {
  return JSON.stringify(meta);
}

export function decodeProposalMeta(str: string | null): ProposalMeta {
  if (!str) return {};
  try {
    return JSON.parse(str);
  } catch (e) {
    return {};
  }
}

export function encodeReasons(reasons: string[]): string {
  return JSON.stringify(reasons);
}

export function decodeReasons(str: string | null): string[] {
  if (!str) return [];
  try {
    const res = JSON.parse(str);
    if (Array.isArray(res)) return res;
    // Fallback: if stored as old JSON object {reasons:[]}
    if (res.reasons && Array.isArray(res.reasons)) return res.reasons;
    return [];
  } catch (e) {
    return [];
  }
}
