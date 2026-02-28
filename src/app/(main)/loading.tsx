export default function Loading() {
    return (
        <div
            style={{
                minHeight: "100dvh",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                background: "linear-gradient(135deg, #fff0f5 0%, #fce4ec 100%)",
                fontFamily: "'Inter', 'PingFang SC', sans-serif",
                gap: 16,
            }}
        >
            {/* Panda with pulse */}
            <div style={{ fontSize: 52, animation: "pulse 1.2s ease-in-out infinite" }}>🐼</div>

            <p style={{ fontSize: 15, color: "#888", margin: 0, letterSpacing: 0.5 }}>
                加载中…
            </p>

            {/* Dot row */}
            <div style={{ display: "flex", gap: 6 }}>
                {[0, 1, 2].map((i) => (
                    <span
                        key={i}
                        style={{
                            width: 7,
                            height: 7,
                            borderRadius: "50%",
                            background: "#E91E63",
                            display: "inline-block",
                            animation: `dotBounce 1.2s ${i * 0.2}s ease-in-out infinite`,
                        }}
                    />
                ))}
            </div>

            <style>{`
                @keyframes pulse {
                    0%, 100% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.12); opacity: 0.85; }
                }
                @keyframes dotBounce {
                    0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
                    40% { transform: translateY(-8px); opacity: 1; }
                }
            `}</style>
        </div>
    );
}
