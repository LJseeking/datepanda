import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { apiSuccess, apiError } from "@/lib/utils/http";

const ADMIN_TOKEN = process.env.MATCH_ADMIN_TOKEN || "dev-admin-token";

function checkAuth(req: NextRequest) {
    const token = req.headers.get("x-admin-token") || req.cookies.get("admin_token")?.value;
    return token === ADMIN_TOKEN;
}

// POST /api/admin/schools — create a school
export async function POST(req: NextRequest) {
    if (!checkAuth(req)) return apiError("UNAUTHORIZED", "Forbidden", 401);

    const body = await req.json();
    const { name, cityCode } = body;

    if (!name) return apiError("VALIDATION_ERROR", "name is required");

    const school = await prisma.school.create({
        data: { name, cityCode: cityCode || "hz", isEnabled: true },
    });

    return apiSuccess(school);
}

// PATCH /api/admin/schools — toggle school isEnabled
export async function PATCH(req: NextRequest) {
    if (!checkAuth(req)) return apiError("UNAUTHORIZED", "Forbidden", 401);

    const body = await req.json();
    const { id, isEnabled } = body;

    if (!id) return apiError("VALIDATION_ERROR", "id is required");

    const updated = await prisma.school.update({
        where: { id },
        data: { ...(isEnabled !== undefined && { isEnabled }) },
    });

    return apiSuccess(updated);
}
