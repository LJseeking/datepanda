import { NextRequest } from "next/server";
import { requestOtp } from "@/lib/auth/otp";
import { sendOtpEmail } from "@/lib/messaging/emailSender";
import { apiSuccess, apiError } from "@/lib/utils/http";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email || typeof email !== "string") {
      return apiError("VALIDATION_ERROR", "Email is required");
    }

    const result = await requestOtp(email);

    if (!result.sent) {
      if (result.cooldown) {
        return apiError("RATE_LIMITED", `Please wait ${result.cooldown}s`, 429);
      }
      return apiError("INVALID_REQUEST", result.error || "Failed to request OTP");
    }

    // 发送邮件 (如果 requestOtp 返回了 code，说明生成成功)
    if (result.code) {
      await sendOtpEmail(email, result.code);
    }

    return apiSuccess({ message: "OTP sent" });
  } catch (error) {
    console.error("[RequestOTP] Error:", error);
    return apiError("INTERNAL_ERROR", "Something went wrong", 500);
  }
}
