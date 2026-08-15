"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";

import { createClient } from "@/lib/supabase/client";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/components/AuthProvider";

type Member = {
  user_id: string;
  nickname: string;
};

type PromiseItem = {
  id: string;
  title: string;
  assigned_to: string;
  is_joint: boolean;
  repeat_type: string;
  current_streak: number;
  best_streak: number;
  total_success: number;
  photo_required: boolean;
  partner_approval_required: boolean;
  is_active: boolean;
  created_at: string;
  deleted_at: string | null;
};

type VerificationRow = {
  promise_id: string;
  user_id: string;
  verification_date: string;
  status: "pending" | "approved" | "rejected";
};

type PromiseReward = {
  id: string;
  promise_id: string | null;
  title: string;
  required_days: number;
  is_unlocked: boolean;
};

type DayInfo = {
  key: string;
  label: string;
  date: Date;
};

const CARD_THEMES = [
  {
    card:
      "border-pink-100 bg-gradient-to-br from-white via-[#fffafd] to-[#fff1f7]",
    stat:
      "bg-pink-50/80",
    accent:
      "text-pink-500",
    progress:
      "from-pink-400 to-fuchsia-400",
    soft:
      "bg-pink-50",
  },
  {
    card:
      "border-emerald-100 bg-gradient-to-br from-white via-[#fbfffd] to-[#effcf6]",
    stat:
      "bg-emerald-50/80",
    accent:
      "text-emerald-600",
    progress:
      "from-emerald-300 to-emerald-500",
    soft:
      "bg-emerald-50",
  },
  {
    card:
      "border-purple-100 bg-gradient-to-br from-white via-[#fdfbff] to-[#f6efff]",
    stat:
      "bg-purple-50/80",
    accent:
      "text-purple-500",
    progress:
      "from-purple-300 to-purple-500",
    soft:
      "bg-purple-50",
  },
  {
    card:
      "border-amber-100 bg-gradient-to-br from-white via-[#fffefa] to-[#fff8e9]",
    stat:
      "bg-amber-50/80",
    accent:
      "text-amber-600",
    progress:
      "from-amber-300 to-orange-400",
    soft:
      "bg-amber-50",
  },
];

function formatDateKey(
  date: Date
) {
  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  ).format(date);
}

function getRecentSevenDays(): DayInfo[] {
  const formatter =
    new Intl.DateTimeFormat(
      "ko-KR",
      {
        timeZone:
          "Asia/Seoul",
        weekday:
          "short",
      }
    );

  const today =
    new Date();

  return Array.from(
    { length: 7 },
    (_, index) => {
      const date =
        new Date(today);

      date.setDate(
        today.getDate() -
          (6 - index)
      );

      return {
        key:
          formatDateKey(date),
        label:
          formatter
            .format(date)
            .replace("요일", ""),
        date,
      };
    }
  );
}

function getNextGoal(
  streak: number
) {
  const milestones = [
    3,
    7,
    14,
    30,
    60,
    100,
  ];

  const found =
    milestones.find(
      (goal) =>
        goal > streak
    );

  if (found) {
    return found;
  }

  return (
    Math.ceil(
      (streak + 1) / 30
    ) * 30
  );
}

export default function PromisesPage() {
  const supabase = useMemo(
    () => createClient(),
    []
  );

  const {
    user,
    loading: authLoading,
  } = useAuth();

  const [loading, setLoading] =
    useState(true);

  const [message, setMessage] =
    useState("");

  const [members, setMembers] =
    useState<Member[]>([]);

  const [promises, setPromises] =
    useState<PromiseItem[]>([]);

  const [
    recentVerifications,
    setRecentVerifications,
  ] = useState<
    VerificationRow[]
  >([]);

  const [
    promiseRewards,
    setPromiseRewards,
  ] = useState<
    PromiseReward[]
  >([]);

  const [
    currentCoupleId,
    setCurrentCoupleId,
  ] = useState<string | null>(
    null
  );

  const [
    endingPromiseId,
    setEndingPromiseId,
  ] = useState<string | null>(
    null
  );

  const [tab, setTab] =
    useState<
      "active" | "ended"
    >("active");

  const [
    expandedPromiseId,
    setExpandedPromiseId,
  ] = useState<string | null>(
    null
  );

  const [
    showPromiseList,
    setShowPromiseList,
  ] = useState(true);

  const recentSevenDays =
    useMemo(
      () =>
        getRecentSevenDays(),
      []
    );

  const loadPromises =
    useCallback(
      async () => {
        if (authLoading) {
          return;
        }

        if (!user) {
          window.location.href =
            "/login";

          return;
        }

        setLoading(true);
        setMessage("");

        const {
          data: membership,
          error: membershipError,
        } = await supabase
          .from("couple_members")
          .select("couple_id")
          .eq(
            "user_id",
            user.id
          )
          .maybeSingle();

        if (membershipError) {
          console.error(
            `멤버십 조회 오류 | message=${membershipError.message} | code=${membershipError.code} | details=${membershipError.details ?? ""} | hint=${membershipError.hint ?? ""}`
          );

          setMessage(
            "커플 정보를 찾을 수 없어요."
          );

          setLoading(false);
          return;
        }

        if (!membership) {
          setMessage(
            "커플 정보를 찾을 수 없어요."
          );

          setLoading(false);
          return;
        }

        const coupleId =
          membership.couple_id;

        setCurrentCoupleId(
          coupleId
        );

        const {
          data: memberRows,
          error: memberError,
        } = await supabase
          .from("couple_members")
          .select("user_id")
          .eq(
            "couple_id",
            coupleId
          );

        if (memberError) {
          console.error(
            `멤버 조회 오류 | message=${memberError.message} | code=${memberError.code} | details=${memberError.details ?? ""} | hint=${memberError.hint ?? ""}`
          );

          setMessage(
            "멤버 정보를 불러오지 못했어요."
          );

          setLoading(false);
          return;
        }

        const userIds =
          memberRows?.map(
            (item) =>
              item.user_id
          ) ?? [];

        const {
          data: profileRows,
          error: profileError,
        } = userIds.length
          ? await supabase
              .from("profiles")
              .select(
                "id, nickname"
              )
              .in(
                "id",
                userIds
              )
          : {
              data: [],
              error: null,
            };

        if (profileError) {
          console.error(
            `프로필 조회 오류 | message=${profileError.message} | code=${profileError.code} | details=${profileError.details ?? ""} | hint=${profileError.hint ?? ""}`
          );

          setMessage(
            "프로필 정보를 불러오지 못했어요."
          );

          setLoading(false);
          return;
        }

        const loadedMembers:
          Member[] =
          userIds.map(
            (userId) => {
              const profile =
                profileRows?.find(
                  (item) =>
                    item.id ===
                    userId
                );

              return {
                user_id:
                  userId,

                nickname:
                  profile?.nickname ??
                  "이름 없음",
              };
            }
          );

        setMembers(
          loadedMembers
        );

        const {
          data: promiseRows,
          error: promiseError,
        } = await supabase
          .from("promises")
          .select(`
            id,
            title,
            assigned_to,
            is_joint,
            repeat_type,
            current_streak,
            best_streak,
            total_success,
            photo_required,
            partner_approval_required,
            is_active,
            created_at,
            deleted_at
          `)
          .eq(
            "couple_id",
            coupleId
          )
          .order(
            "created_at",
            {
              ascending:
                false,
            }
          );

        if (promiseError) {
          console.error(
            `약속 조회 오류 | message=${promiseError.message} | code=${promiseError.code} | details=${promiseError.details ?? ""} | hint=${promiseError.hint ?? ""}`
          );

          setMessage(
            "약속을 불러오지 못했어요."
          );

          setLoading(false);
          return;
        }

        const loadedPromises =
          (promiseRows ??
            []) as PromiseItem[];

        setPromises(
          loadedPromises
        );

        const promiseIds =
          loadedPromises.map(
            (promise) =>
              promise.id
          );

        if (
          promiseIds.length >
          0
        ) {
          const startDate =
            recentSevenDays[0]
              ?.key;

          const {
            data:
              verificationRows,
            error:
              verificationError,
          } = await supabase
            .from(
              "verifications"
            )
            .select(`
              promise_id,
              user_id,
              verification_date,
              status
            `)
            .eq(
              "couple_id",
              coupleId
            )
            .in(
              "promise_id",
              promiseIds
            )
            .gte(
              "verification_date",
              startDate
            );

          if (
            verificationError
          ) {
            console.error(
              "최근 인증 조회 오류:",
              verificationError
            );

            setRecentVerifications(
              []
            );
          } else {
            setRecentVerifications(
              (
                verificationRows ??
                  []
              ) as VerificationRow[]
            );
          }

          const {
            data: rewardRows,
            error: rewardError,
          } = await supabase
            .from("rewards")
            .select(`
              id,
              promise_id,
              title,
              required_days,
              is_unlocked
            `)
            .eq(
              "couple_id",
              coupleId
            )
            .in(
              "promise_id",
              promiseIds
            );

          if (
            rewardError
          ) {
            console.error(
              "약속 보상 조회 오류:",
              rewardError
            );

            setPromiseRewards(
              []
            );
          } else {
            setPromiseRewards(
              (
                rewardRows ??
                  []
              ) as PromiseReward[]
            );
          }
        } else {
          setRecentVerifications(
            []
          );

          setPromiseRewards(
            []
          );
        }

        setLoading(false);
      },
      [
        supabase,
        user,
        authLoading,
        recentSevenDays,
      ]
    );

  useEffect(() => {
    loadPromises();
  }, [loadPromises]);

  async function endPromise(
    promise: PromiseItem
  ) {
    if (!promise.is_active) {
      return;
    }

    if (
      !user ||
      !currentCoupleId
    ) {
      setMessage(
        "커플 정보를 확인하지 못했어요."
      );
      return;
    }

    const confirmed =
      window.confirm(
        `"${promise.title}" 약속을 종료할까요?\n종료된 약속은 기록에 남아요.`
      );

    if (!confirmed) {
      return;
    }

    setEndingPromiseId(
      promise.id
    );

    setMessage("");

    const endedAt =
      new Date().toISOString();

    const {
      data: updatedPromise,
      error: updateError,
    } = await supabase
      .from("promises")
      .update({
        is_active: false,
        deleted_at:
          endedAt,
      })
      .eq(
        "id",
        promise.id
      )
      .eq(
        "couple_id",
        currentCoupleId
      )
      .eq(
        "is_active",
        true
      )
      .select(`
        id,
        title,
        best_streak,
        total_success,
        deleted_at
      `)
      .maybeSingle();

    if (updateError) {
      setEndingPromiseId(
        null
      );

      console.error(
        "약속 종료 오류:",
        updateError
      );

      setMessage(
        `약속을 종료하지 못했어요: ${updateError.message}`
      );

      return;
    }

    if (!updatedPromise) {
      setEndingPromiseId(
        null
      );

      setMessage(
        "약속 상태가 이미 변경됐거나 종료할 약속을 찾지 못했어요."
      );

      await loadPromises();
      return;
    }

    const sourceKey =
      `promise_ended:${promise.id}`;

    const {
      error: timelineError,
    } = await supabase
      .from(
        "couple_timeline_events"
      )
      .insert({
        couple_id:
          currentCoupleId,

        user_id:
          user.id,

        event_type:
          "promise_ended",

        title:
          "📖 약속을 마무리했어요",

        description:
          `${updatedPromise.title} · 최고 연속 ${updatedPromise.best_streak}일 · 총 성공 ${updatedPromise.total_success}일`,

        related_id:
          promise.id,

        image_path:
          null,

        event_date:
          updatedPromise.deleted_at ??
          endedAt,

        source_key:
          sourceKey,
      });

    setEndingPromiseId(
      null
    );

    if (
      timelineError &&
      timelineError.code !==
        "23505"
    ) {
      console.error(
        "약속 종료 타임라인 등록 오류:",
        timelineError
      );

      setMessage(
        "약속은 종료됐지만 타임라인 등록에 실패했어요."
      );

      await loadPromises();
      return;
    }

    setMessage(
      "약속을 종료했고 우리 기록에도 남겼어요 ♡"
    );

    setTab(
      "ended"
    );

    await loadPromises();
  }

  if (
    authLoading ||
    loading
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fff8fb] px-5">
        <div className="w-full max-w-sm rounded-[30px] border border-pink-100 bg-white/90 p-7 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-pink-50 text-2xl">
            💕
          </div>

          <p className="mt-4 text-sm font-black text-gray-600">
            우리의 약속을 불러오는 중...
          </p>

          <p className="mt-2 text-xs text-gray-400">
            함께한 기록을 정리하고 있어요 ♡
          </p>
        </div>
      </main>
    );
  }

  const activePromises =
    promises.filter(
      (promise) =>
        promise.is_active
    );

  const endedPromises =
    promises.filter(
      (promise) =>
        !promise.is_active
    );

  const visiblePromises =
    tab === "active"
      ? activePromises
      : endedPromises;

  function isPromiseSuccessOnDate(
    promise:
      PromiseItem,
    dateKey:
      string
  ) {
    const rows =
      recentVerifications.filter(
        (row) =>
          row.promise_id ===
            promise.id &&
          row.verification_date ===
            dateKey &&
          row.status ===
            "approved"
      );

    if (
      promise.is_joint
    ) {
      return (
        members.length >
          0 &&
        members.every(
          (member) =>
            rows.some(
              (row) =>
                row.user_id ===
                member.user_id
            )
        )
      );
    }

    return rows.some(
      (row) =>
        row.user_id ===
        promise.assigned_to
    );
  }

  function getTodayMemberStatus(
    promise:
      PromiseItem,
    memberId:
      string
  ) {
    const today =
      formatDateKey(
        new Date()
      );

    const row =
      recentVerifications.find(
        (verification) =>
          verification.promise_id ===
            promise.id &&
          verification.user_id ===
            memberId &&
          verification.verification_date ===
            today
      );

    return (
      row?.status ?? null
    );
  }

  function getNextReward(
    promiseId: string
  ) {
    return (
      promiseRewards
        .filter(
          (reward) =>
            reward.promise_id ===
              promiseId &&
            !reward.is_unlocked
        )
        .sort(
          (a, b) =>
            a.required_days -
            b.required_days
        )[0] ??
      null
    );
  }

  return (
    <main className="min-h-screen bg-[#fff8fb] px-5 py-8 text-[#2b2b2b]">

      <div className="mx-auto max-w-md pb-28">

        {/* HEADER */}

        <header className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black tracking-[0.22em] text-pink-400">
              OUR PROMISES
            </p>

            <h1 className="mt-2 text-[30px] font-black tracking-tight">
              우리의 약속
            </h1>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              둘이 함께 키워가는 작은 약속들을 모아봤어요 ♡
            </p>
          </div>

          <Link
            href="/promise/new"
            prefetch={false}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-pink-100 bg-pink-50 text-2xl font-light text-pink-500 shadow-sm transition active:scale-[0.98]"
          >
            +
          </Link>
        </header>

        {/* SUMMARY */}

        <section className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              setTab(
                "active"
              );

              setExpandedPromiseId(
                null
              );
            }}
            className={`rounded-[24px] border p-4 text-left shadow-sm transition ${
              tab ===
              "active"
                ? "border-pink-200 bg-gradient-to-br from-[#fff7fa] to-[#fff1f6]"
                : "border-pink-100 bg-white"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">
                💞
              </div>

              <div>
                <p className="text-sm font-black text-gray-800">
                  진행 중인 약속
                </p>

                <p className="mt-1 text-2xl font-black text-pink-500">
                  {activePromises.length}
                </p>
              </div>
            </div>

            <p className="mt-3 text-[11px] font-semibold text-pink-400">
              함께 지켜가는 중이에요
            </p>
          </button>

          <button
            type="button"
            onClick={() => {
              setTab(
                "ended"
              );

              setExpandedPromiseId(
                null
              );
            }}
            className={`rounded-[24px] border p-4 text-left shadow-sm transition ${
              tab ===
              "ended"
                ? "border-purple-200 bg-gradient-to-br from-[#fbf9ff] to-[#f5f1ff]"
                : "border-purple-100 bg-white"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">
                📖
              </div>

              <div>
                <p className="text-sm font-black text-gray-800">
                  종료된 약속
                </p>

                <p className="mt-1 text-2xl font-black text-purple-500">
                  {endedPromises.length}
                </p>
              </div>
            </div>

            <p className="mt-3 text-[11px] font-semibold text-purple-400">
              기록으로 남겨져 있어요
            </p>
          </button>
        </section>

        {message && (
          <div className="mt-4 rounded-2xl border border-pink-100 bg-white/90 px-4 py-3 text-center text-xs font-semibold text-gray-500 shadow-sm">
            {message}
          </div>
        )}

        {visiblePromises.length ===
        0 ? (
          <section className="mt-6 rounded-[30px] border border-dashed border-pink-200 bg-white p-8 text-center shadow-sm">
            <div className="text-4xl">
              {tab ===
              "active"
                ? "🌱"
                : "📖"}
            </div>

            <h2 className="mt-4 text-lg font-black">
              {tab ===
              "active"
                ? "진행 중인 약속이 없어요"
                : "아직 마무리한 약속이 없어요"}
            </h2>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              {tab ===
              "active" ? (
                <>
                  둘이 함께 이어갈
                  <br />
                  첫 번째 약속을 만들어보세요.
                </>
              ) : (
                <>
                  함께 끝낸 약속이 생기면
                  <br />
                  우리만의 기록으로 남아요.
                </>
              )}
            </p>

            {tab ===
              "active" && (
              <Link
                href="/promise/new"
                prefetch={false}
                className="mt-6 block w-full rounded-2xl bg-gradient-to-r from-pink-500 to-fuchsia-500 px-5 py-4 text-center font-black text-white shadow-sm"
              >
                + 새 약속 만들기
              </Link>
            )}
          </section>
        ) : (
          <section className="mt-6">

            <button
              type="button"
              onClick={() => {
                setShowPromiseList(
                  (prev) => !prev
                );

                if (
                  showPromiseList
                ) {
                  setExpandedPromiseId(
                    null
                  );
                }
              }}
              className="flex w-full items-center justify-between rounded-[24px] border border-pink-100 bg-white px-4 py-3.5 text-left shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
                  tab === "active"
                    ? "bg-pink-50"
                    : "bg-purple-50"
                }`}>
                  {tab ===
                  "active"
                    ? "💕"
                    : "📖"}
                </div>

                <div>
                  <p className="text-sm font-black">
                    {tab ===
                    "active"
                      ? "함께 이어가는 약속"
                      : "우리의 지난 약속"}
                  </p>

                  <p className="mt-0.5 text-[11px] text-gray-400">
                    {visiblePromises.length}개의 기록
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black text-pink-400">
                  {showPromiseList
                    ? "접기"
                    : "보기"}
                </span>

                <span
                  className={`text-gray-300 transition ${
                    showPromiseList
                      ? "rotate-180"
                      : ""
                  }`}
                >
                  ⌄
                </span>
              </div>
            </button>

            {showPromiseList && (
              <div className="mt-4 space-y-4">
                {visiblePromises.map(
                  (
                    promise,
                    index
                  ) => {
                    const assignee =
                      members.find(
                        (member) =>
                          member.user_id ===
                          promise.assigned_to
                      );

                    const repeatLabel =
                      promise.repeat_type ===
                      "daily"
                        ? "매일"
                        : promise.repeat_type ===
                          "weekdays"
                        ? "평일"
                        : "사용자 지정";

                    const theme =
                      CARD_THEMES[
                        index %
                          CARD_THEMES.length
                      ];

                    const recentSuccess =
                      recentSevenDays.map(
                        (day) => ({
                          ...day,
                          success:
                            isPromiseSuccessOnDate(
                              promise,
                              day.key
                            ),
                        })
                      );

                    const weeklySuccessCount =
                      recentSuccess.filter(
                        (day) =>
                          day.success
                      ).length;

                    const weeklyPercent =
                      Math.round(
                        (
                          weeklySuccessCount /
                          7
                        ) * 100
                      );

                    const nextGoal =
                      getNextGoal(
                        promise.current_streak
                      );

                    const remainingDays =
                      Math.max(
                        nextGoal -
                          promise.current_streak,
                        0
                      );

                    const nextReward =
                      getNextReward(
                        promise.id
                      );

                    const startedDays =
                      Math.max(
                        1,
                        Math.floor(
                          (
                            Date.now() -
                            new Date(
                              promise.created_at
                            ).getTime()
                          ) /
                            (
                              1000 *
                              60 *
                              60 *
                              24
                            )
                        ) + 1
                      );

                    return (
                      <article
                        key={
                          promise.id
                        }
                        className={`overflow-hidden rounded-[30px] border p-5 shadow-sm ${theme.card}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`rounded-full px-2.5 py-1 text-[10px] font-black tracking-[0.1em] ${theme.soft} ${theme.accent}`}>
                                {repeatLabel}
                              </span>

                              <span className="text-[11px] font-semibold text-gray-400">
                                {promise.is_joint
                                  ? "💕 우리의 약속"
                                  : `${assignee?.nickname ?? "이름 없음"}님의 약속`}
                              </span>
                            </div>

                            <h2 className="mt-3 break-words text-[22px] font-black leading-7">
                              {promise.title}
                            </h2>

                            <p className="mt-2 text-[11px] font-semibold text-gray-400">
                              {new Date(
                                promise.created_at
                              ).toLocaleDateString(
                                "ko-KR"
                              )}
                              부터 · 함께한 지{" "}
                              {startedDays}일
                            </p>
                          </div>

                          {promise.is_active ? (
                            <div className={`shrink-0 rounded-[18px] px-3 py-2 text-center ${theme.soft}`}>
                              <p className="text-[9px] font-bold text-gray-400">
                                연속
                              </p>

                              <p className={`mt-0.5 text-lg font-black ${theme.accent}`}>
                                🔥{" "}
                                {
                                  promise.current_streak
                                }
                              </p>
                            </div>
                          ) : (
                            <span className="shrink-0 rounded-full bg-gray-100 px-3 py-1.5 text-[10px] font-black text-gray-500">
                              기록 완료
                            </span>
                          )}
                        </div>

                        <div className="mt-4 grid grid-cols-7 gap-1.5 px-1">
                          {recentSuccess.map(
                            (day) => (
                              <div
                                key={day.key}
                                className="text-center"
                              >
                                <p className="text-[9px] font-bold text-gray-400">
                                  {day.label}
                                </p>

                                <div
                                  className={`mx-auto mt-1.5 h-3 w-3 rounded-full ${
                                    day.success
                                      ? "bg-pink-400 shadow-sm"
                                      : "bg-gray-200"
                                  }`}
                                />
                              </div>
                            )
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setExpandedPromiseId(
                              expandedPromiseId ===
                                promise.id
                                ? null
                                : promise.id
                            )
                          }
                          className={`mt-4 w-full rounded-[22px] px-4 py-3.5 text-left ${theme.stat}`}
                        >
                          <div className="grid grid-cols-3 divide-x divide-white/80">
                            <div className="text-center">
                              <p className="text-[9px] font-bold text-gray-400">
                                현재
                              </p>

                              <p className="mt-1 text-sm font-black text-gray-700">
                                🔥{" "}
                                {promise.current_streak}일
                              </p>
                            </div>

                            <div className="text-center">
                              <p className="text-[9px] font-bold text-gray-400">
                                최고
                              </p>

                              <p className="mt-1 text-sm font-black text-gray-700">
                                🏆{" "}
                                {promise.best_streak}일
                              </p>
                            </div>

                            <div className="text-center">
                              <p className="text-[9px] font-bold text-gray-400">
                                성공
                              </p>

                              <p className="mt-1 text-sm font-black text-gray-700">
                                ✓{" "}
                                {promise.total_success}일
                              </p>
                            </div>
                          </div>

                          <div className="mt-3 flex justify-end">
                            <span
                              className={`text-xs text-gray-300 transition ${
                                expandedPromiseId ===
                                promise.id
                                  ? "rotate-180"
                                  : ""
                              }`}
                            >
                              ⌄
                            </span>
                          </div>
                        </button>

                        {expandedPromiseId ===
                          promise.id && (
                          <div className="mt-4 space-y-3">

                            <div className="grid grid-cols-3 overflow-hidden rounded-[22px] border border-pink-100 bg-white/80">
                              <div className="p-3">
                                <p className="text-[9px] font-bold text-gray-400">
                                  이번 주 성공률
                                </p>

                                <p className="mt-1 text-sm font-black text-pink-500">
                                  {weeklySuccessCount} / 7 · {weeklyPercent}%
                                </p>
                              </div>

                              <div className="border-x border-pink-50 p-3">
                                <p className="text-[9px] font-bold text-gray-400">
                                  다음 목표
                                </p>

                                <p className="mt-1 text-sm font-black text-gray-700">
                                  {nextGoal}일
                                </p>

                                <p className="mt-1 text-[10px] text-gray-400">
                                  {remainingDays > 0
                                    ? `앞으로 ${remainingDays}일`
                                    : "목표 달성!"}
                                </p>
                              </div>

                              <div className="p-3">
                                <p className="text-[9px] font-bold text-gray-400">
                                  다음 보상
                                </p>

                                <p className="mt-1 line-clamp-2 text-[11px] font-black text-amber-600">
                                  {nextReward
                                    ? `🎁 ${nextReward.required_days}일 · ${nextReward.title}`
                                    : "보상 준비 중"}
                                </p>
                              </div>
                            </div>

                            {/* 최근 7일 */}

                            <div className="rounded-[22px] border border-white/80 bg-white/70 p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-xs font-black text-gray-700">
                                    최근 7일
                                  </p>

                                  <p className="mt-1 text-[10px] text-gray-400">
                                    이번 주{" "}
                                    {weeklySuccessCount}
                                    /7 ·{" "}
                                    {weeklyPercent}%
                                  </p>
                                </div>

                                <span className={`text-xs font-black ${theme.accent}`}>
                                  {weeklyPercent}%
                                </span>
                              </div>

                              <div className="mt-3 grid grid-cols-7 gap-1.5">
                                {recentSuccess.map(
                                  (day) => (
                                    <div
                                      key={
                                        day.key
                                      }
                                      className="text-center"
                                    >
                                      <p className="text-[9px] font-bold text-gray-400">
                                        {day.label}
                                      </p>

                                      <div
                                        className={`mx-auto mt-2 h-3.5 w-3.5 rounded-full ${
                                          day.success
                                            ? "bg-pink-400 shadow-sm"
                                            : "bg-gray-100"
                                        }`}
                                      />
                                    </div>
                                  )
                                )}
                              </div>

                              <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
                                <div
                                  className={`h-full rounded-full bg-gradient-to-r ${theme.progress}`}
                                  style={{
                                    width:
                                      `${weeklyPercent}%`,
                                  }}
                                />
                              </div>
                            </div>

                            {/* 다음 목표 */}

                            {promise.is_active && (
                              <div className="rounded-[22px] border border-amber-100 bg-amber-50/75 p-4">
                                <div className="flex items-center justify-between gap-3">
                                  <div>
                                    <p className="text-xs font-black text-amber-700">
                                      🎯 다음 목표 {nextGoal}일
                                    </p>

                                    <p className="mt-1 text-[11px] text-amber-600">
                                      {remainingDays >
                                      0
                                        ? `앞으로 ${remainingDays}일 남았어요`
                                        : "목표를 달성했어요!"}
                                    </p>
                                  </div>

                                  <span className="text-xl">
                                    ✨
                                  </span>
                                </div>

                                {nextReward && (
                                  <div className="mt-3 rounded-2xl bg-white/80 px-3 py-2.5">
                                    <p className="text-[10px] font-bold text-gray-400">
                                      NEXT REWARD
                                    </p>

                                    <p className="mt-1 text-xs font-black text-pink-500">
                                      🎁 {nextReward.required_days}일 · {nextReward.title}
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* 공동 약속 오늘 상태 */}

                            {promise.is_joint && (
                              <div className="rounded-[22px] border border-pink-100 bg-white/75 p-4">
                                <p className="text-xs font-black text-gray-700">
                                  💕 오늘 우리 상태
                                </p>

                                <div className="mt-3 grid grid-cols-2 gap-2">
                                  {members.map(
                                    (member) => {
                                      const status =
                                        getTodayMemberStatus(
                                          promise,
                                          member.user_id
                                        );

                                      const label =
                                        status ===
                                        "approved"
                                          ? "✅ 완료"
                                          : status ===
                                            "pending"
                                          ? "🕒 확인 중"
                                          : status ===
                                            "rejected"
                                          ? "↻ 다시 인증"
                                          : "⏳ 아직";

                                      return (
                                        <div
                                          key={
                                            member.user_id
                                          }
                                          className="rounded-2xl bg-pink-50/70 px-3 py-3 text-center"
                                        >
                                          <p className="truncate text-[10px] font-bold text-gray-400">
                                            {member.nickname}
                                          </p>

                                          <p className="mt-1 text-xs font-black text-gray-700">
                                            {label}
                                          </p>
                                        </div>
                                      );
                                    }
                                  )}
                                </div>
                              </div>
                            )}

                            {/* 인증 방식 */}

                            <div className="flex flex-wrap items-center gap-2 px-1 text-[10px] font-bold text-gray-400">
                              {promise.is_joint && (
                                <span className="rounded-full bg-pink-50 px-2.5 py-1 text-pink-500">
                                  💕 공동 약속
                                </span>
                              )}

                              {promise.photo_required && (
                                <span className="rounded-full bg-purple-50 px-2.5 py-1 text-purple-500">
                                  📷 사진 인증
                                </span>
                              )}

                              {promise.partner_approval_required && (
                                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-600">
                                  ♡ 상대 확인
                                </span>
                              )}

                              {!promise.is_joint &&
                                !promise.photo_required &&
                                !promise.partner_approval_required && (
                                  <span className="rounded-full bg-gray-50 px-2.5 py-1 text-gray-500">
                                    ✓ 기본 인증
                                  </span>
                                )}
                            </div>

                            {promise.is_active && (
                              <>
                                <Link
                                  href={`/verify/${promise.id}`}
                                  prefetch={false}
                                  className="block w-full rounded-2xl bg-gradient-to-r from-[#ff7fb1] to-[#f06db8] px-4 py-4 text-center text-sm font-black text-white shadow-sm transition active:scale-[0.99]"
                                >
                                  📸 오늘 인증하기
                                </Link>

                                <button
                                  type="button"
                                  disabled={
                                    endingPromiseId ===
                                    promise.id
                                  }
                                  onClick={() => {
                                    void endPromise(
                                      promise
                                    );
                                  }}
                                  className="w-full px-4 py-3 text-center text-xs font-black text-gray-400 transition active:opacity-60 disabled:opacity-50"
                                >
                                  {endingPromiseId ===
                                  promise.id
                                    ? "약속 마무리 중..."
                                    : "이 약속 마무리하기"}
                                </button>
                              </>
                            )}

                            {!promise.is_active && (
                              <div className="rounded-[22px] border border-purple-100 bg-purple-50/70 p-4">
                                <p className="text-[10px] font-black tracking-[0.14em] text-purple-400">
                                  OUR MEMORY
                                </p>

                                <div className="mt-3 grid grid-cols-3 gap-2">
                                  <div>
                                    <p className="text-[9px] text-gray-400">
                                      함께한 기간
                                    </p>

                                    <p className="mt-1 text-sm font-black">
                                      {startedDays}일
                                    </p>
                                  </div>

                                  <div>
                                    <p className="text-[9px] text-gray-400">
                                      최고 연속
                                    </p>

                                    <p className="mt-1 text-sm font-black">
                                      {promise.best_streak}일
                                    </p>
                                  </div>

                                  <div>
                                    <p className="text-[9px] text-gray-400">
                                      총 성공
                                    </p>

                                    <p className="mt-1 text-sm font-black">
                                      {promise.total_success}일
                                    </p>
                                  </div>
                                </div>

                                {promise.deleted_at && (
                                  <p className="mt-3 text-[10px] text-gray-400">
                                    마무리한 날{" "}
                                    {new Date(
                                      promise.deleted_at
                                    ).toLocaleDateString(
                                      "ko-KR"
                                    )}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </article>
                    );
                  }
                )}
              </div>
            )}
          </section>
        )}

        <BottomNav />
      </div>
    </main>
  );
}
