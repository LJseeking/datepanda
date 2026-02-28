/**
 * requireUser — backward-compatible re-export from session.ts
 * All existing API routes that import `requireUser` continue to work unchanged.
 */
export { requireUser } from "@/lib/auth/session";
