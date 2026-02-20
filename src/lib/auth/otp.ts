import crypto from "crypto";
import { prisma } from "@/lib/db/prisma";


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

// 校验邮箱格式是否合法（基础格式，不做域名检查）
export function validateEmailFormat(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// DB 驱动的学校邮箱验证（异步）
export async function isSchoolEmail(email: string): Promise<{
  ok: boolean;
  schoolName?: string;
  error?: string;
}> {
  if (!validateEmailFormat(email)) {
    return { ok: false, error: "Invalid email format" };
  }

  const domain = email.split("@")[1].toLowerCase();

  const record = await prisma.allowedEmailDomain.findFirst({
    where: {
      domain,
      isEnabled: true,
      school: { isEnabled: true },
    },
    select: {
      school: { select: { name: true } },
    },
  });

  if (!record) {
    return { ok: false, error: "暂仅支持杭州首批试点学校邮箱" };
  }

  return { ok: true, schoolName: record.school.name };
}

/**
 * @deprecated Use isSchoolEmail (async, DB-driven) instead.
 * Kept for non-async contexts only.
 */
export function validateSchoolEmail(email: string): {
  valid: boolean;
  error?: string;
} {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: "Invalid email format" };
  }
  // Fallback: allow all — DB check is enforced at route level
  return { valid: true };
}

// 请求 OTP（调用前需先通过 isSchoolEmail 做域名检查）
export async function requestOtp(email: string): Promise<{
  sent: boolean;
  code?: string; // 仅用于调用发送器，不直接返回给 API
  error?: string;
  cooldown?: number;
}> {
  // 1. 基础格式校验
  if (!validateEmailFormat(email)) {
    return { sent: false, error: "Invalid email format" };
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
