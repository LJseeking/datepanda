import { NextRequest } from "next/server";

const CRON_SECRET = process.env.CRON_SECRET;

export function verifyCronAuth(req: NextRequest): boolean {
  if (!CRON_SECRET) {
    // If not set, deny all to be safe
    return false;
  }

  const authHeader = req.headers.get("authorization");
  return authHeader === `Bearer ${CRON_SECRET}`;
}
