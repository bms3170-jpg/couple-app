import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#fff8fb] text-[#2b2b2b]">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-between px-6 py-10">
        <section className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-white text-4xl shadow-sm">
            ♡
          </div>

          <p className="mb-2 text-sm font-semibold tracking-[0.2em] text-pink-400">
            OUR LITTLE PROMISE
          </p>

          <h1 className="text-4xl font-bold tracking-tight">
            OurQuest
          </h1>

          <p className="mt-5 max-w-xs text-base leading-7 text-gray-500">
            우리 둘만의 작은 약속,
            <br />
            함께 지켜가는 이야기
          </p>

          <div className="mt-10 w-full space-y-3">
            <Link
              href="/signup"
              className="block w-full rounded-2xl bg-pink-500 px-5 py-4 text-center text-base font-semibold text-white shadow-sm transition hover:bg-pink-600"
            >
              시작하기
            </Link>

            <Link
              href="/login"
              className="block w-full rounded-2xl border border-pink-100 bg-white px-5 py-4 text-center text-base font-semibold text-gray-700 transition hover:bg-pink-50"
            >
              로그인
            </Link>
          </div>
        </section>

        <footer className="pt-8 text-center text-xs text-gray-400">
          약속을 지키고, 추억을 쌓고, 함께 성장해요.
        </footer>
      </div>
    </main>
  );
}