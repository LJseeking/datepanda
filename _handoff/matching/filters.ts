import { prisma } from "@/lib/db/prisma";
import { ProfileSnapshot } from "@/lib/profile/generate";

// 辅助：获取 single/text 答案 (Copied from scoring to avoid circular dep or move to shared util)
function getSingle(snap: ProfileSnapshot, key: string): string | undefined {
  const val = snap.answers[key];
  if (Array.isArray(val)) return undefined;
  return val as string;
}

function getMulti(snap: ProfileSnapshot, key: string): string[] {
  const val = snap.answers[key];
  if (Array.isArray(val)) return val;
  if (val) return [val as string];
  return [];
}

export async function buildCandidatePool(userId: string, myProfileSnap: ProfileSnapshot): Promise<string[]> {
  // 1. Hard Filters in DB (Status, Deleted, Not Self)
  // We can't easily filter by JSON content in SQLite/Prisma without raw query or fetching all.
  // Strategy: Fetch ALL active users with profiles, then filter in memory (MVP scale < 10k users is fine).
  // Optimization: Filter by city/school if possible.
  
  // Get all candidates
  // TODO: Add lastActive check if field exists
  const candidates = await prisma.user.findMany({
    where: {
      id: { not: userId },
      status: "ACTIVE",
      deletedAt: null,
      profiles: { some: {} } // Must have profile
    },
    select: {
      id: true,
      profiles: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { profileSnapshot: true }
      }
    }
  });

  // 2. Block Relationship
  // Fetch blocks involved with me
  const blocks = await prisma.block.findMany({
    where: {
      OR: [
        { blockerId: userId },
        { blockedUserId: userId }
      ]
    }
  });
  const blockedIds = new Set<string>();
  blocks.forEach(b => {
      blockedIds.add(b.blockerId === userId ? b.blockedUserId : b.blockerId);
  });

  // 3. In-Memory Filtering (Gender, Orientation)
  const myGender = getSingle(myProfileSnap, "identity_gender");
  const myOrientation = getSingle(myProfileSnap, "orientation");
  const myPref = getMulti(myProfileSnap, "match_gender_preference");

  const validIds: string[] = [];

  for (const cand of candidates) {
      if (blockedIds.has(cand.id)) continue;
      
      const p = cand.profiles[0];
      if (!p || !p.profileSnapshot) continue;

      let snap: ProfileSnapshot;
      try {
          snap = JSON.parse(p.profileSnapshot);
      } catch (e) {
          continue;
      }

      // Gender Match
      const theirGender = getSingle(snap, "identity_gender");
      const theirPref = getMulti(snap, "match_gender_preference");

      // I must like them
      if (myPref.length > 0 && !myPref.includes("no_limit")) {
          if (!theirGender || !myPref.includes(theirGender)) continue;
      }

      // They must like me
      if (theirPref.length > 0 && !theirPref.includes("no_limit")) {
          if (!myGender || !theirPref.includes(myGender)) continue;
      }

      validIds.push(cand.id);
  }

  return validIds;
}
