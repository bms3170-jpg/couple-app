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

type CharacterType =
  | "dog"
  | "cat"
  | "penguin"
  | "red_panda";

type Member = {
  user_id: string;
  character_color: CharacterColor | null;
  profiles: {
    nickname: string | null;
  } | null;
};

type MemberCharacter = {
  couple_id: string;
  user_id: string;
  character_type: CharacterType | null;
};

type CoupleCharacter = {
  affection: number;
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
  stage:
    | "baby"
    | "child"
    | "teen"
    | "adult";
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

  const [loading, setLoading] =
    useState(true);

  const [couple, setCouple] =
    useState<CoupleInfo | null>(
      null
    );

  const [members, setMembers] =
    useState<Member[]>([]);

  const [
    memberCharacters,
    setMemberCharacters,
  ] = useState<MemberCharacter[]>(
    []
  );

  const [
    character,
    setCharacter,
  ] =
    useState<CoupleCharacter | null>(
      null
    );

  const [promises, setPromises] =
    useState<PromiseItem[]>([]);

  const [
    todayVerifications,
    setTodayVerifications,
  ] = useState<TodayVerification[]>(
    []
  );

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
  ] = useState<UserEquippedItem[]>(
    []
  );

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
  ] =
    useState<LevelUpInfo | null>(
      null
    );

  const [
    coinGain,
    setCoinGain,
  ] = useState<number | null>(
    null
  );

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

      setLoading(true);

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
          "커플 조회 오류:",
          membershipError
        );

        window.location.href =
          "/home";
        return;
      }

      const coupleId =
        membership.couple_id;

      const [
        rewardNotificationResult,
        coupleResult,
        sharedCharacterResult,
        walletResult,
        memberResult,
        unlockedRewardResult,
        pendingVerificationResult,
        recentRewardResult,
        promiseResult,
        deleteRequestResult,
      ] = await Promise.all([
        supabase
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
          .maybeSingle(),

        supabase
          .from("couples")
          .select(
            "level, xp"
          )
          .eq(
            "id",
            coupleId
          )
          .maybeSingle(),

        supabase
          .from(
            "couple_characters"
          )
          .select(
            "affection"
          )
          .eq(
            "couple_id",
            coupleId
          )
          .maybeSingle(),

        supabase
          .from(
            "couple_wallets"
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
          .maybeSingle(),

        supabase
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
          ),

        supabase
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
          ),

        supabase
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
          ),

        supabase
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
            {
              ascending: false,
            }
          )
          .limit(1)
          .maybeSingle(),

        supabase
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
          .order(
            "created_at",
            {
              ascending: false,
            }
          ),

        supabase
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

        setLoading(false);
        return;
      }

      if (memberResult.error) {
        console.error(
          "멤버 조회 오류:",
          memberResult.error
        );

        setLoading(false);
        return;
      }

      if (promiseResult.error) {
        console.error(
          "약속 조회 오류:",
          promiseResult.error
        );

        setLoading(false);
        return;
      }

      setRewardNotification(
        rewardNotificationResult.data
          ? (
              rewardNotificationResult.data as unknown as RewardUnlockNotification
            )
          : null
      );

      setCouple(
        coupleResult.data as CoupleInfo
      );

      setCharacter(
        sharedCharacterResult.data
          ? (
              sharedCharacterResult.data as CoupleCharacter
            )
          : {
              affection: 0,
            }
      );

      if (
        walletResult.error
      ) {
        console.error(
          "우리 코인 지갑 조회 오류:",
          walletResult.error
        );
      }

      setWallet(
        walletResult.data
          ? (
              walletResult.data as CoinWallet
            )
          : {
              coins: 0,
              total_earned: 0,
              total_spent: 0,
            }
      );

      const userIds =
        memberResult.data?.map(
          (member) =>
            member.user_id
        ) ?? [];

      const [
        profileResult,
        memberCharacterResult,
      ] = await Promise.all([
        userIds.length > 0
          ? supabase
              .from("profiles")
              .select(
                "id, nickname"
              )
              .in(
                "id",
                userIds
              )
          : Promise.resolve({
              data: [],
              error: null,
            }),

        userIds.length > 0
          ? supabase
              .from(
                "couple_member_characters"
              )
              .select(`
                couple_id,
                user_id,
                character_type
              `)
              .eq(
                "couple_id",
                coupleId
              )
              .in(
                "user_id",
                userIds
              )
          : Promise.resolve({
              data: [],
              error: null,
            }),
      ]);

      if (cancelled) {
        return;
      }

      if (profileResult.error) {
        console.error(
          "프로필 조회 오류:",
          profileResult.error
        );
      }

      if (
        memberCharacterResult.error
      ) {
        console.error(
          "개인 캐릭터 조회 오류:",
          memberCharacterResult.error
        );
      }

      const combinedMembers:
        Member[] =
        (
          memberResult.data ??
          []
        ).map(
          (member) => {
            const profile =
              profileResult.data?.find(
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

      setMembers(
        combinedMembers
      );

      setMemberCharacters(
        (
          memberCharacterResult.data ??
          []
        ) as MemberCharacter[]
      );

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
          coupleResult.data.level ??
            1
        )
        .order(
          "level",
          {
            ascending: false,
          }
        )
        .limit(1)
        .maybeSingle();

      if (
        growthError
      ) {
        console.error(
          "캐릭터 성장 단계 조회 오류:",
          growthError
        );
      }

      setGrowthStage(
        growthData
          ? (
              growthData as GrowthStage
            )
          : null
      );

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
          EquippedStoreItem[] =
          [];

        if (
          itemIds.length >
          0
        ) {
          const {
            data: storeItemRows,
            error: storeItemError,
          } = await supabase
            .from("store_items")
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
                    (storeItem) =>
                      storeItem.id ===
                      row.item_id
                  );

                if (!item) {
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

      setUnlockedRewardCount(
        unlockedRewardResult.count ??
          0
      );

      setPendingVerificationCount(
        pendingVerificationResult.count ??
          0
      );

      setRecentReward(
        recentRewardResult.data
          ? (
              recentRewardResult.data as unknown as RecentReward
            )
          : null
      );

      const promiseRows =
        (
          promiseResult.data ??
          []
        ) as PromiseItem[];

      setPromises(
        promiseRows
      );

      setDeleteRequests(
        (
          deleteRequestResult.data ??
          []
        ) as DeleteRequest[]
      );

      const todayPromiseIds =
        promiseRows.map(
          (promise) =>
            promise.id
        );

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
          data: verificationRows,
          error: verificationError,
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
          verificationError
        ) {
          console.error(
            "오늘 인증 조회 오류:",
            verificationError
          );
        } else {
          setTodayVerifications(
            (
              verificationRows ??
              []
            ) as TodayVerification[]
          );
        }
      } else {
        setTodayVerifications([]);
      }

      setLoading(false);
    }

    void loadCouple();

    return () => {
      cancelled = true;
    };
  }, [
    supabase,
    user,
    authLoading,
  ]);

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
      window.localStorage.getItem(
        key
      );

    if (
      saved !== null
    ) {
      const previousLevel =
        Number(saved);

      if (
        Number.isFinite(
          previousLevel
        ) &&
        couple.level >
          previousLevel
      ) {
        setLevelUpInfo({
          previousLevel,
          level:
            couple.level,
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
      window.localStorage.getItem(
        key
      );

    if (
      saved !== null
    ) {
      const previousCoins =
        Number(saved);

      if (
        Number.isFinite(
          previousCoins
        ) &&
        wallet.coins >
          previousCoins
      ) {
        const gained =
          wallet.coins -
          previousCoins;

        setCoinGain(
          gained
        );

        const timer =
          window.setTimeout(
            () =>
              setCoinGain(
                null
              ),
            2400
          );

        window.localStorage.setItem(
          key,
          String(wallet.coins)
        );

        return () =>
          window.clearTimeout(
            timer
          );
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

    if (error) {
      alert(error.message);
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

    if (!confirmed) {
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

    if (error) {
      alert(error.message);
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

    if (error) {
      alert(error.message);
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

    if (error) {
      alert(error.message);
      return;
    }

    window.location.reload();
  }

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

    if (error) {
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

  if (authLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#fffafd] to-[#faf8ff]">
        <p className="text-sm text-gray-500">
          로그인 정보 확인 중...
        </p>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#fffafd] to-[#faf8ff]">
        <p className="text-sm text-gray-500">
          우리 공간 불러오는 중...
        </p>
      </main>
    );
  }

  const first =
    members[0]?.profiles
      ?.nickname ??
    "나";

  const second =
    members[1]?.profiles
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
    (level - 1) *
      50;

  const xpPercent =
    Math.min(
      (xp /
        xpForNextLevel) *
        100,
      100
    );

  const coins =
    wallet.coins;

  const growthName =
    level <= 2
      ? "아기"
      : level <= 4
      ? "꼬마"
      : level <= 6
      ? "청년"
      : "성년";

  const characterImageLevel =
    level <= 2
      ? 1
      : level <= 4
      ? 2
      : level <= 6
      ? 3
      : 4;

  const currentUserCharacter =
    memberCharacters.find(
      (row) =>
        row.user_id ===
        currentUserId
    );

  const needsCharacterSetup =
    !currentUserCharacter
      ?.character_type;

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


  function getCharacterBottomOffset(
    characterType:
      | CharacterType
      | null
  ) {
    if (!characterType) {
      return 0;
    }

    const stage =
      characterImageLevel === 1
        ? "baby"
        : characterImageLevel === 2
        ? "child"
        : characterImageLevel === 3
        ? "teen"
        : "adult";

    const offsets: Record<
      CharacterType,
      Record<
        "baby" | "child" | "teen" | "adult",
        number
      >
    > = {
      dog: {
        baby: 4,
        child: 4,
        teen: 4,
        adult: 4,
      },

      cat: {
        baby: 4,
        child: 4,
        teen: 4,
        adult: 4,
      },

      penguin: {
        baby: 12,
        child: 10,
        teen: 10,
        adult: 8,
      },

      red_panda: {
        baby: 0,
        child: 0,
        teen: 0,
        adult: 0,
      },
    };

    return offsets[
      characterType
    ][stage];
  }

  function getMemberCharacterType(
    userId: string
  ) {
    return (
      memberCharacters.find(
        (row) =>
          row.user_id ===
          userId
      )?.character_type ??
      null
    );
  }

  function getCharacterImagePath(
    member:
      | Member
      | undefined
  ) {
    if (!member) {
      return null;
    }

    const characterType =
      getMemberCharacterType(
        member.user_id
      );

    if (!characterType) {
      return null;
    }

    const stage =
      characterImageLevel ===
      1
        ? "baby"
        : characterImageLevel ===
          2
        ? "child"
        : characterImageLevel ===
          3
        ? "teen"
        : "adult";

    const animalFolder =
      characterType ===
      "red_panda"
        ? "red-panda"
        : characterType;

    return `/characters/${animalFolder}/${stage}.png`;
  }

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
    const characterType =
      getMemberCharacterType(
        userId
      );

    if (!characterType) {
      return null;
    }

    const stage =
      characterImageLevel ===
      1
        ? "baby"
        : characterImageLevel ===
          2
        ? "child"
        : characterImageLevel ===
          3
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
            characterType &&
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
      path.startsWith(
        "http://"
      ) ||
      path.startsWith(
        "https://"
      )
    ) {
      return path;
    }

    return `/${path}`;
  }

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

  const currentStreak =
    promises.reduce(
      (max, promise) =>
        Math.max(
          max,
          promise.current_streak ??
            0
        ),
      0
    );

  const affection =
    Math.max(
      0,
      Math.min(
        100,
        character?.affection ??
          0
      )
    );

  function getDisplayedCoinReward(
    streak: number
  ) {
    if (streak <= 0)
      return 1;
    if (streak === 1)
      return 1;
    if (streak <= 3)
      return 2;
    if (streak <= 5)
      return 3;
    if (streak === 6)
      return 4;
    if (streak === 7)
      return 5;
    if (streak <= 13)
      return 5;
    if (streak === 14)
      return 8;
    if (streak <= 29)
      return 6;
    if (streak === 30)
      return 15;
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
      : pendingVerificationCount >
        0
      ? "상대방의 인증이 기다리고 있어요 💌"
      : currentStreak >= 7
      ? `벌써 ${currentStreak}일 연속! 정말 멋져요 🔥`
      : todayTotalCount ===
        0
      ? "우리만의 첫 약속을 만들어볼까요? 🌱"
      : todayCompletedCount >
        0
      ? "좋아요! 오늘도 조금씩 채워가요 ♡"
      : "오늘도 둘이 같이 시작해볼까요? ✨";

  function renderUserCharacter(
    member:
      | Member
      | undefined,
    index: number
  ) {
    if (!member) {
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
      (index === 0
        ? "나"
        : "파트너");

    const isMe =
      member.user_id ===
      currentUserId;

    const characterType =
      getMemberCharacterType(
        member.user_id
      );

    const characterImagePath =
      getCharacterImagePath(
        member
      );

    const bottomOffset =
      getCharacterBottomOffset(
        characterType
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
                width:
                  `${characterDisplayWidth}px`,
                transform:
                  `translateY(${bottomOffset}px)`,
              }}
            >
              <img
                src={
                  characterImagePath
                }
                alt={
                  characterType ===
                  "dog"
                    ? "강아지 캐릭터"
                    : characterType ===
                      "cat"
                    ? "고양이 캐릭터"
                    : characterType ===
                      "penguin"
                    ? "펭귄 캐릭터"
                    : "레서판다 캐릭터"
                }
                className="block h-auto w-full object-contain drop-shadow-sm"
                style={{
                  maxHeight:
                    "178px",
                }}
              />

              {[
                {
                  slot: "hat",
                  item: hat,
                  zIndex: 40,
                },
                {
                  slot:
                    "clothes",
                  item:
                    clothes,
                  zIndex: 30,
                },
                {
                  slot:
                    "accessory",
                  item:
                    accessory,
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
                    slot ===
                    "hat"
                      ? {
                          x: 50,
                          y: 5,
                          scale: 78,
                          rotation: 0,
                        }
                      : slot ===
                        "clothes"
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
                      src={
                        imageSrc
                      }
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
            <Link
              href={
                isMe
                  ? "/character"
                  : "#"
              }
              prefetch={
                false
              }
              onClick={(
                event
              ) => {
                if (!isMe) {
                  event.preventDefault();
                }
              }}
              className={`absolute inset-x-2 bottom-1 top-2 flex select-none flex-col items-center justify-center rounded-[24px] border border-dashed bg-white/60 ${
                isMe
                  ? "border-pink-200"
                  : "border-violet-200"
              }`}
            >
              <span className="text-4xl">
                🐾
              </span>

              <span className="mt-2 text-[10px] font-bold text-gray-400">
                {isMe
                  ? "내 캐릭터 선택"
                  : "상대방 선택 대기"}
              </span>
            </Link>
          )}
        </div>

        <div className="mt-1 flex max-w-full items-center gap-1.5">
          <p className="truncate text-xs font-bold text-gray-700">
            {
              nickname
            }
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
        <header className="flex items-center justify-between gap-4 px-1">
          <div className="min-w-0">
            <p className="text-[11px] font-black tracking-[0.24em] text-pink-500">
              OURQUEST
            </p>

            <h1 className="mt-2 truncate text-[27px] font-black tracking-[-0.03em] text-slate-900">
              {first}{" "}
              <span className="text-pink-400">
                ♡
              </span>{" "}
              {second}
            </h1>

            <p className="mt-1 text-[12px] font-medium text-slate-400">
              우리만의 하루를 더 특별하게 ✨
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setShowCoinInfo(
                true
              )
            }
            className="flex shrink-0 items-center gap-2 rounded-[20px] border border-amber-100 bg-white/95 px-3 py-2.5 shadow-[0_8px_24px_rgba(245,158,11,0.12)] transition active:scale-[0.97]"
          >
            <img
              src="/images/coin.PNG"
              alt="코인"
              className="h-7 w-7 object-contain"
            />

            <span className="text-base font-black text-slate-800">
              {
                coins
              }
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
            <div className="absolute right-[31%] top-[13%] text-[12px] text-white/70">
              ✦
            </div>
          </div>

          <div className="relative z-20 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-gradient-to-r from-pink-500 to-fuchsia-500 px-3 py-1.5 text-[11px] font-black text-white shadow-sm">
                LV.
                {
                  level
                }
              </span>

              <span className="rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-black text-violet-500 shadow-sm backdrop-blur">
                {
                  growthName
                }
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/inventory"
                prefetch={
                  false
                }
                className="flex h-9 items-center justify-center rounded-2xl bg-white/92 px-3 text-[11px] font-black text-pink-500 shadow-sm backdrop-blur"
              >
                👕 옷장
              </Link>

              <Link
                href="/store"
                prefetch={
                  false
                }
                className="flex h-9 items-center justify-center rounded-2xl bg-white/92 px-3 text-[11px] font-black text-pink-500 shadow-sm backdrop-blur"
              >
                🛍️ 상점
              </Link>
            </div>
          </div>

          <div className="relative z-10 mt-1 overflow-hidden rounded-[26px] bg-gradient-to-b from-white/5 to-violet-950/10 px-1 pb-2 pt-2">
            <div className="pointer-events-none absolute inset-x-[-15%] bottom-[-54px] h-[120px] rounded-[50%] bg-[#7666cc]/65" />

            <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 text-3xl text-pink-100">
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

            <div className="relative z-20 mx-auto mt-1 w-fit max-w-[92%] rounded-full bg-white/18 px-3 py-1.5 text-center text-[10px] font-bold text-white backdrop-blur-sm">
              {
                characterMessage
              }
            </div>
          </div>

          {needsCharacterSetup && (
            <Link
              href="/character"
              prefetch={
                false
              }
              className="relative z-20 mt-2 block rounded-2xl bg-white/95 px-4 py-3 text-center text-xs font-black text-pink-500 shadow-sm"
            >
              내 캐릭터 선택하기
            </Link>
          )}

          <div className="relative z-20 mt-3 grid grid-cols-2 gap-2.5">
            <div className="rounded-[22px] border border-white/70 bg-white/92 p-3.5 shadow-sm">
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
                  {
                    affection
                  }
                  %
                </span>
              </div>

              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-pink-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-pink-300 via-pink-400 to-fuchsia-500"
                  style={{
                    width:
                      `${affection}%`,
                  }}
                />
              </div>

              <p className="mt-2 text-[10px] font-semibold text-slate-400">
                💕 우리 애정도
              </p>
            </div>

            <div className="rounded-[22px] border border-amber-100 bg-[#fffdf4]/95 p-3.5 shadow-sm">
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
                  {xp}/
                  {
                    xpForNextLevel
                  }
                </span>
              </div>

              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-amber-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-300 to-orange-400"
                  style={{
                    width:
                      `${xpPercent}%`,
                  }}
                />
              </div>

              <p className="mt-2 text-[10px] font-semibold text-slate-400">
                {nextGrowthName ===
                "최고 단계"
                  ? "최고 성장 단계예요 ✨"
                  : `다음 성장: ${nextGrowthName} · ${Math.max(
                      xpForNextLevel -
                        xp,
                      0
                    )} XP`}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-6">
          <div className="mb-3 flex items-end justify-between px-1">
            <div>
              <p className="text-[11px] font-black tracking-[0.2em] text-pink-500">
                TODAY
              </p>

              <h2 className="mt-1 text-[22px] font-black text-slate-900">
                오늘의 우리
              </h2>
            </div>

            <span className="rounded-full border border-slate-100 bg-white px-3 py-1.5 text-[10px] font-bold text-slate-400 shadow-sm">
              {
                todayCompletedCount
              }
              /
              {
                todayTotalCount
              }{" "}
              완료
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-[26px] border border-pink-100 bg-gradient-to-br from-[#fff6f9] to-[#fffdf6] p-4 shadow-sm">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-xl shadow-sm">
                🔥
              </div>

              <p className="mt-4 text-[11px] font-semibold text-slate-400">
                연속 인증
              </p>

              <p className="mt-1 text-3xl font-black">
                {
                  currentStreak
                }
                <span className="ml-1 text-sm text-slate-400">
                  일
                </span>
              </p>

              <div className="mt-3 flex items-center gap-1.5 rounded-2xl bg-amber-50 px-3 py-2">
                <img
                  src="/images/coin.PNG"
                  alt=""
                  className="h-5 w-5"
                />

                <p className="text-[11px] font-black text-amber-600">
                  오늘 예상 +
                  {
                    todayCoinReward
                  }
                </p>
              </div>
            </div>

            <div className="rounded-[26px] border border-emerald-100 bg-gradient-to-br from-[#f6fff9] to-[#fbfffd] p-4 shadow-sm">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-xl shadow-sm">
                ✅
              </div>

              <p className="mt-4 text-[11px] font-semibold text-slate-400">
                오늘의 약속
              </p>

              <p className="mt-1 text-3xl font-black">
                {
                  todayCompletedCount
                }
                <span className="mx-1 text-base text-slate-300">
                  /
                </span>
                {
                  todayTotalCount
                }
              </p>

              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-300 to-emerald-500"
                  style={{
                    width:
                      `${todayProgressPercent}%`,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <Link
              href="/us/history"
              prefetch={
                false
              }
              className="flex items-center justify-between rounded-[22px] border border-violet-100 bg-gradient-to-br from-[#faf7ff] to-white px-4 py-3.5 shadow-sm"
            >
              <div>
                <p className="text-[9px] font-black tracking-[0.12em] text-violet-400">
                  OUR MEMORY
                </p>
                <p className="mt-0.5 text-sm font-black">
                  우리 기록
                </p>
              </div>

              <span className="text-xl">
                📖
              </span>
            </Link>

            <Link
              href="/rewards"
              prefetch={
                false
              }
              className="flex items-center justify-between rounded-[22px] border border-orange-100 bg-gradient-to-br from-[#fffaf4] to-white px-4 py-3.5 shadow-sm"
            >
              <div>
                <p className="text-[9px] font-black tracking-[0.12em] text-orange-400">
                  REWARDS
                </p>

                <p className="mt-0.5 text-sm font-black">
                  보상{" "}
                  {
                    unlockedRewardCount
                  }
                </p>
              </div>

              <span className="text-xl">
                🎁
              </span>
            </Link>
          </div>

          {pendingVerificationCount >
            0 && (
            <Link
              href="/verifications"
              prefetch={
                false
              }
              className="mt-3 flex items-center justify-between rounded-[22px] border border-sky-100 bg-gradient-to-r from-[#f5fbff] to-[#fffafd] p-3.5 shadow-sm"
            >
              <div>
                <p className="text-sm font-black">
                  확인을 기다리고 있어요
                </p>
                <p className="mt-0.5 text-[10px] text-slate-400">
                  상대방이 보낸 인증{" "}
                  {
                    pendingVerificationCount
                  }
                  개
                </p>
              </div>

              <span className="rounded-full bg-pink-500 px-3 py-1.5 text-[10px] font-black text-white">
                확인
              </span>
            </Link>
          )}

          {recentReward && (
            <Link
              href="/rewards"
              prefetch={
                false
              }
              className="mt-3 flex items-center justify-between rounded-[22px] border border-amber-100 bg-gradient-to-r from-amber-50/80 to-white p-3.5 shadow-sm"
            >
              <div>
                <p className="text-[9px] font-black tracking-[0.12em] text-amber-500">
                  RECENT REWARD
                </p>
                <p className="mt-0.5 text-sm font-black">
                  {
                    recentReward.title
                  }
                </p>
              </div>

              <span className="text-lg text-amber-300">
                ›
              </span>
            </Link>
          )}
        </section>

        <section className="mt-7">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-black tracking-[0.2em] text-pink-500">
                TODAY QUEST
              </p>

              <h2 className="mt-1 text-[22px] font-black">
                오늘도 같이 해볼까요?
              </h2>
            </div>

            <Link
              href="/promise/new"
              prefetch={
                false
              }
              className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-gradient-to-br from-pink-500 to-fuchsia-500 text-2xl text-white shadow-sm"
            >
              +
            </Link>
          </div>

          {promises.length >
            0 && (
            <div className="mt-5 rounded-[26px] border border-pink-100 bg-white p-5 shadow-sm">
              <div className="flex items-end justify-between">
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
                  {
                    todayProgressPercent
                  }
                  %
                </p>
              </div>

              <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-pink-100/60">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-pink-400 to-fuchsia-500"
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
            <div className="mt-5 rounded-[28px] border border-dashed border-pink-200 bg-white p-7 text-center shadow-sm">
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
                prefetch={
                  false
                }
                className="mt-6 block rounded-2xl bg-gradient-to-r from-pink-500 to-fuchsia-500 px-5 py-4 font-black text-white"
              >
                첫 약속 만들기
              </Link>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              <section className="overflow-hidden rounded-[28px] border border-violet-100 bg-white shadow-sm">
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
                  <div className="text-left">
                    <p className="font-bold">
                      오늘 미완료
                    </p>
                    <p className="text-[11px] text-gray-400">
                      아직 끝나지 않은 약속{" "}
                      {
                        incompletePromises.length
                      }
                      개
                    </p>
                  </div>

                  <span>
                    ⌄
                  </span>
                </button>

                {showIncompletePromises && (
                  <div className="border-t border-violet-100/50 p-3">
                    {incompletePromises.length ===
                    0 ? (
                      <div className="rounded-[22px] bg-pink-50 px-4 py-7 text-center">
                        <p className="font-semibold text-pink-500">
                          🎉 오늘 약속을 모두 완료했어요!
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {incompletePromises.map(
                          (
                            promise
                          ) => {
                            const assignee =
                              members.find(
                                (
                                  member
                                ) =>
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
                                (
                                  request
                                ) =>
                                  request.promise_id ===
                                  promise.id
                              );

                            const myVerification =
                              getMyVerification(
                                promise.id
                              );

                            return (
                              <article
                                key={
                                  promise.id
                                }
                                className="overflow-hidden rounded-[26px] border border-pink-100 bg-white shadow-sm"
                              >
                                <div className="p-5">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="rounded-full bg-pink-50 px-2.5 py-1 text-[10px] font-semibold text-pink-500">
                                      {
                                        repeatLabel
                                      }
                                    </span>

                                    <span className="text-[11px] text-gray-400">
                                      {promise.is_joint
                                        ? "💕 서로의 약속"
                                        : `${assigneeName}님의 약속`}
                                    </span>
                                  </div>

                                  <h3 className="mt-3 text-xl font-bold">
                                    {
                                      promise.title
                                    }
                                  </h3>

                                  <p className="mt-3 text-xs text-gray-500">
                                    🔥 현재{" "}
                                    {
                                      promise.current_streak
                                    }
                                    일 · 🏆 최고{" "}
                                    {
                                      promise.best_streak
                                    }
                                    일 · ✓ 성공{" "}
                                    {
                                      promise.total_success
                                    }
                                    일
                                  </p>

                                  {myVerification?.status ===
                                    "rejected" && (
                                    <div className="mt-4 rounded-2xl bg-red-50 p-4">
                                      <p className="font-bold text-red-500">
                                        ↻ 인증이 반려되었어요
                                      </p>

                                      <p className="mt-2 text-sm text-red-400">
                                        {myVerification.rejection_reason?.trim()
                                          ? myVerification.rejection_reason
                                          : "상대방이 반려 이유를 남기지 않았어요."}
                                      </p>
                                    </div>
                                  )}
                                </div>

                                <div className="border-t border-pink-100/60 px-5 py-4">
                                  {myVerification?.status ===
                                  "rejected" ? (
                                    <Link
                                      href={`/verify/${promise.id}`}
                                      prefetch={
                                        false
                                      }
                                      className="block rounded-2xl bg-red-500 px-4 py-3.5 text-center font-semibold text-white"
                                    >
                                      ↻ 다시 인증하기
                                    </Link>
                                  ) : myVerification?.status ===
                                    "pending" ? (
                                    <div className="rounded-2xl bg-amber-50 px-4 py-3.5 text-center font-black text-amber-700">
                                      🕒 상대방 확인 대기 중
                                    </div>
                                  ) : myVerification?.status ===
                                    "approved" ? (
                                    <div className="rounded-2xl bg-emerald-50 px-4 py-3.5 text-center font-black text-emerald-600">
                                      ✓ 오늘 인증 완료
                                    </div>
                                  ) : (
                                    <Link
                                      href={`/verify/${promise.id}`}
                                      prefetch={
                                        false
                                      }
                                      className="block rounded-2xl bg-gradient-to-r from-pink-500 to-fuchsia-500 px-4 py-3.5 text-center font-black text-white"
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
                                      className="mt-3 w-full px-4 py-3 text-sm font-semibold text-gray-400"
                                    >
                                      약속 삭제 협의하기
                                    </button>
                                  )}

                                  {deleteRequest &&
                                    deleteRequest.requested_by ===
                                      currentUserId && (
                                      <div className="mt-4 rounded-2xl bg-amber-50 p-4">
                                        <p className="font-semibold text-yellow-700">
                                          🕒 삭제 협의 중
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
                                      <div className="mt-4 rounded-2xl bg-violet-50 p-4">
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
                                            className="rounded-xl border bg-white px-3 py-3 text-sm"
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

              <section className="overflow-hidden rounded-[28px] border border-emerald-100 bg-white shadow-sm">
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
                  <div className="text-left">
                    <p className="font-bold">
                      오늘 완료
                    </p>
                    <p className="text-[11px] text-gray-400">
                      오늘 끝낸 약속{" "}
                      {
                        completedPromises.length
                      }
                      개
                    </p>
                  </div>

                  <span>
                    ⌄
                  </span>
                </button>

                {showCompletedPromises && (
                  <div className="border-t border-emerald-50 p-3">
                    {completedPromises.length ===
                    0 ? (
                      <p className="py-5 text-center text-sm text-gray-400">
                        아직 완료한 약속이 없어요.
                      </p>
                    ) : (
                      completedPromises.map(
                        (
                          promise
                        ) => (
                          <div
                            key={
                              promise.id
                            }
                            className="mb-2 rounded-2xl bg-green-50/40 px-4 py-3"
                          >
                            <p className="font-bold">
                              {
                                promise.title
                              }
                            </p>
                            <p className="text-[10px] text-pink-500">
                              🔥{" "}
                              {
                                promise.current_streak
                              }
                              일
                            </p>
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

        <section className="mt-6">
          <p className="text-[11px] font-black tracking-[0.2em] text-pink-500">
            OUR STATS
          </p>

          <h2 className="mt-1 text-lg font-bold">
            우리 기록 요약
          </h2>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-[26px] border border-orange-100 bg-white p-5 shadow-sm">
              <div className="text-xl">
                🔥
              </div>

              <p className="mt-4 text-xs text-gray-400">
                진행 중인 약속
              </p>

              <p className="mt-1 text-3xl font-bold">
                {
                  promises.length
                }
                <span className="ml-1 text-sm text-gray-400">
                  개
                </span>
              </p>
            </div>

            <div className="rounded-[26px] border border-violet-100 bg-white p-5 shadow-sm">
              <div className="text-xl">
                🎁
              </div>

              <p className="mt-4 text-xs text-gray-400">
                해금한 보상
              </p>

              <p className="mt-1 text-3xl font-bold">
                {
                  unlockedRewardCount
                }
                <span className="ml-1 text-sm text-gray-400">
                  개
                </span>
              </p>
            </div>
          </div>
        </section>

        <BottomNav />
      </div>

      {coinGain !== null &&
        coinGain > 0 && (
          <div className="pointer-events-none fixed inset-x-0 top-[18%] z-[70] flex justify-center px-5">
            <div className="flex animate-bounce items-center gap-2 rounded-full border border-amber-100 bg-white/95 px-5 py-3 shadow-xl">
              <img
                src="/images/coin.PNG"
                alt=""
                className="h-8 w-8"
              />
              <span className="text-lg font-black text-amber-600">
                +
                {
                  coinGain
                }
              </span>
              <span className="text-xs font-bold text-slate-400">
                코인 획득!
              </span>
            </div>
          </div>
        )}

      {levelUpInfo && (
        <div className="fixed inset-0 z-[65] flex items-center justify-center bg-slate-950/45 px-5">
          <div className="w-full max-w-sm rounded-[34px] bg-white p-6 text-center shadow-2xl">
            <p className="text-[11px] font-black tracking-[0.24em] text-violet-500">
              LEVEL UP!
            </p>

            <div className="mx-auto mt-4 flex h-24 w-24 items-center justify-center rounded-[30px] bg-gradient-to-br from-pink-100 via-violet-100 to-amber-50 text-5xl">
              ✨
            </div>

            <h2 className="mt-5 text-3xl font-black">
              LV.
              {
                levelUpInfo.level
              }
            </h2>

            <p className="mt-2 text-sm font-bold text-pink-500">
              우리 캐릭터들이 한 단계 성장했어요 ♡
            </p>

            <button
              type="button"
              onClick={() =>
                setLevelUpInfo(
                  null
                )
              }
              className="mt-6 w-full rounded-2xl bg-gradient-to-r from-pink-500 to-violet-500 px-5 py-4 text-sm font-black text-white"
            >
              성장한 모습 만나보기 ♡
            </button>
          </div>
        </div>
      )}

      {showCoinInfo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-5"
          onClick={() =>
            setShowCoinInfo(
              false
            )
          }
        >
          <div
            className="w-full max-w-sm rounded-[32px] bg-white p-6 shadow-2xl"
            onClick={(
              event
            ) =>
              event.stopPropagation()
            }
          >
            <div className="flex items-center gap-3">
              <img
                src="/images/coin.PNG"
                alt="OURQUEST 코인"
                className="h-12 w-12"
              />

              <div>
                <p className="text-[10px] font-black tracking-[0.18em] text-pink-400">
                  OURQUEST COIN
                </p>

                <h2 className="mt-1 text-xl font-black">
                  우리 코인
                </h2>
              </div>
            </div>

            <p className="mt-4 text-sm leading-6 text-gray-500">
              둘이 함께 모으고 사용하는 공용 코인이에요.
            </p>

            <div className="mt-4 rounded-2xl bg-amber-50 p-4">
              <p className="text-sm font-black text-amber-700">
                🔥 현재{" "}
                {
                  currentStreak
                }
                일 연속
              </p>

              <p className="mt-2 text-xs text-amber-700">
                다음 연속 인증 예상 보상: +
                {
                  nextCoinReward
                }
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setShowCoinInfo(
                  false
                )
              }
              className="mt-5 w-full rounded-2xl bg-gradient-to-r from-pink-500 to-fuchsia-500 px-5 py-4 text-sm font-black text-white"
            >
              확인했어요 ♡
            </button>
          </div>
        </div>
      )}

      {rewardNotification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-5">
          <div className="w-full max-w-sm rounded-[34px] bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[30px] bg-pink-100 text-5xl">
              🎁
            </div>

            <p className="mt-5 text-xs font-bold tracking-[0.22em] text-pink-400">
              REWARD UNLOCKED
            </p>

            <h2 className="mt-3 text-2xl font-bold">
              🔥{" "}
              {
                rewardNotification.rewards
                  ?.required_days ??
                0
              }
              일 달성!
            </h2>

            <div className="mt-6 rounded-[24px] bg-violet-50 p-5">
              <p className="text-xl font-bold text-pink-500">
                {
                  rewardNotification.rewards
                    ?.title ??
                  "새로운 보상"
                }
              </p>
            </div>

            <Link
              href="/rewards"
              prefetch={
                false
              }
              onClick={() =>
                void closeRewardNotification()
              }
              className="mt-6 block rounded-2xl bg-gradient-to-r from-pink-500 to-fuchsia-500 px-5 py-4 font-black text-white"
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
