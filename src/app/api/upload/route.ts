import { put } from "@vercel/blob";
import { NextResponse, NextRequest } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { apiSuccess, apiError } from "@/lib/utils/http";

const COOKIE_NAME = "dp_session";

export async function POST(request: NextRequest): Promise<NextResponse> {
    const cookieStore = await cookies();
    const sessionStr = cookieStore.get(COOKIE_NAME)?.value;

    if (!sessionStr) {
        return apiError("UNAUTHORIZED", "Not logged in", 401);
    }

    let userId: string;
    try {
        const session = JSON.parse(sessionStr);
        userId = session.userId;
    } catch (err) {
        return apiError("UNAUTHORIZED", "Invalid session", 401);
    }

    const searchParams = request.nextUrl.searchParams;
    const filename = searchParams.get("filename") || `avatar_${Date.now()}`;

    // 1. Ensure file stream is valid
    if (!request.body) {
        return apiError("BAD_REQUEST", "No file body to upload", 400);
    }

    try {
        // 2. Upload to Vercel Blob
        const blob = await put(filename, request.body, {
            access: "public",
            // Restrict to images just in case
            contentType: request.headers.get("content-type") || "application/octet-stream",
        });

        // 3. Save to User DB
        await prisma.user.update({
            where: { id: userId },
            data: { avatarUrl: blob.url }
        });

        return apiSuccess({
            message: "Avatar uploaded successfully",
            url: blob.url
        });

    } catch (error) {
        console.error("[UploadError]", error);
        return apiError("INTERNAL_ERROR", "Failed to upload to blob", 500);
    }
}
