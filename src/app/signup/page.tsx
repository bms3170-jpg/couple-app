"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSignup(e: FormEvent) {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nickname,
        },
      },
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("회원가입이 완료됐어요. 이메일을 확인해주세요.");
  }

  return (
    <main className="min-h-screen bg-[#fff8fb] text-[#2b2b2b]">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-10">
        <button
          onClick={() => router.back()}
          className="mb-8 w-fit text-sm font-semibold text-gray-500"
        >
          ← 돌아가기
        </button>

        <section>
          <p className="text-sm font-semibold tracking-[0.2em] text-pink-400">
            OURQUEST
          </p>

          <h1 className="mt-2 text-3xl font-bold">처음 만나서 반가워요 ♡</h1>

          <p className="mt-3 text-sm leading-6 text-gray-500">
            둘만의 약속을 만들기 전에
            <br />
            먼저 계정을 만들어주세요.
          </p>

          <form onSubmit={handleSignup} className="mt-10 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold">
                닉네임
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                required
                maxLength={20}
                placeholder="앱에서 사용할 이름"
                className="w-full rounded-2xl border border-pink-100 bg-white px-4 py-4 outline-none transition focus:border-pink-400"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                이메일
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="example@email.com"
                className="w-full rounded-2xl border border-pink-100 bg-white px-4 py-4 outline-none transition focus:border-pink-400"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                비밀번호
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                placeholder="8자 이상 입력"
                className="w-full rounded-2xl border border-pink-100 bg-white px-4 py-4 outline-none transition focus:border-pink-400"
              />
            </div>

            {message && (
              <p className="rounded-xl bg-white px-4 py-3 text-sm text-gray-600">
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-pink-500 px-5 py-4 font-semibold text-white transition hover:bg-pink-600 disabled:opacity-50"
            >
              {loading ? "가입 중..." : "회원가입"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}