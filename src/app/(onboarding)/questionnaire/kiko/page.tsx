"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { KIKO_QUESTIONS } from "@/lib/questionnaire/kikoQuestions";
import KikoCard from "@/components/questionnaire/KikoCard";

// Helper to shuffle the 60 questions so they don't always appear in dimension order
function shuffleQuestions<T>(array: readonly T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

export default function KikoQuestionnairePage() {
    const router = useRouter();
    const [answers, setAnswers] = useState<Record<string, number>>({});
    const [currentIndex, setCurrentIndex] = useState(0);
    const [locked, setLocked] = useState(false);
    const [saving, setSaving] = useState(false);
    const [shuffledQuestions, setShuffledQuestions] = useState<typeof KIKO_QUESTIONS>([]);
    const [systemMessage, setSystemMessage] = useState<string | null>(
        "欢迎来到 Kiko 量子纠缠测试！准备好直面你内心最深处的恋爱雷区了吗？凭第一直觉选哦！"
    );

    // Initialize and load saved state
    useEffect(() => {
        // We shuffle once on mount
        setShuffledQuestions(shuffleQuestions(KIKO_QUESTIONS));

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
                } else if (json.ok && json.data.responseId) {
                    // If we had existing answers, load them to restore progress
                    // Note: we'd need a robust way to fetch existing answers if the user refreshed midway.
                    // For MVP, if they refreshed, we just let them start answering again or we should fetch Draft.
                    // Due to time constraints, we will rely on client-side state for the session.
                }
            })
            .catch((e) => console.error(e));
    }, [router]);

    const handleAnswer = (value: number) => {
        // If it's a system message, value is 0 (Continue)
        if (systemMessage) {
            setSystemMessage(null);
            return;
        }

        const currentQ = shuffledQuestions[currentIndex];
        const newAnswers = { ...answers, [currentQ.id]: value };
        setAnswers(newAnswers);

        // Persist draft every 5 questions to not hammer the DB
        if ((currentIndex + 1) % 5 === 0) {
            saveDraft(newAnswers);
        }

        // Milestone Messages
        const nextIndex = currentIndex + 1;
        if (nextIndex === 15) {
            setSystemMessage("做完四分之一啦！Kiko 偷偷告诉你，我已经隐约感觉到你的安全感底色了 ☕️");
        } else if (nextIndex === 30) {
            setSystemMessage("进度过半达成！目前看下来，你是个很有故事的人哦 🐼");
        } else if (nextIndex === 45) {
            setSystemMessage("冲刺阶段！不要停，跟着你的第一直觉继续划！🚀");
        }

        if (nextIndex < shuffledQuestions.length) {
            setCurrentIndex(nextIndex);
        } else {
            // Done!
            setSystemMessage("大功告成！！正在把你的答案塞进量子纠缠匹配器里疯狂计算……");
            handleSubmit(newAnswers);
        }
    };

    const saveDraft = async (currentAnswers: Record<string, number>) => {
        try {
            const payload = Object.entries(currentAnswers).map(([k, v]) => ({
                questionKey: k,
                value: String(v),
            }));

            const res = await fetch("/api/questionnaire/save", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ answers: payload }),
            });

            if (!res.ok) {
                const json = await res.json().catch(() => ({}));
                throw new Error(json.error?.message || `HTTP error! status: ${res.status}`);
            }
        } catch (e) {
            console.error("Failed to save draft", e);
        }
    };

    const handleSubmit = async (finalAnswers: Record<string, number>) => {
        if (saving) return;
        setSaving(true);
        try {
            await saveDraft(finalAnswers);

            // Submit
            const res = await fetch("/api/questionnaire/submit", { method: "POST" });
            if (!res.ok) {
                const json = await res.json().catch(() => ({}));
                throw new Error(json.error?.message || `Submit failed with status: ${res.status}`);
            }
            const json = await res.json();
            if (!json.ok) throw new Error(json.error?.message || "Submit failed");

            // Generate Profile
            const pRes = await fetch("/api/profile/generate", { method: "POST" });
            if (!pRes.ok) {
                const pJson = await pRes.json().catch(() => ({}));
                throw new Error(pJson.error?.message || `Profile generation failed with status: ${pRes.status}`);
            }
            const pJson = await pRes.json();
            if (!pJson.ok) throw new Error(pJson.error?.message || "Profile generation failed");

            setLocked(true);
            setTimeout(() => {
                router.push("/profile");
            }, 2000); // Give user 2s to read the completion message
        } catch (e: any) {
            console.error(e);
            alert("提交失败，请重试：" + e.message);
        } finally {
            setSaving(false);
        }
    };

    if (locked) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="text-center p-8 bg-white rounded-3xl shadow-sm">
                    <span className="text-6xl mb-4 block">🎉</span>
                    <h1 className="text-2xl font-bold mb-2">测试已完成</h1>
                    <p className="text-gray-500">Kiko 正在为你匹配那个对的人...</p>
                </div>
            </div>
        );
    }

    if (shuffledQuestions.length === 0) {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }

    const currentQ = shuffledQuestions[currentIndex];
    // Calculate progress: if systemMessage, show current index progress. If actual question, show +1.
    const progressPercent = ((currentIndex) / shuffledQuestions.length) * 100;

    return (
        <div className="min-h-screen bg-[#faf9f6] flex flex-col items-center">

            {/* Header & Progress Bar */}
            <div className="w-full max-w-md px-6 pt-8 pb-4 sticky top-0 bg-[#faf9f6]/90 backdrop-blur-md z-50">
                <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-bold text-gray-400 tracking-wider">KIKO PSYCHOMETRICS</span>
                    <span className="text-sm font-bold text-gray-800 bg-white px-3 py-1 rounded-full shadow-sm">
                        {Math.min(currentIndex + 1, 60)} / 60
                    </span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-rose-400 to-indigo-500 transition-all duration-500 ease-out"
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>
            </div>

            {/* Main Stage */}
            <div className="flex-1 w-full flex flex-col pt-4">
                <KikoCard
                    question={systemMessage ? null : currentQ}
                    kikoMessage={systemMessage || undefined}
                    onAnswer={handleAnswer}
                />
            </div>
        </div>
    );
}
