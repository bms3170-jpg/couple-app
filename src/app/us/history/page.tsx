"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";

import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import BottomNav from "@/components/BottomNav";

type Member = {
  user_id: string;
  nickname: string;
};

type PromiseItem = {
  id: string;
  title: string;
  assigned_to: string;
  is_joint: boolean;
  current_streak: number;
  best_streak: number;
  total_success: number;
  is_active: boolean;
  created_at: string;
  deleted_at: string | null;
};

type VerificationItem = {
  id: string;
  promise_id: string;
  user_id: string;
  verification_date: string;
  photo_path: string | null;
  photo_url: string | null;
  message: string | null;
  status:
    | "pending"
    | "approved"
    | "rejected";
  created_at: string;
};

type RewardItem = {
  id: string;
  promise_id: string;
  required_days: number;
  title: string;
  is_unlocked: boolean;
  unlocked_at: string | null;
  is_used: boolean;
  used_at: string | null;
};

type RecentVerification = VerificationItem & {
  promise_title: string;
  is_joint: boolean;
  nickname: string;
};

type LevelRewardMemory = {
  id: string;
  level_reward_id: string;
  message: string | null;
  photo_path: string | null;
  photo_url: string | null;
  created_at: string;
  reward_title: string;
  unlock_level: number;
};

export default function UsHistoryPage() {
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
    verifications,
    setVerifications,
  ] =
    useState<VerificationItem[]>(
      []
    );

  const [rewards, setRewards] =
    useState<RewardItem[]>([]);

  const [
    levelRewardMemories,
    setLevelRewardMemories,
  ] = useState<LevelRewardMemory[]>([]);

  const [coupleXp, setCoupleXp] =
    useState(0);

  const [
    selectedVerification,
    setSelectedVerification,
  ] = useState<RecentVerification | null>(
    null
  );

  const [
    selectedLevelRewardMemory,
    setSelectedLevelRewardMemory,
  ] = useState<LevelRewardMemory | null>(
    null
  );

  const [
    deletingLevelRewardMemory,
    setDeletingLevelRewardMemory,
  ] = useState(false);

  const [
    editingLevelRewardMemory,
    setEditingLevelRewardMemory,
  ] = useState(false);

  const [
    editMemoryMessage,
    setEditMemoryMessage,
  ] = useState("");

  const [
    editMemoryFile,
    setEditMemoryFile,
  ] = useState<File | null>(null);

  const [
    savingLevelRewardMemoryEdit,
    setSavingLevelRewardMemoryEdit,
  ] = useState(false);

  const [
    isPhotoExpanded,
    setIsPhotoExpanded,
  ] = useState(false);

  const [
    verificationFilter,
    setVerificationFilter,
  ] = useState<
    "all" | "mine" | "partner"
  >("all");

  const [
    showRecentVerificationList,
    setShowRecentVerificationList,
  ] = useState(false);

  const [
    showPromiseRecords,
    setShowPromiseRecords,
  ] = useState(false);

  // =========================================
  // 우리 기록 데이터 불러오기
  // =========================================

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      window.location.href =
        "/login";

      return;
    }

    const currentUser = user;

    let cancelled = false;

    async function loadHistory() {
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
          currentUser.id
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

      // =====================================
      // 커플 XP
      // =====================================

      const {
        data: coupleData,
        error: coupleError,
      } = await supabase
        .from("couples")
        .select("xp")
        .eq(
          "id",
          coupleId
        )
        .maybeSingle();

      if (cancelled) {
        return;
      }

      if (coupleError) {
        console.error(
          "커플 XP 조회 오류:",
          coupleError
        );
      }

      setCoupleXp(
        coupleData?.xp ??
          0
      );

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
        .order(
          "joined_at",
          {
            ascending: true,
          }
        );

      if (cancelled) {
        return;
      }

      if (memberError) {
        console.error(
          "멤버 조회 오류:",
          memberError
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

      // =====================================
      // 닉네임
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
                profile
                  ?.nickname ??
                "이름 없음",
            };
          }
        );

      setMembers(
        loadedMembers
      );

      // =====================================
      // 모든 약속
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
          current_streak,
          best_streak,
          total_success,
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
            ascending: false,
          }
        );

      if (cancelled) {
        return;
      }

      if (promiseError) {
        console.error(
          "약속 조회 오류:",
          promiseError
        );

        setMessage(
          "약속 기록을 불러오지 못했어요."
        );

        setLoading(false);
        return;
      }

      setPromises(
        (promiseRows ??
          []) as PromiseItem[]
      );

      // =====================================
      // 모든 인증 기록
      // =====================================

      const {
        data: verificationRows,
        error:
          verificationError,
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

      if (cancelled) {
        return;
      }

      if (verificationError) {
        console.error(
          "인증 기록 조회 오류:",
          verificationError
        );

        setMessage(
          "인증 기록을 불러오지 못했어요."
        );

        setLoading(false);
        return;
      }

      const verificationItems =
        (verificationRows ?? []) as Omit<
          VerificationItem,
          "photo_url"
        >[];

      const verificationItemsWithUrls =
        await Promise.all(
          verificationItems.map(
            async (item) => {
              let photoUrl: string | null =
                null;

              if (item.photo_path) {
                const {
                  data: signedData,
                  error: signedError,
                } = await supabase.storage
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
                } else if (signedError) {
                  console.error(
                    "사진 URL 생성 오류:",
                    signedError
                  );
                }
              }

              return {
                ...item,
                photo_url: photoUrl,
              };
            }
          )
        );

      if (cancelled) {
        return;
      }

      setVerifications(
        verificationItemsWithUrls
      );

      // =====================================
      // 모든 보상
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

      if (cancelled) {
        return;
      }

      if (rewardError) {
        console.error(
          "보상 기록 조회 오류:",
          rewardError
        );

        setMessage(
          "보상 기록을 불러오지 못했어요."
        );

        setLoading(false);
        return;
      }

      setRewards(
        (rewardRows ??
          []) as RewardItem[]
      );

      // =====================================
      // 레벨 보상 추억
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

      if (cancelled) {
        return;
      }

      if (memoryError) {
        console.error(
          "레벨 보상 추억 조회 오류:",
          memoryError
        );
      } else {
        const levelRewardIds = [
          ...new Set(
            (memoryRows ?? []).map(
              (item) =>
                item.level_reward_id
            )
          ),
        ];

        const {
          data: levelRewardRows,
          error: levelRewardError,
        } = levelRewardIds.length
          ? await supabase
              .from(
                "level_rewards"
              )
              .select(`
                id,
                unlock_level,
                title
              `)
              .in(
                "id",
                levelRewardIds
              )
          : {
              data: [],
              error: null,
            };

        if (levelRewardError) {
          console.error(
            "레벨 보상 정보 조회 오류:",
            levelRewardError
          );
        }

        const mappedMemories =
          (memoryRows ?? []).map(
            (memory) => {
              const levelReward =
                levelRewardRows?.find(
                  (item) =>
                    item.id ===
                    memory.level_reward_id
                );

              const photoUrl =
                memory.photo_path
                  ? supabase.storage
                      .from(
                        "level-reward-memories"
                      )
                      .getPublicUrl(
                        memory.photo_path
                      ).data.publicUrl
                  : null;

              return {
                ...memory,
                photo_url:
                  photoUrl,
                reward_title:
                  levelReward
                    ?.title ??
                  "레벨 보상",
                unlock_level:
                  levelReward
                    ?.unlock_level ??
                  0,
              };
            }
          ) as LevelRewardMemory[];

        setLevelRewardMemories(
          mappedMemories
        );
      }

      setLoading(false);
    }

    loadHistory();

    return () => {
      cancelled = true;
    };
  }, [
    authLoading,
    user,
    supabase,
  ]);

  // =========================================
  // 레벨 보상 추억 수정 시작
  // =========================================

  function startEditLevelRewardMemory() {
    if (!selectedLevelRewardMemory) {
      return;
    }

    setEditingLevelRewardMemory(
      true
    );

    setEditMemoryMessage(
      selectedLevelRewardMemory.message ??
        ""
    );

    setEditMemoryFile(
      null
    );
  }

  function cancelEditLevelRewardMemory() {
    setEditingLevelRewardMemory(
      false
    );

    setEditMemoryMessage(
      ""
    );

    setEditMemoryFile(
      null
    );
  }

  async function saveLevelRewardMemoryEdit() {
    if (
      !selectedLevelRewardMemory ||
      savingLevelRewardMemoryEdit
    ) {
      return;
    }

    if (
      !editMemoryMessage.trim() &&
      !editMemoryFile &&
      !selectedLevelRewardMemory.photo_path
    ) {
      window.alert(
        "사진이나 한마디 중 하나는 남겨주세요."
      );
      return;
    }

    if (
      editMemoryFile &&
      editMemoryFile.size >
        5 * 1024 * 1024
    ) {
      window.alert(
        "사진은 5MB 이하만 업로드할 수 있어요."
      );
      return;
    }

    if (
      editMemoryFile &&
      ![
        "image/jpeg",
        "image/png",
        "image/webp",
      ].includes(
        editMemoryFile.type
      )
    ) {
      window.alert(
        "JPG, PNG, WEBP 사진만 올릴 수 있어요."
      );
      return;
    }

    setSavingLevelRewardMemoryEdit(
      true
    );

    const target =
      selectedLevelRewardMemory;

    let nextPhotoPath =
      target.photo_path;

    let nextPhotoUrl =
      target.photo_url;

    // 새 사진이 있으면 먼저 업로드
    if (editMemoryFile) {
      const safeName =
        editMemoryFile.name.replace(
          /[^a-zA-Z0-9._-]/g,
          "_"
        );

      const newPhotoPath =
        `${user?.id ?? "user"}/${target.level_reward_id}/${Date.now()}-${safeName}`;

      const {
        error: uploadError,
      } = await supabase.storage
        .from(
          "level-reward-memories"
        )
        .upload(
          newPhotoPath,
          editMemoryFile,
          {
            cacheControl: "3600",
            upsert: false,
          }
        );

      if (uploadError) {
        console.error(
          "수정 사진 업로드 오류:",
          uploadError
        );

        setSavingLevelRewardMemoryEdit(
          false
        );

        window.alert(
          `사진을 업로드하지 못했어요: ${uploadError.message}`
        );

        return;
      }

      nextPhotoPath =
        newPhotoPath;

      nextPhotoUrl =
        supabase.storage
          .from(
            "level-reward-memories"
          )
          .getPublicUrl(
            newPhotoPath
          ).data.publicUrl;
    }

    const {
      error: updateError,
    } = await supabase
      .from(
        "level_reward_memories"
      )
      .update({
        message:
          editMemoryMessage.trim() ||
          null,
        photo_path:
          nextPhotoPath,
      })
      .eq(
        "id",
        target.id
      );

    if (updateError) {
      console.error(
        "레벨 보상 추억 수정 오류:",
        updateError
      );

      // 새 파일을 올렸는데 DB 수정이 실패하면 새 파일 정리
      if (
        editMemoryFile &&
        nextPhotoPath &&
        nextPhotoPath !==
          target.photo_path
      ) {
        await supabase.storage
          .from(
            "level-reward-memories"
          )
          .remove([
            nextPhotoPath,
          ]);
      }

      setSavingLevelRewardMemoryEdit(
        false
      );

      window.alert(
        `추억을 수정하지 못했어요: ${updateError.message}`
      );

      return;
    }

    // 새 사진으로 교체 성공한 뒤 기존 사진 삭제
    if (
      editMemoryFile &&
      target.photo_path &&
      target.photo_path !==
        nextPhotoPath
    ) {
      const {
        error: removeOldError,
      } = await supabase.storage
        .from(
          "level-reward-memories"
        )
        .remove([
          target.photo_path,
        ]);

      if (removeOldError) {
        console.error(
          "기존 추억 사진 삭제 오류:",
          removeOldError
        );
      }
    }

    const updatedMemory:
      LevelRewardMemory = {
      ...target,
      message:
        editMemoryMessage.trim() ||
        null,
      photo_path:
        nextPhotoPath,
      photo_url:
        nextPhotoUrl,
    };

    setLevelRewardMemories(
      (prev) =>
        prev.map(
          (memory) =>
            memory.id ===
            target.id
              ? updatedMemory
              : memory
        )
    );

    setSelectedLevelRewardMemory(
      updatedMemory
    );

    setEditingLevelRewardMemory(
      false
    );

    setEditMemoryMessage(
      ""
    );

    setEditMemoryFile(
      null
    );

    setSavingLevelRewardMemoryEdit(
      false
    );
  }

  // =========================================
  // 레벨 보상 추억 삭제
  // =========================================

  async function deleteLevelRewardMemory() {
    if (
      !selectedLevelRewardMemory ||
      deletingLevelRewardMemory
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        "이 추억을 삭제할까요?\n삭제하면 사진과 한마디를 다시 복구할 수 없어요."
      );

    if (!confirmed) {
      return;
    }

    setDeletingLevelRewardMemory(
      true
    );

    const target =
      selectedLevelRewardMemory;

    const {
      error: deleteError,
    } = await supabase
      .from(
        "level_reward_memories"
      )
      .delete()
      .eq(
        "id",
        target.id
      );

    if (deleteError) {
      console.error(
        "레벨 보상 추억 삭제 오류:",
        deleteError
      );

      setDeletingLevelRewardMemory(
        false
      );

      window.alert(
        `추억을 삭제하지 못했어요: ${deleteError.message}`
      );

      return;
    }

    // DB 삭제 성공 후 Storage 사진도 삭제
    if (target.photo_path) {
      const {
        error: storageError,
      } = await supabase.storage
        .from(
          "level-reward-memories"
        )
        .remove([
          target.photo_path,
        ]);

      if (storageError) {
        console.error(
          "추억 사진 삭제 오류:",
          storageError
        );
      }
    }

    setLevelRewardMemories(
      (prev) =>
        prev.filter(
          (memory) =>
            memory.id !==
            target.id
        )
    );

    setSelectedLevelRewardMemory(
      null
    );

    setDeletingLevelRewardMemory(
      false
    );
  }

  // =========================================
  // 특정 추억 바로 열기
  // /us/history?memory=<id>
  // Vercel prerender 안전 처리
  // =========================================

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      levelRewardMemories.length === 0
    ) {
      return;
    }

    const params =
      new URLSearchParams(
        window.location.search
      );

    const memoryId =
      params.get("memory");

    if (!memoryId) {
      return;
    }

    const targetMemory =
      levelRewardMemories.find(
        (memory) =>
          memory.id ===
          memoryId
      );

    if (targetMemory) {
      setSelectedLevelRewardMemory(
        targetMemory
      );
    }
  }, [levelRewardMemories]);

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
          우리 기록 불러오는 중...
        </p>
      </main>
    );
  }

  // =========================================
  // 통계
  // =========================================

  const totalPromiseCount =
    promises.length;

  const activePromiseCount =
    promises.filter(
      (promise) =>
        promise.is_active
    ).length;

  const endedPromiseCount =
    promises.filter(
      (promise) =>
        !promise.is_active
    ).length;

  const approvedCount =
    verifications.filter(
      (verification) =>
        verification.status ===
        "approved"
    ).length;

  const pendingCount =
    verifications.filter(
      (verification) =>
        verification.status ===
        "pending"
    ).length;

  const unlockedRewardCount =
    rewards.filter(
      (reward) =>
        reward.is_unlocked
    ).length;

  const usedRewardCount =
    rewards.filter(
      (reward) =>
        reward.is_used
    ).length;

  const bestPromise =
    promises.length
      ? [...promises].sort(
          (a, b) =>
            b.best_streak -
            a.best_streak
        )[0]
      : null;


  // =========================================
  // 최근 인증
  // =========================================

  const currentUserId =
    user?.id ?? "";

  const allRecentVerifications:
    RecentVerification[] =
    verifications.map(
      (verification) => {
        const promise =
          promises.find(
            (item) =>
              item.id ===
              verification.promise_id
          );

        const member =
          members.find(
            (item) =>
              item.user_id ===
              verification.user_id
          );

        return {
          ...verification,

          promise_title:
            promise?.title ??
            "약속",

          is_joint:
            promise?.is_joint ??
            false,

          nickname:
            member?.nickname ??
            "파트너",
        };
      }
    );

  const mineVerificationCount =
    allRecentVerifications.filter(
      (verification) =>
        verification.user_id ===
        currentUserId
    ).length;

  const partnerVerificationCount =
    allRecentVerifications.filter(
      (verification) =>
        verification.user_id !==
        currentUserId
    ).length;

  const recentVerifications =
    allRecentVerifications
      .filter((verification) => {
        if (
          verificationFilter ===
          "mine"
        ) {
          return (
            verification.user_id ===
            currentUserId
          );
        }

        if (
          verificationFilter ===
          "partner"
        ) {
          return (
            verification.user_id !==
            currentUserId
          );
        }

        return true;
      })
      .slice(0, 10);

  function getStatusInfo(
    status:
      | "pending"
      | "approved"
      | "rejected"
  ) {
    if (
      status ===
      "approved"
    ) {
      return {
        label:
          "성공",
        emoji:
          "✅",
        className:
          "bg-green-50 text-green-600",
      };
    }

    if (
      status ===
      "rejected"
    ) {
      return {
        label:
          "반려",
        emoji:
          "↩️",
        className:
          "bg-red-50 text-red-500",
      };
    }

    return {
      label:
        "확인 대기",
      emoji:
        "⏳",
      className:
        "bg-yellow-50 text-yellow-600",
    };
  }

  function formatDate(
    dateString: string
  ) {
    const date =
      new Date(
        dateString
      );

    return date.toLocaleDateString(
      "ko-KR",
      {
        year:
          "numeric",
        month:
          "long",
        day:
          "numeric",
      }
    );
  }

  return (
    <main className="min-h-screen bg-[#fff8fb] px-5 py-8 text-[#2b2b2b]">
      <div className="mx-auto max-w-md pb-28">

        {/* =====================================
            상단
        ====================================== */}

        <header>
          <Link
            href="/us"
            prefetch={false}
            className="inline-block text-sm font-semibold text-gray-500"
          >
            ← 우리로 돌아가기
          </Link>

          <div className="mt-8 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold tracking-[0.2em] text-pink-400">
                OUR HISTORY
              </p>

              <h1 className="mt-2 text-3xl font-bold">
                우리 기록
              </h1>

              <p className="mt-2 text-sm leading-6 text-gray-500">
                함께 만든 약속과 둘이 쌓아온 순간들을 모아봤어요 ♡
              </p>
            </div>

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-xl shadow-sm">
              📖
            </div>
          </div>
        </header>

        {/* =====================================
            전체 기록 요약
        ====================================== */}

        <section className="mt-7 rounded-[30px] border border-pink-100 bg-gradient-to-br from-white to-pink-50/60 p-5 shadow-sm">
          <div className="flex items-center gap-4">

            <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-white text-2xl shadow-sm">
              💕
            </div>

            <div>
              <p className="text-sm text-gray-400">
                우리가 함께 쌓은 기록
              </p>

              <p className="mt-1 text-2xl font-bold">
                {approvedCount}번의 성공
              </p>
            </div>

          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">

            <div className="rounded-[18px] border border-pink-50 bg-[#fff8fb] p-4">
              <p className="text-xs text-gray-400">
                총 성공 기록
              </p>

              <p className="mt-2 text-xl font-bold">
                {approvedCount}회
              </p>
            </div>

            <div className="rounded-[18px] border border-pink-50 bg-[#fff8fb] p-4">
              <p className="text-xs text-gray-400">
                우리 XP
              </p>

              <p className="mt-2 text-xl font-bold text-pink-500">
                {coupleXp} XP
              </p>
            </div>

          </div>
        </section>

        {/* =====================================
            통계
        ====================================== */}

        <section className="mt-5">

          <h2 className="text-lg font-bold">
            한눈에 보기
          </h2>

          <div className="mt-3 grid grid-cols-2 gap-3">

            {/* 총 약속 */}

            <div className="rounded-[26px] border border-pink-100 bg-white p-5 shadow-sm">
              <div className="text-2xl">
                ✅
              </div>

              <p className="mt-3 text-sm text-gray-400">
                함께 만든 약속
              </p>

              <p className="mt-1 text-2xl font-bold">
                {totalPromiseCount}개
              </p>

              <p className="mt-2 text-xs text-gray-400">
                진행 중{" "}
                {activePromiseCount} ·
                종료{" "}
                {endedPromiseCount}
              </p>
            </div>

            {/* 인증 성공 */}

            <div className="rounded-[26px] border border-pink-100 bg-white p-5 shadow-sm">
              <div className="text-2xl">
                📸
              </div>

              <p className="mt-3 text-sm text-gray-400">
                성공한 인증
              </p>

              <p className="mt-1 text-2xl font-bold">
                {approvedCount}개
              </p>

              {pendingCount >
                0 && (
                <p className="mt-2 text-xs text-yellow-500">
                  확인 대기{" "}
                  {pendingCount}개
                </p>
              )}
            </div>

            {/* 열린 보상 */}

            <div className="rounded-[26px] border border-pink-100 bg-white p-5 shadow-sm">
              <div className="text-2xl">
                🎁
              </div>

              <p className="mt-3 text-sm text-gray-400">
                해금한 보상
              </p>

              <p className="mt-1 text-2xl font-bold">
                {unlockedRewardCount}개
              </p>
            </div>

            {/* 사용 보상 */}

            <div className="rounded-[26px] border border-pink-100 bg-white p-5 shadow-sm">
              <div className="text-2xl">
                💝
              </div>

              <p className="mt-3 text-sm text-gray-400">
                사용한 보상
              </p>

              <p className="mt-1 text-2xl font-bold">
                {usedRewardCount}개
              </p>
            </div>

          </div>

        </section>

        {/* =====================================
            최고 기록
        ====================================== */}

        <section className="mt-5">

          <h2 className="text-lg font-bold">
            우리의 최고 기록 🔥
          </h2>

          {bestPromise ? (
            <div className="mt-3 rounded-[30px] border border-pink-100 bg-white p-5 shadow-sm">

              <div className="flex items-start justify-between gap-4">

                <div>

                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-semibold text-pink-400">
                      BEST QUEST
                    </p>

                    {bestPromise.is_joint && (
                      <span className="rounded-full border border-pink-100 bg-pink-50 px-2.5 py-1 text-[10px] font-semibold text-pink-500">
                        💕 서로의 약속
                      </span>
                    )}
                  </div>

                  <h3 className="mt-2 text-xl font-bold">
                    {bestPromise.title}
                  </h3>

                  {bestPromise.is_joint && (
                    <p className="mt-1 text-xs font-medium text-pink-400">
                      둘이 함께 달성한 기록
                    </p>
                  )}

                </div>

                <div className="rounded-2xl bg-pink-50 px-4 py-2 font-bold text-pink-500">
                  🔥{" "}
                  {
                    bestPromise.best_streak
                  }
                  일
                </div>

              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">

                <div className="rounded-[18px] border border-pink-50 bg-[#fff8fb] p-4 text-center">
                  <p className="text-xs text-gray-400">
                    최고 연속
                  </p>

                  <p className="mt-1 text-lg font-bold">
                    {
                      bestPromise.best_streak
                    }
                    일
                  </p>
                </div>

                <div className="rounded-[18px] border border-pink-50 bg-[#fff8fb] p-4 text-center">
                  <p className="text-xs text-gray-400">
                    누적 성공
                  </p>

                  <p className="mt-1 text-lg font-bold">
                    {
                      bestPromise.total_success
                    }
                    일
                  </p>
                </div>

              </div>

            </div>
          ) : (
            <div className="mt-3 rounded-[26px] border border-dashed border-pink-200 bg-white p-6 text-center text-sm text-gray-400 shadow-sm">
              아직 약속 기록이 없어요.
            </div>
          )}

        </section>

        {/* =====================================
            약속 기록
        ====================================== */}

        <section className="mt-5">

          <div className="flex items-center justify-between">

            <div>
              <h2 className="text-lg font-bold">
                약속 기록
              </h2>

              <p className="mt-1 text-xs text-gray-400">
                약속별 핵심 기록만 간단히 확인해요.
              </p>
            </div>

            <Link
              href="/promises"
              prefetch={false}
              className="text-sm font-semibold text-pink-500"
            >
              전체 보기
            </Link>

          </div>

          <button
            type="button"
            onClick={() =>
              setShowPromiseRecords(
                (prev) => !prev
              )
            }
            className="mt-3 flex w-full items-center justify-between rounded-[22px] border border-pink-100 bg-white px-4 py-3 text-left shadow-sm transition hover:bg-pink-50/50"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-pink-50">
                ✅
              </div>

              <div>
                <p className="text-sm font-semibold">
                  약속 목록
                </p>

                <p className="mt-0.5 text-[11px] text-gray-400">
                  {promises.length}개의 기록
                </p>
              </div>
            </div>

            <span
              className={`text-gray-300 transition ${
                showPromiseRecords
                  ? "rotate-180"
                  : ""
              }`}
            >
              ⌄
            </span>
          </button>

          {showPromiseRecords && (
            <div className="mt-3 overflow-hidden rounded-[26px] border border-pink-100 bg-white shadow-sm">

              {promises.length ===
              0 ? (
                <div className="p-6 text-center text-sm text-gray-400">
                  아직 만든 약속이 없어요.
                </div>
              ) : (
                promises
                  .slice(
                    0,
                    5
                  )
                  .map(
                    (
                      promise,
                      index
                    ) => {

                      const member =
                        members.find(
                          (
                            item
                          ) =>
                            item.user_id ===
                            promise.assigned_to
                        );

                      return (
                        <div
                          key={
                            promise.id
                          }
                          className={`px-4 py-4 ${
                            index !== 0
                              ? "border-t border-pink-50"
                              : ""
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">

                            <div className="min-w-0 flex-1">

                              <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                                <p className="min-w-0 truncate font-bold">
                                  {promise.title}
                                </p>

                                {promise.is_joint && (
                                  <span className="shrink-0 rounded-full bg-pink-50 px-2 py-0.5 text-[9px] font-semibold text-pink-500">
                                    💕 함께
                                  </span>
                                )}
                              </div>

                              <p className="mt-1 truncate text-[11px] text-gray-400">
                                {promise.is_joint
                                  ? "💕 서로의 약속"
                                  : `${member?.nickname ?? "파트너"}님의 약속`}
                                {" · "}
                                {promise.is_active
                                  ? `현재 ${promise.current_streak}일`
                                  : `최고 ${promise.best_streak}일`}
                                {" · "}
                                성공 {promise.total_success}일
                              </p>

                            </div>

                            <span
                              className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                                promise.is_active
                                  ? "bg-pink-50 text-pink-500"
                                  : "bg-gray-100 text-gray-400"
                              }`}
                            >
                              {promise.is_active
                                ? "진행 중"
                                : "종료"}
                            </span>

                          </div>
                        </div>
                      );
                    }
                  )
              )}

              {promises.length >
                5 && (
                <Link
                  href="/promises"
                  prefetch={false}
                  className="block border-t border-pink-50 px-4 py-3 text-center text-xs font-semibold text-pink-500 transition hover:bg-pink-50/50"
                >
                  나머지 {promises.length - 5}개 약속 더 보기 →
                </Link>
              )}

            </div>
          )}

        </section>

        {/* =====================================
            레벨 보상 추억
        ====================================== */}

        <section className="mt-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] text-pink-400">
                OUR MEMORY
              </p>

              <h2 className="mt-1 text-lg font-bold">
                레벨 보상 추억 💕
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded-2xl bg-pink-50 px-3 py-2 text-xs font-semibold text-pink-500">
                {levelRewardMemories.length}개
              </span>

              <Link
                href="/us/memories"
                prefetch={false}
                className="text-xs font-semibold text-pink-500 whitespace-nowrap"
              >
                전체 보기 →
              </Link>
            </div>
          </div>

          {levelRewardMemories.length === 0 ? (
            <div className="mt-3 rounded-3xl border border-dashed border-pink-200 bg-white p-7 text-center shadow-sm">
              <div className="text-3xl">
                💝
              </div>

              <p className="mt-3 text-sm font-semibold text-gray-500">
                아직 레벨 보상 추억이 없어요.
              </p>

              <p className="mt-1 text-xs leading-5 text-gray-400">
                사용한 레벨 보상에 사진이나 한마디를 남기면
                <br />
                이곳에 차곡차곡 모여요 ♡
              </p>
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-3">
              {levelRewardMemories.map(
                (memory) => (
                  <button
                    type="button"
                    key={
                      memory.id
                    }
                    onClick={() =>
                      setSelectedLevelRewardMemory(
                        memory
                      )
                    }
                    className="overflow-hidden rounded-[26px] border border-pink-100 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    {memory.photo_url ? (
                      <img
                        src={
                          memory.photo_url
                        }
                        alt={`${memory.reward_title} 추억`}
                        className="h-36 w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-28 items-center justify-center bg-[#fff8fb] text-4xl">
                        💕
                      </div>
                    )}

                    <div className="p-4">
                      <p className="text-[11px] font-semibold text-pink-400">
                        LV.
                        {
                          memory.unlock_level
                        }
                        {" · "}
                        {
                          memory.reward_title
                        }
                      </p>

                      {memory.message && (
                        <p className="mt-2 line-clamp-3 text-sm leading-6 text-gray-600">
                          {
                            memory.message
                          }
                        </p>
                      )}

                      <p className="mt-3 text-[11px] text-gray-400">
                        {new Date(
                          memory.created_at
                        ).toLocaleDateString(
                          "ko-KR"
                        )}
                      </p>
                    </div>
                  </button>
                )
              )}
            </div>
          )}
        </section>

        {/* =====================================
            최근 인증 기록
        ====================================== */}

        <section className="mt-5">

          <div className="flex items-center justify-between">

            <div>
              <h2 className="text-lg font-bold">
                최근 인증
              </h2>

              <p className="mt-1 text-xs text-gray-400">
                최신 인증 기록을 모아봤어요.
              </p>
            </div>

            <Link
              href="/verifications"
              prefetch={false}
              className="text-xs font-semibold text-pink-500"
            >
              인증 보기
            </Link>

          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 rounded-[22px] border border-pink-100 bg-white p-1.5 shadow-sm">
            {[
              {
                key: "all" as const,
                label: "전체",
                count:
                  allRecentVerifications.length,
              },
              {
                key: "mine" as const,
                label: "내 인증",
                count:
                  mineVerificationCount,
              },
              {
                key: "partner" as const,
                label: "상대방",
                count:
                  partnerVerificationCount,
              },
            ].map((filter) => {
              const active =
                verificationFilter ===
                filter.key;

              return (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() =>
                    setVerificationFilter(
                      filter.key
                    )
                  }
                  className={`rounded-xl px-2 py-3 text-xs font-semibold transition ${
                    active
                      ? "bg-pink-500 text-white shadow-sm"
                      : "bg-white text-gray-400 hover:bg-pink-50 hover:text-pink-500"
                  }`}
                >
                  <span className="block">
                    {filter.label}
                  </span>

                  <span
                    className={`mt-1 block text-[10px] ${
                      active
                        ? "text-white/80"
                        : "text-gray-300"
                    }`}
                  >
                    {filter.count}개
                  </span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() =>
              setShowRecentVerificationList(
                (prev) => !prev
              )
            }
            className="mt-3 flex w-full items-center justify-between rounded-[22px] border border-pink-100 bg-white px-4 py-3 text-left shadow-sm transition hover:bg-pink-50/50"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-pink-50">
                📸
              </div>

              <div>
                <p className="text-sm font-semibold">
                  인증 목록
                </p>

                <p className="mt-0.5 text-[11px] text-gray-400">
                  {recentVerifications.length}개의 기록
                </p>
              </div>
            </div>

            <span
              className={`text-gray-300 transition ${
                showRecentVerificationList
                  ? "rotate-180"
                  : ""
              }`}
            >
              ⌄
            </span>
          </button>

          {showRecentVerificationList && (
            <>
          {recentVerifications.length ===
          0 ? (
            <div className="mt-3 rounded-[28px] border border-dashed border-pink-200 bg-white p-7 text-center shadow-sm">
              <div className="text-3xl">
                📭
              </div>

              <p className="mt-3 font-semibold text-gray-500">
                {verificationFilter ===
                "mine"
                  ? "내 인증 기록이 아직 없어요."
                  : verificationFilter ===
                    "partner"
                  ? "상대방 인증 기록이 아직 없어요."
                  : "아직 인증 기록이 없어요."}
              </p>

              <p className="mt-2 text-xs leading-5 text-gray-400">
                인증을 남기면 둘만의 기록이
                <br />
                여기에 차곡차곡 쌓여요 ♡
              </p>
            </div>
          ) : (
            <div className="mt-3 space-y-3">

              {recentVerifications.map(
                (
                  verification
                ) => {

                  const statusInfo =
                    getStatusInfo(
                      verification.status
                    );

                  return (
                    <button
                      type="button"
                      key={
                        verification.id
                      }
                      onClick={() =>
                        setSelectedVerification(
                          verification
                        )
                      }
                      className="w-full rounded-[26px] border border-pink-100 bg-white p-5 text-left shadow-sm transition hover:bg-pink-50/50"
                    >

                      <div className="flex items-start justify-between gap-4">

                        <div className="min-w-0">

                          <p className="text-xs font-semibold text-pink-400">
                            {
                              verification.nickname
                            }
                            님
                          </p>

                          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5">
                            <h3 className="min-w-0 truncate font-bold">
                              {
                                verification.promise_title
                              }
                            </h3>

                            {verification.is_joint && (
                              <span className="shrink-0 rounded-full bg-pink-50 px-2 py-0.5 text-[9px] font-semibold text-pink-500">
                                💕 공동 약속 인증
                              </span>
                            )}
                          </div>

                          <p className="mt-2 text-xs text-gray-400">
                            {formatDate(
                              verification.verification_date
                            )}
                          </p>

                        </div>

                        <span
                          className={`shrink-0 rounded-full px-3 py-2 text-xs font-semibold ${statusInfo.className}`}
                        >
                          {
                            statusInfo.emoji
                          }{" "}
                          {
                            statusInfo.label
                          }
                        </span>

                      </div>

                      {verification.message && (
                        <div className="mt-4 rounded-[20px] border border-pink-50 bg-[#fff8fb] p-4 text-sm leading-6 text-gray-600">
                          “
                          {
                            verification.message
                          }
                          ”
                        </div>
                      )}

                      <p className="mt-3 text-right text-xs font-semibold text-pink-400">
                        기록 자세히 보기 →
                      </p>

                    </button>
                  );
                }
              )}

            </div>
          )}

            </>
          )}

        </section>

        {/* =====================================
            보상 기록
        ====================================== */}

        <section className="mt-5">

          <div className="flex items-center justify-between">

            <h2 className="text-lg font-bold">
              보상 기록 🎁
            </h2>

            <Link
              href="/rewards"
              prefetch={false}
              className="text-sm font-semibold text-pink-500"
            >
              보상 보기
            </Link>

          </div>

          <div className="mt-3 rounded-[28px] border border-pink-100 bg-white p-5 shadow-sm">

            <div className="grid grid-cols-2 gap-3">

              <div className="rounded-[18px] border border-pink-50 bg-[#fff8fb] p-4 text-center">
                <p className="text-xs text-gray-400">
                  열린 보상
                </p>

                <p className="mt-2 text-2xl font-bold text-pink-500">
                  {
                    unlockedRewardCount
                  }
                  개
                </p>
              </div>

              <div className="rounded-[18px] border border-pink-50 bg-[#fff8fb] p-4 text-center">
                <p className="text-xs text-gray-400">
                  함께 사용
                </p>

                <p className="mt-2 text-2xl font-bold">
                  {
                    usedRewardCount
                  }
                  개
                </p>
              </div>

            </div>

          </div>

        </section>

        {/* =====================================
            에러/안내
        ====================================== */}

        {message && (
          <div className="mt-5 rounded-2xl border border-red-100 bg-white px-4 py-3 text-center text-sm text-red-500 shadow-sm">
            {message}
          </div>
        )}

        {selectedLevelRewardMemory && (
          <div
            className="fixed inset-0 z-[130] flex items-center justify-center bg-black/70 px-4 py-6"
            onClick={() => {
              if (
                !editingLevelRewardMemory &&
                !savingLevelRewardMemoryEdit
              ) {
                setSelectedLevelRewardMemory(
                  null
                );
              }
            }}
          >
            <div
              className="relative w-full max-w-md overflow-hidden rounded-[34px] border border-pink-100 bg-white shadow-2xl"
              onClick={(e) =>
                e.stopPropagation()
              }
            >
              <button
                type="button"
                onClick={() => {
                  if (
                    editingLevelRewardMemory
                  ) {
                    cancelEditLevelRewardMemory();
                  } else if (
                    !savingLevelRewardMemoryEdit
                  ) {
                    setSelectedLevelRewardMemory(
                      null
                    );
                  }
                }}
                className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-xl text-white backdrop-blur"
                aria-label="닫기"
              >
                ×
              </button>

              {selectedLevelRewardMemory.photo_url ? (
                <div className="bg-black">
                  <img
                    src={
                      selectedLevelRewardMemory.photo_url
                    }
                    alt={`${selectedLevelRewardMemory.reward_title} 추억 크게 보기`}
                    className="max-h-[68vh] w-full object-contain"
                  />
                </div>
              ) : (
                <div className="flex h-64 items-center justify-center bg-[#fff8fb] text-6xl">
                  💕
                </div>
              )}

              <div className="p-6">
                <p className="text-xs font-semibold tracking-[0.18em] text-pink-400">
                  OUR MEMORY
                </p>

                <p className="mt-2 text-sm font-semibold text-pink-500">
                  LV.
                  {
                    selectedLevelRewardMemory.unlock_level
                  }
                  {" · "}
                  {
                    selectedLevelRewardMemory.reward_title
                  }
                </p>

                {selectedLevelRewardMemory.message && (
                  <p className="mt-4 whitespace-pre-wrap text-base leading-7 text-gray-700">
                    {
                      selectedLevelRewardMemory.message
                    }
                  </p>
                )}

                {editingLevelRewardMemory ? (
                  <div className="mt-5">
                    <label className="text-sm font-semibold text-gray-700">
                      사진 교체
                    </label>

                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) =>
                        setEditMemoryFile(
                          e.target.files?.[0] ??
                            null
                        )
                      }
                      className="mt-2 block w-full rounded-2xl border border-pink-100 bg-[#fff8fb] px-4 py-3 text-sm text-gray-500"
                    />

                    <p className="mt-2 text-xs text-gray-400">
                      새 사진을 선택하지 않으면 기존 사진이 유지돼요.
                    </p>

                    <label className="mt-5 block text-sm font-semibold text-gray-700">
                      한마디
                    </label>

                    <textarea
                      value={
                        editMemoryMessage
                      }
                      onChange={(e) =>
                        setEditMemoryMessage(
                          e.target.value
                        )
                      }
                      rows={4}
                      maxLength={300}
                      className="mt-2 w-full resize-none rounded-2xl border border-pink-100 bg-[#fff8fb] px-4 py-3 text-sm leading-6 outline-none transition focus:border-pink-300"
                    />

                    <p className="mt-1 text-right text-xs text-gray-400">
                      {
                        editMemoryMessage.length
                      }
                      {" / 300"}
                    </p>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        disabled={
                          savingLevelRewardMemoryEdit
                        }
                        onClick={
                          cancelEditLevelRewardMemory
                        }
                        className="rounded-2xl border border-pink-100 bg-white px-4 py-4 text-sm font-semibold text-gray-500 disabled:opacity-50"
                      >
                        취소
                      </button>

                      <button
                        type="button"
                        disabled={
                          savingLevelRewardMemoryEdit
                        }
                        onClick={() => {
                          void saveLevelRewardMemoryEdit();
                        }}
                        className="rounded-2xl bg-pink-500 px-4 py-4 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        {savingLevelRewardMemoryEdit
                          ? "저장 중..."
                          : "저장하기"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="mt-4 text-sm text-gray-400">
                      {new Date(
                        selectedLevelRewardMemory.created_at
                      ).toLocaleDateString(
                        "ko-KR"
                      )}{" "}
                      추억 ♡
                    </p>

                    <button
                      type="button"
                      onClick={
                        startEditLevelRewardMemory
                      }
                      className="mt-6 w-full rounded-2xl border border-pink-200 bg-white px-5 py-4 text-sm font-semibold text-pink-500 transition hover:bg-pink-50"
                    >
                      ✏️ 추억 수정
                    </button>

                    <button
                      type="button"
                      disabled={
                        deletingLevelRewardMemory
                      }
                      onClick={() => {
                        void deleteLevelRewardMemory();
                      }}
                      className="mt-3 w-full rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-semibold text-red-500 transition hover:bg-red-100 disabled:opacity-50"
                    >
                      {deletingLevelRewardMemory
                        ? "삭제 중..."
                        : "🗑️ 추억 삭제"}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        <BottomNav />

        {selectedVerification && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-5 py-8"
            onClick={() => {
              setIsPhotoExpanded(false);
              setSelectedVerification(null);
            }}
          >
            <div
              className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-[34px] border border-pink-100 bg-white p-6 shadow-2xl"
              onClick={(e) =>
                e.stopPropagation()
              }
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold tracking-[0.2em] text-pink-400">
                    OUR MEMORY
                  </p>

                  <h2 className="mt-2 text-2xl font-bold">
                    {
                      selectedVerification.promise_title
                    }
                  </h2>

                  <p className="mt-2 text-sm text-gray-400">
                    {
                      selectedVerification.nickname
                    }
                    님의 인증 · {
                      formatDate(
                        selectedVerification.verification_date
                      )
                    }
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsPhotoExpanded(false);
                    setSelectedVerification(null);
                  }}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-50 text-xl text-gray-400"
                >
                  ×
                </button>
              </div>

              {selectedVerification.photo_url ? (
                <button
                  type="button"
                  onClick={() =>
                    setIsPhotoExpanded(true)
                  }
                  className="group mt-5 block w-full overflow-hidden rounded-3xl bg-gray-50 text-left"
                >
                  <div className="relative flex h-52 items-center justify-center overflow-hidden">
                    <img
                      src={
                        selectedVerification.photo_url
                      }
                      alt={`${selectedVerification.promise_title} 인증 사진`}
                      className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.02]"
                    />

                    <div className="absolute inset-x-3 bottom-3 rounded-full bg-black/55 px-4 py-2 text-center text-xs font-semibold text-white backdrop-blur-sm">
                      🔍 사진 크게 보기
                    </div>
                  </div>
                </button>
              ) : (
                <div className="mt-5 flex min-h-36 items-center justify-center rounded-3xl bg-[#fff8fb] px-5 text-center text-sm text-gray-400">
                  이 인증에는 사진이 없어요.
                </div>
              )}

              {selectedVerification.message && (
                <div className="mt-4 rounded-2xl bg-[#fff8fb] p-4">
                  <p className="text-xs text-gray-400">
                    남긴 이야기
                  </p>

                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-600">
                    {
                      selectedVerification.message
                    }
                  </p>
                </div>
              )}

              {(() => {
                const statusInfo =
                  getStatusInfo(
                    selectedVerification.status
                  );

                return (
                  <div className="mt-4 flex items-center justify-between rounded-2xl border border-pink-100 px-4 py-3">
                    <span className="text-sm text-gray-500">
                      인증 상태
                    </span>

                    <span
                      className={`rounded-full px-3 py-2 text-xs font-semibold ${statusInfo.className}`}
                    >
                      {statusInfo.emoji}{" "}
                      {statusInfo.label}
                    </span>
                  </div>
                );
              })()}

              <button
                type="button"
                onClick={() => {
                  setIsPhotoExpanded(false);
                  setSelectedVerification(null);
                }}
                className="mt-5 w-full rounded-2xl bg-pink-500 px-5 py-4 font-semibold text-white transition hover:bg-pink-600"
              >
                추억 닫기
              </button>
            </div>
          </div>
        )}

        {isPhotoExpanded &&
          selectedVerification?.photo_url && (
            <div
              className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-4"
              onClick={() =>
                setIsPhotoExpanded(false)
              }
            >
              <button
                type="button"
                onClick={() =>
                  setIsPhotoExpanded(false)
                }
                className="absolute right-5 top-5 flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-2xl text-white backdrop-blur-sm transition hover:bg-white/25"
                aria-label="사진 크게 보기 닫기"
              >
                ×
              </button>

              <div
                className="flex max-h-[92vh] max-w-[96vw] items-center justify-center"
                onClick={(e) =>
                  e.stopPropagation()
                }
              >
                <img
                  src={
                    selectedVerification.photo_url
                  }
                  alt={`${selectedVerification.promise_title} 인증 사진 크게 보기`}
                  className="max-h-[92vh] max-w-[96vw] rounded-2xl object-contain shadow-2xl"
                />
              </div>

              <p className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-black/45 px-4 py-2 text-xs font-medium text-white/90 backdrop-blur-sm">
                바깥을 누르면 닫혀요
              </p>
            </div>
          )}

      </div>
    </main>
  );
}