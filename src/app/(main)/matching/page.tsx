"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { Heart, X, MessageCircleHeart, Sparkles, Loader2, Info, LockKeyhole, Flag } from "lucide-react";
import KikoRadar from "@/components/charts/KikoRadar";

export default function MatchingPage() {
    const router = useRouter();
    const [proposal, setProposal] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        fetch("/api/matching/me")
            .then((res) => {
                if (res.status === 401) {
                    router.push("/login");
                    throw new Error("Login required");
                }
                return res.json();
            })
            .then((json) => {
                if (json.ok) {
                    setProposal(json.data.proposal);
                } else {
                    setError(json.error?.message || "Failed to load");
                }
            })
            .catch((e) => console.error(e))
            .finally(() => setLoading(false));
    }, [router]);

    const handleRespond = async (action: "ACCEPT" | "REJECT") => {
        if (!proposal) return;
        setActionLoading(true);
        try {
            const res = await fetch("/api/matching/respond", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    proposalId: proposal.id,
                    action,
                    rejectReason: action === "REJECT" ? "User clicked reject" : undefined
                })
            });
            const json = await res.json();
            if (json.ok) {
                setProposal((prev: any) => ({ ...prev, status: json.data.status }));
            } else {
                alert("Error: " + json.error?.message);
            }
        } catch (e) {
            alert("Network error");
        } finally {
            setActionLoading(false);
        }
    };

    const handleReport = async () => {
        if (!proposal || !proposal.candidateUserId) return;
        const confirmReport = confirm("确定要举报并屏蔽该用户吗？我们将尽快核实处理。");
        if (!confirmReport) return;

        setActionLoading(true);
        try {
            const res = await fetch("/api/report", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    targetUserId: proposal.candidateUserId,
                    reasonCode: "INAPPROPRIATE_BEHAVIOR",
                })
            });
            if (res.ok) {
                alert("举报成功，我们将尽快处理。");
                // Auto reject after report so they don't see it anymore
                await handleRespond("REJECT");
            } else {
                alert("提交失败，请稍后重试");
                setActionLoading(false);
            }
        } catch (e) {
            alert("Network error");
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-4">
                <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
                <p className="text-slate-500 animate-pulse">正在从宇宙打捞你的匹配...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center px-4">
                <Card className="w-full max-w-sm border-rose-200 bg-rose-50/50">
                    <CardContent className="pt-6 text-center space-y-4">
                        <div className="w-12 h-12 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mx-auto">
                            <Info className="w-6 h-6" />
                        </div>
                        <p className="text-rose-700 font-medium">{error}</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!proposal) {
        if (typeof window !== "undefined") {
            router.replace("/matching/waiting");
        }
        return (
            <div className="min-h-[80vh] flex items-center justify-center text-slate-500">
                <Loader2 className="w-6 h-6 mr-2 animate-spin text-emerald-500" />
                正在跳转等待页面...
            </div>
        );
    }

    const isPending = proposal.status === "PENDING";
    const isAccepted = proposal.status === "ACCEPTED" || proposal.status === "MUTUAL_ACCEPTED";
    const isRejected = proposal.status === "REJECTED";

    return (
        <div className="max-w-md mx-auto p-4 sm:p-6 py-8 space-y-6 animate-in fade-in duration-500">

            {/* Header */}
            <div className="text-center space-y-1 mb-8">
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none mb-3">
                    {proposal.weekKey} • Round {proposal.round}
                </Badge>
                <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
                    本周星球速递 💌
                </h1>
                <p className="text-slate-500 dark:text-slate-400">
                    Kiko 算法为你寻找到的高维共振者
                </p>
            </div>

            {/* Match Card */}
            <Card className="overflow-hidden border-0 shadow-xl shadow-slate-200/50 dark:shadow-none dark:bg-slate-900 relative">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 to-emerald-500" />

                <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-lg">Kiko 匹配分数</CardTitle>
                            <CardDescription>灵魂共鸣指数</CardDescription>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            <div className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-br from-emerald-500 to-emerald-300">
                                {proposal.score}
                            </div>
                            <button
                                onClick={handleReport}
                                disabled={actionLoading}
                                className="text-xs text-slate-400 hover:text-rose-500 transition-colors flex items-center gap-1"
                                title="举报此用户"
                            >
                                <Flag className="w-3 h-3" /> 举报
                            </button>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="pt-6 space-y-8">

                    {/* Locked or Visible Photo Section */}
                    {proposal.matchCard?.photoVisibility !== "HIDDEN" && (
                        <div className="flex justify-center mb-6">
                            <div className="relative w-36 h-36 rounded-3xl overflow-hidden shadow-lg shadow-emerald-500/10 border-4 border-white dark:border-slate-800 bg-slate-50 dark:bg-slate-950 group">
                                {proposal.matchCard?.photoUrl ? (
                                    <Image
                                        src={proposal.matchCard.photoUrl}
                                        alt="Match Photo"
                                        fill
                                        className="object-cover hover:scale-105 transition-transform duration-700"
                                    />
                                ) : (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                                        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10 blur-sm pointer-events-none" />
                                        <div className="w-12 h-12 bg-white/80 dark:bg-slate-800/80 rounded-full flex items-center justify-center mb-3 shadow-md backdrop-blur-sm relative z-10 z-10 mt-2">
                                            <LockKeyhole className="w-5 h-5 text-emerald-500" />
                                        </div>
                                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 relative z-10 uppercase tracking-widest leading-relaxed">
                                            配对成功<br />解锁真实面容
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Radar Chart */}
                    {proposal.matchCard?.kikoDims?.you && proposal.matchCard?.kikoDims?.match && (
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-slate-400 dark:text-slate-500 text-center uppercase tracking-wider flex items-center justify-center gap-2">
                                <Sparkles className="w-4 h-4 text-emerald-400" /> 维度解析
                            </h3>
                            <div className="bg-slate-50 dark:bg-slate-950/50 rounded-2xl p-2 pb-6">
                                <KikoRadar myDims={proposal.matchCard.kikoDims.you} matchDims={proposal.matchCard.kikoDims.match} />
                            </div>
                        </div>
                    )}

                    {/* Reasons */}
                    <div className="space-y-3">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 text-base">
                            为什么推荐你们认识？
                        </h3>
                        <div className="bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl p-5 border border-emerald-100/50 dark:border-emerald-900/30">
                            <ul className="space-y-3">
                                {proposal.reasons?.map((r: string, i: number) => (
                                    <li key={i} className="flex items-start text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                                        <span className="text-emerald-500 mr-3 mt-0.5 shadow-sm">🌱</span>
                                        <span>{r}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* Basic Info */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                            对方档案一瞥
                        </div>
                        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-medium bg-slate-50 dark:bg-slate-800 px-4 py-3 rounded-xl">
                            🏫 <span className="text-emerald-600 dark:text-emerald-400">
                                {proposal.candidate?.schoolId || proposal.matchCard?.basicInfo?.schoolId || "未知结界"}
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Action Bar */}
            <div className="pt-4 space-y-4">
                {isPending && (
                    <div className="flex gap-4">
                        <Button
                            variant="outline"
                            size="lg"
                            onClick={() => handleRespond("REJECT")}
                            disabled={actionLoading}
                            className="flex-1 h-14 rounded-2xl border-slate-200 text-slate-500 hover:text-rose-500 focus:ring-rose-200 dark:border-slate-700 dark:hover:bg-slate-800"
                        >
                            <X className="w-5 h-5 mr-2" /> 暂不开启
                        </Button>
                        <Button
                            size="lg"
                            onClick={() => handleRespond("ACCEPT")}
                            disabled={actionLoading}
                            className="flex-1 h-14 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-400 text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:-translate-y-0.5 transition-all"
                        >
                            <Heart className="w-5 h-5 mr-2 fill-white/20" /> 愿意见面
                        </Button>
                    </div>
                )}

                {isAccepted && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                        <div className={`p-5 rounded-2xl text-center font-medium border ${proposal.status === "MUTUAL_ACCEPTED"
                            ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-400"
                            : "bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800/50 dark:border-slate-700 dark:text-slate-400"
                            }`}>
                            {proposal.status === "MUTUAL_ACCEPTED" ? (
                                <div className="space-y-1">
                                    <div className="text-xl">🎉 见信如面！</div>
                                    <div className="font-normal text-sm opacity-90">双方均已同意，你们的专属量子通道已开启。</div>
                                </div>
                            ) : (
                                "💌 你已发出心动信号，正在等待对方回应..."
                            )}
                        </div>

                        {proposal.status === "MUTUAL_ACCEPTED" && (
                            <Button
                                size="lg"
                                onClick={() => router.push("/messages")}
                                className="w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20"
                            >
                                <MessageCircleHeart className="w-5 h-5 mr-2" />
                                去聊天室打个招呼
                            </Button>
                        )}
                    </div>
                )}

                {isRejected && (
                    <div className="p-4 bg-slate-100 text-slate-500 dark:bg-slate-800/50 dark:text-slate-400 rounded-2xl text-center border border-slate-200 dark:border-slate-800 text-sm">
                        你已婉拒本次匹配。下周宇宙依然会为你寻找。
                    </div>
                )}
            </div>
        </div>
    );
}
