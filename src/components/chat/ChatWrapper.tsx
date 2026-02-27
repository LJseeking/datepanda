"use client";

import { useEffect, useState, useCallback, ReactNode, Component, ErrorInfo } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

// ---------- Error Boundary ----------
interface EBProps { children: ReactNode; onError: (err: Error) => void }
interface EBState { hasError: boolean }
class ChatErrorBoundary extends Component<EBProps, EBState> {
    constructor(props: EBProps) { super(props); this.state = { hasError: false }; }
    static getDerivedStateFromError() { return { hasError: true }; }
    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error("[ChatErrorBoundary]", error, info);
        this.props.onError(error);
    }
    render() {
        if (this.state.hasError) return null;
        return this.props.children;
    }
}

interface ChatWrapperProps { children: ReactNode; }

export default function ChatWrapper({ children }: ChatWrapperProps) {
    const router = useRouter();
    const [ready, setReady] = useState(false);
    const [sessionProps, setSessionProps] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [SessionComponent, setSessionComponent] = useState<any>(null);

    const initChat = useCallback(async () => {
        setLoading(true);
        setError(null);
        setReady(false);
        try {
            // 1. Fetch token data from our API
            const tokenRes = await fetch("/api/chat/token", {
                cache: "no-store",
                headers: { "Pragma": "no-cache", "Cache-Control": "no-cache" }
            });

            if (!tokenRes.ok) {
                if (tokenRes.status === 401) {
                    console.warn("[ChatWrapper] 401 — redirecting to login");
                    router.push("/login");
                    return;
                }
                const body = await tokenRes.json().catch(() => ({}));
                throw new Error(body?.error || `服务器错误 (${tokenRes.status})`);
            }

            const tokenData = await tokenRes.json();
            const userData = tokenData.user;
            const signature = tokenData.signature;

            if (!userData?.id) {
                throw new Error("API 未返回有效用户信息");
            }

            const appId = process.env.NEXT_PUBLIC_TALKJS_APP_ID;
            if (!appId) {
                throw new Error("系统配置错误: 缺少 TALKJS APP ID");
            }

            // 2. Dynamically import TalkJS (browser-only)
            const Talk = (await import("talkjs")).default;
            await Talk.ready;

            // 3. Construct a proper Talk.User instance
            const talkUser = new Talk.User({
                id: userData.id,
                name: userData.name || "Panda User",
                photoUrl: userData.photoUrl || undefined,
                role: userData.role || "default",
            });

            // 4. Create a real TalkJS Session to set up the Kiko welcome conversation
            const session = new Talk.Session({
                appId,
                me: talkUser,
                signature: signature || undefined,
            });

            // 5. Create Kiko welcome conversation (client-side, guaranteed before Inbox renders)
            try {
                const kikoUser = new Talk.User({
                    id: "system-kiko",
                    name: "Kiko (熊猫助手)",
                    photoUrl: "https://files.oaiusercontent.com/file-K1Fv5c4Z8b3H6Y2N9M7V5X?se=2024-05-18T05%3A36%3A51Z&sp=r&sv=2023-11-03&sr=b&rscc=max-age%3D31536000%2C%20immutable&rscd=attachment%3B%20filename%3D23f03b22-83b5-4a25-a740-1ec62e1050e0.webp&sig=BqQ9C042u7N8kH5N1%2By1m5W6G8Z9X2F5J8k6V3B9N1A%3D", // Cute 3D Panda Avatar
                    role: "system",
                });

                const kikoConv = session.getOrCreateConversation(`welcome_kiko_${userData.id}`);
                kikoConv.setParticipant(talkUser);
                kikoConv.setParticipant(kikoUser);
                kikoConv.setAttributes({
                    subject: "✨ 和 Kiko 聊聊",
                    welcomeMessages: [
                        "🐼 嗨！我是 Kiko，你的专属约会助手。",
                        "在这里，你可以随时向我提问、反馈问题，或者只是无聊时找我聊聊天~",
                        "祝你在 DatePanda 遇见对的人！"
                    ],
                    custom: { category: "support", kikoWelcome: "true" }
                });
                console.log("[ChatWrapper] Kiko welcome conversation created/synced");
            } catch (kikoErr) {
                console.warn("[ChatWrapper] Failed to create Kiko welcome conversation (non-fatal):", kikoErr);
            }

            // 6. Destroy the manual session — the React <Session> component will create its own
            session.destroy();

            // 7. Dynamically import the React Session component
            const { Session: SessionComp } = await import("@talkjs/react");
            setSessionComponent(() => SessionComp);

            setSessionProps({ appId, syncUser: talkUser, signature: signature || undefined });
            setReady(true);
        } catch (err: any) {
            console.error("[ChatWrapper] Failed to initialize TalkJS:", err);
            setError(err instanceof Error ? err.message : "网络异常，无法连接服务器");
        } finally {
            setLoading(false);
        }
    }, [router]);

    useEffect(() => { initChat(); }, [initChat]);

    if (loading) {
        return <div className="p-4 text-center text-slate-500">正在验证通讯凭证...</div>;
    }

    if (error) {
        return (
            <div className="p-6 text-center space-y-4">
                <p className="text-red-500 font-medium">通讯连接失败</p>
                <p className="text-sm text-slate-500">{error}</p>
                <button onClick={initChat} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold shadow transition-all active:scale-95">
                    <RefreshCw className="w-4 h-4" /> 重新连接
                </button>
            </div>
        );
    }

    if (!ready || !SessionComponent || !sessionProps) {
        return (
            <div className="p-6 text-center space-y-4">
                <p className="text-red-500 font-medium">无法获取通讯凭证</p>
                <button onClick={initChat} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold shadow transition-all active:scale-95">
                    <RefreshCw className="w-4 h-4" /> 重试
                </button>
            </div>
        );
    }

    const DynamicSession = SessionComponent;

    return (
        <ChatErrorBoundary onError={(err) => setError(`TalkJS 初始化失败: ${err.message}`)}>
            <DynamicSession
                appId={sessionProps.appId}
                syncUser={sessionProps.syncUser}
                signature={sessionProps.signature}
            >
                {children}
            </DynamicSession>
        </ChatErrorBoundary>
    );
}
