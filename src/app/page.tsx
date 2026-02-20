import Image from "next/image";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <Image
          className="dark:invert"
          src="/next.svg"
          alt="Next.js logo"
          width={100}
          height={20}
          priority
        />
        <div className="flex flex-col gap-4 text-base font-medium sm:flex-row w-full mt-8">
          <a
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-black text-white transition-colors hover:bg-gray-800"
            href="/questionnaire"
          >
            🐼 去填写问卷 (Kiko 测试)
          </a>
          <a
            className="flex h-12 w-full items-center justify-center rounded-full border border-solid border-gray-300 px-5 transition-colors hover:bg-gray-50 text-gray-800"
            href="/profile"
          >
            🌟 我的星球档案
          </a>
          <a
            className="flex h-12 w-full items-center justify-center rounded-full border border-solid border-pink-200 bg-pink-50 px-5 transition-colors hover:bg-pink-100 text-pink-700 font-bold"
            href="/matching"
          >
            ❤️ 查看本周匹配
          </a>
        </div>
      </main>
    </div>
  );
}
