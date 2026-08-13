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

type CharacterColor =
  | "original"
  | "gray"
  | "brown"
  | "black";

type Member = {
  user_id: string;
  character_color: CharacterColor | null;

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
  id: string;
  promise_id: string;
  user_id: string;

  status:
    | "pending"
    | "approved"
    | "rejected";

  rejection_reason: string | null;
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

type CharacterType =
  | "cat"
  | "dog";

type CoupleCharacter = {
  character_type: CharacterType | null;
  affection: number;
};

type CoinWallet = {
  coins: number;
  total_earned: number;
  total_spent: number;
};

type GrowthStage = {
  level: number;
  stage_name: string;
  description: string | null;
  scale: number;
  unlock_message: string | null;
};

type EquipmentRow = {
  id: string;
  couple_id: string;
  user_id: string;
  slot: string;
  item_id: string;
  equipped_at: string;
};

type EquippedStoreItem = {
  id: string;
  item_key: string;
  name: string;
  category: string;
  image_path: string | null;
};

type UserEquippedItem = {
  user_id: string;
  slot: string;
  item: EquippedStoreItem;
};

export default function CouplePage() {
  const supabase = useMemo(
    () => createClient(),
    []
  );

  const {
    user,
    loading: authLoading,
  } = useAuth();

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    couple,
    setCouple,
  ] = useState<CoupleInfo | null>(
    null
  );

  const [
    members,
    setMembers,
  ] = useState<Member[]>([]);

  const [
    promises,
    setPromises,
  ] = useState<PromiseItem[]>([]);

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

  const [
    character,
    setCharacter,
  ] =
    useState<CoupleCharacter | null>(
      null
    );

  const [
    wallet,
    setWallet,
  ] = useState<CoinWallet>({
    coins: 0,
    total_earned: 0,
    total_spent: 0,
  });

  const [
    growthStage,
    setGrowthStage,
  ] =
    useState<GrowthStage | null>(
      null
    );

  const [
    equippedItems,
    setEquippedItems,
  ] = useState<
    UserEquippedItem[]
  >([]);

  useEffect(() => {
    let cancelled = false;

    async function loadCouple() {
      if (authLoading) {
        return;
      }

      if (!user) {
        window.location.href =
          "/login";
        return;
      }

      setCurrentUserId(
        user.id
      );

      // =====================================
      // 내가 속한 커플
      // =====================================

      const {
        data: membership,
        error: membershipError,
      } = await supabase
        .from(
          "couple_members"
        )
        .select(
          "couple_id"
        )
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
          "커플 조회 오류:",
          membershipError
        );

        window.location.href =
          "/home";

        return;
      }

      const coupleId =
        membership.couple_id;

      // =====================================
      // 확인하지 않은 보상 알림
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
        .eq(
          "user_id",
          user.id
        )
        .eq(
          "seen",
          false
        )
        .order(
          "created_at",
          {
            ascending: true,
          }
        )
        .limit(1)
        .maybeSingle();

      if (cancelled) {
        return;
      }

      if (
        rewardNotificationError
      ) {
        console.error(
          "보상 알림 조회 오류:",
          rewardNotificationError
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
        .from(
          "couples"
        )
        .select(
          "level, xp"
        )
        .eq(
          "id",
          coupleId
        )
        .maybeSingle();

      if (cancelled) {
        return;
      }

      if (
        coupleError ||
        !coupleData
      ) {
        console.error(
          "커플 정보 조회 오류:",
          coupleError
        );

        setLoading(false);
        return;
      }

      // =====================================
      // 커플 캐릭터 종류
      // =====================================

      const {
        data: characterData,
        error: characterError,
      } = await supabase
        .from(
          "couple_characters"
        )
        .select(`
          character_type,
          affection
        `)
        .eq(
          "couple_id",
          coupleId
        )
        .maybeSingle();

      if (
        characterError
      ) {
        console.error(
          "캐릭터 조회 오류:",
          characterError
        );
      } else {
        setCharacter(
          characterData
            ? (characterData as CoupleCharacter)
            : null
        );
      }

      // =====================================
      // 내 코인
      // =====================================

      const {
        data: walletData,
        error: walletError,
      } = await supabase
        .from(
          "user_coin_wallets"
        )
        .select(`
          coins,
          total_earned,
          total_spent
        `)
        .eq(
          "couple_id",
          coupleId
        )
        .eq(
          "user_id",
          user.id
        )
        .maybeSingle();

      if (cancelled) {
        return;
      }

      if (
        walletError
      ) {
        console.error(
          "내 코인 지갑 조회 오류:",
          walletError
        );
      } else {
        setWallet(
          walletData
            ? (walletData as CoinWallet)
            : {
                coins: 0,
                total_earned: 0,
                total_spent: 0,
              }
        );
      }

      // =====================================
      // 성장 단계
      // =====================================

      const {
        data: growthData,
        error: growthError,
      } = await supabase
        .from(
          "character_growth_stages"
        )
        .select(`
          level,
          stage_name,
          description,
          scale,
          unlock_message
        `)
        .lte(
          "level",
          coupleData.level ?? 1
        )
        .order(
          "level",
          {
            ascending: false,
          }
        )
        .limit(1)
        .maybeSingle();

      if (cancelled) {
        return;
      }

      if (
        growthError
      ) {
        console.error(
          "캐릭터 성장 단계 조회 오류:",
          growthError
        );
      } else {
        setGrowthStage(
          growthData
            ? (growthData as GrowthStage)
            : null
        );
      }

      // =====================================
      // 커플 멤버 + 각자 캐릭터 색상
      // =====================================

      const {
        data: memberRows,
        error: memberError,
      } = await supabase
        .from(
          "couple_members"
        )
        .select(`
          user_id,
          character_color
        `)
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

      if (
        memberError
      ) {
        console.error(
          "멤버 조회 오류:",
          memberError
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
      // 프로필
      // =====================================

      const {
        data: profileRows,
        error: profileError,
      } =
        userIds.length > 0
          ? await supabase
              .from(
                "profiles"
              )
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

      if (
        profileError
      ) {
        console.error(
          "프로필 조회 오류:",
          profileError
        );

        setLoading(false);
        return;
      }

      const combinedMembers:
        Member[] =
        (
          memberRows ??
          []
        ).map(
          (member) => {
            const profile =
              profileRows?.find(
                (item) =>
                  item.id ===
                  member.user_id
              );

            return {
              user_id:
                member.user_id,

              character_color:
                (
                  member.character_color ??
                  null
                ) as CharacterColor | null,

              profiles: {
                nickname:
                  profile?.nickname ??
                  null,
              },
            };
          }
        );

      // =====================================
      // 착용 아이템
      // =====================================

      const {
        data: equipmentRows,
        error: equipmentError,
      } = await supabase
        .from(
          "character_equipment"
        )
        .select(`
          id,
          couple_id,
          user_id,
          slot,
          item_id,
          equipped_at
        `)
        .eq(
          "couple_id",
          coupleId
        );

      if (cancelled) {
        return;
      }

      if (
        equipmentError
      ) {
        console.error(
          "착용 아이템 조회 오류:",
          equipmentError
        );
      } else {
        const equipment =
          (
            equipmentRows ??
            []
          ) as EquipmentRow[];

        const itemIds =
          Array.from(
            new Set(
              equipment.map(
                (row) =>
                  row.item_id
              )
            )
          );

        if (
          itemIds.length >
          0
        ) {
          const {
            data:
              storeItemRows,
            error:
              storeItemError,
          } = await supabase
            .from(
              "store_items"
            )
            .select(`
              id,
              item_key,
              name,
              category,
              image_path
            `)
            .in(
              "id",
              itemIds
            );

          if (
            storeItemError
          ) {
            console.error(
              "착용 상품 조회 오류:",
              storeItemError
            );
          } else {
            const storeItems =
              (
                storeItemRows ??
                []
              ) as EquippedStoreItem[];

            const merged:
              UserEquippedItem[] =
              equipment
                .map(
                  (row) => {
                    const item =
                      storeItems.find(
                        (
                          storeItem
                        ) =>
                          storeItem.id ===
                          row.item_id
                      );

                    if (
                      !item
                    ) {
                      return null;
                    }

                    return {
                      user_id:
                        row.user_id,

                      slot:
                        row.slot,

                      item,
                    };
                  }
                )
                .filter(
                  (
                    row
                  ): row is UserEquippedItem =>
                    row !== null
                );

            setEquippedItems(
              merged
            );
          }
        } else {
          setEquippedItems(
            []
          );
        }
      }

      // =====================================
      // 해금된 보상 수
      // =====================================

      const {
        count: unlockedCount,
        error:
          rewardCountError,
      } = await supabase
        .from(
          "rewards"
        )
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

      if (
        cancelled
      ) {
        return;
      }

      if (
        rewardCountError
      ) {
        console.error(
          "보상 개수 조회 오류:",
          rewardCountError
        );
      }

      setUnlockedRewardCount(
        unlockedCount ??
          0
      );

      // =====================================
      // 상대방 인증 확인 대기
      // =====================================

      const {
        count: pendingCount,
        error:
          pendingCountError,
      } = await supabase
        .from(
          "verifications"
        )
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

      if (
        cancelled
      ) {
        return;
      }

      if (
        pendingCountError
      ) {
        console.error(
          "확인 대기 인증 조회 오류:",
          pendingCountError
        );
      }

      setPendingVerificationCount(
        pendingCount ??
          0
      );

      // =====================================
      // 최근 보상
      // =====================================

      const {
        data: recentRewardData,
        error: recentRewardError,
      } = await supabase
        .from(
          "rewards"
        )
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
          {
            ascending: false,
          }
        )
        .limit(1)
        .maybeSingle();

      if (
        cancelled
      ) {
        return;
      }

      if (
        recentRewardError
      ) {
        console.error(
          "최근 보상 조회 오류:",
          recentRewardError
        );
      } else {
        setRecentReward(
          recentRewardData
            ? (recentRewardData as unknown as RecentReward)
            : null
        );
      }

      // =====================================
      // 진행 중 약속
      // =====================================

      const {
        data: promiseRows,
        error: promiseError,
      } = await supabase
        .from(
          "promises"
        )
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
        .order(
          "created_at",
          {
            ascending: false,
          }
        );

      if (
        cancelled
      ) {
        return;
      }

      if (
        promiseError
      ) {
        console.error(
          "약속 조회 오류:",
          promiseError
        );

        setLoading(false);
        return;
      }

      // =====================================
      // 오늘 인증
      // =====================================

      const todayPromiseIds =
        (
          promiseRows ??
          []
        ).map(
          (promise) =>
            promise.id
        );

      let todayVerificationRows:
        TodayVerification[] = [];

      if (
        todayPromiseIds.length >
        0
      ) {
        const today =
          new Intl.DateTimeFormat(
            "en-CA",
            {
              timeZone:
                "Asia/Seoul",

              year:
                "numeric",

              month:
                "2-digit",

              day:
                "2-digit",
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
            id,
            promise_id,
            user_id,
            status,
            rejection_reason
          `)
          .in(
            "promise_id",
            todayPromiseIds
          )
          .eq(
            "verification_date",
            today
          );

        if (
          cancelled
        ) {
          return;
        }

        if (
          verificationError
        ) {
          console.error(
            "오늘 인증 조회 오류:",
            verificationError
          );
        } else {
          todayVerificationRows =
            (
              verificationRows ??
              []
            ) as TodayVerification[];
        }
      }

      // =====================================
      // 삭제 요청
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

      if (
        cancelled
      ) {
        return;
      }

      if (
        deleteRequestError
      ) {
        console.error(
          "삭제 요청 조회 오류:",
          deleteRequestError
        );

        setLoading(false);
        return;
      }

      setCouple(
        coupleData
      );

      setMembers(
        combinedMembers
      );

      setPromises(
        (
          promiseRows ??
          []
        ) as PromiseItem[]
      );

      setTodayVerifications(
        todayVerificationRows
      );

      setDeleteRequests(
        (
          deleteRequestRows ??
          []
        ) as DeleteRequest[]
      );

      setLoading(false);
    }

    void loadCouple();

    return () => {
      cancelled =
        true;
    };
  }, [
    supabase,
    user,
    authLoading,
  ]);

  // =========================================
  // 삭제 요청
  // =========================================

  async function requestDelete(
    promiseId: string,
    title: string
  ) {
    const confirmed =
      window.confirm(
        `"${title}" 약속의 삭제를 상대방에게 요청할까요?`
      );

    if (
      !confirmed
    ) {
      return;
    }

    setDeleteProcessing(
      promiseId
    );

    const {
      error,
    } = await supabase.rpc(
      "request_promise_delete",
      {
        p_promise_id:
          promiseId,
      }
    );

    setDeleteProcessing(
      null
    );

    if (
      error
    ) {
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

  async function approveDelete(
    requestId: string,
    promiseId: string
  ) {
    const confirmed =
      window.confirm(
        "이 약속을 삭제하는 데 동의할까요?\n\n앱에서는 더 이상 표시되지 않아요."
      );

    if (
      !confirmed
    ) {
      return;
    }

    setDeleteProcessing(
      promiseId
    );

    const {
      error,
    } = await supabase.rpc(
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

    if (
      error
    ) {
      alert(
        error.message
      );

      return;
    }

    setPromises(
      (
        current
      ) =>
        current.filter(
          (item) =>
            item.id !==
            promiseId
        )
    );

    setDeleteRequests(
      (
        current
      ) =>
        current.filter(
          (item) =>
            item.id !==
            requestId
        )
    );
  }

  async function rejectDelete(
    requestId: string
  ) {
    const {
      error,
    } = await supabase.rpc(
      "respond_promise_delete",
      {
        p_request_id:
          requestId,

        p_action:
          "reject",
      }
    );

    if (
      error
    ) {
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

  async function cancelDelete(
    requestId: string
  ) {
    const {
      error,
    } = await supabase.rpc(
      "cancel_promise_delete",
      {
        p_request_id:
          requestId,
      }
    );

    if (
      error
    ) {
      alert(
        error.message
      );

      return;
    }

    window.location.reload();
  }

  // =========================================
  // 보상 팝업 닫기
  // =========================================

  async function closeRewardNotification() {
    if (
      !rewardNotification
    ) {
      return;
    }

    const {
      error,
    } = await supabase
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
        rewardNotification.id
      );

    if (
      error
    ) {
      console.error(
        "보상 알림 확인 오류:",
        error
      );

      return;
    }

    setRewardNotification(
      null
    );
  }

  // =========================================
  // 아이템 이모지
  // =========================================

  function getItemEmoji(
    item:
      | EquippedStoreItem
      | undefined
  ) {
    if (
      !item
    ) {
      return null;
    }

    const emojiMap:
      Record<
        string,
        string
      > = {
      basic_hat:
        "🧢",

      straw_hat:
        "👒",

      beret:
        "🎨",

      ribbon_hat:
        "🎀",

      knight_helmet:
        "🪖",

      royal_crown:
        "👑",

      magic_hat:
        "🎩",

      party_hat:
        "🥳",

      couple_crown:
        "👑",

      hoodie:
        "🧥",

      pink_clothes:
        "👚",

      blue_clothes:
        "👕",

      couple_hoodie:
        "🧥",

      heart_necklace:
        "💗",

      necklace:
        "📿",

      ribbon_accessory:
        "🎀",
    };

    if (
      emojiMap[
        item.item_key
      ]
    ) {
      return emojiMap[
        item.item_key
      ];
    }

    if (
      item.category ===
      "hat"
    ) {
      return "🎩";
    }

    if (
      item.category ===
      "clothes"
    ) {
      return "👕";
    }

    if (
      item.category ===
      "accessory"
    ) {
      return "🎀";
    }

    if (
      item.category ===
      "couple"
    ) {
      return "💕";
    }

    return "✨";
  }

  // =========================================
  // 로딩
  // =========================================

  if (
    authLoading
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fff8fb]">
        <p className="text-sm text-gray-500">
          로그인 정보 확인 중...
        </p>
      </main>
    );
  }

  if (
    loading
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fff8fb]">
        <p className="text-sm text-gray-500">
          우리 공간 불러오는 중...
        </p>
      </main>
    );
  }

  // =========================================
  // 기본 표시값
  // =========================================

  const first =
    members[0]
      ?.profiles
      ?.nickname ??
    "나";

  const second =
    members[1]
      ?.profiles
      ?.nickname ??
    "파트너";

  const level =
    couple?.level ??
    1;

  const xp =
    couple?.xp ??
    0;

  const xpForNextLevel =
    100 +
    (
      level - 1
    ) * 50;

  const xpPercent =
    Math.min(
      (
        xp /
        xpForNextLevel
      ) * 100,
      100
    );

  const coins =
    wallet.coins;

  const growthName =
    growthStage
      ?.stage_name ??
    "아기";

  // =========================================
  // 현재 로그인한 사람의 캐릭터 선택 상태
  // =========================================

  const currentMember =
    members.find(
      (member) =>
        member.user_id ===
        currentUserId
    ) ??
    null;

  const hasSelectedMyColor =
    !!currentMember
      ?.character_color;

  const needsCharacterSetup =
    !character
      ?.character_type ||
    !hasSelectedMyColor;

  // =========================================
  // 캐릭터 자동 성장
  // =========================================

  const characterImageLevel =
    level <= 1
      ? 1
      : level === 2
      ? 2
      : level === 3
      ? 3
      : 4;

  function getCharacterImagePath(
    member:
      | Member
      | undefined
  ) {
    if (
      !member ||
      !character?.character_type ||
      !member.character_color
    ) {
      return null;
    }

    return `/characters/${character.character_type}/${member.character_color}/lv${characterImageLevel}.png`;
  }

  const characterDisplayWidth =
    characterImageLevel ===
    1
      ? 105
      : characterImageLevel ===
        2
      ? 116
      : characterImageLevel ===
        3
      ? 128
      : 140;

  // =========================================
  // 착용 아이템 찾기
  // =========================================

  function getUserItem(
    userId: string,
    slot: string
  ) {
    return equippedItems.find(
      (row) =>
        row.user_id ===
          userId &&
        row.slot ===
          slot
    )?.item;
  }

  // =========================================
  // 오늘 약속 완료 여부
  // =========================================

  const isPromiseCompletedToday = (
    promise: PromiseItem
  ) => {
    const promiseVerifications =
      todayVerifications.filter(
        (item) =>
          item.promise_id ===
          promise.id
      );

    if (
      promise.is_joint
    ) {
      return (
        members.length >
          0 &&
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

  const getMyVerification = (
    promiseId: string
  ) =>
    todayVerifications.find(
      (item) =>
        item.promise_id ===
          promiseId &&
        item.user_id ===
          currentUserId
    ) ??
    null;

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
    todayTotalCount >
    0
      ? Math.round(
          (
            todayCompletedCount /
            todayTotalCount
          ) * 100
        )
      : 0;

  const isTodayAllCompleted =
    todayTotalCount >
      0 &&
    todayCompletedCount ===
      todayTotalCount;

  // =========================================
  // 캐릭터 한 마리
  // =========================================

  function renderUserCharacter(
    member:
      | Member
      | undefined,
    index: number
  ) {
    if (
      !member
    ) {
      return (
        <div className="flex w-[46%] items-center justify-center">
          <span className="pointer-events-none text-4xl opacity-30">
            🐾
          </span>
        </div>
      );
    }

    const nickname =
      member.profiles
        ?.nickname ??
      (
        index === 0
          ? "나"
          : "파트너"
      );

    const hat =
      getUserItem(
        member.user_id,
        "hat"
      );

    const clothes =
      getUserItem(
        member.user_id,
        "clothes"
      );

    const accessory =
      getUserItem(
        member.user_id,
        "accessory"
      );

    const coupleItem =
      getUserItem(
        member.user_id,
        "couple"
      );

    const hatEmoji =
      getItemEmoji(
        hat
      );

    const clothesEmoji =
      getItemEmoji(
        clothes
      );

    const accessoryEmoji =
      getItemEmoji(
        accessory
      );

    const coupleEmoji =
      getItemEmoji(
        coupleItem
      );

    const isMe =
      member.user_id ===
      currentUserId;

    const characterImagePath =
      getCharacterImagePath(
        member
      );

    return (
      <div className="relative flex w-[46%] min-w-0 flex-col items-center">

        <div className="relative flex h-[145px] w-full items-end justify-center">

          {characterImagePath ? (
            <>

              <img
                src={
                  characterImagePath
                }
                alt={
                  character?.character_type ===
                  "cat"
                    ? "고양이 캐릭터"
                    : "강아지 캐릭터"
                }
                className="relative z-10 h-auto object-contain drop-shadow-sm"
                style={{
                  width:
                    `${characterDisplayWidth}px`,

                  maxHeight:
                    "135px",
                }}
              />

              {hatEmoji && (
                <div
                  className="pointer-events-none absolute left-1/2 top-1 z-30 -translate-x-1/2 drop-shadow-sm"
                  style={{
                    fontSize:
                      characterImageLevel ===
                      1
                        ? "24px"
                        : characterImageLevel ===
                          2
                        ? "28px"
                        : characterImageLevel ===
                          3
                        ? "31px"
                        : "34px",
                  }}
                >
                  {hatEmoji}
                </div>
              )}

              {clothesEmoji && (
                <div
                  className="pointer-events-none absolute bottom-0 left-1/2 z-30 -translate-x-1/2 drop-shadow-sm"
                  style={{
                    fontSize:
                      characterImageLevel ===
                      1
                        ? "22px"
                        : characterImageLevel ===
                          2
                        ? "25px"
                        : characterImageLevel ===
                          3
                        ? "28px"
                        : "31px",
                  }}
                >
                  {clothesEmoji}
                </div>
              )}

              {accessoryEmoji && (
                <div className="pointer-events-none absolute bottom-7 right-1 z-40 text-[22px]">
                  {accessoryEmoji}
                </div>
              )}

              {coupleEmoji && (
                <div className="pointer-events-none absolute right-1 top-6 z-40 text-[20px]">
                  {coupleEmoji}
                </div>
              )}

            </>
          ) : (

            <div
              aria-label="캐릭터 미선택"
              className="pointer-events-none absolute inset-x-2 bottom-1 top-2 flex select-none items-center justify-center rounded-[24px] border border-dashed border-pink-200 bg-white/60 text-4xl"
            >
              🐾
            </div>

          )}

        </div>

        <div className="mt-1 flex max-w-full items-center gap-1.5">

          <p className="truncate text-xs font-bold text-gray-700">
            {nickname}
          </p>

          {isMe && (
            <span className="shrink-0 rounded-full bg-pink-100 px-1.5 py-0.5 text-[8px] font-bold text-pink-500">
              ME
            </span>
          )}

        </div>

      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#fff8fb] px-5 py-8 text-[#2b2b2b]">

      <div className="mx-auto max-w-md pb-28">

        {/* =================================
            HEADER
        ================================= */}

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
            OUR LEVEL
        ================================= */}

        <section className="mt-7 overflow-hidden rounded-[30px] border border-pink-100 bg-gradient-to-br from-white to-pink-50/60 p-5 shadow-sm">

          <div className="flex items-start justify-between gap-3">

            <div>

              <p className="text-xs font-semibold tracking-[0.18em] text-pink-400">
                OUR LEVEL
              </p>

              <p className="mt-2 text-4xl font-bold tracking-tight">
                LV.{level}
              </p>

              <p className="mt-1 text-[10px] font-semibold text-pink-400">
                {growthName}
              </p>

            </div>

            <div className="flex items-center gap-2">

              <div className="rounded-2xl bg-white/90 px-3 py-2 text-center shadow-sm">

                <p className="text-[10px] text-gray-400">
                  내 코인
                </p>

                <p className="mt-0.5 text-sm font-bold text-amber-500">
                  🪙 {coins}개
                </p>

              </div>

              <Link
                href="/store"
                prefetch={false}
                className="flex h-[50px] items-center justify-center rounded-2xl bg-pink-500 px-3 text-[11px] font-bold text-white shadow-sm transition active:scale-[0.98]"
              >
                STORE
              </Link>

            </div>

          </div>

          {/* =================================
              두 캐릭터
          ================================= */}

          <div className="relative mt-4 overflow-hidden rounded-[26px] border border-pink-100 bg-gradient-to-b from-white/90 to-pink-50/70 px-3 pb-4 pt-3">

            <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 text-xl text-pink-300">
              ♡
            </div>

            <div className="flex items-end justify-center -space-x-3">

              {renderUserCharacter(
                members[0],
                0
              )}

              {renderUserCharacter(
                members[1],
                1
              )}

            </div>

            {/* =================================
                캐릭터 선택 버튼
            ================================= */}

            {needsCharacterSetup ? (

              <Link
                href="/character"
                prefetch={false}
                className="relative z-20 mt-3 block rounded-2xl bg-pink-500 px-4 py-3 text-center text-xs font-bold text-white"
              >

                {!character
                  ?.character_type
                  ? "우리 캐릭터 선택하기"
                  : "내 캐릭터 색상 선택하기"}

              </Link>

            ) : (

              <Link
                href="/store"
                prefetch={false}
                className="mt-2 block text-center text-[10px] font-semibold text-pink-400"
              >
                각자 원하는 아이템으로 캐릭터를 꾸며보세요 ♡
              </Link>

            )}

          </div>

          {/* =================================
              XP
          ================================= */}

          <div className="mt-4">

            <div className="flex items-end justify-between">

              <div>

                <p className="text-[10px] text-gray-400">
                  현재 XP
                </p>

                <p className="mt-1 text-xl font-bold text-pink-500">

                  {xp}

                  <span className="ml-1 text-xs font-semibold text-gray-300">
                    / {xpForNextLevel}
                  </span>

                </p>

              </div>

              <p className="text-xs font-semibold text-pink-500">

                다음 레벨까지{" "}

                {Math.max(
                  xpForNextLevel -
                    xp,
                  0
                )} XP

              </p>

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

          </div>

        </section>

        {/* =================================
            TODAY
        ================================= */}

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
              className="group rounded-[26px] border border-pink-100 bg-white p-5 shadow-sm"
            >

              <div className="flex items-center justify-between">

                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-pink-50 text-lg">
                  📖
                </div>

                <span className="text-lg text-pink-200">
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

          {pendingVerificationCount >
            0 && (

            <Link
              href="/verifications"
              prefetch={false}
              className="mt-3 flex items-center justify-between rounded-[26px] border border-pink-100 bg-white p-4 shadow-sm"
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

              <span className="shrink-0 rounded-full bg-pink-500 px-3 py-2 text-[11px] font-semibold text-white">
                확인하기
              </span>

            </Link>

          )}

          {recentReward && (

            <Link
              href="/rewards"
              prefetch={false}
              className="mt-3 flex items-center justify-between rounded-[26px] border border-pink-100 bg-white p-4 shadow-sm"
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

                    {recentReward.promises
                      ?.title ??
                      "약속"}{" "}

                    ·{" "}

                    {recentReward.required_days}
                    일 달성

                  </p>

                </div>

              </div>

              <span className="text-lg text-pink-200">
                ›
              </span>

            </Link>

          )}

        </section>

        {/* =================================
            TODAY QUEST
        ================================= */}

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
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-pink-500 text-2xl text-white shadow-sm"
            >
              +
            </Link>

          </div>

          {promises.length >
            0 && (

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
                  {todayProgressPercent}%
                </p>

              </div>

              <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-pink-50">

                <div
                  className="h-full rounded-full bg-pink-500 transition-all"
                  style={{
                    width:
                      `${todayProgressPercent}%`,
                  }}
                />

              </div>

            </div>

          )}

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
                className="mt-6 block rounded-2xl bg-pink-500 px-5 py-4 font-semibold text-white"
              >
                첫 약속 만들기
              </Link>

            </div>

          ) : (

            <div className="mt-5 space-y-4">

              {/* 미완료 */}

              <section className="overflow-hidden rounded-[26px] border border-pink-100 bg-white shadow-sm">

                <button
                  type="button"
                  onClick={() =>
                    setShowIncompletePromises(
                      (prev) =>
                        !prev
                    )
                  }
                  className="flex w-full items-center justify-between px-5 py-4"
                >

                  <div className="flex items-center gap-3">

                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-pink-50">
                      ⏳
                    </div>

                    <div className="text-left">

                      <p className="font-bold">
                        오늘 미완료
                      </p>

                      <p className="text-[11px] text-gray-400">
                        아직 끝나지 않은 약속 {incompletePromises.length}개
                      </p>

                    </div>

                  </div>

                  <span
                    className={`transition ${
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

                    {incompletePromises.length ===
                    0 ? (

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

                            const myVerification =
                              getMyVerification(
                                promise.id
                              );

                            const isMyRejected =
                              myVerification?.status ===
                              "rejected";

                            const isMyPending =
                              myVerification?.status ===
                              "pending";

                            const isMyApproved =
                              myVerification?.status ===
                              "approved";

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

                                  <div className="mt-4 rounded-2xl bg-[#fff8fb] px-4 py-3">

                                    <p className="text-xs font-medium text-gray-500">

                                      🔥 현재 {promise.current_streak}일

                                      <span className="mx-2 text-pink-200">
                                        ·
                                      </span>

                                      🏆 최고 {promise.best_streak}일

                                      <span className="mx-2 text-pink-200">
                                        ·
                                      </span>

                                      ✓ 성공 {promise.total_success}일

                                    </p>

                                  </div>

                                  {promise.is_joint && (

                                    <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-2xl bg-pink-50/60 px-3.5 py-2.5 text-[11px]">

                                      <span className="font-semibold text-pink-500">
                                        💕 오늘
                                      </span>

                                      {jointMemberStatuses.map(
                                        (
                                          memberStatus
                                        ) => {

                                          const statusLabel =
                                            memberStatus.status ===
                                            "approved"
                                              ? "✅"
                                              : memberStatus.status ===
                                                "pending"
                                              ? "🕒"
                                              : memberStatus.status ===
                                                "rejected"
                                              ? "↻"
                                              : "⏳";

                                          const statusClass =
                                            memberStatus.status ===
                                            "approved"
                                              ? "text-green-600"
                                              : memberStatus.status ===
                                                "pending"
                                              ? "text-amber-600"
                                              : memberStatus.status ===
                                                "rejected"
                                              ? "text-red-500"
                                              : "text-gray-400";

                                          return (

                                            <span
                                              key={
                                                memberStatus.userId
                                              }
                                              className={`font-semibold ${statusClass}`}
                                            >

                                              {memberStatus.nickname}{" "}
                                              {statusLabel}

                                            </span>

                                          );
                                        }
                                      )}

                                    </div>

                                  )}

                                  {isMyRejected && (

                                    <div className="mt-4 rounded-[22px] border border-red-100 bg-red-50/70 p-4">

                                      <p className="font-bold text-red-500">
                                        ↻ 인증이 반려되었어요
                                      </p>

                                      <p className="mt-2 text-sm leading-6 text-red-400">

                                        {myVerification.rejection_reason?.trim()
                                          ? myVerification.rejection_reason
                                          : "상대방이 반려 이유를 남기지 않았어요."}

                                      </p>

                                    </div>

                                  )}

                                </div>

                                <div className="border-t border-pink-50 bg-[#fffdfd] px-5 py-4">

                                  {isMyRejected ? (

                                    <Link
                                      href={`/verify/${promise.id}`}
                                      prefetch={false}
                                      className="block w-full rounded-2xl bg-red-500 px-4 py-3.5 text-center font-semibold text-white"
                                    >
                                      ↻ 다시 인증하기
                                    </Link>

                                  ) : isMyPending ? (

                                    <div className="w-full rounded-2xl bg-amber-50 px-4 py-3.5 text-center font-semibold text-amber-600">
                                      🕒 상대방 확인 대기 중
                                    </div>

                                  ) : isMyApproved ? (

                                    <div className="w-full rounded-2xl bg-green-50 px-4 py-3.5 text-center font-semibold text-green-600">
                                      ✓ 오늘 인증 완료
                                    </div>

                                  ) : (

                                    <Link
                                      href={`/verify/${promise.id}`}
                                      prefetch={false}
                                      className="block w-full rounded-2xl bg-pink-500 px-4 py-3.5 text-center font-semibold text-white"
                                    >
                                      📸 오늘 인증하기
                                    </Link>

                                  )}

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
                                      className="mt-3 w-full px-4 py-3 text-sm font-semibold text-gray-400 disabled:opacity-50"
                                    >
                                      약속 삭제 협의하기
                                    </button>

                                  )}

                                  {deleteRequest &&
                                    deleteRequest.requested_by ===
                                      currentUserId && (

                                      <div className="mt-4 rounded-2xl bg-yellow-50 p-4">

                                        <p className="font-semibold text-yellow-700">
                                          🕒 삭제 협의 중
                                        </p>

                                        <p className="mt-1 text-sm text-yellow-600">
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

                                  {deleteRequest &&
                                    deleteRequest.requested_by !==
                                      currentUserId && (

                                      <div className="mt-4 rounded-2xl bg-[#fff8fb] p-4">

                                        <p className="font-semibold">
                                          💌 삭제 협의 요청
                                        </p>

                                        <div className="mt-4 grid grid-cols-2 gap-3">

                                          <button
                                            type="button"
                                            onClick={() =>
                                              rejectDelete(
                                                deleteRequest.id
                                              )
                                            }
                                            className="rounded-xl border border-pink-100 bg-white px-3 py-3 text-sm"
                                          >
                                            계속 지키기
                                          </button>

                                          <button
                                            type="button"
                                            onClick={() =>
                                              approveDelete(
                                                deleteRequest.id,
                                                promise.id
                                              )
                                            }
                                            className="rounded-xl bg-pink-500 px-3 py-3 text-sm text-white"
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

              {/* 완료 */}

              <section className="overflow-hidden rounded-[26px] border border-pink-100 bg-white shadow-sm">

                <button
                  type="button"
                  onClick={() =>
                    setShowCompletedPromises(
                      (prev) =>
                        !prev
                    )
                  }
                  className="flex w-full items-center justify-between px-5 py-4"
                >

                  <div className="flex items-center gap-3">

                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-green-50">
                      ✅
                    </div>

                    <div className="text-left">

                      <p className="font-bold">
                        오늘 완료
                      </p>

                      <p className="text-[11px] text-gray-400">
                        오늘 끝낸 약속 {completedPromises.length}개
                      </p>

                    </div>

                  </div>

                  <span
                    className={`transition ${
                      showCompletedPromises
                        ? "rotate-180"
                        : ""
                    }`}
                  >
                    ⌄
                  </span>

                </button>

                {showCompletedPromises && (

                  <div className="border-t border-pink-50 p-3">

                    {completedPromises.length ===
                    0 ? (

                      <p className="py-5 text-center text-sm text-gray-400">
                        아직 완료한 약속이 없어요.
                      </p>

                    ) : (

                      completedPromises.map(
                        (promise) => (

                          <div
                            key={
                              promise.id
                            }
                            className="mb-2 flex items-center gap-3 rounded-2xl bg-white px-4 py-3"
                          >

                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-50">
                              ✓
                            </div>

                            <div>

                              <p className="font-bold">
                                {promise.title}
                              </p>

                              <p className="text-[10px] text-pink-500">
                                🔥 {promise.current_streak}일
                              </p>

                            </div>

                          </div>

                        )
                      )

                    )}

                  </div>

                )}

              </section>

            </div>

          )}

        </section>

        {/* =================================
            STATS
        ================================= */}

        <section className="mt-6">

          <div className="mb-3">

            <p className="text-xs font-semibold tracking-[0.18em] text-pink-400">
              OUR STATS
            </p>

            <h2 className="mt-1 text-lg font-bold">
              우리 기록 요약
            </h2>

          </div>

          <div className="grid grid-cols-2 gap-3">

            <div className="rounded-[26px] border border-pink-100 bg-white p-5 shadow-sm">

              <div className="text-xl">
                🔥
              </div>

              <p className="mt-4 text-xs text-gray-400">
                진행 중인 약속
              </p>

              <p className="mt-1 text-3xl font-bold">

                {promises.length}

                <span className="ml-1 text-sm text-gray-400">
                  개
                </span>

              </p>

            </div>

            <div className="rounded-[26px] border border-pink-100 bg-white p-5 shadow-sm">

              <div className="text-xl">
                🎁
              </div>

              <p className="mt-4 text-xs text-gray-400">
                해금한 보상
              </p>

              <p className="mt-1 text-3xl font-bold">

                {unlockedRewardCount}

                <span className="ml-1 text-sm text-gray-400">
                  개
                </span>

              </p>

            </div>

          </div>

        </section>

        <BottomNav />

      </div>

      {/* =================================
          보상 팝업
      ================================= */}

      {rewardNotification && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-5">

          <div className="w-full max-w-sm rounded-[34px] bg-white p-6 text-center shadow-2xl">

            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[26px] bg-pink-50 text-5xl">
              🎁
            </div>

            <p className="mt-5 text-xs font-bold tracking-[0.22em] text-pink-400">
              REWARD UNLOCKED
            </p>

            <h2 className="mt-3 text-2xl font-bold">

              🔥{" "}

              {rewardNotification.rewards
                ?.required_days ??
                0}

              일 달성!

            </h2>

            <p className="mt-2 text-sm text-gray-400">

              {rewardNotification.promises
                ?.title ??
                "약속"}

            </p>

            <div className="mt-6 rounded-[24px] bg-[#fff8fb] p-5">

              <p className="text-[11px] text-pink-400">
                NEW REWARD
              </p>

              <p className="mt-2 text-xl font-bold text-pink-500">

                {rewardNotification.rewards
                  ?.title ??
                  "새로운 보상"}

              </p>

            </div>

            <Link
              href="/rewards"
              prefetch={false}
              onClick={() =>
                void closeRewardNotification()
              }
              className="mt-6 block rounded-2xl bg-pink-500 px-5 py-4 font-semibold text-white"
            >
              🎁 보상 보러가기
            </Link>

            <button
              type="button"
              onClick={() =>
                void closeRewardNotification()
              }
              className="mt-3 w-full px-5 py-3 text-sm font-semibold text-gray-400"
            >
              확인했어요
            </button>

          </div>

        </div>

      )}

    </main>
  );
}
