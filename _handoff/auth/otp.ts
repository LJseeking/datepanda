import crypto from "crypto";
import { prisma } from "@/lib/db/prisma";
import { getSchoolEmailDomains } from "@/lib/config/schoolEmailDomains";

const OTP_SECRET = process.env.OTP_SECRET || "default-secret-change-me";
const OTP_EXPIRES_MINUTES = 10;
const OTP_COOLDOWN_SECONDS = 60;
const MAX_ATTEMPTS = 5;

// 生成 6 位随机数字
function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// 计算 Hash
function hashCode(email: string, code: string): string {
  return crypto
    .createHmac("sha256", OTP_SECRET)
    .update(`${email}:${code}`)
    .digest("hex");
}

// 校验邮箱格式与白名单
export function validateSchoolEmail(email: string): {
  valid: boolean;
  error?: string;
} {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: "Invalid email format" };
  }

  const domain = email.split("@")[1].toLowerCase();
  const allowedDomains = getSchoolEmailDomains();
  
  // 简单后缀匹配
  const isAllowed = allowedDomains.some(d => domain === d || domain.endsWith(`.${d}`));
  
  if (!isAllowed) {
    return { valid: false, error: "Email domain not allowed" };
  }

  return { valid: true };
}

// 请求 OTP
export async function requestOtp(email: string): Promise<{
  sent: boolean;
  code?: string; // 仅用于调用发送器，不直接返回给 API
  error?: string;
  cooldown?: number;
}> {
  // 1. 校验邮箱
  const validation = validateSchoolEmail(email);
  if (!validation.valid) {
    return { sent: false, error: validation.error };
  }

  // 2. 检查限流 (查找最近一条记录)
  const lastOtp = await prisma.authOtp.findFirst({
    where: { email },
    orderBy: { createdAt: "desc" },
  });

  if (lastOtp) {
    const diffSeconds = (Date.now() - lastOtp.lastSentAt.getTime()) / 1000;
    if (diffSeconds < OTP_COOLDOWN_SECONDS) {
      return {
        sent: false,
        error: "Rate limit exceeded",
        cooldown: Math.ceil(OTP_COOLDOWN_SECONDS - diffSeconds),
      };
    }
  }

  // 3. 生成新 OTP
  const code = generateCode();
  const codeHash = hashCode(email, code);
  const expiresAt = new Date(Date.now() + OTP_EXPIRES_MINUTES * 60 * 1000);

  // 4. 写入 DB
  await prisma.authOtp.create({
    data: {
      email,
      codeHash,
      expiresAt,
      lastSentAt: new Date(),
    },
  });

  return { sent: true, code };
}


// 验证 OTP
export async function verifyOtp(email: string, code: string): Promise<boolean> {
  const codeHash = hashCode(email, code);

  // 查找最近的有效 OTP
  const otp = await prisma.authOtp.findFirst({
    where: {
      email,
      codeHash,
      expiresAt: { gt: new Date() }, // 未过期
    },
    orderBy: { createdAt: "desc" },
  });

  if (!otp) {
    // 尝试查找是否存在记录但 hash 不对（增加尝试次数）
    // 为了安全，这里可以做得更细，比如查找最近一条未过期的记录增加 attempts
    // MVP 简化：只查完全匹配
    return false;
  }

  if (otp.attempts >= MAX_ATTEMPTS) {
    return false;
  }

  // 验证成功，删除或标记失效 (MVP: 直接删除防止重放)
  await prisma.authOtp.delete({ where: { id: otp.id } });

  return true;
}
