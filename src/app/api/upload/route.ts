import { put } from "@vercel/blob";
import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { apiSuccess, apiError } from "@/lib/utils/http";
import { requireUser } from "@/lib/auth/requireUser";

export async function POST(request: NextRequest): Promise<NextResponse> {
    let userId: string;
    try {
        const session = await requireUser(request);
        userId = session.userId;
    } catch {
        return apiError("UNAUTHORIZED", "Not logged in", 401);
    }

    const searchParams = request.nextUrl.searchParams;
    const filename = searchParams.get("filename") || `avatar_${Date.now()}`;

    if (!request.body) {
        return apiError("BAD_REQUEST", "No file body to upload", 400);
    }

    try {
        const blob = await put(filename, request.body, {
            access: "public",
            contentType: request.headers.get("content-type") || "application/octet-stream",
        });

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
