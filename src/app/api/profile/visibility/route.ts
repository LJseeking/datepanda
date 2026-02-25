import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { prisma } from "@/lib/db/prisma";
import { apiSuccess, apiError } from "@/lib/utils/http";

export async function PATCH(req: NextRequest) {
    try {
        const { userId } = await requireUser(req);
        const { photoVisibility } = await req.json();

        if (!photoVisibility || !["MATCHED_ONLY", "PUBLIC", "HIDDEN"].includes(photoVisibility)) {
            return apiError("BAD_REQUEST", "Invalid visibility setting", 400);
        }

        const user = await prisma.user.update({
            where: { id: userId },
            data: { photoVisibility }
        });

        return apiSuccess({ photoVisibility: user.photoVisibility });
    } catch (error: any) {
        if (error.code) return apiError(error.code, error.message, error.status);
        return apiError("INTERNAL_ERROR", "Failed to update visibility", 500);
    }
}
