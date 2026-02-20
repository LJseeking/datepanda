import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { apiSuccess, apiError } from "@/lib/utils/http";

const ADMIN_TOKEN = process.env.MATCH_ADMIN_TOKEN || "dev-admin-token";

function checkAuth(req: NextRequest) {
    const token = req.headers.get("x-admin-token") || req.cookies.get("admin_token")?.value;
    return token === ADMIN_TOKEN;
}

// PATCH /api/admin/domains/[id] — toggle isEnabled, update emailType/note
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    if (!checkAuth(req)) return apiError("UNAUTHORIZED", "Forbidden", 401);

    const { id } = await params;
    const body = await req.json();
    const { isEnabled, emailType, note } = body;

    const updated = await prisma.allowedEmailDomain.update({
        where: { id },
        data: {
            ...(isEnabled !== undefined && { isEnabled }),
            ...(emailType !== undefined && { emailType }),
            ...(note !== undefined && { note }),
        },
    });

    return apiSuccess(updated);
}

// DELETE /api/admin/domains/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    if (!checkAuth(req)) return apiError("UNAUTHORIZED", "Forbidden", 401);

    const { id } = await params;
    await prisma.allowedEmailDomain.delete({ where: { id } });
    return apiSuccess({ deleted: true });
}
