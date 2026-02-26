"use client";

import { useEffect, useState, useCallback, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Session } from "@talkjs/react";
import { RefreshCw } from "lucide-react";

interface ChatWrapperProps {
    children: ReactNode;
}

export default function ChatWrapper({ children }: ChatWrapperProps) {
    const router = useRouter();
    const [talkJsUser, setTalkJsUser] = useState<any>(null);
    const [signature, setSignature] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const initChat = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const tokenRes = await fetch("/api/chat/token");

            if (!tokenRes.ok) {
                if (tokenRes.status === 401) {
                    // Not authenticated — redirect to login
                    console.warn("[ChatWrapper] 401 — redirecting to login");
                    router.push("/login");
                    return;
                }
                const body = await tokenRes.json().catch(() => ({}));
                throw new Error(body?.error || `服务器错误 (${tokenRes.status})`);
            }

            const tokenData = await tokenRes.json();
            if (tokenData.user) setTalkJsUser(tokenData.user);
            if (tokenData.signature) setSignature(tokenData.signature);
        } catch (err: any) {
            console.error("[ChatWrapper] Failed to initialize TalkJS:", err);
            setError(err instanceof Error ? err.message : "网络异常，无法连接服务器");
        } finally {
            setLoading(false);
        }
    }, [router]);

    useEffect(() => {
        initChat();
    }, [initChat]);

    if (loading) {
        return <div className="p-4 text-center text-slate-500">正在验证通讯凭证...</div>;
    }

    if (error) {
        return (
            <div className="p-6 text-center space-y-4">
                <p className="text-red-500 font-medium">通讯连接失败</p>
                <p className="text-sm text-slate-500">{error}</p>
                <button
                    onClick={initChat}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold shadow transition-all active:scale-95"
                >
                    <RefreshCw className="w-4 h-4" /> 重新连接
                </button>
            </div>
        );
    }

    if (!talkJsUser) {
        return (
            <div className="p-6 text-center space-y-4">
                <p className="text-red-500 font-medium">无法获取通讯凭证</p>
                <button
                    onClick={initChat}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold shadow transition-all active:scale-95"
                >
                    <RefreshCw className="w-4 h-4" /> 重试
                </button>
            </div>
        );
    }

    const appId = process.env.NEXT_PUBLIC_TALKJS_APP_ID;
    if (!appId) {
        console.warn("TalkJS App ID is missing. Chat will not load.");
        return <div className="p-4 text-center text-red-500">系统配置错误: 缺少通讯组件 Key</div>;
    }

    return (
        <Session
            appId={appId}
            syncUser={talkJsUser}
            signature={signature || undefined}
        >
            {children}
        </Session>
    );
}
