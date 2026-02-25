"use client";
import { useState, FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function AdminLoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirect = searchParams.get("redirect") || "/admin/schools";
    const [token, setToken] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError("");
        // Set admin_token cookie via a simple API call
        const res = await fetch("/api/admin/auth", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ token }),
        });
        setLoading(false);
        if (res.ok) {
            router.push(redirect);
        } else {
            setError("Token 无效，请重试");
        }
    }

    return (
        <form onSubmit={handleSubmit}>
            <label style={{ display: "block", marginBottom: 6, fontSize: 14, color: "#555" }}>Admin Token</label>
            <input
                type="password"
                value={token}
                onChange={e => setToken(e.target.value)}
                placeholder="输入管理员 Token"
                style={{
                    width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #ddd",
                    fontSize: 15, boxSizing: "border-box", marginBottom: "1rem"
                }}
                required
                autoFocus
            />
            {error && <p style={{ color: "#e53e3e", fontSize: 13, marginBottom: "1rem" }}>{error}</p>}
            <button
                type="submit"
                disabled={loading}
                style={{
                    width: "100%", padding: "10px", borderRadius: 8, border: "none",
                    background: loading ? "#ccc" : "#000", color: "#fff", fontSize: 15,
                    cursor: loading ? "default" : "pointer", fontWeight: 600
                }}
            >
                {loading ? "验证中…" : "登录"}
            </button>
        </form>
    );
}

export default function AdminLoginPage() {
    return (
        <div style={{
            minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
            background: "#f5f5f5", fontFamily: "system-ui, sans-serif"
        }}>
            <div style={{
                background: "#fff", borderRadius: 12, padding: "2rem 2.5rem",
                boxShadow: "0 4px 24px rgba(0,0,0,0.1)", width: 360
            }}>
                <h1 style={{ margin: "0 0 1.5rem", fontSize: 22, fontWeight: 700 }}>🐼 DatePanda Admin</h1>
                <Suspense fallback={<div style={{ textAlign: "center", padding: "20px", color: "#666" }}>载入中...</div>}>
                    <AdminLoginForm />
                </Suspense>
            </div>
        </div>
    );
}
