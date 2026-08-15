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

type RecentMoment = {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  event_date: string;
};

type NextLevelReward = {
  id: string;
  unlock_level: number;
  title: string;
  description: string | null;
};

type CoupleStats = {
  approvedVerifications: number;
  unlockedRewards: number;
  usedRewards: number;
};

type AnniversaryInfo = {
  label: string;
  date: Date;
  daysLeft: number;
};

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function diffDays(from: Date, to: Date) {
  const ms =
    startOfDay(to).getTime() -
    startOfDay(from).getTime();

  return Math.ceil(
    ms /
      (1000 * 60 * 60 * 24)
  );
}

function formatKoreanDate(
  value: string | Date
) {
  const date =
    value instanceof Date
      ? value
      : new Date(value);

  return date.toLocaleDateString(
    "ko-KR",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
    }
  );
}

function getRelativeDayLabel(
  value: string
) {
  const date =
    startOfDay(new Date(value));

  const today =
    startOfDay(new Date());

  const diff =
    Math.floor(
      (
        today.getTime() -
        date.getTime()
      ) /
        (
          1000 *
          60 *
          60 *
          24
        )
    );

  if (diff <= 0) {
    return "오늘";
  }

  if (diff === 1) {
    return "어제";
  }

  return `${diff}일 전`;
}

function getNextAnniversary(
  relationshipStartedAt: string | null
): AnniversaryInfo | null {
  if (!relationshipStartedAt) {
    return null;
  }

  const started =
    startOfDay(
      new Date(
        relationshipStartedAt
      )
    );

  const today =
    startOfDay(new Date());

  const candidates:
    AnniversaryInfo[] = [];

  const currentTogetherDays =
    Math.floor(
      (
        today.getTime() -
        started.getTime()
      ) /
        (
          1000 *
          60 *
          60 *
          24
        )
    ) + 1;

  const nextHundred =
    Math.max(
      100,
      Math.ceil(
        currentTogetherDays /
          100
      ) * 100
    );

  const hundredDate =
    new Date(started);

  hundredDate.setDate(
    hundredDate.getDate() +
      nextHundred -
      1
  );

  candidates.push({
    label:
      `${nextHundred}일`,
    date:
      hundredDate,
    daysLeft:
      diffDays(
        today,
        hundredDate
      ),
  });

  const yearsTogether =
    today.getFullYear() -
    started.getFullYear();

  for (
    let yearOffset =
      Math.max(
        1,
        yearsTogether
      );
    yearOffset <=
    yearsTogether + 2;
    yearOffset += 1
  ) {
    const anniversary =
      new Date(
        started.getFullYear() +
          yearOffset,
        started.getMonth(),
        started.getDate()
      );

    if (
      anniversary.getTime() >=
      today.getTime()
    ) {
      candidates.push({
        label:
          `${yearOffset}주년`,
        date:
          anniversary,
        daysLeft:
          diffDays(
            today,
            anniversary
          ),
      });
    }
  }

  return (
    candidates
      .filter(
        (item) =>
          item.daysLeft >= 0
      )
      .sort(
        (a, b) =>
          a.daysLeft -
          b.daysLeft
      )[0] ?? null
  );
}

export default function UsPage() {
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

  const [couple, setCouple] =
    useState<CoupleInfo | null>(
      null
    );

  const [members, setMembers] =
    useState<Member[]>([]);

  const [message, setMessage] =
    useState("");

  const [
    recentMoment,
    setRecentMoment,
  ] =
    useState<RecentMoment | null>(
      null
    );

  const [
    nextLevelReward,
    setNextLevelReward,
  ] =
    useState<NextLevelReward | null>(
      null
    );

  const [
    stats,
    setStats,
  ] =
    useState<CoupleStats>({
      approvedVerifications: 0,
      unlockedRewards: 0,
      usedRewards: 0,
    });

  useEffect(() => {
    let cancelled = false;

    async function loadUs() {
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

      if (cancelled) {
        return;
      }

      if (
        membershipError ||
        !membership
      ) {
        console.error(
          "멤버십 조회 오류:",
          membershipError
        );

        setMessage(
          membershipError
            ? `커플 정보를 불러오지 못했어요: ${membershipError.message}`
            : "아직 연결된 커플이 없어요."
        );

        setLoading(false);
        return;
      }

      const coupleId =
        membership.couple_id;

      const [
        coupleResult,
        memberResult,
        recentMomentResult,
        verificationCountResult,
        unlockedRewardCountResult,
        usedRewardCountResult,
      ] = await Promise.all([
        supabase
          .from("couples")
          .select(`
            id,
            invite_code,
            relationship_started_at,
            level,
            xp,
            created_at
          `)
          .eq(
            "id",
            coupleId
          )
          .maybeSingle(),

        supabase
          .from("couple_members")
          .select(
            "user_id, joined_at"
          )
          .eq(
            "couple_id",
            coupleId
          )
          .order(
            "joined_at",
            {
              ascending: true,
            }
          ),

        supabase
          .from(
            "couple_timeline_events"
          )
          .select(`
            id,
            title,
            description,
            event_type,
            event_date
          `)
          .eq(
            "couple_id",
            coupleId
          )
          .order(
            "event_date",
            {
              ascending: false,
            }
          )
          .limit(1)
          .maybeSingle(),

        supabase
          .from(
            "verifications"
          )
          .select(
            "id",
            {
              count: "exact",
              head: true,
            }
          )
          .eq(
            "couple_id",
            coupleId
          )
          .eq(
            "status",
            "approved"
          ),

        supabase
          .from("rewards")
          .select(
            "id",
            {
              count: "exact",
              head: true,
            }
          )
          .eq(
            "couple_id",
            coupleId
          )
          .eq(
            "is_unlocked",
            true
          ),

        supabase
          .from("rewards")
          .select(
            "id",
            {
              count: "exact",
              head: true,
            }
          )
          .eq(
            "couple_id",
            coupleId
          )
          .eq(
            "is_used",
            true
          ),
      ]);

      if (cancelled) {
        return;
      }

      if (
        coupleResult.error ||
        !coupleResult.data
      ) {
        console.error(
          "커플 정보 조회 오류:",
          coupleResult.error
        );

        setMessage(
          coupleResult.error
            ? `커플 정보를 불러오지 못했어요: ${coupleResult.error.message}`
            : "커플 정보를 찾을 수 없어요."
        );

        setLoading(false);
        return;
      }

      if (memberResult.error) {
        console.error(
          "멤버 조회 오류:",
          memberResult.error
        );

        setMessage(
          `멤버 정보를 불러오지 못했어요: ${memberResult.error.message}`
        );

        setLoading(false);
        return;
      }

      const userIds =
        memberResult.data?.map(
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
              "id, nickname, avatar_path"
            )
            .in(
              "id",
              userIds
            )
        : {
            data: [],
            error: null,
          };

      if (cancelled) {
        return;
      }

      if (profileError) {
        console.error(
          "프로필 조회 오류:",
          profileError
        );

        setMessage(
          `프로필 정보를 불러오지 못했어요: ${profileError.message}`
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

            const avatarPath =
              profile?.avatar_path ??
              null;

            const avatarUrl =
              avatarPath
                ? supabase.storage
                    .from(
                      "avatars"
                    )
                    .getPublicUrl(
                      avatarPath
                    ).data
                    .publicUrl
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

      const loadedCouple =
        coupleResult.data as CoupleInfo;

      const {
        data: nextLevelRewardRow,
        error: nextLevelRewardError,
      } = await supabase
        .from(
          "level_rewards"
        )
        .select(`
          id,
          unlock_level,
          title,
          description
        `)
        .eq(
          "couple_id",
          coupleId
        )
        .gt(
          "unlock_level",
          loadedCouple.level ??
            1
        )
        .order(
          "unlock_level",
          {
            ascending: true,
          }
        )
        .limit(1)
        .maybeSingle();

      if (
        nextLevelRewardError
      ) {
        console.error(
          "다음 레벨 보상 조회 오류:",
          nextLevelRewardError
        );
      }

      if (
        recentMomentResult.error
      ) {
        console.error(
          "최근 타임라인 조회 오류:",
          recentMomentResult.error
        );
      }

      if (
        verificationCountResult.error
      ) {
        console.error(
          "인증 통계 조회 오류:",
          verificationCountResult.error
        );
      }

      if (
        unlockedRewardCountResult.error
      ) {
        console.error(
          "해금 보상 통계 조회 오류:",
          unlockedRewardCountResult.error
        );
      }

      if (
        usedRewardCountResult.error
      ) {
        console.error(
          "사용 보상 통계 조회 오류:",
          usedRewardCountResult.error
        );
      }

      if (cancelled) {
        return;
      }

      setCouple(
        loadedCouple
      );

      setMembers(
        loadedMembers
      );

      setRecentMoment(
        recentMomentResult.data
          ? recentMomentResult.data as RecentMoment
          : null
      );

      setNextLevelReward(
        nextLevelRewardRow
          ? nextLevelRewardRow as NextLevelReward
          : null
      );

      setStats({
        approvedVerifications:
          verificationCountResult.count ??
          0,

        unlockedRewards:
          unlockedRewardCountResult.count ??
          0,

        usedRewards:
          usedRewardCountResult.count ??
          0,
      });

      setLoading(false);
    }

    void loadUs();

    return () => {
      cancelled = true;
    };
  }, [
    supabase,
    user,
    authLoading,
  ]);

  if (
    authLoading ||
    loading
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fff8fb]">
        <p className="text-sm text-gray-500">
          우리 이야기 불러오는 중...
        </p>
      </main>
    );
  }

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
    100 +
    (
      level - 1
    ) *
      50;

  const xpPercent =
    Math.min(
      (
        xp /
        xpForNextLevel
      ) *
        100,
      100
    );

  const remainingXp =
    Math.max(
      xpForNextLevel -
        xp,
      0
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

  let daysTogether:
    | number
    | null = null;

  if (
    couple
      ?.relationship_started_at
  ) {
    const started =
      startOfDay(
        new Date(
          couple.relationship_started_at
        )
      );

    const today =
      startOfDay(new Date());

    daysTogether =
      Math.floor(
        (
          today.getTime() -
          started.getTime()
        ) /
          (
            1000 *
            60 *
            60 *
            24
          )
      ) + 1;
  }

  const nextAnniversary =
    getNextAnniversary(
      couple
        ?.relationship_started_at ??
        null
    );

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
            HEADER
        ================================== */}

        <header>
          <p className="text-xs font-black tracking-[0.22em] text-pink-400">
            OURQUEST
          </p>

          <h1 className="mt-2 text-[32px] font-black tracking-tight">
            우리 ♡
          </h1>

          <p className="mt-2 text-sm leading-6 text-gray-500">
            함께 쌓아온 시간과
            <br />
            우리 둘만의 이야기를 모아봤어요.
          </p>
        </header>

        {/* =================================
            OUR DAY HERO
        ================================== */}

        <section className="relative mt-7 overflow-hidden rounded-[34px] border border-pink-100 bg-gradient-to-br from-white via-[#fffafd] to-[#fff4f8] p-6 shadow-sm">
          <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-pink-100/60 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-12 -left-12 h-36 w-36 rounded-full bg-rose-100/50 blur-3xl" />

          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <p className="text-xs font-black tracking-[0.2em] text-pink-400">
                OUR DAY
              </p>

              <span className="rounded-full border border-pink-100 bg-white/85 px-3 py-1.5 text-[11px] font-black text-pink-400 shadow-sm">
                함께하는 중 ♡
              </span>
            </div>

            <div className="mt-5 flex items-center gap-4">
              <div className="relative h-24 w-[138px] shrink-0">
                <div className="absolute left-0 top-1 flex h-[82px] w-[82px] items-center justify-center overflow-hidden rounded-full border-4 border-white bg-gradient-to-br from-pink-50 to-purple-50 text-3xl shadow-sm">
                  {firstMember
                    ?.avatar_url ? (
                    <img
                      src={
                        firstMember.avatar_url
                      }
                      alt={`${first} 프로필 사진`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span>
                      👤
                    </span>
                  )}
                </div>

                <div className="absolute right-0 top-1 flex h-[82px] w-[82px] items-center justify-center overflow-hidden rounded-full border-4 border-white bg-gradient-to-br from-purple-50 to-pink-50 text-3xl shadow-sm">
                  {secondMember
                    ?.avatar_url ? (
                    <img
                      src={
                        secondMember.avatar_url
                      }
                      alt={`${second} 프로필 사진`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span>
                      👤
                    </span>
                  )}
                </div>

                <div className="absolute left-1/2 top-[62px] z-10 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full border-2 border-white bg-pink-100 text-sm font-black text-pink-500 shadow-sm">
                  ♡
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-black">
                  {first} ♡ {second}
                </p>

                {daysTogether !==
                null ? (
                  <>
                    <p className="mt-2 text-xs font-semibold text-gray-400">
                      우리가 함께한 시간
                    </p>

                    <p className="mt-1 text-[38px] font-black tracking-tight text-pink-500">
                      D+
                      {
                        daysTogether
                      }
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

            {couple
              ?.relationship_started_at && (
              <div className="mt-5 flex items-center justify-between rounded-[20px] border border-pink-100 bg-white/75 px-4 py-3">
                <span className="text-xs font-semibold text-gray-400">
                  우리가 시작한 날
                </span>

                <span className="text-xs font-black text-pink-500">
                  {formatKoreanDate(
                    couple.relationship_started_at
                  )}
                </span>
              </div>
            )}
          </div>
        </section>

        {/* =================================
            ANNIVERSARY + STATS
        ================================== */}

        <section className="mt-4 grid grid-cols-[1.05fr_0.95fr] gap-3">
          <div className="rounded-[28px] border border-amber-100 bg-gradient-to-br from-white to-[#fff9eb] p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-xl">
                🎂
              </div>

              <span className="text-[10px] font-black tracking-[0.12em] text-amber-500">
                NEXT DAY
              </span>
            </div>

            <p className="mt-4 text-xs font-semibold text-gray-400">
              다음 기념일
            </p>

            {nextAnniversary ? (
              <>
                <p className="mt-1 text-xl font-black">
                  {
                    nextAnniversary.label
                  }
                </p>

                <p className="mt-1 text-2xl font-black text-amber-500">
                  D-
                  {
                    nextAnniversary.daysLeft
                  }
                </p>

                <p className="mt-2 text-[11px] leading-5 text-gray-400">
                  {formatKoreanDate(
                    nextAnniversary.date
                  )}
                </p>
              </>
            ) : (
              <p className="mt-3 text-sm leading-6 text-gray-400">
                시작일을 설정하면
                <br />
                자동으로 계산해요.
              </p>
            )}
          </div>

          <div className="rounded-[28px] border border-pink-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-pink-50 text-xl">
                ✨
              </div>

              <span className="text-[10px] font-black tracking-[0.12em] text-pink-400">
                RECORD
              </span>
            </div>

            <p className="mt-4 text-xs font-semibold text-gray-400">
              함께 만든 기록
            </p>

            <div className="mt-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  인증
                </span>

                <span className="text-sm font-black">
                  {
                    stats.approvedVerifications
                  }
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  해금 보상
                </span>

                <span className="text-sm font-black">
                  {
                    stats.unlockedRewards
                  }
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  사용 보상
                </span>

                <span className="text-sm font-black">
                  {
                    stats.usedRewards
                  }
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* =================================
            LEVEL
        ================================== */}

        <section className="mt-4 overflow-hidden rounded-[30px] border border-purple-100 bg-gradient-to-br from-white via-white to-purple-50/55 p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-black tracking-[0.18em] text-purple-400">
                OUR LEVEL
              </p>

              <div className="mt-2 flex items-end gap-2">
                <p className="text-[38px] font-black tracking-tight">
                  LV.
                  {
                    level
                  }
                </p>

                <span className="mb-1 rounded-full bg-purple-50 px-2.5 py-1 text-[11px] font-black text-purple-500">
                  {
                    coupleTitle
                  }
                </span>
              </div>
            </div>

            <div className="shrink-0 rounded-2xl bg-white/80 px-4 py-3 text-right shadow-sm">
              <p className="text-xs font-semibold text-gray-400">
                현재 XP
              </p>

              <p className="mt-1 text-lg font-black text-purple-500">
                {
                  xp
                }
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-[22px] border border-purple-100 bg-white/75 p-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-black text-gray-500">
                다음 레벨까지
              </span>

              <span className="font-black text-purple-500">
                {
                  remainingXp
                }{" "}
                XP 남음
              </span>
            </div>

            <div className="mt-3 h-3 overflow-hidden rounded-full bg-purple-100/70">
              <div
                className="h-full rounded-full bg-gradient-to-r from-purple-300 to-pink-400 transition-all"
                style={{
                  width:
                    `${xpPercent}%`,
                }}
              />
            </div>

            <div className="mt-2 flex items-center justify-between text-[11px] text-gray-400">
              <span>
                {
                  xp
                }{" "}
                XP
              </span>

              <span>
                {
                  xpForNextLevel
                }{" "}
                XP
              </span>
            </div>
          </div>

          <div className="mt-3 rounded-[22px] border border-amber-100 bg-gradient-to-r from-[#fffaf0] to-white p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-xl">
                🎁
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black tracking-[0.14em] text-amber-500">
                  NEXT LEVEL REWARD
                </p>

                {nextLevelReward ? (
                  <>
                    <p className="mt-1 truncate text-sm font-black">
                      LV.
                      {
                        nextLevelReward.unlock_level
                      }{" "}
                      ·{" "}
                      {
                        nextLevelReward.title
                      }
                    </p>

                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-400">
                      {
                        nextLevelReward.description ??
                        "다음 레벨에서 특별한 보상이 열려요 ♡"
                      }
                    </p>
                  </>
                ) : (
                  <p className="mt-1 text-xs leading-5 text-gray-400">
                    현재 등록된 다음 레벨 보상이 없어요.
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* =================================
            RECENT MOMENT
        ================================== */}

        <section className="mt-5">
          <div className="mb-3 flex items-end justify-between">
            <div>
              <p className="text-xs font-black tracking-[0.18em] text-pink-400">
                RECENT MOMENT
              </p>

              <h2 className="mt-1 text-lg font-black">
                최근 우리 순간
              </h2>
            </div>

            <Link
              href="/us/timeline"
              prefetch={false}
              className="text-xs font-black text-pink-400"
            >
              전체보기 ›
            </Link>
          </div>

          <Link
            href="/us/timeline"
            prefetch={false}
            className="block rounded-[28px] border border-pink-100 bg-gradient-to-br from-white to-pink-50/55 p-5 shadow-sm"
          >
            {recentMoment ? (
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-xl shadow-sm">
                  💗
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 truncate font-black">
                      {
                        recentMoment.title
                      }
                    </p>

                    <span className="shrink-0 text-[11px] font-black text-pink-400">
                      {
                        getRelativeDayLabel(
                          recentMoment.event_date
                        )
                      }
                    </span>
                  </div>

                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-400">
                    {
                      recentMoment.description ??
                      "우리 둘의 새로운 기록이 남았어요 ♡"
                    }
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <div className="text-3xl">
                  🌱
                </div>

                <p className="mt-3 font-black">
                  아직 기록된 순간이 없어요
                </p>

                <p className="mt-1 text-xs leading-5 text-gray-400">
                  함께 약속을 지키고 보상을 사용하면
                  <br />
                  우리 이야기가 여기에 쌓여요 ♡
                </p>
              </div>
            )}
          </Link>
        </section>

        {/* =================================
            OUR STORY
        ================================== */}

        <section className="mt-5">
          <div className="mb-3 flex items-end justify-between">
            <div>
              <p className="text-xs font-black tracking-[0.18em] text-pink-400">
                OUR STORY
              </p>

              <h3 className="mt-1 text-lg font-black">
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
              className="group rounded-[28px] border border-pink-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-pink-50 text-xl">
                📖
              </div>

              <p className="mt-4 font-black">
                우리 기록
              </p>

              <p className="mt-1 text-xs leading-5 text-gray-400">
                지나온 약속과
                <br />
                인증 모아보기
              </p>

              <div className="mt-4 text-right text-lg font-black text-pink-300">
                ›
              </div>
            </Link>

            <Link
              href="/us/timeline"
              prefetch={false}
              className="group rounded-[28px] border border-purple-100 bg-gradient-to-br from-white to-purple-50/60 p-5 shadow-sm transition hover:-translate-y-0.5"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-50 text-xl">
                💕
              </div>

              <p className="mt-4 font-black">
                타임라인
              </p>

              <p className="mt-1 text-xs leading-5 text-gray-400">
                처음부터 지금까지
                <br />
                함께 만든 순간들
              </p>

              <div className="mt-4 text-right text-lg font-black text-purple-300">
                ›
              </div>
            </Link>
          </div>
        </section>

        {/* =================================
            INVITE
        ================================== */}

        <section className="mt-4 rounded-[26px] border border-pink-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black tracking-[0.16em] text-pink-400">
                INVITE
              </p>

              <p className="mt-1 text-sm font-black">
                우리의 초대코드
              </p>
            </div>

            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-pink-50 text-base">
              💌
            </span>
          </div>

          <div className="mt-3 flex items-center gap-2 rounded-[18px] bg-[#fff8fb] p-2.5">
            <p className="min-w-0 flex-1 truncate px-2 text-center text-base font-black tracking-[0.18em] text-gray-700">
              {
                couple
                  ?.invite_code ??
                "-"
              }
            </p>

            <button
              type="button"
              onClick={
                copyInviteCode
              }
              className="shrink-0 rounded-xl bg-pink-500 px-4 py-2.5 text-xs font-black text-white shadow-sm active:scale-[0.98]"
            >
              복사
            </button>
          </div>
        </section>

        {message && (
          <div className="mt-4 rounded-2xl border border-pink-100 bg-white/80 px-4 py-3 text-center text-xs font-semibold text-gray-500 shadow-sm">
            {
              message
            }
          </div>
        )}

        {/* =================================
            SETTINGS
        ================================== */}

        <Link
          href="/us/settings"
          prefetch={false}
          className="group mt-4 flex w-full items-center justify-between rounded-[26px] border border-gray-100 bg-white p-4 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-50 text-lg">
              ⚙️
            </div>

            <div>
              <p className="text-sm font-black">
                우리 설정
              </p>

              <p className="mt-0.5 text-xs text-gray-400">
                함께한 날짜와 프로필 관리
              </p>
            </div>
          </div>

          <span className="text-lg text-gray-300">
            ›
          </span>
        </Link>

        <Link
          href="/couple"
          prefetch={false}
          className="mt-4 block w-full rounded-2xl border border-pink-100 bg-white/80 px-4 py-3.5 text-center text-xs font-black text-gray-400"
        >
          홈으로 돌아가기
        </Link>

        <BottomNav />
      </div>
    </main>
  );
}
