"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";

export default function HomePage() {
  const router = useRouter();

  const supabase = useMemo(
    () => createClient(),
    []
  );

  const {
    user,
    loading: authLoading,
  } = useAuth();

  const [nickname, setNickname] =
    useState("");

  const [inviteCode, setInviteCode] =
    useState("");

  const [createdCode, setCreatedCode] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [creating, setCreating] =
    useState(false);

  const [joining, setJoining] =
    useState(false);

  const [message, setMessage] =
    useState("");

  // =========================================
  // 사용자 / 커플 정보 불러오기
  // =========================================

  useEffect(() => {
    let cancelled = false;

    async function loadUser() {
      // AuthProvider가 세션 확인 중이면 기다림
      if (authLoading) {
        return;
      }

      // 세션 확인이 끝났는데 user가 없을 때만 로그인 이동
      if (!user) {
        router.replace("/login");
        return;
      }

      // =========================================
      // 내 프로필
      // =========================================

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("nickname")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) return;

      if (profileError) {
        console.error(
          `프로필 조회 오류 | message=${profileError.message} | code=${profileError.code} | details=${profileError.details ?? ""} | hint=${profileError.hint ?? ""}`
        );
      }

      if (
        profile?.nickname &&
        !cancelled
      ) {
        setNickname(
          profile.nickname
        );
      }

      // =========================================
      // 이미 커플에 연결되어 있는지 확인
      // =========================================

      const {
        data: memberships,
        error: membershipError,
      } = await supabase
        .from("couple_members")
        .select("couple_id")
        .eq("user_id", user.id);

      if (cancelled) return;

      if (membershipError) {
        console.error(
          `멤버십 조회 오류 | message=${membershipError.message} | code=${membershipError.code} | details=${membershipError.details ?? ""} | hint=${membershipError.hint ?? ""}`
        );

        if (!cancelled) {
          setMessage(
            `커플 정보를 불러오지 못했어요: ${membershipError.message}`
          );

          setLoading(false);
        }

        return;
      }

      // 이미 커플이면 couple 페이지로 이동
      if (
        memberships &&
        memberships.length > 0
      ) {
        router.replace(
          "/couple"
        );

        return;
      }

      if (cancelled) return;

      setLoading(false);
    }

    loadUser();

    return () => {
      cancelled = true;
    };
  }, [
    authLoading,
    user,
    router,
    supabase,
  ]);

  // =========================================
  // 새로운 커플 생성
  // =========================================

  async function handleCreateCouple() {
    if (!user) {
      setMessage(
        "로그인 정보를 확인할 수 없어요."
      );

      return;
    }

    setCreating(true);
    setMessage("");

    const {
      data,
      error,
    } = await supabase.rpc(
      "create_couple",
      {
        p_relationship_started_at:
          null,
      }
    );

    setCreating(false);

    if (error) {
      console.error(
        `커플 생성 오류 | message=${error.message}`
      );

      setMessage(
        error.message
      );

      return;
    }

    const result =
      data?.[0];

    if (!result) {
      setMessage(
        "초대코드를 만들지 못했어요."
      );

      return;
    }

    setCreatedCode(
      result.invite_code
    );
  }

  // =========================================
  // 초대코드로 커플 연결
  // =========================================

  async function handleJoinCouple() {
    if (!user) {
      setMessage(
        "로그인 정보를 확인할 수 없어요."
      );

      return;
    }

    const code =
      inviteCode.trim();

    if (!code) {
      setMessage(
        "초대코드를 입력해주세요."
      );

      return;
    }

    setJoining(true);
    setMessage("");

    const { error } =
      await supabase.rpc(
        "join_couple",
        {
          p_invite_code:
            code,
        }
      );

    setJoining(false);

    if (error) {
      console.error(
        `커플 연결 오류 | message=${error.message}`
      );

      setMessage(
        error.message
      );

      return;
    }

    router.replace(
      "/couple"
    );

    router.refresh();
  }

  // =========================================
  // 초대코드 복사
  // =========================================

  async function copyInviteCode() {
    if (!createdCode) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        createdCode
      );

      setMessage(
        "초대코드를 복사했어요."
      );
    } catch {
      setMessage(
        "초대코드를 복사하지 못했어요."
      );
    }
  }

  // =========================================
  // 로딩
  // =========================================

  if (
    authLoading ||
    loading
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fff8fb]">
        <p className="text-sm text-gray-500">
          불러오는 중...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fff8fb] px-6 py-10 text-[#2b2b2b]">

      <div className="mx-auto max-w-md">

        <p className="text-sm font-semibold tracking-[0.2em] text-pink-400">
          OURQUEST
        </p>

        <h1 className="mt-2 text-3xl font-bold">
          {nickname
            ? `${nickname}님, `
            : ""}
          우리 둘을 연결해요 ♡
        </h1>

        <p className="mt-4 leading-7 text-gray-500">
          파트너와 연결하면 둘만의 약속과
          <br />
          인증 기록을 함께 만들 수 있어요.
        </p>

        {/* =========================================
            새로운 우리 만들기
        ========================================== */}

        <section className="mt-10 rounded-3xl border border-pink-100 bg-white p-6 shadow-sm">

          <div className="text-center">

            <div className="text-4xl">
              💕
            </div>

            <h2 className="mt-4 text-xl font-bold">
              새로운 우리 만들기
            </h2>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              초대코드를 만들어
              <br />
              파트너에게 보내주세요.
            </p>

          </div>

          {!createdCode ? (

            <button
              type="button"
              onClick={
                handleCreateCouple
              }
              disabled={
                creating
              }
              className="mt-6 w-full rounded-2xl bg-pink-500 px-5 py-4 font-semibold text-white transition hover:bg-pink-600 disabled:opacity-50"
            >
              {creating
                ? "만드는 중..."
                : "우리 만들기"}
            </button>

          ) : (

            <div className="mt-6">

              <p className="text-center text-sm text-gray-500">
                우리의 초대코드
              </p>

              <div className="mt-3 rounded-2xl bg-[#fff8fb] px-4 py-5 text-center">

                <p className="text-2xl font-bold tracking-[0.25em]">
                  {createdCode}
                </p>

              </div>

              <button
                type="button"
                onClick={
                  copyInviteCode
                }
                className="mt-3 w-full rounded-2xl border border-pink-200 bg-white px-5 py-4 font-semibold text-pink-500 transition hover:bg-pink-50"
              >
                코드 복사하기
              </button>

              <p className="mt-3 text-center text-xs leading-5 text-gray-400">
                상대방이 회원가입 후 이 코드를 입력하면
                <br />
                같은 OurQuest에 연결돼요.
              </p>

            </div>

          )}

        </section>

        {/* =========================================
            초대코드 입력
        ========================================== */}

        {!createdCode && (
          <>

            <div className="my-8 flex items-center gap-4">

              <div className="h-px flex-1 bg-pink-100" />

              <span className="text-xs text-gray-400">
                또는
              </span>

              <div className="h-px flex-1 bg-pink-100" />

            </div>

            <section className="rounded-3xl border border-pink-100 bg-white p-6 shadow-sm">

              <h2 className="text-lg font-bold">
                초대코드가 있나요?
              </h2>

              <p className="mt-2 text-sm text-gray-500">
                파트너가 보내준 코드를 입력해주세요.
              </p>

              <input
                type="text"
                name="inviteCode"
                value={
                  inviteCode
                }
                onChange={(e) =>
                  setInviteCode(
                    e.target.value.toUpperCase()
                  )
                }
                maxLength={8}
                placeholder="예: ABCD1234"
                className="mt-5 w-full rounded-2xl border border-pink-100 bg-[#fff8fb] px-4 py-4 text-center text-lg font-bold uppercase tracking-[0.2em] outline-none transition focus:border-pink-400"
              />

              <button
                type="button"
                onClick={
                  handleJoinCouple
                }
                disabled={
                  joining
                }
                className="mt-3 w-full rounded-2xl bg-[#2b2b2b] px-5 py-4 font-semibold text-white disabled:opacity-50"
              >
                {joining
                  ? "연결 중..."
                  : "연결하기"}
              </button>

            </section>

          </>
        )}

        {/* =========================================
            메시지
        ========================================== */}

        {message && (
          <p className="mt-6 rounded-2xl bg-white px-4 py-3 text-center text-sm text-gray-600">
            {message}
          </p>
        )}

      </div>

    </main>
  );
}