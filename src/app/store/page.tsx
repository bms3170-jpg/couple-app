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

type Animal =
  | "dog"
  | "cat"
  | "penguin"
  | "red_panda";

type AnimalPath =
  | "dog"
  | "cat"
  | "penguin"
  | "red-panda";

type Stage =
  | "baby"
  | "child"
  | "teen"
  | "adult";

type InventoryRow = {
  id: string;
  couple_id: string;
  user_id: string;
  item_id: string;
  purchased_price: number;
  purchased_at: string;
};

type EquipmentRow = {
  id: string;
  couple_id: string;
  user_id: string;
  slot: string;
  item_id: string;
  equipped_at: string;
};

type StoreItem = {
  id: string;
  item_key: string;
  name: string;
  description: string | null;
  category: string;
  image_path: string | null;
  required_level: number;
  rarity: string;
};

type Fit = {
  x: number;
  y: number;
  scale: number;
  rotation: number;
};

type CategoryFilter =
  | "all"
  | "hat"
  | "clothes"
  | "accessory";

const DEFAULT_FITS: Record<
  "hat" | "clothes" | "accessory",
  Fit
> = {
  hat: {
    x: 50,
    y: 5,
    scale: 78,
    rotation: 0,
  },

  clothes: {
    x: 50,
    y: 58,
    scale: 78,
    rotation: 0,
  },

  accessory: {
    x: 50,
    y: 48,
    scale: 42,
    rotation: 0,
  },
};

const CATEGORIES: {
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
];

function getStage(
  level: number
): Stage {
  if (level <= 2) {
    return "baby";
  }

  if (level <= 4) {
    return "child";
  }

  if (level <= 6) {
    return "teen";
  }

  return "adult";
}

function getAnimalPath(
  animal: Animal
): AnimalPath {
  return animal === "red_panda"
    ? "red-panda"
    : animal;
}

function getStageLabel(
  stage: Stage
) {
  if (stage === "baby") {
    return "아기";
  }

  if (stage === "child") {
    return "꼬마";
  }

  if (stage === "teen") {
    return "청년";
  }

  return "성년";
}

function getAnimalLabel(
  animal: Animal
) {
  if (animal === "dog") {
    return "강아지";
  }

  if (animal === "cat") {
    return "고양이";
  }

  if (animal === "penguin") {
    return "펭귄";
  }

  return "레서판다";
}

function normalizeImagePath(
  path: string | null
) {
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

export default function InventoryPage() {
  const router = useRouter();

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
    saving,
    setSaving,
  ] = useState(false);

  const [
    coupleId,
    setCoupleId,
  ] = useState("");

  const [
    level,
    setLevel,
  ] = useState(1);

  const [
    animal,
    setAnimal,
  ] = useState<Animal | null>(
    null
  );

  const [
    inventory,
    setInventory,
  ] = useState<InventoryRow[]>([]);

  const [
    items,
    setItems,
  ] = useState<StoreItem[]>([]);

  const [
    equipment,
    setEquipment,
  ] = useState<EquipmentRow[]>([]);

  const [
    selectedCategory,
    setSelectedCategory,
  ] = useState<CategoryFilter>(
    "all"
  );

  const [
    selectedItemId,
    setSelectedItemId,
  ] = useState<string | null>(
    null
  );

  const [
    editMode,
    setEditMode,
  ] = useState(false);

  const [
    fit,
    setFit,
  ] = useState<Fit>({
    x: 50,
    y: 5,
    scale: 78,
    rotation: 0,
  });

  const [
    notice,
    setNotice,
  ] = useState("");

  const stage =
    getStage(level);

  const animalPath =
    animal
      ? getAnimalPath(animal)
      : null;

  const characterImagePath =
    animalPath
      ? `/characters/${animalPath}/${stage}.png`
      : null;

  const selectedItem =
    items.find(
      (item) =>
        item.id ===
        selectedItemId
    ) ?? null;

  const selectedImagePath =
    normalizeImagePath(
      selectedItem?.image_path ??
        null
    );

  const visibleItems =
    selectedCategory === "all"
      ? items
      : items.filter(
          (item) =>
            item.category ===
            selectedCategory
        );

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
            "착용 정보 조회 오류:",
            error
          );

          return [];
        }

        const rows =
          (data ??
            []) as EquipmentRow[];

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

  const loadInventory =
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

        if (
          membershipError ||
          !membership
        ) {
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

        const [
          coupleResult,
          characterResult,
          inventoryResult,
        ] = await Promise.all([
          supabase
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
            .maybeSingle(),

          supabase
            .from(
              "couple_characters"
            )
            .select(
              "character_type"
            )
            .eq(
              "couple_id",
              currentCoupleId
            )
            .maybeSingle(),

          supabase.rpc(
            "get_my_store_inventory"
          ),
        ]);

        if (
          coupleResult.error
        ) {
          console.error(
            "레벨 조회 오류:",
            coupleResult.error
          );
        }

        const nextLevel =
          coupleResult.data
            ?.level ??
          1;

        setLevel(
          nextLevel
        );

        if (
          characterResult.error
        ) {
          console.error(
            "캐릭터 조회 오류:",
            characterResult.error
          );
        }

        const nextAnimal =
          characterResult.data
            ?.character_type as
            | Animal
            | null;

        setAnimal(
          nextAnimal
        );

        if (
          inventoryResult.error
        ) {
          setNotice(
            `인벤토리 조회 오류: ${inventoryResult.error.message}`
          );

          setLoading(false);
          return;
        }

        const inventoryRows =
          (inventoryResult.data ??
            []) as InventoryRow[];

        setInventory(
          inventoryRows
        );

        const itemIds =
          Array.from(
            new Set(
              inventoryRows.map(
                (row) =>
                  row.item_id
              )
            )
          );

        if (
          itemIds.length > 0
        ) {
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
              image_path,
              required_level,
              rarity
            `)
            .in(
              "id",
              itemIds
            )
            .in(
              "category",
              [
                "hat",
                "clothes",
                "accessory",
              ]
            )
            .order(
              "sort_order",
              {
                ascending: true,
              }
            );

          if (storeError) {
            console.error(
              "아이템 조회 오류:",
              storeError
            );

            setNotice(
              "보유 아이템 정보를 불러오지 못했어요."
            );
          } else {
            setItems(
              (storeRows ??
                []) as StoreItem[]
            );
          }
        } else {
          setItems([]);
        }

        await refreshEquipment();

        setLoading(false);
      },
      [
        authLoading,
        user,
        router,
        supabase,
        refreshEquipment,
      ]
    );

  useEffect(() => {
    void loadInventory();
  }, [
    loadInventory,
  ]);

  async function loadPosition(
    item: StoreItem
  ) {
    if (
      !user ||
      !animal
    ) {
      return;
    }

    const slot =
      item.category === "hat" ||
      item.category === "clothes" ||
      item.category === "accessory"
        ? item.category
        : "accessory";

    const defaultFit =
      DEFAULT_FITS[slot];

    const {
      data,
      error,
    } = await supabase
      .from(
        "character_item_positions"
      )
      .select(`
        x,
        y,
        scale,
        rotation
      `)
      .eq(
        "user_id",
        user.id
      )
      .eq(
        "item_id",
        item.id
      )
      .eq(
        "animal",
        animal
      )
      .eq(
        "stage",
        stage
      )
      .maybeSingle();

    if (error) {
      console.error(
        "위치 조회 오류:",
        error
      );

      setFit(
        defaultFit
      );

      return;
    }

    if (data) {
      setFit({
        x: Number(
          data.x
        ),

        y: Number(
          data.y
        ),

        scale: Number(
          data.scale
        ),

        rotation: Number(
          data.rotation
        ),
      });
    } else {
      setFit({
        ...defaultFit,
      });
    }
  }

  async function selectItem(
    item: StoreItem
  ) {
    setSelectedItemId(
      item.id
    );

    setEditMode(
      true
    );

    await loadPosition(
      item
    );
  }

  async function handleEquip(
    item: StoreItem
  ) {
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
      setNotice(
        error.message
      );

      return;
    }

    if (!data) {
      setNotice(
        "꾸미기 결과를 확인하지 못했어요."
      );

      return;
    }

    await refreshEquipment();

    setSelectedItemId(
      item.id
    );

    await loadPosition(
      item
    );

    setEditMode(
      true
    );

    setNotice(
      `${item.name} 꾸미기 완료 ♡`
    );
  }

  function updateFit(
    patch: Partial<Fit>
  ) {
    setFit(
      (current) => ({
        ...current,
        ...patch,
      })
    );
  }

  function moveX(
    amount: number
  ) {
    updateFit({
      x: Math.max(
        0,
        Math.min(
          100,
          fit.x + amount
        )
      ),
    });
  }

  function moveY(
    amount: number
  ) {
    updateFit({
      y: Math.max(
        -30,
        Math.min(
          110,
          fit.y + amount
        )
      ),
    });
  }

  function resize(
    amount: number
  ) {
    updateFit({
      scale: Math.max(
        20,
        Math.min(
          140,
          fit.scale + amount
        )
      ),
    });
  }

  function rotate(
    amount: number
  ) {
    updateFit({
      rotation: Math.max(
        -30,
        Math.min(
          30,
          fit.rotation + amount
        )
      ),
    });
  }

  function resetFit() {
    if (!selectedItem) {
      return;
    }

    const slot =
      selectedItem.category === "hat" ||
      selectedItem.category === "clothes" ||
      selectedItem.category === "accessory"
        ? selectedItem.category
        : "accessory";

    setFit({
      ...DEFAULT_FITS[slot],
    });
  }

  async function saveFit() {
    if (
      !user ||
      !animal ||
      !coupleId ||
      !selectedItem
    ) {
      return;
    }

    setSaving(true);
    setNotice("");

    const {
      error,
    } = await supabase
      .from(
        "character_item_positions"
      )
      .upsert(
        {
          couple_id:
            coupleId,

          user_id:
            user.id,

          item_id:
            selectedItem.id,

          animal,

          stage,

          x:
            fit.x,

          y:
            fit.y,

          scale:
            fit.scale,

          rotation:
            fit.rotation,

          updated_at:
            new Date().toISOString(),
        },
        {
          onConflict:
            "user_id,item_id,animal,stage",
        }
      );

    setSaving(false);

    if (error) {
      setNotice(
        `위치 저장 오류: ${error.message}`
      );

      return;
    }

    setEditMode(
      false
    );

    setNotice(
      "아이템 위치를 저장했어요 ♡"
    );
  }

  const equippedItemIds =
    new Set(
      equipment.map(
        (row) =>
          row.item_id
      )
    );

  if (
    authLoading ||
    loading
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fff8fb]">

        <p className="text-sm text-gray-500">
          옷장 불러오는 중...
        </p>

      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fff8fb] px-5 py-8 text-[#2b2b2b]">

      <div className="mx-auto max-w-md pb-20">

        <header>

          {/* 홈 / 스토어 이동 */}

          <div className="flex items-center justify-between">

            <Link
              href="/couple"
              prefetch={false}
              className="flex items-center gap-1 text-sm font-semibold text-gray-500 transition active:scale-95"
            >
              ← 홈으로
            </Link>

            <Link
              href="/store"
              prefetch={false}
              className="rounded-xl bg-pink-50 px-3 py-2 text-xs font-bold text-pink-500 transition active:scale-95"
            >
              STORE →
            </Link>

          </div>

          <div className="mt-7 flex items-end justify-between gap-4">

            <div>

              <p className="text-xs font-semibold tracking-[0.2em] text-pink-400">
                MY CLOSET
              </p>

              <h1 className="mt-2 text-3xl font-bold">
                우리 옷장 ♡
              </h1>

              <p className="mt-2 text-sm leading-6 text-gray-500">
                구매한 아이템으로 캐릭터를 꾸미고
                <br />
                내 취향에 맞게 핏을 조절해요.
              </p>

            </div>

            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] bg-white text-2xl shadow-sm">
              🎒
            </div>

          </div>

        </header>
                <section className="mt-6 overflow-hidden rounded-[30px] border border-pink-100 bg-white p-4 shadow-sm">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-[10px] font-semibold tracking-[0.14em] text-pink-400">
                PREVIEW
              </p>

              <p className="mt-1 text-sm font-bold">
                {animal
                  ? `${getAnimalLabel(animal)} · ${getStageLabel(stage)}`
                  : "캐릭터 미선택"}
              </p>

            </div>

            {selectedItem && (

              <button
                type="button"
                onClick={() =>
                  setEditMode(
                    (prev) =>
                      !prev
                  )
                }
                className="rounded-xl bg-pink-50 px-3 py-2 text-xs font-bold text-pink-500"
              >
                {editMode
                  ? "조정 닫기"
                  : "다시 조정"}
              </button>

            )}

          </div>

          {/* 캐릭터 미리보기 */}

          <div className="relative mt-4 flex h-[330px] items-end justify-center overflow-hidden rounded-[26px] bg-gradient-to-b from-white to-pink-50/70">

            {characterImagePath ? (

              <div className="relative mb-4 w-[76%] max-w-[270px]">

                <img
                  src={
                    characterImagePath
                  }
                  alt="내 캐릭터"
                  className="block h-auto w-full object-contain"
                  style={{
                    maxHeight:
                      "290px",
                  }}
                />

                {selectedImagePath && (

                  <img
                    src={
                      selectedImagePath
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

                      zIndex: 20,
                    }}
                  />

                )}

              </div>

            ) : (

              <div className="pb-24 text-5xl opacity-30">
                🐾
              </div>

            )}

          </div>

          {/* 선택한 아이템 */}

          {selectedItem ? (

            <div className="mt-3 flex items-center justify-between gap-3">

              <div className="min-w-0">

                <p className="truncate font-bold">
                  {selectedItem.name}
                </p>

                <p className="mt-1 text-[10px] text-gray-400">
                  x {fit.x} · y {fit.y} · 크기 {fit.scale} · 회전 {fit.rotation}°
                </p>

              </div>

              {equippedItemIds.has(
                selectedItem.id
              ) ? (

                <span className="shrink-0 rounded-full bg-pink-500 px-3 py-2 text-[11px] font-bold text-white">
                  사용 중
                </span>

              ) : (

                <button
                  type="button"
                  onClick={() =>
                    void handleEquip(
                      selectedItem
                    )
                  }
                  className="shrink-0 rounded-xl bg-pink-500 px-3 py-2 text-xs font-bold text-white"
                >
                  꾸미기
                </button>

              )}

            </div>

          ) : (

            <p className="mt-3 text-center text-xs text-gray-400">
              아래에서 꾸밀 아이템을 골라주세요.
            </p>

          )}

          {/* 핏 조정 */}

          {editMode &&
            selectedItem && (

            <div className="mt-5 rounded-[24px] border border-pink-100 bg-[#fffafa] p-4">

              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">

                {/* 위치 */}

                <div className="justify-self-center">

                  <div className="grid grid-cols-3 gap-2">

                    <div />

                    <AdjustButton
                      label="↑"
                      onClick={() =>
                        moveY(-1)
                      }
                    />

                    <div />

                    <AdjustButton
                      label="←"
                      onClick={() =>
                        moveX(-1)
                      }
                    />

                    <AdjustButton
                      label="◎"
                      pink
                      onClick={() =>
                        updateFit({
                          x: 50,
                          rotation: 0,
                        })
                      }
                    />

                    <AdjustButton
                      label="→"
                      onClick={() =>
                        moveX(1)
                      }
                    />

                    <div />

                    <AdjustButton
                      label="↓"
                      onClick={() =>
                        moveY(1)
                      }
                    />

                    <div />

                  </div>

                  <p className="mt-2 text-center text-[10px] text-gray-400">
                    위치
                  </p>

                </div>

                <div className="h-28 w-px bg-pink-100" />

                {/* 기울기 / 크기 */}

                <div className="space-y-4">

                  <div>

                    <p className="mb-2 text-center text-[10px] font-semibold text-gray-400">
                      기울기
                    </p>

                    <div className="flex items-center justify-center gap-2">

                      <AdjustButton
                        label="↶"
                        onClick={() =>
                          rotate(-2)
                        }
                      />

                      <span className="min-w-10 text-center text-xs font-bold">
                        {fit.rotation}°
                      </span>

                      <AdjustButton
                        label="↷"
                        onClick={() =>
                          rotate(2)
                        }
                      />

                    </div>

                  </div>

                  <div>

                    <p className="mb-2 text-center text-[10px] font-semibold text-gray-400">
                      크기
                    </p>

                    <div className="flex items-center justify-center gap-2">

                      <AdjustButton
                        label="－"
                        onClick={() =>
                          resize(-2)
                        }
                      />

                      <span className="min-w-10 text-center text-xs font-bold">
                        {fit.scale}
                      </span>

                      <AdjustButton
                        label="＋"
                        onClick={() =>
                          resize(2)
                        }
                      />

                    </div>

                  </div>

                </div>

              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">

                <button
                  type="button"
                  onClick={
                    resetFit
                  }
                  className="rounded-2xl border border-pink-100 bg-white px-4 py-3 text-sm font-semibold text-gray-500"
                >
                  기본 위치
                </button>

                <button
                  type="button"
                  disabled={
                    saving
                  }
                  onClick={() =>
                    void saveFit()
                  }
                  className="rounded-2xl bg-pink-500 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {saving
                    ? "저장 중..."
                    : "저장 ♡"}
                </button>

              </div>

              <p className="mt-3 text-center text-[10px] leading-5 text-gray-400">
                위쪽은 y -30까지 이동할 수 있어요.
              </p>

            </div>

          )}

        </section>

        {/* 카테고리 */}

        <section className="mt-6">

          <div className="-mx-5 overflow-x-auto px-5">

            <div className="flex w-max gap-2 pb-1">

              {CATEGORIES.map(
                (category) => (

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
                    className={`rounded-full border px-4 py-2.5 text-sm font-semibold ${
                      selectedCategory ===
                      category.value
                        ? "border-pink-500 bg-pink-500 text-white"
                        : "border-pink-100 bg-white text-gray-500"
                    }`}
                  >
                    {category.emoji}{" "}
                    {category.label}
                  </button>

                )
              )}

            </div>

          </div>

        </section>

        {/* 알림 */}

        {notice && (

          <div className="mt-4 rounded-2xl border border-pink-100 bg-white px-4 py-3 text-center text-sm text-gray-600 shadow-sm">
            {notice}
          </div>

        )}

        {/* 보유 아이템 */}

        <section className="mt-6">

          <div className="mb-3 flex items-end justify-between">

            <div>

              <p className="text-xs font-semibold tracking-[0.18em] text-pink-400">
                MY ITEMS
              </p>

              <h2 className="mt-1 text-lg font-bold">
                내 옷장
              </h2>

            </div>

            <span className="text-[11px] text-gray-400">
              {visibleItems.length}개
            </span>

          </div>

          {visibleItems.length ===
          0 ? (

            <div className="rounded-[26px] border border-dashed border-pink-200 bg-white p-8 text-center">

              <div className="text-4xl">
                🎁
              </div>

              <p className="mt-3 font-bold">
                아직 아이템이 없어요
              </p>

              <p className="mt-2 text-xs leading-5 text-gray-400">
                STORE에서 마음에 드는 아이템을 구매해보세요.
              </p>

              <Link
                href="/store"
                prefetch={false}
                className="mt-4 inline-block rounded-2xl bg-pink-500 px-5 py-3 text-sm font-bold text-white"
              >
                STORE에서 아이템 보기
              </Link>

            </div>

          ) : (

            <div className="grid grid-cols-2 gap-3">

              {visibleItems.map(
                (item) => {

                  const imagePath =
                    normalizeImagePath(
                      item.image_path
                    );

                  const equipped =
                    equippedItemIds.has(
                      item.id
                    );

                  const selected =
                    selectedItemId ===
                    item.id;

                  return (

                    <button
                      key={
                        item.id
                      }
                      type="button"
                      onClick={() =>
                        void selectItem(
                          item
                        )
                      }
                      className={`relative overflow-hidden rounded-[24px] border bg-white p-3 text-left shadow-sm transition active:scale-[0.98] ${
                        selected
                          ? "border-pink-400 ring-2 ring-pink-100"
                          : equipped
                          ? "border-pink-200"
                          : "border-pink-100"
                      }`}
                    >

                      <div className="flex aspect-square items-center justify-center overflow-hidden rounded-[20px] bg-[#fff8fb] p-3">

                        {imagePath ? (

                          <img
                            src={
                              imagePath
                            }
                            alt={
                              item.name
                            }
                            className="h-full w-full object-contain"
                          />

                        ) : (

                          <span className="text-5xl">
                            🎁
                          </span>

                        )}

                      </div>

                      {equipped && (

                        <span className="absolute right-2 top-2 rounded-full bg-pink-500 px-2.5 py-1 text-[9px] font-bold text-white">
                          사용 중
                        </span>

                      )}

                      <p className="mt-3 truncate font-bold">
                        {item.name}
                      </p>

                      <p className="mt-1 text-[10px] text-gray-400">

                        {item.category ===
                        "hat"
                          ? "모자"
                          : item.category ===
                            "clothes"
                          ? "옷"
                          : "액세서리"}

                      </p>

                    </button>

                  );
                }
              )}

            </div>

          )}

        </section>

        {/* 아래 이동 버튼 */}

        <section className="mt-8 grid grid-cols-2 gap-3">

          <Link
            href="/couple"
            prefetch={false}
            className="rounded-2xl border border-pink-100 bg-white px-4 py-4 text-center text-sm font-bold text-gray-600 shadow-sm"
          >
            ← 홈으로
          </Link>

          <Link
            href="/store"
            prefetch={false}
            className="rounded-2xl bg-pink-500 px-4 py-4 text-center text-sm font-bold text-white shadow-sm"
          >
            STORE →
          </Link>

        </section>

      </div>

    </main>
  );
}

function AdjustButton({
  label,
  onClick,
  pink = false,
}: {
  label: string;
  onClick: () => void;
  pink?: boolean;
}) {
  return (

    <button
      type="button"
      onClick={
        onClick
      }
      className={`flex h-11 w-11 items-center justify-center rounded-2xl text-lg font-bold shadow-sm transition active:scale-95 ${
        pink
          ? "bg-pink-500 text-white"
          : "border border-pink-100 bg-white text-gray-600"
      }`}
    >
      {label}
    </button>

  );
}
