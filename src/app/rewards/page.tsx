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

  // =========================================
  // 공통 로그인 정보
  // =========================================

  const {
    user,
    loading: authLoading,
  } = useAuth();

  // =========================================
  // 상태
  // =========================================

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
  ] = useState<string | null>(null);

  const [
    levelRewardMemories,
    setLevelRewardMemories,
  ] = useState<LevelRewardMemory[]>([]);

  const [
    memoryTarget,
    setMemoryTarget,
  ] = useState<LevelRewardItem | null>(null);

  const [
    memoryMessage,
    setMemoryMessage,
  ] = useState("");

  const [
    memoryFile,
    setMemoryFile,
  ] = useState<File | null>(null);

  const [
    savingMemory,
    setSavingMemory,
  ] = useState(false);

  const [
    editingLevelRewardId,
    setEditingLevelRewardId,
  ] = useState<string | null>(null);

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
  ] = useState<string | null>(null);

  const [
    usingLevelRewardId,
    setUsingLevelRewardId,
  ] = useState<string | null>(null);

  // =========================================
  // 보상 불러오기
  // =========================================

  const loadRewards =
    useCallback(
      async () => {
        // AuthProvider가 로그인 확인 중이면 기다림
        if (authLoading) {
          return;
        }

        // 로그인 확인이 끝났는데 사용자가 없을 때만 이동
        if (!user) {
          window.location.href =
            "/login";

          return;
        }

        setLoading(true);
        setMessage("");

        // =====================================
        // 내가 속한 커플
        // =====================================

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
            `커플 조회 오류 | message=${membershipError.message} | code=${membershipError.code} | details=${membershipError.details ?? ""} | hint=${membershipError.hint ?? ""}`
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

        // =====================================
        // 레벨 보상 조회
        // =====================================

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
            `레벨 보상 조회 오류 | message=${levelRewardError.message} | code=${levelRewardError.code} | details=${levelRewardError.details ?? ""} | hint=${levelRewardError.hint ?? ""}`
          );
        } else {
          setLevelRewards(
            (levelRewardRows ??
              []) as LevelRewardItem[]
          );
        }

        // =====================================
        // 레벨 보상 추억 조회
        // =====================================

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
            (memoryRows ?? []).map(
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

        // =====================================
        // 보상 조회
        // =====================================

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
            `보상 조회 오류 | message=${rewardError.message} | code=${rewardError.code} | details=${rewardError.details ?? ""} | hint=${rewardError.hint ?? ""}`
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

        // =====================================
        // 연결된 약속 조회
        // =====================================

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
            `약속 조회 오류 | message=${promiseError.message} | code=${promiseError.code} | details=${promiseError.details ?? ""} | hint=${promiseError.hint ?? ""}`
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

  // =========================================
  // 최초 실행
  // =========================================

  useEffect(() => {
    loadRewards();
  }, [loadRewards]);

  // =========================================
  // 보상 사용 완료
  // =========================================

  async function useReward(
    reward: RewardItem
  ) {
    if (!reward.is_unlocked) {
      return;
    }

    if (reward.is_used) {
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
        used_at:
          usedAt,
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
      .select(
        "id"
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

    if (timelineCheckError) {
      setProcessingId(
        null
      );

      console.error(
        "약속 보상 타임라인 확인 오류:",
        timelineCheckError
      );

      setMessage(
        `보상은 사용 완료됐지만 타임라인 확인에 실패했어요: ${timelineCheckError.message}`
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
        setProcessingId(
          null
        );

        console.error(
          "약속 보상 타임라인 등록 오류:",
          timelineInsertError
        );

        setMessage(
          `보상은 사용 완료됐지만 타임라인 등록에 실패했어요: ${timelineInsertError.message}`
        );

        await loadRewards();
        return;
      }
    }

    setProcessingId(
      null
    );

    setMessage(
      "보상을 사용 완료했고 타임라인에도 기록했어요 ♡"
    );

    await loadRewards();
  }

  // =========================================
  // 레벨 보상 수정 시작
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
      reward.description ?? ""
    );
  }

  // =========================================
  // 레벨 보상 수정 취소
  // =========================================

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

  // =========================================
  // 레벨 보상 저장
  // =========================================

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
            .trim() || null,
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

    setEditingLevelRewardId(
      null
    );

    setLevelRewardTitleDraft(
      ""
    );

    setLevelRewardDescriptionDraft(
      ""
    );

    setMessage(
      "레벨 보상을 수정했어요 ♡"
    );

    await loadRewards();
  }

  // =========================================
  // 레벨 보상 사용 완료
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

    // =====================================
    // 1. 레벨 보상 사용 완료 처리
    // 실제로 변경된 행을 다시 받아서 확인
    // =====================================

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
        `레벨 보상을 처리하지 못했어요: ${updateError.message} (${updateError.code ?? "no-code"})`
      );

      return;
    }

    // update()는 조건에 맞는 행이 없어도 error가 null일 수 있어서
    // 실제 변경된 행이 있는지 반드시 확인
    if (!updatedReward) {
      setUsingLevelRewardId(
        null
      );

      console.warn(
        "레벨 보상 사용 행 없음:",
        {
          rewardId:
            reward.id,
          coupleId:
            currentCoupleId,
        }
      );

      setMessage(
        "레벨 보상 상태가 이미 변경됐거나 처리할 행을 찾지 못했어요. 새로고침 후 다시 확인해주세요."
      );

      await loadRewards();
      return;
    }

    const usedAt =
      updatedReward.used_at ??
      requestedUsedAt;

    const sourceKey =
      `level_reward_used:${reward.id}`;

    // =====================================
    // 2. 같은 타임라인 기록이 이미 있는지 확인
    // =====================================

    const {
      data: existingTimeline,
      error: timelineCheckError,
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

    if (timelineCheckError) {
      setUsingLevelRewardId(
        null
      );

      console.error(
        "레벨 보상 타임라인 중복 확인 오류:",
        timelineCheckError
      );

      setMessage(
        `레벨 보상은 사용 완료됐지만 타임라인 확인에 실패했어요: ${timelineCheckError.message} (${timelineCheckError.code ?? "no-code"})`
      );

      await loadRewards();
      return;
    }

    // =====================================
    // 3. 없을 때만 타임라인 자동 등록
    // =====================================

    if (!existingTimeline) {
      const {
        data: insertedTimeline,
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
        })
        .select(
          "id, event_type, source_key"
        )
        .single();

      if (timelineInsertError) {
        setUsingLevelRewardId(
          null
        );

        console.error(
          "레벨 보상 타임라인 등록 오류:",
          {
            message:
              timelineInsertError.message,
            code:
              timelineInsertError.code,
            details:
              timelineInsertError.details,
            hint:
              timelineInsertError.hint,
          }
        );

        setMessage(
          `레벨 보상은 사용 완료됐지만 타임라인 등록에 실패했어요: ${timelineInsertError.message} (${timelineInsertError.code ?? "no-code"})`
        );

        await loadRewards();
        return;
      }

      console.log(
        "레벨 보상 타임라인 등록 성공:",
        insertedTimeline
      );
    } else {
      console.log(
        "이미 존재하는 레벨 보상 타임라인:",
        existingTimeline
      );
    }

    setUsingLevelRewardId(
      null
    );

    setMessage(
      existingTimeline
        ? "레벨 보상은 사용 완료됐고 기존 타임라인 기록도 확인했어요 ♡"
        : "레벨 보상을 사용 완료했고 타임라인에도 기록했어요 ♡"
    );

    await loadRewards();
  }

  // =========================================
  // 레벨 보상 추억 남기기
  // =========================================

  function openMemoryModal(
    reward: LevelRewardItem
  ) {
    setMemoryTarget(reward);
    setMemoryMessage("");
    setMemoryFile(null);
  }

  async function saveLevelRewardMemory() {
    if (!memoryTarget || !currentCoupleId || !user) {
      return;
    }

    if (!memoryMessage.trim() && !memoryFile) {
      setMessage(
        "사진이나 한마디 중 하나는 남겨주세요."
      );
      return;
    }

    if (memoryFile && memoryFile.size > 5 * 1024 * 1024) {
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
      ].includes(memoryFile.type)
    ) {
      setMessage(
        "JPG, PNG, WEBP 사진만 올릴 수 있어요."
      );
      return;
    }

    setSavingMemory(true);
    setMessage("");

    let photoPath: string | null = null;

    if (memoryFile) {
      const safeName =
        memoryFile.name.replace(
          /[^a-zA-Z0-9._-]/g,
          "_"
        );

      photoPath =
        `${user.id}/${memoryTarget.id}/${Date.now()}-${safeName}`;

      const { error: uploadError } =
        await supabase.storage
          .from("level-reward-memories")
          .upload(
            photoPath,
            memoryFile,
            {
              cacheControl: "3600",
              upsert: false,
            }
          );

      if (uploadError) {
        console.error(
          "추억 사진 업로드 오류:",
          uploadError
        );
        setSavingMemory(false);
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
      .from("level_reward_memories")
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
      console.error(
        "추억 저장 오류:",
        insertError
      );

      if (photoPath) {
        await supabase.storage
          .from(
            "level-reward-memories"
          )
          .remove([
            photoPath,
          ]);
      }

      setSavingMemory(false);
      setMessage(
        `추억을 저장하지 못했어요: ${insertError.message}`
      );
      return;
    }

    // =====================================
    // 타임라인에도 추억 자동 등록
    // =====================================

    if (insertedMemory) {
      const { error: timelineError } =
        await supabase
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

    setSavingMemory(false);
    setMemoryTarget(null);
    setMemoryMessage("");
    setMemoryFile(null);
    setMessage(
      "레벨 보상 추억을 남겼어요 ♡"
    );

    await loadRewards();
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
          보상 불러오는 중...
        </p>
      </main>
    );
  }

  // =========================================
  // 통계
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
          (a, b) =>
            a.required_days -
            b.required_days
        ),
      })
    );

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

        {/* =====================================
            헤더
        ====================================== */}

        <header className="flex items-end justify-between gap-4">

          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-pink-400">
              OUR REWARDS
            </p>

            <h1 className="mt-2 text-3xl font-bold">
              우리의 보상
            </h1>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              함께 지킨 시간만큼 보상도 하나씩 열려요 ♡
            </p>
          </div>

          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-xl shadow-sm">
            🎁
          </div>

        </header>

        {/* =====================================
            통계
        ====================================== */}

        <section className="mt-7">

          <div className="mb-3 flex items-end justify-between">
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] text-pink-400">
                REWARD STATUS
              </p>
              <h2 className="mt-1 text-lg font-bold">
                보상 현황
              </h2>
            </div>

            <span className="text-[11px] text-gray-400">
              우리 둘의 달성 기록
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">

            <div className="rounded-[26px] border border-pink-100 bg-gradient-to-br from-white to-pink-50/60 p-5 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-pink-100 text-lg">
                🎁
              </div>

              <p className="mt-4 text-xs text-gray-400">
                해금된 보상
              </p>

              <p className="mt-1 text-3xl font-bold tracking-tight">
                {unlockedCount}
                <span className="ml-1 text-sm font-semibold text-gray-400">
                  개
                </span>
              </p>
            </div>

            <div className="rounded-[26px] border border-pink-100 bg-white p-5 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-green-50 text-lg">
                ✅
              </div>

              <p className="mt-4 text-xs text-gray-400">
                사용한 보상
              </p>

              <p className="mt-1 text-3xl font-bold tracking-tight">
                {usedCount}
                <span className="ml-1 text-sm font-semibold text-gray-400">
                  개
                </span>
              </p>
            </div>

          </div>

        </section>

        {/* =====================================
            메시지
        ====================================== */}

        {message && (

          <div className="mt-4 rounded-2xl border border-pink-100 bg-white/80 px-4 py-3 text-center text-xs text-gray-500 shadow-sm">
            {message}
          </div>

        )}

        {/* =====================================
            보상 없음
        ====================================== */}

        {rewards.length ===
        0 ? (

          <section className="mt-6 rounded-3xl border border-dashed border-pink-200 bg-white p-8 text-center">

            <div className="text-4xl">
              🎀
            </div>

            <h2 className="mt-4 text-lg font-bold">
              아직 보상이 없어요
            </h2>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              새 약속을 만들면서
              <br />
              달성 보상도 함께 정해보세요.
            </p>

            <Link
              href="/promise/new"
              prefetch={false}
              className="mt-6 block w-full rounded-2xl bg-pink-500 px-5 py-4 text-center font-semibold text-white"
            >
              새 약속 만들기
            </Link>

          </section>

        ) : (

          /* =====================================
              약속별 묶음 보상
          ====================================== */

          <section className="mt-6">

            <button
              type="button"
              onClick={() => {
                setShowPromiseRewards(
                  (prev) => !prev
                );

                if (showPromiseRewards) {
                  setExpandedPromiseIds([]);
                }
              }}
              className="flex w-full items-center justify-between rounded-[24px] border border-pink-100 bg-white px-4 py-3.5 text-left shadow-sm transition hover:bg-pink-50/50"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-pink-50">
                  🎁
                </div>

                <div>
                  <p className="text-sm font-semibold">
                    약속 달성 보상
                  </p>
                  <p className="mt-0.5 text-[11px] text-gray-400">
                    {groupedRewards.length}개의 약속
                  </p>
                </div>
              </div>

              <span className="text-[11px] font-semibold text-pink-400">
                {showPromiseRewards
                  ? "전체 접기 ⌃"
                  : "전체 보기 ⌄"}
              </span>
            </button>

            {showPromiseRewards && (
              <div className="mt-4 space-y-4">

            {groupedRewards.map(
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

                const usedInGroup =
                  group.rewards.filter(
                    (reward) =>
                      reward.is_used
                  ).length;

                const nextTargetDays =
                  nextReward
                    ?.required_days ??
                  group.rewards[
                    group.rewards.length -
                      1
                  ]?.required_days ??
                  0;

                const nextProgress =
                  nextTargetDays > 0
                    ? Math.min(
                        group.current_streak,
                        nextTargetDays
                      )
                    : 0;

                const nextPercent =
                  nextTargetDays > 0
                    ? Math.min(
                        (
                          nextProgress /
                          nextTargetDays
                        ) *
                          100,
                        100
                      )
                    : 100;

                const nextRemaining =
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
                    className="overflow-hidden rounded-[30px] border border-pink-100 bg-white shadow-sm"
                  >
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-pink-50 px-2.5 py-1 text-[10px] font-semibold tracking-[0.12em] text-pink-500">
                              PROMISE REWARD
                            </span>

                            <span className="text-[11px] text-gray-400">
                              현재 {group.current_streak}일 연속
                            </span>
                          </div>

                          {group.is_joint && (
                            <div className="mt-3">
                              <span className="inline-flex rounded-full border border-pink-100 bg-pink-50 px-3 py-1.5 text-[11px] font-semibold text-pink-500">
                                💕 서로의 약속
                              </span>
                            </div>
                          )}

                          <h2 className={`${group.is_joint ? "mt-2" : "mt-3"} break-words text-xl font-bold leading-7`}>
                            {
                              group.promise_title
                            }
                          </h2>

                          {group.is_joint && (
                            <p className="mt-1 text-xs font-medium text-pink-400">
                              💕 함께 달성하는 보상
                            </p>
                          )}
                        </div>

                        <div className="shrink-0 rounded-2xl bg-[#fff8fb] px-3 py-2 text-center">
                          <p className="text-[10px] text-gray-400">
                            해금
                          </p>

                          <p className="mt-0.5 text-sm font-bold text-pink-500">
                            {completedCount}/{group.rewards.length}
                          </p>
                        </div>
                      </div>

                      <div
                        className={`mt-5 grid gap-2 ${
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
                          (reward) => (
                            <div
                              key={
                                reward.id
                              }
                              className={`rounded-[18px] border px-2 py-3 text-center transition ${
                                reward.is_used
                                  ? "border-green-100 bg-green-50"
                                  : reward.is_unlocked
                                    ? "border-pink-200 bg-pink-50"
                                    : "border-gray-100 bg-gray-50"
                              }`}
                            >
                              <p className="text-xs font-semibold text-gray-500">
                                {
                                  reward.required_days
                                }
                                일
                              </p>

                              <p className="mt-1 text-xl">
                                {reward.is_used
                                  ? "✅"
                                  : reward.is_unlocked
                                    ? "🎁"
                                    : "🔒"}
                              </p>

                              <p
                                className={`mt-1 text-[11px] font-semibold ${
                                  reward.is_used
                                    ? "text-green-600"
                                    : reward.is_unlocked
                                      ? "text-pink-500"
                                      : "text-gray-400"
                                }`}
                              >
                                {reward.is_used
                                  ? "사용 완료"
                                  : reward.is_unlocked
                                    ? "해금"
                                    : "잠김"}
                              </p>
                            </div>
                          )
                        )}
                      </div>

                      <div className="mt-5 rounded-[22px] border border-pink-100 bg-[#fff8fb] p-4">
                        {nextReward ? (
                          <>
                            <div className="flex items-center justify-between gap-3 text-xs">
                              <span className="text-gray-400">
                                다음 보상
                              </span>

                              <span className="font-semibold text-pink-500">
                                {
                                  nextReward.required_days
                                }
                                일
                              </span>
                            </div>

                            <div className="mt-3 h-3 overflow-hidden rounded-full bg-pink-100/70">
                              <div
                                className="h-full rounded-full bg-pink-400 transition-all"
                                style={{
                                  width:
                                    `${nextPercent}%`,
                                }}
                              />
                            </div>

                            <div className="mt-2 flex items-center justify-between text-xs">
                              <span className="text-gray-400">
                                {
                                  nextProgress
                                }
                                {" / "}
                                {
                                  nextTargetDays
                                }
                                일
                              </span>

                              <span className="font-semibold text-gray-500">
                                {nextRemaining >
                                0
                                  ? `앞으로 ${nextRemaining}일`
                                  : "달성 가능"}
                              </span>
                            </div>
                          </>
                        ) : (
                          <div className="text-center">
                            <p className="font-semibold text-pink-500">
                              🎉 모든 보상을 해금했어요!
                            </p>

                            <p className="mt-1 text-sm text-gray-500">
                              사용한 보상{" "}
                              {
                                usedInGroup
                              }
                              개 · 해금된 보상{" "}
                              {
                                completedCount
                              }
                              개
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
                        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-pink-100 bg-white px-4 py-3 text-sm font-semibold text-gray-500 shadow-sm transition hover:bg-pink-50"
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
                      <div className="border-t border-pink-100 bg-[#fffdfd] px-5 pb-5 pt-4">
                        <div className="space-y-3">
                          {group.rewards.map(
                            (reward) => {
                              const remaining =
                                Math.max(
                                  reward.required_days -
                                    group.current_streak,
                                  0
                                );

                              return (
                                <div
                                  key={
                                    reward.id
                                  }
                                  className={`rounded-[22px] border p-4 ${
                                    reward.is_used
                                      ? "border-green-100 bg-green-50/70"
                                      : reward.is_unlocked
                                        ? "border-pink-200 bg-white"
                                        : "border-gray-100 bg-gray-50"
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="min-w-0">
                                      <p className="text-xs font-semibold text-pink-400">
                                        {
                                          reward.required_days
                                        }
                                        일 보상
                                      </p>

                                      <p className="mt-1 break-words font-bold">
                                        {reward.is_secret &&
                                        !reward.is_unlocked
                                          ? "달성 후 공개돼요 ♡"
                                          : reward.title}
                                      </p>

                                      {reward.description &&
                                        (!reward.is_secret ||
                                          reward.is_unlocked) && (
                                          <p className="mt-1 text-sm leading-6 text-gray-500">
                                            {
                                              reward.description
                                            }
                                          </p>
                                        )}
                                    </div>

                                    <div className="text-2xl">
                                      {reward.is_used
                                        ? "✅"
                                        : reward.is_unlocked
                                          ? "🎁"
                                          : "🔒"}
                                    </div>
                                  </div>

                                  {!reward.is_unlocked && (
                                    <p className="mt-3 text-sm text-gray-400">
                                      앞으로{" "}
                                      {
                                        remaining
                                      }
                                      일 남았어요.
                                    </p>
                                  )}

                                  {reward.is_unlocked &&
                                    !reward.is_used && (
                                      <button
                                        type="button"
                                        disabled={
                                          processingId ===
                                          reward.id
                                        }
                                        onClick={() =>
                                          useReward(
                                            reward
                                          )
                                        }
                                        className="mt-3 w-full rounded-2xl bg-pink-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-pink-600 disabled:opacity-50"
                                      >
                                        {processingId ===
                                        reward.id
                                          ? "처리 중..."
                                          : "🎁 보상 사용하기"}
                                      </button>
                                    )}

                                  {reward.is_used && (
                                    <div className="mt-3 rounded-xl bg-green-100/70 px-3 py-2 text-center text-sm font-semibold text-green-600">
                                      ✓ 사용 완료
                                    </div>
                                  )}
                                </div>
                              );
                            }
                          )}
                        </div>
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

        {/* =====================================
            레벨 보상
        ====================================== */}

        <section className="mt-9">
          <button
            type="button"
            onClick={() =>
              setShowLevelRewards(
                (prev) => !prev
              )
            }
            className="flex w-full items-center justify-between rounded-[24px] border border-pink-100 bg-white px-4 py-3.5 text-left shadow-sm transition hover:bg-pink-50/50"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-pink-50">
                💕
              </div>

              <div>
                <p className="text-sm font-semibold">
                  우리 레벨 보상
                </p>
                <p className="mt-0.5 text-[11px] text-gray-400">
                  {
                    levelRewards.filter(
                      (reward) =>
                        reward.unlocked
                    ).length
                  }
                  {" / "}
                  {levelRewards.length} 해금
                </p>
              </div>
            </div>

            <span className="text-[11px] font-semibold text-pink-400">
              {showLevelRewards
                ? "접기 ⌃"
                : "보기 ⌄"}
            </span>
          </button>

          {showLevelRewards && (
            <div>

          {levelRewards.length === 0 ? (
            <div className="mt-5 rounded-3xl border border-dashed border-pink-200 bg-white p-7 text-center">
              <div className="text-4xl">
                💝
              </div>

              <p className="mt-4 font-bold">
                아직 레벨 보상이 없어요
              </p>

              <p className="mt-2 text-sm leading-6 text-gray-400">
                레벨 보상 슬롯이 만들어지면
                <br />
                여기에 표시돼요.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {levelRewards.map(
                (reward) => {
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
                      className={`rounded-[28px] border bg-white p-5 shadow-sm ${
                        reward.is_used
                          ? "border-green-100 bg-gradient-to-br from-white to-green-50/50"
                          : reward.unlocked
                            ? "border-pink-200 bg-gradient-to-br from-white to-pink-50/50"
                            : "border-pink-100"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-pink-400">
                            LV.
                            {
                              reward.unlock_level
                            }
                          </p>

                          {!isEditing && (
                            <h3 className="mt-1 break-words text-lg font-bold">
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
                        <div className="mt-4 space-y-3 rounded-2xl bg-[#fff8fb] p-4">
                          <div>
                            <label className="text-xs font-semibold text-gray-400">
                              보상 이름
                            </label>

                            <input
                              type="text"
                              value={
                                levelRewardTitleDraft
                              }
                              onChange={(e) =>
                                setLevelRewardTitleDraft(
                                  e.target.value
                                )
                              }
                              maxLength={80}
                              className="mt-2 w-full rounded-2xl border border-pink-100 bg-white px-4 py-3 text-sm outline-none transition focus:border-pink-300"
                              placeholder="예: 특별한 데이트권"
                            />
                          </div>

                          <div>
                            <label className="text-xs font-semibold text-gray-400">
                              설명
                            </label>

                            <textarea
                              value={
                                levelRewardDescriptionDraft
                              }
                              onChange={(e) =>
                                setLevelRewardDescriptionDraft(
                                  e.target.value
                                )
                              }
                              rows={3}
                              maxLength={250}
                              className="mt-2 w-full resize-none rounded-2xl border border-pink-100 bg-white px-4 py-3 text-sm leading-6 outline-none transition focus:border-pink-300"
                              placeholder="둘이 사용할 보상 내용을 적어주세요."
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <button
                              type="button"
                              disabled={
                                isSaving
                              }
                              onClick={
                                cancelEditLevelReward
                              }
                              className="rounded-2xl border border-pink-100 bg-white px-4 py-3 text-sm font-semibold text-gray-500 disabled:opacity-50"
                            >
                              취소
                            </button>

                            <button
                              type="button"
                              disabled={
                                isSaving
                              }
                              onClick={() => {
                                void saveLevelReward(
                                  reward
                                );
                              }}
                              className="rounded-2xl bg-pink-500 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
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
                            <div className="mt-4 rounded-2xl bg-[#fff8fb] p-4">
                              <p className="text-sm leading-6 text-gray-500">
                                {
                                  reward.description
                                }
                              </p>
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() =>
                              startEditLevelReward(
                                reward
                              )
                            }
                            className="mt-3 w-full rounded-2xl border border-pink-100 bg-white px-4 py-3 text-sm font-semibold text-gray-500 transition hover:bg-pink-50"
                          >
                            ✏️ 보상 내용 수정
                          </button>
                        </>
                      )}

                      {!isEditing &&
                        !reward.unlocked && (
                          <div className="mt-4 rounded-2xl bg-gray-50 px-4 py-4 text-center">
                            <p className="font-semibold text-gray-500">
                              🔒 LV.
                              {
                                reward.unlock_level
                              }
                              에 해금
                            </p>

                            <p className="mt-1 text-sm text-gray-400">
                              함께 XP를 모아
                              다음 기념 보상을 열어봐요 ♡
                            </p>
                          </div>
                        )}

                      {!isEditing &&
                        reward.unlocked &&
                        !reward.is_used && (
                          <>
                            <div className="mt-4 rounded-2xl bg-pink-50 px-4 py-4 text-center">
                              <p className="font-semibold text-pink-500">
                                🎉 레벨 보상 해금 완료!
                              </p>

                              <p className="mt-1 text-sm text-gray-500">
                                우리 레벨 LV.
                                {
                                  reward.unlock_level
                                }
                                을 달성했어요 ♡
                              </p>
                            </div>

                            <button
                              type="button"
                              disabled={
                                isUsing
                              }
                              onClick={() => {
                                void useLevelReward(
                                  reward
                                );
                              }}
                              className="mt-3 w-full rounded-2xl bg-pink-500 px-4 py-4 font-semibold text-white shadow-sm transition hover:bg-pink-600 active:scale-[0.99] disabled:opacity-50"
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
                            <div className="mt-4 rounded-2xl bg-green-50 px-4 py-4 text-center">
                              <p className="font-semibold text-green-600">
                                ✓ 사용한 레벨 보상
                              </p>

                              <p className="mt-1 text-sm text-green-500">
                                우리 둘의 특별한 추억으로 남았어요 ♡
                              </p>

                              {reward.used_at && (
                                <p className="mt-2 text-xs font-semibold text-green-500/80">
                                  {formatUsedDate(
                                    reward.used_at
                                  )}{" "}
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
                              className="mt-3 w-full rounded-2xl border border-pink-200 bg-white px-4 py-4 font-semibold text-pink-500 shadow-sm transition hover:bg-pink-50"
                            >
                              📷 추억 남기기
                            </button>

                            {levelRewardMemories
                              .filter(
                                (memory) =>
                                  memory.level_reward_id ===
                                  reward.id
                              )
                              .map(
                                (memory) => (
                                  <div
                                    key={
                                      memory.id
                                    }
                                    className="mt-3 overflow-hidden rounded-[22px] border border-pink-100 bg-[#fff8fb] shadow-sm"
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

        {/* =====================================
            하단 메뉴
        ====================================== */}

        {memoryTarget && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 px-5">
            <div className="w-full max-w-sm rounded-[34px] border border-pink-100 bg-white p-6 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold tracking-[0.2em] text-pink-400">
                    OUR MEMORY
                  </p>

                  <h2 className="mt-2 text-2xl font-bold">
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
                    if (!savingMemory) {
                      setMemoryTarget(null);
                    }
                  }}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl bg-pink-50 text-gray-400 transition hover:bg-pink-100"
                >
                  ×
                </button>
              </div>

              <div className="mt-6">
                <label className="text-sm font-semibold text-gray-700">
                  사진
                </label>

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) =>
                    setMemoryFile(
                      e.target.files?.[0] ??
                        null
                    )
                  }
                  className="mt-2 block w-full rounded-2xl border border-pink-100 bg-[#fff8fb] px-4 py-3 text-sm text-gray-500"
                />

                <p className="mt-2 text-xs text-gray-400">
                  JPG · PNG · WEBP / 최대 5MB
                </p>
              </div>

              <div className="mt-5">
                <label className="text-sm font-semibold text-gray-700">
                  한마디
                </label>

                <textarea
                  value={
                    memoryMessage
                  }
                  onChange={(e) =>
                    setMemoryMessage(
                      e.target.value
                    )
                  }
                  rows={4}
                  maxLength={300}
                  placeholder="이 보상을 사용한 날의 이야기를 남겨보세요 ♡"
                  className="mt-2 w-full resize-none rounded-2xl border border-pink-100 bg-[#fff8fb] px-4 py-3 text-sm leading-6 outline-none transition focus:border-pink-300"
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
                onClick={() => {
                  void saveLevelRewardMemory();
                }}
                className="mt-5 w-full rounded-2xl bg-pink-500 px-5 py-4 font-semibold text-white disabled:opacity-50"
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