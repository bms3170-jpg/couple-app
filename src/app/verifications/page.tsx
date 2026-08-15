"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import BottomNav from "@/components/BottomNav";

type VerificationItem = {
  id: string;
  promise_id: string;
  user_id: string;
  verification_date: string;
  photo_path: string | null;
  message: string | null;
  status: "pending" | "approved" | "rejected";
  reviewed_at: string | null;
  rejection_reason: string | null;
  promise_title: string;
  is_joint: boolean;
  nickname: string;
  photo_url: string | null;
};

type UnlockedReward = {
  id: string;
  title: string;
  required_days: number;
};

type LevelUpPopup = {
  fromLevel: number;
  toLevel: number;
  nextRequiredXp: number;
};

type ApprovalCelebration = {
  nickname: string;
  promiseTitle: string;
};

export default function VerificationsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const { user, loading: authLoading } = useAuth();

  const [items, setItems] = useState<VerificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  const [rewardPopup, setRewardPopup] =
    useState<UnlockedReward | null>(null);

  const [rewardPromiseTitle, setRewardPromiseTitle] =
    useState("");

  const [levelUpPopup, setLevelUpPopup] =
    useState<LevelUpPopup | null>(null);

  const [showCompleted, setShowCompleted] =
    useState(false);

  const [photoPreview, setPhotoPreview] =
    useState<string | null>(null);

  const [approvalCelebration, setApprovalCelebration] =
    useState<ApprovalCelebration | null>(null);

  // =========================================
  // 인증 목록 불러오기
  // =========================================

  const loadVerifications = useCallback(
    async () => {
      if (authLoading) return;

      if (!user) {
        setLoading(false);
        router.replace("/login");
        return;
      }

      const currentUser = user;

      setLoading(true);
      setNotice("");

      const {
        data: membership,
        error: membershipError,
      } = await supabase
        .from("couple_members")
        .select("couple_id")
        .eq("user_id", currentUser.id)
        .maybeSingle();

      if (membershipError || !membership) {
        console.error("커플 조회 오류:", membershipError);
        setNotice("커플 정보를 찾을 수 없어요.");
        setLoading(false);
        return;
      }

      const {
        data: verificationRows,
        error: verificationError,
      } = await supabase
        .from("verifications")
        .select(`
          id,
          promise_id,
          user_id,
          verification_date,
          photo_path,
          message,
          status,
          reviewed_at,
          rejection_reason,
          created_at
        `)
        .eq("couple_id", membership.couple_id)
        .neq("user_id", currentUser.id)
        .order("created_at", {
          ascending: false,
        });

      if (verificationError) {
        console.error("인증 조회 오류:", verificationError);
        setNotice("인증 기록을 불러오지 못했어요.");
        setLoading(false);
        return;
      }

      const rows = verificationRows ?? [];

      const promiseIds = [
        ...new Set(
          rows.map((item) => item.promise_id)
        ),
      ];

      const userIds = [
        ...new Set(
          rows.map((item) => item.user_id)
        ),
      ];

      const { data: promiseRows } =
        promiseIds.length
          ? await supabase
              .from("promises")
              .select("id, title, is_joint")
              .in("id", promiseIds)
          : { data: [] };

      const { data: profileRows } =
        userIds.length
          ? await supabase
              .from("profiles")
              .select("id, nickname")
              .in("id", userIds)
          : { data: [] };

      const combined: VerificationItem[] =
        await Promise.all(
          rows.map(async (item) => {
            const promise =
              promiseRows?.find(
                (p) => p.id === item.promise_id
              );

            const profile =
              profileRows?.find(
                (p) => p.id === item.user_id
              );

            let photoUrl: string | null = null;

            if (item.photo_path) {
              const {
                data: signedData,
                error: signedError,
              } = await supabase.storage
                .from("verification-images")
                .createSignedUrl(
                  item.photo_path,
                  60 * 60
                );

              if (!signedError && signedData) {
                photoUrl = signedData.signedUrl;
              } else {
                console.error(
                  "사진 URL 생성 오류:",
                  signedError
                );
              }
            }

            return {
              id: item.id,
              promise_id: item.promise_id,
              user_id: item.user_id,
              verification_date: item.verification_date,
              photo_path: item.photo_path,
              message: item.message,
              status: item.status,
              reviewed_at: item.reviewed_at,
              rejection_reason: item.rejection_reason,
              promise_title: promise?.title ?? "약속",
              is_joint: promise?.is_joint ?? false,
              nickname: profile?.nickname ?? "파트너",
              photo_url: photoUrl,
            };
          })
        );

      combined.sort((a, b) => {
        if (
          a.status === "pending" &&
          b.status !== "pending"
        ) {
          return -1;
        }

        if (
          a.status !== "pending" &&
          b.status === "pending"
        ) {
          return 1;
        }

        return 0;
      });

      setItems(combined);
      setLoading(false);
    },
    [
      authLoading,
      user,
      router,
      supabase,
    ]
  );

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setLoading(false);
      router.replace("/login");
      return;
    }

    loadVerifications();
  }, [
    authLoading,
    user,
    router,
    loadVerifications,
  ]);

  // =========================================
  // 승인
  // =========================================

  async function handleApprove(
    verificationId: string
  ) {
    if (!user) {
      router.replace("/login");
      return;
    }

    const currentUser = user;

    const targetVerification =
      items.find(
        (item) =>
          item.id === verificationId
      ) ?? null;

    setProcessingId(verificationId);
    setNotice("");
    setLevelUpPopup(null);

    let beforeLevel: number | null = null;
    let coupleId: string | null = null;

    const {
      data: membershipBefore,
      error: membershipBeforeError,
    } = await supabase
      .from("couple_members")
      .select("couple_id")
      .eq("user_id", currentUser.id)
      .maybeSingle();

    if (
      !membershipBeforeError &&
      membershipBefore
    ) {
      coupleId =
        membershipBefore.couple_id;

      const {
        data: coupleBefore,
        error: coupleBeforeError,
      } = await supabase
        .from("couples")
        .select("level")
        .eq("id", coupleId)
        .maybeSingle();

      if (
        !coupleBeforeError &&
        coupleBefore
      ) {
        beforeLevel =
          coupleBefore.level ?? 1;
      }
    }

    const {
      data,
      error,
    } = await supabase.rpc(
      "review_verification",
      {
        p_verification_id:
          verificationId,
        p_action: "approve",
        p_rejection_reason: null,
      }
    );

    if (error) {
      setProcessingId(null);

      console.error("승인 오류:", error);

      setNotice(
        `승인하지 못했어요: ${error.message}`
      );

      return;
    }

    if (
      coupleId &&
      targetVerification
    ) {
      const {
        data: firstApproved,
        error: firstApprovedError,
      } = await supabase
        .from("verifications")
        .select(`
          id,
          created_at
        `)
        .eq("couple_id", coupleId)
        .eq(
          "promise_id",
          targetVerification.promise_id
        )
        .eq("status", "approved")
        .order("created_at", {
          ascending: true,
        })
        .limit(1)
        .maybeSingle();

      if (firstApprovedError) {
        console.error(
          "첫 성공 인증 확인 오류:",
          firstApprovedError
        );
      } else if (
        firstApproved?.id ===
        verificationId
      ) {
        const {
          error: timelineError,
        } = await supabase
          .from(
            "couple_timeline_events"
          )
          .insert({
            couple_id:
              coupleId,

            user_id:
              targetVerification.user_id,

            event_type:
              "first_verification",

            title:
              "📸 첫 인증을 성공했어요",

            description:
              targetVerification.message
                ? `${targetVerification.promise_title} · ${targetVerification.message}`
                : targetVerification.promise_title,

            related_id:
              verificationId,

            image_path:
              targetVerification.photo_path,

            event_date:
              firstApproved.created_at,

            source_key:
              `first_verification:${targetVerification.promise_id}`,
          });

        if (
          timelineError &&
          timelineError.code !== "23505"
        ) {
          console.error(
            "첫 인증 타임라인 등록 오류:",
            timelineError
          );
        }
      }
    }

    let detectedLevelUp = false;

    if (
      coupleId &&
      beforeLevel !== null
    ) {
      const {
        data: coupleAfter,
        error: coupleAfterError,
      } = await supabase
        .from("couples")
        .select("level")
        .eq("id", coupleId)
        .maybeSingle();

      if (
        !coupleAfterError &&
        coupleAfter
      ) {
        const afterLevel =
          coupleAfter.level ??
          beforeLevel;

        if (
          afterLevel >
          beforeLevel
        ) {
          const nextRequiredXp =
            100 +
            (afterLevel - 1) *
              50;

          setLevelUpPopup({
            fromLevel:
              beforeLevel,

            toLevel:
              afterLevel,

            nextRequiredXp,
          });

          detectedLevelUp =
            true;
        }
      }
    }

    const unlockedRewards =
      (data?.unlocked_rewards ??
        []) as UnlockedReward[];

    if (
      detectedLevelUp &&
      coupleId &&
      beforeLevel !== null
    ) {
      const {
        data: latestCouple,
        error: latestCoupleError,
      } = await supabase
        .from("couples")
        .select("level")
        .eq("id", coupleId)
        .maybeSingle();

      if (latestCoupleError) {
        console.error(
          "레벨업 타임라인용 커플 레벨 조회 오류:",
          latestCoupleError
        );
      } else if (
        latestCouple &&
        latestCouple.level >
          beforeLevel
      ) {
        const newLevel =
          latestCouple.level;

        const {
          error: levelTimelineError,
        } = await supabase
          .from(
            "couple_timeline_events"
          )
          .insert({
            couple_id:
              coupleId,

            user_id:
              currentUser.id,

            event_type:
              "level_up",

            title:
              "🎉 우리 레벨이 올랐어요!",

            description:
              `LV.${beforeLevel} → LV.${newLevel}`,

            related_id: null,
            image_path: null,

            event_date:
              new Date().toISOString(),

            source_key:
              `level_up:${newLevel}`,
          });

        if (
          levelTimelineError &&
          levelTimelineError.code !==
            "23505"
        ) {
          console.error(
            "레벨업 타임라인 등록 오류:",
            levelTimelineError
          );
        }
      }
    }

    if (
      unlockedRewards.length >
      0
    ) {
      setRewardPopup(
        unlockedRewards[0]
      );

      setRewardPromiseTitle(
        data?.promise_title ??
          ""
      );
    } else if (
      !detectedLevelUp
    ) {
      if (targetVerification) {
        setApprovalCelebration({
          nickname:
            targetVerification.nickname,
          promiseTitle:
            targetVerification.promise_title,
        });
      } else {
        setNotice(
          "인증을 승인했어요! 🎉"
        );
      }
    }

    setProcessingId(null);

    await loadVerifications();

    if (
      unlockedRewards.length ===
        0 &&
      !detectedLevelUp &&
      !targetVerification
    ) {
      window.location.href =
        "/couple";
    }
  }

  // =========================================
  // 반려
  // =========================================

  async function handleReject(
    verificationId: string
  ) {
    if (!user) {
      router.replace("/login");
      return;
    }

    const reason =
      window.prompt(
        "반려 이유를 입력해주세요.\n비워도 괜찮아요."
      );

    if (
      reason === null
    ) {
      return;
    }

    setProcessingId(
      verificationId
    );

    setNotice("");

    const {
      error,
    } = await supabase.rpc(
      "review_verification",
      {
        p_verification_id:
          verificationId,

        p_action:
          "reject",

        p_rejection_reason:
          reason.trim() ||
          null,
      }
    );

    setProcessingId(null);

    if (error) {
      console.error(
        "반려 오류:",
        error
      );

      setNotice(
        `반려하지 못했어요: ${error.message}`
      );

      return;
    }

    setNotice(
      "인증을 반려했어요."
    );

    await loadVerifications();
  }

  if (
    authLoading ||
    loading
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fff8fb] px-5">
        <div className="w-full max-w-sm rounded-[30px] border border-pink-100 bg-white/90 p-7 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-pink-50 text-2xl">
            💌
          </div>

          <p className="mt-4 text-sm font-bold text-gray-600">
            우리의 인증을 불러오는 중...
          </p>

          <p className="mt-2 text-xs text-gray-400">
            잠시만 기다려주세요 ♡
          </p>
        </div>
      </main>
    );
  }

  const pendingItems =
    items.filter(
      (item) =>
        item.status === "pending"
    );

  const completedItems =
    items.filter(
      (item) =>
        item.status !== "pending"
    );

  const pendingCount =
    pendingItems.length;

  const latestCompleted =
    completedItems[0] ?? null;

  const latestCompletedRelative = (() => {
    if (!latestCompleted?.verification_date) {
      return "";
    }

    const todayKey =
      new Intl.DateTimeFormat(
        "en-CA",
        {
          timeZone: "Asia/Seoul",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }
      ).format(new Date());

    const today =
      new Date(
        `${todayKey}T00:00:00+09:00`
      );

    const target =
      new Date(
        `${latestCompleted.verification_date}T00:00:00+09:00`
      );

    const diff =
      Math.max(
        0,
        Math.round(
          (
            today.getTime() -
            target.getTime()
          ) /
            86400000
        )
      );

    if (diff === 0) {
      return "오늘";
    }

    if (diff === 1) {
      return "1일 전";
    }

    return `${diff}일 전`;
  })();

  return (
    <main className="min-h-screen bg-[#fff8fb] px-5 py-8 text-[#2b2b2b]">
      <div className="mx-auto max-w-md pb-28">

        {/* HEADER */}

        <header className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-black tracking-[0.22em] text-pink-400">
              OURQUEST
            </p>

            <h1 className="mt-2 text-[30px] font-black tracking-tight">
              우리의 인증 📸
            </h1>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              서로의 하루를 확인하고 응원해 주세요 ♡
            </p>
          </div>

          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-pink-100 bg-white text-xl shadow-sm">
            💕
          </div>
        </header>

        {/* TODAY'S HEART */}

        <section className="relative mt-6 overflow-hidden rounded-[30px] border border-pink-100 bg-gradient-to-br from-[#fff9fc] via-white to-[#fff7f2] p-5 shadow-sm">
          <div className="pointer-events-none absolute -right-8 -top-5 h-36 w-36 rounded-full bg-pink-100/60 blur-2xl" />
          <div className="pointer-events-none absolute right-5 top-8">
            <div className="relative flex h-24 w-24 items-center justify-center">
              <span className="absolute left-1 top-2 text-lg">💕</span>
              <span className="absolute right-0 top-0 text-xl">💗</span>
              <span className="absolute right-3 top-8 text-sm">💞</span>
              <span className="text-6xl drop-shadow-sm">💌</span>
            </div>
          </div>

          <div className="relative z-10 max-w-[72%]">
            <p className="text-[11px] font-black tracking-[0.18em] text-pink-400">
              TODAY&apos;S HEART
            </p>

            <h2 className="mt-3 text-[22px] font-black leading-tight">
              💌 확인을 기다리고 있어요
            </h2>

            <p className="mt-3 text-sm font-semibold text-gray-500">
              파트너가 보낸 인증{" "}
              <span className="font-black text-pink-500">
                {pendingCount}개
              </span>
            </p>

            <p className="mt-2 text-xs text-gray-400">
              {pendingCount > 0
                ? `${pendingCount}개의 마음이 도착했어요 ♡`
                : "지금은 기다리는 인증이 없어요 ♡"}
            </p>
          </div>
        </section>

        {/* PENDING VERIFICATIONS */}

        {pendingItems.length > 0 && (
          <section className="mt-5">
            <div className="mb-3 flex items-end justify-between">
              <div>
                <p className="text-[11px] font-black tracking-[0.16em] text-pink-400">
                  WAITING FOR YOU
                </p>

                <h2 className="mt-1 text-lg font-black">
                  오늘 도착한 인증
                </h2>
              </div>

              <span className="rounded-full bg-pink-50 px-3 py-1.5 text-xs font-black text-pink-500">
                {pendingItems.length}개
              </span>
            </div>

            <div className="space-y-4">
              {pendingItems.map((item) => {
                const isProcessing =
                  processingId === item.id;

                return (
                  <article
                    key={item.id}
                    className="overflow-hidden rounded-[28px] border border-pink-100 bg-gradient-to-b from-white to-[#fff9fc] shadow-sm"
                  >
                    <div className="p-3 pb-0">
                      {item.photo_url ? (
                        <button
                          type="button"
                          onClick={() =>
                            setPhotoPreview(
                              item.photo_url
                            )
                          }
                          className="block w-full overflow-hidden rounded-[22px]"
                        >
                          <img
                            src={item.photo_url}
                            alt="인증 사진"
                            className="max-h-[500px] w-full object-cover"
                          />
                        </button>
                      ) : (
                        <div className="flex h-44 items-center justify-center rounded-[22px] bg-gradient-to-br from-pink-50 to-purple-50 text-sm font-semibold text-gray-400">
                          📷 사진 없음
                        </div>
                      )}
                    </div>

                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            {item.is_joint && (
                              <span className="rounded-full bg-pink-50 px-2.5 py-1 text-[10px] font-bold text-pink-500">
                                💕 우리의 약속
                              </span>
                            )}

                            <span className="text-xs font-semibold text-gray-400">
                              {item.nickname}님의 인증
                            </span>
                          </div>

                          <h3 className="mt-2 break-words text-xl font-black">
                            {item.promise_title}
                          </h3>

                          <p className="mt-2 text-xs text-gray-400">
                            {item.verification_date}
                          </p>
                        </div>

                        <span className="shrink-0 rounded-full border border-amber-100 bg-amber-50 px-3 py-1.5 text-[10px] font-black text-amber-600">
                          💌 확인 대기
                        </span>
                      </div>

                      {item.message && (
                        <div className="mt-4 rounded-[20px] border border-purple-100 bg-purple-50/60 px-4 py-3">
                          <p className="text-[10px] font-black tracking-[0.12em] text-purple-400">
                            TODAY MESSAGE
                          </p>

                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700">
                            “{item.message}”
                          </p>
                        </div>
                      )}

                      <div className="mt-5 grid grid-cols-[0.85fr_1.15fr] gap-3">
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() =>
                            handleReject(item.id)
                          }
                          className="rounded-2xl border border-pink-100 bg-white px-4 py-3.5 text-sm font-black text-gray-500 shadow-sm transition active:scale-[0.99] disabled:opacity-50"
                        >
                          반려하기
                        </button>

                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() =>
                            handleApprove(item.id)
                          }
                          className="rounded-2xl bg-gradient-to-r from-[#ff8fba] to-[#ef78b8] px-4 py-3.5 text-sm font-black text-white shadow-sm transition active:scale-[0.99] disabled:opacity-50"
                        >
                          {isProcessing
                            ? "처리 중..."
                            : "💗 인증해주기"}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {notice && (
          <div className="mt-4 rounded-2xl border border-pink-100 bg-white/90 px-4 py-3 text-center text-xs font-semibold text-gray-500 shadow-sm">
            {notice}
          </div>
        )}

        {/* COMPLETED SUMMARY */}

        <section className="mt-5 rounded-[26px] border border-purple-100 bg-gradient-to-br from-white via-[#fcf9ff] to-[#f7f0ff] p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-400 to-violet-500 text-xl text-white shadow-sm">
                ✓
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate font-black">
                    우리가 함께 지킨 기록
                  </p>

                  <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-black text-purple-500">
                    {completedItems.length}
                  </span>
                </div>

                <p className="mt-1 text-xs text-gray-400">
                  승인·반려가 끝난 인증을 모아봤어요.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                setShowCompleted(
                  (prev) => !prev
                )
              }
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-gray-400 shadow-sm"
            >
              <span
                className={`transition ${
                  showCompleted
                    ? "rotate-180"
                    : ""
                }`}
              >
                ⌄
              </span>
            </button>
          </div>
        </section>

        {showCompleted &&
          completedItems.length > 0 && (
          <section className="mt-3 rounded-[24px] border border-purple-100 bg-purple-50/30 p-2">
            <div className="space-y-2">
              {completedItems.map((item) => (
                <article
                  key={item.id}
                  className="overflow-hidden rounded-[20px] border border-purple-100 bg-white shadow-sm"
                >
                  <div className="flex gap-3 p-3.5">
                    {item.photo_url ? (
                      <button
                        type="button"
                        onClick={() =>
                          setPhotoPreview(
                            item.photo_url
                          )
                        }
                        className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl"
                      >
                        <img
                          src={item.photo_url}
                          alt="인증 사진"
                          className="h-full w-full object-cover"
                        />
                      </button>
                    ) : (
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#fff8fb] text-lg">
                        📷
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-black">
                            {item.promise_title}
                          </p>

                          <p className="mt-1 text-xs text-gray-400">
                            {item.nickname} · {item.verification_date}
                          </p>
                        </div>

                        {item.status === "approved" ? (
                          <span className="shrink-0 rounded-full bg-green-50 px-2.5 py-1 text-[10px] font-black text-green-600">
                            ✓ 완료
                          </span>
                        ) : (
                          <span className="shrink-0 rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-black text-red-500">
                            반려
                          </span>
                        )}
                      </div>

                      {item.message && (
                        <p className="mt-2 line-clamp-2 text-xs leading-5 text-gray-500">
                          “{item.message}”
                        </p>
                      )}

                      {item.status ===
                        "rejected" &&
                        item.rejection_reason && (
                          <p className="mt-2 line-clamp-2 text-xs leading-5 text-red-500">
                            반려 이유: {item.rejection_reason}
                          </p>
                        )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* HOME */}

        <Link
          href="/couple"
          prefetch={false}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-[24px] border border-pink-100 bg-white/80 px-4 py-3.5 text-center text-sm font-black text-gray-500 shadow-sm"
        >
          <span>🏠</span>
          홈으로 돌아가기
        </Link>

        {/* RECORD PREVIEW */}

        {latestCompleted && (
          <section className="mt-5 rounded-[28px] border border-pink-100 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <p className="shrink-0 text-[11px] font-black tracking-[0.12em] text-pink-400">
                ♡ 기록 미리보기
              </p>

              <div className="h-px flex-1 bg-pink-100" />

              <Link
                href="/us/history"
                prefetch={false}
                className="shrink-0 text-xs font-black text-pink-400"
              >
                전체보기 ›
              </Link>
            </div>

            <button
              type="button"
              onClick={() => {
                if (
                  latestCompleted.photo_url
                ) {
                  setPhotoPreview(
                    latestCompleted.photo_url
                  );
                }
              }}
              className="mt-4 flex w-full items-center justify-between gap-3 rounded-[22px] border border-pink-50 bg-[#fffafd] p-4 text-left"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-pink-50 text-xl">
                  ⏰
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-sm font-black">
                      우리가 함께한 하루
                    </p>

                    {latestCompleted.status ===
                      "approved" && (
                      <span className="text-[10px] text-emerald-500">
                        ●
                      </span>
                    )}
                  </div>

                  <p className="mt-1 truncate text-xs text-gray-400">
                    {latestCompleted.status ===
                    "approved"
                      ? "인증 성공 · 서로 칭찬했어요 ♡"
                      : "서로의 인증 기록을 남겼어요 ♡"}
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <span className="text-xs font-black text-pink-400">
                  {latestCompletedRelative}
                </span>

                <span className="text-gray-300">
                  ›
                </span>
              </div>
            </button>
          </section>
        )}

        {/* ENCOURAGEMENT */}

        <section className="mt-5 overflow-hidden rounded-[28px] border border-pink-100 bg-gradient-to-br from-[#fff8fb] via-white to-[#fff1f6] p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-black tracking-[0.12em] text-pink-400">
                💌 서로에게 보내는 한마디
              </p>

              <p className="mt-2 text-sm leading-6 text-gray-500">
                따뜻한 응원이 더 큰 힘이 돼요 ♡
              </p>
            </div>

            <div className="flex items-end gap-1 text-3xl">
              <span>🐱</span>
              <span className="-ml-1 text-2xl">💗</span>
              <span className="-ml-1">🐶</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              setNotice(
                "응원 메시지 기능도 이어서 연결할 수 있어요 ♡"
              )
            }
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-[22px] bg-white px-4 py-4 text-center text-sm font-black text-gray-500 shadow-sm"
          >
            <span className="text-xl text-pink-500">
              +
            </span>
            응원의 메시지 보내기
          </button>
        </section>

        {/* TIP */}

        <section className="mt-5 rounded-[24px] border border-pink-100 bg-gradient-to-r from-[#fff7fa] to-[#fffaf6] px-4 py-4">
          <p className="text-xs font-black text-pink-500">
            ✨ TIP
          </p>

          <p className="mt-1 text-xs leading-5 text-gray-500">
            서로의 하루를 칭찬하고 응원하면 더 행복한 우리만의 기록이 쌓여요!
          </p>
        </section>
      </div>

      <BottomNav />

      {/* PHOTO PREVIEW */}

      {photoPreview && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 p-4"
          onClick={() =>
            setPhotoPreview(null)
          }
        >
          <button
            type="button"
            onClick={() =>
              setPhotoPreview(null)
            }
            className="absolute right-5 top-5 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-2xl text-white"
          >
            ×
          </button>

          <img
            src={photoPreview}
            alt="인증 사진 크게 보기"
            className="max-h-[88vh] max-w-full rounded-[24px] object-contain"
          />
        </div>
      )}

      {/* APPROVAL CELEBRATION */}

      {approvalCelebration &&
        !rewardPopup &&
        !levelUpPopup && (
          <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/40 px-5">
            <div className="w-full max-w-sm overflow-hidden rounded-[34px] border border-pink-100 bg-white p-6 text-center shadow-2xl">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-gradient-to-br from-pink-100 to-purple-100 text-4xl">
                💗
              </div>

              <p className="mt-5 text-[11px] font-black tracking-[0.22em] text-pink-400">
                TOGETHER SUCCESS
              </p>

              <h2 className="mt-2 text-2xl font-black">
                오늘도 함께 성공했어요!
              </h2>

              <p className="mt-2 text-sm text-gray-500">
                {approvalCelebration.nickname}님의{" "}
                <span className="font-bold text-gray-700">
                  {approvalCelebration.promiseTitle}
                </span>
                을 확인했어요 ♡
              </p>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-amber-50 px-4 py-4">
                  <p className="text-[10px] font-bold text-gray-400">
                    XP
                  </p>
                  <p className="mt-1 text-lg font-black text-amber-600">
                    ✨ +10
                  </p>
                </div>

                <div className="rounded-2xl bg-pink-50 px-4 py-4">
                  <p className="text-[10px] font-bold text-gray-400">
                    우리 기록
                  </p>
                  <p className="mt-1 text-lg font-black text-pink-500">
                    💕 저장 완료
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setApprovalCelebration(null);
                  window.location.href =
                    "/couple";
                }}
                className="mt-6 w-full rounded-2xl bg-gradient-to-r from-pink-500 to-fuchsia-500 px-5 py-4 font-black text-white shadow-sm"
              >
                오늘도 같이 이어가기 ♡
              </button>
            </div>
          </div>
        )}

      {/* REWARD POPUP */}

      {rewardPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-5">
          <div className="relative w-full max-w-sm overflow-hidden rounded-[34px] border border-amber-100 bg-gradient-to-b from-white to-amber-50/60 p-6 text-center shadow-2xl">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-white text-5xl shadow-sm">
              🎁
            </div>

            <p className="mt-5 text-xs font-black tracking-[0.24em] text-amber-500">
              REWARD UNLOCKED
            </p>

            <h2 className="mt-3 text-2xl font-black">
              우리에게 새로운 보상이 열렸어요!
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              🔥 {rewardPopup.required_days}일 동안 함께 지켰어요
            </p>

            <div className="mt-6 rounded-[24px] border border-amber-100 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold text-gray-400">
                새로 열린 보상
              </p>

              <p className="mt-2 text-xl font-black text-pink-500">
                {rewardPopup.title}
              </p>
            </div>

            <div className="mt-4 rounded-2xl bg-pink-50 px-4 py-3">
              <p className="font-black text-pink-500">
                +10 XP ✨
              </p>
            </div>

            <p className="mt-5 text-sm leading-6 text-gray-500">
              {rewardPromiseTitle}
              <br />
              둘이 함께 만든 결과예요 ♡
            </p>

            <Link
              href="/rewards"
              prefetch={false}
              className="mt-6 block w-full rounded-2xl bg-gradient-to-r from-pink-500 to-fuchsia-500 px-5 py-4 font-black text-white shadow-sm"
            >
              🎁 보상 확인하기
            </Link>

            <button
              type="button"
              onClick={() => {
                setRewardPopup(null);
                window.location.href =
                  "/couple";
              }}
              className="mt-3 w-full rounded-2xl px-5 py-3 text-sm font-black text-gray-400"
            >
              계속하기
            </button>
          </div>
        </div>
      )}

      {/* LEVEL UP POPUP */}

      {levelUpPopup &&
        !rewardPopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-5">
            <div className="relative w-full max-w-sm overflow-hidden rounded-[34px] border border-purple-100 bg-gradient-to-b from-white to-purple-50/70 p-6 text-center shadow-2xl">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-white text-5xl shadow-sm">
                ✨
              </div>

              <p className="mt-5 text-xs font-black tracking-[0.24em] text-purple-400">
                LEVEL UP!
              </p>

              <h2 className="mt-3 text-2xl font-black">
                우리 사이가 한 단계 성장했어요
              </h2>

              <div className="mt-6 rounded-[24px] border border-purple-100 bg-white p-5 shadow-sm">
                <p className="text-xs font-bold text-gray-400">
                  새로운 우리 레벨
                </p>

                <div className="mt-3 flex items-center justify-center gap-4">
                  <span className="text-xl font-black text-gray-400">
                    LV.{levelUpPopup.fromLevel}
                  </span>

                  <span className="text-xl text-purple-400">
                    →
                  </span>

                  <span className="text-3xl font-black text-pink-500">
                    LV.{levelUpPopup.toLevel}
                  </span>
                </div>
              </div>

              <div className="mt-4 rounded-2xl bg-amber-50 px-4 py-3">
                <p className="text-sm font-bold text-gray-500">
                  다음 레벨까지
                </p>

                <p className="mt-1 font-black text-amber-600">
                  {levelUpPopup.nextRequiredXp} XP
                </p>
              </div>

              <p className="mt-5 text-sm leading-6 text-gray-500">
                둘이 함께 쌓은 XP로
                <br />
                한 단계 더 성장했어요 ♡
              </p>

              <button
                type="button"
                onClick={() => {
                  setLevelUpPopup(null);
                  window.location.href =
                    "/couple";
                }}
                className="mt-6 w-full rounded-2xl bg-gradient-to-r from-pink-500 to-purple-500 px-5 py-4 font-black text-white shadow-sm"
              >
                우리 성장 보러가기 ♡
              </button>
            </div>
          </div>
        )}
    </main>
  );
}
