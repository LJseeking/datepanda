"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"EMAIL" | "OTP">("EMAIL");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to send code");
      }

      setStep("OTP");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to verify code");
      }

      // 登录成功，跳转
      router.push("/");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 rounded-lg border p-6 shadow-sm">
        <div className="text-center">
          <h1 className="text-2xl font-bold">DatePanda</h1>
          <p className="text-sm text-gray-500">杭州大学生专属验证登录</p>
        </div>

        {error && (
          <div className="rounded bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {step === "EMAIL" ? (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium">
                学校邮箱
              </label>
              <input
                id="email"
                type="email"
                required
                placeholder="name@zju.edu.cn"
                className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-black"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <p className="mt-1 text-xs text-gray-400">
                支持 ZJU, HZNU, HDU, ZJUT 等杭州高校域名
              </p>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded bg-black py-2 text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {loading ? "发送中..." : "获取验证码"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="block text-sm font-medium">
                验证码已发送至 {email}
              </label>
              <input
                type="text"
                required
                placeholder="6位数字"
                className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-black"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />

            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded bg-black py-2 text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {loading ? "验证中..." : "登录"}
            </button>
            <button
              type="button"
              onClick={() => setStep("EMAIL")}
              className="w-full text-sm text-gray-500 hover:underline"
            >
              返回修改邮箱
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
