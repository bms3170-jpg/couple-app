"use client";

import { useEffect, useMemo, useState } from "react";
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
  status: "pending" | "approved" | "rejected";
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

type PeriodFilter = "all" | "month" | "3months" | "year";
type VerificationFilter = "all" | "mine" | "partner";

type SearchResult = {
  id: string;
  type: "promise" | "verification" | "memory";
  title: string;
  subtitle: string;
  date: string;
};

const HISTORY_IMAGES = {
  record: "/images/us-record.PNG",
  recentMoment: "/images/us-recent-moment.PNG",
  story: "/images/us-story.PNG",
  reward: "/images/us-next-reward.PNG",
} as const;

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getMonthKey(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function isInPeriod(value: string, period: PeriodFilter) {
  if (period === "all") return true;

  const date = new Date(value);
  const now = new Date();
  const start = new Date(now);

  if (period === "month") {
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth()
    );
  }

  if (period === "3months") {
    start.setMonth(now.getMonth() - 3);
    return date >= start;
  }

  return date.getFullYear() === now.getFullYear();
}

function getStatusInfo(status: "pending" | "approved" | "rejected") {
  if (status === "approved") {
    return {
      label: "성공",
      emoji: "✅",
      className: "bg-emerald-50 text-emerald-600",
    };
  }

  if (status === "rejected") {
    return {
      label: "반려",
      emoji: "↩️",
      className: "bg-rose-50 text-rose-500",
    };
  }

  return {
    label: "확인 대기",
    emoji: "⏳",
    className: "bg-amber-50 text-amber-600",
  };
}

export default function UsHistoryPage() {
  const supabase = useMemo(() => createClient(), []);
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [promises, setPromises] = useState<PromiseItem[]>([]);
  const [verifications, setVerifications] = useState<VerificationItem[]>([]);
  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [levelRewardMemories, setLevelRewardMemories] = useState<LevelRewardMemory[]>([]);
  const [coupleXp, setCoupleXp] = useState(0);

  const [selectedVerification, setSelectedVerification] =
    useState<RecentVerification | null>(null);
  const [selectedLevelRewardMemory, setSelectedLevelRewardMemory] =
    useState<LevelRewardMemory | null>(null);

  const [deletingLevelRewardMemory, setDeletingLevelRewardMemory] = useState(false);
  const [editingLevelRewardMemory, setEditingLevelRewardMemory] = useState(false);
  const [editMemoryMessage, setEditMemoryMessage] = useState("");
  const [editMemoryFile, setEditMemoryFile] = useState<File | null>(null);
  const [savingLevelRewardMemoryEdit, setSavingLevelRewardMemoryEdit] = useState(false);
  const [isPhotoExpanded, setIsPhotoExpanded] = useState(false);

  const [verificationFilter, setVerificationFilter] =
    useState<VerificationFilter>("all");
  const [showRecentVerificationList, setShowRecentVerificationList] = useState(true);
  const [showPromiseRecords, setShowPromiseRecords] = useState(false);

  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [featuredRecordId, setFeaturedRecordId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setFeaturedRecordId(window.localStorage.getItem("ourquest-history-featured"));
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      window.location.href = "/login";
      return;
    }

    const currentUser = user;
    let cancelled = false;

    async function loadHistory() {
      setLoading(true);
      setMessage("");

      const { data: membership, error: membershipError } = await supabase
        .from("couple_members")
        .select("couple_id")
        .eq("user_id", currentUser.id)
        .maybeSingle();

      if (cancelled) return;

      if (membershipError || !membership) {
        console.error("커플 조회 오류:", membershipError);
        setMessage("커플 정보를 찾을 수 없어요.");
        setLoading(false);
        return;
      }

      const coupleId = membership.couple_id;

      const { data: coupleData, error: coupleError } = await supabase
        .from("couples")
        .select("xp")
        .eq("id", coupleId)
        .maybeSingle();

      if (coupleError) console.error("커플 XP 조회 오류:", coupleError);
      if (cancelled) return;
      setCoupleXp(coupleData?.xp ?? 0);

      const { data: memberRows, error: memberError } = await supabase
        .from("couple_members")
        .select("user_id")
        .eq("couple_id", coupleId)
        .order("joined_at", { ascending: true });

      if (cancelled) return;
      if (memberError) {
        console.error("멤버 조회 오류:", memberError);
        setMessage("멤버 정보를 불러오지 못했어요.");
        setLoading(false);
        return;
      }

      const userIds = memberRows?.map((item) => item.user_id) ?? [];

      const { data: profileRows, error: profileError } = userIds.length
        ? await supabase.from("profiles").select("id, nickname").in("id", userIds)
        : { data: [], error: null };

      if (cancelled) return;
      if (profileError) {
        console.error("프로필 조회 오류:", profileError);
        setMessage("프로필 정보를 불러오지 못했어요.");
        setLoading(false);
        return;
      }

      setMembers(
        userIds.map((userId) => {
          const profile = profileRows?.find((item) => item.id === userId);
          return {
            user_id: userId,
            nickname: profile?.nickname ?? "이름 없음",
          };
        })
      );

      const { data: promiseRows, error: promiseError } = await supabase
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
        .eq("couple_id", coupleId)
        .order("created_at", { ascending: false });

      if (cancelled) return;
      if (promiseError) {
        console.error("약속 조회 오류:", promiseError);
        setMessage("약속 기록을 불러오지 못했어요.");
        setLoading(false);
        return;
      }
      setPromises((promiseRows ?? []) as PromiseItem[]);

      const { data: verificationRows, error: verificationError } = await supabase
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
        .eq("couple_id", coupleId)
        .order("created_at", { ascending: false });

      if (cancelled) return;
      if (verificationError) {
        console.error("인증 기록 조회 오류:", verificationError);
        setMessage("인증 기록을 불러오지 못했어요.");
        setLoading(false);
        return;
      }

      const verificationItems = (verificationRows ?? []) as Omit<
        VerificationItem,
        "photo_url"
      >[];

      const verificationItemsWithUrls = await Promise.all(
        verificationItems.map(async (item) => {
          let photoUrl: string | null = null;
          if (item.photo_path) {
            const { data: signedData, error: signedError } = await supabase.storage
              .from("verification-images")
              .createSignedUrl(item.photo_path, 60 * 60);

            if (!signedError && signedData) photoUrl = signedData.signedUrl;
            if (signedError) console.error("사진 URL 생성 오류:", signedError);
          }

          return { ...item, photo_url: photoUrl };
        })
      );

      if (cancelled) return;
      setVerifications(verificationItemsWithUrls);

      const { data: rewardRows, error: rewardError } = await supabase
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
        .eq("couple_id", coupleId)
        .order("required_days", { ascending: true });

      if (cancelled) return;
      if (rewardError) {
        console.error("보상 기록 조회 오류:", rewardError);
        setMessage("보상 기록을 불러오지 못했어요.");
        setLoading(false);
        return;
      }
      setRewards((rewardRows ?? []) as RewardItem[]);

      const { data: memoryRows, error: memoryError } = await supabase
        .from("level_reward_memories")
        .select(`
          id,
          level_reward_id,
          message,
          photo_path,
          created_at
        `)
        .eq("couple_id", coupleId)
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (memoryError) {
        console.error("레벨 보상 추억 조회 오류:", memoryError);
      } else {
        const levelRewardIds = [
          ...new Set((memoryRows ?? []).map((item) => item.level_reward_id)),
        ];

        const { data: levelRewardRows, error: levelRewardError } = levelRewardIds.length
          ? await supabase
              .from("level_rewards")
              .select("id, unlock_level, title")
              .in("id", levelRewardIds)
          : { data: [], error: null };

        if (levelRewardError) {
          console.error("레벨 보상 정보 조회 오류:", levelRewardError);
        }

        const mappedMemories = (memoryRows ?? []).map((memory) => {
          const levelReward = levelRewardRows?.find(
            (item) => item.id === memory.level_reward_id
          );

          const photoUrl = memory.photo_path
            ? supabase.storage
                .from("level-reward-memories")
                .getPublicUrl(memory.photo_path).data.publicUrl
            : null;

          return {
            ...memory,
            photo_url: photoUrl,
            reward_title: levelReward?.title ?? "레벨 보상",
            unlock_level: levelReward?.unlock_level ?? 0,
          };
        }) as LevelRewardMemory[];

        setLevelRewardMemories(mappedMemories);
      }

      setLoading(false);
    }

    void loadHistory();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user, supabase]);

  useEffect(() => {
    if (typeof window === "undefined" || levelRewardMemories.length === 0) return;

    const params = new URLSearchParams(window.location.search);
    const memoryId = params.get("memory");
    if (!memoryId) return;

    const targetMemory = levelRewardMemories.find((memory) => memory.id === memoryId);
    if (targetMemory) setSelectedLevelRewardMemory(targetMemory);
  }, [levelRewardMemories]);

  if (authLoading || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fff8fb]">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[20px] bg-white text-2xl shadow-sm">
            📖
          </div>
          <p className="mt-4 text-sm text-gray-500">우리 기록 불러오는 중...</p>
        </div>
      </main>
    );
  }

  const totalPromiseCount = promises.length;
  const activePromiseCount = promises.filter((promise) => promise.is_active).length;
  const endedPromiseCount = promises.filter((promise) => !promise.is_active).length;
  const approvedCount = verifications.filter(
    (verification) => verification.status === "approved"
  ).length;
  const pendingCount = verifications.filter(
    (verification) => verification.status === "pending"
  ).length;
  const unlockedRewardCount = rewards.filter((reward) => reward.is_unlocked).length;
  const usedRewardCount = rewards.filter((reward) => reward.is_used).length;
  const remainingRewardCount = Math.max(unlockedRewardCount - usedRewardCount, 0);

  const bestPromise = promises.length
    ? [...promises].sort((a, b) => b.best_streak - a.best_streak)[0]
    : null;

  const currentUserId = user?.id ?? "";

  const allRecentVerifications: RecentVerification[] = verifications.map(
    (verification) => {
      const promise = promises.find((item) => item.id === verification.promise_id);
      const member = members.find((item) => item.user_id === verification.user_id);

      return {
        ...verification,
        promise_title: promise?.title ?? "약속",
        is_joint: promise?.is_joint ?? false,
        nickname: member?.nickname ?? "파트너",
      };
    }
  );

  const filteredByPeriodVerifications = allRecentVerifications.filter((item) =>
    isInPeriod(item.verification_date, periodFilter)
  );

  const mineVerificationCount = filteredByPeriodVerifications.filter(
    (verification) => verification.user_id === currentUserId
  ).length;

  const partnerVerificationCount = filteredByPeriodVerifications.filter(
    (verification) => verification.user_id !== currentUserId
  ).length;

  const recentVerifications = filteredByPeriodVerifications.filter((verification) => {
    if (verificationFilter === "mine") {
      return verification.user_id === currentUserId;
    }
    if (verificationFilter === "partner") {
      return verification.user_id !== currentUserId;
    }
    return true;
  });

  const now = new Date();
  const currentMonthKey = getMonthKey(now);
  const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousMonthKey = getMonthKey(previousMonth);

  const currentMonthApproved = verifications.filter(
    (item) =>
      item.status === "approved" && getMonthKey(item.verification_date) === currentMonthKey
  ).length;

  const previousMonthApproved = verifications.filter(
    (item) =>
      item.status === "approved" && getMonthKey(item.verification_date) === previousMonthKey
  ).length;

  const monthDelta = currentMonthApproved - previousMonthApproved;

  const currentMonthMemories = levelRewardMemories.filter(
    (item) => getMonthKey(item.created_at) === currentMonthKey
  ).length;

  const firstSuccess = [...verifications]
    .filter((item) => item.status === "approved")
    .sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )[0];

  const badges = [
    {
      id: "first",
      emoji: "🌱",
      title: "첫 성공",
      unlocked: approvedCount >= 1,
      description: "첫 인증 성공을 기록했어요",
    },
    {
      id: "ten",
      emoji: "✨",
      title: "10번 성공",
      unlocked: approvedCount >= 10,
      description: "성공 기록 10회를 달성했어요",
    },
    {
      id: "streak7",
      emoji: "🔥",
      title: "7일 연속",
      unlocked: (bestPromise?.best_streak ?? 0) >= 7,
      description: "7일 이상 연속 성공했어요",
    },
    {
      id: "reward",
      emoji: "🎁",
      title: "첫 보상 사용",
      unlocked: usedRewardCount >= 1,
      description: "처음으로 보상을 함께 사용했어요",
    },
  ];

  const unlockedBadges = badges.filter((badge) => badge.unlocked);

  const featuredVerification = featuredRecordId
    ? allRecentVerifications.find((item) => item.id === featuredRecordId) ?? null
    : null;

  const searchResults: SearchResult[] = (() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];

    const promiseResults: SearchResult[] = promises
      .filter((item) => item.title.toLowerCase().includes(query))
      .map((item) => ({
        id: item.id,
        type: "promise",
        title: item.title,
        subtitle: `최고 ${item.best_streak}일 · 성공 ${item.total_success}일`,
        date: item.created_at,
      }));

    const verificationResults: SearchResult[] = allRecentVerifications
      .filter(
        (item) =>
          item.promise_title.toLowerCase().includes(query) ||
          (item.message ?? "").toLowerCase().includes(query)
      )
      .map((item) => ({
        id: item.id,
        type: "verification",
        title: item.promise_title,
        subtitle: item.message ?? `${item.nickname}님의 인증`,
        date: item.created_at,
      }));

    const memoryResults: SearchResult[] = levelRewardMemories
      .filter(
        (item) =>
          item.reward_title.toLowerCase().includes(query) ||
          (item.message ?? "").toLowerCase().includes(query)
      )
      .map((item) => ({
        id: item.id,
        type: "memory",
        title: item.reward_title,
        subtitle: item.message ?? `LV.${item.unlock_level} 보상 추억`,
        date: item.created_at,
      }));

    return [...promiseResults, ...verificationResults, ...memoryResults]
      .sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      )
      .slice(0, 20);
  })();

  function setFeaturedVerificationRecord(id: string) {
    const next = featuredRecordId === id ? null : id;
    setFeaturedRecordId(next);
    if (typeof window !== "undefined") {
      if (next) {
        window.localStorage.setItem("ourquest-history-featured", next);
      } else {
        window.localStorage.removeItem("ourquest-history-featured");
      }
    }
  }

  function startEditLevelRewardMemory() {
    if (!selectedLevelRewardMemory) return;
    setEditingLevelRewardMemory(true);
    setEditMemoryMessage(selectedLevelRewardMemory.message ?? "");
    setEditMemoryFile(null);
  }

  function cancelEditLevelRewardMemory() {
    setEditingLevelRewardMemory(false);
    setEditMemoryMessage("");
    setEditMemoryFile(null);
  }

  async function saveLevelRewardMemoryEdit() {
    if (!selectedLevelRewardMemory || savingLevelRewardMemoryEdit) return;

    if (
      !editMemoryMessage.trim() &&
      !editMemoryFile &&
      !selectedLevelRewardMemory.photo_path
    ) {
      window.alert("사진이나 한마디 중 하나는 남겨주세요.");
      return;
    }

    if (editMemoryFile && editMemoryFile.size > 5 * 1024 * 1024) {
      window.alert("사진은 5MB 이하만 업로드할 수 있어요.");
      return;
    }

    if (
      editMemoryFile &&
      !["image/jpeg", "image/png", "image/webp"].includes(editMemoryFile.type)
    ) {
      window.alert("JPG, PNG, WEBP 사진만 올릴 수 있어요.");
      return;
    }

    setSavingLevelRewardMemoryEdit(true);
    const target = selectedLevelRewardMemory;

    let nextPhotoPath = target.photo_path;
    let nextPhotoUrl = target.photo_url;

    if (editMemoryFile) {
      const safeName = editMemoryFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const newPhotoPath = `${user?.id ?? "user"}/${target.level_reward_id}/${Date.now()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("level-reward-memories")
        .upload(newPhotoPath, editMemoryFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error("수정 사진 업로드 오류:", uploadError);
        setSavingLevelRewardMemoryEdit(false);
        window.alert(`사진을 업로드하지 못했어요: ${uploadError.message}`);
        return;
      }

      nextPhotoPath = newPhotoPath;
      nextPhotoUrl = supabase.storage
        .from("level-reward-memories")
        .getPublicUrl(newPhotoPath).data.publicUrl;
    }

    const { error: updateError } = await supabase
      .from("level_reward_memories")
      .update({
        message: editMemoryMessage.trim() || null,
        photo_path: nextPhotoPath,
      })
      .eq("id", target.id);

    if (updateError) {
      console.error("레벨 보상 추억 수정 오류:", updateError);

      if (editMemoryFile && nextPhotoPath && nextPhotoPath !== target.photo_path) {
        await supabase.storage.from("level-reward-memories").remove([nextPhotoPath]);
      }

      setSavingLevelRewardMemoryEdit(false);
      window.alert(`추억을 수정하지 못했어요: ${updateError.message}`);
      return;
    }

    if (editMemoryFile && target.photo_path && target.photo_path !== nextPhotoPath) {
      const { error: removeOldError } = await supabase.storage
        .from("level-reward-memories")
        .remove([target.photo_path]);

      if (removeOldError) console.error("기존 추억 사진 삭제 오류:", removeOldError);
    }

    const updatedMemory: LevelRewardMemory = {
      ...target,
      message: editMemoryMessage.trim() || null,
      photo_path: nextPhotoPath,
      photo_url: nextPhotoUrl,
    };

    setLevelRewardMemories((prev) =>
      prev.map((memory) => (memory.id === target.id ? updatedMemory : memory))
    );
    setSelectedLevelRewardMemory(updatedMemory);
    setEditingLevelRewardMemory(false);
    setEditMemoryMessage("");
    setEditMemoryFile(null);
    setSavingLevelRewardMemoryEdit(false);
  }

  async function deleteLevelRewardMemory() {
    if (!selectedLevelRewardMemory || deletingLevelRewardMemory) return;

    const confirmed = window.confirm(
      "이 추억을 삭제할까요?\n삭제하면 사진과 한마디를 다시 복구할 수 없어요."
    );
    if (!confirmed) return;

    setDeletingLevelRewardMemory(true);
    const target = selectedLevelRewardMemory;

    const { error: deleteError } = await supabase
      .from("level_reward_memories")
      .delete()
      .eq("id", target.id);

    if (deleteError) {
      console.error("레벨 보상 추억 삭제 오류:", deleteError);
      setDeletingLevelRewardMemory(false);
      window.alert(`추억을 삭제하지 못했어요: ${deleteError.message}`);
      return;
    }

    if (target.photo_path) {
      const { error: storageError } = await supabase.storage
        .from("level-reward-memories")
        .remove([target.photo_path]);

      if (storageError) console.error("추억 사진 삭제 오류:", storageError);
    }

    setLevelRewardMemories((prev) => prev.filter((memory) => memory.id !== target.id));
    setSelectedLevelRewardMemory(null);
    setDeletingLevelRewardMemory(false);
  }

  return (
    <main className="min-h-screen bg-[#fff8fb] px-5 py-8 text-[#2b2b2b]">
      <div className="mx-auto max-w-md pb-28">
        <header className="relative overflow-hidden rounded-[34px] border border-pink-100/80 bg-gradient-to-br from-[#fffdfd] via-[#fff8fb] to-[#fff0f7] px-5 pb-5 pt-5 shadow-[0_12px_34px_rgba(236,72,153,0.07)]">
          <div className="pointer-events-none absolute -right-10 -top-8 h-44 w-52 rounded-full bg-pink-100/55 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-12 -left-10 h-36 w-36 rounded-full bg-orange-50/80 blur-3xl" />

          <img
            src={HISTORY_IMAGES.story}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute right-0 top-3 h-[178px] w-[210px] object-contain object-right opacity-[0.76]"
          />

          <div className="relative z-10">
            <Link
              href="/us"
              prefetch={false}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-400"
            >
              ← 우리로 돌아가기
            </Link>

            <div className="mt-5 max-w-[58%]">
              <p className="text-[10px] font-black tracking-[0.24em] text-pink-400">
                ♡ OUR HISTORY ♡
              </p>

              <h1 className="mt-2 text-[34px] font-black tracking-[-0.04em] text-[#242424]">
                우리 기록
              </h1>

              <p className="mt-2 text-[12px] leading-5 text-gray-500">
                약속하고, 인증하고, 기억한 모든 순간을
                <br />
                둘만의 기록으로 모아봤어요 ♡
              </p>

              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="mt-4 flex h-10 w-10 items-center justify-center rounded-[15px] border border-pink-200/80 bg-white/80 text-lg text-pink-500 shadow-sm backdrop-blur transition active:scale-95"
                aria-label="기록 검색"
              >
                ⌕
              </button>
            </div>

            <div className="mt-5 rounded-[28px] border border-white/90 bg-white/82 p-4 shadow-[0_8px_24px_rgba(236,72,153,0.05)] backdrop-blur">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[20px] bg-[#fff6f9] shadow-sm">
                    <img
                      src={HISTORY_IMAGES.record}
                      alt=""
                      aria-hidden="true"
                      className="h-12 w-12 object-contain"
                    />
                  </div>

                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-gray-400">
                      우리가 함께 쌓은 기록
                    </p>

                    <p className="mt-0.5 text-[25px] font-black tracking-[-0.035em]">
                      <span className="text-pink-500">{approvedCount}</span>
                      번의 성공
                    </p>
                  </div>
                </div>

                <div className="shrink-0 rounded-[20px] border border-pink-100 bg-white/90 px-3.5 py-3 text-center shadow-sm">
                  <p className="text-[9px] font-black tracking-[0.12em] text-gray-400">
                    OUR XP
                  </p>
                  <p className="mt-1 text-lg font-black text-pink-500">
                    {coupleXp} XP
                  </p>
                </div>
              </div>

              <div className="mt-4 h-px bg-gradient-to-r from-transparent via-pink-100 to-transparent" />

              <div className="mt-3 grid grid-cols-3 divide-x divide-pink-100/80">
                {[
                  {
                    label: "약속",
                    value: totalPromiseCount,
                    emoji: "✅",
                    tone: "from-emerald-50/75 to-white",
                  },
                  {
                    label: "인증",
                    value: approvedCount,
                    emoji: "📸",
                    tone: "from-violet-50/75 to-white",
                  },
                  {
                    label: "추억",
                    value: levelRewardMemories.length,
                    emoji: "💕",
                    tone: "from-pink-50/80 to-white",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className={`mx-1 rounded-[18px] bg-gradient-to-b ${item.tone} px-2 py-3 text-center`}
                  >
                    <span className="text-[18px]">{item.emoji}</span>
                    <p className="mt-1 text-[22px] font-black tracking-[-0.03em]">
                      {item.value}
                    </p>
                    <p className="mt-0.5 text-[10px] font-medium text-gray-400">
                      {item.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </header>

        <section className="relative mt-4 overflow-hidden rounded-[30px] border border-pink-100/80 bg-gradient-to-br from-white via-[#fffaf8] to-[#fff4fb] p-5 shadow-[0_9px_28px_rgba(236,72,153,0.055)]">
          <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-sky-50/80 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-10 -left-8 h-28 w-28 rounded-full bg-purple-50/80 blur-2xl" />

          <img
            src={HISTORY_IMAGES.record}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute right-[108px] top-3 h-20 w-20 object-contain opacity-[0.55]"
          />

          <div className="relative z-10">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black tracking-[0.22em] text-pink-400">
                  MONTHLY RECAP
                </p>
                <h2 className="mt-1 text-[21px] font-black tracking-[-0.03em]">
                  이번 달 우리 기록 💕
                </h2>
              </div>

              <div className="rounded-full border border-pink-200/80 bg-pink-50/80 px-3.5 py-2 text-[11px] font-black text-pink-500">
                {currentMonthApproved}번 성공
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2">
              <div className="rounded-[20px] bg-gradient-to-br from-purple-50 via-white to-purple-50/40 px-2 py-4 text-center">
                <p className="text-[10px] font-medium text-gray-400">
                  지난달 대비
                </p>
                <p
                  className={`mt-2 text-xl font-black ${
                    monthDelta >= 0 ? "text-purple-500" : "text-gray-500"
                  }`}
                >
                  {monthDelta >= 0 ? "+" : ""}
                  {monthDelta}
                </p>
              </div>

              <div className="rounded-[20px] bg-gradient-to-br from-orange-50 via-white to-amber-50/50 px-2 py-4 text-center">
                <p className="text-[10px] font-medium text-gray-400">
                  추억 추가
                </p>
                <p className="mt-2 text-xl font-black text-orange-500">
                  {currentMonthMemories}개
                </p>
              </div>

              <div className="rounded-[20px] bg-gradient-to-br from-emerald-50 via-white to-teal-50/45 px-2 py-4 text-center">
                <p className="text-[10px] font-medium text-gray-400">
                  최고 연속
                </p>
                <p className="mt-2 text-xl font-black text-emerald-500">
                  {bestPromise?.best_streak ?? 0}일
                </p>
              </div>
            </div>
          </div>
        </section>

        {featuredVerification && (
          <section className="mt-4 overflow-hidden rounded-[28px] border border-pink-100 bg-gradient-to-br from-[#fffdf7] via-white to-pink-50 shadow-sm">
            <button
              type="button"
              onClick={() => setSelectedVerification(featuredVerification)}
              className="w-full p-4 text-left"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-sm">
                  {featuredVerification.photo_url ? (
                    <img
                      src={featuredVerification.photo_url}
                      alt="대표 기록"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl">💖</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black tracking-[0.16em] text-pink-400">
                    OUR FAVORITE RECORD
                  </p>
                  <p className="mt-1 truncate font-black">{featuredVerification.promise_title}</p>
                  <p className="mt-1 truncate text-xs text-gray-400">
                    {featuredVerification.message ?? `${featuredVerification.nickname}님의 인증`}
                  </p>
                </div>
                <span className="text-pink-400">♥</span>
              </div>
            </button>
          </section>
        )}

        <section className="mt-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[19px] font-black tracking-[-0.02em]">한눈에 보기</h2>
            <span className="text-[11px] text-gray-400">우리 기록 요약</span>
          </div>

          <div className="mt-3 overflow-hidden rounded-[28px] border border-pink-100 bg-white p-3 shadow-[0_8px_24px_rgba(236,72,153,0.05)]">
            <div className="grid grid-cols-2 gap-2">
              {[
                {
                  emoji: "✅",
                  label: "함께 만든 약속",
                  value: `${totalPromiseCount}개`,
                  sub: `진행 ${activePromiseCount} · 종료 ${endedPromiseCount}`,
                  tone: "bg-emerald-50/70",
                },
                {
                  emoji: "📸",
                  label: "성공한 인증",
                  value: `${approvedCount}개`,
                  sub: pendingCount > 0 ? `대기 ${pendingCount}개` : "모두 확인 완료",
                  tone: "bg-violet-50/70",
                },
                {
                  emoji: "🎁",
                  label: "해금한 보상",
                  value: `${unlockedRewardCount}개`,
                  sub: `남은 보상 ${remainingRewardCount}개`,
                  tone: "bg-amber-50/70",
                },
                {
                  emoji: "💝",
                  label: "사용한 보상",
                  value: `${usedRewardCount}개`,
                  sub: "함께 사용한 기록",
                  tone: "bg-pink-50/70",
                },
              ].map((item) => (
                <div key={item.label} className={`min-h-[132px] rounded-[20px] p-4 ${item.tone}`}>
                  <span className="text-[22px]">{item.emoji}</span>
                  <p className="mt-2.5 text-xs font-semibold text-gray-500">{item.label}</p>
                  <p className="mt-1 text-2xl font-black">{item.value}</p>
                  <p className="mt-1 text-[10px] text-gray-400">{item.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black tracking-[0.16em] text-pink-400">
                RECORD BADGES
              </p>
              <h2 className="mt-1 text-lg font-black">우리의 배지</h2>
            </div>
            <span className="text-xs font-semibold text-pink-500">
              {unlockedBadges.length}/{badges.length}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            {badges.map((badge) => (
              <div
                key={badge.id}
                className={`min-h-[150px] rounded-[24px] border p-4 shadow-[0_6px_18px_rgba(236,72,153,0.045)] ${
                  badge.unlocked
                    ? "border-pink-100 bg-white"
                    : "border-gray-100 bg-white/80 opacity-70"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[26px]">{badge.emoji}</span>
                  <span className={`rounded-full px-2 py-1 text-[9px] font-black ${
                    badge.unlocked
                      ? "bg-pink-50 text-pink-500"
                      : "bg-gray-100 text-gray-400"
                  }`}>
                    {badge.unlocked ? "UNLOCKED" : "LOCKED"}
                  </span>
                </div>
                <p className="mt-3 text-[15px] font-black">{badge.title}</p>
                <p className="mt-1.5 text-[11px] leading-[1.55] text-gray-400">
                  {badge.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-5">
          <h2 className="text-lg font-black">우리의 최고 기록 🔥</h2>

          {bestPromise ? (
            <div className="relative mt-3 overflow-hidden rounded-[30px] border border-pink-100 bg-gradient-to-br from-white via-white to-[#fff3f8] p-5 shadow-[0_9px_26px_rgba(236,72,153,0.06)]">
              <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-pink-100/45 blur-2xl" />

              <div className="relative z-10 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-black text-pink-400">BEST QUEST</p>
                    {bestPromise.is_joint && (
                      <span className="rounded-full bg-pink-50 px-2.5 py-1 text-[10px] font-semibold text-pink-500">
                        💕 공동 기록
                      </span>
                    )}
                  </div>
                  <h3 className="mt-2 truncate text-xl font-black">{bestPromise.title}</h3>
                  <p className="mt-1 text-xs text-gray-400">
                    {bestPromise.is_active ? "지금도 이어지는 기록" : "완료된 최고 기록"}
                  </p>
                </div>

                <div className="shrink-0 rounded-[18px] border border-pink-100 bg-white/90 px-3.5 py-2.5 text-center shadow-sm">
                  <p className="text-[10px] font-black text-pink-400">BEST</p>
                  <p className="mt-1 font-black text-pink-500">🔥 {bestPromise.best_streak}일</p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2">
                <div className="rounded-[18px] bg-[#fff8fb] p-3 text-center">
                  <p className="text-[10px] text-gray-400">현재 연속</p>
                  <p className="mt-1 font-black">{bestPromise.current_streak}일</p>
                </div>
                <div className="rounded-[18px] bg-[#fff8fb] p-3 text-center">
                  <p className="text-[10px] text-gray-400">최고 연속</p>
                  <p className="mt-1 font-black">{bestPromise.best_streak}일</p>
                </div>
                <div className="rounded-[18px] bg-[#fff8fb] p-3 text-center">
                  <p className="text-[10px] text-gray-400">누적 성공</p>
                  <p className="mt-1 font-black">{bestPromise.total_success}일</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-3 rounded-[26px] border border-dashed border-pink-200 bg-white p-6 text-center text-sm text-gray-400 shadow-sm">
              아직 약속 기록이 없어요.
            </div>
          )}
        </section>

        <section className="mt-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black">약속 기록</h2>
              <p className="mt-1 text-xs text-gray-400">약속별 핵심 기록을 빠르게 확인해요.</p>
            </div>
            <Link href="/promises" prefetch={false} className="text-sm font-black text-pink-500">
              전체 보기
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setShowPromiseRecords((prev) => !prev)}
            className="mt-3 flex w-full items-center justify-between rounded-[22px] border border-pink-100 bg-white px-4 py-3 text-left shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-50">✅</div>
              <div>
                <p className="text-sm font-black">약속 목록</p>
                <p className="mt-0.5 text-[11px] text-gray-400">{promises.length}개의 기록</p>
              </div>
            </div>
            <span className={`text-gray-300 transition ${showPromiseRecords ? "rotate-180" : ""}`}>⌄</span>
          </button>

          {showPromiseRecords && (
            <div className="mt-3 space-y-2">
              {promises.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-pink-200 bg-white p-6 text-center text-sm text-gray-400">
                  아직 만든 약속이 없어요.
                </div>
              ) : (
                promises.slice(0, 6).map((promise) => {
                  const member = members.find((item) => item.user_id === promise.assigned_to);

                  return (
                    <div
                      key={promise.id}
                      className={`rounded-[22px] border p-4 shadow-sm ${
                        promise.is_active
                          ? "border-pink-100 bg-white"
                          : "border-gray-100 bg-white/70"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate font-black">{promise.title}</p>
                            {promise.is_joint && (
                              <span className="rounded-full bg-pink-50 px-2 py-0.5 text-[9px] font-semibold text-pink-500">
                                💕 함께
                              </span>
                            )}
                          </div>
                          <p className="mt-1 truncate text-[11px] text-gray-400">
                            {promise.is_joint ? "서로의 약속" : `${member?.nickname ?? "파트너"}님의 약속`}
                          </p>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                          promise.is_active
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-gray-100 text-gray-400"
                        }`}>
                          {promise.is_active ? "진행 중" : "종료"}
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-xl bg-[#fff8fb] px-2 py-2">
                          <p className="text-[9px] text-gray-400">현재</p>
                          <p className="mt-0.5 text-xs font-black">{promise.current_streak}일</p>
                        </div>
                        <div className="rounded-xl bg-[#fff8fb] px-2 py-2">
                          <p className="text-[9px] text-gray-400">최고</p>
                          <p className="mt-0.5 text-xs font-black">{promise.best_streak}일</p>
                        </div>
                        <div className="rounded-xl bg-[#fff8fb] px-2 py-2">
                          <p className="text-[9px] text-gray-400">성공</p>
                          <p className="mt-0.5 text-xs font-black">{promise.total_success}일</p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </section>

        <section className="mt-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black tracking-[0.18em] text-pink-400">OUR MEMORY</p>
              <h2 className="mt-1 text-lg font-black">레벨 보상 추억 💕</h2>
            </div>
            <Link href="/us/memories" prefetch={false} className="text-xs font-black text-pink-500">
              전체 보기 →
            </Link>
          </div>

          {levelRewardMemories.length === 0 ? (
            <div className="relative mt-3 overflow-hidden rounded-[28px] border border-dashed border-pink-200 bg-white p-7 text-center shadow-sm">
              <img
                src={HISTORY_IMAGES.reward}
                alt=""
                aria-hidden="true"
                className="mx-auto h-32 w-48 object-contain"
              />
              <p className="mt-1 text-sm font-black text-gray-600">아직 레벨 보상 추억이 없어요.</p>
              <p className="mt-1 text-xs leading-5 text-gray-400">
                사용한 레벨 보상에 사진이나 한마디를 남기면
                <br />
                이곳에 차곡차곡 모여요 ♡
              </p>
            </div>
          ) : (
            <div className="mt-3 -mr-4 flex gap-3 overflow-x-auto pb-2 pr-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {levelRewardMemories.map((memory) => (
                <button
                  type="button"
                  key={memory.id}
                  onClick={() => setSelectedLevelRewardMemory(memory)}
                  className="w-[72%] shrink-0 overflow-hidden rounded-[26px] border border-pink-100 bg-white text-left shadow-sm"
                >
                  {memory.photo_url ? (
                    <img
                      src={memory.photo_url}
                      alt={`${memory.reward_title} 추억`}
                      className="h-40 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-40 items-center justify-center bg-[#fff8fb] text-5xl">💕</div>
                  )}
                  <div className="p-4">
                    <p className="text-[10px] font-black text-pink-400">
                      LV.{memory.unlock_level} · {memory.reward_title}
                    </p>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-600">
                      {memory.message ?? "둘만의 보상 추억 ♡"}
                    </p>
                    <p className="mt-3 text-[10px] text-gray-400">
                      {new Date(memory.created_at).toLocaleDateString("ko-KR")}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="mt-5">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-black">최근 인증</h2>
              <p className="mt-1 text-xs text-gray-400">기간과 사람별로 기록을 골라볼 수 있어요.</p>
            </div>
            <Link href="/verifications" prefetch={false} className="text-xs font-black text-pink-500">
              인증 보기
            </Link>
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {[
              { key: "all" as const, label: "전체" },
              { key: "month" as const, label: "이번 달" },
              { key: "3months" as const, label: "최근 3개월" },
              { key: "year" as const, label: "올해" },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setPeriodFilter(item.key)}
                className={`shrink-0 rounded-full px-3.5 py-2.5 text-[11px] font-black transition active:scale-95 ${
                  periodFilter === item.key
                    ? "bg-pink-500 text-white"
                    : "border border-pink-100 bg-white text-gray-500"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-3 gap-1.5 rounded-[22px] border border-pink-100 bg-white p-1.5 shadow-[0_6px_18px_rgba(236,72,153,0.05)]">
            {[
              { key: "all" as const, label: "전체", count: filteredByPeriodVerifications.length },
              { key: "mine" as const, label: "내 인증", count: mineVerificationCount },
              { key: "partner" as const, label: "상대방", count: partnerVerificationCount },
            ].map((item) => {
              const active = verificationFilter === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setVerificationFilter(item.key)}
                  className={`rounded-[14px] px-2 py-3 text-xs font-semibold transition ${
                    active ? "bg-pink-500 text-white shadow-sm" : "text-gray-400"
                  }`}
                >
                  <span className="block">{item.label}</span>
                  <span className={`mt-1 block text-[10px] ${active ? "text-white/80" : "text-gray-300"}`}>
                    {item.count}개
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-3 space-y-3">
            {recentVerifications.slice(0, showRecentVerificationList ? 6 : 3).map((verification) => {
              const statusInfo = getStatusInfo(verification.status);
              const isFeatured = verification.id === featuredRecordId;

              return (
                <div
                  key={verification.id}
                  className="overflow-hidden rounded-[24px] border border-pink-100 bg-white shadow-[0_7px_20px_rgba(236,72,153,0.045)]"
                >
                  <button
                    type="button"
                    onClick={() => setSelectedVerification(verification)}
                    className="w-full p-4 text-left"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[18px] bg-[#fff8fb]">
                        {verification.photo_url ? (
                          <img
                            src={verification.photo_url}
                            alt="인증 썸네일"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-2xl">📸</span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[10px] font-black text-pink-400">{verification.nickname}님</p>
                            <h3 className="mt-1 truncate font-black">{verification.promise_title}</h3>
                          </div>
                          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusInfo.className}`}>
                            {statusInfo.emoji} {statusInfo.label}
                          </span>
                        </div>
                        <p className="mt-1 line-clamp-1 text-xs text-gray-400">
                          {verification.message ?? formatDate(verification.verification_date)}
                        </p>
                      </div>
                    </div>
                  </button>

                  <div className="flex items-center justify-between border-t border-pink-50 px-4 py-2.5">
                    <span className="text-[10px] text-gray-400">{formatDate(verification.verification_date)}</span>
                    <button
                      type="button"
                      onClick={() => setFeaturedVerificationRecord(verification.id)}
                      className={`rounded-full px-2.5 py-1 text-[10px] font-black ${
                        isFeatured ? "bg-pink-100 text-pink-500" : "bg-gray-50 text-gray-400"
                      }`}
                    >
                      {isFeatured ? "♥ 대표 기록" : "♡ 대표 기록"}
                    </button>
                  </div>
                </div>
              );
            })}

            {recentVerifications.length === 0 && (
              <div className="rounded-[26px] border border-dashed border-pink-200 bg-white p-7 text-center shadow-sm">
                <div className="text-3xl">📭</div>
                <p className="mt-3 font-semibold text-gray-500">조건에 맞는 인증 기록이 없어요.</p>
              </div>
            )}
          </div>

          {recentVerifications.length > 3 && (
            <button
              type="button"
              onClick={() => setShowRecentVerificationList((prev) => !prev)}
              className="mt-3 w-full rounded-2xl border border-pink-100 bg-white px-4 py-3 text-xs font-black text-pink-500 shadow-sm"
            >
              {showRecentVerificationList ? "간단히 보기" : "인증 더 보기"}
            </button>
          )}
        </section>

        <section className="mt-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black">보상 기록 🎁</h2>
            <Link href="/rewards" prefetch={false} className="text-sm font-black text-pink-500">
              보상 보기
            </Link>
          </div>

          <div className="relative mt-3 overflow-hidden rounded-[28px] border border-pink-100 bg-white p-5 shadow-[0_8px_24px_rgba(236,72,153,0.05)]">
            <img
              src={HISTORY_IMAGES.reward}
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute -right-3 -bottom-5 h-24 w-32 object-contain opacity-[0.08]"
            />
            <div className="relative z-10 grid grid-cols-3 gap-2">
              <div className="rounded-[18px] bg-[#fff8fb] p-3 text-center">
                <p className="text-[10px] text-gray-400">열린 보상</p>
                <p className="mt-2 text-xl font-black text-pink-500">{unlockedRewardCount}개</p>
              </div>
              <div className="rounded-[18px] bg-[#fff8fb] p-3 text-center">
                <p className="text-[10px] text-gray-400">함께 사용</p>
                <p className="mt-2 text-xl font-black">{usedRewardCount}개</p>
              </div>
              <div className="rounded-[18px] bg-[#fff8fb] p-3 text-center">
                <p className="text-[10px] text-gray-400">남은 보상</p>
                <p className="mt-2 text-xl font-black text-amber-500">{remainingRewardCount}개</p>
              </div>
            </div>
          </div>
        </section>

        {firstSuccess && (
          <section className="mt-5 overflow-hidden rounded-[28px] border border-pink-100 bg-gradient-to-r from-white via-white to-[#fff0f6] p-4.5 shadow-[0_8px_24px_rgba(236,72,153,0.055)]">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-xl shadow-sm">🌱</div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black tracking-[0.16em] text-pink-400">FIRST MEMORY</p>
                <p className="mt-1 text-sm font-black">우리의 첫 성공 기록</p>
                <p className="mt-1 text-xs text-gray-400">{formatDate(firstSuccess.verification_date)}</p>
              </div>
            </div>
          </section>
        )}

        {message && (
          <div className="mt-5 rounded-2xl border border-red-100 bg-white px-4 py-3 text-center text-sm text-red-500 shadow-sm">
            {message}
          </div>
        )}

        <Link
          href="/us"
          prefetch={false}
          className="mt-6 block w-full rounded-2xl border border-pink-100 bg-white/80 px-4 py-3.5 text-center text-xs font-black text-gray-400"
        >
          우리 페이지로 돌아가기
        </Link>

        {searchOpen && (
          <div className="fixed inset-0 z-[140] flex items-end justify-center bg-black/45 px-4 pb-4 pt-12 backdrop-blur-[2px] sm:items-center sm:py-6" onClick={() => setSearchOpen(false)}>
            <div className="max-h-[82vh] w-full max-w-sm overflow-y-auto rounded-[32px] bg-[#fffafd] p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black tracking-[0.16em] text-pink-400">SEARCH</p>
                  <h2 className="mt-1 text-xl font-black">우리 기록 검색</h2>
                </div>
                <button type="button" onClick={() => setSearchOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-xl text-gray-400 shadow-sm">×</button>
              </div>

              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="약속, 인증 메시지, 추억을 검색해요"
                autoFocus
                className="mt-4 w-full rounded-2xl border border-pink-100 bg-white px-4 py-3.5 text-sm outline-none focus:border-pink-300"
              />

              <div className="mt-4 space-y-2">
                {searchQuery.trim() && searchResults.length === 0 && (
                  <div className="rounded-2xl bg-white p-5 text-center text-sm text-gray-400">검색 결과가 없어요.</div>
                )}

                {searchResults.map((result) => (
                  <button
                    type="button"
                    key={`${result.type}-${result.id}`}
                    onClick={() => {
                      if (result.type === "verification") {
                        const target = allRecentVerifications.find((item) => item.id === result.id);
                        if (target) setSelectedVerification(target);
                      }
                      if (result.type === "memory") {
                        const target = levelRewardMemories.find((item) => item.id === result.id);
                        if (target) setSelectedLevelRewardMemory(target);
                      }
                      setSearchOpen(false);
                    }}
                    className="w-full rounded-2xl border border-pink-100 bg-white p-4 text-left shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pink-50">
                        {result.type === "promise" ? "✅" : result.type === "verification" ? "📸" : "💕"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black">{result.title}</p>
                        <p className="mt-1 line-clamp-1 text-xs text-gray-400">{result.subtitle}</p>
                        <p className="mt-1 text-[10px] text-gray-300">{formatDate(result.date)}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {selectedLevelRewardMemory && (
          <div
            className="fixed inset-0 z-[130] flex items-center justify-center bg-black/70 px-4 py-6"
            onClick={() => {
              if (!editingLevelRewardMemory && !savingLevelRewardMemoryEdit) {
                setSelectedLevelRewardMemory(null);
              }
            }}
          >
            <div
              className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[34px] border border-pink-100 bg-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => {
                  if (editingLevelRewardMemory) {
                    cancelEditLevelRewardMemory();
                  } else if (!savingLevelRewardMemoryEdit) {
                    setSelectedLevelRewardMemory(null);
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
                    src={selectedLevelRewardMemory.photo_url}
                    alt={`${selectedLevelRewardMemory.reward_title} 추억 크게 보기`}
                    className="max-h-[58vh] w-full object-contain"
                  />
                </div>
              ) : (
                <div className="flex h-64 items-center justify-center bg-[#fff8fb] text-6xl">💕</div>
              )}

              <div className="p-6">
                <p className="text-xs font-black tracking-[0.18em] text-pink-400">OUR MEMORY</p>
                <p className="mt-2 text-sm font-black text-pink-500">
                  LV.{selectedLevelRewardMemory.unlock_level} · {selectedLevelRewardMemory.reward_title}
                </p>

                {selectedLevelRewardMemory.message && !editingLevelRewardMemory && (
                  <p className="mt-4 whitespace-pre-wrap text-base leading-7 text-gray-700">
                    {selectedLevelRewardMemory.message}
                  </p>
                )}

                {editingLevelRewardMemory ? (
                  <div className="mt-5">
                    <label className="text-sm font-semibold text-gray-700">사진 교체</label>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => setEditMemoryFile(e.target.files?.[0] ?? null)}
                      className="mt-2 block w-full rounded-2xl border border-pink-100 bg-[#fff8fb] px-4 py-3 text-sm text-gray-500"
                    />
                    <p className="mt-2 text-xs text-gray-400">새 사진을 선택하지 않으면 기존 사진이 유지돼요.</p>

                    <label className="mt-5 block text-sm font-semibold text-gray-700">한마디</label>
                    <textarea
                      value={editMemoryMessage}
                      onChange={(e) => setEditMemoryMessage(e.target.value)}
                      rows={4}
                      maxLength={300}
                      className="mt-2 w-full resize-none rounded-2xl border border-pink-100 bg-[#fff8fb] px-4 py-3 text-sm leading-6 outline-none focus:border-pink-300"
                    />
                    <p className="mt-1 text-right text-xs text-gray-400">{editMemoryMessage.length} / 300</p>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        disabled={savingLevelRewardMemoryEdit}
                        onClick={cancelEditLevelRewardMemory}
                        className="rounded-2xl border border-pink-100 bg-white px-4 py-4 text-sm font-semibold text-gray-500 disabled:opacity-50"
                      >
                        취소
                      </button>
                      <button
                        type="button"
                        disabled={savingLevelRewardMemoryEdit}
                        onClick={() => void saveLevelRewardMemoryEdit()}
                        className="rounded-2xl bg-pink-500 px-4 py-4 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        {savingLevelRewardMemoryEdit ? "저장 중..." : "저장하기"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="mt-4 text-sm text-gray-400">
                      {new Date(selectedLevelRewardMemory.created_at).toLocaleDateString("ko-KR")} 추억 ♡
                    </p>
                    <button
                      type="button"
                      onClick={startEditLevelRewardMemory}
                      className="mt-6 w-full rounded-2xl border border-pink-200 bg-white px-5 py-4 text-sm font-semibold text-pink-500"
                    >
                      ✏️ 추억 수정
                    </button>
                    <button
                      type="button"
                      disabled={deletingLevelRewardMemory}
                      onClick={() => void deleteLevelRewardMemory()}
                      className="mt-3 w-full rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-semibold text-red-500 disabled:opacity-50"
                    >
                      {deletingLevelRewardMemory ? "삭제 중..." : "🗑️ 추억 삭제"}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

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
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black tracking-[0.2em] text-pink-400">OUR MEMORY</p>
                  <h2 className="mt-2 text-2xl font-black">{selectedVerification.promise_title}</h2>
                  <p className="mt-2 text-sm text-gray-400">
                    {selectedVerification.nickname}님의 인증 · {formatDate(selectedVerification.verification_date)}
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
                  onClick={() => setIsPhotoExpanded(true)}
                  className="group mt-5 block w-full overflow-hidden rounded-3xl bg-gray-50 text-left"
                >
                  <div className="relative flex h-52 items-center justify-center overflow-hidden">
                    <img
                      src={selectedVerification.photo_url}
                      alt={`${selectedVerification.promise_title} 인증 사진`}
                      className="h-full w-full object-cover"
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
                  <p className="text-xs text-gray-400">남긴 이야기</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-600">
                    {selectedVerification.message}
                  </p>
                </div>
              )}

              <div className="mt-4 flex items-center justify-between rounded-2xl border border-pink-100 px-4 py-3">
                <span className="text-sm text-gray-500">인증 상태</span>
                <span className={`rounded-full px-3 py-2 text-xs font-semibold ${getStatusInfo(selectedVerification.status).className}`}>
                  {getStatusInfo(selectedVerification.status).emoji} {getStatusInfo(selectedVerification.status).label}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setFeaturedVerificationRecord(selectedVerification.id)}
                className={`mt-4 w-full rounded-2xl px-5 py-4 text-sm font-black ${
                  selectedVerification.id === featuredRecordId
                    ? "bg-pink-500 text-white"
                    : "border border-pink-100 bg-white text-pink-500"
                }`}
              >
                {selectedVerification.id === featuredRecordId ? "♥ 대표 기록으로 저장됨" : "♡ 대표 기록으로 남기기"}
              </button>
            </div>
          </div>
        )}

        {isPhotoExpanded && selectedVerification?.photo_url && (
          <div
            className="fixed inset-0 z-[170] flex items-center justify-center bg-black/90 p-4"
            onClick={() => setIsPhotoExpanded(false)}
          >
            <button
              type="button"
              onClick={() => setIsPhotoExpanded(false)}
              className="absolute right-5 top-5 flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-2xl text-white backdrop-blur-sm"
              aria-label="사진 크게 보기 닫기"
            >
              ×
            </button>
            <div className="flex max-h-[92vh] max-w-[96vw] items-center justify-center" onClick={(e) => e.stopPropagation()}>
              <img
                src={selectedVerification.photo_url}
                alt={`${selectedVerification.promise_title} 인증 사진 크게 보기`}
                className="max-h-[92vh] max-w-[96vw] rounded-2xl object-contain shadow-2xl"
              />
            </div>
          </div>
        )}

        <BottomNav />
      </div>
    </main>
  );
}
