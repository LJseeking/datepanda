"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";

/* ── Types ── */
interface Question {
    id: string; type: "CHOICE" | "TEXT"; prompt: string; options: string[] | null;
    myAnswer: { answerText?: string; answerOption?: string } | null;
    theirAnswer: { answerText?: string; answerOption?: string } | null;
}
interface ContactData { myWechat: string | null; theirWechat: string | null; theirWechatMissing: boolean; tip: string | null; }

const STATUS_COPY: Record<string, { emoji: string; text: string; color: string }> = {
    LOCKED: { emoji: "🔒", text: "完成破冰后即可申请交换联系方式", color: "#94a3b8" },
    A_REQUESTED: { emoji: "⏳", text: "你已发起申请，等待对方同意…", color: "#f59e0b" },
    B_REQUESTED: { emoji: "⏳", text: "你已发起申请，等待对方同意…", color: "#f59e0b" },
    MUTUAL_ACCEPTED: { emoji: "🎉", text: "双方已解锁，可以查看微信了！", color: "#22c55e" },
    REVOKED: { emoji: "↩️", text: "联系方式已撤回，24h冷却中", color: "#ef4444" },
    BLOCKED: { emoji: "🚫", text: "已拉黑此配对", color: "#64748b" },
};

export default function MatchDetailPage() {
    const { id: matchId } = useParams<{ id: string }>();
    const router = useRouter();

    const [questions, setQuestions] = useState<Question[]>([]);
    const [progress, setProgress] = useState({ mine: 0, theirs: 0, total: 8, threshold: 4, canRequest: false });
    const [contactStatus, setContactStatus] = useState("LOCKED");
    const [contactRequesterId, setContactRequesterId] = useState<string | null>(null);
    const [contact, setContact] = useState<ContactData | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [expandedQ, setExpandedQ] = useState<string | null>(null);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [error, setError] = useState<string | null>(null);
    const [myUserId, setMyUserId] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [iceRes, sessionRes] = await Promise.all([
                fetch(`/api/matches/${matchId}/icebreakers`),
                fetch("/api/profile/me"),
            ]);
            const iceData = await iceRes.json();
            const sessionData = await sessionRes.json();
            if (iceData.ok) {
                setQuestions(iceData.data.questions);
                setProgress(iceData.data.progress);
                setContactStatus(iceData.data.contactStatus);
                setContactRequesterId(iceData.data.contactRequesterId);
                // Pre-fill my saved answers
                const prefill: Record<string, string> = {};
                iceData.data.questions.forEach((q: Question) => {
                    if (q.myAnswer) prefill[q.id] = q.myAnswer.answerOption ?? q.myAnswer.answerText ?? "";
                });
                setAnswers(prefill);
            }
            if (sessionData.ok) setMyUserId(sessionData.data.profile?.userId ?? null);
        } catch {
            setError("加载失败，请刷新重试");
        } finally {
            setLoading(false);
        }
    }, [matchId]);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        if (contactStatus === "MUTUAL_ACCEPTED") {
            fetch(`/api/matches/${matchId}/contact`)
                .then(r => r.json())
                .then(d => { if (d.ok) setContact(d.data); });
        }
    }, [contactStatus, matchId]);

    const saveAnswer = async (qid: string, q: Question) => {
        const val = answers[qid];
        if (!val?.trim()) return;
        setSubmitting(true);
        try {
            await fetch(`/api/matches/${matchId}/icebreakers/${qid}/answer`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify(q.type === "CHOICE" ? { answerOption: val } : { answerText: val }),
            });
            await load();
            setExpandedQ(null);
        } finally { setSubmitting(false); }
    };

    const doRequest = async () => {
        setSubmitting(true);
        const r = await fetch(`/api/matches/${matchId}/contact/request`, { method: "POST" });
        const d = await r.json();
        if (d.ok) { setContactStatus(d.data.status); }
        else { alert(d.error?.message || d.error || "申请失败"); }
        setSubmitting(false);
    };

    const doAccept = async () => {
        setSubmitting(true);
        const r = await fetch(`/api/matches/${matchId}/contact/accept`, { method: "POST" });
        const d = await r.json();
        if (d.ok) { setContactStatus("MUTUAL_ACCEPTED"); await load(); }
        else { alert(d.error?.message || d.error); }
        setSubmitting(false);
    };

    const doRevoke = async () => {
        if (!confirm("确认撤回联系方式？撤回后 24 小时内无法再次申请。")) return;
        setSubmitting(true);
        const r = await fetch(`/api/matches/${matchId}/contact/revoke`, { method: "POST" });
        const d = await r.json();
        if (d.ok) { setContactStatus("REVOKED"); setContact(null); }
        else { alert(d.error?.message || d.error); }
        setSubmitting(false);
    };

    const doBlock = async () => {
        if (!confirm("确认拉黑对方？此操作不可逆。")) return;
        setSubmitting(true);
        const r = await fetch(`/api/matches/${matchId}/block`, { method: "POST" });
        const d = await r.json();
        if (d.ok) { setContactStatus("BLOCKED"); }
        else { alert(d.error?.message || d.error); }
        setSubmitting(false);
    };

    const doReport = async () => {
        const reasonCode = prompt("请简述举报原因（如：骚扰/虚假信息/其他）:");
        if (!reasonCode) return;
        const r = await fetch(`/api/matches/${matchId}/report`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reasonCode }),
        });
        const d = await r.json();
        alert(d.ok ? d.data.message : (d.error?.message || d.error));
    };

    // Determine if I am the requester (need CTA to be "waiting" vs "accept")
    const isOtherRequested =
        (contactStatus === "A_REQUESTED" || contactStatus === "B_REQUESTED") &&
        contactRequesterId !== myUserId && myUserId !== null;

    if (loading) return <div style={S.center}><div style={S.spinner} /></div>;
    if (error) return <div style={S.center}><p style={{ color: "#ef4444" }}>{error}</p></div>;

    const meta = STATUS_COPY[contactStatus] ?? { emoji: "?", text: contactStatus, color: "#94a3b8" };
    const pct = Math.round((progress.mine / progress.total) * 100);

    return (
        <div style={S.page}>
            {/* Header */}
            <div style={S.topBar}>
                <button onClick={() => router.back()} style={S.back}>‹ 返回</button>
                <span style={S.topTitle}>破冰问题</span>
                <button onClick={doReport} style={S.reportBtn}>举报</button>
            </div>

            {/* Status Banner */}
            <div style={{ ...S.banner, borderColor: meta.color }}>
                <span style={S.bannerEmoji}>{meta.emoji}</span>
                <span style={{ ...S.bannerText, color: meta.color }}>{meta.text}</span>
            </div>

            {/* Progress */}
            <div style={S.progressBox}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={S.progressLabel}>你的回答进度</span>
                    <span style={S.progressLabel}>{progress.mine}/{progress.total} 题 (需≥{progress.threshold})</span>
                </div>
                <div style={S.progressBg}>
                    <div style={{ ...S.progressFill, width: `${pct}%` }} />
                </div>
                <p style={S.theirProg}>对方已回答 {progress.theirs}/{progress.total} 题</p>
            </div>

            {/* Contact reveal (MUTUAL_ACCEPTED) */}
            {contactStatus === "MUTUAL_ACCEPTED" && contact && (
                <div style={S.contactBox}>
                    <h3 style={S.contactTitle}>🎉 联系方式已解锁</h3>
                    <div style={S.contactRow}>
                        <span style={S.contactKey}>我的微信</span>
                        <span style={S.contactVal}>{contact.myWechat ?? "未填写"}</span>
                    </div>
                    <div style={S.contactRow}>
                        <span style={S.contactKey}>对方微信</span>
                        <span style={S.contactVal}>{contact.theirWechat ?? (contact.tip ?? "对方未填写")}</span>
                    </div>
                    <button onClick={doRevoke} disabled={submitting} style={S.revokeBtn}>撤回联系方式</button>
                </div>
            )}

            {/* Questions */}
            <div style={S.qList}>
                {questions.map((q, i) => {
                    const myVal = answers[q.id] ?? "";
                    const expanded = expandedQ === q.id;
                    const answered = !!q.myAnswer;

                    return (
                        <div key={q.id} style={{ ...S.qCard, ...(answered ? S.qCardAnswered : {}) }}>
                            <button
                                style={S.qHeader}
                                onClick={() => setExpandedQ(expanded ? null : q.id)}
                            >
                                <span style={S.qNum}>{i + 1}</span>
                                <span style={S.qPrompt}>{q.prompt}</span>
                                <span style={{ color: answered ? "#22c55e" : "#64748b" }}>
                                    {answered ? "✓" : "›"}
                                </span>
                            </button>

                            {expanded && (
                                <div style={S.qBody}>
                                    {/* My answer input */}
                                    {q.type === "CHOICE" && q.options ? (
                                        <div style={S.optionList}>
                                            {q.options.map((opt) => (
                                                <button
                                                    key={opt}
                                                    style={{
                                                        ...S.optionBtn,
                                                        ...(myVal === opt ? S.optionSelected : {}),
                                                    }}
                                                    onClick={() => setAnswers({ ...answers, [q.id]: opt })}
                                                >
                                                    {opt}
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <textarea
                                            style={S.textarea}
                                            placeholder="写下你的回答…"
                                            value={myVal}
                                            onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                                            rows={3}
                                        />
                                    )}

                                    <button
                                        style={S.submitBtn}
                                        disabled={submitting || !myVal.trim()}
                                        onClick={() => saveAnswer(q.id, q)}
                                    >
                                        {submitting ? "保存中…" : answered ? "更新回答" : "提交回答"}
                                    </button>

                                    {/* Their answer (revealed once they answered) */}
                                    {q.theirAnswer && (
                                        <div style={S.theirAnswerBox}>
                                            <span style={S.theirAnswerLabel}>对方的回答</span>
                                            <span style={S.theirAnswerText}>
                                                {q.theirAnswer.answerOption ?? q.theirAnswer.answerText}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* CTA Bar */}
            {contactStatus !== "BLOCKED" && (
                <div style={S.cta}>
                    {contactStatus === "LOCKED" || contactStatus === "REVOKED" ? (
                        <button
                            style={{
                                ...S.ctaBtn,
                                ...(progress.canRequest ? S.ctaBtnActive : S.ctaBtnDisabled),
                            }}
                            disabled={!progress.canRequest || submitting}
                            onClick={doRequest}
                            title={!progress.canRequest ? `还需再答 ${progress.threshold - progress.mine} 题` : ""}
                        >
                            {progress.canRequest ? "💌 申请交换联系方式" : `💌 申请（还需回答 ${progress.threshold - progress.mine} 题）`}
                        </button>
                    ) : isOtherRequested ? (
                        <button style={{ ...S.ctaBtn, ...S.ctaBtnActive }} disabled={submitting} onClick={doAccept}>
                            ✅ 对方已申请，点击同意
                        </button>
                    ) : null}

                    <button style={S.blockBtn} disabled={submitting} onClick={doBlock}>
                        🚫 拉黑
                    </button>
                </div>
            )}
        </div>
    );
}

/* ── Styles ── */
const S: Record<string, React.CSSProperties> = {
    page: { minHeight: "100vh", background: "#0f172a", fontFamily: "'Inter', sans-serif", paddingBottom: 100 },
    topBar: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", background: "#1e293b", borderBottom: "1px solid #334155" },
    back: { background: "none", border: "none", color: "#94a3b8", fontSize: 18, cursor: "pointer", padding: 0 },
    topTitle: { color: "#f1f5f9", fontWeight: 600 },
    reportBtn: { background: "none", border: "none", color: "#ef4444", fontSize: 13, cursor: "pointer" },
    banner: { margin: "16px", borderRadius: 12, border: "1px solid", padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 },
    bannerEmoji: { fontSize: 20 },
    bannerText: { fontWeight: 600, fontSize: 14 },
    progressBox: { margin: "0 16px 16px", background: "#1e293b", borderRadius: 12, padding: 16 },
    progressLabel: { fontSize: 12, color: "#94a3b8" },
    progressBg: { height: 6, background: "#334155", borderRadius: 99, overflow: "hidden" },
    progressFill: { height: "100%", background: "linear-gradient(90deg,#ec4899,#a855f7)", borderRadius: 99, transition: "width 0.5s" },
    theirProg: { fontSize: 12, color: "#64748b", margin: "8px 0 0" },
    contactBox: { margin: "0 16px 16px", background: "#1e293b", borderRadius: 12, padding: 16, border: "1px solid #22c55e" },
    contactTitle: { color: "#22c55e", fontSize: 16, fontWeight: 700, margin: "0 0 12px" },
    contactRow: { display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #334155" },
    contactKey: { color: "#94a3b8", fontSize: 14 },
    contactVal: { color: "#f1f5f9", fontWeight: 600, fontSize: 14 },
    revokeBtn: { marginTop: 12, width: "100%", padding: "10px", background: "transparent", border: "1px solid #ef4444", borderRadius: 8, color: "#ef4444", cursor: "pointer", fontSize: 13 },
    qList: { display: "flex", flexDirection: "column", gap: 8, padding: "0 16px" },
    qCard: { background: "#1e293b", borderRadius: 12, overflow: "hidden", border: "1px solid #334155" },
    qCardAnswered: { borderColor: "#4ade8040" },
    qHeader: { width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "none", border: "none", cursor: "pointer", textAlign: "left" as const },
    qNum: { width: 24, height: 24, borderRadius: "50%", background: "#334155", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#94a3b8", flexShrink: 0 },
    qPrompt: { flex: 1, color: "#f1f5f9", fontSize: 14, lineHeight: 1.4 },
    qBody: { padding: "0 16px 16px", borderTop: "1px solid #334155" },
    optionList: { display: "flex", flexDirection: "column" as const, gap: 8, marginTop: 12 },
    optionBtn: { padding: "10px 14px", borderRadius: 8, background: "#334155", border: "none", color: "#cbd5e1", cursor: "pointer", textAlign: "left" as const, fontSize: 14 },
    optionSelected: { background: "#7c3aed", color: "#fff" },
    textarea: { width: "100%", marginTop: 12, padding: "10px", background: "#334155", border: "none", borderRadius: 8, color: "#f1f5f9", fontSize: 14, resize: "vertical" as const, boxSizing: "border-box" as const },
    submitBtn: { marginTop: 10, padding: "10px 20px", background: "linear-gradient(135deg,#ec4899,#a855f7)", border: "none", borderRadius: 8, color: "#fff", fontWeight: 600, cursor: "pointer", width: "100%" },
    theirAnswerBox: { marginTop: 12, padding: "10px 12px", background: "#334155", borderRadius: 8, borderLeft: "3px solid #a855f7" },
    theirAnswerLabel: { display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 4 },
    theirAnswerText: { color: "#e2e8f0", fontSize: 14 },
    cta: { position: "fixed", bottom: 0, left: 0, right: 0, background: "#1e293b", padding: "12px 16px", display: "flex", gap: 10, borderTop: "1px solid #334155" },
    ctaBtn: { flex: 1, padding: "14px", borderRadius: 12, border: "none", fontWeight: 700, fontSize: 15, cursor: "pointer" },
    ctaBtnActive: { background: "linear-gradient(135deg,#ec4899,#a855f7)", color: "#fff" },
    ctaBtnDisabled: { background: "#334155", color: "#475569", cursor: "not-allowed" },
    blockBtn: { padding: "14px 16px", borderRadius: 12, background: "transparent", border: "1px solid #475569", color: "#94a3b8", cursor: "pointer", fontSize: 14 },
    center: { display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" },
    spinner: { width: 32, height: 32, border: "3px solid #334155", borderTop: "3px solid #ec4899", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
};
