"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/components/AuthProvider";

type CoupleInfo = {
  level: number;
  xp: number;
};

type Member = {
  user_id: string;

  profiles: {
    nickname: string | null;
  } | null;
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
};

type TodayVerification = {
  promise_id: string;
  user_id: string;
  status:
    | "pending"
    | "approved"
    | "rejected";
};

type DeleteRequest = {
  id: string;
  promise_id: string;
  requested_by: string;
  status: string;
};

type RewardUnlockNotification = {
  id: string;
  reward_id: string;
  promise_id: string;
  seen: boolean;

  rewards: {
    title: string;
    required_days: number;
  } | null;

  promises: {
    title: string;
  } | null;
};

type RecentReward = {
  id: string;
  title: string;
  required_days: number;
  unlocked_at: string | null;

  promises: {
    title: string;
  } | null;
};

export default function CouplePage() {
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

  const [promises, setPromises] =
    useState<PromiseItem[]>([]);

  const [
    todayVerifications,
    setTodayVerifications,
  ] = useState<TodayVerification[]>([]);

  const [
    showIncompletePromises,
    setShowIncompletePromises,
  ] = useState(true);

  const [
    showCompletedPromises,
    setShowCompletedPromises,
  ] = useState(false);

  const [
    unlockedRewardCount,
    setUnlockedRewardCount,
  ] = useState(0);

  const [
    pendingVerificationCount,
    setPendingVerificationCount,
  ] = useState(0);

  const [
    recentReward,
    setRecentReward,
  ] = useState<RecentReward | null>(
    null
  );

  const [
    currentUserId,
    setCurrentUserId,
  ] = useState("");

  const [
    deleteRequests,
    setDeleteRequests,
  ] = useState<DeleteRequest[]>([]);

  const [
    deleteProcessing,
    setDeleteProcessing,
  ] = useState<string | null>(
    null
  );

  const [
    rewardNotification,
    setRewardNotification,
  ] =
    useState<RewardUnlockNotification | null>(
      null
    );

  // =========================================
  // 홈 데이터 불러오기
  // =========================================

  useEffect(() => {
    let cancelled = false;

    async function loadCouple() {
      // AuthProvider가 아직 세션 확인 중이면 기다림
      if (authLoading) {
        return;
      }

      // AuthProvider 확인이 끝났는데 user가 없으면
      // 진짜 로그아웃 상태
      if (!user) {
        window.location.href =
          "/login";

        return;
      }

      if (cancelled) return;

      setCurrentUserId(
        user.id
      );

      // =====================================
      // 내가 속한 커플 확인
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
          `커플 조회 오류 | message=${membershipError.message} | code=${membershipError.code} | details=${membershipError.details ?? ""} | hint=${membershipError.hint ?? ""}`
        );

        setLoading(false);
        return;
      }

      // 정말 커플 연결이 없는 경우
      if (!membership) {
        window.location.href =
          "/home";

        return;
      }

      const coupleId =
        membership.couple_id;

      // =====================================
      // 아직 확인하지 않은 보상 알림
      // =====================================

      const {
        data:
          rewardNotificationData,
        error:
          rewardNotificationError,
      } = await supabase
        .from(
          "reward_unlock_notifications"
        )
        .select(`
          id,
          reward_id,
          promise_id,
          seen,
          rewards (
            title,
            required_days
          ),
          promises (
            title
          )
        `)
        .eq("user_id", user.id)
        .eq("seen", false)
        .order("created_at", {
          ascending: true,
        })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;

      if (
        rewardNotificationError
      ) {
        console.error(
          `보상 알림 조회 오류 | message=${rewardNotificationError.message} | code=${rewardNotificationError.code} | details=${rewardNotificationError.details ?? ""} | hint=${rewardNotificationError.hint ?? ""}`
        );
      } else {
        setRewardNotification(
          rewardNotificationData
            ? (rewardNotificationData as unknown as RewardUnlockNotification)
            : null
        );
      }

      // =====================================
      // 커플 레벨 / XP
      // =====================================

      const {
        data: coupleData,
        error: coupleError,
      } = await supabase
        .from("couples")
        .select("level, xp")
        .eq("id", coupleId)
        .maybeSingle();

      if (cancelled) return;

      if (coupleError) {
        console.error(
          `커플 정보 조회 오류 | message=${coupleError.message} | code=${coupleError.code} | details=${coupleError.details ?? ""} | hint=${coupleError.hint ?? ""}`
        );

        setLoading(false);
        return;
      }

      if (!coupleData) {
        console.error(
          `커플 정보 없음 | coupleId=${coupleId}`
        );

        setLoading(false);
        return;
      }

      // =====================================
      // 해금된 보상 개수
      // =====================================

      const {
        count: unlockedCount,
        error:
          rewardCountError,
      } = await supabase
        .from("rewards")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq(
          "couple_id",
          coupleId
        )
        .eq(
          "is_unlocked",
          true
        );

      if (cancelled) return;

      if (rewardCountError) {
        console.error(
          `보상 개수 조회 오류 | message=${rewardCountError.message} | code=${rewardCountError.code} | details=${rewardCountError.details ?? ""} | hint=${rewardCountError.hint ?? ""}`
        );
      }

      setUnlockedRewardCount(
        unlockedCount ?? 0
      );

      // =====================================
      // 내가 확인해야 할 인증 개수
      // =====================================

      const {
        count: pendingCount,
        error: pendingCountError,
      } = await supabase
        .from("verifications")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq(
          "couple_id",
          coupleId
        )
        .neq(
          "user_id",
          user.id
        )
        .eq(
          "status",
          "pending"
        );

      if (cancelled) return;

      if (pendingCountError) {
        console.error(
          `확인 대기 인증 개수 조회 오류 | message=${pendingCountError.message} | code=${pendingCountError.code} | details=${pendingCountError.details ?? ""} | hint=${pendingCountError.hint ?? ""}`
        );
      }

      setPendingVerificationCount(
        pendingCount ?? 0
      );

      // =====================================
      // 최근 해금 보상
      // =====================================

      const {
        data: recentRewardData,
        error: recentRewardError,
      } = await supabase
        .from("rewards")
        .select(`
          id,
          title,
          required_days,
          unlocked_at,
          promises (
            title
          )
        `)
        .eq(
          "couple_id",
          coupleId
        )
        .eq(
          "is_unlocked",
          true
        )
        .not(
          "unlocked_at",
          "is",
          null
        )
        .order(
          "unlocked_at",
          { ascending: false }
        )
        .limit(1)
        .maybeSingle();

      if (cancelled) return;

      if (recentRewardError) {
        console.error(
          `최근 보상 조회 오류 | message=${recentRewardError.message} | code=${recentRewardError.code} | details=${recentRewardError.details ?? ""} | hint=${recentRewardError.hint ?? ""}`
        );
      } else {
        setRecentReward(
          recentRewardData
            ? (recentRewardData as unknown as RecentReward)
            : null
        );
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

        setLoading(false);
        return;
      }

      const userIds =
        memberRows?.map(
          (member) =>
            member.user_id
        ) ?? [];

      // =====================================
      // 멤버 프로필
      // =====================================

      const {
        data: profileRows,
        error: profileError,
      } = userIds.length
        ? await supabase
            .from("profiles")
            .select(
              "id, nickname"
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

        setLoading(false);
        return;
      }

      const combinedMembers: Member[] =
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

              profiles: {
                nickname:
                  profile?.nickname ??
                  null,
              },
            };
          }
        );

      // =====================================
      // 진행 중 약속
      // =====================================

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
          partner_approval_required
        `)
        .eq(
          "couple_id",
          coupleId
        )
        .eq(
          "is_active",
          true
        )
        .order("created_at", {
          ascending: false,
        });

      if (cancelled) return;

      if (promiseError) {
        console.error(
          `약속 조회 오류 | message=${promiseError.message} | code=${promiseError.code} | details=${promiseError.details ?? ""} | hint=${promiseError.hint ?? ""}`
        );

        setLoading(false);
        return;
      }

      // =====================================
      // 오늘 약속 인증 상태
      // =====================================

      const todayPromiseIds =
        (promiseRows ?? []).map(
          (promise) =>
            promise.id
        );

      let todayVerificationRows:
        TodayVerification[] = [];

      if (todayPromiseIds.length > 0) {
        const today =
          new Intl.DateTimeFormat(
            "en-CA",
            {
              timeZone:
                "Asia/Seoul",
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            }
          ).format(
            new Date()
          );

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
            status
          `)
          .in(
            "promise_id",
            todayPromiseIds
          )
          .eq(
            "verification_date",
            today
          );

        if (cancelled) return;

        if (verificationError) {
          console.error(
            `오늘 약속 인증 조회 오류 | message=${verificationError.message} | code=${verificationError.code} | details=${verificationError.details ?? ""} | hint=${verificationError.hint ?? ""}`
          );
        } else {
          todayVerificationRows =
            (verificationRows ??
              []) as TodayVerification[];
        }
      }

      // =====================================
      // 삭제 협의 중인 약속
      // =====================================

      const {
        data:
          deleteRequestRows,
        error:
          deleteRequestError,
      } = await supabase
        .from(
          "promise_delete_requests"
        )
        .select(`
          id,
          promise_id,
          requested_by,
          status
        `)
        .eq(
          "couple_id",
          coupleId
        )
        .eq(
          "status",
          "pending"
        );

      if (cancelled) return;

      if (
        deleteRequestError
      ) {
        console.error(
          `삭제 요청 조회 오류 | message=${deleteRequestError.message} | code=${deleteRequestError.code} | details=${deleteRequestError.details ?? ""} | hint=${deleteRequestError.hint ?? ""}`
        );

        setLoading(false);
        return;
      }

      if (cancelled) return;

      // =====================================
      // 최종 데이터 적용
      // =====================================

      setCouple(
        coupleData
      );

      setMembers(
        combinedMembers
      );

      setPromises(
        (promiseRows ??
          []) as PromiseItem[]
      );

      setTodayVerifications(
        todayVerificationRows
      );

      setDeleteRequests(
        (deleteRequestRows ??
          []) as DeleteRequest[]
      );

      setLoading(false);
    }

    loadCouple();

    return () => {
      cancelled = true;
    };
  }, [
    supabase,
    user,
    authLoading,
  ]);

  // =========================================
  // 약속 삭제 협의 요청
  // =========================================

  async function requestDelete(
    promiseId: string,
    title: string
  ) {
    const confirmed =
      window.confirm(
        `"${title}" 약속의 삭제를 상대방에게 요청할까요?`
      );

    if (!confirmed) {
      return;
    }

    setDeleteProcessing(
      promiseId
    );

    const { error } =
      await supabase.rpc(
        "request_promise_delete",
        {
          p_promise_id:
            promiseId,
        }
      );

    setDeleteProcessing(
      null
    );

    if (error) {
      alert(
        error.message
      );

      return;
    }

    alert(
      "상대방에게 삭제 협의를 요청했어요 ♡"
    );

    window.location.reload();
  }

  // =========================================
  // 삭제 동의
  // =========================================

  async function approveDelete(
    requestId: string,
    promiseId: string
  ) {
    const confirmed =
      window.confirm(
        "이 약속을 삭제하는 데 동의할까요?\n\n앱에서는 더 이상 표시되지 않아요."
      );

    if (!confirmed) {
      return;
    }

    setDeleteProcessing(
      promiseId
    );

    const { error } =
      await supabase.rpc(
        "respond_promise_delete",
        {
          p_request_id:
            requestId,

          p_action:
            "approve",
        }
      );

    setDeleteProcessing(
      null
    );

    if (error) {
      alert(
        error.message
      );

      return;
    }

    setPromises(
      (current) =>
        current.filter(
          (item) =>
            item.id !==
            promiseId
        )
    );

    setDeleteRequests(
      (current) =>
        current.filter(
          (item) =>
            item.id !==
            requestId
        )
    );
  }

  // =========================================
  // 삭제 거절
  // =========================================

  async function rejectDelete(
    requestId: string
  ) {
    const { error } =
      await supabase.rpc(
        "respond_promise_delete",
        {
          p_request_id:
            requestId,

          p_action:
            "reject",
        }
      );

    if (error) {
      alert(
        error.message
      );

      return;
    }

    alert(
      "약속을 그대로 유지하기로 했어요."
    );

    window.location.reload();
  }

  // =========================================
  // 삭제 요청 취소
  // =========================================

  async function cancelDelete(
    requestId: string
  ) {
    const { error } =
      await supabase.rpc(
        "cancel_promise_delete",
        {
          p_request_id:
            requestId,
        }
      );

    if (error) {
      alert(
        error.message
      );

      return;
    }

    window.location.reload();
  }

  // =========================================
  // 보상 알림 확인
  // =========================================

  async function closeRewardNotification() {
    if (
      !rewardNotification
    ) {
      return;
    }

    const notificationId =
      rewardNotification.id;

    const { error } =
      await supabase
        .from(
          "reward_unlock_notifications"
        )
        .update({
          seen: true,

          seen_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          notificationId
        );

    if (error) {
      console.error(
        `보상 알림 확인 오류 | message=${error.message} | code=${error.code} | details=${error.details ?? ""} | hint=${error.hint ?? ""}`
      );

      return;
    }

    setRewardNotification(
      null
    );
  }

  // =========================================
  // AuthProvider가 세션 확인 중
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
  // 페이지 데이터 로딩
  // =========================================

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fff8fb]">
        <p className="text-sm text-gray-500">
          우리 공간 불러오는 중...
        </p>
      </main>
    );
  }

  // =========================================
  // 표시용 데이터
  // =========================================

  const first =
    members[0]?.profiles
      ?.nickname ?? "나";

  const second =
    members[1]?.profiles
      ?.nickname ??
    "파트너";

  const level =
    couple?.level ?? 1;

  const xp =
    couple?.xp ?? 0;

  const xpForNextLevel =
    100;

  const xpPercent =
    Math.min(
      (xp /
        xpForNextLevel) *
        100,
      100
    );

  const isPromiseCompletedToday = (
    promise: PromiseItem
  ) => {
    const promiseVerifications =
      todayVerifications.filter(
        (item) =>
          item.promise_id ===
          promise.id
      );

    if (promise.is_joint) {
      return (
        members.length > 0 &&
        members.every(
          (member) =>
            promiseVerifications.some(
              (item) =>
                item.user_id ===
                  member.user_id &&
                item.status ===
                  "approved"
            )
        )
      );
    }

    return promiseVerifications.some(
      (item) =>
        item.user_id ===
          promise.assigned_to &&
        item.status ===
          "approved"
    );
  };

  const incompletePromises =
    promises.filter(
      (promise) =>
        !isPromiseCompletedToday(
          promise
        )
    );

  const completedPromises =
    promises.filter(
      (promise) =>
        isPromiseCompletedToday(
          promise
        )
    );

  const todayTotalCount =
    promises.length;

  const todayCompletedCount =
    completedPromises.length;

  const todayProgressPercent =
    todayTotalCount > 0
      ? Math.round(
          (todayCompletedCount /
            todayTotalCount) *
            100
        )
      : 0;

  const isTodayAllCompleted =
    todayTotalCount > 0 &&
    todayCompletedCount ===
      todayTotalCount;

  return (
    <main className="min-h-screen bg-[#fff8fb] px-5 py-8 text-[#2b2b2b]">

      <div className="mx-auto max-w-md pb-28">

        {/* =================================
            상단
        ================================== */}

        <header className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-pink-400">
              OURQUEST
            </p>

            <h1 className="mt-2 text-3xl font-bold">
              {first} ♡ {second}
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              오늘도 둘만의 퀘스트를 이어가요 ♡
            </p>
          </div>

          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-xl shadow-sm">
            💕
          </div>
        </header>

        {/* =================================
            레벨 / XP
        ================================== */}

        <section className="mt-7 overflow-hidden rounded-[30px] border border-pink-100 bg-gradient-to-br from-white to-pink-50/60 p-5 shadow-sm">

          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] text-pink-400">
                OUR LEVEL
              </p>

              <p className="mt-2 text-4xl font-bold tracking-tight">
                LV.{level}
              </p>
            </div>

            <div className="rounded-2xl bg-white/80 px-4 py-3 text-right shadow-sm">
              <p className="text-[11px] text-gray-400">
                현재 XP
              </p>
              <p className="mt-1 text-lg font-bold text-pink-500">
                {xp}
              </p>
            </div>
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">
                다음 레벨까지
              </span>
              <span className="font-semibold text-pink-500">
                {Math.max(
                  xpForNextLevel - xp,
                  0
                )} XP 남음
              </span>
            </div>

            <div className="mt-3 h-3 overflow-hidden rounded-full bg-pink-100/70">
              <div
                className="h-full rounded-full bg-pink-400 transition-all"
                style={{
                  width: `${xpPercent}%`,
                }}
              />
            </div>
          </div>

        </section>

        {/* =================================
            오늘 요약
        ================================== */}

        <section className="mt-5">

          <div className="mb-3 flex items-end justify-between">
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] text-pink-400">
                TODAY
              </p>

              <h2 className="mt-1 text-lg font-bold">
                오늘 한눈에 보기
              </h2>
            </div>

            <span className="text-[11px] text-gray-400">
              우리 둘의 오늘 ♡
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">

            <div className="rounded-[26px] border border-pink-100 bg-gradient-to-br from-white to-pink-50/60 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-pink-100 text-lg">
                  ✅
                </div>

                <span className="rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-semibold text-pink-400">
                  QUEST
                </span>
              </div>

              <p className="mt-4 text-xs text-gray-400">
                오늘의 약속
              </p>

              <p className="mt-1 text-3xl font-bold tracking-tight">
                {promises.length}
                <span className="ml-1 text-sm font-semibold text-gray-400">
                  개
                </span>
              </p>

              <p className="mt-2 text-[11px] leading-5 text-gray-400">
                오늘도 함께 이어가요 ♡
              </p>
            </div>

            <Link
              href="/us/history"
              prefetch={false}
              className="group rounded-[26px] border border-pink-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:bg-pink-50/50 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-pink-50 text-lg">
                  📖
                </div>

                <span className="text-lg text-pink-200 transition group-hover:translate-x-0.5">
                  ›
                </span>
              </div>

              <p className="mt-4 text-xs text-gray-400">
                우리 기록
              </p>

              <p className="mt-1 font-bold">
                추억 모아보기
              </p>

              <p className="mt-2 text-[11px] leading-5 text-gray-400">
                약속과 인증 기록을 확인해요.
              </p>
            </Link>

          </div>

          {pendingVerificationCount > 0 && (
            <Link
              href="/verifications"
              prefetch={false}
              className="group mt-3 flex items-center justify-between rounded-[26px] border border-pink-100 bg-white p-4 shadow-sm transition hover:bg-pink-50/50"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-pink-50 text-xl">
                  💌
                </div>

                <div className="min-w-0">
                  <p className="font-bold">
                    확인을 기다리고 있어요
                  </p>

                  <p className="mt-1 truncate text-xs text-gray-400">
                    상대방이 보낸 인증 {pendingVerificationCount}개
                  </p>
                </div>
              </div>

              <span className="ml-3 shrink-0 rounded-full bg-pink-500 px-3 py-2 text-[11px] font-semibold text-white">
                확인하기
              </span>
            </Link>
          )}

          {recentReward && (
            <Link
              href="/rewards"
              prefetch={false}
              className="group mt-3 flex items-center justify-between rounded-[26px] border border-pink-100 bg-white p-4 shadow-sm transition hover:bg-pink-50/50"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-xl">
                  🎁
                </div>

                <div className="min-w-0">
                  <p className="text-[10px] font-semibold tracking-[0.12em] text-pink-400">
                    RECENT REWARD
                  </p>

                  <p className="mt-1 truncate font-bold">
                    {recentReward.title}
                  </p>

                  <p className="mt-1 truncate text-xs text-gray-400">
                    {recentReward.promises?.title ?? "약속"} · {recentReward.required_days}일 달성
                  </p>
                </div>
              </div>

              <span className="ml-3 text-lg text-pink-200 transition group-hover:translate-x-0.5">
                ›
              </span>
            </Link>
          )}

        </section>

        {/* =================================
            오늘의 약속
        ================================== */}

        <section className="mt-7">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-xs font-semibold tracking-[0.18em] text-pink-400">
                TODAY QUEST
              </p>

              <h2 className="mt-1 text-2xl font-bold">
                오늘도 같이 해볼까요?
              </h2>

            </div>

            <Link
              href="/promise/new"
              prefetch={false}
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-pink-500 text-2xl text-white shadow-sm transition hover:bg-pink-600"
            >
              +
            </Link>

          </div>

          {promises.length > 0 && (
            <div className="mt-5 rounded-[26px] border border-pink-100 bg-white p-5 shadow-sm">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold tracking-[0.14em] text-pink-400">
                    TODAY PROGRESS
                  </p>

                  <p className="mt-1 text-sm font-semibold text-gray-700">
                    {isTodayAllCompleted
                      ? "🎉 오늘 약속을 모두 지켰어요!"
                      : `오늘 ${todayCompletedCount} / ${todayTotalCount} 완료`}
                  </p>
                </div>

                <p className="text-2xl font-bold text-pink-500">
                  {todayProgressPercent}
                  <span className="ml-0.5 text-sm font-semibold">
                    %
                  </span>
                </p>
              </div>

              <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-pink-50">
                <div
                  className="h-full rounded-full bg-pink-500 transition-all duration-500"
                  style={{
                    width: `${todayProgressPercent}%`,
                  }}
                />
              </div>

              {!isTodayAllCompleted && (
                <p className="mt-2 text-[11px] text-gray-400">
                  {todayTotalCount -
                    todayCompletedCount}
                  개의 약속이 남았어요 ♡
                </p>
              )}
            </div>
          )}

          {/* 약속 없음 */}

          {promises.length ===
          0 ? (

            <div className="mt-5 rounded-3xl border border-dashed border-pink-200 bg-white p-8 text-center">

              <div className="text-4xl">
                🌱
              </div>

              <h3 className="mt-4 text-lg font-bold">
                아직 약속이 없어요
              </h3>

              <p className="mt-2 text-sm leading-6 text-gray-500">
                둘이 함께 지키고 싶은 약속을
                <br />
                첫 번째 퀘스트로 만들어보세요.
              </p>

              <Link
                href="/promise/new"
                prefetch={false}
                className="mt-6 block w-full rounded-2xl bg-pink-500 px-5 py-4 text-center font-semibold text-white"
              >
                첫 약속 만들기
              </Link>

            </div>

          ) : (

            <div className="mt-5 space-y-4">

              {/* 오늘 미완료 */}

              <section className="overflow-hidden rounded-[26px] border border-pink-100 bg-white shadow-sm">

                <button
                  type="button"
                  onClick={() =>
                    setShowIncompletePromises(
                      (prev) => !prev
                    )
                  }
                  className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-pink-50/40"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-pink-50 text-lg">
                      ⏳
                    </div>

                    <div>
                      <p className="font-bold">
                        오늘 미완료
                      </p>

                      <p className="mt-0.5 text-[11px] text-gray-400">
                        아직 끝나지 않은 약속 {incompletePromises.length}개
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-gray-300 transition ${
                      showIncompletePromises
                        ? "rotate-180"
                        : ""
                    }`}
                  >
                    ⌄
                  </span>
                </button>

                {showIncompletePromises && (
                  <div className="border-t border-pink-50 bg-[#fffdfd] p-3">
                    {incompletePromises.length === 0 ? (
                      <div className="rounded-[22px] bg-white px-4 py-7 text-center">
                        <p className="font-semibold text-pink-500">
                          🎉 오늘 약속을 모두 완료했어요!
                        </p>

                        <p className="mt-1 text-xs text-gray-400">
                          둘이 오늘의 퀘스트를 다 해냈어요 ♡
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
              {incompletePromises.map(
                (promise) => {

                  const assignee =
                    members.find(
                      (member) =>
                        member.user_id ===
                        promise.assigned_to
                    );

                  const assigneeName =
                    assignee
                      ?.profiles
                      ?.nickname ??
                    "이름 없음";

                  const repeatLabel =
                    promise.repeat_type ===
                    "daily"
                      ? "매일"
                      : promise.repeat_type ===
                        "weekdays"
                      ? "평일"
                      : "사용자 지정";

                  const deleteRequest =
                    deleteRequests.find(
                      (request) =>
                        request.promise_id ===
                        promise.id
                    );

                  const jointMemberStatuses =
                    promise.is_joint
                      ? members.map(
                          (member) => {
                            const verification =
                              todayVerifications.find(
                                (item) =>
                                  item.promise_id ===
                                    promise.id &&
                                  item.user_id ===
                                    member.user_id
                              );

                            return {
                              userId:
                                member.user_id,
                              nickname:
                                member.profiles
                                  ?.nickname ??
                                "파트너",
                              status:
                                verification?.status ??
                                null,
                            };
                          }
                        )
                      : [];

                  return (
                    <article
                      key={
                        promise.id
                      }
                      className="overflow-hidden rounded-[30px] border border-pink-100 bg-white shadow-sm"
                    >
                      <div className="p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-pink-50 px-2.5 py-1 text-[10px] font-semibold tracking-[0.12em] text-pink-500">
                                {repeatLabel}
                              </span>

                              <span className="text-[11px] text-gray-400">
                                {promise.is_joint
                                  ? "💕 서로의 약속"
                                  : `${assigneeName}님의 약속`}
                              </span>
                            </div>

                            <h3 className="mt-3 break-words text-xl font-bold leading-7">
                              {promise.title}
                            </h3>
                          </div>

                          <div className="shrink-0 rounded-2xl bg-[#fff8fb] px-3 py-2 text-center">
                            <p className="text-[10px] text-gray-400">
                              연속
                            </p>

                            <p className="mt-0.5 text-lg font-bold text-pink-500">
                              🔥 {promise.current_streak}
                            </p>
                          </div>
                        </div>

                        {/* 기록 요약 */}

                        <div className="mt-4 rounded-2xl bg-[#fff8fb] px-4 py-3">
                          <p className="text-xs font-medium text-gray-500">
                            🔥 현재 {promise.current_streak}일
                            <span className="mx-2 text-pink-200">·</span>
                            🏆 최고 {promise.best_streak}일
                            <span className="mx-2 text-pink-200">·</span>
                            ✓ 성공 {promise.total_success}일
                          </p>
                        </div>

                        {/* 공동 약속 오늘 인증 현황 */}

                        {promise.is_joint && (
                          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-2xl bg-pink-50/60 px-3.5 py-2.5 text-[11px]">
                            <span className="font-semibold text-pink-500">
                              💕 오늘
                            </span>

                            {jointMemberStatuses.map(
                              (memberStatus) => {
                                const statusLabel =
                                  memberStatus.status === "approved"
                                    ? "✅"
                                    : memberStatus.status === "pending"
                                    ? "🕒"
                                    : memberStatus.status === "rejected"
                                    ? "↻"
                                    : "⏳";

                                const statusClass =
                                  memberStatus.status === "approved"
                                    ? "text-green-600"
                                    : memberStatus.status === "pending"
                                    ? "text-amber-600"
                                    : memberStatus.status === "rejected"
                                    ? "text-red-500"
                                    : "text-gray-400";

                                return (
                                  <span
                                    key={memberStatus.userId}
                                    className={`font-semibold ${statusClass}`}
                                  >
                                    {memberStatus.nickname} {statusLabel}
                                  </span>
                                );
                              }
                            )}
                          </div>
                        )}

                        {/* 인증 설정 요약 */}

                        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 px-1 text-[11px] text-gray-400">
                          {promise.is_joint && (
                            <span className="font-semibold text-pink-500">
                              💕 공동
                            </span>
                          )}

                          {promise.photo_required && (
                            <span>📷 사진</span>
                          )}

                          {promise.partner_approval_required && (
                            <span>♡ 상대 확인</span>
                          )}

                          {!promise.is_joint &&
                            !promise.photo_required &&
                            !promise.partner_approval_required && (
                              <span>✓ 기본 인증</span>
                            )}
                        </div>
                      </div>

                      {/* 인증 버튼 */}

                      <div className="border-t border-pink-50 bg-[#fffdfd] px-5 py-4">
                        <Link
                          href={`/verify/${promise.id}`}
                          prefetch={false}
                          className="block w-full rounded-2xl bg-pink-500 px-4 py-3.5 text-center font-semibold text-white shadow-sm transition hover:bg-pink-600 active:scale-[0.99]"
                        >
                          📸 오늘 인증하기
                        </Link>

                      {/* 삭제 요청 없음 */}

                      {!deleteRequest && (
                        <button
                          type="button"
                          disabled={
                            deleteProcessing ===
                            promise.id
                          }
                          onClick={() =>
                            requestDelete(
                              promise.id,
                              promise.title
                            )
                          }
                          className="mt-3 w-full rounded-2xl px-4 py-3 text-sm font-semibold text-gray-400 transition hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                        >
                          약속 삭제 협의하기
                        </button>
                      )}

                      {/* 내가 삭제 요청 */}

                      {deleteRequest &&
                        deleteRequest.requested_by ===
                          currentUserId && (

                          <div className="mt-4 rounded-2xl bg-yellow-50 p-4">

                            <p className="font-semibold text-yellow-700">
                              🕒 삭제 협의 중
                            </p>

                            <p className="mt-1 text-sm leading-6 text-yellow-600">
                              상대방의 답변을 기다리고 있어요.
                            </p>

                            <button
                              type="button"
                              onClick={() =>
                                cancelDelete(
                                  deleteRequest.id
                                )
                              }
                              className="mt-3 text-sm font-semibold text-gray-500"
                            >
                              삭제 요청 취소
                            </button>

                          </div>
                        )}

                      {/* 상대가 삭제 요청 */}

                      {deleteRequest &&
                        deleteRequest.requested_by !==
                          currentUserId && (

                          <div className="mt-4 rounded-2xl border border-pink-100 bg-[#fff8fb] p-4">

                            <p className="font-semibold">
                              💌 삭제 협의 요청
                            </p>

                            <p className="mt-2 text-sm leading-6 text-gray-500">
                              상대방이 이 약속의 삭제를 요청했어요.
                              <br />
                              둘의 기록인 만큼 함께 결정해주세요.
                            </p>

                            <div className="mt-4 grid grid-cols-2 gap-3">

                              <button
                                type="button"
                                onClick={() =>
                                  rejectDelete(
                                    deleteRequest.id
                                  )
                                }
                                className="rounded-xl border border-pink-100 bg-white px-3 py-3 text-sm font-semibold text-gray-600"
                              >
                                계속 지키기
                              </button>

                              <button
                                type="button"
                                disabled={
                                  deleteProcessing ===
                                  promise.id
                                }
                                onClick={() =>
                                  approveDelete(
                                    deleteRequest.id,
                                    promise.id
                                  )
                                }
                                className="rounded-xl bg-pink-500 px-3 py-3 text-sm font-semibold text-white disabled:opacity-50"
                              >
                                삭제 동의
                              </button>

                            </div>

                          </div>
                        )}
                      </div>
                    </article>
                  );
                }
              )}

                      </div>
                    )}
                  </div>
                )}

              </section>

              {/* 오늘 완료 */}

              <section className="overflow-hidden rounded-[26px] border border-pink-100 bg-white shadow-sm">

                <button
                  type="button"
                  onClick={() =>
                    setShowCompletedPromises(
                      (prev) => !prev
                    )
                  }
                  className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-pink-50/40"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-green-50 text-lg">
                      ✅
                    </div>

                    <div>
                      <p className="font-bold">
                        오늘 완료
                      </p>

                      <p className="mt-0.5 text-[11px] text-gray-400">
                        오늘 끝낸 약속 {completedPromises.length}개
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-gray-300 transition ${
                      showCompletedPromises
                        ? "rotate-180"
                        : ""
                    }`}
                  >
                    ⌄
                  </span>
                </button>

                {showCompletedPromises && (
                  <div className="border-t border-pink-50 bg-[#fffdfd] p-3">
                    {completedPromises.length === 0 ? (
                      <div className="rounded-[22px] bg-white px-4 py-7 text-center">
                        <p className="text-sm text-gray-400">
                          아직 오늘 완료한 약속이 없어요.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {completedPromises.map(
                          (promise) => {
                            const assignee =
                              members.find(
                                (member) =>
                                  member.user_id ===
                                  promise.assigned_to
                              );

                            const assigneeName =
                              assignee
                                ?.profiles
                                ?.nickname ??
                              "이름 없음";

                            return (
                              <Link
                                key={promise.id}
                                href="/promises"
                                prefetch={false}
                                className="group flex items-center justify-between gap-3 rounded-[20px] border border-pink-50 bg-white px-4 py-3.5 transition hover:bg-pink-50/50"
                              >
                                <div className="flex min-w-0 items-center gap-3">
                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-green-50 text-sm">
                                    ✓
                                  </div>

                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-bold text-gray-700">
                                      {promise.title}
                                    </p>

                                    <div className="mt-1 flex min-w-0 items-center gap-1.5 text-[10px] text-gray-400">
                                      <span className="truncate">
                                        {promise.is_joint
                                          ? "💕 서로의 약속"
                                          : `${assigneeName}님의 약속`}
                                      </span>

                                      <span>·</span>

                                      <span className="shrink-0 font-semibold text-green-500">
                                        오늘 완료
                                      </span>

                                      <span>·</span>

                                      <span className="shrink-0 text-pink-500">
                                        🔥 {promise.current_streak}일
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <span className="shrink-0 text-lg text-pink-200 transition group-hover:translate-x-0.5">
                                  ›
                                </span>
                              </Link>
                            );
                          }
                        )}
                      </div>
                    )}
                  </div>
                )}

              </section>

            </div>

          )}

        </section>

        {/* =================================
            통계
        ================================== */}

        <section className="mt-6">

          <div className="mb-3 flex items-end justify-between">
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] text-pink-400">
                OUR STATS
              </p>

              <h2 className="mt-1 text-lg font-bold">
                우리 기록 요약
              </h2>
            </div>

            <span className="text-[11px] text-gray-400">
              오늘 기준
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">

            <div className="rounded-[26px] border border-pink-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-pink-50 text-lg">
                  🔥
                </div>

                <span className="text-[10px] font-semibold text-pink-400">
                  QUEST
                </span>
              </div>

              <p className="mt-4 text-xs text-gray-400">
                진행 중인 약속
              </p>

              <p className="mt-1 text-3xl font-bold tracking-tight">
                {promises.length}
                <span className="ml-1 text-sm font-semibold text-gray-400">
                  개
                </span>
              </p>
            </div>

            <div className="rounded-[26px] border border-pink-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-lg">
                  🎁
                </div>

                <span className="text-[10px] font-semibold text-pink-400">
                  REWARD
                </span>
              </div>

              <p className="mt-4 text-xs text-gray-400">
                해금한 보상
              </p>

              <p className="mt-1 text-3xl font-bold tracking-tight">
                {unlockedRewardCount}
                <span className="ml-1 text-sm font-semibold text-gray-400">
                  개
                </span>
              </p>
            </div>

          </div>

        </section>

        {/* 공통 하단 메뉴 */}

        <BottomNav />

      </div>

      {/* =================================
          보상 해금 팝업
      ================================== */}

      {rewardNotification && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-5">

                    <div className="relative w-full max-w-sm overflow-hidden rounded-[34px] border border-pink-100 bg-white p-6 text-center shadow-2xl">

            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-pink-100/60 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-10 -left-8 h-28 w-28 rounded-full bg-amber-100/40 blur-3xl" />

            <div className="relative">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[26px] bg-gradient-to-br from-pink-50 to-amber-50 text-5xl shadow-sm">
                🎁
              </div>

              <p className="mt-5 text-xs font-bold tracking-[0.22em] text-pink-400">
                REWARD UNLOCKED
              </p>

              <h2 className="mt-3 text-2xl font-bold">
                🔥{" "}
                {rewardNotification.rewards
                  ?.required_days ?? 0}
                일 달성!
              </h2>

              <p className="mt-2 text-sm text-gray-400">
                {rewardNotification.promises
                  ?.title ?? "약속"}
              </p>

              <div className="mt-6 rounded-[24px] border border-pink-100 bg-[#fff8fb] p-5">
                <p className="text-[11px] font-semibold tracking-[0.12em] text-pink-400">
                  NEW REWARD
                </p>

                <p className="mt-2 text-xl font-bold text-pink-500">
                  {rewardNotification.rewards
                    ?.title ??
                    "새로운 보상"}
                </p>
              </div>

              <p className="mt-5 text-sm leading-6 text-gray-500">
                함께 약속을 지켜서
                <br />
                새로운 보상이 열렸어요 ♡
              </p>

              <Link
                href="/rewards"
                prefetch={false}
                onClick={() => {
                  void closeRewardNotification();
                }}
                className="mt-6 block w-full rounded-2xl bg-pink-500 px-5 py-4 font-semibold text-white shadow-sm transition hover:bg-pink-600 active:scale-[0.99]"
              >
                🎁 보상 보러가기
              </Link>

              <button
                type="button"
                onClick={() => {
                  void closeRewardNotification();
                }}
                className="mt-3 w-full rounded-2xl px-5 py-3 text-sm font-semibold text-gray-400 transition hover:bg-gray-50"
              >
                확인했어요
              </button>
            </div>

          </div>

        </div>

      )}

    </main>
  );
}