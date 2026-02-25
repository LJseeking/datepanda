"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, LayoutDashboard, Settings, Mail, LogOut, Database } from "lucide-react";
import { cn } from "@/lib/utils/styles";

const navItems = [
    { name: "总览看板", href: "/admin", icon: LayoutDashboard },
    { name: "用户管理", href: "/admin/users", icon: Users },
    { name: "运营控制台", href: "/admin/operations", icon: Database },
    { name: "白名单/邮箱管理", href: "/admin/schools", icon: Mail },
];

export default function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="w-full md:w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col h-auto md:h-screen shrink-0 sticky top-0">
            <div className="p-6">
                <h1 className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                    <span className="text-2xl">🐼</span> 熊猫控制台
                </h1>
                <p className="text-xs text-slate-500 mt-1">DatePanda Admin v1.0</p>
            </div>

            <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== "/admin");
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                                isActive
                                    ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white"
                                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-white"
                            )}
                        >
                            <item.icon className={cn("w-5 h-5", isActive ? "text-emerald-500" : "text-slate-400")} />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800">
                <button
                    onClick={() => {
                        document.cookie = "admin_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                        window.location.href = "/admin/login";
                    }}
                    className="flex w-full items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30 transition-colors"
                >
                    <LogOut className="w-5 h-5" />
                    安全退出
                </button>
            </div>
        </aside>
    );
}
