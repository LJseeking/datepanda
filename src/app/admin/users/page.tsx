"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, UserCheck, ShieldAlert, Eye, LockKeyhole, Globe } from "lucide-react";
import Image from "next/image";

interface User {
    id: string;
    schoolId: string;
    cityCode: string | null;
    status: string;
    createdAt: string;
    photoVisibility: string;
    avatarUrl: string | null;
    verificationStatus: string;
    emailHandle: string;
    profileSnapshot?: string | null;
}

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1); // Changed from total to totalPages
    const [totalCount, setTotalCount] = useState(0); // Added to store total count for display

    useEffect(() => {
        setLoading(true);
        fetch(`/api/admin/users?page=${page}&limit=20`) // Changed limit from 50 to 20
            .then(res => res.json())
            .then(data => {
                if (data.ok) {
                    setUsers(data.data.users);
                    setTotalPages(data.data.pagination.totalPages); // Changed from setTotal to setTotalPages
                    setTotalCount(data.data.pagination.totalCount); // Store total count
                }
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, [page]);

    // Helper to extract Kiko dimensions from snapshot
    const getKikoSummary = (user: User) => {
        if (!user.profileSnapshot) return null;
        try {
            const snap = JSON.parse(user.profileSnapshot);
            const dim = snap.dimensions || snap.kikoDimensions;
            if (!dim) return null;
            return Object.entries(dim)
                .map(([k, v]) => `${k.slice(0, 3)}:${v}`)
                .join(", ");
        } catch (e) { return null; }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">用户列表</h2>
                    <p className="text-muted-foreground mt-1">系统中共注册了 {totalCount} 名用户</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex justify-between">
                        <span>全量用户追踪表</span>
                        <div className="flex gap-2 text-sm">
                            <button
                                disabled={page === 1}
                                onClick={() => setPage(p => p - 1)}
                                className="px-3 py-1 bg-slate-100 rounded disabled:opacity-50 hover:bg-slate-200 transition-colors"
                            >
                                上一页
                            </button>
                            <span className="py-1 px-2 font-mono">{page}</span>
                            <button
                                onClick={() => setPage(p => p + 1)}
                                className="px-3 py-1 bg-slate-100 rounded hover:bg-slate-200 transition-colors"
                            >
                                下一页
                            </button>
                        </div>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 uppercase text-xs sticky top-0">
                                <tr>
                                    <th className="px-6 py-4 font-medium">基本信息 / 头像</th>
                                    <th className="px-6 py-4 font-medium">教育背景</th>
                                    <th className="px-6 py-4 font-medium">认证邮箱及状态</th>
                                    <th className="px-6 py-4 font-medium">匹配意愿设置</th>
                                    <th className="px-6 py-4 font-medium">注册时间</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="py-20 text-center">
                                            <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" />
                                        </td>
                                    </tr>
                                ) : users.map(user => (
                                    <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden relative shrink-0 border border-slate-200 flex items-center justify-center">
                                                    {user.avatarUrl ? (
                                                        <Image src={user.avatarUrl} alt="avatar" fill className="object-cover" />
                                                    ) : (
                                                        <span className="text-xl">🐼</span>
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="font-mono text-xs text-slate-400 flex items-center gap-2">
                                                        {user.id.slice(0, 8)}...
                                                        {user.photoVisibility === "MATCHED_ONLY" ? <span title="仅匹配可见"><LockKeyhole className="w-3 h-3 text-emerald-500" /></span> :
                                                            user.photoVisibility === "PUBLIC" ? <span title="公开展示"><Globe className="w-3 h-3 text-blue-500" /></span> :
                                                                <span title="完全隐藏"><Eye className="w-3 h-3 text-rose-500" /></span>}
                                                    </div>
                                                    <div className="font-medium mt-0.5">{user.cityCode || "末知城市"}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {user.schoolId ? (
                                                <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                                                    {user.schoolId}
                                                </Badge>
                                            ) : (
                                                <span className="text-slate-400 text-xs italic">未填/游客</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                {user.verificationStatus === "VERIFIED" ? (
                                                    <UserCheck className="w-4 h-4 text-emerald-500" />
                                                ) : (
                                                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                                                )}
                                                <span className={`font-mono text-xs ${user.verificationStatus === "VERIFIED" ? "text-slate-700" : "text-slate-400"}`}>
                                                    {user.emailHandle}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                {getKikoSummary(user) ? (
                                                    <Badge variant="outline" className="bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-900/30 dark:border-purple-800 shrink-0 w-fit text-[10px] leading-tight px-1.5 py-0">
                                                        已生成画像
                                                    </Badge>
                                                ) : (
                                                    <span className="text-xs text-slate-400">未填写</span>
                                                )}
                                                <div className="text-[10px] text-slate-500 max-w-[150px] truncate" title={getKikoSummary(user) || ""}>
                                                    {getKikoSummary(user)}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 font-mono text-xs">
                                            {new Date(user.createdAt).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
