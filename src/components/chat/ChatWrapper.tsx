"use client";

import { useEffect, useState, ReactNode } from "react";
import { Session } from "@talkjs/react";

interface ChatWrapperProps {
    children: ReactNode;
}

export default function ChatWrapper({ children }: ChatWrapperProps) {
    const [talkJsUser, setTalkJsUser] = useState<any>(null);
    const [signature, setSignature] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function initChat() {
            try {
                const tokenRes = await fetch("/api/chat/token");
                if (tokenRes.ok) {
                    const tokenData = await tokenRes.json();
                    if (tokenData.user) setTalkJsUser(tokenData.user);
                    if (tokenData.signature) setSignature(tokenData.signature);
                }
            } catch (err) {
                console.error("Failed to initialize TalkJS:", err);
            } finally {
                setLoading(false);
            }
        }

        initChat();
    }, []);

    if (loading) return <div className="p-4 text-center text-slate-500">正在验证通讯凭证...</div>;

    if (!talkJsUser) {
        return <div className="p-4 text-center text-red-500">无法获取通讯凭证，请重试 ({signature === null ? "无签名" : "无用户"})</div>;
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
