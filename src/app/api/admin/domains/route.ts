import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { apiSuccess, apiError } from "@/lib/utils/http";

const ADMIN_TOKEN = process.env.MATCH_ADMIN_TOKEN || "dev-admin-token";

function checkAuth(req: NextRequest) {
    const token = req.headers.get("x-admin-token") || req.cookies.get("admin_token")?.value;
    return token === ADMIN_TOKEN;
}

// GET /api/admin/domains — list all schools with their domains
export async function GET(req: NextRequest) {
    if (!checkAuth(req)) return apiError("UNAUTHORIZED", "Forbidden", 401);

    const schools = await prisma.school.findMany({
        orderBy: { name: "asc" },
        include: {
            domains: {
                orderBy: { domain: "asc" },
            },
        },
    });

    return apiSuccess(schools);
}

// POST /api/admin/domains — add a domain to a school
export async function POST(req: NextRequest) {
    if (!checkAuth(req)) return apiError("UNAUTHORIZED", "Forbidden", 401);

    const body = await req.json();
    const { domain, schoolId, emailType, note } = body;

    if (!domain || !schoolId) {
        return apiError("VALIDATION_ERROR", "domain and schoolId are required");
    }

    const record = await prisma.allowedEmailDomain.create({
        data: {
            domain: domain.toLowerCase().trim(),
            schoolId,
            emailType: emailType || "student",
            isEnabled: true,
            note,
        },
    });

    return apiSuccess(record);
}
