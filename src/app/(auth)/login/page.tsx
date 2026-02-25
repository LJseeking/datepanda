"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Sparkles, Mail, ShieldCheck } from "lucide-react";

type SchoolData = {
  id: string;
  name: string;
  domains: string[];
};

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"SCHOOL" | "OTP">("SCHOOL");
  const [schools, setSchools] = useState<SchoolData[]>([]);
  const [loadingSchools, setLoadingSchools] = useState(true);

  // Selection state
  const [selectedSchoolId, setSelectedSchoolId] = useState("");
  const [selectedDomain, setSelectedDomain] = useState("");
  const [emailPrefix, setEmailPrefix] = useState("");
  const [code, setCode] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedSchool = useMemo(
    () => schools.find((s) => s.id === selectedSchoolId),
    [schools, selectedSchoolId]
  );

  const computedEmail = `${emailPrefix}@${selectedDomain}`;

  useEffect(() => {
    fetch("/api/schools")
      .then((res) => res.json())
      .then((json) => {
        if (json.ok && json.data.schools) {
          setSchools(json.data.schools);
        }
      })
      .catch((e) => console.error("Failed to load schools", e))
      .finally(() => setLoadingSchools(false));
  }, []);

  // Update domain automatically if school changes
  useEffect(() => {
    if (selectedSchool && selectedSchool.domains.length > 0) {
      if (!selectedDomain || !selectedSchool.domains.includes(selectedDomain)) {
        setSelectedDomain(selectedSchool.domains[0]);
      }
    } else {
      setSelectedDomain("");
    }
  }, [selectedSchool, selectedDomain]);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchoolId || !emailPrefix || !selectedDomain) {
      setError("请完整填写校园认证信息");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: computedEmail }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || "请求验证码失败");
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
    if (!code || code.length < 6) {
      setError("请输入完整的 6 位验证码");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: computedEmail, code }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || "验证失败");
      }

      router.push("/");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-950 relative overflow-hidden">
      {/* Decorative Orbs */}
      <div className="absolute top-20 right-10 w-64 h-64 bg-emerald-200/40 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-20 left-10 w-64 h-64 bg-rose-200/40 rounded-full blur-3xl -z-10" />

      <div className="w-full max-w-md animate-in slide-in-from-bottom-4 fade-in duration-500">
        <div className="text-center mb-8 space-y-4">
          <div className="mx-auto w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-emerald-100 flex items-center justify-center text-3xl">
            🐼
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">DatePanda</h1>
          <p className="text-slate-500 font-medium">真实的校园社交，从验证信箱开始</p>
        </div>

        <Card className="border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none rounded-3xl overflow-hidden bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm">
          <CardHeader className="pb-4 pt-6 text-center border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/50">
            <CardTitle className="text-xl">{step === "SCHOOL" ? "校园身份认证" : "安全口令校验"}</CardTitle>
            <CardDescription className="text-sm">
              {step === "SCHOOL" ? "仅对杭州指定高校试点开放" : `验证码已发送至 ${computedEmail}`}
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            {error && (
              <div className="rounded-xl bg-red-50 dark:bg-red-900/20 p-4 mb-4 text-sm text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30 flex items-center gap-2 font-medium">
                <span>⚠️ {error}</span>
              </div>
            )}

            {step === "SCHOOL" ? (
              <form onSubmit={handleRequestOtp} className="space-y-5">
                <div className="space-y-2">
                  <Label>学籍所在高校</Label>
                  {loadingSchools ? (
                    <div className="h-10 border rounded-lg flex items-center px-3 bg-slate-50 text-slate-400">
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> 载入学校列表...
                    </div>
                  ) : (
                    <Select onValueChange={setSelectedSchoolId} value={selectedSchoolId}>
                      <SelectTrigger className="rounded-xl bg-slate-50/50 border-slate-200 focus:ring-emerald-500">
                        <SelectValue placeholder="选择你的学校" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-200">
                        {schools.map((school) => (
                          <SelectItem key={school.id} value={school.id} className="rounded-lg">
                            {school.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {selectedSchool && (
                  <div className="space-y-2 animate-in fade-in zoom-in-95 duration-200">
                    <Label>学生邮箱</Label>
                    <div className="flex gap-2">
                      <Input
                        required
                        placeholder="学号 / 姓名拼音"
                        className="rounded-xl bg-slate-50/50 border-slate-200 focus-visible:ring-emerald-500"
                        value={emailPrefix}
                        onChange={(e) => setEmailPrefix(e.target.value.toLowerCase().replace(/\s/g, ''))}
                      />
                      <div className="flex-shrink-0 w-32">
                        {selectedSchool.domains.length === 1 ? (
                          <div className="h-10 px-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center text-sm text-slate-500 font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                            @{selectedSchool.domains[0]}
                          </div>
                        ) : (
                          <Select onValueChange={setSelectedDomain} value={selectedDomain}>
                            <SelectTrigger className="rounded-xl bg-slate-50/50 border-slate-200">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              {selectedSchool.domains.map((d) => (
                                <SelectItem key={d} value={d}>
                                  @{d}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading || !selectedSchoolId || !emailPrefix}
                  className="w-full rounded-2xl h-12 mt-4 bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:shadow-none font-bold text-base transition-all active:scale-[0.98]"
                >
                  {loading ? (
                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> 通道连接中...</>
                  ) : (
                    <><Mail className="mr-2 h-5 w-5" /> 接收安全口令</>
                  )}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <div className="space-y-2">
                  <Label>6位安全口令</Label>
                  <Input
                    type="number"
                    required
                    maxLength={6}
                    placeholder="请输入邮件中的 6 位数字"
                    className="rounded-xl h-12 text-center text-xl tracking-[0.5em] font-mono bg-slate-50/50 border-slate-200 focus-visible:ring-emerald-500"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                  />
                </div>

                <div className="space-y-3 pt-2">
                  <Button
                    type="submit"
                    disabled={loading || code.length < 6}
                    className="w-full rounded-2xl h-12 bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 disabled:bg-slate-200 font-bold text-base transition-all active:scale-[0.98]"
                  >
                    {loading ? (
                      <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> 核验身份中...</>
                    ) : (
                      <><ShieldCheck className="mr-2 h-5 w-5" /> 完成宇宙接入</>
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setStep("SCHOOL")}
                    className="w-full rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  >
                    返回修改资料
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
