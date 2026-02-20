"use client";

import { useState, useEffect } from "react";
import { QUESTIONS, Question } from "@/lib/questionnaire/questions";
import { useRouter } from "next/navigation";

export default function QuestionnairePage() {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [locked, setLocked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Check lock state on mount
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
        if (json.ok && json.data.locked) {
          setLocked(true);
        }
      })
      .catch((e) => console.error(e));
  }, [router]);

  const handleChange = (key: string, val: any) => {
    if (locked) return;
    setAnswers((prev) => ({ ...prev, [key]: val }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      // Convert to API format
      const payload = Object.entries(answers).map(([k, v]) => {
        const q = QUESTIONS.find(q => q.key === k);
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
      alert("Saved draft!");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    setSubmitting(true);
    setError("");
    try {
      // 1. Save Base Info Draft
      await handleSave();

      // 2. Redirect to Kiko Questionnaire instead of submitting
      alert("基础信息已保存！接下来进入 Kiko 的量子纠缠测试 ✨");
      router.push("/questionnaire/kiko");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (locked) {
    return (
      <div className="p-8 text-center min-h-screen flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold">基础信息已填写</h1>
        <p className="mt-4 text-gray-500">但是好像你还没有完成 Kiko 测试哦？</p>
        <button
          onClick={() => router.push("/questionnaire/kiko")}
          className="mt-6 px-6 py-2 bg-black text-white rounded-full font-bold shadow-md hover:bg-gray-800"
        >
          继续 Kiko 测试
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold">DatePanda Questionnaire</h1>
      {error && <div className="bg-red-100 p-4 text-red-700 rounded">{error}</div>}

      {QUESTIONS.map((q) => (
        <div key={q.key} className="border p-4 rounded bg-white shadow-sm">
          <label className="block font-medium mb-2">
            {q.title} {q.required && <span className="text-red-500">*</span>}
          </label>

          {q.type === "single" && (
            <div className="space-y-2">
              {q.options?.map((opt) => (
                <label key={opt.value} className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name={q.key}
                    value={opt.value}
                    checked={answers[q.key] === opt.value}
                    onChange={(e) => handleChange(q.key, e.target.value)}
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          )}

          {q.type === "multi" && (
            <div className="space-y-2">
              {q.options?.map((opt) => (
                <label key={opt.value} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    value={opt.value}
                    checked={(answers[q.key] || []).includes(opt.value)}
                    onChange={(e) => {
                      const current = answers[q.key] || [];
                      const next = e.target.checked
                        ? [...current, opt.value]
                        : current.filter((v: string) => v !== opt.value);
                      handleChange(q.key, next);
                    }}
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          )}

          {q.type === "scale" && (
            <div className="flex items-center space-x-4">
              <span>{q.scale?.labels?.[0]}</span>
              <input
                type="range"
                min={q.scale?.min}
                max={q.scale?.max}
                value={answers[q.key] || q.scale?.min}
                onChange={(e) => handleChange(q.key, Number(e.target.value))}
                className="w-full"
              />
              <span>{q.scale?.labels?.[1]}</span>
              <span className="font-bold ml-2">{answers[q.key]}</span>
            </div>
          )}

          {q.type === "text" && (
            <textarea
              className="w-full border rounded p-2"
              value={answers[q.key] || ""}
              onChange={(e) => handleChange(q.key, e.target.value)}
              maxLength={200}
            />
          )}
        </div>
      ))}

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t flex justify-center space-x-4">
        <button
          onClick={handleSave}
          disabled={saving || submitting}
          className="px-6 py-2 border rounded hover:bg-gray-50 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Draft"}
        </button>
        <button
          onClick={handleNext}
          disabled={saving || submitting}
          className="px-6 py-2 bg-gradient-to-r from-indigo-500 to-rose-400 text-white rounded-full font-bold shadow-md hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? "正在保存..." : "下一步: Kiko 测试"}
        </button>
      </div>
      <div className="h-20" />
    </div>
  );
}
