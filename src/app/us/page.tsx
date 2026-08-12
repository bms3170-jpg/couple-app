"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";

import { createClient } from "@/lib/supabase/client";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/components/AuthProvider";

type CoupleInfo = {
  id: string;
  invite_code: string;
  relationship_started_at: string | null;
  level: number;
  xp: number;
  created_at: string;
};

type Member = {
  user_id: string;
  nickname: string;
  avatar_path: string | null;
  avatar_url: string | null;
};

export default function UsPage() {
  const supabase = useMemo(
    () => createClient(),
    []
  );

  // =========================================
  // 공통 로그인 정보
  // =========================================

  const {
    user,
    loading: authLoading,
  } = useAuth();

  // =========================================
  // 페이지 상태
  // =========================================

  const [loading, setLoading] =
    useState(true);

  const [couple, setCouple] =
    useState<CoupleInfo | null>(
      null
    );

  const [members, setMembers] =
    useState<Member[]>([]);

  const [message, setMessage] =
    useState("");

  // =========================================
  // 우리 페이지 데이터 불러오기
  // =========================================

  useEffect(() => {
    let cancelled = false;

    async function loadUs() {
      // AuthProvider가 세션 확인 중이면 기다림
      if (authLoading) {
        return;
      }

      // AuthProvider 확인이 끝났는데 user가 없으면
      // 실제 로그아웃 상태
      if (!user) {
        window.location.href =
          "/login";

        return;
      }

      if (cancelled) return;

      // =====================================
      // 내가 속한 커플
      // =====================================

      const {
        data: membership,
        error: membershipError,
      } = await supabase
        .from("couple_members")
        .select("couple_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (cancelled) return;

      if (membershipError) {
        console.error(
          `멤버십 조회 오류 | message=${membershipError.message} | code=${membershipError.code} | details=${membershipError.details ?? ""} | hint=${membershipError.hint ?? ""}`
        );

        setMessage(
          `커플 정보를 불러오지 못했어요: ${membershipError.message}`
        );

        setLoading(false);
        return;
      }

      if (!membership) {
        setMessage(
          "아직 연결된 커플이 없어요."
        );

        setLoading(false);
        return;
      }

      const coupleId =
        membership.couple_id;

      // =====================================
      // 커플 정보
      // =====================================

      const {
        data: coupleData,
        error: coupleError,
      } = await supabase
        .from("couples")
        .select(`
          id,
          invite_code,
          relationship_started_at,
          level,
          xp,
          created_at
        `)
        .eq("id", coupleId)
        .maybeSingle();

      if (cancelled) return;

      if (coupleError) {
        console.error(
          `커플 정보 조회 오류 | message=${coupleError.message} | code=${coupleError.code} | details=${coupleError.details ?? ""} | hint=${coupleError.hint ?? ""}`
        );

        setMessage(
          `커플 정보를 불러오지 못했어요: ${coupleError.message}`
        );

        setLoading(false);
        return;
      }

      if (!coupleData) {
        console.error(
          `커플 정보 없음 | coupleId=${coupleId}`
        );

        setMessage(
          "커플 정보를 찾을 수 없어요."
        );

        setLoading(false);
        return;
      }

      // =====================================
      // 커플 멤버
      // =====================================

      const {
        data: memberRows,
        error: memberError,
      } = await supabase
        .from("couple_members")
        .select("user_id")
        .eq(
          "couple_id",
          coupleId
        )
        .order("joined_at", {
          ascending: true,
        });

      if (cancelled) return;

      if (memberError) {
        console.error(
          `멤버 조회 오류 | message=${memberError.message} | code=${memberError.code} | details=${memberError.details ?? ""} | hint=${memberError.hint ?? ""}`
        );

        setMessage(
          `멤버 정보를 불러오지 못했어요: ${memberError.message}`
        );

        setLoading(false);
        return;
      }

      const userIds =
        memberRows?.map(
          (item) =>
            item.user_id
        ) ?? [];

      // =====================================
      // 프로필 / 닉네임
      // =====================================

      const {
        data: profileRows,
        error: profileError,
      } = userIds.length
        ? await supabase
            .from("profiles")
            .select(
              "id, nickname, avatar_path"
            )
            .in("id", userIds)
        : {
            data: [],
            error: null,
          };

      if (cancelled) return;

      if (profileError) {
        console.error(
          `프로필 조회 오류 | message=${profileError.message} | code=${profileError.code} | details=${profileError.details ?? ""} | hint=${profileError.hint ?? ""}`
        );

        setMessage(
          `프로필 정보를 불러오지 못했어요: ${profileError.message}`
        );

        setLoading(false);
        return;
      }

      const loadedMembers: Member[] =
        userIds.map(
          (userId) => {
            const profile =
              profileRows?.find(
                (item) =>
                  item.id ===
                  userId
              );

            const avatarPath =
              profile?.avatar_path ??
              null;

            const avatarUrl =
              avatarPath
                ? supabase.storage
                    .from("avatars")
                    .getPublicUrl(
                      avatarPath
                    ).data.publicUrl
                : null;

            return {
              user_id:
                userId,

              nickname:
                profile?.nickname ??
                "이름 없음",

              avatar_path:
                avatarPath,

              avatar_url:
                avatarUrl,
            };
          }
        );

      if (cancelled) return;

      // =====================================
      // 최종 데이터 적용
      // =====================================

      setCouple(
        coupleData as CoupleInfo
      );

      setMembers(
        loadedMembers
      );

      setLoading(false);
    }

    loadUs();

    return () => {
      cancelled = true;
    };
  }, [
    supabase,
    user,
    authLoading,
  ]);

  // =========================================
  // AuthProvider 세션 확인 중
  // =========================================

  if (authLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fff8fb]">
        <p className="text-sm text-gray-500">
          로그인 정보 확인 중...
        </p>
      </main>
    );
  }

  // =========================================
  // 페이지 데이터 로딩 중
  // =========================================

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fff8fb]">
        <p className="text-sm text-gray-500">
          우리 이야기 불러오는 중...
        </p>
      </main>
    );
  }

  // =========================================
  // 표시용 데이터
  // =========================================

  const firstMember =
    members[0] ?? null;

  const secondMember =
    members[1] ?? null;

  const first =
    firstMember?.nickname ??
    "나";

  const second =
    secondMember?.nickname ??
    "파트너";

  const level =
    couple?.level ?? 1;

  const xp =
    couple?.xp ?? 0;

  const xpForNextLevel =
    100 + ((level - 1) * 50);

  const xpPercent =
    Math.min(
      (xp /
        xpForNextLevel) *
        100,
      100
    );

  const coupleTitle =
    level >= 10
      ? "우리의 전설"
      : level >= 7
        ? "환상의 짝꿍"
        : level >= 5
          ? "찰떡 커플"
          : level >= 3
            ? "점점 가까워지는 중"
            : "우리 시작";

  // =========================================
  // D+ 계산
  // =========================================

  let daysTogether:
    | number
    | null = null;

  if (
    couple?.relationship_started_at
  ) {
    const started =
      new Date(
        couple.relationship_started_at
      );

    const today =
      new Date();

    started.setHours(
      0,
      0,
      0,
      0
    );

    today.setHours(
      0,
      0,
      0,
      0
    );

    const diff =
      today.getTime() -
      started.getTime();

    daysTogether =
      Math.floor(
        diff /
          (1000 *
            60 *
            60 *
            24)
      ) + 1;
  }

  // =========================================
  // 초대코드 복사
  // =========================================

  async function copyInviteCode() {
    if (
      !couple?.invite_code
    ) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        couple.invite_code
      );

      setMessage(
        "초대코드를 복사했어요 ♡"
      );
    } catch {
      setMessage(
        "초대코드를 복사하지 못했어요."
      );
    }
  }

  return (
    <main className="min-h-screen bg-[#fff8fb] px-5 py-8 text-[#2b2b2b]">

      <div className="mx-auto max-w-md pb-28">

        {/* =================================
            헤더
        ================================== */}

        <header>

          <p className="text-sm font-semibold tracking-[0.2em] text-pink-400">
            OURQUEST
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            우리 ♡
          </h1>

          <p className="mt-2 text-sm leading-6 text-gray-500">
            함께 지켜온 약속과
            <br />
            우리 둘의 이야기를 모아봤어요.
          </p>

        </header>

        {/* =================================
            커플 카드
        ================================== */}

        <section className="relative mt-7 overflow-hidden rounded-[34px] border border-pink-100 bg-gradient-to-br from-white via-white to-pink-50/80 p-6 shadow-sm">

          <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-pink-100/50 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-10 -left-8 h-24 w-24 rounded-full bg-rose-100/40 blur-2xl" />

          <div className="relative">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold tracking-[0.2em] text-pink-400">
                OUR DAY
              </p>

              <span className="rounded-full bg-white/80 px-3 py-1.5 text-[11px] font-semibold text-pink-400 shadow-sm">
                함께하는 중 ♡
              </span>
            </div>

            <div className="mt-5 flex items-center gap-5">
              <div className="relative h-24 w-36 shrink-0">
                <div className="absolute left-1 top-2 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-pink-50 text-3xl shadow-sm">
                  {firstMember?.avatar_url ? (
                    <img
                      src={firstMember.avatar_url}
                      alt={`${first} 프로필 사진`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span>👤</span>
                  )}
                </div>

                <div className="absolute right-1 top-2 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-pink-50 text-3xl shadow-sm">
                  {secondMember?.avatar_url ? (
                    <img
                      src={secondMember.avatar_url}
                      alt={`${second} 프로필 사진`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span>👤</span>
                  )}
                </div>

                <div className="absolute left-1/2 top-[58px] z-10 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full border-2 border-white bg-pink-100 text-sm shadow-sm">
                  ♡
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-xl font-bold">
                  {first} ♡ {second}
                </p>

                {daysTogether !== null ? (
                  <>
                    <p className="mt-2 text-xs text-gray-400">
                      함께한 지
                    </p>

                    <p className="mt-1 text-4xl font-bold tracking-tight text-pink-500">
                      D+{daysTogether}
                    </p>
                  </>
                ) : (
                  <p className="mt-3 text-sm leading-6 text-gray-400">
                    함께한 날짜는 아직
                    <br />
                    설정하지 않았어요.
                  </p>
                )}
              </div>
            </div>

            {couple?.relationship_started_at && (
              <div className="mt-5 flex items-center justify-between rounded-2xl border border-pink-100 bg-white/80 px-4 py-3">
                <span className="text-xs text-gray-400">
                  우리가 시작한 날
                </span>

                <span className="text-xs font-semibold text-pink-500">
                  {new Date(
                    couple.relationship_started_at
                  ).toLocaleDateString(
                    "ko-KR",
                    {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    }
                  )}
                </span>
              </div>
            )}
          </div>

        </section>

        {/* =================================
            레벨 / XP
        ================================== */}

        <section className="mt-4 overflow-hidden rounded-[30px] border border-pink-100 bg-white p-5 shadow-sm">

          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold tracking-[0.18em] text-pink-400">
                OUR LEVEL
              </p>

              <div className="mt-2 flex items-end gap-2">
                <p className="text-4xl font-bold tracking-tight">
                  LV.{level}
                </p>

                <span className="mb-1 rounded-full bg-pink-50 px-2.5 py-1 text-[11px] font-semibold text-pink-500">
                  {coupleTitle}
                </span>
              </div>
            </div>

            <div className="shrink-0 rounded-2xl bg-[#fff8fb] px-4 py-3 text-right">
              <p className="text-xs text-gray-400">
                현재 XP
              </p>

              <p className="mt-1 text-lg font-bold text-pink-500">
                {xp}
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-2xl bg-[#fff8fb] p-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-gray-500">
                다음 레벨까지
              </span>

              <span className="font-semibold text-pink-500">
                {Math.max(
                  xpForNextLevel -
                    xp,
                  0
                )} XP 남음
              </span>
            </div>

            <div className="mt-3 h-3 overflow-hidden rounded-full bg-pink-100/70">
              <div
                className="h-full rounded-full bg-pink-400 transition-all"
                style={{
                  width:
                    `${xpPercent}%`,
                }}
              />
            </div>

            <div className="mt-2 flex items-center justify-between text-[11px] text-gray-400">
              <span>
                {xp} XP
              </span>

              <span>
                {xpForNextLevel} XP
              </span>
            </div>
          </div>

        </section>

        {/* =================================
            초대 코드
        ================================== */}

        <section className="mt-4 rounded-[28px] border border-pink-100 bg-white p-5 shadow-sm">

          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] text-pink-400">
                INVITE
              </p>

              <p className="mt-1 text-sm font-bold">
                우리의 초대코드
              </p>
            </div>

            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-pink-50 text-lg">
              💌
            </span>
          </div>

          <div className="mt-4 flex items-center gap-3 rounded-2xl bg-[#fff8fb] p-3">
            <div className="min-w-0 flex-1 px-2">
              <p className="truncate text-center text-xl font-bold tracking-[0.22em] text-gray-700">
                {couple
                  ?.invite_code ??
                  "-"}
              </p>
            </div>

            <button
              type="button"
              onClick={
                copyInviteCode
              }
              className="shrink-0 rounded-xl bg-pink-500 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-pink-600 active:scale-[0.98]"
            >
              복사
            </button>
          </div>

          <p className="mt-3 text-center text-[11px] leading-5 text-gray-400">
            초대코드를 공유해 둘만의 공간에 연결할 수 있어요 ♡
          </p>

        </section>

        {/* =================================
            상태 메시지
        ================================== */}

        {message && (
          <div className="mt-4 rounded-2xl border border-pink-100 bg-white/80 px-4 py-3 text-center text-xs text-gray-500 shadow-sm">
            {message}
          </div>
        )}

        {/* =================================
            우리 메뉴
        ================================== */}

        <section className="mt-5">
          <div className="mb-3 flex items-end justify-between">
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] text-pink-400">
                OUR STORY
              </p>
              <h3 className="mt-1 text-lg font-bold">
                우리 이야기
              </h3>
            </div>

            <span className="text-xs text-gray-400">
              둘만의 공간 ♡
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/us/history"
              prefetch={false}
              className="group rounded-[26px] border border-pink-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:bg-pink-50/50 hover:shadow-md"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-pink-50 text-xl">
                📖
              </div>

              <p className="mt-4 font-bold">
                우리 기록
              </p>

              <p className="mt-1 text-xs leading-5 text-gray-400">
                지나온 약속과
                <br />
                인증 모아보기
              </p>

              <div className="mt-4 text-right text-lg text-pink-300 transition group-hover:translate-x-0.5">
                ›
              </div>
            </Link>

            <Link
              href="/us/timeline"
              prefetch={false}
              className="group rounded-[26px] border border-pink-100 bg-gradient-to-br from-white to-pink-50/70 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-pink-100 text-xl">
                💕
              </div>

              <p className="mt-4 font-bold">
                타임라인
              </p>

              <p className="mt-1 text-xs leading-5 text-gray-400">
                처음부터 지금까지
                <br />
                함께 만든 순간들
              </p>

              <div className="mt-4 text-right text-lg text-pink-400 transition group-hover:translate-x-0.5">
                ›
              </div>
            </Link>
          </div>

          <Link
            href="/us/settings"
            prefetch={false}
            className="group mt-3 flex w-full items-center justify-between rounded-[26px] border border-pink-100 bg-white p-4 shadow-sm transition hover:bg-pink-50/50"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-50 text-lg">
                ⚙️
              </div>

              <div>
                <p className="text-sm font-bold">
                  우리 설정
                </p>

                <p className="mt-0.5 text-xs text-gray-400">
                  함께한 날짜와 프로필 관리
                </p>
              </div>
            </div>

            <span className="text-lg text-gray-300 transition group-hover:translate-x-0.5">
              ›
            </span>
          </Link>
        </section>

        {/* =================================
            홈 바로가기
        ================================== */}

        <Link
          href="/couple"
          prefetch={false}
          className="mt-4 block w-full rounded-2xl border border-pink-100 bg-white/80 px-4 py-3.5 text-center text-xs font-semibold text-gray-400 transition hover:bg-pink-50 hover:text-pink-500"
        >
          홈으로 돌아가기
        </Link>

        {/* =================================
            공통 하단 메뉴
        ================================== */}

        <BottomNav />

      </div>

    </main>
  );
}