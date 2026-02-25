import { NextRequest } from "next/server";
import { requestOtp } from "@/lib/auth/otp";
import { isSchoolEmail } from "@/lib/auth/otp";
import { sendOtpEmail } from "@/lib/messaging/emailSender";
import { apiSuccess, apiError } from "@/lib/utils/http";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email || typeof email !== "string") {
      return apiError("VALIDATION_ERROR", "Email is required");
    }

    // 1. DB 域名白名单校验（实时，管理员可动态开关）
    const schoolCheck = await isSchoolEmail(email);
    if (!schoolCheck.ok) {
      return apiError("SCHOOL_NOT_ALLOWED", schoolCheck.error || "暂仅支持杭州首批试点学校邮箱", 400);
    }

    // 内测账号后门 (直接返回成功，不发邮件)
    if (email.endsWith("@datepanda.fun") && email.startsWith("test")) {
      return apiSuccess({ message: "Test account bypass: use OTP 000000" });
    }

    // 2. 生成并发送 OTP
    const result = await requestOtp(email);

    if (!result.sent) {
      if (result.cooldown) {
        return apiError("RATE_LIMITED", `Please wait ${result.cooldown}s`, 429);
      }
      return apiError("INVALID_REQUEST", result.error || "Failed to request OTP");
    }

    if (result.code) {
      await sendOtpEmail(email, result.code);
    }

    return apiSuccess({ message: "OTP sent" });
  } catch (error) {
    console.error("[RequestOTP] Error:", error);
    return apiError("INTERNAL_ERROR", "Something went wrong", 500);
  }
}

