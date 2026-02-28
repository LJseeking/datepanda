"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    const router = useRouter();

    useEffect(() => {
        console.error("[DatePanda Error]", error);
    }, [error]);

    return (
        <div
            style={{
                minHeight: "100dvh",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "24px",
                background: "linear-gradient(135deg, #fff0f5 0%, #fce4ec 100%)",
                fontFamily: "'Inter', 'PingFang SC', sans-serif",
            }}
        >
            {/* Panda icon */}
            <div
                style={{
                    fontSize: 64,
                    marginBottom: 16,
                    animation: "bounce 1.5s infinite",
                }}
            >
                🐼
            </div>

            <h1
                style={{
                    fontSize: 22,
                    fontWeight: 700,
                    color: "#1a1a1a",
                    margin: "0 0 8px",
                    textAlign: "center",
                }}
            >
                哎呀，出了点小状况
            </h1>

            <p
                style={{
                    fontSize: 14,
                    color: "#666",
                    textAlign: "center",
                    marginBottom: 32,
                    maxWidth: 280,
                    lineHeight: 1.6,
                }}
            >
                Kiko 正在处理这个问题，你可以刷新页面重试，或返回首页。
            </p>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
                <button
                    onClick={reset}
                    style={{
                        background: "#E91E63",
                        color: "white",
                        border: "none",
                        borderRadius: 24,
                        padding: "12px 28px",
                        fontSize: 15,
                        fontWeight: 600,
                        cursor: "pointer",
                        boxShadow: "0 4px 14px rgba(233,30,99,0.35)",
                    }}
                >
                    重试
                </button>
                <button
                    onClick={() => router.push("/")}
                    style={{
                        background: "white",
                        color: "#E91E63",
                        border: "2px solid #E91E63",
                        borderRadius: 24,
                        padding: "12px 28px",
                        fontSize: 15,
                        fontWeight: 600,
                        cursor: "pointer",
                    }}
                >
                    返回首页
                </button>
            </div>

            {/* Error digest for debugging (only shown in dev) */}
            {process.env.NODE_ENV === "development" && error.digest && (
                <p
                    style={{
                        marginTop: 24,
                        fontSize: 11,
                        color: "#aaa",
                        fontFamily: "monospace",
                    }}
                >
                    digest: {error.digest}
                </p>
            )}

            <style>{`
                @keyframes bounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-12px); }
                }
            `}</style>
        </div>
    );
}
