import { NextRequest } from "next/server";
import { verifyOtp } from "@/lib/auth/otp";
import { prisma } from "@/lib/db/prisma";
import { apiSuccess, apiError } from "@/lib/utils/http";
import { createUserSession } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { email, code } = body;

        if (!email || !code) {
            return apiError("VALIDATION_ERROR", "Email and code are required");
        }

        // 内测账号后门验证
        const isTest = email.endsWith("@datepanda.fun") && email.startsWith("test");
        let isValid = false;

        if (isTest && code === "000000") {
            isValid = true;
        } else {
            isValid = await verifyOtp(email, code);
        }

        if (!isValid) {
            return apiError("INVALID_OTP", "Invalid or expired OTP", 401);
        }

        // 验证成功，处理用户逻辑
        // 1. 获取或创建 School
        const domain = email.split("@")[1].toLowerCase();
        // 简单映射：直接用 domain 当名字，后续可完善 School 库
        let school = await prisma.school.findFirst({ where: { cityCode: "HZ", name: domain } });

        if (!school) {
            // MVP: 如果不存在，临时创建一个 (cityCode=HZ)
            // 注意：生产环境最好预置好 School 表
            school = await prisma.school.create({
                data: {
                    cityCode: "HZ",
                    name: domain,
                }
            });
        }

        // 2. 创建或更新 User
        // 我们采用 Postgres 原生 JSONB 查询来解析 `evidence` 字段中的 email 从而反查用户
        const verifications = await prisma.$queryRaw<Array<{ userId: string }>>`
      SELECT "userId" FROM "SchoolVerification"
      WHERE "schoolId" = ${school.id}
      AND ("evidence"::jsonb ->> 'email') = ${email}
      LIMIT 1;
    `;

        let user: any = null;
        if (verifications.length > 0) {
            user = await prisma.user.findUnique({
                where: { id: verifications[0].userId },
                include: { schoolVerifications: true }
            });
        }

        // 如果还是没找到，创建新用户
        if (!user) {
            user = await prisma.user.create({
                data: {
                    status: "ACTIVE",
                    cityCode: "HZ",
                    schoolId: school.id, // 冗余字段同步
                },
                include: {
                    schoolVerifications: true
                }
            });
        }

        // 3. Upsert SchoolVerification
        // 检查该用户是否已有该学校的验证
        const existingVer = user.schoolVerifications.find((v: any) => v.schoolId === school!.id);

        if (existingVer) {
            await prisma.schoolVerification.update({
                where: { id: existingVer.id },
                data: {
                    status: "VERIFIED",
                    verifiedAt: new Date(),
                    method: "EMAIL_OTP",
                    evidence: JSON.stringify({ email }), // 更新 evidence 确保一致
                }
            });
        } else {
            // 如果用户已有其他学校验证 (userId unique)，则必须先废弃旧的？
            // Schema: userId @unique in SchoolVerification. 
            // 所以如果 user.schoolVerifications 长度 > 0 且不是当前 school，则会冲突。
            // MVP 策略：如果已存在其他学校验证，先删除（或标记失效），再创建新的。
            if (user.schoolVerifications.length > 0) {
                await prisma.schoolVerification.deleteMany({
                    where: { userId: user.id }
                });
            }

            await prisma.schoolVerification.create({
                data: {
                    userId: user.id,
                    schoolId: school.id,
                    status: "VERIFIED",
                    method: "EMAIL_OTP",
                    evidence: JSON.stringify({ email }),
                    verifiedAt: new Date(),
                }
            });
        }

        // 确保 User.schoolId 同步
        if (user.schoolId !== school.id) {
            await prisma.user.update({
                where: { id: user.id },
                data: { schoolId: school.id }
            });
        }

        // 4. 写 Session Cookie（iron-session 加密签名）
        await createUserSession(user.id);

        return apiSuccess({
            user: { id: user.id, schoolId: school.id },
            verified: true
        });

    } catch (error) {
        console.error("[VerifyOTP] Error:", error);
        return apiError("INTERNAL_ERROR", "Something went wrong", 500);
    }
}
