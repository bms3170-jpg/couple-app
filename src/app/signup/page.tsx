"use client";

import {
  FormEvent,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSignup(e: FormEvent) {
    e.preventDefault();

    const trimmedNickname = nickname.trim();
    const trimmedEmail = email.trim();
    setMessage("");

    if (!trimmedNickname) {
      setMessage("닉네임을 입력해주세요.");
      return;
    }

    if (trimmedNickname.length > 20) {
      setMessage("닉네임은 20자 이하로 입력해주세요.");
      return;
    }

    if (!trimmedEmail) {
      setMessage("이메일을 입력해주세요.");
      return;
    }

    if (password.length < 8) {
      setMessage("비밀번호는 8자 이상 입력해주세요.");
      return;
    }

    if (password !== passwordConfirm) {
      setMessage("비밀번호가 서로 일치하지 않아요.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        data: {
          nickname: trimmedNickname,
        },
      },
    });

    if (error) {
      setLoading(false);
      console.error("회원가입 오류:", error);
      setMessage(`회원가입에 실패했어요: ${error.message}`);
      return;
    }

    if (data.user && data.session) {
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert(
          {
            id: data.user.id,
            nickname: trimmedNickname,
          },
          {
            onConflict: "id",
          }
        );

      if (profileError) {
        console.error("프로필 저장 오류:", profileError);
      }
    }

    setLoading(false);

    if (!data.user) {
      setMessage("회원가입 정보를 확인하지 못했어요.");
      return;
    }

    if (data.session) {
      router.replace("/home");
      router.refresh();
      return;
    }

    setMessage("회원가입이 완료됐어요. 이메일 인증 후 로그인해주세요 ♡");
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
            우리의 이야기를 시작해요 ♡
          </h1>

          <p className="mt-3 text-sm leading-6 text-gray-500">
            계정을 만들고 파트너와 연결해서
            <br />
            둘만의 퀘스트를 시작해요.
          </p>

          <form onSubmit={handleSignup} className="mt-10 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold">닉네임</label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={20}
                required
                placeholder="사용할 닉네임"
                className="w-full rounded-2xl border border-pink-100 bg-white px-4 py-4 outline-none transition focus:border-pink-400"
              />
              <p className="mt-2 text-right text-xs text-gray-400">
                {nickname.length} / 20
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">이메일</label>
              <input
                type="email"
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
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
                placeholder="8자 이상 입력"
                className="w-full rounded-2xl border border-pink-100 bg-white px-4 py-4 outline-none transition focus:border-pink-400"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">비밀번호 확인</label>
              <input
                type="password"
                autoComplete="new-password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                minLength={8}
                required
                placeholder="비밀번호 다시 입력"
                className="w-full rounded-2xl border border-pink-100 bg-white px-4 py-4 outline-none transition focus:border-pink-400"
              />
            </div>

            {message && (
              <p className="rounded-xl border border-pink-100 bg-white px-4 py-3 text-sm leading-6 text-gray-600">
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-pink-500 px-5 py-4 font-semibold text-white transition hover:bg-pink-600 disabled:opacity-50"
            >
              {loading ? "회원가입 중..." : "회원가입"}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-gray-400">
            이미 계정이 있나요?{" "}
            <Link href="/login" className="font-semibold text-pink-500">
              로그인
            </Link>
          </p>

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
