import { ArrowRight, Leaf, Sparkles, UserCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-gradient-to-b from-emerald-50/50 to-white dark:from-slate-900 dark:to-slate-950 font-sans px-4 sm:px-6 relative overflow-hidden">

      {/* Decorative Background Elements */}
      <div className="absolute top-0 w-full h-[50dvh] bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] -z-10 opacity-20" />
      <div className="absolute top-20 right-10 md:top-32 md:right-32 w-64 h-64 bg-emerald-200/30 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-20 left-10 md:bottom-32 md:left-32 w-64 h-64 bg-rose-200/30 rounded-full blur-3xl -z-10" />

      <main className="flex w-full max-w-xl flex-col items-center justify-center text-center space-y-10 py-16 z-10">

        {/* App Logo / Brand */}
        <div className="space-y-4">
          <div className="mx-auto w-24 h-24 bg-white dark:bg-slate-800 rounded-[2rem] shadow-sm border border-emerald-100 dark:border-slate-700 flex items-center justify-center mb-6 relative overflow-hidden">
            <Image
              src="/brand/panda-logo-v2.png"
              alt="DatePanda Logo"
              width={96}
              height={96}
              className="object-cover"
              priority
            />
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            DatePanda
          </h1>
          <p className="text-lg sm:text-xl text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
            在杭州校园里，遇见聊得来的人
          </p>
        </div>

        {/* Action Cards */}
        <div className="w-full flex flex-col gap-4 mt-8">

          <Link
            href="/questionnaire"
            className="group relative flex items-center justify-between p-5 rounded-2xl bg-emerald-500 text-white shadow-md shadow-emerald-500/20 transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-emerald-500/30 active:scale-[0.98]"
          >
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-2.5 rounded-xl">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <h3 className="text-lg font-bold">进入 Kiko 测试</h3>
                <p className="text-emerald-50 text-sm mt-0.5">用 3 分钟了解你适合谁</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-emerald-100 group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link
            href="/matching"
            className="group relative flex items-center justify-between p-5 rounded-2xl bg-white border border-rose-100 shadow-sm transition-all hover:border-rose-300 hover:shadow-md active:scale-[0.98] dark:bg-slate-800 dark:border-slate-700"
          >
            <div className="flex items-center gap-4">
              <div className="bg-rose-50 p-2.5 rounded-xl dark:bg-rose-900/30">
                <Leaf className="w-6 h-6 text-rose-500" />
              </div>
              <div className="text-left text-slate-800 dark:text-slate-100">
                <h3 className="text-lg font-bold">本周心动瞬间</h3>
                <p className="text-slate-500 text-sm mt-0.5 dark:text-slate-400">看看谁对你发来小信号</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link
            href="/profile"
            className="group relative flex items-center justify-between p-5 rounded-2xl bg-white border border-slate-200 shadow-sm transition-all hover:border-slate-300 hover:shadow-md active:scale-[0.98] dark:bg-slate-800 dark:border-slate-700"
          >
            <div className="flex items-center gap-4">
              <div className="bg-slate-50 p-2.5 rounded-xl dark:bg-slate-700">
                <UserCircle className="w-6 h-6 text-slate-600 dark:text-slate-300" />
              </div>
              <div className="text-left text-slate-800 dark:text-slate-100">
                <h3 className="text-lg font-bold">我的资料卡</h3>
                <p className="text-slate-500 text-sm mt-0.5 dark:text-slate-400">完善信息与校园认证</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </Link>

        </div>

        {/* Footer info */}
        <p className="text-xs text-slate-400 mt-10">
          Powered by DatePanda Intelligence
        </p>

      </main>
    </div>
  );
}
