"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, MapPin, HeartHandshake, Compass, Camera, LockKeyhole, Eye, Globe } from "lucide-react";
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
        case "AttachmentSecurity": return "「高安全基石」";
        case "PaceAlignment": return "「慢节奏体验家」";
        case "EmotionalNeedIntensity": return "「高能独立发光体」";
        case "RelationshipMaturity": return "「高成熟度智者」";
        case "ConflictRisk": return "「理智清醒避风港」";
        default: return "「特立独行的熊猫」";
    }
};

export default function ProfilePage() {
    const router = useRouter();
    const [profileData, setProfileData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Photo states
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [userInfo, setUserInfo] = useState({
        avatarUrl: "",
        photoVisibility: "MATCHED_ONLY"
    });

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
                        const snap = JSON.parse(json.data.profile.profileSnapshot);
                        setProfileData(snap);
                        if (json.data.profile.user) {
                            setUserInfo({
                                avatarUrl: json.data.profile.user.avatarUrl || "",
                                photoVisibility: json.data.profile.user.photoVisibility || "MATCHED_ONLY"
                            });
                        }
                    } catch (e) { }
                }
            })
            .catch((e) => console.error(e))
            .finally(() => setLoading(false));
    }, [router]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const res = await fetch(`/api/upload?filename=${encodeURIComponent(file.name)}`, {
                method: "POST",
                body: file
            });
            const data = await res.json();
            if (data.ok && data.data.url) {
                setUserInfo(prev => ({ ...prev, avatarUrl: data.data.url }));
            } else {
                alert(data.message || "上传失败");
            }
        } catch (err) {
            console.error(err);
            alert("图片上传出错，请稍后重试");
        }
        setUploading(false);
    };

    const handleVisibilityChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        setUserInfo(prev => ({ ...prev, photoVisibility: val }));
        try {
            await fetch("/api/profile/visibility", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ photoVisibility: val })
            });
        } catch (err) { }
    };

    if (loading) {
        return (
            <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-4">
                <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
                <p className="text-slate-500 animate-pulse">正在生成你的专属星球...</p>
            </div>
        );
    }

    if (!profileData) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center px-4 animate-in fade-in zoom-in-95 duration-500">
                <Card className="w-full max-w-sm border-0 shadow-2xl shadow-emerald-500/10 dark:bg-slate-900 border-t-4 border-t-emerald-400">
                    <CardContent className="pt-8 pb-8 text-center space-y-6">
                        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto dark:bg-emerald-900/30">
                            <Compass className="w-10 h-10" />
                        </div>
                        <div className="space-y-2">
                            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">星球尚未建立</h1>
                            <p className="text-slate-500 dark:text-slate-400 text-sm">
                                宇宙中还找不到你的坐标，完成 Kiko 测试，生成你的专属灵魂名片吧。
                            </p>
                        </div>
                        <Button
                            size="lg"
                            className="w-full bg-emerald-500 hover:bg-emerald-600 rounded-full text-white shadow-lg shadow-emerald-500/20"
                            onClick={() => router.push("/questionnaire")}
                        >
                            去建立档案 <Sparkles className="w-4 h-4 ml-2" />
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-md mx-auto p-4 sm:p-6 py-8 pb-24 space-y-8 animate-in fade-in duration-500">

            {/* Header */}
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                    我的星球档案 🪐
                </h1>
                <p className="text-slate-500 dark:text-slate-400">
                    在这里，遇见真实的自己
                </p>
            </div>

            {/* Main Profile Card */}
            <Card className="border-0 shadow-xl shadow-emerald-500/5 dark:shadow-none dark:bg-slate-900 relative overflow-hidden rounded-[2rem]">

                {/* Decorative Background Elements */}
                <div className="absolute -top-20 -right-20 w-64 h-64 bg-emerald-100/50 rounded-full blur-3xl opacity-50 pointer-events-none dark:bg-emerald-900/20"></div>
                <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-rose-100/50 rounded-full blur-3xl opacity-50 pointer-events-none dark:bg-rose-900/20"></div>

                <CardContent className="p-6 pt-10 relative z-10 space-y-8">

                    {/* Avatar & Title */}
                    <div className="text-center space-y-4">
                        <div className="relative w-24 h-24 mx-auto group">
                            <div className="w-full h-full rounded-[2rem] flex items-center justify-center shadow-lg shadow-emerald-500/20 border-4 border-white dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden relative">
                                {userInfo.avatarUrl ? (
                                    <Image
                                        src={userInfo.avatarUrl}
                                        alt="Avatar"
                                        fill
                                        className="object-cover"
                                        priority
                                    />
                                ) : (
                                    <Image
                                        src="/kiko-avatar.svg"
                                        alt="Avatar"
                                        fill
                                        className="object-cover p-2"
                                        priority
                                    />
                                )}
                            </div>

                            {/* Hidden file input */}
                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                            />

                            {/* Camera overlay button */}
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                                className="absolute -bottom-2 -right-2 p-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full shadow-md transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 z-20 group-hover:shadow-lg"
                                title="上传真实照片"
                            >
                                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                            </button>
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                                {profileData.answers?.open_text_self_intro || "神秘 Panda"}
                            </h2>
                            <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                                <Badge variant="secondary" className="bg-emerald-50 text-emerald-600 hover:bg-emerald-50 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800">
                                    {getKikoLabel(profileData.kikoDimensions)}
                                </Badge>

                                {/* Visibility Toggle */}
                                <div className="relative inline-flex items-center px-2 py-0.5 rounded-full border border-slate-200 bg-white shadow-sm dark:bg-slate-800 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
                                    {userInfo.photoVisibility === "MATCHED_ONLY" ? <LockKeyhole className="w-3 h-3 mr-1 text-emerald-500" /> : userInfo.photoVisibility === "PUBLIC" ? <Globe className="w-3 h-3 mr-1 text-blue-500" /> : <Eye className="w-3 h-3 mr-1 text-rose-500" />}
                                    <select
                                        className="appearance-none bg-transparent border-none outline-none cursor-pointer pr-4 hover:text-emerald-600 transition-colors font-medium"
                                        value={userInfo.photoVisibility}
                                        onChange={handleVisibilityChange}
                                    >
                                        <option value="MATCHED_ONLY">配对后可见</option>
                                        <option value="PUBLIC">无限制公开</option>
                                        <option value="HIDDEN">完全隐藏</option>
                                    </select>
                                    <div className="absolute right-2 pointer-events-none opacity-50 text-[10px]">▼</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Radar Chart Section */}
                    <div className="bg-slate-50/80 dark:bg-slate-950/50 rounded-3xl p-4 pt-6 pb-8 backdrop-blur-sm border border-slate-100 dark:border-slate-800">
                        {profileData.kikoDimensions ? (
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-slate-400 dark:text-slate-500 text-center uppercase tracking-wider flex items-center justify-center gap-2">
                                    <Sparkles className="w-4 h-4 text-emerald-400" /> KIKO 心理画像
                                </h3>
                                <div>
                                    <KikoRadar myDims={profileData.kikoDimensions} />
                                </div>
                            </div>
                        ) : (
                            <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-sm">
                                Kiko 维度数据正在量子计算中...
                            </div>
                        )}
                    </div>

                    {/* Basic Stats Summary Tag */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col items-center justify-center text-center space-y-1">
                            <MapPin className="w-5 h-5 text-rose-400 mb-1" />
                            <div className="text-[10px] sm:text-xs text-slate-400 uppercase tracking-wider font-semibold">偏好区域</div>
                            <div className="font-bold text-slate-700 dark:text-slate-200 text-sm">
                                {profileData.answers?.basic_city_in_hz?.[0] || "漫游中"}
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col items-center justify-center text-center space-y-1">
                            <HeartHandshake className="w-5 h-5 text-emerald-400 mb-1" />
                            <div className="text-[10px] sm:text-xs text-slate-400 uppercase tracking-wider font-semibold">交友期待</div>
                            <div className="font-bold text-slate-700 dark:text-slate-200 text-sm truncate w-full px-2">
                                {profileData.answers?.relationship_goal === "serious" ? "认真恋爱" :
                                    profileData.answers?.relationship_goal === "casual" ? "轻松社交" : "顺其自然"}
                            </div>
                        </div>
                    </div>

                </CardContent>
            </Card>
        </div>
    );
}
