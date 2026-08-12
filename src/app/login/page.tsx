"use client";

import {
  FormEvent,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();

  const supabase = useMemo(
    () => createClient(),
    []
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"error" | "success">("error");

  async function handleLogin(e: FormEvent) {
    e.preventDefault();

    setLoading(true);
    setMessage("");
    setMessageType("error");

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setLoading(false);
      setMessage("이메일을 입력해주세요.");
      return;
    }

    if (!password) {
      setLoading(false);
      setMessage("비밀번호를 입력해주세요.");
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });

    setLoading(false);

    if (error) {
      console.error(
        `로그인 오류 | message=${error.message} | status=${error.status ?? ""} | code=${error.code ?? ""}`
      );
      setMessage(`로그인 오류: ${error.message}`);
      return;
    }

    if (!data.session) {
      setMessage("로그인 세션을 만들지 못했어요.");
      return;
    }

    router.replace("/home");
    router.refresh();
  }

  async function handlePasswordReset() {
    const trimmedEmail = email.trim();
    setMessage("");

    if (!trimmedEmail) {
      setMessageType("error");
      setMessage("비밀번호를 재설정할 이메일을 먼저 입력해주세요.");
      return;
    }

    setResetLoading(true);

    try {
      const origin = window.location.origin;

      const { error } = await supabase.auth.resetPasswordForEmail(
        trimmedEmail,
        {
          redirectTo: `${origin}/reset-password`,
        }
      );

      if (error) {
        console.error("비밀번호 재설정 메일 오류:", error);
        setMessageType("error");
        setMessage(`재설정 메일을 보내지 못했어요: ${error.message}`);
        return;
      }

      setMessageType("success");
      setMessage("비밀번호 재설정 메일을 보냈어요. 이메일을 확인해주세요 ♡");
    } catch (error) {
      console.error("비밀번호 재설정 처리 오류:", error);
      setMessageType("error");
      setMessage("재설정 메일을 보내는 중 문제가 발생했어요.");
    } finally {
      setResetLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#fff8fb] text-[#2b2b2b]">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-10">
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-8 w-fit text-sm font-semibold text-gray-500"
        >
          ← 돌아가기
        </button>

        <section>
          <p className="text-sm font-semibold tracking-[0.2em] text-pink-400">
            OURQUEST
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            다시 만나서 반가워요 ♡
          </h1>

          <p className="mt-3 text-sm leading-6 text-gray-500">
            로그인하고 우리 둘의 약속을
            <br />
            계속 이어가요.
          </p>

          <form onSubmit={handleLogin} className="mt-10 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold">이메일</label>
              <input
                type="email"
                name="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="example@email.com"
                className="w-full rounded-2xl border border-pink-100 bg-white px-4 py-4 outline-none transition focus:border-pink-400"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">비밀번호</label>
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="비밀번호 입력"
                className="w-full rounded-2xl border border-pink-100 bg-white px-4 py-4 outline-none transition focus:border-pink-400"
              />

              <button
                type="button"
                onClick={handlePasswordReset}
                disabled={resetLoading || loading}
                className="mt-3 block w-full text-right text-sm font-semibold text-pink-400 transition hover:text-pink-500 disabled:opacity-50"
              >
                {resetLoading ? "메일 보내는 중..." : "비밀번호를 잊으셨나요?"}
              </button>
            </div>

            {message && (
              <p
                className={`rounded-xl border px-4 py-3 text-sm leading-6 ${
                  messageType === "success"
                    ? "border-green-100 bg-green-50 text-green-600"
                    : "border-red-100 bg-white text-red-500"
                }`}
              >
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || resetLoading}
              className="w-full rounded-2xl bg-pink-500 px-5 py-4 font-semibold text-white transition hover:bg-pink-600 disabled:opacity-50"
            >
              {loading ? "로그인 중..." : "로그인"}
            </button>
          </form>

          <div className="mt-8 flex items-center justify-center gap-3 text-xs text-gray-400">
            <Link href="/terms" className="transition hover:text-pink-500">
              이용약관
            </Link>
            <span>·</span>
            <Link href="/privacy" className="transition hover:text-pink-500">
              개인정보처리방침
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
