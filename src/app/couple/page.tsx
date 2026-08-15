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
  | "dog"
  | "cat"
  | "penguin"
  | "red_panda";

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

type ItemPosition = {
  user_id: string;
  item_id: string;
  animal: CharacterType;
  stage: "baby" | "child" | "teen" | "adult";
  x: number;
  y: number;
  scale: number;
  rotation: number;
};


type LevelUpInfo = {
  previousLevel: number;
  level: number;
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
  ] = useState<UserEquippedItem[]>([]);

  const [
    itemPositions,
    setItemPositions,
  ] = useState<ItemPosition[]>([]);

  const [
    showCoinInfo,
    setShowCoinInfo,
  ] = useState(false);

  const [
    levelUpInfo,
    setLevelUpInfo,
  ] = useState<LevelUpInfo | null>(null);

  const [
    coinGain,
    setCoinGain,
  ] = useState<number | null>(null);

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
      // 착용 아이템 + 아이템 PNG + 저장 위치
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

      if (
        cancelled
      ) {
        return;
      }

      if (
        equipmentError
      ) {
        console.error(
          "착용 아이템 조회 오류:",
          equipmentError
        );

        setEquippedItems([]);
        setItemPositions([]);
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

        let storeItems:
          EquippedStoreItem[] = [];

        if (
          itemIds.length > 0
        ) {
          const {
            data: storeItemRows,
            error: storeItemError,
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
            storeItems =
              (
                storeItemRows ??
                []
              ) as EquippedStoreItem[];
          }

          const {
            data: positionRows,
            error: positionError,
          } = await supabase
            .from(
              "character_item_positions"
            )
            .select(`
              user_id,
              item_id,
              animal,
              stage,
              x,
              y,
              scale,
              rotation
            `)
            .eq(
              "couple_id",
              coupleId
            )
            .in(
              "item_id",
              itemIds
            );

          if (
            positionError
          ) {
            console.error(
              "아이템 위치 조회 오류:",
              positionError
            );

            setItemPositions([]);
          } else {
            setItemPositions(
              (
                positionRows ??
                []
              ).map(
                (row: any) => ({
                  user_id:
                    row.user_id,
                  item_id:
                    row.item_id,
                  animal:
                    row.animal as CharacterType,
                  stage:
                    row.stage as
                      | "baby"
                      | "child"
                      | "teen"
                      | "adult",
                  x:
                    Number(row.x),
                  y:
                    Number(row.y),
                  scale:
                    Number(row.scale),
                  rotation:
                    Number(row.rotation),
                })
              )
            );
          }
        } else {
          setItemPositions([]);
        }

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
  // 레벨업 / 코인 변화 연출
  // =========================================

  useEffect(() => {
    if (
      loading ||
      !user ||
      !couple
    ) {
      return;
    }

    const key =
      `ourquest:last-level:${user.id}`;

    const saved =
      window.localStorage.getItem(key);

    if (saved !== null) {
      const previousLevel =
        Number(saved);

      if (
        Number.isFinite(previousLevel) &&
        couple.level > previousLevel
      ) {
        setLevelUpInfo({
          previousLevel,
          level: couple.level,
        });
      }
    }

    window.localStorage.setItem(
      key,
      String(couple.level)
    );
  }, [
    loading,
    user,
    couple,
  ]);

  useEffect(() => {
    if (
      loading ||
      !user
    ) {
      return;
    }

    const key =
      `ourquest:last-coins:${user.id}`;

    const saved =
      window.localStorage.getItem(key);

    if (saved !== null) {
      const previousCoins =
        Number(saved);

      if (
        Number.isFinite(previousCoins) &&
        wallet.coins > previousCoins
      ) {
        const gained =
          wallet.coins - previousCoins;

        setCoinGain(gained);

        const timer =
          window.setTimeout(
            () =>
              setCoinGain(null),
            2400
          );

        window.localStorage.setItem(
          key,
          String(wallet.coins)
        );

        return () =>
          window.clearTimeout(timer);
      }
    }

    window.localStorage.setItem(
      key,
      String(wallet.coins)
    );
  }, [
    loading,
    user,
    wallet.coins,
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
  // 로딩
  // =========================================

  if (
    authLoading
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#fffafd] to-[#faf8ff]">
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
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#fffafd] to-[#faf8ff]">
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

  // 캐릭터 성장 단계는 2레벨마다 변경
  const growthName =
    level <= 2
      ? "아기"
      : level <= 4
      ? "꼬마"
      : level <= 6
      ? "청년"
      : "성년";

  // =========================================
  // 현재 로그인한 사람의 캐릭터 선택 상태
  // =========================================
  const needsCharacterSetup =
    !character?.character_type;

  // =========================================
  // 캐릭터 자동 성장
  // =========================================

  const characterImageLevel =
    level <= 2
      ? 1
      : level <= 4
      ? 2
      : level <= 6
      ? 3
      : 4;

  function getCharacterImagePath(
    member:
      | Member
      | undefined
  ) {
    if (
      !member ||
      !character?.character_type
    ) {
      return null;
    }

    const stage =
      characterImageLevel === 1
        ? "baby"
        : characterImageLevel === 2
        ? "child"
        : characterImageLevel === 3
        ? "teen"
        : "adult";

    const animalFolder =
      character.character_type === "red_panda"
        ? "red-panda"
        : character.character_type;

    return `/characters/${animalFolder}/${stage}.png`;
  }


  const characterDisplayWidth =
    characterImageLevel ===
    1
      ? 126
      : characterImageLevel ===
        2
      ? 138
      : characterImageLevel ===
        3
      ? 150
      : 162;



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

  function getItemPosition(
    userId: string,
    itemId: string
  ) {
    if (
      !character?.character_type
    ) {
      return null;
    }

    const stage =
      characterImageLevel === 1
        ? "baby"
        : characterImageLevel === 2
        ? "child"
        : characterImageLevel === 3
        ? "teen"
        : "adult";

    return (
      itemPositions.find(
        (row) =>
          row.user_id ===
            userId &&
          row.item_id ===
            itemId &&
          row.animal ===
            character.character_type &&
          row.stage ===
            stage
      ) ??
      null
    );
  }

  function getItemImageSrc(
    item:
      | EquippedStoreItem
      | undefined
  ) {
    const path =
      item?.image_path?.trim();

    if (!path) {
      return null;
    }

    if (
      path.startsWith("/") ||
      path.startsWith("http://") ||
      path.startsWith("https://")
    ) {
      return path;
    }

    return `/${path}`;
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
  // 새 홈 디자인 표시값
  // =========================================

  const currentStreak =
    promises.reduce(
      (max, promise) =>
        Math.max(
          max,
          promise.current_streak ?? 0
        ),
      0
    );

  const affection =
    Math.max(
      0,
      Math.min(
        100,
        character?.affection ?? 0
      )
    );

  function getDisplayedCoinReward(
    streak: number
  ) {
    if (streak <= 0) return 1;
    if (streak === 1) return 1;
    if (streak <= 3) return 2;
    if (streak <= 5) return 3;
    if (streak === 6) return 4;
    if (streak === 7) return 5;
    if (streak <= 13) return 5;
    if (streak === 14) return 8;
    if (streak <= 29) return 6;
    if (streak === 30) return 15;
    return 6;
  }

  const todayCoinReward =
    getDisplayedCoinReward(
      Math.max(
        currentStreak,
        1
      )
    );

  const nextCoinReward =
    getDisplayedCoinReward(
      Math.max(
        currentStreak + 1,
        1
      )
    );


  const nextGrowthName =
    level < 3
      ? "꼬마"
      : level < 5
      ? "청년"
      : level < 7
      ? "성년"
      : "최고 단계";

  const characterMessage =
    isTodayAllCompleted
      ? "오늘 퀘스트 COMPLETE ♡"
      : pendingVerificationCount > 0
      ? "상대방의 인증이 기다리고 있어요 💌"
      : currentStreak >= 7
      ? `벌써 ${currentStreak}일 연속! 정말 멋져요 🔥`
      : todayTotalCount === 0
      ? "우리만의 첫 약속을 만들어볼까요? 🌱"
      : todayCompletedCount > 0
      ? "좋아요! 오늘도 조금씩 채워가요 ♡"
      : "오늘도 둘이 같이 시작해볼까요? ✨";

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
    const isMe =
      member.user_id ===
      currentUserId;

    const characterImagePath =
      getCharacterImagePath(
        member
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

    return (
      <div className="relative flex w-[46%] min-w-0 flex-col items-center">

        <div className="relative flex h-[188px] w-full items-end justify-center">

          {characterImagePath ? (
            <div
              className="relative z-10 shrink-0"
              style={{
                width: `${characterDisplayWidth}px`,
              }}
            >
              <img
                src={characterImagePath}
                alt={
                  character?.character_type === "dog"
                    ? "강아지 캐릭터"
                    : character?.character_type === "cat"
                    ? "고양이 캐릭터"
                    : character?.character_type === "penguin"
                    ? "펭귄 캐릭터"
                    : "레서판다 캐릭터"
                }
                className="block h-auto w-full object-contain drop-shadow-sm"
                style={{
                  maxHeight: "178px",
                }}
              />

              {[
                {
                  slot: "hat",
                  item: hat,
                  zIndex: 40,
                },
                {
                  slot: "clothes",
                  item: clothes,
                  zIndex: 30,
                },
                {
                  slot: "accessory",
                  item: accessory,
                  zIndex: 50,
                },
              ].map(
                ({
                  slot,
                  item,
                  zIndex,
                }) => {
                  if (!item) {
                    return null;
                  }

                  const imageSrc =
                    getItemImageSrc(
                      item
                    );

                  if (
                    !imageSrc
                  ) {
                    return null;
                  }

                  const savedPosition =
                    getItemPosition(
                      member.user_id,
                      item.id
                    );

                  const fallback =
                    slot === "hat"
                      ? {
                          x: 50,
                          y: 5,
                          scale: 78,
                          rotation: 0,
                        }
                      : slot === "clothes"
                      ? {
                          x: 50,
                          y: 58,
                          scale: 78,
                          rotation: 0,
                        }
                      : {
                          x: 50,
                          y: 48,
                          scale: 42,
                          rotation: 0,
                        };

                  const fit =
                    savedPosition ??
                    fallback;

                  return (
                    <img
                      key={`${member.user_id}-${slot}`}
                      src={imageSrc}
                      alt=""
                      aria-hidden="true"
                      className="pointer-events-none absolute object-contain"
                      style={{
                        left:
                          `${fit.x}%`,
                        top:
                          `${fit.y}%`,
                        width:
                          `${fit.scale}%`,
                        transform: `
                          translate(-50%, -50%)
                          rotate(${fit.rotation}deg)
                        `,
                        transformOrigin:
                          "center center",
                        zIndex,
                      }}
                    />
                  );
                }
              )}
            </div>
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
    <main className="min-h-screen bg-[linear-gradient(180deg,#fffafd_0%,#fff8fb_55%,#faf8ff_100%)] px-4 pb-8 pt-6 text-[#202331] sm:px-5">

      <div className="mx-auto w-full max-w-[430px] pb-[calc(7rem+env(safe-area-inset-bottom))]">

        {/* =================================
            OURQUEST HERO
            캐릭터 배경은 추후 상점 background 슬롯과 연결 가능
        ================================= */}

        <header className="flex items-center justify-between gap-4 px-1">
          <div className="min-w-0">
            <p className="text-[11px] font-black tracking-[0.24em] text-pink-500">
              OURQUEST
            </p>

            <h1 className="mt-2 truncate text-[27px] font-black tracking-[-0.03em] text-slate-900">
              {first}{" "}
              <span className="text-pink-400">♡</span>{" "}
              {second}
            </h1>

            <p className="mt-1 text-[12px] font-medium text-slate-400">
              우리만의 하루를 더 특별하게 ✨
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setShowCoinInfo(true)
            }
            className="flex shrink-0 items-center gap-2 rounded-[20px] border border-amber-100 bg-white/95 px-3 py-2.5 shadow-[0_8px_24px_rgba(245,158,11,0.12)] transition active:scale-[0.97]"
          >
            <img
              src="/images/coin.PNG"
              alt="코인"
              className="h-7 w-7 object-contain"
            />

            <span className="text-base font-black text-slate-800">
              {coins}
            </span>
          </button>
        </header>

        <section
          className="relative mt-5 overflow-hidden rounded-[32px] border border-violet-200/50 px-3 pb-3 pt-3 shadow-[0_18px_40px_rgba(108,92,231,0.14)]"
          style={{
            background:
              "linear-gradient(180deg, #766fe2 0%, #9d8bea 48%, #e8afd3 100%)",
          }}
        >
          <div className="pointer-events-none absolute inset-0 opacity-70">
            <div className="absolute left-[11%] top-[18%] h-1.5 w-1.5 rounded-full bg-white/80" />
            <div className="absolute right-[13%] top-[24%] h-1 w-1 rounded-full bg-white" />
            <div className="absolute left-[46%] top-[9%] h-1 w-1 rounded-full bg-white/70" />
            <div className="absolute right-[31%] top-[13%] text-[12px] text-white/70">✦</div>
            <div className="absolute left-[20%] top-[35%] text-[9px] text-white/60">✦</div>
          </div>

          <div className="relative z-20 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-gradient-to-r from-pink-500 to-fuchsia-500 px-3 py-1.5 text-[11px] font-black text-white shadow-sm">
                LV.{level}
              </span>

              <span className="rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-black text-violet-500 shadow-sm backdrop-blur">
                {growthName}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/inventory"
                prefetch={false}
                className="flex h-9 items-center justify-center rounded-2xl bg-white/92 px-3 text-[11px] font-black text-pink-500 shadow-sm backdrop-blur transition active:scale-[0.97]"
              >
                👕 옷장
              </Link>

              <Link
                href="/store"
                prefetch={false}
                className="flex h-9 items-center justify-center rounded-2xl bg-white/92 px-3 text-[11px] font-black text-pink-500 shadow-sm backdrop-blur transition active:scale-[0.97]"
              >
                🛍️ 상점
              </Link>
            </div>
          </div>

          <div className="relative z-10 mt-1 overflow-hidden rounded-[26px] bg-gradient-to-b from-white/5 to-violet-950/10 px-1 pb-2 pt-2">
            <div className="pointer-events-none absolute inset-x-[-15%] bottom-[-54px] h-[120px] rounded-[50%] bg-[#7666cc]/65" />
            <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 text-3xl text-pink-100 drop-shadow-[0_0_12px_rgba(255,255,255,0.9)]">
              ♡
            </div>

            <div className="relative z-10 flex items-end justify-center -space-x-4">
              {renderUserCharacter(
                members[0],
                0
              )}

              {renderUserCharacter(
                members[1],
                1
              )}
            </div>

            {!needsCharacterSetup && (
              <div className="relative z-20 mx-auto mt-1 w-fit max-w-[92%] rounded-full bg-white/18 px-3 py-1.5 text-center text-[10px] font-bold text-white backdrop-blur-sm">
                {characterMessage}
              </div>
            )}
          </div>

          {needsCharacterSetup && (
            <Link
              href="/character"
              prefetch={false}
              className="relative z-20 mt-2 block rounded-2xl bg-white/95 px-4 py-3 text-center text-xs font-black text-pink-500 shadow-sm"
            >
              우리 캐릭터 선택하기
            </Link>
          )}

          <div className="relative z-20 mt-3 grid grid-cols-2 gap-2.5">
            <div className="rounded-[22px] border border-white/70 bg-white/92 p-3.5 shadow-[0_8px_20px_rgba(190,24,93,0.08)] backdrop-blur">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-pink-100 text-base">
                    💗
                  </span>

                  <p className="text-[11px] font-black text-pink-500">
                    애정도
                  </p>
                </div>

                <span className="text-sm font-black text-pink-500">
                  {affection}%
                </span>
              </div>

              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-pink-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-pink-300 via-pink-400 to-fuchsia-500 transition-all"
                  style={{
                    width: `${affection}%`,
                  }}
                />
              </div>

              <p className="mt-2 text-[10px] font-semibold text-slate-400">
                💕 우리 애정도
              </p>
            </div>

            <div className="rounded-[22px] border border-amber-100 bg-[#fffdf4]/95 p-3.5 shadow-[0_8px_20px_rgba(245,158,11,0.08)] backdrop-blur">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-base">
                    ⭐
                  </span>

                  <p className="text-[11px] font-black text-amber-600">
                    레벨 XP
                  </p>
                </div>

                <span className="text-xs font-black text-slate-700">
                  {xp}/{xpForNextLevel}
                </span>
              </div>

              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-amber-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-300 to-orange-400 transition-all"
                  style={{
                    width: `${xpPercent}%`,
                  }}
                />
              </div>

              <p className="mt-2 text-[10px] font-semibold text-slate-400">
                {nextGrowthName === "최고 단계"
                  ? "최고 성장 단계예요 ✨"
                  : `다음 성장: ${nextGrowthName} · ${Math.max(
                      xpForNextLevel - xp,
                      0
                    )} XP`}
              </p>
            </div>
          </div>
        </section>

        {/* =================================
            TODAY SUMMARY
        ================================= */}

        <section className="mt-6">
          <div className="mb-3 flex items-end justify-between px-1">
            <div>
              <p className="text-[11px] font-black tracking-[0.2em] text-pink-500">
                TODAY
              </p>

              <h2 className="mt-1 text-[22px] font-black tracking-[-0.02em] text-slate-900">
                오늘의 우리
              </h2>
            </div>

            <span className="rounded-full border border-slate-100 bg-white px-3 py-1.5 text-[10px] font-bold text-slate-400 shadow-sm">
              {todayCompletedCount}/{todayTotalCount} 완료
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-[26px] border border-pink-100 bg-gradient-to-br from-[#fff6f9] to-[#fffdf6] p-4 shadow-[0_10px_28px_rgba(244,114,182,0.10)]">
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-xl shadow-sm">
                  🔥
                </div>

                <span className="rounded-full bg-white/80 px-2.5 py-1 text-[9px] font-black text-pink-500 shadow-sm">
                  STREAK
                </span>
              </div>

              <p className="mt-4 text-[11px] font-semibold text-slate-400">
                연속 인증
              </p>

              <p className="mt-1 text-3xl font-black text-slate-900">
                {currentStreak}
                <span className="ml-1 text-sm font-bold text-slate-400">
                  일
                </span>
              </p>

              <div className="mt-3 flex items-center gap-1.5 rounded-2xl bg-amber-50/90 px-3 py-2">
                <img
                  src="/images/coin.PNG"
                  alt=""
                  aria-hidden="true"
                  className="h-5 w-5 object-contain"
                />

                <p className="text-[11px] font-black text-amber-600">
                  오늘 예상 +{todayCoinReward}
                </p>
              </div>
            </div>

            <div className="rounded-[26px] border border-emerald-100 bg-gradient-to-br from-[#f6fff9] to-[#fbfffd] p-4 shadow-[0_10px_28px_rgba(16,185,129,0.08)]">
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-xl shadow-sm">
                  ✅
                </div>

                <span className="rounded-full bg-white/85 px-2.5 py-1 text-[9px] font-black text-emerald-600 shadow-sm">
                  QUEST
                </span>
              </div>

              <p className="mt-4 text-[11px] font-semibold text-slate-400">
                오늘의 약속
              </p>

              <p className="mt-1 text-3xl font-black text-slate-900">
                {todayCompletedCount}
                <span className="mx-1 text-base text-slate-300">/</span>
                {todayTotalCount}
              </p>

              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-300 to-emerald-500 transition-all"
                  style={{
                    width: `${todayProgressPercent}%`,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <Link
              href="/us/history"
              prefetch={false}
              className="flex items-center justify-between rounded-[22px] border border-violet-100 bg-gradient-to-br from-[#faf7ff] to-white px-4 py-3.5 shadow-sm"
            >
              <div>
                <p className="text-[9px] font-black tracking-[0.12em] text-violet-400">
                  OUR MEMORY
                </p>
                <p className="mt-0.5 text-sm font-black text-slate-800">
                  우리 기록
                </p>
              </div>

              <span className="text-xl">📖</span>
            </Link>

            <Link
              href="/rewards"
              prefetch={false}
              className="flex items-center justify-between rounded-[22px] border border-orange-100 bg-gradient-to-br from-[#fffaf4] to-white px-4 py-3.5 shadow-sm"
            >
              <div>
                <p className="text-[9px] font-black tracking-[0.12em] text-orange-400">
                  REWARDS
                </p>
                <p className="mt-0.5 text-sm font-black text-slate-800">
                  보상 {unlockedRewardCount}
                </p>
              </div>

              <span className="text-xl">🎁</span>
            </Link>
          </div>

          {pendingVerificationCount > 0 && (
            <Link
              href="/verifications"
              prefetch={false}
              className="mt-3 flex items-center justify-between rounded-[22px] border border-sky-100 bg-gradient-to-r from-[#f5fbff] to-[#fffafd] p-3.5 shadow-sm"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-lg shadow-sm">
                  💌
                </div>

                <div className="min-w-0">
                  <p className="text-sm font-black text-slate-800">
                    확인을 기다리고 있어요
                  </p>
                  <p className="mt-0.5 truncate text-[10px] font-medium text-slate-400">
                    상대방이 보낸 인증 {pendingVerificationCount}개
                  </p>
                </div>
              </div>

              <span className="rounded-full bg-pink-500 px-3 py-1.5 text-[10px] font-black text-white">
                확인
              </span>
            </Link>
          )}

          {recentReward && (
            <Link
              href="/rewards"
              prefetch={false}
              className="mt-3 flex items-center justify-between rounded-[22px] border border-amber-100 bg-gradient-to-r from-amber-50/80 to-white p-3.5 shadow-sm"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-lg shadow-sm">
                  🎁
                </div>

                <div className="min-w-0">
                  <p className="text-[9px] font-black tracking-[0.12em] text-amber-500">
                    RECENT REWARD
                  </p>
                  <p className="mt-0.5 truncate text-sm font-black text-slate-800">
                    {recentReward.title}
                  </p>
                </div>
              </div>

              <span className="text-lg text-amber-300">›</span>
            </Link>
          )}
        </section>

        {/* =================================
            TODAY QUEST
        ================================= */}

        <section className="mt-7">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-[11px] font-black tracking-[0.2em] text-pink-500">
                TODAY QUEST
              </p>

              <h2 className="mt-1 text-[22px] font-black tracking-[-0.02em] text-slate-900">
                오늘도 같이 해볼까요?
              </h2>

            </div>

            <Link
              href="/promise/new"
              prefetch={false}
              className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-gradient-to-br from-pink-500 to-fuchsia-500 text-2xl text-white shadow-[0_10px_24px_rgba(236,72,153,0.24)] transition active:scale-95"
            >
              +
            </Link>

          </div>

          {promises.length >
            0 && (

            <div className={`mt-5 rounded-[26px] border p-5 shadow-[0_10px_28px_rgba(148,163,184,0.10)] ${isTodayAllCompleted ? "border-pink-200 bg-gradient-to-br from-pink-50 to-violet-50" : "border-pink-100 bg-gradient-to-br from-white to-[#fff8fb]"}`}>

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

              <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-pink-100/60">

                <div
                  className="h-full rounded-full bg-gradient-to-r from-pink-400 via-pink-500 to-fuchsia-500 transition-all"
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

            <div className="mt-5 rounded-[28px] border border-dashed border-pink-200 bg-gradient-to-br from-white to-pink-50/40 p-7 text-center shadow-sm">

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
                className="mt-6 block rounded-2xl bg-gradient-to-r from-pink-500 to-fuchsia-500 px-5 py-4 font-black text-white shadow-[0_10px_24px_rgba(236,72,153,0.20)]"
              >
                첫 약속 만들기
              </Link>

            </div>

          ) : (

            <div className="mt-5 space-y-4">

              {/* 미완료 */}

              <section className="overflow-hidden rounded-[28px] border border-violet-100 bg-gradient-to-b from-[#fcf9ff] to-white shadow-[0_10px_30px_rgba(139,92,246,0.08)]">

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

                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-100/70">
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

                  <div className="border-t border-violet-100/50 bg-white/65 p-3">

                    {incompletePromises.length ===
                    0 ? (

                      <div className="rounded-[22px] bg-gradient-to-br from-pink-50 to-violet-50 px-4 py-7 text-center">

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
                                className="overflow-hidden rounded-[26px] border border-pink-100/80 bg-gradient-to-br from-white via-white to-pink-50/50 shadow-[0_8px_24px_rgba(236,72,153,0.07)]"
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

                                    <div className="shrink-0 rounded-2xl bg-pink-50/90 px-3 py-2 text-center">

                                      <p className="text-[10px] text-gray-400">
                                        연속
                                      </p>

                                      <p className="mt-0.5 text-lg font-bold text-pink-500">
                                        🔥 {promise.current_streak}
                                      </p>

                                    </div>

                                  </div>

                                  <div className="mt-4 rounded-2xl bg-gradient-to-r from-pink-50/80 to-violet-50/70 px-4 py-3">

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

                                <div className="border-t border-pink-100/60 bg-white/70 px-5 py-4">

                                  {isMyRejected ? (

                                    <Link
                                      href={`/verify/${promise.id}`}
                                      prefetch={false}
                                      className="block w-full rounded-2xl bg-red-500 px-4 py-3.5 text-center font-semibold text-white"
                                    >
                                      ↻ 다시 인증하기
                                    </Link>

                                  ) : isMyPending ? (

                                    <div className="w-full rounded-2xl border border-amber-100 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3.5 text-center font-black text-amber-700">
                                      🕒 상대방 확인 대기 중
                                    </div>

                                  ) : isMyApproved ? (

                                    <div className="w-full rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 to-green-50 px-4 py-3.5 text-center font-black text-emerald-600">
                                      ✓ 오늘 인증 완료
                                    </div>

                                  ) : (

                                    <Link
                                      href={`/verify/${promise.id}`}
                                      prefetch={false}
                                      className="block w-full rounded-2xl bg-gradient-to-r from-pink-500 to-fuchsia-500 px-4 py-3.5 text-center font-black text-white shadow-[0_8px_18px_rgba(236,72,153,0.18)]"
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

                                      <div className="mt-4 rounded-2xl border border-amber-100 bg-gradient-to-r from-amber-50 to-orange-50 p-4">

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

                                      <div className="mt-4 rounded-2xl border border-violet-100 bg-gradient-to-r from-violet-50 to-pink-50 p-4">

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

              <section className="overflow-hidden rounded-[28px] border border-emerald-100 bg-gradient-to-b from-[#f7fff9] to-white shadow-[0_10px_30px_rgba(16,185,129,0.08)]">

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

            <p className="text-[11px] font-black tracking-[0.2em] text-pink-500">
              OUR STATS
            </p>

            <h2 className="mt-1 text-lg font-bold">
              우리 기록 요약
            </h2>

          </div>

          <div className="grid grid-cols-2 gap-3">

            <div className="rounded-[26px] border border-orange-100 bg-gradient-to-br from-[#fff9f5] to-white p-5 shadow-[0_10px_24px_rgba(249,115,22,0.07)]">

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

            <div className="rounded-[26px] border border-violet-100 bg-gradient-to-br from-[#faf7ff] to-white p-5 shadow-[0_10px_24px_rgba(139,92,246,0.07)]">

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
          코인 획득 연출
      ================================= */}

      {coinGain !== null && coinGain > 0 && (
        <div className="pointer-events-none fixed inset-x-0 top-[18%] z-[70] flex justify-center px-5">
          <div className="flex animate-bounce items-center gap-2 rounded-full border border-amber-100 bg-white/95 px-5 py-3 shadow-[0_16px_40px_rgba(245,158,11,0.22)] backdrop-blur">
            <img
              src="/images/coin.PNG"
              alt=""
              aria-hidden="true"
              className="h-8 w-8 object-contain"
            />
            <span className="text-lg font-black text-amber-600">
              +{coinGain}
            </span>
            <span className="text-xs font-bold text-slate-400">
              코인 획득!
            </span>
          </div>
        </div>
      )}

      {/* =================================
          레벨업 팝업
      ================================= */}

      {levelUpInfo && (
        <div className="fixed inset-0 z-[65] flex items-center justify-center bg-slate-950/45 px-5 backdrop-blur-[2px]">
          <div className="relative w-full max-w-sm overflow-hidden rounded-[34px] border border-violet-100 bg-white p-6 text-center shadow-[0_30px_80px_rgba(76,29,149,0.28)]">
            <div className="pointer-events-none absolute -left-8 -top-8 h-32 w-32 rounded-full bg-pink-200/50 blur-3xl" />
            <div className="pointer-events-none absolute -right-8 top-14 h-36 w-36 rounded-full bg-violet-200/50 blur-3xl" />

            <div className="relative">
              <p className="text-[11px] font-black tracking-[0.24em] text-violet-500">
                LEVEL UP!
              </p>

              <div className="mx-auto mt-4 flex h-24 w-24 items-center justify-center rounded-[30px] bg-gradient-to-br from-pink-100 via-violet-100 to-amber-50 text-5xl shadow-inner">
                ✨
              </div>

              <h2 className="mt-5 text-3xl font-black tracking-tight text-slate-900">
                LV.{levelUpInfo.level}
              </h2>

              <p className="mt-2 text-sm font-bold text-pink-500">
                우리 캐릭터가 한 단계 성장했어요 ♡
              </p>

              <div className="mt-5 rounded-[24px] bg-gradient-to-r from-violet-50 to-pink-50 p-4">
                <p className="text-xs font-semibold text-slate-500">
                  LV.{levelUpInfo.previousLevel}
                  <span className="mx-2 text-pink-300">→</span>
                  LV.{levelUpInfo.level}
                </p>
                <p className="mt-2 font-black text-slate-800">
                  현재 성장 단계 · {growthName}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setLevelUpInfo(null)
                }
                className="mt-6 w-full rounded-2xl bg-gradient-to-r from-pink-500 to-violet-500 px-5 py-4 text-sm font-black text-white shadow-[0_12px_26px_rgba(168,85,247,0.22)]"
              >
                성장한 모습 만나보기 ♡
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================
          코인 안내 팝업
      ================================= */}

      {showCoinInfo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-5 backdrop-blur-[2px]"
          onClick={() =>
            setShowCoinInfo(false)
          }
        >
          <div
            className="w-full max-w-sm rounded-[32px] border border-amber-100 bg-gradient-to-b from-white to-amber-50/30 p-6 shadow-[0_28px_70px_rgba(120,53,15,0.18)]"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <img
                  src="/images/coin.PNG"
                  alt="OURQUEST 코인"
                  className="h-12 w-12 object-contain"
                />

                <div>
                  <p className="text-[10px] font-black tracking-[0.18em] text-pink-400">
                    OURQUEST COIN
                  </p>

                  <h2 className="mt-1 text-xl font-black">
                    코인 획득 방법
                  </h2>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowCoinInfo(false)
                }
                className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-50 text-gray-400"
              >
                ×
              </button>
            </div>

            <div className="mt-5 rounded-[24px] border border-pink-100 bg-gradient-to-r from-pink-50 to-amber-50 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-black">
                  🔥 현재 {currentStreak}일 연속
                </p>

                <div className="flex items-center gap-1.5">
                  <img
                    src="/images/coin.PNG"
                    alt=""
                    aria-hidden="true"
                    className="h-5 w-5 object-contain"
                  />

                  <span className="text-sm font-black text-amber-600">
                    {coins}
                  </span>
                </div>
              </div>

              <p className="mt-2 text-xs leading-5 text-gray-500">
                매일 인증을 이어가면 연속 보너스가 커져요.
                하루라도 놓치면 연속 보너스는 다시 1일차부터 시작해요.
              </p>
            </div>

            <div className="mt-4 space-y-2">
              {[
                ["1일차", "1"],
                ["2~3일차", "2"],
                ["4~5일차", "3"],
                ["6일차", "4"],
                ["7일차", "5"],
                ["14일차", "8"],
                ["30일차", "15"],
              ].map(
                ([day, reward]) => (
                  <div
                    key={day}
                    className="flex items-center justify-between rounded-2xl border border-amber-100/70 bg-white/80 px-4 py-3"
                  >
                    <span className="text-sm font-bold text-gray-600">
                      {day}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <img
                        src="/images/coin.PNG"
                        alt=""
                        aria-hidden="true"
                        className="h-5 w-5 object-contain"
                      />

                      <span className="text-sm font-black text-amber-600">
                        +{reward}
                      </span>
                    </div>
                  </div>
                )
              )}
            </div>

            <div className="mt-4 rounded-2xl bg-amber-50 px-4 py-3">
              <p className="text-xs font-bold text-amber-700">
                다음 연속 인증 예상 보상: +{nextCoinReward}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setShowCoinInfo(false)
              }
              className="mt-5 w-full rounded-2xl bg-gradient-to-r from-pink-500 to-fuchsia-500 px-5 py-4 text-sm font-black text-white shadow-[0_10px_24px_rgba(236,72,153,0.18)]"
            >
              확인했어요 ♡
            </button>
          </div>
        </div>
      )}

      {/* =================================
          보상 팝업
      ================================= */}

      {rewardNotification && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-5 backdrop-blur-[2px]">

          <div className="relative w-full max-w-sm overflow-hidden rounded-[34px] border border-pink-100 bg-gradient-to-b from-white via-white to-pink-50/60 p-6 text-center shadow-[0_30px_80px_rgba(190,24,93,0.24)]">

            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[30px] bg-gradient-to-br from-pink-100 via-violet-100 to-amber-50 text-5xl shadow-inner">
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

            <div className="mt-6 rounded-[24px] border border-violet-100 bg-gradient-to-r from-violet-50 to-pink-50 p-5">

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
              className="mt-6 block rounded-2xl bg-gradient-to-r from-pink-500 to-fuchsia-500 px-5 py-4 font-black text-white shadow-[0_10px_24px_rgba(236,72,153,0.20)]"
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

