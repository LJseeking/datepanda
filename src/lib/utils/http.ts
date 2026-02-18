// 统一 API 响应格式
import { NextResponse } from "next/server";

export type ApiResponse<T = any> = {
  ok: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
};

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}

export function apiError(code: string, message: string, status = 400) {
  return NextResponse.json(
    { ok: false, error: { code, message } },
    { status }
  );
}
