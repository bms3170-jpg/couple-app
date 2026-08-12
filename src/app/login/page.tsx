"use client";

import {
  FormEvent,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();

  const supabase = useMemo(
    () => createClient(),
    []
  );

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  async function handleLogin(
    e: FormEvent
  ) {
    e.preventDefault();

    console.log(
      "로그인 버튼 클릭됨"
    );

    setLoading(true);
    setMessage("");

    const {
      data,
      error,
    } =
      await supabase.auth.signInWithPassword(
        {
          email,
          password,
        }
      );

    console.log(
      "로그인 결과:",
      {
        user: data?.user,
        session: data?.session,
        error,
      }
    );

    setLoading(false);

    if (error) {
      console.error(
        `로그인 오류 | message=${error.message} | status=${error.status ?? ""} | code=${error.code ?? ""}`
      );

      setMessage(
        `로그인 오류: ${error.message}`
      );

      return;
    }

    if (!data.session) {
      console.error(
        "로그인 성공 응답은 왔지만 session이 없습니다."
      );

      setMessage(
        "로그인 세션을 만들지 못했어요."
      );

      return;
    }

    console.log(
      "로그인 성공"
    );

    console.log(
      "로그인 사용자:",
      data.user?.id
    );

    router.replace(
      "/home"
    );

    router.refresh();
  }

  return (
    <main className="min-h-screen bg-[#fff8fb] text-[#2b2b2b]">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-10">

        <button
          type="button"
          onClick={() =>
            router.back()
          }
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

          <form
            onSubmit={handleLogin}
            className="mt-10 space-y-5"
          >

            <div>
              <label className="mb-2 block text-sm font-semibold">
                이메일
              </label>

              <input
                type="email"
                name="email"
                autoComplete="email"
                value={email}
                onChange={(e) =>
                  setEmail(
                    e.target.value
                  )
                }
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
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) =>
                  setPassword(
                    e.target.value
                  )
                }
                required
                placeholder="비밀번호 입력"
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
              onClick={() => {
                console.log(
                  "로그인 버튼 직접 클릭"
                );
              }}
              disabled={loading}
              className="w-full rounded-2xl bg-pink-500 px-5 py-4 font-semibold text-white transition hover:bg-pink-600 disabled:opacity-50"
            >
              {loading
                ? "로그인 중..."
                : "로그인"}
            </button>

          </form>

        </section>

      </div>
    </main>
  );
}