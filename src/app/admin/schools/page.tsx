"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LogOut, Plus, CheckCircle2, XCircle } from "lucide-react";

interface Domain {
    id: string;
    domain: string;
    emailType: string;
    isEnabled: boolean;
    note: string | null;
}

interface School {
    id: string;
    name: string;
    cityCode: string;
    isEnabled: boolean;
    domains: Domain[];
}

export default function AdminSchoolsPage() {
    const router = useRouter();
    const [schools, setSchools] = useState<School[]>([]);
    const [loading, setLoading] = useState(true);
    const [newDomain, setNewDomain] = useState({ domain: "", schoolId: "", emailType: "student" });
    const [newSchool, setNewSchool] = useState({ name: "", cityCode: "hz" });
    const [msg, setMsg] = useState("");

    async function load() {
        const res = await fetch("/api/admin/domains", { headers: {} });
        if (res.status === 401) {
            router.push("/admin/login");
            return;
        }
        const data = await res.json();
        setSchools(data.data || []);
        setLoading(false);
    }

    useEffect(() => { load(); }, []);

    async function toggleDomain(id: string, current: boolean) {
        await fetch(`/api/admin/domains/${id}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ isEnabled: !current }),
        });
        load();
    }

    async function toggleSchool(id: string, current: boolean) {
        await fetch(`/api/admin/schools`, {
            method: "PATCH",
            headers: { "content-type": "application/json", "x-school-id": id },
            body: JSON.stringify({ id, isEnabled: !current }),
        });
        await fetch(`/api/admin/schools/${id}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ isEnabled: !current }),
        });
        load();
    }

    async function addDomain(e: React.FormEvent) {
        e.preventDefault();
        const res = await fetch("/api/admin/domains", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(newDomain),
        });
        if (res.ok) {
            setMsg("✓ 域名已添加");
            setNewDomain({ domain: "", schoolId: "", emailType: "student" });
            load();
        } else {
            const d = await res.json();
            setMsg("✗ " + (d.message || "添加失败"));
        }
    }

    async function addSchool(e: React.FormEvent) {
        e.preventDefault();
        const res = await fetch("/api/admin/schools", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(newSchool),
        });
        if (res.ok) {
            setMsg("✓ 学校已添加");
            setNewSchool({ name: "", cityCode: "hz" });
            load();
        } else {
            const d = await res.json();
            setMsg("✗ " + (d.message || "添加失败"));
        }
    }

    async function logout() {
        await fetch("/api/admin/auth", { method: "DELETE" });
        router.push("/admin/login");
    }

    return (
        <div className="min-h-[100dvh] bg-slate-50 dark:bg-slate-950 p-6 md:p-10 font-sans text-slate-900 dark:text-slate-100">
            <div className="max-w-5xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
                    <div>
                        <h1 className="text-3xl font-extrabold flex items-center gap-3">
                            <span className="text-4xl">🐼</span> 学校邮箱域名管理
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">DatePanda Admin Control Panel</p>
                    </div>
                    <Button variant="outline" onClick={logout} className="text-slate-500 hover:text-slate-900 border-slate-200 dark:border-slate-800 dark:hover:text-white">
                        <LogOut className="w-4 h-4 mr-2" /> 退出登录
                    </Button>
                </div>

                {/* Notifications */}
                {msg && (
                    <div className={`p-4 rounded-xl flex items-center justify-between border ${msg.startsWith('✓') ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/50 dark:border-emerald-900/50 dark:text-emerald-400' : 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/50 dark:border-rose-900/50 dark:text-rose-400'}`}>
                        <div className="flex items-center gap-2 font-medium">
                            {msg.startsWith('✓') ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                            {msg.replace(/^[✓✗]\s*/, '')}
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setMsg("")} className="h-8 w-8 hover:bg-black/5 dark:hover:bg-white/10">
                            &times;
                        </Button>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Add School */}
                    <Card className="shadow-sm border-slate-200 dark:border-slate-800 dark:bg-slate-900/50">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Plus className="w-5 h-5 text-emerald-500" /> 新增学校
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={addSchool} className="flex flex-col sm:flex-row gap-3">
                                <Input className="flex-1 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800" placeholder="学校名称 (例如: 浙江大学)" value={newSchool.name} onChange={e => setNewSchool(s => ({ ...s, name: e.target.value }))} required />
                                <Input className="w-full sm:w-28 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800" placeholder="城市码 hz" value={newSchool.cityCode} onChange={e => setNewSchool(s => ({ ...s, cityCode: e.target.value }))} />
                                <Button type="submit" className="bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 shrink-0">
                                    添加学校
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Add Domain */}
                    <Card className="shadow-sm border-slate-200 dark:border-slate-800 dark:bg-slate-900/50">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Plus className="w-5 h-5 text-emerald-500" /> 新增域名
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={addDomain} className="flex flex-col gap-3">
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <Input className="flex-1 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800" placeholder="域名 (e.g. zju.edu.cn)" value={newDomain.domain} onChange={e => setNewDomain(d => ({ ...d, domain: e.target.value }))} required />
                                    <select className="h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:ring-offset-slate-950 dark:focus-visible:ring-slate-300 w-full sm:w-32" value={newDomain.schoolId} onChange={e => setNewDomain(d => ({ ...d, schoolId: e.target.value }))} required>
                                        <option value="" disabled>选择学校</option>
                                        {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <select className="flex-1 h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:ring-offset-slate-950 dark:focus-visible:ring-slate-300" value={newDomain.emailType} onChange={e => setNewDomain(d => ({ ...d, emailType: e.target.value }))}>
                                        <option value="student">Student</option>
                                        <option value="staff">Staff</option>
                                    </select>
                                    <Button type="submit" className="w-full sm:w-auto bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 shrink-0">
                                        添加域名
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>

                {/* Schools & Domains Table */}
                <div className="space-y-6 pt-4">
                    {loading ? (
                        <div className="text-center py-12 text-slate-500">正在加载宇宙档案...</div>
                    ) : schools.map(school => (
                        <Card key={school.id} className="shadow-sm border-slate-200 dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
                            <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div className="flex items-center gap-3">
                                    <h2 className="text-xl font-bold">{school.name}</h2>
                                    <Badge variant={school.isEnabled ? "default" : "secondary"} className={school.isEnabled ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"}>
                                        {school.isEnabled ? "已启用" : "已停用"}
                                    </Badge>
                                </div>
                                <Button
                                    variant={school.isEnabled ? "destructive" : "default"}
                                    size="sm"
                                    onClick={() => toggleSchool(school.id, school.isEnabled)}
                                    className={school.isEnabled ? "bg-rose-500 hover:bg-rose-600 shadow-sm" : "bg-emerald-500 hover:bg-emerald-600 shadow-sm"}
                                >
                                    {school.isEnabled ? "停用整校" : "启用整校"}
                                </Button>
                            </div>

                            <div className="p-0 sm:p-2 sm:pb-6">
                                {school.domains.length === 0 ? (
                                    <div className="text-center py-8 text-slate-400 text-sm">暂无绑定域名</div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left">
                                            <thead className="text-xs text-slate-500 uppercase bg-transparent border-b border-slate-100 dark:border-slate-800">
                                                <tr>
                                                    <th className="px-6 py-4 font-medium">邮箱后缀</th>
                                                    <th className="px-6 py-4 font-medium">用户群组</th>
                                                    <th className="px-6 py-4 font-medium">状态</th>
                                                    <th className="px-6 py-4 font-medium text-right">操作</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {school.domains.map(domain => (
                                                    <tr key={domain.id} className="border-b border-slate-50 dark:border-slate-800/50 last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                                        <td className="px-6 py-4 font-mono text-slate-600 dark:text-slate-300">@{domain.domain}</td>
                                                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400 capitalize">{domain.emailType}</td>
                                                        <td className="px-6 py-4">
                                                            <Badge variant="outline" className={`border-0 font-medium ${domain.isEnabled ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"}`}>
                                                                {domain.isEnabled ? "白名单" : "拦截"}
                                                            </Badge>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => toggleDomain(domain.id, domain.isEnabled)}
                                                                className={`h-8 font-medium ${domain.isEnabled ? "text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50" : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"}`}
                                                            >
                                                                {domain.isEnabled ? "禁用" : "解禁"}
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </Card>
                    ))}
                </div>

            </div>
        </div>
    );
}
