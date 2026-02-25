"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Loader2, Users, ShieldCheck, FileSpreadsheet, HeartHandshake, Zap, Activity } from "lucide-react";

export default function AdminOverview() {
    const [metrics, setMetrics] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/admin/overview")
            .then(res => res.json())
            .then(data => {
                if (data.ok) setMetrics(data.data);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
        );
    }

    if (!metrics) {
        return <div className="text-red-500">Failed to load metrics.</div>;
    }

    const cards = [
        {
            title: "总注册用户",
            value: metrics.totalUsers,
            icon: Users,
            color: "text-blue-500",
            bg: "bg-blue-50 dark:bg-blue-900/20"
        },
        {
            title: "活跃度 (24h 登录)",
            value: metrics.dauCount,
            icon: Activity,
            color: "text-emerald-500",
            bg: "bg-emerald-50 dark:bg-emerald-900/20"
        },
        {
            title: "已完成校园认证",
            value: metrics.verifiedUsers,
            icon: ShieldCheck,
            color: "text-indigo-500",
            bg: "bg-indigo-50 dark:bg-indigo-900/20"
        },
        {
            title: "已生成灵魂画像",
            value: metrics.completedProfiles,
            icon: FileSpreadsheet,
            color: "text-purple-500",
            bg: "bg-purple-50 dark:bg-purple-900/20"
        },
        {
            title: "历史下发推荐盲盒",
            value: metrics.totalProposals,
            icon: Zap,
            color: "text-amber-500",
            bg: "bg-amber-50 dark:bg-amber-900/20"
        },
        {
            title: "双向心动 (对话建立)",
            value: metrics.totalMatches,
            icon: HeartHandshake,
            color: "text-rose-500",
            bg: "bg-rose-50 dark:bg-rose-900/20"
        }
    ];

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">总览看板</h2>
                <p className="text-muted-foreground mt-1">这里是你掌控 DatePanda 全局运营数据的作战中心。</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {cards.map((card, i) => (
                    <Card key={i} className="border-0 shadow-sm ring-1 ring-slate-100 dark:ring-slate-800">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">
                                {card.title}
                            </CardTitle>
                            <div className={`p-2 rounded-lg ${card.bg}`}>
                                <card.icon className={`w-4 h-4 ${card.color}`} />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold font-mono">
                                {card.value.toLocaleString()}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Future charts go here */}
            <Card className="border-0 shadow-sm ring-1 ring-slate-100 dark:ring-slate-800 p-8 flex items-center justify-center text-slate-400 border-dashed border-2 bg-transparent">
                高级图表区域 (待解锁)
            </Card>
        </div>
    );
}
