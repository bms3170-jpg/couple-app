"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";

type StoreItem = {
  id: string;
  item_key: string;
  name: string;
  description: string | null;
  category: string;
  price: number;
  required_level: number;
  rarity: string;
  image_path: string | null;
  is_active: boolean;
  sort_order: number;
};

type InventoryItem = {
  id: string;
  couple_id: string;
  user_id: string;
  item_id: string;
  purchased_price: number;
  purchased_at: string;
};

type EquipmentItem = {
  id: string;
  couple_id: string;
  user_id: string;
  slot: string;
  item_id: string;
  equipped_at: string;
};

type CoupleInfo = {
  level: number;
};

type CoinWallet = {
  coins: number;
  total_earned: number;
  total_spent: number;
};

type PurchaseResult = {
  success?: boolean;
  inventory_id?: string;
  item_id?: string;
  item_name?: string;
  price?: number;
  remaining_coins?: number;
};

type EquipResult = {
  success?: boolean;
  equipment_id?: string;
  item_id?: string;
  item_name?: string;
  slot?: string;
};

type CategoryFilter =
  | "all"
  | "hat"
  | "clothes"
  | "accessory"
  | "background"
  | "furniture"
  | "couple";

export default function StorePage() {
  const router =
    useRouter();

  const supabase =
    useMemo(
      () =>
        createClient(),
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
    items,
    setItems,
  ] =
    useState<StoreItem[]>(
      []
    );

  const [
    inventory,
    setInventory,
  ] =
    useState<InventoryItem[]>(
      []
    );

  const [
    equipment,
    setEquipment,
  ] =
    useState<EquipmentItem[]>(
      []
    );

  const [
    coupleId,
    setCoupleId,
  ] = useState("");

  const [
    level,
    setLevel,
  ] = useState(1);

  const [
    wallet,
    setWallet,
  ] =
    useState<CoinWallet>({
      coins: 0,
      total_earned: 0,
      total_spent: 0,
    });

  const [
    selectedCategory,
    setSelectedCategory,
  ] =
    useState<CategoryFilter>(
      "all"
    );

  const [
    processingItemId,
    setProcessingItemId,
  ] =
    useState<string | null>(
      null
    );

  const [
    equippingItemId,
    setEquippingItemId,
  ] =
    useState<string | null>(
      null
    );

  const [
    notice,
    setNotice,
  ] = useState("");

  // =========================================
  // 내 코인 새로고침
  // =========================================

  const refreshWallet =
    useCallback(
      async (
        currentCoupleId: string
      ) => {
        if (
          !user ||
          !currentCoupleId
        ) {
          return null;
        }

        const {
          data,
          error,
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
            currentCoupleId
          )
          .eq(
            "user_id",
            user.id
          )
          .maybeSingle();

        if (error) {
          console.error(
            "내 코인 조회 오류:",
            error
          );

          return null;
        }

        const nextWallet:
          CoinWallet =
          data
            ? (data as CoinWallet)
            : {
                coins: 0,
                total_earned: 0,
                total_spent: 0,
              };

        setWallet(
          nextWallet
        );

        return nextWallet;
      },
      [
        supabase,
        user,
      ]
    );

  // =========================================
  // 내 인벤토리 새로고침
  // =========================================

  const refreshInventory =
    useCallback(
      async (
        currentCoupleId: string
      ) => {
        if (
          !user ||
          !currentCoupleId
        ) {
          return;
        }

        const {
          data,
          error,
        } = await supabase
          .from(
            "user_inventory"
          )
          .select(`
            id,
            couple_id,
            user_id,
            item_id,
            purchased_price,
            purchased_at
          `)
          .eq(
            "couple_id",
            currentCoupleId
          )
          .eq(
            "user_id",
            user.id
          )
          .order(
            "purchased_at",
            {
              ascending: false,
            }
          );

        if (error) {
          console.error(
            "내 인벤토리 조회 오류:",
            error
          );

          return;
        }

        setInventory(
          (data ??
            []) as InventoryItem[]
        );
      },
      [
        supabase,
        user,
      ]
    );

  // =========================================
  // 내 장비 새로고침
  // =========================================

  const refreshEquipment =
    useCallback(
      async (
        currentCoupleId: string
      ) => {
        if (
          !user ||
          !currentCoupleId
        ) {
          return;
        }

        const {
          data,
          error,
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
            currentCoupleId
          )
          .eq(
            "user_id",
            user.id
          );

        if (error) {
          console.error(
            "내 착용 아이템 조회 오류:",
            error
          );

          return;
        }

        setEquipment(
          (data ??
            []) as EquipmentItem[]
        );
      },
      [
        supabase,
        user,
      ]
    );

  // =========================================
  // 상점 데이터 불러오기
  // =========================================

  const loadStore =
    useCallback(
      async () => {
        if (
          authLoading
        ) {
          return;
        }

        if (!user) {
          router.replace(
            "/login"
          );
          return;
        }

        setLoading(true);
        setNotice("");

        // =====================================
        // 내가 속한 커플
        // =====================================

        const {
          data:
            membership,
          error:
            membershipError,
        } =
          await supabase
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

          setLoading(
            false
          );

          return;
        }

        const currentCoupleId =
          membership.couple_id;

        setCoupleId(
          currentCoupleId
        );

        // =====================================
        // 우리 레벨
        // =====================================

        const {
          data:
            coupleData,
          error:
            coupleError,
        } =
          await supabase
            .from(
              "couples"
            )
            .select(
              "level"
            )
            .eq(
              "id",
              currentCoupleId
            )
            .maybeSingle();

        if (
          coupleError
        ) {
          console.error(
            "커플 레벨 조회 오류:",
            coupleError
          );
        }

        const currentLevel =
          (
            coupleData as
              | CoupleInfo
              | null
          )?.level ??
          1;

        setLevel(
          currentLevel
        );

        // =====================================
        // 내 코인
        // =====================================

        await refreshWallet(
          currentCoupleId
        );

        // =====================================
        // 상점 아이템
        // =====================================

        const {
          data:
            storeRows,
          error:
            storeError,
        } =
          await supabase
            .from(
              "store_items"
            )
            .select(`
              id,
              item_key,
              name,
              description,
              category,
              price,
              required_level,
              rarity,
              image_path,
              is_active,
              sort_order
            `)
            .eq(
              "is_active",
              true
            )
            .order(
              "sort_order",
              {
                ascending:
                  true,
              }
            );

        if (
          storeError
        ) {
          console.error(
            "상점 아이템 조회 오류:",
            storeError
          );

          setNotice(
            "상점 아이템을 불러오지 못했어요."
          );

          setLoading(
            false
          );

          return;
        }

        setItems(
          (storeRows ??
            []) as StoreItem[]
        );

        // =====================================
        // 내 인벤토리
        // =====================================

        await refreshInventory(
          currentCoupleId
        );

        // =====================================
        // 내 착용 아이템
        // =====================================

        await refreshEquipment(
          currentCoupleId
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
        refreshWallet,
        refreshInventory,
        refreshEquipment,
      ]
    );

  useEffect(() => {
    void loadStore();
  }, [
    loadStore,
  ]);

  // =========================================
  // 구매
  // =========================================

  async function handlePurchase(
    item: StoreItem
  ) {
    if (!user) {
      router.replace(
        "/login"
      );

      return;
    }

    if (!coupleId) {
      setNotice(
        "커플 정보를 찾을 수 없어요."
      );

      return;
    }

    // =====================================
    // 이미 내가 구매했는지 확인
    // =====================================

    const alreadyOwned =
      inventory.some(
        (
          inventoryItem
        ) =>
          inventoryItem.item_id ===
          item.id
      );

    if (
      alreadyOwned
    ) {
      setNotice(
        "이미 구매한 아이템이에요."
      );

      return;
    }

    // =====================================
    // 레벨 확인
    // =====================================

    if (
      level <
      item.required_level
    ) {
      setNotice(
        `LV.${item.required_level}부터 구매할 수 있어요.`
      );

      return;
    }

    // =====================================
    // 실제 내 코인 잔액 재확인
    // =====================================

    const latestWallet =
      await refreshWallet(
        coupleId
      );

    if (
      !latestWallet
    ) {
      setNotice(
        "내 코인 정보를 확인하지 못했어요."
      );

      return;
    }

    if (
      latestWallet.coins <
      item.price
    ) {
      setNotice(
        `코인이 부족해요. ${
          item.price -
          latestWallet.coins
        }코인이 더 필요해요.`
      );

      return;
    }

    const confirmed =
      window.confirm(
        `"${item.name}"을 ${item.price}코인에 구매할까요?\n\n내 코인에서 차감돼요.`
      );

    if (
      !confirmed
    ) {
      return;
    }

    setProcessingItemId(
      item.id
    );

    setNotice("");

    const {
      data,
      error,
    } =
      await supabase.rpc(
        "purchase_store_item",
        {
          p_item_id:
            item.id,
        }
      );

    if (error) {
      console.error(
        "아이템 구매 오류:",
        error
      );

      setProcessingItemId(
        null
      );

      await refreshWallet(
        coupleId
      );

      await refreshInventory(
        coupleId
      );

      setNotice(
        error.message ||
          "아이템을 구매하지 못했어요."
      );

      return;
    }

    const result =
      data as
        | PurchaseResult
        | null;

    if (
      !result?.success
    ) {
      setProcessingItemId(
        null
      );

      await refreshWallet(
        coupleId
      );

      await refreshInventory(
        coupleId
      );

      setNotice(
        "구매 결과를 확인하지 못했어요."
      );

      return;
    }

    // =====================================
    // DB 실제 상태 다시 조회
    // =====================================

    await Promise.all([
      refreshWallet(
        coupleId
      ),

      refreshInventory(
        coupleId
      ),
    ]);

    setProcessingItemId(
      null
    );

    setNotice(
      `${item.name} 구매 완료! 이제 내 캐릭터에 착용할 수 있어요 ♡`
    );
  }

  // =========================================
  // 착용
  // =========================================

  async function handleEquip(
    item: StoreItem
  ) {
    if (!user) {
      router.replace(
        "/login"
      );

      return;
    }

    if (!coupleId) {
      setNotice(
        "커플 정보를 찾을 수 없어요."
      );

      return;
    }

    // =====================================
    // 내 아이템인지 확인
    // =====================================

    const owned =
      inventory.some(
        (
          inventoryItem
        ) =>
          inventoryItem.item_id ===
          item.id
      );

    if (!owned) {
      setNotice(
        "먼저 아이템을 구매해주세요."
      );

      return;
    }

    // =====================================
    // 이미 내가 착용 중인지
    // =====================================

    const alreadyEquipped =
      equipment.some(
        (
          equipmentItem
        ) =>
          equipmentItem.item_id ===
          item.id
      );

    if (
      alreadyEquipped
    ) {
      setNotice(
        "이미 착용 중인 아이템이에요."
      );

      return;
    }

    // =====================================
    // 같은 슬롯 기존 아이템 확인
    // =====================================

    const sameSlotEquipment =
      equipment.find(
        (
          equipmentItem
        ) =>
          equipmentItem.slot ===
          item.category
      );

    if (
      sameSlotEquipment
    ) {
      const oldItem =
        items.find(
          (
            storeItem
          ) =>
            storeItem.id ===
            sameSlotEquipment.item_id
        );

      const confirmed =
        window.confirm(
          oldItem
            ? `"${oldItem.name}" 대신 "${item.name}"을 착용할까요?`
            : `"${item.name}"을 착용할까요?`
        );

      if (
        !confirmed
      ) {
        return;
      }
    }

    setEquippingItemId(
      item.id
    );

    setNotice("");

    const {
      data,
      error,
    } =
      await supabase.rpc(
        "equip_character_item",
        {
          p_item_id:
            item.id,
        }
      );

    if (error) {
      console.error(
        "아이템 착용 오류:",
        error
      );

      setEquippingItemId(
        null
      );

      await refreshEquipment(
        coupleId
      );

      setNotice(
        error.message ||
          "아이템을 착용하지 못했어요."
      );

      return;
    }

    const result =
      data as
        | EquipResult
        | null;

    if (
      !result?.success
    ) {
      setEquippingItemId(
        null
      );

      await refreshEquipment(
        coupleId
      );

      setNotice(
        "착용 결과를 확인하지 못했어요."
      );

      return;
    }

    // =====================================
    // 실제 DB 장비 다시 조회
    // =====================================

    await refreshEquipment(
      coupleId
    );

    setEquippingItemId(
      null
    );

    setNotice(
      `${item.name} 착용 완료! 내 캐릭터에 적용됐어요 ♡`
    );
  }

  // =========================================
  // 카테고리
  // =========================================

  const categories: {
    value: CategoryFilter;
    label: string;
    emoji: string;
  }[] = [
    {
      value: "all",
      label: "전체",
      emoji: "✨",
    },
    {
      value: "hat",
      label: "모자",
      emoji: "🎩",
    },
    {
      value: "clothes",
      label: "옷",
      emoji: "👕",
    },
    {
      value: "accessory",
      label: "액세서리",
      emoji: "🎀",
    },
    {
      value: "background",
      label: "배경",
      emoji: "🌷",
    },
    {
      value: "furniture",
      label: "가구",
      emoji: "🛋️",
    },
    {
      value: "couple",
      label: "커플",
      emoji: "💕",
    },
  ];

  const visibleItems =
    selectedCategory ===
    "all"
      ? items
      : items.filter(
          (item) =>
            item.category ===
            selectedCategory
        );

  // =========================================
  // 아이템 이모지
  // =========================================

  function getItemEmoji(
    item: StoreItem
  ) {
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

      cozy_sofa:
        "🛋️",
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
      "background"
    ) {
      return "🌸";
    }

    if (
      item.category ===
      "furniture"
    ) {
      return "🛋️";
    }

    if (
      item.category ===
      "couple"
    ) {
      return "💕";
    }

    return "🎁";
  }

  // =========================================
  // 희귀도
  // =========================================

  function getRarityLabel(
    rarity: string
  ) {
    if (
      rarity ===
      "basic"
    ) {
      return "BASIC";
    }

    if (
      rarity ===
      "normal"
    ) {
      return "NORMAL";
    }

    if (
      rarity ===
      "rare"
    ) {
      return "RARE";
    }

    if (
      rarity ===
      "special"
    ) {
      return "SPECIAL";
    }

    if (
      rarity ===
      "premium"
    ) {
      return "PREMIUM";
    }

    return rarity.toUpperCase();
  }

  function getRarityClass(
    rarity: string
  ) {
    if (
      rarity ===
      "basic"
    ) {
      return "bg-gray-50 text-gray-500";
    }

    if (
      rarity ===
      "normal"
    ) {
      return "bg-green-50 text-green-600";
    }

    if (
      rarity ===
      "rare"
    ) {
      return "bg-blue-50 text-blue-500";
    }

    if (
      rarity ===
      "special"
    ) {
      return "bg-purple-50 text-purple-500";
    }

    if (
      rarity ===
      "premium"
    ) {
      return "bg-amber-50 text-amber-600";
    }

    return "bg-pink-50 text-pink-500";
  }

  const equippedCount =
    equipment.length;

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
          상점 불러오는 중...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fff8fb] px-5 py-8 text-[#2b2b2b]">

      <div className="mx-auto max-w-md pb-16">

        {/* =====================================
            상단
        ====================================== */}

        <header>

          <Link
            href="/couple"
            prefetch={
              false
            }
            className="inline-block text-sm font-semibold text-gray-500"
          >
            ← 돌아가기
          </Link>

          <div className="mt-8 flex items-end justify-between gap-4">

            <div>

              <p className="text-xs font-semibold tracking-[0.2em] text-pink-400">
                MY STORE
              </p>

              <h1 className="mt-2 text-3xl font-bold">
                캐릭터 상점 ♡
              </h1>

              <p className="mt-2 text-sm leading-6 text-gray-500">
                내가 모은 코인으로
                <br />
                내 캐릭터를 꾸며봐요.
              </p>

            </div>

            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] bg-white text-2xl shadow-sm">
              🛍️
            </div>

          </div>

        </header>

        {/* =====================================
            내 코인 / 레벨
        ====================================== */}

        <section className="mt-7 overflow-hidden rounded-[30px] border border-pink-100 bg-gradient-to-br from-white to-pink-50/70 p-5 shadow-sm">

          <div className="flex items-center justify-between gap-4">

            <div>

              <p className="text-xs font-semibold tracking-[0.16em] text-pink-400">
                MY COIN
              </p>

              <p className="mt-2 text-3xl font-bold">

                🪙{" "}
                {wallet.coins}

                <span className="ml-1 text-base font-semibold text-gray-400">
                  개
                </span>

              </p>

              <p className="mt-1 text-[11px] text-gray-400">
                내가 사용할 수 있는 코인이에요.
              </p>

            </div>

            <div className="flex gap-2">

              <div className="rounded-2xl bg-white/90 px-3 py-3 text-center shadow-sm">

                <p className="text-[10px] text-gray-400">
                  착용 중
                </p>

                <p className="mt-1 text-lg font-bold text-pink-500">
                  {equippedCount}
                </p>

              </div>

              <div className="rounded-2xl bg-white/90 px-3 py-3 text-center shadow-sm">

                <p className="text-[10px] text-gray-400">
                  우리 레벨
                </p>

                <p className="mt-1 text-lg font-bold text-pink-500">
                  LV.{level}
                </p>

              </div>

            </div>

          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">

            <div className="rounded-2xl bg-white/70 px-4 py-3">

              <p className="text-[10px] text-gray-400">
                지금까지 획득
              </p>

              <p className="mt-1 text-sm font-bold text-gray-700">
                {wallet.total_earned} 코인
              </p>

            </div>

            <div className="rounded-2xl bg-white/70 px-4 py-3">

              <p className="text-[10px] text-gray-400">
                지금까지 사용
              </p>

              <p className="mt-1 text-sm font-bold text-gray-700">
                {wallet.total_spent} 코인
              </p>

            </div>

          </div>

        </section>

        {/* =====================================
            카테고리
        ====================================== */}

        <section className="mt-6">

          <div className="-mx-5 overflow-x-auto px-5">

            <div className="flex w-max gap-2 pb-1">

              {categories.map(
                (
                  category
                ) => {

                  const selected =
                    selectedCategory ===
                    category.value;

                  return (

                    <button
                      key={
                        category.value
                      }
                      type="button"
                      onClick={() =>
                        setSelectedCategory(
                          category.value
                        )
                      }
                      className={`rounded-full border px-4 py-2.5 text-sm font-semibold transition ${
                        selected
                          ? "border-pink-500 bg-pink-500 text-white shadow-sm"
                          : "border-pink-100 bg-white text-gray-500"
                      }`}
                    >
                      {category.emoji}{" "}
                      {category.label}
                    </button>

                  );
                }
              )}

            </div>

          </div>

        </section>

        {/* =====================================
            메시지
        ====================================== */}

        {notice && (

          <div className="mt-5 rounded-2xl border border-pink-100 bg-white px-4 py-3 text-center text-sm text-gray-600 shadow-sm">
            {notice}
          </div>

        )}

        {/* =====================================
            상품
        ====================================== */}

        <section className="mt-6">

          <div className="mb-3 flex items-end justify-between">

            <div>

              <p className="text-xs font-semibold tracking-[0.18em] text-pink-400">
                ITEMS
              </p>

              <h2 className="mt-1 text-lg font-bold">
                아이템 둘러보기
              </h2>

            </div>

            <span className="text-[11px] text-gray-400">
              {visibleItems.length}개
            </span>

          </div>

          {visibleItems.length ===
          0 ? (

            <div className="rounded-[28px] border border-dashed border-pink-200 bg-white px-6 py-12 text-center">

              <div className="text-4xl">
                🎁
              </div>

              <p className="mt-4 font-bold">
                아직 아이템이 없어요
              </p>

            </div>

          ) : (

            <div className="grid grid-cols-2 gap-3">

              {visibleItems.map(
                (
                  item
                ) => {

                  const owned =
                    inventory.some(
                      (
                        inventoryItem
                      ) =>
                        inventoryItem.item_id ===
                        item.id
                    );

                  const equipped =
                    equipment.some(
                      (
                        equipmentItem
                      ) =>
                        equipmentItem.item_id ===
                        item.id
                    );

                  const locked =
                    level <
                    item.required_level;

                  const notEnoughCoins =
                    wallet.coins <
                    item.price;

                  const processing =
                    processingItemId ===
                    item.id;

                  const equipping =
                    equippingItemId ===
                    item.id;

                  return (

                    <article
                      key={
                        item.id
                      }
                      className={`relative overflow-hidden rounded-[26px] border bg-white p-4 shadow-sm ${
                        equipped
                          ? "border-pink-300 ring-2 ring-pink-100"
                          : owned
                          ? "border-green-100"
                          : locked
                          ? "border-gray-100"
                          : "border-pink-100"
                      }`}
                    >

                      {/* 이미지 */}

                      <div className="relative">

                        <div className="flex aspect-square w-full items-center justify-center rounded-[22px] bg-[#fff8fb] text-6xl">

                          {getItemEmoji(
                            item
                          )}

                        </div>

                        {equipped && (

                          <div className="absolute right-2 top-2 rounded-full bg-pink-500 px-2.5 py-1 text-[10px] font-bold text-white shadow-sm">
                            착용 중
                          </div>

                        )}

                        {owned &&
                          !equipped &&
                          !locked && (

                          <div className="absolute right-2 top-2 rounded-full bg-green-500 px-2.5 py-1 text-[10px] font-bold text-white shadow-sm">
                            구매 완료
                          </div>

                        )}

                        {locked && (

                          <div className="absolute inset-0 flex items-center justify-center rounded-[22px] bg-white/70 backdrop-blur-[1px]">

                            <div className="text-center">

                              <div className="text-2xl">
                                🔒
                              </div>

                              <p className="mt-1 text-xs font-bold text-gray-500">
                                LV.{item.required_level}
                              </p>

                            </div>

                          </div>

                        )}

                      </div>

                      {/* 등급 */}

                      <div className="mt-3">

                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[9px] font-bold tracking-[0.1em] ${getRarityClass(
                            item.rarity
                          )}`}
                        >
                          {getRarityLabel(
                            item.rarity
                          )}
                        </span>

                      </div>

                      {/* 이름 */}

                      <h3 className="mt-2 min-h-[48px] break-words text-base font-bold leading-6">
                        {item.name}
                      </h3>

                      {/* 설명 */}

                      <p className="mt-1 line-clamp-2 min-h-[40px] text-xs leading-5 text-gray-400">

                        {item.description ??
                          "내 캐릭터를 꾸며주는 아이템이에요."}

                      </p>

                      {/* 가격 */}

                      <div className="mt-3 flex items-center justify-between">

                        <p className="font-bold text-amber-500">
                          🪙 {item.price}
                        </p>

                        <p className="text-[10px] text-gray-400">
                          LV.{item.required_level}
                        </p>

                      </div>

                      {/* 버튼 */}

                      {equipped ? (

                        <div className="mt-3 rounded-2xl border border-pink-200 bg-pink-50 px-3 py-3 text-center text-sm font-semibold text-pink-500">
                          ✓ 착용 중
                        </div>

                      ) : owned ? (

                        <button
                          type="button"
                          disabled={
                            equipping
                          }
                          onClick={() =>
                            handleEquip(
                              item
                            )
                          }
                          className="mt-3 w-full rounded-2xl border border-pink-200 bg-white px-3 py-3 text-sm font-semibold text-pink-500 shadow-sm transition hover:bg-pink-50 active:scale-[0.99] disabled:opacity-50"
                        >
                          {equipping
                            ? "착용 중..."
                            : "착용하기"}
                        </button>

                      ) : locked ? (

                        <div className="mt-3 rounded-2xl bg-gray-50 px-3 py-3 text-center text-sm font-semibold text-gray-400">
                          🔒 레벨 잠금
                        </div>

                      ) : (

                        <button
                          type="button"
                          disabled={
                            processing ||
                            notEnoughCoins
                          }
                          onClick={() =>
                            handlePurchase(
                              item
                            )
                          }
                          className={`mt-3 w-full rounded-2xl px-3 py-3 text-sm font-semibold transition ${
                            notEnoughCoins
                              ? "cursor-not-allowed bg-gray-100 text-gray-400"
                              : "bg-pink-500 text-white shadow-sm hover:bg-pink-600 active:scale-[0.99]"
                          } disabled:opacity-60`}
                        >

                          {processing
                            ? "구매 중..."
                            : notEnoughCoins
                            ? "코인 부족"
                            : "구매하기"}

                        </button>

                      )}

                    </article>

                  );
                }
              )}

            </div>

          )}

        </section>

        {/* =====================================
            안내
        ====================================== */}

        <section className="mt-6 rounded-[26px] border border-pink-100 bg-white p-5 shadow-sm">

          <div className="flex items-start gap-3">

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-pink-50 text-xl">
              💡
            </div>

            <div>

              <p className="font-bold">
                상점 이용 안내
              </p>

              <p className="mt-2 text-sm leading-6 text-gray-500">
                구매하면 가격만큼 내 코인이 차감돼요.
                <br />
                내가 구매한 아이템은 내 캐릭터에만 사용할 수 있어요.
                <br />
                구매한 아이템은 언제든 다시 착용할 수 있어요.
                <br />
                같은 종류의 아이템을 새로 착용하면
                내 기존 아이템만 자동으로 교체돼요.
              </p>

            </div>

          </div>

        </section>

      </div>

    </main>
  );
}
