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

type RewardItem = {
  id: string;
  promise_id: string;
  required_days: number;
  title: string;
  description: string | null;
  is_secret: boolean;
  is_unlocked: boolean;
  unlocked_at: string | null;
  is_used: boolean;
  used_at: string | null;

  promise_title: string;
  current_streak: number;
  is_joint: boolean;
};

type LevelRewardItem = {
  id: string;
  unlock_level: number;
  title: string;
  description: string | null;
  unlocked: boolean;
  unlocked_at: string | null;
  is_used: boolean;
  used_at: string | null;
};

type LevelRewardMemory = {
  id: string;
  level_reward_id: string;
  message: string | null;
  photo_path: string | null;
  photo_url: string | null;
  created_at: string;
};

const REWARD_IMAGES = {
  mainChest: "/images/rewards-main-chest.PNG",
  unlocked: "/images/rewards-unlocked.PNG",
  used: "/images/rewards-used.PNG",
  locked: "/images/rewards-locked.PNG",
  unlockCelebration: "/images/rewards-unlock-celebration.PNG",
  level: "/images/rewards-level.PNG",
  levelEmpty: "/images/rewards-level-empty.PNG",
} as const;

function formatUsedDate(
  value: string | null
) {
  if (!value) {
    return "";
  }

  const date =
    new Date(value);

  return new Intl.DateTimeFormat(
    "ko-KR",
    {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  )
    .format(date)
    .replace(/\. /g, ".")
    .replace(/\.$/, "");
}

export default function RewardsPage() {
  const supabase = useMemo(
    () => createClient(),
    []
  );

  const {
    user,
    loading: authLoading,
  } = useAuth();

  const [rewards, setRewards] =
    useState<RewardItem[]>([]);

  const [
    levelRewards,
    setLevelRewards,
  ] =
    useState<LevelRewardItem[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [
    processingId,
    setProcessingId,
  ] = useState<string | null>(
    null
  );

  const [message, setMessage] =
    useState("");

  const [
    expandedPromiseIds,
    setExpandedPromiseIds,
  ] = useState<string[]>([]);

  const [
    showPromiseRewards,
    setShowPromiseRewards,
  ] = useState(true);

  const [
    showLevelRewards,
    setShowLevelRewards,
  ] = useState(true);

  const [
    currentCoupleId,
    setCurrentCoupleId,
  ] = useState<string | null>(
    null
  );

  const [
    levelRewardMemories,
    setLevelRewardMemories,
  ] =
    useState<LevelRewardMemory[]>([]);

  const [
    memoryTarget,
    setMemoryTarget,
  ] =
    useState<LevelRewardItem | null>(
      null
    );

  const [
    memoryMessage,
    setMemoryMessage,
  ] = useState("");

  const [
    memoryFile,
    setMemoryFile,
  ] = useState<File | null>(
    null
  );

  const [
    savingMemory,
    setSavingMemory,
  ] = useState(false);

  const [
    editingLevelRewardId,
    setEditingLevelRewardId,
  ] = useState<string | null>(
    null
  );

  const [
    levelRewardTitleDraft,
    setLevelRewardTitleDraft,
  ] = useState("");

  const [
    levelRewardDescriptionDraft,
    setLevelRewardDescriptionDraft,
  ] = useState("");

  const [
    savingLevelRewardId,
    setSavingLevelRewardId,
  ] = useState<string | null>(
    null
  );

  const [
    usingLevelRewardId,
    setUsingLevelRewardId,
  ] = useState<string | null>(
    null
  );

  // =========================================
  // 보상 불러오기
  // =========================================

  const loadRewards =
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

        if (
          membershipError ||
          !membership
        ) {
          console.error(
            "커플 조회 오류:",
            membershipError
          );

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
          data: levelRewardRows,
          error: levelRewardError,
        } = await supabase
          .from("level_rewards")
          .select(`
            id,
            unlock_level,
            title,
            description,
            unlocked,
            unlocked_at,
            is_used,
            used_at
          `)
          .eq(
            "couple_id",
            coupleId
          )
          .order(
            "unlock_level",
            {
              ascending: true,
            }
          );

        if (levelRewardError) {
          console.error(
            "레벨 보상 조회 오류:",
            levelRewardError
          );
        } else {
          setLevelRewards(
            (
              levelRewardRows ??
              []
            ) as LevelRewardItem[]
          );
        }

        const {
          data: memoryRows,
          error: memoryError,
        } = await supabase
          .from(
            "level_reward_memories"
          )
          .select(`
            id,
            level_reward_id,
            message,
            photo_path,
            created_at
          `)
          .eq(
            "couple_id",
            coupleId
          )
          .order(
            "created_at",
            {
              ascending: false,
            }
          );

        if (memoryError) {
          console.error(
            "레벨 보상 추억 조회 오류:",
            memoryError
          );
        } else {
          const mappedMemories =
            (
              memoryRows ??
              []
            ).map(
              (item) => {
                const photoUrl =
                  item.photo_path
                    ? supabase.storage
                        .from(
                          "level-reward-memories"
                        )
                        .getPublicUrl(
                          item.photo_path
                        ).data.publicUrl
                    : null;

                return {
                  ...item,
                  photo_url:
                    photoUrl,
                };
              }
            ) as LevelRewardMemory[];

          setLevelRewardMemories(
            mappedMemories
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
            required_days,
            title,
            description,
            is_secret,
            is_unlocked,
            unlocked_at,
            is_used,
            used_at
          `)
          .eq(
            "couple_id",
            coupleId
          )
          .order(
            "required_days",
            {
              ascending: true,
            }
          );

        if (rewardError) {
          console.error(
            "보상 조회 오류:",
            rewardError
          );

          setMessage(
            "보상을 불러오지 못했어요."
          );

          setLoading(false);
          return;
        }

        const rows =
          rewardRows ?? [];

        const promiseIds = [
          ...new Set(
            rows.map(
              (reward) =>
                reward.promise_id
            )
          ),
        ];

        const {
          data: promiseRows,
          error: promiseError,
        } = promiseIds.length
          ? await supabase
              .from("promises")
              .select(`
                id,
                title,
                current_streak,
                is_joint
              `)
              .in(
                "id",
                promiseIds
              )
          : {
              data: [],
              error: null,
            };

        if (promiseError) {
          console.error(
            "약속 조회 오류:",
            promiseError
          );
        }

        const combined:
          RewardItem[] =
          rows.map(
            (reward) => {
              const promise =
                promiseRows?.find(
                  (item) =>
                    item.id ===
                    reward.promise_id
                );

              return {
                ...reward,

                promise_title:
                  promise?.title ??
                  "약속",

                current_streak:
                  promise
                    ?.current_streak ??
                  0,

                is_joint:
                  promise?.is_joint ??
                  false,
              };
            }
          );

        setRewards(
          combined
        );

        setLoading(false);
      },
      [
        supabase,
        user,
        authLoading,
      ]
    );

  useEffect(() => {
    loadRewards();
  }, [loadRewards]);

  // =========================================
  // 약속 보상 사용
  // =========================================

  async function useReward(
    reward: RewardItem
  ) {
    if (
      !reward.is_unlocked ||
      reward.is_used
    ) {
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
        `"${reward.title}" 보상을 사용 완료로 표시할까요?`
      );

    if (!confirmed) {
      return;
    }

    setProcessingId(
      reward.id
    );

    setMessage("");

    const usedAt =
      new Date().toISOString();

    const {
      data: updatedReward,
      error: updateError,
    } = await supabase
      .from("rewards")
      .update({
        is_used: true,
        used_at: usedAt,
      })
      .eq(
        "id",
        reward.id
      )
      .eq(
        "couple_id",
        currentCoupleId
      )
      .eq(
        "is_unlocked",
        true
      )
      .eq(
        "is_used",
        false
      )
      .select(
        "id, is_used, used_at"
      )
      .maybeSingle();

    if (updateError) {
      setProcessingId(
        null
      );

      console.error(
        "보상 사용 오류:",
        updateError
      );

      setMessage(
        `보상을 처리하지 못했어요: ${updateError.message}`
      );

      return;
    }

    if (!updatedReward) {
      setProcessingId(
        null
      );

      setMessage(
        "보상 상태가 이미 변경됐거나 처리할 보상을 찾지 못했어요."
      );

      await loadRewards();
      return;
    }

    const timelineUsedAt =
      updatedReward.used_at ??
      usedAt;

    const sourceKey =
      `promise_reward_used:${reward.id}`;

    const {
      data: existingTimeline,
      error: timelineCheckError,
    } = await supabase
      .from(
        "couple_timeline_events"
      )
      .select("id")
      .eq(
        "couple_id",
        currentCoupleId
      )
      .eq(
        "source_key",
        sourceKey
      )
      .maybeSingle();

    if (timelineCheckError) {
      setProcessingId(
        null
      );

      console.error(
        "약속 보상 타임라인 확인 오류:",
        timelineCheckError
      );

      setMessage(
        "보상은 사용 완료됐지만 타임라인 확인에 실패했어요."
      );

      await loadRewards();
      return;
    }

    if (!existingTimeline) {
      const {
        error: timelineInsertError,
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
            "promise_reward_used",

          title:
            "🎁 약속 보상을 사용했어요",

          description:
            `${reward.required_days}일 · ${reward.promise_title} · ${reward.title}`,

          related_id:
            reward.id,

          image_path:
            null,

          event_date:
            timelineUsedAt,

          source_key:
            sourceKey,
        });

      if (
        timelineInsertError &&
        timelineInsertError.code !==
          "23505"
      ) {
        console.error(
          "약속 보상 타임라인 등록 오류:",
          timelineInsertError
        );
      }
    }

    setProcessingId(
      null
    );

    setMessage(
      "보상을 사용 완료했어요 ♡"
    );

    await loadRewards();
  }

  // =========================================
  // 레벨 보상 수정
  // =========================================

  function startEditLevelReward(
    reward: LevelRewardItem
  ) {
    setEditingLevelRewardId(
      reward.id
    );

    setLevelRewardTitleDraft(
      reward.title
    );

    setLevelRewardDescriptionDraft(
      reward.description ??
        ""
    );
  }

  function cancelEditLevelReward() {
    setEditingLevelRewardId(
      null
    );

    setLevelRewardTitleDraft(
      ""
    );

    setLevelRewardDescriptionDraft(
      ""
    );
  }

  async function saveLevelReward(
    reward: LevelRewardItem
  ) {
    const title =
      levelRewardTitleDraft.trim();

    if (!title) {
      setMessage(
        "레벨 보상 이름을 입력해주세요."
      );

      return;
    }

    setSavingLevelRewardId(
      reward.id
    );

    setMessage("");

    const {
      error,
    } = await supabase
      .from("level_rewards")
      .update({
        title,
        description:
          levelRewardDescriptionDraft
            .trim() ||
          null,
      })
      .eq(
        "id",
        reward.id
      );

    setSavingLevelRewardId(
      null
    );

    if (error) {
      console.error(
        "레벨 보상 수정 오류:",
        error
      );

      setMessage(
        `레벨 보상을 수정하지 못했어요: ${error.message}`
      );

      return;
    }

    cancelEditLevelReward();

    setMessage(
      "레벨 보상을 수정했어요 ♡"
    );

    await loadRewards();
  }

  // =========================================
  // 레벨 보상 사용
  // =========================================

  async function useLevelReward(
    reward: LevelRewardItem
  ) {
    if (!reward.unlocked) {
      return;
    }

    if (reward.is_used) {
      setMessage(
        "이미 사용 완료된 레벨 보상이에요."
      );
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
        `"${reward.title}" 레벨 보상을 사용 완료로 표시할까요?`
      );

    if (!confirmed) {
      return;
    }

    setUsingLevelRewardId(
      reward.id
    );

    setMessage("");

    const requestedUsedAt =
      new Date().toISOString();

    const {
      data: updatedReward,
      error: updateError,
    } = await supabase
      .from("level_rewards")
      .update({
        is_used: true,
        used_at:
          requestedUsedAt,
      })
      .eq(
        "id",
        reward.id
      )
      .eq(
        "couple_id",
        currentCoupleId
      )
      .eq(
        "unlocked",
        true
      )
      .eq(
        "is_used",
        false
      )
      .select(
        "id, is_used, used_at"
      )
      .maybeSingle();

    if (updateError) {
      setUsingLevelRewardId(
        null
      );

      console.error(
        "레벨 보상 사용 오류:",
        updateError
      );

      setMessage(
        `레벨 보상을 처리하지 못했어요: ${updateError.message}`
      );

      return;
    }

    if (!updatedReward) {
      setUsingLevelRewardId(
        null
      );

      setMessage(
        "레벨 보상 상태가 이미 변경됐거나 처리할 행을 찾지 못했어요."
      );

      await loadRewards();
      return;
    }

    const usedAt =
      updatedReward.used_at ??
      requestedUsedAt;

    const sourceKey =
      `level_reward_used:${reward.id}`;

    const {
      data: existingTimeline,
    } = await supabase
      .from(
        "couple_timeline_events"
      )
      .select(
        "id, source_key"
      )
      .eq(
        "couple_id",
        currentCoupleId
      )
      .eq(
        "source_key",
        sourceKey
      )
      .maybeSingle();

    if (!existingTimeline) {
      const {
        error: timelineInsertError,
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
            "level_reward_used",

          title:
            "🎁 레벨 보상을 사용했어요",

          description:
            `LV.${reward.unlock_level} · ${reward.title}`,

          related_id:
            reward.id,

          image_path:
            null,

          event_date:
            usedAt,

          source_key:
            sourceKey,
        });

      if (
        timelineInsertError &&
        timelineInsertError.code !==
          "23505"
      ) {
        console.error(
          "레벨 보상 타임라인 등록 오류:",
          timelineInsertError
        );
      }
    }

    setUsingLevelRewardId(
      null
    );

    setMessage(
      "레벨 보상을 사용 완료했어요 ♡"
    );

    await loadRewards();
  }

  // =========================================
  // 추억 남기기
  // =========================================

  function openMemoryModal(
    reward: LevelRewardItem
  ) {
    setMemoryTarget(
      reward
    );

    setMemoryMessage(
      ""
    );

    setMemoryFile(
      null
    );
  }

  async function saveLevelRewardMemory() {
    if (
      !memoryTarget ||
      !currentCoupleId ||
      !user
    ) {
      return;
    }

    if (
      !memoryMessage.trim() &&
      !memoryFile
    ) {
      setMessage(
        "사진이나 한마디 중 하나는 남겨주세요."
      );
      return;
    }

    if (
      memoryFile &&
      memoryFile.size >
        5 * 1024 * 1024
    ) {
      setMessage(
        "사진은 5MB 이하만 업로드할 수 있어요."
      );
      return;
    }

    if (
      memoryFile &&
      ![
        "image/jpeg",
        "image/png",
        "image/webp",
      ].includes(
        memoryFile.type
      )
    ) {
      setMessage(
        "JPG, PNG, WEBP 사진만 올릴 수 있어요."
      );
      return;
    }

    setSavingMemory(
      true
    );

    setMessage("");

    let photoPath:
      | string
      | null = null;

    if (memoryFile) {
      const safeName =
        memoryFile.name.replace(
          /[^a-zA-Z0-9._-]/g,
          "_"
        );

      photoPath =
        `${user.id}/${memoryTarget.id}/${Date.now()}-${safeName}`;

      const {
        error: uploadError,
      } = await supabase.storage
        .from(
          "level-reward-memories"
        )
        .upload(
          photoPath,
          memoryFile,
          {
            cacheControl:
              "3600",

            upsert:
              false,
          }
        );

      if (uploadError) {
        console.error(
          "추억 사진 업로드 오류:",
          uploadError
        );

        setSavingMemory(
          false
        );

        setMessage(
          `사진을 업로드하지 못했어요: ${uploadError.message}`
        );

        return;
      }
    }

    const {
      data: insertedMemory,
      error: insertError,
    } = await supabase
      .from(
        "level_reward_memories"
      )
      .insert({
        level_reward_id:
          memoryTarget.id,

        couple_id:
          currentCoupleId,

        user_id:
          user.id,

        message:
          memoryMessage.trim() ||
          null,

        photo_path:
          photoPath,
      })
      .select(
        "id, created_at"
      )
      .single();

    if (insertError) {
      if (photoPath) {
        await supabase.storage
          .from(
            "level-reward-memories"
          )
          .remove([
            photoPath,
          ]);
      }

      setSavingMemory(
        false
      );

      setMessage(
        `추억을 저장하지 못했어요: ${insertError.message}`
      );

      return;
    }

    if (insertedMemory) {
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
            "memory_created",

          title:
            "📷 새로운 추억을 남겼어요",

          description:
            memoryMessage.trim() ||
            "우리 둘만의 추억 ♡",

          related_id:
            insertedMemory.id,

          image_path:
            photoPath,

          event_date:
            insertedMemory.created_at,

          source_key:
            `memory_created:${insertedMemory.id}`,
        });

      if (timelineError) {
        console.error(
          "추억 타임라인 저장 오류:",
          timelineError
        );
      }
    }

    setSavingMemory(
      false
    );

    setMemoryTarget(
      null
    );

    setMemoryMessage(
      ""
    );

    setMemoryFile(
      null
    );

    setMessage(
      "레벨 보상 추억을 남겼어요 ♡"
    );

    await loadRewards();
  }

  if (
    authLoading ||
    loading
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fff8fb]">
        <p className="text-sm text-gray-500">
          보상 불러오는 중...
        </p>
      </main>
    );
  }

  // =========================================
  // 화면 계산
  // =========================================

  const unlockedCount =
    rewards.filter(
      (reward) =>
        reward.is_unlocked
    ).length;

  const usedCount =
    rewards.filter(
      (reward) =>
        reward.is_used
    ).length;

  const groupedRewards =
    Array.from(
      rewards.reduce(
        (
          map,
          reward
        ) => {
          const current =
            map.get(
              reward.promise_id
            ) ?? {
              promise_id:
                reward.promise_id,

              promise_title:
                reward.promise_title,

              current_streak:
                reward.current_streak,

              is_joint:
                reward.is_joint,

              rewards:
                [] as RewardItem[],
            };

          current.rewards.push(
            reward
          );

          current.current_streak =
            Math.max(
              current.current_streak,
              reward.current_streak
            );

          map.set(
            reward.promise_id,
            current
          );

          return map;
        },
        new Map<
          string,
          {
            promise_id: string;
            promise_title: string;
            current_streak: number;
            is_joint: boolean;
            rewards: RewardItem[];
          }
        >()
      ).values()
    ).map(
      (group) => ({
        ...group,

        rewards: [
          ...group.rewards,
        ].sort(
          (
            a,
            b
          ) =>
            a.required_days -
            b.required_days
        ),
      })
    );

  const totalRewardCount =
    rewards.length;

  const lockedCount =
    Math.max(
      totalRewardCount -
        unlockedCount,
      0
    );

  const nextGlobalReward =
    rewards
      .filter(
        (reward) =>
          !reward.is_unlocked
      )
      .sort(
        (
          a,
          b
        ) =>
          Math.max(
            a.required_days -
              a.current_streak,
            0
          ) -
          Math.max(
            b.required_days -
              b.current_streak,
            0
          )
      )[0] ?? null;

  const nextGlobalRemaining =
    nextGlobalReward
      ? Math.max(
          nextGlobalReward.required_days -
            nextGlobalReward.current_streak,
          0
        )
      : 0;

  function togglePromiseRewards(
    promiseId: string
  ) {
    setExpandedPromiseIds(
      (prev) =>
        prev.includes(
          promiseId
        )
          ? prev.filter(
              (id) =>
                id !==
                promiseId
            )
          : [
              ...prev,
              promiseId,
            ]
    );
  }

  return (
    <main className="min-h-screen bg-[#fff8fb] px-5 py-8 text-[#2b2b2b]">
      <div className="mx-auto max-w-md pb-28">

        {/* HEADER */}

        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black tracking-[0.22em] text-pink-400">
              OUR REWARDS
            </p>

            <h1 className="mt-2 text-[30px] font-black tracking-tight">
              우리의 보상 🎁
            </h1>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              함께 지킨 시간만큼
              <br />
              우리만의 선물이 하나씩 열려요 ♡
            </p>
          </div>

          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-pink-100 bg-white shadow-sm">
            <img
              src={REWARD_IMAGES.mainChest}
              alt=""
              aria-hidden="true"
              className="h-10 w-10 object-contain"
            />
          </div>
        </header>

        {/* TREASURE HERO */}

        <section className="relative mt-6 overflow-hidden rounded-[32px] border border-pink-100 bg-gradient-to-br from-[#fff9fc] via-white to-[#fff6ec] p-5 shadow-sm">
          <div className="pointer-events-none absolute -right-10 -top-8 h-40 w-40 rounded-full bg-pink-100/60 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-amber-100/60 blur-3xl" />

          <div className="relative z-10 flex min-h-[150px] items-center">
            <div className="max-w-[58%]">
              <p className="text-[11px] font-black tracking-[0.18em] text-pink-400">
                OUR TREASURE
              </p>

              <h2 className="mt-2 text-2xl font-black">
                우리의 보물함
              </h2>

              <p className="mt-2 text-sm leading-6 text-gray-500">
                사랑이 쌓일수록
                <br />
                더 많은 보상이 열려요 ♡
              </p>
            </div>

            <img
              src={REWARD_IMAGES.mainChest}
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute -right-2 bottom-0 h-[145px] w-[160px] object-contain drop-shadow-sm"
            />
          </div>

          <div className="relative z-10 mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-[22px] border border-white/80 bg-white/85 p-3 shadow-sm">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-pink-50">
                <img
                  src={REWARD_IMAGES.unlocked}
                  alt=""
                  aria-hidden="true"
                  className="h-8 w-8 object-contain"
                />
              </div>

              <p className="mt-3 text-[10px] font-semibold text-gray-400">
                해금한 보상
              </p>

              <p className="mt-1 text-xl font-black text-pink-500">
                {unlockedCount}
                <span className="ml-1 text-xs text-gray-400">
                  개
                </span>
              </p>
            </div>

            <div className="rounded-[22px] border border-white/80 bg-white/85 p-3 shadow-sm">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-green-50">
                <img
                  src={REWARD_IMAGES.used}
                  alt=""
                  aria-hidden="true"
                  className="h-8 w-8 object-contain"
                />
              </div>

              <p className="mt-3 text-[10px] font-semibold text-gray-400">
                사용한 보상
              </p>

              <p className="mt-1 text-xl font-black text-green-600">
                {usedCount}
                <span className="ml-1 text-xs text-gray-400">
                  개
                </span>
              </p>
            </div>

            <div className="rounded-[22px] border border-white/80 bg-white/85 p-3 shadow-sm">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-purple-50 text-lg">
                ✦
              </div>

              <p className="mt-3 text-[10px] font-semibold text-gray-400">
                다음 보상
              </p>

              <p className="mt-1 text-xl font-black text-purple-500">
                {nextGlobalReward
                  ? nextGlobalRemaining
                  : 0}
                <span className="ml-1 text-xs text-gray-400">
                  일
                </span>
              </p>
            </div>
          </div>

          <div className="relative z-10 mt-3 flex items-center justify-between rounded-[20px] bg-white/70 px-4 py-3">
            <p className="text-xs font-semibold text-gray-500">
              잠겨 있는 보상
            </p>

            <p className="text-sm font-black text-gray-700">
              {lockedCount}개
            </p>
          </div>
        </section>

        {message && (
          <div className="mt-4 rounded-2xl border border-pink-100 bg-white/90 px-4 py-3 text-center text-xs font-semibold text-gray-500 shadow-sm">
            {message}
          </div>
        )}

        {/* PROMISE REWARDS */}

        <section className="mt-7">
          <button
            type="button"
            onClick={() => {
              setShowPromiseRewards(
                (prev) => !prev
              );

              if (
                showPromiseRewards
              ) {
                setExpandedPromiseIds(
                  []
                );
              }
            }}
            className="flex w-full items-center justify-between rounded-[26px] border border-pink-100 bg-white px-4 py-4 text-left shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-pink-50 text-xl">
                🎖️
              </div>

              <div>
                <p className="font-black">
                  약속 달성 보상
                </p>

                <p className="mt-1 text-xs text-gray-400">
                  약속을 지키며 보상을 잠금 해제해요
                </p>
              </div>
            </div>

            <span className="text-xs font-black text-pink-400">
              {showPromiseRewards
                ? "전체 접기 ⌃"
                : "전체 보기 ⌄"}
            </span>
          </button>

          {showPromiseRewards && (
            <div className="mt-4 space-y-4">
              {groupedRewards.length ===
              0 ? (
                <div className="rounded-[30px] border border-dashed border-pink-200 bg-white p-8 text-center shadow-sm">
                  <div className="text-4xl">
                    🎀
                  </div>

                  <p className="mt-4 font-black">
                    아직 약속 보상이 없어요
                  </p>

                  <p className="mt-2 text-sm leading-6 text-gray-400">
                    새로운 약속을 만들면서
                    <br />
                    보상도 함께 정해보세요.
                  </p>

                  <Link
                    href="/promise/new"
                    prefetch={false}
                    className="mt-5 block rounded-2xl bg-pink-500 px-4 py-3.5 text-center text-sm font-black text-white"
                  >
                    새 약속 만들기
                  </Link>
                </div>
              ) : (
                groupedRewards.map(
                  (group) => {
                    const isExpanded =
                      expandedPromiseIds.includes(
                        group.promise_id
                      );

                    const nextReward =
                      group.rewards.find(
                        (reward) =>
                          !reward.is_unlocked
                      );

                    const completedCount =
                      group.rewards.filter(
                        (reward) =>
                          reward.is_unlocked
                      ).length;

                    const targetDays =
                      nextReward
                        ?.required_days ??
                      group.rewards[
                        group.rewards.length -
                          1
                      ]
                        ?.required_days ??
                      0;

                    const progressDays =
                      targetDays > 0
                        ? Math.min(
                            group.current_streak,
                            targetDays
                          )
                        : 0;

                    const progressPercent =
                      targetDays > 0
                        ? Math.min(
                            (
                              progressDays /
                              targetDays
                            ) *
                              100,
                            100
                          )
                        : 100;

                    const remaining =
                      nextReward
                        ? Math.max(
                            nextReward.required_days -
                              group.current_streak,
                            0
                          )
                        : 0;

                    return (
                      <article
                        key={
                          group.promise_id
                        }
                        className="overflow-hidden rounded-[30px] border border-pink-100 bg-gradient-to-b from-white to-[#fffafd] shadow-sm"
                      >
                        <div className="p-5">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-pink-50 px-3 py-1 text-[10px] font-black tracking-[0.12em] text-pink-500">
                                  PROMISE REWARD
                                </span>

                                <span className="text-[11px] font-semibold text-gray-400">
                                  현재{" "}
                                  {
                                    group.current_streak
                                  }
                                  일 연속
                                </span>
                              </div>

                              <h2 className="mt-3 break-words text-xl font-black leading-7">
                                {
                                  group.promise_title
                                }
                              </h2>

                              {group.is_joint && (
                                <p className="mt-1 text-xs font-bold text-pink-400">
                                  💕 함께 달성하는 보상
                                </p>
                              )}
                            </div>

                            <div className="shrink-0 rounded-2xl bg-[#fff7fb] px-3 py-2 text-center">
                              <p className="text-[9px] font-semibold text-gray-400">
                                해금
                              </p>

                              <p className="mt-0.5 text-sm font-black text-pink-500">
                                {
                                  completedCount
                                }
                                /
                                {
                                  group.rewards.length
                                }
                              </p>
                            </div>
                          </div>

                          {/* ROADMAP */}

                          <div
                            className={`relative mt-6 grid gap-2 ${
                              group.rewards.length >=
                              3
                                ? "grid-cols-3"
                                : group.rewards.length ===
                                    2
                                  ? "grid-cols-2"
                                  : "grid-cols-1"
                            }`}
                          >
                            {group.rewards.map(
                              (
                                reward
                              ) => {
                                const unlocked =
                                  reward.is_unlocked;

                                const used =
                                  reward.is_used;

                                return (
                                  <div
                                    key={
                                      reward.id
                                    }
                                    className={`rounded-[22px] border px-2 py-3 text-center ${
                                      used
                                        ? "border-green-100 bg-green-50/70"
                                        : unlocked
                                          ? "border-pink-200 bg-pink-50/80"
                                          : "border-purple-100 bg-purple-50/45"
                                    }`}
                                  >
                                    <p className="text-[11px] font-black text-gray-600">
                                      {
                                        reward.required_days
                                      }
                                      일
                                    </p>

                                    <div className="mx-auto mt-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm">
                                      {used ? (
                                        <img
                                          src={REWARD_IMAGES.used}
                                          alt=""
                                          className="h-10 w-10 object-contain"
                                        />
                                      ) : unlocked ? (
                                        <img
                                          src={REWARD_IMAGES.unlocked}
                                          alt=""
                                          className="h-10 w-10 object-contain"
                                        />
                                      ) : (
                                        <img
                                          src={REWARD_IMAGES.locked}
                                          alt=""
                                          aria-hidden="true"
                                          className="h-10 w-10 object-contain"
                                        />
                                      )}
                                    </div>

                                    <p
                                      className={`mt-2 text-[10px] font-black ${
                                        used
                                          ? "text-green-600"
                                          : unlocked
                                            ? "text-pink-500"
                                            : "text-purple-400"
                                      }`}
                                    >
                                      {used
                                        ? "사용 완료"
                                        : unlocked
                                          ? "해금 완료"
                                          : "잠김"}
                                    </p>
                                  </div>
                                );
                              }
                            )}
                          </div>

                          {/* NEXT REWARD */}

                          <div className="mt-5 rounded-[22px] border border-pink-100 bg-gradient-to-r from-[#fff8fb] to-[#fffaf3] p-4">
                            {nextReward ? (
                              <>
                                <div className="flex items-center justify-between gap-3">
                                  <div>
                                    <p className="text-[10px] font-black tracking-[0.12em] text-pink-400">
                                      NEXT REWARD
                                    </p>

                                    <p className="mt-1 text-sm font-black">
                                      다음 선물까지{" "}
                                      {
                                        remaining
                                      }
                                      일 ♡
                                    </p>
                                  </div>

                                  <span className="text-sm font-black text-pink-500">
                                    {
                                      progressDays
                                    }
                                    /
                                    {
                                      targetDays
                                    }
                                    일
                                  </span>
                                </div>

                                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-pink-100/70">
                                  <div
                                    className="h-full rounded-full bg-gradient-to-r from-pink-400 to-rose-300 transition-all"
                                    style={{
                                      width:
                                        `${progressPercent}%`,
                                    }}
                                  />
                                </div>
                              </>
                            ) : (
                              <div className="text-center">
                                <img
                                  src={REWARD_IMAGES.unlockCelebration}
                                  alt=""
                                  aria-hidden="true"
                                  className="mx-auto h-24 w-28 object-contain"
                                />

                                <p className="mt-2 font-black text-pink-500">
                                  모든 보상을 해금했어요!
                                </p>

                                <p className="mt-1 text-xs text-gray-400">
                                  둘이 함께 만든 멋진 기록이에요 ♡
                                </p>
                              </div>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              togglePromiseRewards(
                                group.promise_id
                              )
                            }
                            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-pink-100 bg-white px-4 py-3 text-sm font-black text-gray-500 shadow-sm"
                          >
                            {isExpanded
                              ? "보상 접기"
                              : "보상 자세히 보기"}

                            <span>
                              {isExpanded
                                ? "⌃"
                                : "⌄"}
                            </span>
                          </button>
                        </div>

                        {isExpanded && (
                          <div className="border-t border-pink-50 bg-[#fffdfd] p-4">
                            <div className="space-y-3">
                              {group.rewards.map(
                                (
                                  reward
                                ) => (
                                  <div
                                    key={
                                      reward.id
                                    }
                                    className={`rounded-[22px] border p-4 ${
                                      reward.is_used
                                        ? "border-green-100 bg-green-50/60"
                                        : reward.is_unlocked
                                          ? "border-pink-100 bg-white"
                                          : "border-purple-100 bg-purple-50/30"
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="min-w-0">
                                        <p className="text-[10px] font-black tracking-[0.12em] text-pink-400">
                                          {
                                            reward.required_days
                                          }
                                          DAY REWARD
                                        </p>

                                        <p className="mt-1 break-words font-black">
                                          {reward.is_secret &&
                                          !reward.is_unlocked
                                            ? "달성 후 공개돼요 ♡"
                                            : reward.title}
                                        </p>

                                        {reward.description &&
                                          (!reward.is_secret ||
                                            reward.is_unlocked) && (
                                            <p className="mt-2 text-sm leading-6 text-gray-500">
                                              {
                                                reward.description
                                              }
                                            </p>
                                          )}
                                      </div>

                                      <span className="text-2xl">
                                        {reward.is_used
                                          ? "✅"
                                          : reward.is_unlocked
                                            ? "🎁"
                                            : "🔒"}
                                      </span>
                                    </div>

                                    {reward.is_unlocked &&
                                      !reward.is_used && (
                                        <button
                                          type="button"
                                          disabled={
                                            processingId ===
                                            reward.id
                                          }
                                          onClick={() =>
                                            void useReward(
                                              reward
                                            )
                                          }
                                          className="mt-4 w-full rounded-2xl bg-gradient-to-r from-[#ff8eb9] to-[#ef77b8] px-4 py-3.5 text-sm font-black text-white shadow-sm disabled:opacity-50"
                                        >
                                          {processingId ===
                                          reward.id
                                            ? "처리 중..."
                                            : "🎁 보상 사용하기"}
                                        </button>
                                      )}

                                    {reward.is_used && (
                                      <div className="mt-4 rounded-2xl bg-green-100/60 px-4 py-3 text-center text-sm font-black text-green-600">
                                        ✓ 사용 완료
                                      </div>
                                    )}
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        )}
                      </article>
                    );
                  }
                )
              )}
            </div>
          )}
        </section>

        {/* LEVEL REWARDS */}

        <section className="mt-7">
          <button
            type="button"
            onClick={() =>
              setShowLevelRewards(
                (prev) => !prev
              )
            }
            className="flex w-full items-center justify-between rounded-[26px] border border-purple-100 bg-gradient-to-r from-white to-purple-50/60 px-4 py-4 text-left shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50/70">
                <img
                  src={REWARD_IMAGES.level}
                  alt=""
                  aria-hidden="true"
                  className="h-10 w-10 object-contain"
                />
              </div>

              <div>
                <p className="font-black">
                  우리 레벨 보상
                </p>

                <p className="mt-1 text-xs text-gray-400">
                  {
                    levelRewards.filter(
                      (
                        reward
                      ) =>
                        reward.unlocked
                    ).length
                  }
                  {" / "}
                  {
                    levelRewards.length
                  }{" "}
                  해금
                </p>
              </div>
            </div>

            <span className="text-xs font-black text-purple-400">
              {showLevelRewards
                ? "접기 ⌃"
                : "보기 ⌄"}
            </span>
          </button>

          {showLevelRewards && (
            <div className="mt-4">
              {levelRewards.length ===
              0 ? (
                <div className="rounded-[30px] border border-dashed border-purple-200 bg-gradient-to-br from-white to-purple-50/50 p-8 text-center">
                  <img
                    src={REWARD_IMAGES.levelEmpty}
                    alt=""
                    aria-hidden="true"
                    className="mx-auto h-32 w-40 object-contain"
                  />

                  <p className="mt-4 font-black">
                    아직 레벨 보상이 없어요
                  </p>

                  <p className="mt-2 text-sm leading-6 text-gray-400">
                    레벨 보상 슬롯이 만들어지면
                    <br />
                    이곳에 특별한 선물이 나타나요 ♡
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {levelRewards.map(
                    (
                      reward
                    ) => {
                      const isEditing =
                        editingLevelRewardId ===
                        reward.id;

                      const isSaving =
                        savingLevelRewardId ===
                        reward.id;

                      const isUsing =
                        usingLevelRewardId ===
                        reward.id;

                      return (
                        <article
                          key={
                            reward.id
                          }
                          className={`rounded-[28px] border p-5 shadow-sm ${
                            reward.is_used
                              ? "border-green-100 bg-gradient-to-br from-white to-green-50/50"
                              : reward.unlocked
                                ? "border-amber-100 bg-gradient-to-br from-white to-amber-50/50"
                                : "border-purple-100 bg-gradient-to-br from-white to-purple-50/40"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] font-black tracking-[0.14em] text-purple-400">
                                COUPLE LEVEL REWARD
                              </p>

                              <p className="mt-1 text-sm font-black text-amber-500">
                                LV.
                                {
                                  reward.unlock_level
                                }
                              </p>

                              {!isEditing && (
                                <h3 className="mt-1 break-words text-lg font-black">
                                  {
                                    reward.title
                                  }
                                </h3>
                              )}
                            </div>

                            <div className="text-3xl">
                              {reward.is_used
                                ? "✅"
                                : reward.unlocked
                                  ? "🎁"
                                  : "🔒"}
                            </div>
                          </div>

                          {isEditing ? (
                            <div className="mt-4 space-y-3 rounded-[22px] bg-white/80 p-4">
                              <input
                                type="text"
                                value={
                                  levelRewardTitleDraft
                                }
                                onChange={(
                                  e
                                ) =>
                                  setLevelRewardTitleDraft(
                                    e.target.value
                                  )
                                }
                                maxLength={
                                  80
                                }
                                className="w-full rounded-2xl border border-purple-100 bg-white px-4 py-3 text-sm outline-none"
                                placeholder="보상 이름"
                              />

                              <textarea
                                value={
                                  levelRewardDescriptionDraft
                                }
                                onChange={(
                                  e
                                ) =>
                                  setLevelRewardDescriptionDraft(
                                    e.target.value
                                  )
                                }
                                rows={3}
                                maxLength={
                                  250
                                }
                                className="w-full resize-none rounded-2xl border border-purple-100 bg-white px-4 py-3 text-sm leading-6 outline-none"
                                placeholder="보상 설명"
                              />

                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  onClick={
                                    cancelEditLevelReward
                                  }
                                  className="rounded-2xl border border-purple-100 bg-white px-4 py-3 text-sm font-black text-gray-500"
                                >
                                  취소
                                </button>

                                <button
                                  type="button"
                                  disabled={
                                    isSaving
                                  }
                                  onClick={() =>
                                    void saveLevelReward(
                                      reward
                                    )
                                  }
                                  className="rounded-2xl bg-purple-400 px-4 py-3 text-sm font-black text-white disabled:opacity-50"
                                >
                                  {isSaving
                                    ? "저장 중..."
                                    : "저장하기"}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              {reward.description && (
                                <p className="mt-3 text-sm leading-6 text-gray-500">
                                  {
                                    reward.description
                                  }
                                </p>
                              )}

                              <button
                                type="button"
                                onClick={() =>
                                  startEditLevelReward(
                                    reward
                                  )
                                }
                                className="mt-4 w-full rounded-2xl border border-purple-100 bg-white px-4 py-3 text-sm font-black text-gray-500"
                              >
                                ✏️ 보상 내용 수정
                              </button>
                            </>
                          )}

                          {!isEditing &&
                            !reward.unlocked && (
                              <div className="mt-4 rounded-[20px] bg-purple-50/70 px-4 py-4 text-center">
                                <p className="font-black text-purple-500">
                                  🔒 LV.
                                  {
                                    reward.unlock_level
                                  }
                                  에 해금
                                </p>

                                <p className="mt-1 text-xs text-gray-400">
                                  함께 XP를 모아 특별한 보상을 열어봐요 ♡
                                </p>
                              </div>
                            )}

                          {!isEditing &&
                            reward.unlocked &&
                            !reward.is_used && (
                              <>
                                <div className="mt-4 rounded-[20px] bg-amber-50 px-4 py-4 text-center">
                                  <img
                                    src={REWARD_IMAGES.level}
                                    alt=""
                                    aria-hidden="true"
                                    className="mx-auto h-20 w-24 object-contain"
                                  />

                                  <p className="mt-2 font-black text-amber-600">
                                    레벨 보상 해금 완료!
                                  </p>
                                </div>

                                <button
                                  type="button"
                                  disabled={
                                    isUsing
                                  }
                                  onClick={() =>
                                    void useLevelReward(
                                      reward
                                    )
                                  }
                                  className="mt-3 w-full rounded-2xl bg-gradient-to-r from-amber-400 to-orange-300 px-4 py-4 font-black text-white shadow-sm disabled:opacity-50"
                                >
                                  {isUsing
                                    ? "처리 중..."
                                    : "🎁 레벨 보상 사용하기"}
                                </button>
                              </>
                            )}

                          {!isEditing &&
                            reward.is_used && (
                              <>
                                <div className="mt-4 rounded-[20px] bg-green-50 px-4 py-4 text-center">
                                  <p className="font-black text-green-600">
                                    ✓ 사용한 레벨 보상
                                  </p>

                                  {reward.used_at && (
                                    <p className="mt-2 text-xs font-bold text-green-500">
                                      {
                                        formatUsedDate(
                                          reward.used_at
                                        )
                                      }{" "}
                                      사용 완료 ♡
                                    </p>
                                  )}
                                </div>

                                <button
                                  type="button"
                                  onClick={() =>
                                    openMemoryModal(
                                      reward
                                    )
                                  }
                                  className="mt-3 w-full rounded-2xl border border-pink-200 bg-white px-4 py-4 font-black text-pink-500"
                                >
                                  📷 추억 남기기
                                </button>

                                {levelRewardMemories
                                  .filter(
                                    (
                                      memory
                                    ) =>
                                      memory.level_reward_id ===
                                      reward.id
                                  )
                                  .map(
                                    (
                                      memory
                                    ) => (
                                      <div
                                        key={
                                          memory.id
                                        }
                                        className="mt-3 overflow-hidden rounded-[22px] border border-pink-100 bg-white"
                                      >
                                        {memory.photo_url && (
                                          <img
                                            src={
                                              memory.photo_url
                                            }
                                            alt="레벨 보상 추억 사진"
                                            className="h-48 w-full object-cover"
                                          />
                                        )}

                                        <div className="p-4">
                                          {memory.message && (
                                            <p className="text-sm leading-6 text-gray-600">
                                              {
                                                memory.message
                                              }
                                            </p>
                                          )}

                                          <p className="mt-2 text-xs text-gray-400">
                                            {
                                              formatUsedDate(
                                                memory.created_at
                                              )
                                            }{" "}
                                            추억 ♡
                                          </p>
                                        </div>
                                      </div>
                                    )
                                  )}
                              </>
                            )}
                        </article>
                      );
                    }
                  )}
                </div>
              )}
            </div>
          )}
        </section>

        {/* MEMORY MODAL */}

        {memoryTarget && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 px-5">
            <div className="w-full max-w-sm rounded-[34px] border border-pink-100 bg-white p-6 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black tracking-[0.2em] text-pink-400">
                    OUR MEMORY
                  </p>

                  <h2 className="mt-2 text-2xl font-black">
                    추억 남기기 ♡
                  </h2>

                  <p className="mt-2 text-sm text-gray-500">
                    LV.
                    {
                      memoryTarget.unlock_level
                    }{" "}
                    {
                      memoryTarget.title
                    }
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (
                      !savingMemory
                    ) {
                      setMemoryTarget(
                        null
                      );
                    }
                  }}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl bg-pink-50 text-gray-400"
                >
                  ×
                </button>
              </div>

              <div className="mt-6">
                <label className="text-sm font-black text-gray-700">
                  사진
                </label>

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(
                    e
                  ) =>
                    setMemoryFile(
                      e.target.files?.[0] ??
                        null
                    )
                  }
                  className="mt-2 block w-full rounded-2xl border border-pink-100 bg-[#fff8fb] px-4 py-3 text-sm text-gray-500"
                />
              </div>

              <div className="mt-5">
                <label className="text-sm font-black text-gray-700">
                  한마디
                </label>

                <textarea
                  value={
                    memoryMessage
                  }
                  onChange={(
                    e
                  ) =>
                    setMemoryMessage(
                      e.target.value
                    )
                  }
                  rows={4}
                  maxLength={300}
                  placeholder="이 보상을 사용한 날의 이야기를 남겨보세요 ♡"
                  className="mt-2 w-full resize-none rounded-2xl border border-pink-100 bg-[#fff8fb] px-4 py-3 text-sm leading-6 outline-none"
                />

                <p className="mt-1 text-right text-xs text-gray-400">
                  {
                    memoryMessage.length
                  }
                  {" / 300"}
                </p>
              </div>

              <button
                type="button"
                disabled={
                  savingMemory
                }
                onClick={() =>
                  void saveLevelRewardMemory()
                }
                className="mt-5 w-full rounded-2xl bg-gradient-to-r from-[#ff8eb9] to-[#ef77b8] px-5 py-4 font-black text-white disabled:opacity-50"
              >
                {savingMemory
                  ? "저장 중..."
                  : "💕 추억 저장하기"}
              </button>
            </div>
          </div>
        )}

        <BottomNav />
      </div>
    </main>
  );
}
