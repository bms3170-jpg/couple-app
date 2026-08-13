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

export default function VerificationsPage() {
  const router = useRouter();

  const supabase = useMemo(
    () => createClient(),
    []
  );

  const {
    user,
    loading: authLoading,
  } = useAuth();

  const [items, setItems] =
    useState<VerificationItem[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [processingId, setProcessingId] =
    useState<string | null>(null);

  const [notice, setNotice] =
    useState("");

  const [
    rewardPopup,
    setRewardPopup,
  ] = useState<UnlockedReward | null>(null);

  const [
    rewardPromiseTitle,
    setRewardPromiseTitle,
  ] = useState("");

  const [
    levelUpPopup,
    setLevelUpPopup,
  ] = useState<LevelUpPopup | null>(null);

  const [
    showCompleted,
    setShowCompleted,
  ] = useState(false);

  // =========================================
  // 인증 목록 불러오기
  // =========================================

  const loadVerifications = useCallback(
    async () => {
      if (authLoading) {
        return;
      }

      if (!user) {
        setLoading(false);
        router.replace("/login");
        return;
      }

      const currentUser = user;

      setLoading(true);
      setNotice("");

      // =====================================
      // 내가 속한 커플 찾기
      // =====================================

      const {
        data: membership,
        error: membershipError,
      } = await supabase
        .from("couple_members")
        .select("couple_id")
        .eq(
          "user_id",
          currentUser.id
        )
        .maybeSingle();

      if (
        membershipError ||
        !membership
      ) {
        console.error(
          "커플 조회 오류:",
          membershipError
        );

        setNotice(
          "커플 정보를 찾을 수 없어요."
        );

        setLoading(false);
        return;
      }

      // =====================================
      // 상대방이 올린 인증 목록
      // =====================================

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
        .eq(
          "couple_id",
          membership.couple_id
        )
        .neq(
          "user_id",
          currentUser.id
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        );

      if (verificationError) {
        console.error(
          "인증 조회 오류:",
          verificationError
        );

        setNotice(
          "인증 기록을 불러오지 못했어요."
        );

        setLoading(false);
        return;
      }

      const rows =
        verificationRows ?? [];

      const promiseIds = [
        ...new Set(
          rows.map(
            (item) =>
              item.promise_id
          )
        ),
      ];

      const userIds = [
        ...new Set(
          rows.map(
            (item) =>
              item.user_id
          )
        ),
      ];

      // =====================================
      // 약속 이름 조회
      // =====================================

      const {
        data: promiseRows,
      } = promiseIds.length
        ? await supabase
            .from("promises")
            .select(
              "id, title, is_joint"
            )
            .in(
              "id",
              promiseIds
            )
        : {
            data: [],
          };

      // =====================================
      // 닉네임 조회
      // =====================================

      const {
        data: profileRows,
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
          };

      // =====================================
      // 인증 데이터 합치기
      // =====================================

      const combined: VerificationItem[] =
        await Promise.all(
          rows.map(
            async (item) => {
              const promise =
                promiseRows?.find(
                  (p) =>
                    p.id ===
                    item.promise_id
                );

              const profile =
                profileRows?.find(
                  (p) =>
                    p.id ===
                    item.user_id
                );

              let photoUrl:
                | string
                | null = null;

              // =================================
              // 비공개 사진 signed URL
              // =================================

              if (item.photo_path) {
                const {
                  data: signedData,
                  error: signedError,
                } =
                  await supabase.storage
                    .from(
                      "verification-images"
                    )
                    .createSignedUrl(
                      item.photo_path,
                      60 * 60
                    );

                if (
                  !signedError &&
                  signedData
                ) {
                  photoUrl =
                    signedData.signedUrl;
                } else {
                  console.error(
                    "사진 URL 생성 오류:",
                    signedError
                  );
                }
              }

              return {
                id:
                  item.id,

                promise_id:
                  item.promise_id,

                user_id:
                  item.user_id,

                verification_date:
                  item.verification_date,

                photo_path:
                  item.photo_path,

                message:
                  item.message,

                status:
                  item.status,

                reviewed_at:
                  item.reviewed_at,

                rejection_reason:
                  item.rejection_reason,

                promise_title:
                  promise?.title ??
                  "약속",

                is_joint:
                  promise?.is_joint ??
                  false,

                nickname:
                  profile?.nickname ??
                  "파트너",

                photo_url:
                  photoUrl,
              };
            }
          )
        );

      // =====================================
      // pending 인증을 위로
      // =====================================

      combined.sort(
        (a, b) => {
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
        }
      );

      setItems(
        combined
      );

      setLoading(
        false
      );
    },
    [
      authLoading,
      user,
      router,
      supabase,
    ]
  );

  // =========================================
  // 최초 로딩
  // =========================================

  useEffect(() => {
    if (authLoading) {
      return;
    }

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

    const currentUser =
      user;

    const targetVerification =
      items.find(
        (item) =>
          item.id ===
          verificationId
      ) ?? null;

    setProcessingId(
      verificationId
    );

    setNotice("");
    setLevelUpPopup(null);

    // =====================================
    // 승인 전 현재 커플 레벨 확인
    // =====================================

    let beforeLevel:
      | number
      | null = null;

    let coupleId:
      | string
      | null = null;

    const {
      data: membershipBefore,
      error: membershipBeforeError,
    } = await supabase
      .from("couple_members")
      .select("couple_id")
      .eq(
        "user_id",
        currentUser.id
      )
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
        .eq(
          "id",
          coupleId
        )
        .maybeSingle();

      if (
        !coupleBeforeError &&
        coupleBefore
      ) {
        beforeLevel =
          coupleBefore.level ??
          1;
      }
    }

    // =====================================
    // 인증 승인
    // =====================================

    const {
      data,
      error,
    } = await supabase.rpc(
      "review_verification",
      {
        p_verification_id:
          verificationId,

        p_action:
          "approve",

        p_rejection_reason:
          null,
      }
    );

    if (error) {
      setProcessingId(
        null
      );

      console.error(
        "승인 오류:",
        error
      );

      setNotice(
        `승인하지 못했어요: ${error.message}`
      );

      return;
    }

    // =====================================
    // 승인된 인증이 이 약속의 첫 성공이면
    // 타임라인 자동 등록
    // =====================================

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
        .eq(
          "couple_id",
          coupleId
        )
        .eq(
          "promise_id",
          targetVerification.promise_id
        )
        .eq(
          "status",
          "approved"
        )
        .order(
          "created_at",
          {
            ascending: true,
          }
        )
        .limit(1)
        .maybeSingle();

      if (
        firstApprovedError
      ) {
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
          timelineError.code !==
            "23505"
        ) {
          console.error(
            "첫 인증 타임라인 등록 오류:",
            timelineError
          );
        }
      }
    }
    // =====================================
    // 승인 후 레벨 확인
    // =====================================

    let detectedLevelUp =
      false;

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
        .eq(
          "id",
          coupleId
        )
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

    // =====================================
    // 커플 레벨업 타임라인 자동 등록
    // =====================================

    if (
      detectedLevelUp &&
      coupleId &&
      beforeLevel !== null
    ) {
      const {
        data:
          latestCouple,

        error:
          latestCoupleError,
      } = await supabase
        .from("couples")
        .select("level")
        .eq(
          "id",
          coupleId
        )
        .maybeSingle();

      if (
        latestCoupleError
      ) {
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
          error:
            levelTimelineError,
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

            related_id:
              null,

            image_path:
              null,

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

    // =====================================
    // 보상 해금 처리
    // =====================================

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
      setNotice(
        "인증을 승인했어요! 🎉"
      );
    }

    setProcessingId(
      null
    );

    // =====================================
    // 인증 목록 다시 불러오기
    // =====================================

    await loadVerifications();

    // =====================================
    // 홈 화면 완전 새로고침
    //
    // 다시 인증 → 승인된 상태를
    // /couple 화면에서 즉시 다시 조회하도록 함
    //
    // 보상/레벨업 팝업이 있는 경우에는
    // 팝업을 먼저 보여줘야 하므로 바로 이동하지 않음
    // =====================================

    if (
      unlockedRewards.length ===
        0 &&
      !detectedLevelUp
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
      router.replace(
        "/login"
      );

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

    setProcessingId(
      null
    );

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
          인증 기록 불러오는 중...
        </p>
      </main>
    );
  }

  const pendingItems =
    items.filter(
      (item) =>
        item.status ===
        "pending"
    );

  const completedItems =
    items.filter(
      (item) =>
        item.status !==
        "pending"
    );

  const pendingCount =
    pendingItems.length;

  return (
    <main className="min-h-screen bg-[#fff8fb] px-5 py-8 text-[#2b2b2b]">

      <div className="mx-auto max-w-md pb-28">

        {/* =================================
            헤더
        ================================= */}

        <header className="flex items-end justify-between gap-4">

          <div>

            <p className="text-xs font-semibold tracking-[0.2em] text-pink-400">
              VERIFICATIONS
            </p>

            <h1 className="mt-2 text-3xl font-bold">
              인증 확인
            </h1>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              파트너가 보내온 오늘의 인증을 확인해주세요 ♡
            </p>

          </div>

          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-xl shadow-sm">
            📸
          </div>

        </header>

        {/* =================================
            대기 개수
        ================================= */}

        <section className="mt-7 overflow-hidden rounded-[28px] border border-pink-100 bg-gradient-to-br from-white to-pink-50/70 shadow-sm">

          <div className="flex items-center justify-between p-5">

            <div>

              <p className="text-xs font-semibold tracking-[0.16em] text-pink-400">
                VERIFICATION STATUS
              </p>

              <div className="mt-2 flex items-end gap-2">

                <p className="text-3xl font-bold tracking-tight">
                  {pendingCount}
                </p>

                <p className="pb-1 text-sm font-semibold text-gray-400">
                  개 확인 대기
                </p>

              </div>

              <p className="mt-2 text-xs text-gray-400">
                확인이 필요한 인증만 먼저 보여드려요.
              </p>

            </div>

            <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-white text-2xl shadow-sm">
              💌
            </div>

          </div>

        </section>

        {/* =================================
            메시지
        ================================= */}

        {notice && (

          <div className="mt-4 rounded-2xl border border-pink-100 bg-white/80 px-4 py-3 text-center text-xs text-gray-500 shadow-sm">
            {notice}
          </div>

        )}

        {/* =================================
            인증 목록
        ================================= */}

        {pendingItems.length ===
          0 &&
        completedItems.length ===
          0 ? (

          <section className="mt-6 rounded-[30px] border border-dashed border-pink-200 bg-white p-8 text-center shadow-sm">

            <div className="text-4xl">
              📭
            </div>

            <h2 className="mt-4 text-lg font-bold">
              아직 받은 인증이 없어요
            </h2>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              파트너가 인증을 보내면
              <br />
              여기에서 확인할 수 있어요.
            </p>

          </section>

        ) : (

          <>

            {/* =================================
                확인 대기 인증
            ================================= */}

            {pendingItems.length >
              0 && (

              <section className="mt-6">

                <div className="mb-3 flex items-end justify-between">

                  <div>

                    <p className="text-xs font-semibold tracking-[0.18em] text-pink-400">
                      WAITING LIST
                    </p>

                    <h2 className="mt-1 text-lg font-bold">
                      확인이 필요한 인증
                    </h2>

                  </div>

                  <span className="rounded-full bg-pink-50 px-3 py-1.5 text-xs font-semibold text-pink-500">
                    {pendingItems.length}개
                  </span>

                </div>

                <div className="space-y-5">

                  {pendingItems.map(
                    (item) => {

                      const isProcessing =
                        processingId ===
                        item.id;

                      return (
                        <article
                          key={
                            item.id
                          }
                          className="overflow-hidden rounded-[30px] border border-pink-100 bg-white shadow-sm"
                        >

                          <div className="p-3 pb-0">

                            {item.photo_url ? (

                              <img
                                src={
                                  item.photo_url
                                }
                                alt="인증 사진"
                                className="max-h-[520px] w-full rounded-[22px] object-cover"
                              />

                            ) : (

                              <div className="flex h-48 items-center justify-center rounded-[22px] bg-[#fff8fb] text-sm text-gray-400">
                                사진 없음
                              </div>

                            )}

                          </div>

                          <div className="p-5">

                            <div className="flex items-start justify-between gap-4">

                              <div>

                                <div className="flex flex-wrap items-center gap-2">

                                  {item.is_joint && (

                                    <span className="rounded-full bg-pink-50 px-2.5 py-1 text-[10px] font-semibold text-pink-500">
                                      💕 서로의 약속
                                    </span>

                                  )}

                                  <span className="text-xs font-medium text-gray-400">
                                    {item.nickname}님의 인증
                                  </span>

                                </div>

                                <h2 className="mt-2 text-xl font-bold">
                                  {item.promise_title}
                                </h2>

                                <p className="mt-2 text-xs text-gray-400">
                                  {item.verification_date}
                                </p>

                              </div>

                              <span className="shrink-0 rounded-full border border-amber-100 bg-amber-50 px-3 py-1.5 text-[11px] font-semibold text-amber-600">
                                ● 확인 대기
                              </span>

                            </div>

                            {item.message && (

                              <div className="mt-4 rounded-[20px] border border-pink-100 bg-[#fff8fb] px-4 py-3">

                                <p className="text-xs text-gray-400">
                                  오늘 한마디
                                </p>

                                <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
                                  “{item.message}”
                                </p>

                              </div>

                            )}

                            <div className="mt-5 grid grid-cols-[0.85fr_1.15fr] gap-3">

                              <button
                                type="button"
                                disabled={
                                  isProcessing
                                }
                                onClick={() =>
                                  handleReject(
                                    item.id
                                  )
                                }
                                className="rounded-2xl border border-pink-200 bg-white px-4 py-3.5 text-sm font-semibold text-gray-600 shadow-sm transition hover:bg-pink-50 active:scale-[0.99] disabled:opacity-50"
                              >
                                ✕ 반려
                              </button>

                              <button
                                type="button"
                                disabled={
                                  isProcessing
                                }
                                onClick={() =>
                                  handleApprove(
                                    item.id
                                  )
                                }
                                className="rounded-2xl bg-pink-500 px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-pink-600 active:scale-[0.99] disabled:opacity-50"
                              >
                                {isProcessing
                                  ? "처리 중..."
                                  : "♡ 승인"}
                              </button>

                            </div>

                          </div>

                        </article>
                      );
                    }
                  )}

                </div>

              </section>
            )}

            {/* =================================
                완료된 인증
            ================================= */}

            {completedItems.length >
              0 && (

              <section className="mt-6">

                <button
                  type="button"
                  onClick={() =>
                    setShowCompleted(
                      (prev) =>
                        !prev
                    )
                  }
                  className={`flex w-full items-center justify-between rounded-[26px] border p-4 text-left shadow-sm transition ${
                    showCompleted
                      ? "border-pink-200 bg-pink-50/50"
                      : "border-pink-100 bg-white hover:bg-pink-50/40"
                  }`}
                >

                  <div className="flex items-center gap-3">

                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-green-50 text-xl">
                      ✅
                    </div>

                    <div>

                      <div className="flex items-center gap-2">

                        <p className="font-bold">
                          완료된 인증
                        </p>

                        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-pink-500">
                          {completedItems.length}
                        </span>

                      </div>

                      <p className="mt-1 text-xs text-gray-400">
                        승인·반려가 끝난 인증을 모아봤어요.
                      </p>

                    </div>

                  </div>

                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm text-gray-400 shadow-sm transition ${
                      showCompleted
                        ? "rotate-180"
                        : ""
                    }`}
                  >
                    ⌄
                  </span>

                </button>
                {showCompleted && (
                  <div className="mt-3 space-y-2 rounded-[24px] bg-pink-50/35 p-2">

                    {completedItems.map(
                      (item) => (

                        <article
                          key={item.id}
                          className="overflow-hidden rounded-[22px] border border-pink-100 bg-white shadow-sm"
                        >

                          <div className="flex gap-3 p-3.5">

                            {item.photo_url ? (

                              <img
                                src={
                                  item.photo_url
                                }
                                alt="인증 사진"
                                className="h-14 w-14 shrink-0 rounded-2xl object-cover"
                              />

                            ) : (

                              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#fff8fb] text-lg">
                                📷
                              </div>

                            )}

                            <div className="min-w-0 flex-1">

                              <div className="flex items-start justify-between gap-2">

                                <div className="min-w-0">

                                  <div className="flex min-w-0 flex-wrap items-center gap-1.5">

                                    <p className="min-w-0 truncate font-bold">
                                      {item.promise_title}
                                    </p>

                                    {item.is_joint && (

                                      <span className="shrink-0 rounded-full bg-pink-50 px-2 py-0.5 text-[9px] font-semibold text-pink-500">
                                        💕 서로
                                      </span>

                                    )}

                                  </div>

                                  <p className="mt-1 text-xs text-gray-400">
                                    {item.nickname} · {item.verification_date}
                                  </p>

                                </div>

                                {item.status ===
                                "approved" ? (

                                  <span className="shrink-0 rounded-full bg-green-50 px-2.5 py-1 text-[10px] font-semibold text-green-600">
                                    ✓ 승인
                                  </span>

                                ) : (

                                  <span className="shrink-0 rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-semibold text-red-500">
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

                      )
                    )}

                  </div>
                )}

              </section>

            )}

          </>
        )}

        {/* =================================
            홈
        ================================= */}

        <Link
          href="/couple"
          prefetch={false}
          className="mt-6 block w-full rounded-2xl border border-pink-100 bg-white/70 px-4 py-3 text-center text-xs font-semibold text-gray-400 transition hover:bg-pink-50 hover:text-pink-500"
        >
          홈으로 돌아가기
        </Link>

      </div>

      {/* =====================================
          공통 하단 메뉴
      ===================================== */}

      <BottomNav />

      {/* =====================================
          보상 해금 팝업
      ===================================== */}

      {rewardPopup && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-5">

          <div className="relative w-full max-w-sm overflow-hidden rounded-[34px] border border-pink-100 bg-white p-6 text-center shadow-2xl">

            <div className="text-6xl">
              🎁
            </div>

            <p className="mt-4 text-xs font-bold tracking-[0.25em] text-pink-400">
              REWARD UNLOCKED
            </p>

            <h2 className="mt-3 text-2xl font-bold">
              🔥{" "}
              {rewardPopup.required_days}
              일 달성!
            </h2>

            <p className="mt-2 text-sm text-gray-400">
              {rewardPromiseTitle}
            </p>

            {/* 보상 */}

            <div className="mt-6 rounded-[24px] border border-pink-100 bg-[#fff8fb] p-5">

              <p className="text-xs text-gray-400">
                새로 열린 보상
              </p>

              <p className="mt-2 text-xl font-bold text-pink-500">
                {rewardPopup.title}
              </p>

            </div>

            {/* XP */}

            <div className="mt-5 rounded-2xl bg-pink-50 px-4 py-3">

              <p className="font-semibold text-pink-500">
                +10 XP ✨
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
              className="mt-6 block w-full rounded-2xl bg-pink-500 px-5 py-4 font-semibold text-white shadow-sm transition hover:bg-pink-600 active:scale-[0.99]"
            >
              🎁 보상 보러가기
            </Link>

            <button
              type="button"
              onClick={() => {
                setRewardPopup(
                  null
                );

                // 보상 확인 후 홈을 새로 불러오기
                window.location.href =
                  "/couple";
              }}
              className="mt-3 w-full rounded-2xl px-5 py-3 text-sm font-semibold text-gray-400"
            >
              계속하기
            </button>

          </div>

        </div>

      )}

      {/* =====================================
          레벨업 팝업
      ===================================== */}

      {levelUpPopup &&
        !rewardPopup && (

          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-5">

            <div className="relative w-full max-w-sm overflow-hidden rounded-[34px] border border-pink-100 bg-white p-6 text-center shadow-2xl">

              <div className="text-6xl">
                🎉
              </div>

              <p className="mt-4 text-xs font-bold tracking-[0.25em] text-pink-400">
                LEVEL UP!
              </p>

              <h2 className="mt-3 text-2xl font-bold">
                우리 레벨이 올랐어요 ♡
              </h2>

              <div className="mt-6 rounded-[24px] border border-pink-100 bg-[#fff8fb] p-5">

                <p className="text-xs text-gray-400">
                  새로운 우리 레벨
                </p>

                <div className="mt-3 flex items-center justify-center gap-4">

                  <span className="text-xl font-bold text-gray-400">
                    LV.{levelUpPopup.fromLevel}
                  </span>

                  <span className="text-xl text-pink-400">
                    →
                  </span>

                  <span className="text-3xl font-bold text-pink-500">
                    LV.{levelUpPopup.toLevel}
                  </span>

                </div>

              </div>

              <div className="mt-5 rounded-2xl bg-pink-50 px-4 py-3">

                <p className="text-sm text-gray-500">
                  다음 레벨까지
                </p>

                <p className="mt-1 font-semibold text-pink-500">
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
                  setLevelUpPopup(
                    null
                  );

                  // 레벨업 확인 후 홈을 새로 불러오기
                  window.location.href =
                    "/couple";
                }}
                className="mt-6 w-full rounded-2xl bg-pink-500 px-5 py-4 font-semibold text-white shadow-sm transition hover:bg-pink-600 active:scale-[0.99]"
              >
                확인했어요 ♡
              </button>

            </div>

          </div>

        )}

    </main>
  );
}
