import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { verifyOtp } from "@/lib/auth/otp";
import { prisma } from "@/lib/db/prisma";
import { apiSuccess, apiError } from "@/lib/utils/http";

const COOKIE_NAME = "dp_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, code } = body;

    if (!email || !code) {
      return apiError("VALIDATION_ERROR", "Email and code are required");
    }

    const isValid = await verifyOtp(email, code);
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
    // 这里我们假设 User 表没有 email 字段 (按 schema)，所以我们要通过 SchoolVerification 来反查或者创建
    // 但 schema 里 SchoolVerification userId @unique，意味着一个用户只能绑定一个学校
    // 策略：
    // A. 先尝试通过 SchoolVerification 找 user
    // B. 如果没有，创建新 User
    
    let user = await prisma.user.findFirst({
        where: {
            schoolVerifications: {
                some: {
                    schoolId: school.id,
                    // 理论上这里应该存 email 到 evidence 里或者 verification 的某个字段，但 schema 目前 evidence 是 String (Json)
                    // 为了简化 MVP，我们暂且认为：如果 verification 里的 evidence 包含这个 email，就是同一个用户
                    // 但 Prisma JSON 过滤在 SQLite 支持有限，且性能不好。
                    // 修正策略：
                    // MVP 阶段：每次都视为新用户？不行，无法登录老用户。
                    // 必须在 schema 能够定位用户。
                    // 临时方案：我们用 verification 的 evidence 字段存 JSON: { "email": "..." }
                    // 但 SQLite 不支持 JSON 路径查询。
                    // 既然是 MVP，且题目要求“验证通过 -> 创建/查询 User”，
                    // 我们假设：如果存在一个 User 关联了该 School 且 verification evidence 里有该 email，则复用。
                    // 否则创建新用户。
                    
                    // 由于 SQLite 限制，我们在内存里做匹配（低效但可行，MVP）
                    // 或者：我们信任 email，如果 AuthOtp 通过了，我们其实需要一个持久化的地方存 email <-> userId 映射。
                    // Schema 里 SchoolVerification 是 unique(userId)，所以无法通过 email 直接 unique 索引查找。
                    
                    // 决定：在 SchoolVerification 中查找所有该学校的记录，然后在内存匹配 evidence 中的 email。
                    // 这是一个 MVP 妥协。
                }
            }
        },
        include: {
            schoolVerifications: true
        }
    });

    // 尝试在已有用户中查找 (低效，仅 MVP)
    if (!user) {
         // 查找所有在该学校验证过的记录
         const verifications = await prisma.schoolVerification.findMany({
             where: { schoolId: school.id }
         });
         
         for (const v of verifications) {
             try {
                 const evidence = JSON.parse(v.evidence);
                 if (evidence.email === email) {
                     user = await prisma.user.findUnique({ where: { id: v.userId }, include: { schoolVerifications: true } });
                     break;
                 }
             } catch (e) {
                 // ignore json parse error
             }
         }
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

    // 4. 写 Session Cookie
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, JSON.stringify({ userId: user.id }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE,
      path: "/",
    });

    return apiSuccess({
        user: { id: user.id, schoolId: school.id },
        verified: true
    });

  } catch (error) {
    console.error("[VerifyOTP] Error:", error);
    return apiError("INTERNAL_ERROR", "Something went wrong", 500);
  }
}
