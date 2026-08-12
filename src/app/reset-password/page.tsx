"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();

  const supabase = useMemo(
    () => createClient(),
    []
  );

  const [password, setPassword] =
    useState("");

  const [
    passwordConfirm,
    setPasswordConfirm,
  ] = useState("");

  const [loading, setLoading] =
    useState(false);

  const [
    checkingSession,
    setCheckingSession,
  ] = useState(true);

  const [message, setMessage] =
    useState("");

  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      const {
        data,
        error,
      } =
        await supabase.auth
          .getSession();

      if (!mounted) {
        return;
      }

      if (error) {
        console.error(
          "비밀번호 재설정 세션 확인 오류:",
          error
        );
      }

      if (!data.session) {
        setMessage(
          "비밀번호 재설정 링크가 만료되었거나 올바르지 않아요."
        );
      }

      setCheckingSession(false);
    }

    checkSession();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  async function handleSubmit(
    e: FormEvent
  ) {
    e.preventDefault();

    if (
      password.length < 8
    ) {
      setMessage(
        "비밀번호는 8자 이상 입력해주세요."
      );
      return;
    }

    if (
      password !==
      passwordConfirm
    ) {
      setMessage(
        "비밀번호가 서로 일치하지 않아요."
      );
      return;
    }

    setLoading(true);
    setMessage("");

    const {
      error,
    } =
      await supabase.auth
        .updateUser({
          password,
        });

    setLoading(false);

    if (error) {
      console.error(
        "비밀번호 변경 오류:",
        error
      );

      setMessage(
        `비밀번호를 변경하지 못했어요: ${error.message}`
      );
      return;
    }

    await supabase.auth.signOut();

    alert(
      "비밀번호를 변경했어요. 새 비밀번호로 로그인해주세요 ♡"
    );

    router.replace(
      "/login"
    );

    router.refresh();
  }

  if (checkingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fff8fb]">
        <p className="text-sm text-gray-500">
          비밀번호 재설정 준비 중...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fff8fb] text-[#2b2b2b]">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-10">

        <button
          type="button"
          onClick={() =>
            router.replace(
              "/login"
            )
          }
          className="mb-8 w-fit text-sm font-semibold text-gray-500"
        >
          ← 로그인으로
        </button>

        <section>

          <p className="text-sm font-semibold tracking-[0.2em] text-pink-400">
            OURQUEST
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            새 비밀번호 만들기 ♡
          </h1>

          <p className="mt-3 text-sm leading-6 text-gray-500">
            앞으로 사용할 새 비밀번호를
            <br />
            입력해주세요.
          </p>

          <form
            onSubmit={
              handleSubmit
            }
            className="mt-10 space-y-5"
          >

            <div>
              <label className="mb-2 block text-sm font-semibold">
                새 비밀번호
              </label>

              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) =>
                  setPassword(
                    e.target.value
                  )
                }
                required
                minLength={8}
                placeholder="8자 이상 입력"
                className="w-full rounded-2xl border border-pink-100 bg-white px-4 py-4 outline-none transition focus:border-pink-400"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                새 비밀번호 확인
              </label>

              <input
                type="password"
                autoComplete="new-password"
                value={
                  passwordConfirm
                }
                onChange={(e) =>
                  setPasswordConfirm(
                    e.target.value
                  )
                }
                required
                minLength={8}
                placeholder="비밀번호 다시 입력"
                className="w-full rounded-2xl border border-pink-100 bg-white px-4 py-4 outline-none transition focus:border-pink-400"
              />
            </div>

            {message && (
              <p className="rounded-xl bg-white px-4 py-3 text-sm text-red-500">
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={
                loading
              }
              className="w-full rounded-2xl bg-pink-500 px-5 py-4 font-semibold text-white transition hover:bg-pink-600 disabled:opacity-50"
            >
              {loading
                ? "변경 중..."
                : "비밀번호 변경"}
            </button>

          </form>

        </section>

      </div>
    </main>
  );
}