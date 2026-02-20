"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import KikoRadar from "@/components/charts/KikoRadar";

// Derive "Avatar Label" based on highest dimension
const getKikoLabel = (dims: Record<string, number> | undefined) => {
    if (!dims) return "正在探索中的灵魂";
    let maxDim = "";
    let maxScore = -1;
    for (const [key, val] of Object.entries(dims)) {
        if (val > maxScore) { maxScore = val; maxDim = key; }
    }

    switch (maxDim) {
        case "AttachmentSecurity": return "「高安全感基石」";
        case "PaceAlignment": return "「慢节奏体验家」";
        case "EmotionalNeedIntensity": return "「高度独立发光体」";
        case "RelationshipMaturity": return "「高成熟度智者」";
        case "ConflictRisk": return "「理智清醒避风港」";
        default: return "「特立独行的熊猫」";
    }
};

export default function ProfilePage() {
    const router = useRouter();
    const [profileData, setProfileData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/profile/me")
            .then((res) => {
                if (res.status === 401) {
                    router.push("/login");
                    throw new Error("Login required");
                }
                return res.json();
            })
            .then((json) => {
                if (json.ok && json.data.profile) {
                    try {
                        // Profile Snapshot is a JSON string in DB
                        const snap = JSON.parse(json.data.profile.profileSnapshot);
                        setProfileData(snap);
                    } catch (e) { }
                }
            })
            .catch((e) => console.error(e))
            .finally(() => setLoading(false));
    }, [router]);

    if (loading) return <div className="p-8 text-center text-gray-500">正在生成你的专属星球...</div>;

    if (!profileData) {
        return (
            <div className="p-8 text-center space-y-4">
                <h1 className="text-2xl font-bold">星球尚未建立</h1>
                <p className="text-gray-500">你还没有完成所有问卷测试哦</p>
                <button
                    onClick={() => router.push("/questionnaire")}
                    className="mt-4 px-6 py-2 bg-black text-white rounded-full font-bold shadow hover:bg-gray-800"
                >
                    去建立档案
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-md mx-auto p-4 space-y-6 pb-20">
            <div className="text-center pt-6 space-y-2">
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">我的星球档案</h1>
                <p className="text-gray-500 text-sm">在这里，遇见真实的自己</p>
            </div>

            <div className="border rounded-3xl p-6 bg-white shadow-xl shadow-rose-500/5 space-y-6 relative overflow-hidden">

                {/* Decorative Blob */}
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-rose-100 rounded-full blur-2xl opacity-50 pointer-events-none"></div>

                <div className="text-center space-y-1 relative z-10">
                    <div className="w-20 h-20 bg-gradient-to-tr from-rose-400 to-indigo-500 rounded-full mx-auto flex items-center justify-center text-3xl shadow-lg border-4 border-white">
                        🐼
                    </div>
                    <h2 className="text-xl font-bold mt-2 text-gray-800">
                        {profileData.answers?.open_text_self_intro || "神秘用户"}
                    </h2>
                    <div className="inline-block px-4 py-1 mt-2 bg-rose-50 text-rose-600 rounded-full text-sm font-semibold">
                        {getKikoLabel(profileData.kikoDimensions)}
                    </div>
                </div>

                {/* Radar Chart */}
                {profileData.kikoDimensions ? (
                    <div className="py-2 border-t border-b border-gray-100 relative z-10">
                        <h3 className="text-sm font-bold text-gray-400 mb-2 text-center uppercase tracking-widest">KIKO 心理画像</h3>
                        <KikoRadar myDims={profileData.kikoDimensions} />
                        <p className="text-xs text-center text-gray-400 mt-2">（各维度的分布倾向图）</p>
                    </div>
                ) : (
                    <div className="py-8 text-center text-gray-400 border-t border-b border-gray-100">
                        Kiko 性格数据正在计算中...
                    </div>
                )}

                {/* Basic Stats Summary (Mock layout for extensibility) */}
                <div className="grid grid-cols-2 gap-3 text-center relative z-10">
                    <div className="bg-gray-50 p-3 rounded-2xl">
                        <div className="text-xs text-gray-500 mb-1">倾向位置</div>
                        <div className="font-semibold text-gray-800 text-sm">
                            {profileData.answers?.basic_city_in_hz?.[0] || "-"}
                        </div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-2xl">
                        <div className="text-xs text-gray-500 mb-1">交友目的</div>
                        <div className="font-semibold text-gray-800 text-sm truncate">
                            {profileData.answers?.relationship_goal === "serious" ? "认真恋爱" : "顺其自然"}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
