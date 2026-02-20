"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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
        // Use the schools PATCH endpoint
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

    const styles = {
        page: { fontFamily: "system-ui, sans-serif", maxWidth: 1000, margin: "0 auto", padding: "2rem 1rem", color: "#1a1a1a" } as React.CSSProperties,
        header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" } as React.CSSProperties,
        card: { background: "#fff", borderRadius: 12, border: "1px solid #e8e8e8", padding: "1.5rem", marginBottom: "1.5rem" } as React.CSSProperties,
        table: { width: "100%", borderCollapse: "collapse" as const, fontSize: 14 },
        th: { textAlign: "left" as const, padding: "8px 12px", background: "#f7f7f7", fontWeight: 600, color: "#555", borderBottom: "1px solid #eee" },
        td: { padding: "8px 12px", borderBottom: "1px solid #f0f0f0" },
        badge: (enabled: boolean): React.CSSProperties => ({
            display: "inline-block", padding: "2px 10px", borderRadius: 999,
            fontSize: 12, fontWeight: 600,
            background: enabled ? "#d4edda" : "#f8d7da",
            color: enabled ? "#155724" : "#721c24",
        }),
        btn: (variant: "primary" | "danger" | "secondary"): React.CSSProperties => ({
            padding: "5px 12px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500,
            background: variant === "primary" ? "#000" : variant === "danger" ? "#e53e3e" : "#e9e9e9",
            color: variant === "secondary" ? "#333" : "#fff",
        }),
        input: { padding: "8px 10px", borderRadius: 6, border: "1px solid #ddd", fontSize: 14, marginRight: 8 } as React.CSSProperties,
        select: { padding: "8px 10px", borderRadius: 6, border: "1px solid #ddd", fontSize: 14, marginRight: 8 } as React.CSSProperties,
    };

    return (
        <div style={styles.page}>
            <div style={styles.header}>
                <h1 style={{ margin: 0, fontSize: 24 }}>🐼 学校邮箱域名管理</h1>
                <button style={styles.btn("secondary")} onClick={logout}>退出登录</button>
            </div>

            {msg && (
                <div style={{
                    padding: "10px 14px", borderRadius: 8, marginBottom: "1rem",
                    background: msg.startsWith("✓") ? "#d4edda" : "#f8d7da",
                    color: msg.startsWith("✓") ? "#155724" : "#721c24", fontSize: 14
                }}>
                    {msg}
                    <button onClick={() => setMsg("")} style={{ float: "right", border: "none", background: "none", cursor: "pointer", color: "inherit" }}>×</button>
                </div>
            )}

            {/* Add School */}
            <div style={styles.card}>
                <h2 style={{ margin: "0 0 1rem", fontSize: 16 }}>新增学校</h2>
                <form onSubmit={addSchool} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <input style={styles.input} placeholder="学校名称" value={newSchool.name}
                        onChange={e => setNewSchool(s => ({ ...s, name: e.target.value }))} required />
                    <input style={{ ...styles.input, width: 80 }} placeholder="城市码 hz" value={newSchool.cityCode}
                        onChange={e => setNewSchool(s => ({ ...s, cityCode: e.target.value }))} />
                    <button type="submit" style={styles.btn("primary")}>添加学校</button>
                </form>
            </div>

            {/* Add Domain */}
            <div style={styles.card}>
                <h2 style={{ margin: "0 0 1rem", fontSize: 16 }}>新增域名</h2>
                <form onSubmit={addDomain} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <input style={styles.input} placeholder="domain (e.g. zju.edu.cn)" value={newDomain.domain}
                        onChange={e => setNewDomain(d => ({ ...d, domain: e.target.value }))} required />
                    <select style={styles.select} value={newDomain.schoolId}
                        onChange={e => setNewDomain(d => ({ ...d, schoolId: e.target.value }))} required>
                        <option value="">选择学校</option>
                        {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <select style={styles.select} value={newDomain.emailType}
                        onChange={e => setNewDomain(d => ({ ...d, emailType: e.target.value }))}>
                        <option value="student">student</option>
                        <option value="staff">staff</option>
                    </select>
                    <button type="submit" style={styles.btn("primary")}>添加域名</button>
                </form>
            </div>

            {/* Schools & Domains Table */}
            {loading ? <p>加载中…</p> : schools.map(school => (
                <div key={school.id} style={styles.card}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                        <h2 style={{ margin: 0, fontSize: 17 }}>
                            {school.name}
                            <span style={{ ...styles.badge(school.isEnabled), marginLeft: 10 }}>
                                {school.isEnabled ? "启用" : "停用"}
                            </span>
                        </h2>
                        <button
                            style={styles.btn(school.isEnabled ? "danger" : "primary")}
                            onClick={() => toggleSchool(school.id, school.isEnabled)}
                        >
                            {school.isEnabled ? "停用整校" : "启用整校"}
                        </button>
                    </div>
                    {school.domains.length === 0 ? (
                        <p style={{ color: "#999", fontSize: 13 }}>暂无域名</p>
                    ) : (
                        <table style={styles.table}>
                            <thead>
                                <tr>
                                    <th style={styles.th}>域名</th>
                                    <th style={styles.th}>类型</th>
                                    <th style={styles.th}>状态</th>
                                    <th style={styles.th}>操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                {school.domains.map(domain => (
                                    <tr key={domain.id}>
                                        <td style={styles.td}><code>{domain.domain}</code></td>
                                        <td style={styles.td}>{domain.emailType}</td>
                                        <td style={styles.td}>
                                            <span style={styles.badge(domain.isEnabled)}>
                                                {domain.isEnabled ? "启用" : "停用"}
                                            </span>
                                        </td>
                                        <td style={styles.td}>
                                            <button
                                                style={styles.btn(domain.isEnabled ? "danger" : "secondary")}
                                                onClick={() => toggleDomain(domain.id, domain.isEnabled)}
                                            >
                                                {domain.isEnabled ? "停用" : "启用"}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            ))}
        </div>
    );
}
