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
  const router = useRouter();

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

  const [items, setItems] =
    useState<StoreItem[]>([]);

  const [inventory, setInventory] =
    useState<InventoryItem[]>([]);

  const [equipment, setEquipment] =
    useState<EquipmentItem[]>([]);

  const [coupleId, setCoupleId] =
    useState("");

  const [level, setLevel] =
    useState(1);

  const [wallet, setWallet] =
    useState<CoinWallet>({
      coins: 0,
      total_earned: 0,
      total_spent: 0,
    });

  const [
    selectedCategory,
    setSelectedCategory,
  ] = useState<CategoryFilter>(
    "all"
  );

  const [
    processingItemId,
    setProcessingItemId,
  ] = useState<string | null>(
    null
  );

  const [
    equippingItemId,
    setEquippingItemId,
  ] = useState<string | null>(
    null
  );

  const [notice, setNotice] =
    useState("");

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
  // RPC 사용
  // =========================================

  const refreshInventory =
    useCallback(
      async () => {
        if (!user) {
          return [];
        }

        const {
          data,
          error,
        } = await supabase.rpc(
          "get_my_store_inventory"
        );

        if (error) {
          console.error(
            "내 인벤토리 RPC 조회 오류:",
            error
          );

          setNotice(
            `인벤토리 조회 오류: ${error.message}`
          );

          return [];
        }

        const rows =
          (data ??
            []) as InventoryItem[];

        console.log(
          "내 인벤토리:",
          rows
        );

        setInventory(
          rows
        );

        return rows;
      },
      [
        supabase,
        user,
      ]
    );

  // =========================================
  // 내 착용 아이템 새로고침
  // RPC 사용
  // =========================================

  const refreshEquipment =
    useCallback(
      async () => {
        if (!user) {
          return [];
        }

        const {
          data,
          error,
        } = await supabase.rpc(
          "get_my_character_equipment"
        );

        if (error) {
          console.error(
            "내 착용 아이템 RPC 조회 오류:",
            error
          );

          setNotice(
            `착용 정보 조회 오류: ${error.message}`
          );

          return [];
        }

        const rows =
          (data ??
            []) as EquipmentItem[];

        setEquipment(
          rows
        );

        return rows;
      },
      [
        supabase,
        user,
      ]
    );

  // =========================================
  // 상점 불러오기
  // =========================================

  const loadStore =
    useCallback(
      async () => {
        if (authLoading) {
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
          data: membership,
          error:
            membershipError,
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

        const currentCoupleId =
          membership.couple_id;

        setCoupleId(
          currentCoupleId
        );

        // =====================================
        // 레벨
        // =====================================

        const {
          data: coupleData,
          error: coupleError,
        } = await supabase
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

        if (coupleError) {
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
          )?.level ?? 1;

        setLevel(
          currentLevel
        );

        // =====================================
        // 상점 아이템
        // =====================================

        const {
          data: storeRows,
          error: storeError,
        } = await supabase
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
              ascending: true,
            }
          );

        if (storeError) {
          console.error(
            "상점 조회 오류:",
            storeError
          );

          setNotice(
            "상점 아이템을 불러오지 못했어요."
          );

          setLoading(false);
          return;
        }

        setItems(
          (storeRows ??
            []) as StoreItem[]
        );

        // =====================================
        // 동시에 개인 데이터 조회
        // =====================================

        await Promise.all([
          refreshWallet(
            currentCoupleId
          ),
          refreshInventory(),
          refreshEquipment(),
        ]);

        setLoading(false);
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
    if (
      !user ||
      !coupleId
    ) {
      return;
    }

    // 구매 직전 인벤토리 재확인
    const latestInventory =
      await refreshInventory();

    const alreadyOwned =
      latestInventory.some(
        (row) =>
          row.item_id ===
          item.id
      );

    if (alreadyOwned) {
      setNotice(
        "이미 보유 중인 아이템이에요."
      );

      return;
    }

    if (
      level <
      item.required_level
    ) {
      setNotice(
        `LV.${item.required_level}부터 구매할 수 있어요.`
      );

      return;
    }

    const latestWallet =
      await refreshWallet(
        coupleId
      );

    if (!latestWallet) {
      setNotice(
        "내 코인을 확인하지 못했어요."
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
        `"${item.name}"을 ${item.price}코인에 구매할까요?`
      );

    if (!confirmed) {
      return;
    }

    setProcessingItemId(
      item.id
    );

    setNotice("");

    const {
      data,
      error,
    } = await supabase.rpc(
      "purchase_store_item",
      {
        p_item_id:
          item.id,
      }
    );

    if (error) {
      console.error(
        "구매 오류:",
        error
      );

      setProcessingItemId(
        null
      );

      setNotice(
        error.message
      );

      await refreshInventory();
      await refreshWallet(
        coupleId
      );

      return;
    }

    const result =
      data as
        | PurchaseResult
        | null;

    if (!result?.success) {
      setProcessingItemId(
        null
      );

      setNotice(
        "구매 결과를 확인하지 못했어요."
      );

      return;
    }

    // =====================================
    // 구매 직후 화면 즉시 변경
    // =====================================

    if (
      result.inventory_id
    ) {
      setInventory(
        (current) => {
          const exists =
            current.some(
              (row) =>
                row.item_id ===
                item.id
            );

          if (exists) {
            return current;
          }

          return [
            ...current,
            {
              id:
                result.inventory_id!,
              couple_id:
                coupleId,
              user_id:
                user.id,
              item_id:
                item.id,
              purchased_price:
                item.price,
              purchased_at:
                new Date().toISOString(),
            },
          ];
        }
      );
    }

    // DB 기준으로 한 번 더 확정
    await Promise.all([
      refreshInventory(),
      refreshWallet(
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
    if (
      !user ||
      !coupleId
    ) {
      return;
    }

    const latestInventory =
      await refreshInventory();

    const owned =
      latestInventory.some(
        (row) =>
          row.item_id ===
          item.id
      );

    if (!owned) {
      setNotice(
        "먼저 아이템을 구매해주세요."
      );

      return;
    }

    const alreadyEquipped =
      equipment.some(
        (row) =>
          row.item_id ===
          item.id
      );

    if (alreadyEquipped) {
      setNotice(
        "이미 착용 중이에요."
      );

      return;
    }

    const sameSlot =
      equipment.find(
        (row) =>
          row.slot ===
          item.category
      );

    if (sameSlot) {
      const oldItem =
        items.find(
          (storeItem) =>
            storeItem.id ===
            sameSlot.item_id
        );

      const confirmed =
        window.confirm(
          oldItem
            ? `"${oldItem.name}" 대신 "${item.name}"을 착용할까요?`
            : `"${item.name}"을 착용할까요?`
        );

      if (!confirmed) {
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
    } = await supabase.rpc(
      "equip_character_item",
      {
        p_item_id:
          item.id,
      }
    );

    if (error) {
      console.error(
        "착용 오류:",
        error
      );

      setEquippingItemId(
        null
      );

      setNotice(
        error.message
      );

      await refreshEquipment();

      return;
    }

    const result =
      data as
        | EquipResult
        | null;

    if (!result?.success) {
      setEquippingItemId(
        null
      );

      setNotice(
        "착용 결과를 확인하지 못했어요."
      );

      return;
    }

    await refreshEquipment();

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
    const map:
      Record<string, string> = {
      basic_hat: "🎩",
      straw_hat: "👒",
      beret: "🔴",
      ribbon_hat: "🎀",
      knight_helmet: "🪖",
      royal_crown: "👑",
      magic_hat: "🧙",
      party_hat: "🥳",
      couple_crown: "👑",
      cozy_sofa: "🛋️",
    };

    if (map[item.item_key]) {
      return map[
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

  function getRarityLabel(
    rarity: string
  ) {
    return rarity.toUpperCase();
  }

  function getRarityClass(
    rarity: string
  ) {
    if (
      rarity === "basic"
    ) {
      return "bg-gray-50 text-gray-500";
    }

    if (
      rarity === "normal"
    ) {
      return "bg-green-50 text-green-600";
    }

    if (
      rarity === "rare"
    ) {
      return "bg-blue-50 text-blue-500";
    }

    if (
      rarity === "special"
    ) {
      return "bg-purple-50 text-purple-500";
    }

    if (
      rarity === "premium"
    ) {
      return "bg-amber-50 text-amber-600";
    }

    return "bg-pink-50 text-pink-500";
  }

  const equippedCount =
    equipment.length;

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

        <header>

          <Link
            href="/couple"
            prefetch={false}
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

        <section className="mt-7 overflow-hidden rounded-[30px] border border-pink-100 bg-gradient-to-br from-white to-pink-50/70 p-5 shadow-sm">

          <div className="flex items-center justify-between gap-4">

            <div>

              <p className="text-xs font-semibold tracking-[0.16em] text-pink-400">
                MY COIN
              </p>

              <p className="mt-2 text-3xl font-bold">
                🪙 {wallet.coins}

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

        <section className="mt-6">

          <div className="-mx-5 overflow-x-auto px-5">

            <div className="flex w-max gap-2 pb-1">

              {categories.map(
                (category) => {

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

        {notice && (
          <div className="mt-5 rounded-2xl border border-pink-100 bg-white px-4 py-3 text-center text-sm text-gray-600 shadow-sm">
            {notice}
          </div>
        )}

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

          <div className="grid grid-cols-2 gap-3">

            {visibleItems.map(
              (item) => {

                const owned =
                  inventory.some(
                    (row) =>
                      row.item_id ===
                      item.id
                  );

                const equipped =
                  equipment.some(
                    (row) =>
                      row.item_id ===
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

                    <div className="relative">

                      <div className="flex aspect-square w-full items-center justify-center rounded-[22px] bg-[#fff8fb] text-6xl">
                        {getItemEmoji(
                          item
                        )}
                      </div>

                      {equipped && (
                        <div className="absolute right-2 top-2 rounded-full bg-pink-500 px-2.5 py-1 text-[10px] font-bold text-white">
                          착용 중
                        </div>
                      )}

                      {owned &&
                        !equipped &&
                        !locked && (
                        <div className="absolute right-2 top-2 rounded-full bg-green-500 px-2.5 py-1 text-[10px] font-bold text-white">
                          구매 완료
                        </div>
                      )}

                      {locked && (
                        <div className="absolute inset-0 flex items-center justify-center rounded-[22px] bg-white/70">

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

                    <h3 className="mt-2 min-h-[48px] break-words text-base font-bold leading-6">
                      {item.name}
                    </h3>

                    <p className="mt-1 line-clamp-2 min-h-[40px] text-xs leading-5 text-gray-400">
                      {item.description ??
                        "내 캐릭터를 꾸며주는 아이템이에요."}
                    </p>

                    <div className="mt-3 flex items-center justify-between">

                      <p className="font-bold text-amber-500">
                        🪙 {item.price}
                      </p>

                      <p className="text-[10px] text-gray-400">
                        LV.{item.required_level}
                      </p>

                    </div>

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
                        className="mt-3 w-full rounded-2xl border border-pink-200 bg-white px-3 py-3 text-sm font-semibold text-pink-500"
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
                        className={`mt-3 w-full rounded-2xl px-3 py-3 text-sm font-semibold ${
                          notEnoughCoins
                            ? "bg-gray-100 text-gray-400"
                            : "bg-pink-500 text-white"
                        }`}
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

        </section>

      </div>

    </main>
  );
}
