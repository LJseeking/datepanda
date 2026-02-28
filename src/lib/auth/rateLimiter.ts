/**
 * Lightweight in-memory IP rate limiter.
 *
 * Works per serverless instance (each cold-start resets counts).
 * For internal beta with ~100-300 users this provides effective
 * protection against casual abuse without requiring external dependencies
 * like Redis. Upgrade to Upstash when scaling beyond 1000 DAU.
 */

interface Window {
    count: number;
    resetAt: number;
}

const store = new Map<string, Window>();

// Cleanup stale entries every 5 minutes to prevent memory leak
let lastCleanup = Date.now();
function maybeClean() {
    if (Date.now() - lastCleanup < 5 * 60_000) return;
    const now = Date.now();
    for (const [key, w] of store) {
        if (now > w.resetAt) store.delete(key);
    }
    lastCleanup = now;
}

/**
 * Check whether the given key (usually `ip:action`) is within the rate limit.
 * @param key     Identifying key, e.g. "1.2.3.4:otp_request"
 * @param limit   Max requests per window
 * @param windowMs Window size in milliseconds (default 60 s)
 * @returns true = allowed, false = rate-limited
 */
export function checkRateLimit(key: string, limit: number, windowMs = 60_000): boolean {
    maybeClean();
    const now = Date.now();
    const win = store.get(key);

    if (!win || now > win.resetAt) {
        store.set(key, { count: 1, resetAt: now + windowMs });
        return true;
    }

    if (win.count >= limit) return false;
    win.count++;
    return true;
}

/**
 * Extract the best-effort client IP from a Next.js request.
 * On Vercel, x-forwarded-for contains the real client IP.
 */
export function getClientIp(req: Request): string {
    const xff = (req.headers as any).get?.("x-forwarded-for")
        ?? (req as any).headers?.["x-forwarded-for"];
    if (xff) return String(xff).split(",")[0].trim();
    return "unknown";
}
