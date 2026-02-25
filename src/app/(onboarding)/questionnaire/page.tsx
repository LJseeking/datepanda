"use client";

import { useState, useEffect, useMemo } from "react";
import { QUESTIONS, Question } from "@/lib/questionnaire/questions";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ArrowRight, Save, Sparkles, CheckCircle2, Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

const QUESTIONS_PER_PAGE = 5;

export default function QuestionnairePage() {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [locked, setLocked] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [showKikoTransition, setShowKikoTransition] = useState(false);

  const totalPages = Math.ceil(QUESTIONS.length / QUESTIONS_PER_PAGE);
  const progressPercent = ((currentPage + 1) / totalPages) * 100;

  const currentQuestions = useMemo(() => {
    const start = currentPage * QUESTIONS_PER_PAGE;
    return QUESTIONS.slice(start, start + QUESTIONS_PER_PAGE);
  }, [currentPage]);

  useEffect(() => {
    fetch("/api/questionnaire/state")
      .then((res) => {
        if (res.status === 401) {
          router.push("/login");
          throw new Error("Login required");
        }
        return res.json();
      })
      .then((json) => {
        if (json.ok) {
          if (json.data.locked) {
            setLocked(true);
          }
          if (json.data.answers) {
            setAnswers(json.data.answers);

            // Calculate highest page based on answered required questions
            // Find the first required question that hasn't been answered
            const firstUnansweredIdx = QUESTIONS.findIndex((q) => {
              if (!q.required) return false;
              const val = json.data.answers[q.key];
              if (val === undefined || val === null || val === "") return true;
              if (Array.isArray(val) && val.length === 0) return true;
              return false;
            });

            if (firstUnansweredIdx !== -1) {
              setCurrentPage(Math.floor(firstUnansweredIdx / QUESTIONS_PER_PAGE));
            } else {
              // All required items answered, default to last page to allow review
              setCurrentPage(totalPages - 1);
            }
          }
        }
      })
      .catch((e) => console.error(e))
      .finally(() => setLoadingInitial(false));
  }, [router, totalPages]);

  const handleChange = (key: string, val: any) => {
    if (locked) return;
    setAnswers((prev) => ({ ...prev, [key]: val }));
  };

  const isNextDisabled = useMemo(() => {
    // Check if all required questions on current page are answered
    for (const q of currentQuestions) {
      if (q.required) {
        const val = answers[q.key];
        if (val === undefined || val === null || val === "") return true;
        if (Array.isArray(val) && val.length === 0) return true;
      }
    }
    return false;
  }, [answers, currentQuestions]);

  const handleSave = async (silent = false) => {
    setSaving(true);
    setError("");
    try {
      const payload = Object.entries(answers).map(([k, v]) => {
        const q = QUESTIONS.find((q) => q.key === k);
        if (q?.type === "multi") {
          return { questionKey: k, values: v };
        }
        return { questionKey: k, value: String(v) };
      });

      const res = await fetch("/api/questionnaire/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: payload }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message || "Save failed");

      if (!silent) console.log("Draft saved");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage((p) => p + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
      handleSave(true); // Auto-save on next page
    } else {
      handleFinalSubmit();
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage((p) => p - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleFinalSubmit = async () => {
    setSubmitting(true);
    setError("");
    try {
      await handleSave(true);
      setShowKikoTransition(true);
      setTimeout(() => {
        router.push("/questionnaire/kiko");
      }, 2000);
    } catch (e: any) {
      setError(e.message);
      setSubmitting(false);
    }
  };

  if (loadingInitial) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
        <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mb-4" />
        <p className="text-slate-500 dark:text-slate-400 animate-pulse">正在同步数据边界...</p>
      </div>
    );
  }

  if (locked) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 dark:bg-emerald-900/30">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">基础信息已记录</h1>
          <p className="text-slate-500 dark:text-slate-400">
            但是好像你还没有完成 Kiko 的量子纠缠测试哦？完成它，才能开启真正的宇宙探索。
          </p>
          <Button
            size="lg"
            className="w-full bg-emerald-500 hover:bg-emerald-600 rounded-full text-white shadow-lg shadow-emerald-500/20"
            onClick={() => router.push("/questionnaire/kiko")}
          >
            继续 Kiko 测试 <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  if (showKikoTransition) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-emerald-500 text-white p-6 animate-in fade-in duration-700 zoom-in-95">
        <Sparkles className="w-16 h-16 mb-8 animate-pulse text-emerald-100" />
        <h2 className="text-3xl font-extrabold mb-4 text-center">基础档案已保存 ✨</h2>
        <p className="text-emerald-50 text-center max-w-sm mb-8 text-lg">
          即将进入 Kiko 量子纠缠测试，带你寻找灵魂契合的 Panda...
        </p>
        <div className="w-48 h-1 bg-emerald-400 rounded-full overflow-hidden">
          <div className="h-full bg-white animate-[progress_2s_ease-in-out_forwards]" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-slate-50 dark:bg-slate-950 pb-24">

      {/* Top Navigation & Progress */}
      <div className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-4">
        <div className="max-w-2xl mx-auto space-y-3">
          <div className="flex items-center justify-between text-sm font-medium text-slate-500">
            <span>基础档案收集</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
              {currentPage + 1} / {totalPages}
            </span>
          </div>
          <Progress value={progressPercent} className="h-2 bg-slate-100 dark:bg-slate-800" />
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 sm:p-6 mt-4 space-y-8 animate-in slide-in-from-bottom-4 duration-500 fade-in">

        {/* Header (Only on page 1) */}
        {currentPage === 0 && (
          <div className="space-y-2 mb-8">
            <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white">
              建立你的星球档案 🌟
            </h1>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
              稍微花几分钟，告诉 DatePanda 你是谁。我们会小心保护你的每一份心意与边界。
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm border border-red-100 font-medium">
            {error}
          </div>
        )}

        {/* Questions */}
        <div className="space-y-6">
          {currentQuestions.map((q, idx) => (
            <Card key={q.key} className="border-slate-200 shadow-sm dark:border-slate-800 dark:bg-slate-900/50 overflow-hidden">
              <CardContent className="p-5 sm:p-6 space-y-4">
                <Label className="text-base font-semibold text-slate-800 dark:text-slate-200 leading-relaxed block">
                  {idx + 1 + currentPage * QUESTIONS_PER_PAGE}. {q.title}
                  {q.required && <span className="text-rose-500 ml-1 font-bold">*</span>}
                </Label>

                {/* Single Select */}
                {q.type === "single" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
                    {q.options?.map((opt) => {
                      const isSelected = answers[q.key] === opt.value;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => handleChange(q.key, opt.value)}
                          className={`
                            text-left px-4 py-3 rounded-xl border transition-all duration-200
                            ${isSelected
                              ? "bg-emerald-50 border-emerald-500 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-500 dark:text-emerald-300 ring-1 ring-emerald-500 shadow-sm"
                              : "bg-white border-slate-200 text-slate-600 hover:border-emerald-200 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600"
                            }
                          `}
                        >
                          <span className="font-medium text-sm">{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Multi Select */}
                {q.type === "multi" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
                    {q.options?.map((opt) => {
                      const current = answers[q.key] || [];
                      const isSelected = current.includes(opt.value);
                      return (
                        <button
                          key={opt.value}
                          onClick={() => {
                            const next = isSelected
                              ? current.filter((v: string) => v !== opt.value)
                              : [...current, opt.value];
                            handleChange(q.key, next);
                          }}
                          className={`
                            text-left px-4 py-3 rounded-xl border transition-all duration-200 flex items-center justify-between
                            ${isSelected
                              ? "bg-emerald-50 border-emerald-500 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-500 dark:text-emerald-300 ring-1 ring-emerald-500 shadow-sm"
                              : "bg-white border-slate-200 text-slate-600 hover:border-emerald-200 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600"
                            }
                          `}
                        >
                          <span className="font-medium text-sm">{opt.label}</span>
                          {/* Custom Checkbox visual */}
                          <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${isSelected ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900'}`}>
                            {isSelected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Scale / Range */}
                {q.type === "scale" && (
                  <div className="mt-6 space-y-6">
                    <div className="flex justify-between text-xs font-semibold text-slate-400">
                      <span>{q.scale?.labels?.[0]}</span>
                      <span>{q.scale?.labels?.[1]}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min={q.scale?.min}
                        max={q.scale?.max}
                        value={answers[q.key] || q.scale?.min}
                        onChange={(e) => handleChange(q.key, Number(e.target.value))}
                        className="w-full accent-emerald-500 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="w-12 h-10 flex items-center justify-center bg-emerald-50 text-emerald-700 font-bold rounded-xl shrink-0 dark:bg-emerald-900/50 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-800">
                        {answers[q.key] || q.scale?.min}
                      </div>
                    </div>
                  </div>
                )}

                {/* Text Area */}
                {q.type === "text" && (
                  <div className="mt-4">
                    <Textarea
                      placeholder="写点真实的感想吧..."
                      className="min-h-[120px] resize-none bg-slate-50 border-slate-200 focus-visible:ring-emerald-500 dark:bg-slate-950 dark:border-slate-800 rounded-xl"
                      value={answers[q.key] || ""}
                      onChange={(e) => handleChange(q.key, e.target.value)}
                      maxLength={200}
                    />
                    <div className="text-right text-xs text-slate-400 mt-2 font-medium">
                      {(answers[q.key] || "").length} / 200
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

      </div>

      {/* Bottom Sticky Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur border-t border-slate-200 dark:border-slate-800 pb-safe z-50">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <Button
            variant="outline"
            size="lg"
            onClick={handlePrevPage}
            disabled={currentPage === 0 || submitting}
            className="rounded-full w-14 h-14 p-0 shrink-0 border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800 dark:text-slate-300"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>

          <Button
            variant="ghost"
            size="lg"
            onClick={() => handleSave(false)}
            disabled={saving || submitting}
            className="rounded-full flex-1 sm:flex-none text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            {saving ? "量子存储中..." : "保存草稿"}
          </Button>

          <Button
            size="lg"
            onClick={handleNextPage}
            disabled={isNextDisabled || submitting}
            className="rounded-full flex-1 bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-slate-800 dark:disabled:text-slate-500"
          >
            {submitting ? "加密传输中..." : (
              currentPage === totalPages - 1 ? "完成基础档案" : "下一页"
            )}
            {!submitting && <ArrowRight className="w-5 h-5 ml-2" />}
          </Button>
        </div>
      </div>

    </div>
  );
}
