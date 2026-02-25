import { ArrowRight, Sparkles, ShieldCheck, HeartHandshake, GraduationCap, Bot } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-slate-50 dark:bg-slate-950 font-sans relative overflow-x-hidden selection:bg-emerald-200 selection:text-emerald-900">

      {/* Dynamic Background */}
      <div className="absolute top-0 w-full h-[70dvh] bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] inset-0 z-0 opacity-20 pointer-events-none" />
      <div className="absolute top-[-10%] -left-[10%] w-[50vw] h-[50vw] bg-emerald-300/20 rounded-full blur-[100px] z-0 animate-pulse duration-10000 pointer-events-none" />
      <div className="absolute top-[20%] -right-[10%] w-[40vw] h-[40vw] bg-rose-300/20 rounded-full blur-[100px] z-0 animate-pulse duration-7000 pointer-events-none" />

      {/* Main Content Container */}
      <main className="flex-1 flex flex-col items-center pt-20 pb-16 px-4 sm:px-6 relative z-10 w-full max-w-6xl mx-auto">

        {/* Header / Hero Section */}
        <section className="text-center w-full max-w-3xl flex flex-col items-center justify-center space-y-8 mt-8 sm:mt-16 animate-in slide-in-from-bottom-8 fade-in duration-1000">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-400 to-rose-400 rounded-[2.5rem] blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative w-28 h-28 sm:w-32 sm:h-32 bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl border border-white/50 dark:border-slate-800 flex items-center justify-center overflow-hidden transition-transform duration-500 hover:scale-105">
              <Image
                src="/brand/panda-logo-v2.png"
                alt="DatePanda Logo"
                fill
                className="object-cover p-2"
                priority
              />
            </div>
          </div>

          <div className="space-y-4">
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white bg-clip-text text-transparent bg-gradient-to-br from-slate-900 via-slate-800 to-slate-500 dark:from-white dark:via-slate-200 dark:to-slate-400">
              DatePanda
            </h1>
            <div className="text-xl sm:text-2xl font-medium text-slate-600 dark:text-slate-300 max-w-xl mx-auto leading-relaxed flex flex-col gap-1">
              <span>在大学校园里</span>
              <span>遇见三观一致的那个人</span>
              <span className="text-emerald-500 font-semibold opacity-90 text-lg mt-1">（杭州内测版）</span>
            </div>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <Link href="/login" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto h-14 px-8 text-lg rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25 transition-all hover:scale-105 hover:shadow-emerald-500/40 font-semibold gap-2 border-none">
                <Sparkles className="w-5 h-5" />
                开启校园奇遇 (登录/注册)
              </Button>
            </Link>
          </div>
        </section>

        {/* Value Proposition Cards (Glassmorphism) */}
        <section className="w-full grid border-none grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-24 mb-12 animate-in slide-in-from-bottom-12 fade-in duration-1000 delay-300 fill-mode-both">

          {/* Feature 1 */}
          <div className="group relative rounded-3xl p-8 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white/60 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none hover:-translate-y-2 transition-all duration-300">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center mb-6 shadow-inner text-white group-hover:scale-110 transition-transform">
              <GraduationCap className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">专属真实校园</h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              严格的教育邮箱认证体系，专为杭州首批高校学子打造的纯粹净土。没有杂音，只有真实的同学。
            </p>
          </div>

          {/* Feature 2 */}
          <div className="group relative rounded-3xl p-8 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white/60 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none hover:-translate-y-2 transition-all duration-300 delay-100">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center mb-6 shadow-inner text-white group-hover:scale-110 transition-transform">
              <HeartHandshake className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Kiko 灵魂共振</h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              告别“看脸左滑右滑”。首创深度心理学画像体系，每天为你精准推送在精神世界同频共振的人。
            </p>
          </div>

          {/* Feature 3 */}
          <div className="group relative rounded-3xl p-8 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white/60 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none hover:-translate-y-2 transition-all duration-300 delay-200">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center mb-6 shadow-inner text-white group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">多重量子安全</h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              照片隐藏机制（双向喜欢才解锁）、端到端加密消息架构，以及严格的反骚扰风控系统，全方位保护你的隐私。
            </p>
          </div>

          {/* Feature 4: AI Matchmaker */}
          <div className="group relative rounded-3xl p-8 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white/60 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none hover:-translate-y-2 transition-all duration-300 delay-300">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mb-6 shadow-inner text-white group-hover:scale-110 transition-transform">
              <Bot className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">AI 专属智能月老</h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              匹配成功后不知道咋开口？内置聪明的 AI 破冰助手，帮你全方位分析资料并想好第一句话，彻底消除社恐。
            </p>
          </div>

        </section>

      </main>

      {/* Footer */}
      <footer className="w-full pb-8 pt-4 px-6 text-center border-t border-slate-200/50 dark:border-slate-800/50 mt-auto relative z-10">
        <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1.5">
          Powered by DatePanda Intelligence <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
        </p>
      </footer>
    </div>
  );
}
