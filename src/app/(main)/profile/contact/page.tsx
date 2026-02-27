"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ContactSettingsPage() {
    const router = useRouter();
    const [wechatId, setWechatId] = useState("");
    const [saved, setSaved] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        fetch("/api/profile/contact")
            .then(r => r.json())
            .then(d => {
                if (d.success) {
                    setSaved(d.data.wechatId);
                    setWechatId(d.data.wechatId ?? "");
                }
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    const handleSave = async () => {
        if (!wechatId.trim() || wechatId.trim().length < 2) {
            setError("微信号至少需要 2 个字符");
            return;
        }
        setSaving(true);
        setError(null);
        setSuccess(false);
        try {
            const r = await fetch("/api/profile/contact", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ wechatId: wechatId.trim() }),
            });
            const d = await r.json();
            if (d.success) {
                setSaved(wechatId.trim());
                setSuccess(true);
                setTimeout(() => setSuccess(false), 3000);
            } else {
                setError(d.error || "保存失败");
            }
        } catch {
            setError("网络错误，请重试");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={S.page}>
            <div style={S.topBar}>
                <button onClick={() => router.back()} style={S.back}>‹ 返回</button>
                <span style={S.topTitle}>联系方式设置</span>
                <span />
            </div>

            <div style={S.content}>
                <div style={S.hero}>
                    <div style={S.heroIcon}>💬</div>
                    <h2 style={S.heroTitle}>填写你的微信号</h2>
                    <p style={S.heroSub}>
                        只有在配对双方互相同意交换联系方式后，对方才能看到你的微信号。
                        <br />微信号会 <strong>加密存储</strong>，不会被泄露。
                    </p>
                </div>

                <div style={S.card}>
                    <label style={S.label}>微信号</label>
                    {loading ? (
                        <div style={S.loadingLine} />
                    ) : (
                        <input
                            style={S.input}
                            type="text"
                            placeholder="输入你的微信号…"
                            value={wechatId}
                            onChange={e => { setWechatId(e.target.value); setSuccess(false); }}
                            maxLength={30}
                            autoComplete="off"
                        />
                    )}

                    {saved && !success && (
                        <p style={S.savedHint}>当前已保存：{saved}</p>
                    )}

                    {error && <p style={S.errorMsg}>⚠️ {error}</p>}
                    {success && <p style={S.successMsg}>✅ 已保存！</p>}

                    <button
                        style={{ ...S.saveBtn, ...(saving ? S.saveBtnDisabled : {}) }}
                        onClick={handleSave}
                        disabled={saving || loading}
                    >
                        {saving ? "保存中…" : "保存微信号"}
                    </button>
                </div>

                <div style={S.notice}>
                    <p style={S.noticeTitle}>📋 关于联系方式</p>
                    <ul style={S.noticeList}>
                        <li>完成至少 4 道破冰问题后，才可申请交换联系方式</li>
                        <li>需要双方互相确认才会解锁</li>
                        <li>任一方均可随时撤回，撤回后 24 小时才能再次申请</li>
                        <li>如遇骚扰，可通过配对详情页举报对方</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}

const S: Record<string, React.CSSProperties> = {
    page: { minHeight: "100vh", background: "#0f172a", fontFamily: "'Inter', sans-serif" },
    topBar: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", background: "#1e293b", borderBottom: "1px solid #334155" },
    back: { background: "none", border: "none", color: "#94a3b8", fontSize: 18, cursor: "pointer", padding: 0 },
    topTitle: { color: "#f1f5f9", fontWeight: 600 },
    content: { maxWidth: 480, margin: "0 auto", padding: "24px 16px" },
    hero: { textAlign: "center", marginBottom: 24 },
    heroIcon: { fontSize: 48, marginBottom: 12 },
    heroTitle: { fontSize: 22, fontWeight: 700, color: "#f1f5f9", margin: "0 0 8px" },
    heroSub: { fontSize: 14, color: "#94a3b8", lineHeight: 1.6 },
    card: { background: "#1e293b", borderRadius: 16, padding: "20px", marginBottom: 20 },
    label: { display: "block", fontSize: 12, color: "#64748b", marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: 1 },
    input: { width: "100%", padding: "12px 14px", background: "#334155", border: "1px solid #475569", borderRadius: 10, color: "#f1f5f9", fontSize: 16, boxSizing: "border-box" as const, outline: "none" },
    loadingLine: { height: 44, background: "#334155", borderRadius: 10, animation: "pulse 1.5s infinite" },
    savedHint: { fontSize: 12, color: "#64748b", marginTop: 6 },
    errorMsg: { fontSize: 13, color: "#ef4444", marginTop: 8 },
    successMsg: { fontSize: 13, color: "#22c55e", marginTop: 8 },
    saveBtn: { marginTop: 16, width: "100%", padding: "14px", background: "linear-gradient(135deg,#ec4899,#a855f7)", border: "none", borderRadius: 10, color: "#fff", fontWeight: 700, fontSize: 16, cursor: "pointer" },
    saveBtnDisabled: { opacity: 0.6, cursor: "not-allowed" },
    notice: { background: "#1e293b", borderRadius: 12, padding: "16px 20px" },
    noticeTitle: { fontSize: 14, fontWeight: 600, color: "#94a3b8", margin: "0 0 10px" },
    noticeList: { margin: 0, paddingLeft: 20, color: "#64748b", fontSize: 13, lineHeight: 1.8 },
};
