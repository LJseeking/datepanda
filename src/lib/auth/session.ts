/**
 * Signed & encrypted session cookie using iron-session.
 * Replaces the unsigned JSON dp_session cookie.
 *
 * iron-session uses AES-256-CBC + HMAC-SHA256 under the hood
 * (via sealed-box / iron3 format), making the cookie tamper-proof
 * and opaque to the client.
 */

import { getIronSession, IronSession, SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";
import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/utils/http";

export interface SessionData {
    userId?: string;
}

// Minimum 32-char secret required by iron-session
const SESSION_PASSWORD = process.env.SESSION_SECRET || process.env.CONTACT_ENCRYPTION_KEY || "";

if (!SESSION_PASSWORD || SESSION_PASSWORD.length < 32) {
    // Will surface clearly in server logs at startup
    console.error(
        "[session] SESSION_SECRET must be set and >= 32 characters! " +
        "Use: openssl rand -hex 32"
    );
}

export const sessionOptions: SessionOptions = {
    password: SESSION_PASSWORD,
    cookieName: "dp_session",
    cookieOptions: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: "/",
    },
};

/** Get/create the session from Next.js server component context (uses `cookies()`). */
export async function getSession(): Promise<IronSession<SessionData>> {
    const cookieStore = await cookies();
    return getIronSession<SessionData>(cookieStore as any, sessionOptions);
}

/** Get session from an incoming NextRequest (for API routes). */
export async function getSessionFromRequest(
    req: NextRequest,
    res: NextResponse
): Promise<IronSession<SessionData>> {
    return getIronSession<SessionData>(req, res, sessionOptions);
}

/**
 * Drop-in replacement for the old requireUser().
 * Validates the signed session and returns { userId }.
 * Throws a 401 apiError if the session is missing or invalid.
 */
export async function requireUser(_req?: NextRequest): Promise<{ userId: string }> {
    const session = await getSession();
    if (!session.userId) {
        throw apiError("UNAUTHENTICATED", "Not logged in", 401);
    }
    return { userId: session.userId };
}

/**
 * Write a new userId into the session and save it.
 * Call after successful OTP verification.
 */
export async function createUserSession(userId: string): Promise<void> {
    const session = await getSession();
    session.userId = userId;
    await session.save();
}

/**
 * Destroy the current session (logout).
 */
export async function destroySession(): Promise<void> {
    const session = await getSession();
    session.destroy();
}
