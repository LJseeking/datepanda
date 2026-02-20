"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// Matching drops every Thursday 20:00 CST and Friday (2nd chance) 20:00 CST
function getNextMatchDropTime(): { date: Date; round: "THU" | "FRI" } {
    // Everything computed in CST (UTC+8)
    const now = new Date();

    // Get current weekday in CST
    const cstOffset = 8 * 60 * 60 * 1000;
    const cstNow = new Date(now.getTime() + cstOffset);
    const dayOfWeek = cstNow.getUTCDay(); // 0=Sun, 1=Mon ... 4=Thu, 5=Fri
    const cstHour = cstNow.getUTCHours();

    // Calculate start of today in CST as UTC
    const todayCST = new Date(
        Date.UTC(cstNow.getUTCFullYear(), cstNow.getUTCMonth(), cstNow.getUTCDate())
    );

    // Days until Thursday (4) from today
    let daysUntilThu = (4 - dayOfWeek + 7) % 7;
    let daysUntilFri = (5 - dayOfWeek + 7) % 7;

    // If today is Thursday, check if it's past 20:00
    if (dayOfWeek === 4 && cstHour >= 20) {
        // Thursday drop has passed, next is Friday
        daysUntilFri = 1;
        daysUntilThu = 7;
    }
    // If today is Friday, check if it's past 20:00
    if (dayOfWeek === 5 && cstHour >= 20) {
        // Both drops passed, next THU is next week
        daysUntilThu = 6;
        daysUntilFri = 7;
    }

    // Thursday at 20:00 CST = Thursday at 12:00 UTC
    const thuDrop = new Date(todayCST.getTime() + daysUntilThu * 86400000 + 12 * 3600000);
    // Friday at 20:00 CST = Friday at 12:00 UTC
    const friDrop = new Date(todayCST.getTime() + daysUntilFri * 86400000 + 12 * 3600000);

    if (thuDrop <= friDrop) {
        return { date: thuDrop, round: "THU" };
    } else {
        return { date: friDrop, round: "FRI" };
    }
}

function getTimeLeft(target: Date) {
    const diff = Math.max(0, target.getTime() - new Date().getTime());
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    return { days, hours, minutes, seconds, total: diff };
}

// Random ambient Kiko messages
const AMBIENT_MESSAGES = [
    "正在用量子纠缠处理你的灵魂数据……",
    "Kiko 正在对齐宇宙能量……",
    "系统正在遍历所有时间线，寻找最适合你的那条……",
    "检测到你体内的安全感粒子正在稳定……",
    "统计学在某一刻会变成浪漫……",
    "你们相遇的概率，比流星更稀有……",
    "等待，是另一种形式的命定……",
];

export default function WaitingPage() {
    const router = useRouter();
    const [nextDrop, setNextDrop] = useState<{ date: Date; round: "THU" | "FRI" } | null>(null);
    const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, total: 1 });
    const [msgIndex, setMsgIndex] = useState(0);

    useEffect(() => {
        const drop = getNextMatchDropTime();
        setNextDrop(drop);
        setTimeLeft(getTimeLeft(drop.date));

        const tick = setInterval(() => {
            const t = getTimeLeft(drop.date);
            setTimeLeft(t);
            if (t.total <= 0) {
                clearInterval(tick);
                // Redirect to matching results when it's time!
                router.push("/matching");
            }
        }, 1000);

        // Rotate ambient messages
        const msgRotate = setInterval(() => {
            setMsgIndex((i) => (i + 1) % AMBIENT_MESSAGES.length);
        }, 3500);

        return () => {
            clearInterval(tick);
            clearInterval(msgRotate);
        };
    }, [router]);

    const roundLabel = nextDrop?.round === "THU" ? "本周第一波" : "本周第二波 (Second Chance)";

    // Progress display: filled circles for each day
    const isImminent = timeLeft.days === 0 && timeLeft.hours < 2;

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white overflow-hidden relative px-6">

            {/* ============ Starfield / Particle Background ============ */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {[...Array(60)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute rounded-full bg-white opacity-20"
                        style={{
                            width: Math.random() * 3 + 1 + "px",
                            height: Math.random() * 3 + 1 + "px",
                            top: Math.random() * 100 + "%",
                            left: Math.random() * 100 + "%",
                            animation: `twinkle ${2 + Math.random() * 4}s ease-in-out infinite alternate`,
                            animationDelay: Math.random() * 4 + "s",
                        }}
                    />
                ))}
            </div>

            {/* ============ ROUND LABEL ============ */}
            <p className="text-xs tracking-[0.3em] uppercase text-gray-500 mb-8 relative z-10">
                {roundLabel} MATCH DROP
            </p>

            {/* ============ Kiko Avatar Pulse ============ */}
            <div className="relative z-10 mb-10">
                <div
                    className="w-28 h-28 rounded-full bg-gradient-to-br from-rose-500 to-indigo-600 flex items-center justify-center text-5xl shadow-2xl"
                    style={{ animation: "heartbeat 1.8s ease-in-out infinite" }}
                >
                    🐼
                </div>
                {/* Glow rings */}
                <div className="absolute inset-0 rounded-full bg-rose-500/20 scale-125 animate-ping pointer-events-none" />
                <div className="absolute inset-0 rounded-full bg-indigo-500/10 scale-150 animate-ping pointer-events-none" style={{ animationDelay: "0.6s" }} />
            </div>

            {/* ============ TITLE ============ */}
            <h1 className="text-3xl font-extrabold tracking-tight mb-2 relative z-10 text-center">
                匹配结果
                <span className="text-rose-400"> 即将揭晓</span>
            </h1>
            <p className="text-gray-400 text-sm mb-10 relative z-10">
                Kiko 正在宇宙中努力为你配对……
            </p>

            {/* ============ COUNTDOWN ============ */}
            <div className="flex gap-4 relative z-10 mb-10">
                {[
                    { value: timeLeft.days, label: "天" },
                    { value: timeLeft.hours, label: "时" },
                    { value: timeLeft.minutes, label: "分" },
                    { value: timeLeft.seconds, label: "秒" },
                ].map(({ value, label }) => (
                    <div key={label} className="flex flex-col items-center">
                        <div
                            className={`w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-mono font-bold transition-all duration-500
                ${isImminent ? "bg-rose-500/30 border border-rose-400 text-rose-300 shadow-[0_0_30px_rgba(244,63,94,0.5)]" : "bg-white/10 border border-white/10 text-white"}`}
                        >
                            {String(value).padStart(2, "0")}
                        </div>
                        <span className="text-xs text-gray-500 mt-2 tracking-widest">{label}</span>
                    </div>
                ))}
            </div>

            {/* ============ AMBIENT STATUS MESSAGE ============ */}
            <div className="relative z-10 text-center max-w-xs">
                <p
                    key={msgIndex}
                    className="text-gray-400 text-sm italic px-4 py-3 bg-white/5 rounded-xl border border-white/10"
                    style={{ animation: "fadeInUp 0.5s ease-out" }}
                >
                    {AMBIENT_MESSAGES[msgIndex]}
                </p>
            </div>

            {/* Link back to home */}
            <button
                onClick={() => router.push("/")}
                className="relative z-10 mt-12 text-xs text-gray-600 hover:text-gray-400 transition-colors"
            >
                ← 回首页
            </button>

            {/* ============ Custom Keyframe CSS ============ */}
            <style>{`
        @keyframes twinkle {
          0% { opacity: 0.05; transform: scale(0.8); }
          100% { opacity: 0.6; transform: scale(1.2); }
        }
        @keyframes heartbeat {
          0%, 100% { transform: scale(1); }
          14% { transform: scale(1.08); }
          28% { transform: scale(1); }
          42% { transform: scale(1.04); }
          70% { transform: scale(1); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
        </div>
    );
}
