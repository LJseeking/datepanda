import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/utils/http";
import { cookies } from "next/headers";

const ADMIN_TOKEN = process.env.MATCH_ADMIN_TOKEN || "dev-admin-token";

export async function POST(req: NextRequest) {
    const body = await req.json();
    const { token } = body;

    if (token !== ADMIN_TOKEN) {
        return apiError("UNAUTHORIZED", "Invalid token", 401);
    }

    const cookieStore = await cookies();
    cookieStore.set("admin_token", ADMIN_TOKEN, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: "/",
    });

    return apiSuccess({ ok: true });
}

export async function DELETE() {
    const cookieStore = await cookies();
    cookieStore.delete("admin_token");
    return apiSuccess({ ok: true });
}
