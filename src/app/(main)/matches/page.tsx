"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

/* ── Types ── */
interface MatchCard {
    id: string;
    contactStatus: string;
    contactRequesterId: string | null;
    other: { id: string; name: string; avatarUrl: string | null };
    progress: { mine: number; theirs: number; total: number; threshold: number; canRequest: boolean };
    createdAt: string;
}

/* ── Status badge ── */
const statusMeta: Record<string, { label: string; color: string }> = {
    LOCKED: { label: "破冰进行中", color: "#94a3b8" },
    A_REQUESTED: { label: "待对方同意", color: "#f59e0b" },
    B_REQUESTED: { label: "待对方同意", color: "#f59e0b" },
    MUTUAL_ACCEPTED: { label: "✓ 已解锁", color: "#22c55e" },
    REVOKED: { label: "已撤回", color: "#ef4444" },
    BLOCKED: { label: "已拉黑", color: "#64748b" },
};

export default function MatchesPage() {
    const [matches, setMatches] = useState<MatchCard[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch("/api/matches")
            .then((r) => r.json())
            .then((d) => {
                if (d.success) setMatches(d.data.matches);
                else setError(d.error || "加载失败");
            })
            .catch(() => setError("网络错误"))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div style={styles.center}><div style={styles.spinner} /></div>;
    if (error) return <div style={styles.center}><p style={{ color: "#ef4444" }}>{error}</p></div>;

    return (
        <div style={styles.page}>
            <div style={styles.header}>
                <h1 style={styles.title}>💌 我的配对</h1>
                <p style={styles.subtitle}>完成破冰问答后，即可申请交换联系方式</p>
            </div>

            {matches.length === 0 ? (
                <div style={styles.empty}>
                    <p>🐼 还没有配对，等待本周匹配结果吧～</p>
                </div>
            ) : (
                <div style={styles.list}>
                    {matches.map((m) => {
                        const meta = statusMeta[m.contactStatus] ?? { label: m.contactStatus, color: "#94a3b8" };
                        const pct = Math.round((m.progress.mine / m.progress.total) * 100);
                        return (
                            <Link key={m.id} href={`/matches/${m.id}`} style={{ textDecoration: "none" }}>
                                <div style={styles.card}>
                                    <div style={styles.avatar}>
                                        {m.other.avatarUrl ? (
                                            <Image src={m.other.avatarUrl} alt="avatar" width={56} height={56} style={styles.avatarImg} />
                                        ) : (
                                            <div style={styles.avatarPlaceholder}>🐼</div>
                                        )}
                                    </div>
                                    <div style={styles.cardBody}>
                                        <div style={styles.cardTop}>
                                            <span style={styles.name}>{m.other.name}</span>
                                            <span style={{ ...styles.badge, background: meta.color }}>{meta.label}</span>
                                        </div>
                                        <div style={styles.progressWrap}>
                                            <div style={styles.progressBg}>
                                                <div style={{ ...styles.progressFill, width: `${pct}%` }} />
                                            </div>
                                            <span style={styles.progressLabel}>
                                                你已回答 {m.progress.mine}/{m.progress.total} 题
                                                {!m.progress.canRequest && ` · 再答 ${m.progress.threshold - m.progress.mine} 题可申请`}
                                            </span>
                                        </div>
                                        {m.progress.theirs > 0 && (
                                            <span style={styles.hint}>对方已回答 {m.progress.theirs} 题</span>
                                        )}
                                    </div>
                                    <span style={styles.arrow}>›</span>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

/* ── Styles ── */
const styles: Record<string, React.CSSProperties> = {
    page: { minHeight: "100vh", background: "#0f172a", padding: "24px 16px", fontFamily: "'Inter', sans-serif" },
    header: { marginBottom: 24, textAlign: "center" },
    title: { fontSize: 24, fontWeight: 700, color: "#f1f5f9", margin: 0 },
    subtitle: { fontSize: 14, color: "#64748b", marginTop: 6 },
    list: { display: "flex", flexDirection: "column", gap: 12, maxWidth: 600, margin: "0 auto" },
    card: { display: "flex", alignItems: "center", background: "#1e293b", borderRadius: 16, padding: "16px 20px", gap: 16, cursor: "pointer", transition: "all 0.2s", boxShadow: "0 4px 20px rgba(0,0,0,0.3)" },
    avatar: { flexShrink: 0 },
    avatarImg: { borderRadius: "50%", objectFit: "cover" as const },
    avatarPlaceholder: { width: 56, height: 56, borderRadius: "50%", background: "#334155", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 },
    cardBody: { flex: 1, overflow: "hidden" },
    cardTop: { display: "flex", alignItems: "center", gap: 8, marginBottom: 8 },
    name: { fontSize: 16, fontWeight: 600, color: "#f1f5f9" },
    badge: { fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20, color: "#fff" },
    progressWrap: { marginBottom: 4 },
    progressBg: { height: 4, background: "#334155", borderRadius: 99, overflow: "hidden", marginBottom: 4 },
    progressFill: { height: "100%", background: "linear-gradient(90deg,#ec4899,#a855f7)", borderRadius: 99, transition: "width 0.5s" },
    progressLabel: { fontSize: 12, color: "#94a3b8" },
    hint: { fontSize: 11, color: "#64748b" },
    arrow: { fontSize: 20, color: "#475569", flexShrink: 0 },
    empty: { textAlign: "center", color: "#64748b", marginTop: 80, fontSize: 16 },
    center: { display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" },
    spinner: { width: 32, height: 32, border: "3px solid #334155", borderTop: "3px solid #ec4899", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
};
