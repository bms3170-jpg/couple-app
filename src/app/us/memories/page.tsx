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

type LevelRewardMemory = {
  id: string;
  level_reward_id: string;
  message: string | null;
  photo_path: string | null;
  photo_url: string | null;
  created_at: string;
  is_favorite: boolean;
  reward_title: string;
  unlock_level: number;
};

const MEMORY_IMAGES = {
  header: "/images/memory/memory-header.PNG",
  empty: "/images/memory/memory-empty.PNG",
  search: "/images/memory/memory-search.PNG",
  favorite: "/images/memory/memory-favorite.PNG",
  album: "/images/memory/memory-album.PNG",
} as const;

export default function UsMemoriesPage() {
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

  const [
    memories,
    setMemories,
  ] = useState<LevelRewardMemory[]>([]);

  const [
    selectedMemory,
    setSelectedMemory,
  ] = useState<LevelRewardMemory | null>(
    null
  );

  const [
    selectedLevel,
    setSelectedLevel,
  ] = useState<number | "all">(
    "all"
  );

  const [
    sortOrder,
    setSortOrder,
  ] = useState<
    | "newest"
    | "oldest"
    | "level-desc"
    | "level-asc"
    | "favorite-first"
  >("newest");

  const [
    searchQuery,
    setSearchQuery,
  ] = useState("");

  const [
    favoriteOnly,
    setFavoriteOnly,
  ] = useState(false);

  const [
    favoriteProcessingId,
    setFavoriteProcessingId,
  ] = useState<string | null>(
    null
  );

  const availableLevels = [
    ...new Set(
      memories.map(
        (memory) =>
          memory.unlock_level
      )
    ),
  ].sort(
    (a, b) => a - b
  );

  const normalizedSearch =
    searchQuery
      .trim()
      .toLowerCase();

  const filteredMemories =
    (
      selectedLevel === "all"
        ? [...memories]
        : memories.filter(
            (memory) =>
              memory.unlock_level ===
              selectedLevel
          )
    )
      .filter(
        (memory) =>
          !favoriteOnly ||
          memory.is_favorite
      )
      .filter(
        (memory) => {
          if (!normalizedSearch) {
            return true;
          }

          const haystack = [
            memory.reward_title,
            memory.message ?? "",
            `lv.${memory.unlock_level}`,
            `lv${memory.unlock_level}`,
            String(
              memory.unlock_level
            ),
          ]
            .join(" ")
            .toLowerCase();

          return haystack.includes(
            normalizedSearch
          );
        }
      )
      .sort((a, b) => {
        if (
          sortOrder ===
          "oldest"
        ) {
          return (
            new Date(
              a.created_at
            ).getTime() -
            new Date(
              b.created_at
            ).getTime()
          );
        }

        if (
          sortOrder ===
          "level-desc"
        ) {
          return (
            b.unlock_level -
            a.unlock_level
          );
        }

        if (
          sortOrder ===
          "level-asc"
        ) {
          return (
            a.unlock_level -
            b.unlock_level
          );
        }

        if (
          sortOrder ===
          "favorite-first"
        ) {
          if (
            a.is_favorite !==
            b.is_favorite
          ) {
            return a.is_favorite
              ? -1
              : 1;
          }

          return (
            new Date(
              b.created_at
            ).getTime() -
            new Date(
              a.created_at
            ).getTime()
          );
        }

        return (
          new Date(
            b.created_at
          ).getTime() -
          new Date(
            a.created_at
          ).getTime()
        );
      });

  const singleMemoryLayout =
    filteredMemories.length === 1;

  const favoriteCount =
    memories.filter(
      (memory) =>
        memory.is_favorite
    ).length;

  useEffect(() => {
    let cancelled = false;

    async function loadMemories() {
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

      if (membershipError) {
        console.error(
          "커플 조회 오류:",
          membershipError
        );

        setMessage(
          "커플 정보를 불러오지 못했어요."
        );
        setLoading(false);
        return;
      }

      if (!membership) {
        setMessage(
          "연결된 커플 정보가 없어요."
        );
        setLoading(false);
        return;
      }

      const coupleId =
        membership.couple_id;

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
          created_at,
          is_favorite
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
          "추억 조회 오류:",
          memoryError
        );

        setMessage(
          "추억을 불러오지 못했어요."
        );
        setLoading(false);
        return;
      }

      const levelRewardIds = [
        ...new Set(
          (memoryRows ?? []).map(
            (item) =>
              item.level_reward_id
          )
        ),
      ];

      const {
        data: rewardRows,
        error: rewardError,
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

      if (rewardError) {
        console.error(
          "레벨 보상 조회 오류:",
          rewardError
        );
      }

      const mappedMemories =
        (memoryRows ?? []).map(
          (memory) => {
            const reward =
              rewardRows?.find(
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
              is_favorite:
                memory.is_favorite ??
                false,
              photo_url:
                photoUrl,
              reward_title:
                reward?.title ??
                "레벨 보상",
              unlock_level:
                reward
                  ?.unlock_level ??
                0,
            };
          }
        ) as LevelRewardMemory[];

      if (!cancelled) {
        setMemories(
          mappedMemories
        );
        setLoading(false);
      }
    }

    void loadMemories();

    return () => {
      cancelled = true;
    };
  }, [
    authLoading,
    user,
    supabase,
  ]);

  async function toggleFavorite(
    memory: LevelRewardMemory
  ) {
    if (
      favoriteProcessingId ===
      memory.id
    ) {
      return;
    }

    setFavoriteProcessingId(
      memory.id
    );

    const nextValue =
      !memory.is_favorite;

    const {
      error,
    } = await supabase
      .from(
        "level_reward_memories"
      )
      .update({
        is_favorite:
          nextValue,
      })
      .eq(
        "id",
        memory.id
      );

    setFavoriteProcessingId(
      null
    );

    if (error) {
      console.error(
        "즐겨찾기 변경 오류:",
        error
      );

      window.alert(
        `즐겨찾기를 변경하지 못했어요: ${error.message}`
      );

      return;
    }

    setMemories(
      (prev) =>
        prev.map(
          (item) =>
            item.id ===
            memory.id
              ? {
                  ...item,
                  is_favorite:
                    nextValue,
                }
              : item
        )
    );

    if (
      selectedMemory?.id ===
      memory.id
    ) {
      setSelectedMemory(
        {
          ...selectedMemory,
          is_favorite:
            nextValue,
        }
      );
    }
  }

  function resetFilters() {
    setSelectedLevel(
      "all"
    );
    setSearchQuery(
      ""
    );
    setFavoriteOnly(
      false
    );
    setSortOrder(
      "newest"
    );
  }

  if (
    authLoading ||
    loading
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fff8fb]">
        <div className="text-center">
          <img
            src={MEMORY_IMAGES.album}
            alt=""
            aria-hidden="true"
            className="mx-auto h-24 w-28 object-contain"
          />
          <p className="mt-3 text-sm text-gray-500">
            추억 불러오는 중...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff9fc_0%,#fff7fb_45%,#fffafd_100%)] px-4 py-7 text-[#2b2b2b] sm:px-5">
      <div className="mx-auto max-w-md pb-28">
        <Link
          href="/us/history"
          prefetch={false}
          className="inline-flex items-center gap-1 text-sm font-semibold text-gray-500"
        >
          <span>←</span>
          <span>우리 기록으로</span>
        </Link>

        <header className="relative mt-6 overflow-hidden rounded-[32px] border border-pink-100/80 bg-white/92 shadow-[0_14px_40px_rgba(244,114,182,0.08)]">
          <img
            src={MEMORY_IMAGES.header}
            alt=""
            aria-hidden="true"
            className="h-auto w-full object-contain"
          />

          <div className="absolute right-4 top-4 rounded-full border border-white/90 bg-white/88 px-3 py-2 text-xs font-bold text-pink-500 shadow-sm backdrop-blur">
            {memories.length}개
          </div>
        </header>

        {message && (
          <div className="mt-4 rounded-2xl border border-pink-100 bg-white px-4 py-3 text-center text-sm text-gray-600 shadow-sm">
            {message}
          </div>
        )}

        {memories.length > 0 && (
          <>
            <section className="mt-4 grid grid-cols-2 gap-3">
              <div className="relative overflow-hidden rounded-[24px] border border-pink-100 bg-gradient-to-br from-[#fff6fa] to-white p-4 shadow-sm">
                <img
                  src={MEMORY_IMAGES.album}
                  alt=""
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-4 -top-3 h-20 w-24 object-contain opacity-[0.2]"
                />
                <p className="text-[10px] font-bold tracking-[0.16em] text-pink-400">
                  TOTAL MEMORY
                </p>
                <p className="mt-2 text-2xl font-black">
                  {memories.length}
                  <span className="ml-1 text-sm font-semibold text-gray-400">
                    개
                  </span>
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  함께 남긴 추억
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setFavoriteOnly(
                    (prev) =>
                      !prev
                  )
                }
                className={`relative overflow-hidden rounded-[24px] border p-4 text-left shadow-sm transition ${
                  favoriteOnly
                    ? "border-pink-200 bg-gradient-to-br from-pink-100 to-[#fff3fb]"
                    : "border-violet-100 bg-gradient-to-br from-[#faf7ff] to-white"
                }`}
              >
                <img
                  src={MEMORY_IMAGES.favorite}
                  alt=""
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-4 -top-3 h-20 w-24 object-contain opacity-[0.22]"
                />
                <p className="text-[10px] font-bold tracking-[0.16em] text-violet-400">
                  FAVORITE
                </p>
                <p className="mt-2 text-2xl font-black">
                  {favoriteCount}
                  <span className="ml-1 text-sm font-semibold text-gray-400">
                    개
                  </span>
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  마음에 남은 순간
                </p>
              </button>
            </section>

            <section className="mt-4 overflow-hidden rounded-[26px] border border-pink-100 bg-white p-3 shadow-sm">
              <div className="relative overflow-hidden rounded-[20px] bg-gradient-to-r from-[#fff8fb] via-white to-[#fbf8ff]">
                <img
                  src={MEMORY_IMAGES.search}
                  alt=""
                  aria-hidden="true"
                  className="pointer-events-none absolute right-2 top-1/2 h-16 w-20 -translate-y-1/2 object-contain opacity-[0.12]"
                />

                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-300">
                  🔎
                </span>

                <input
                  type="search"
                  value={
                    searchQuery
                  }
                  onChange={(e) =>
                    setSearchQuery(
                      e.target.value
                    )
                  }
                  placeholder="한마디나 보상 이름으로 검색"
                  className="relative z-[1] w-full bg-transparent py-3.5 pl-11 pr-11 text-sm text-gray-700 outline-none placeholder:text-gray-300"
                />

                {searchQuery && (
                  <button
                    type="button"
                    onClick={() =>
                      setSearchQuery(
                        ""
                      )
                    }
                    className="absolute right-3 top-1/2 z-[2] flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-gray-100 text-xs text-gray-400"
                    aria-label="검색어 지우기"
                  >
                    ×
                  </button>
                )}
              </div>
            </section>

            <section className="mt-3 -mr-4">
              <div className="flex gap-2 overflow-x-auto pb-1 pr-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedLevel(
                      "all"
                    )
                  }
                  className={`shrink-0 rounded-full px-4 py-2.5 text-xs font-bold transition ${
                    selectedLevel ===
                    "all"
                      ? "bg-pink-500 text-white shadow-sm"
                      : "border border-pink-100 bg-white text-gray-500"
                  }`}
                >
                  전체 {memories.length}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setFavoriteOnly(
                      (prev) =>
                        !prev
                    )
                  }
                  className={`shrink-0 rounded-full px-4 py-2.5 text-xs font-bold transition ${
                    favoriteOnly
                      ? "bg-violet-500 text-white shadow-sm"
                      : "border border-violet-100 bg-white text-gray-500"
                  }`}
                >
                  ♥ 즐겨찾기 {favoriteCount}
                </button>

                {availableLevels.map(
                  (level) => {
                    const count =
                      memories.filter(
                        (memory) =>
                          memory.unlock_level ===
                          level
                      ).length;

                    const active =
                      selectedLevel ===
                      level;

                    return (
                      <button
                        type="button"
                        key={level}
                        onClick={() =>
                          setSelectedLevel(
                            level
                          )
                        }
                        className={`shrink-0 rounded-full px-4 py-2.5 text-xs font-bold transition ${
                          active
                            ? "bg-amber-400 text-white shadow-sm"
                            : "border border-amber-100 bg-white text-gray-500"
                        }`}
                      >
                        LV.{level} {count}
                      </button>
                    );
                  }
                )}
              </div>
            </section>

            <section className="mt-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold tracking-[0.16em] text-pink-400">
                  OUR ALBUM
                </p>
                <p className="mt-1 text-xs font-semibold text-gray-400">
                  {filteredMemories.length}개의 추억
                </p>
              </div>

              <select
                value={sortOrder}
                onChange={(e) =>
                  setSortOrder(
                    e.target.value as
                      | "newest"
                      | "oldest"
                      | "level-desc"
                      | "level-asc"
                      | "favorite-first"
                  )
                }
                className="rounded-full border border-pink-100 bg-white px-4 py-2.5 text-xs font-bold text-gray-600 shadow-sm outline-none"
                aria-label="추억 정렬"
              >
                <option value="newest">
                  최신순
                </option>
                <option value="oldest">
                  오래된순
                </option>
                <option value="level-desc">
                  레벨 높은순
                </option>
                <option value="level-asc">
                  레벨 낮은순
                </option>
                <option value="favorite-first">
                  ♥ 즐겨찾기 우선
                </option>
              </select>
            </section>
          </>
        )}

        {memories.length === 0 ? (
          <section className="mt-5 overflow-hidden rounded-[30px] border border-dashed border-pink-200 bg-white shadow-sm">
            <img
              src={MEMORY_IMAGES.empty}
              alt=""
              aria-hidden="true"
              className="h-auto w-full object-contain"
            />

            <div className="-mt-1 px-6 pb-7 text-center">
              <p className="text-[10px] font-bold tracking-[0.18em] text-pink-400">
                OUR FIRST MEMORY
              </p>

              <h2 className="mt-2 text-xl font-black">
                아직 추억이 없어요
              </h2>

              <p className="mt-2 text-sm leading-6 text-gray-500">
                사용한 레벨 보상에 사진이나 한마디를 남기면
                <br />
                둘만의 추억 앨범이 채워져요 ♡
              </p>

              <Link
                href="/rewards"
                prefetch={false}
                className="mt-5 block w-full rounded-2xl bg-gradient-to-r from-pink-500 to-fuchsia-400 px-5 py-4 text-center text-sm font-bold text-white shadow-sm"
              >
                보상 보러 가기
              </Link>
            </div>
          </section>
        ) : filteredMemories.length === 0 ? (
          <section className="mt-5 overflow-hidden rounded-[30px] border border-dashed border-pink-200 bg-white p-6 text-center shadow-sm">
            <img
              src={MEMORY_IMAGES.favorite}
              alt=""
              aria-hidden="true"
              className="mx-auto h-32 w-40 object-contain"
            />

            <h2 className="mt-2 text-lg font-black">
              {searchQuery.trim()
                ? "검색 결과가 없어요"
                : favoriteOnly
                ? "즐겨찾기한 추억이 없어요"
                : "이 레벨의 추억이 없어요"}
            </h2>

            <p className="mt-2 text-xs leading-5 text-gray-400">
              조건을 바꾸거나 전체 추억을 다시 확인해보세요 ♡
            </p>

            <button
              type="button"
              onClick={
                resetFilters
              }
              className="mt-5 rounded-full bg-pink-500 px-5 py-3 text-sm font-bold text-white"
            >
              전체 추억 보기
            </button>
          </section>
        ) : (
          <section
            className={`mt-5 grid gap-3 ${
              singleMemoryLayout
                ? "grid-cols-1 justify-items-center"
                : "grid-cols-2"
            }`}
          >
            {filteredMemories.map(
              (memory, index) => {
                const pastel =
                  index % 4 === 0
                    ? "from-[#fff3f8] to-white border-pink-100"
                    : index % 4 === 1
                    ? "from-[#f7f3ff] to-white border-violet-100"
                    : index % 4 === 2
                    ? "from-[#fff9eb] to-white border-amber-100"
                    : "from-[#effcf7] to-white border-emerald-100";

                return (
                  <article
                    key={
                      memory.id
                    }
                    role="button"
                    tabIndex={0}
                    onClick={() =>
                      setSelectedMemory(
                        memory
                      )
                    }
                    onKeyDown={(e) => {
                      if (
                        e.key === "Enter" ||
                        e.key === " "
                      ) {
                        e.preventDefault();
                        setSelectedMemory(
                          memory
                        );
                      }
                    }}
                    className={`group cursor-pointer overflow-hidden rounded-[26px] border bg-gradient-to-br ${pastel} text-left shadow-sm transition active:scale-[0.99] ${
                      singleMemoryLayout
                        ? "w-full max-w-[300px]"
                        : "w-full"
                    }`}
                  >
                    <div className="relative overflow-hidden">
                      {memory.photo_url ? (
                        <img
                          src={
                            memory.photo_url
                          }
                          alt={`${memory.reward_title} 추억`}
                          className="aspect-[4/5] w-full object-cover"
                        />
                      ) : (
                        <div className="flex aspect-[4/5] w-full items-center justify-center bg-white/65">
                          <img
                            src={MEMORY_IMAGES.album}
                            alt=""
                            aria-hidden="true"
                            className="h-28 w-32 object-contain"
                          />
                        </div>
                      )}

                      <div className="absolute left-2.5 top-2.5 rounded-full bg-white/88 px-2.5 py-1 text-[10px] font-black text-pink-500 shadow-sm backdrop-blur">
                        LV.
                        {
                          memory.unlock_level
                        }
                      </div>

                      <button
                        type="button"
                        disabled={
                          favoriteProcessingId ===
                          memory.id
                        }
                        onClick={(e) => {
                          e.stopPropagation();
                          void toggleFavorite(
                            memory
                          );
                        }}
                        className={`absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full text-base shadow-sm backdrop-blur transition disabled:opacity-50 ${
                          memory.is_favorite
                            ? "bg-pink-500 text-white"
                            : "bg-white/85 text-pink-300"
                        }`}
                        aria-label={
                          memory.is_favorite
                            ? "즐겨찾기 해제"
                            : "즐겨찾기 추가"
                        }
                      >
                        {memory.is_favorite
                          ? "♥"
                          : "♡"}
                      </button>

                      <div className="absolute bottom-2.5 right-2.5 rounded-full bg-white/85 px-2.5 py-1 text-[10px] font-semibold text-gray-500 shadow-sm backdrop-blur">
                        {new Date(
                          memory.created_at
                        ).toLocaleDateString(
                          "ko-KR",
                          {
                            month:
                              "2-digit",
                            day:
                              "2-digit",
                          }
                        )}
                      </div>
                    </div>

                    <div className="p-3.5">
                      <p className="truncate text-sm font-black leading-5">
                        {
                          memory.reward_title
                        }
                      </p>

                      {memory.message ? (
                        <p className="mt-2 line-clamp-2 text-xs leading-5 text-gray-500">
                          {
                            memory.message
                          }
                        </p>
                      ) : (
                        <p className="mt-2 text-xs leading-5 text-gray-300">
                          남긴 한마디가 없어요.
                        </p>
                      )}

                      <p className="mt-3 text-[10px] font-bold tracking-[0.08em] text-pink-400">
                        MEMORY →
                      </p>
                    </div>
                  </article>
                );
              }
            )}
          </section>
        )}

        {selectedMemory && (
          <div
            className="fixed inset-0 z-[130] flex items-end justify-center bg-black/50 px-4 pb-4 pt-12 backdrop-blur-[2px] sm:items-center sm:py-6"
            onClick={() =>
              setSelectedMemory(
                null
              )
            }
          >
            <div
              className="relative max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-[32px] bg-[#fffafd] shadow-2xl"
              onClick={(e) =>
                e.stopPropagation()
              }
            >
              <button
                type="button"
                onClick={() =>
                  setSelectedMemory(
                    null
                  )
                }
                className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-xl text-gray-500 shadow-sm backdrop-blur"
                aria-label="닫기"
              >
                ×
              </button>

              {selectedMemory.photo_url ? (
                <div className="bg-black">
                  <img
                    src={
                      selectedMemory.photo_url
                    }
                    alt={`${selectedMemory.reward_title} 추억 크게 보기`}
                    className="max-h-[55vh] w-full object-contain"
                  />
                </div>
              ) : (
                <div className="flex h-60 items-center justify-center bg-gradient-to-br from-pink-50 via-white to-violet-50">
                  <img
                    src={MEMORY_IMAGES.album}
                    alt=""
                    aria-hidden="true"
                    className="h-44 w-52 object-contain"
                  />
                </div>
              )}

              <div className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold tracking-[0.18em] text-pink-400">
                      OUR MEMORY
                    </p>

                    <p className="mt-1 text-sm font-bold text-pink-500">
                      LV.
                      {
                        selectedMemory.unlock_level
                      }
                    </p>
                  </div>

                  <img
                    src={MEMORY_IMAGES.favorite}
                    alt=""
                    aria-hidden="true"
                    className="h-14 w-16 object-contain"
                  />
                </div>

                <h2 className="mt-3 text-xl font-black leading-7">
                  {
                    selectedMemory.reward_title
                  }
                </h2>

                {selectedMemory.message && (
                  <p className="mt-3 whitespace-pre-wrap rounded-[20px] bg-white px-4 py-3 text-sm leading-7 text-gray-600 shadow-sm">
                    {
                      selectedMemory.message
                    }
                  </p>
                )}

                <p className="mt-4 text-xs text-gray-400">
                  {new Date(
                    selectedMemory.created_at
                  ).toLocaleDateString(
                    "ko-KR"
                  )}{" "}
                  추억 ♡
                </p>

                <button
                  type="button"
                  disabled={
                    favoriteProcessingId ===
                    selectedMemory.id
                  }
                  onClick={() => {
                    void toggleFavorite(
                      selectedMemory
                    );
                  }}
                  className={`mt-5 w-full rounded-2xl px-5 py-4 text-center text-sm font-bold transition disabled:opacity-50 ${
                    selectedMemory.is_favorite
                      ? "bg-gradient-to-r from-pink-500 to-fuchsia-400 text-white"
                      : "border border-pink-200 bg-white text-pink-500"
                  }`}
                >
                  {selectedMemory.is_favorite
                    ? "♥ 즐겨찾기 됐어요"
                    : "♡ 즐겨찾기 추가"}
                </button>

                <Link
                  href={`/us/history?memory=${encodeURIComponent(
                    selectedMemory.id
                  )}`}
                  prefetch={false}
                  className="mt-3 block w-full rounded-2xl border border-violet-100 bg-violet-50/60 px-5 py-4 text-center text-sm font-bold text-violet-500"
                >
                  우리 기록에서 관리하기
                </Link>
              </div>
            </div>
          </div>
        )}

        <BottomNav />
      </div>
    </main>
  );
}
