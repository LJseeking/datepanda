"use client";

import dynamic from "next/dynamic";
import ChatWrapper from "@/components/chat/ChatWrapper";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";

const TalkJsInbox = dynamic(
    () => import("@talkjs/react").then((mod) => mod.Inbox),
    {
        ssr: false,
        loading: () => (
            <div className="flex w-full h-full items-center justify-center text-slate-400 text-sm">
                正在同步量子信号...
            </div>
        )
    }
);

export default function MessagesPage() {
    return (
        <div className="max-w-4xl mx-auto p-4 md:p-6 h-[calc(100vh-80px)] animate-in fade-in duration-500">
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-xl shadow-emerald-500/5 border border-slate-100 dark:border-slate-800 overflow-hidden h-full flex flex-col relative">

                {/* Header */}
                <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/50 backdrop-blur-sm flex items-center justify-between relative z-10">
                    <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100">
                        量子通讯频道 <Sparkles className="w-5 h-5 text-emerald-500" />
                    </h2>
                    <Badge variant="secondary" className="bg-emerald-50 text-emerald-600 hover:bg-emerald-50 border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800 font-medium tracking-wide">
                        端到端加密安全
                    </Badge>
                </div>

                {/* The Chat Wrapper handles Session and Identity */}
                <ChatWrapper>
                    <div className="flex-1 w-full relative bg-slate-50 dark:bg-slate-950">
                        <TalkJsInbox
                            style={{ width: "100%", height: "100%" }}
                            theme="default"
                            showMobileBackButton={true}
                            loadingComponent={
                                <div className="flex w-full h-full items-center justify-center text-slate-400 text-sm">
                                    正在同步量子信号...
                                </div>
                            }
                        />
                    </div>
                </ChatWrapper>

            </div>
        </div>
    );
}
