import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { prisma } from "@/lib/db/prisma";
import { apiSuccess, apiError } from "@/lib/utils/http";
import { encryptWechat, decryptWechat } from "@/lib/crypto/contact";

// GET /api/profile/contact — get my current WeChat ID
export async function GET(req: NextRequest) {
    try {
        const { userId } = await requireUser(req);
        const contact = await prisma.userContact.findUnique({ where: { userId } });
        const wechatId = contact ? decryptWechat(contact.wechatIdEnc) : null;
        return apiSuccess({ wechatId });
    } catch (error: any) {
        if (error instanceof Response) return error;
        return apiError("INTERNAL_ERROR", "Failed to get contact", 500);
    }
}

// PUT /api/profile/contact — save/update my WeChat ID
export async function PUT(req: NextRequest) {
    try {
        const { userId } = await requireUser(req);
        const body = await req.json();
        const { wechatId } = body;

        if (!wechatId || typeof wechatId !== "string" || wechatId.trim().length < 2) {
            return apiError("VALIDATION_ERROR", "微信号格式不正确，至少需要 2 个字符", 400);
        }

        const cleaned = wechatId.trim();
        if (cleaned.length > 30) {
            return apiError("VALIDATION_ERROR", "微信号不能超过 30 个字符", 400);
        }

        const encrypted = encryptWechat(cleaned);

        await prisma.userContact.upsert({
            where: { userId },
            update: { wechatIdEnc: encrypted },
            create: { userId, wechatIdEnc: encrypted },
        });

        return apiSuccess({ message: "联系方式已保存" });
    } catch (error: any) {
        if (error instanceof Response) return error;
        console.error("[PUT /api/profile/contact]", error);
        return apiError("INTERNAL_ERROR", "Failed to save contact", 500);
    }
}
