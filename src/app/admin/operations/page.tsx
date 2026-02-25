"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Zap, CalendarDays, MailPlus, AlertCircle } from "lucide-react";

export default function OperationsPage() {
    const [loadingJob, setLoadingJob] = useState<string | null>(null);

    const handleTrigger = async (jobType: string, label: string) => {
        if (!confirm(`⚠️ 危险操作确认\n\n确定要立即执行【${label}】任务吗？此操作不可逆，将直接写入数据库。`)) {
            return;
        }

        setLoadingJob(jobType);
        try {
            const res = await fetch("/api/admin/jobs/trigger", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ jobType })
            });
            const data = await res.json();

            if (data.ok) {
                alert(`✅ 执行成功:\n\n${data.data.message}`);
            } else {
                alert(`❌ 执行失败:\n\n${data.error?.message || "未知错误"}`);
            }
        } catch (err: any) {
            alert(`❌ 网络请求失败:\n\n${err.message}`);
        } finally {
            setLoadingJob(null);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight text-rose-600 flex items-center gap-2">
                    <Zap className="w-6 h-6" /> 运营控制台
                </h2>
                <p className="text-muted-foreground mt-1">
                    这里是熊猫核按钮中心，请谨慎操作每一项手动发车任务。
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                {/* THU Match Card */}
                <Card className="border-rose-100 dark:border-rose-900/50 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                        <CalendarDays className="w-32 h-32" />
                    </div>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-rose-600">
                            周四首发匹配 (THU)
                        </CardTitle>
                        <CardDescription>
                            为全量活跃用户生成本周四的第一轮匹配推荐。如果已经生成过，算法将保持幂等跳过。
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button
                            variant="default"
                            className="w-full bg-rose-500 hover:bg-rose-600 text-white"
                            onClick={() => handleTrigger("MATCH_THU", "周四首发匹配")}
                            disabled={loadingJob !== null}
                        >
                            {loadingJob === "MATCH_THU" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "立即执行计算"}
                        </Button>
                    </CardContent>
                </Card>

                {/* FRI Match Card */}
                <Card className="border-amber-100 dark:border-amber-900/50 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                        <CalendarDays className="w-32 h-32" />
                    </div>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-amber-600">
                            周五捡漏匹配 (FRI)
                        </CardTitle>
                        <CardDescription>
                            识别昨晚匹配成功且愿意见面的用户，并为另一方被拒绝/错过的人寻找新的推荐候选人 (Second Chance)。
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button
                            variant="default"
                            className="w-full bg-amber-500 hover:bg-amber-600 text-white"
                            onClick={() => handleTrigger("MATCH_FRI", "周五捡漏匹配")}
                            disabled={loadingJob !== null}
                        >
                            {loadingJob === "MATCH_FRI" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "立即执行计算"}
                        </Button>
                    </CardContent>
                </Card>

                {/* Notification Relay Card */}
                <Card className="border-indigo-100 dark:border-indigo-900/50 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                        <MailPlus className="w-32 h-32" />
                    </div>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-indigo-600">
                            强制分发通知
                        </CardTitle>
                        <CardDescription>
                            一键执行全局短信和邮箱的批量推送通知。系统将拉取所有待发送的提醒并执行投递。
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button
                            variant="default"
                            className="w-full bg-indigo-500 hover:bg-indigo-600 text-white"
                            onClick={() => handleTrigger("NOTIFY_ALL", "拉起全局邮件通知")}
                            disabled={loadingJob !== null}
                        >
                            {loadingJob === "NOTIFY_ALL" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "发送全域触达"}
                        </Button>
                    </CardContent>
                </Card>

            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex gap-3 text-sm text-slate-600 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 mt-8">
                <AlertCircle className="w-5 h-5 shrink-0 text-amber-500" />
                <p>
                    <strong>注意:</strong> 匹配计算属于重负载的 CPU 及数据库交互任务。如果当前注册人数超过 1,000 人，执行可能需要 30 秒至 1 分钟不等，请避免重复点击并耐心等待弹窗回执。
                </p>
            </div>
        </div>
    );
}
