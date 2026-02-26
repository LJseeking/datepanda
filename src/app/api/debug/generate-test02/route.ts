import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
    try {
        const user = await prisma.user.create({ data: { status: "ACTIVE" } });

        await prisma.schoolVerification.create({
            data: {
                userId: user.id,
                schoolId: "test-school-bypass",
                status: "VERIFIED",
                method: "EMAIL",
                evidence: "test02@datepanda.fun"
            }
        });

        const versionId = "v1.0.0";
        const res = await prisma.response.create({
            data: { userId: user.id, questionnaireVersionId: versionId, status: "SUBMITTED", clientMeta: "{}" }
        });

        await prisma.userQuestionnaireState.create({
            data: { userId: user.id, questionnaireVersionId: versionId, submittedResponseId: res.id, activeResponseId: res.id }
        });

        return NextResponse.json({ ok: true, message: "test02 created", userId: user.id });
    } catch (e: any) {
        return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
    }
}
