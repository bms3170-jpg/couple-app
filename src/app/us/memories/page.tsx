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

  if (
    authLoading ||
    loading
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fff8fb]">
        <p className="text-sm text-gray-500">
          추억 불러오는 중...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fff8fb] px-5 py-8 text-[#2b2b2b]">
      <div className="mx-auto max-w-md pb-28">

        <Link
          href="/us/history"
          prefetch={false}
          className="text-sm font-semibold text-gray-500"
        >
          ← 우리 기록으로
        </Link>

        <header className="mt-7">
          <p className="text-sm font-semibold tracking-[0.2em] text-pink-400">
            OUR MEMORY
          </p>

          <div className="mt-2 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-3xl font-bold tracking-tight">
                우리 추억 앨범 💕
              </h1>

              <p className="mt-3 text-sm leading-6 text-gray-500">
                레벨 보상과 함께 남긴
                <br />
                우리 둘만의 순간들이에요.
              </p>
            </div>

            <div className="shrink-0 rounded-full border border-pink-100 bg-white px-3 py-2 text-xs font-semibold text-pink-500 shadow-sm">
              {memories.length}개
            </div>
          </div>
        </header>

        {message && (
          <div className="mt-5 rounded-2xl bg-white px-4 py-3 text-center text-sm text-gray-600 shadow-sm">
            {message}
          </div>
        )}

        {memories.length > 0 && (
          <section className="mt-6">
            <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <button
                type="button"
                onClick={() =>
                  setSelectedLevel(
                    "all"
                  )
                }
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                  selectedLevel ===
                  "all"
                    ? "bg-pink-500 text-white"
                    : "border border-pink-100 bg-white text-gray-500"
                }`}
              >
                전체
                <span className="ml-1 text-xs opacity-80">
                  {memories.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setFavoriteOnly(
                    (prev) =>
                      !prev
                  )
                }
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                  favoriteOnly
                    ? "bg-pink-500 text-white"
                    : "border border-pink-100 bg-white text-gray-500"
                }`}
              >
                ♥ 즐겨찾기
                <span className="ml-1 text-xs opacity-80">
                  {
                    memories.filter(
                      (memory) =>
                        memory.is_favorite
                    ).length
                  }
                </span>
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
                      className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                        active
                          ? "bg-pink-500 text-white"
                          : "border border-pink-100 bg-white text-gray-500"
                      }`}
                    >
                      LV.{level}
                      <span className="ml-1 text-xs opacity-80">
                        {count}
                      </span>
                    </button>
                  );
                }
              )}
            </div>
          </section>
        )}

        {memories.length > 0 && (
          <section className="mt-4 rounded-3xl border border-pink-100 bg-white p-3 shadow-sm">
            <div className="relative">
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
                className="w-full rounded-2xl border border-pink-100 bg-[#fff8fb] py-3 pl-11 pr-10 text-sm text-gray-700 outline-none transition placeholder:text-gray-300 focus:border-pink-300"
              />

              {searchQuery && (
                <button
                  type="button"
                  onClick={() =>
                    setSearchQuery(
                      ""
                    )
                  }
                  className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-gray-100 text-xs text-gray-400"
                  aria-label="검색어 지우기"
                >
                  ×
                </button>
              )}
            </div>
          </section>
        )}

        {memories.length > 0 && (
          <section className="mt-3 flex items-center justify-between gap-3">
            <p className="text-xs font-semibold text-gray-400">
              {filteredMemories.length}개의 추억
            </p>

            <label className="flex items-center gap-2 text-xs text-gray-400">
              <span>
                정렬
              </span>

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
                className="rounded-full border border-pink-100 bg-white px-4 py-2 text-sm font-semibold text-gray-600 outline-none transition focus:border-pink-300"
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
            </label>
          </section>
        )}

        {memories.length === 0 ? (
          <section className="mt-7 rounded-3xl border border-dashed border-pink-200 bg-white p-8 text-center shadow-sm">
            <div className="text-4xl">
              💝
            </div>

            <h2 className="mt-4 text-lg font-bold">
              아직 추억이 없어요
            </h2>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              사용한 레벨 보상에
              <br />
              사진이나 한마디를 남겨보세요 ♡
            </p>

            <Link
              href="/rewards"
              prefetch={false}
              className="mt-6 block w-full rounded-2xl bg-pink-500 px-5 py-4 text-center font-semibold text-white"
            >
              보상 보러 가기
            </Link>
          </section>
        ) : filteredMemories.length === 0 ? (
          <section className="mt-7 rounded-3xl border border-dashed border-pink-200 bg-white p-8 text-center shadow-sm">
            <div className="text-4xl">
              💕
            </div>

            <p className="mt-4 text-sm font-semibold text-gray-500">
              {searchQuery.trim()
                ? "검색 결과가 없어요."
                : "이 레벨의 추억은 아직 없어요."}
            </p>

            <p className="mt-2 text-xs leading-5 text-gray-400">
              {searchQuery.trim()
                ? "다른 한마디나 보상 이름으로 찾아보세요 ♡"
                : "다른 레벨의 추억을 확인해보세요 ♡"}
            </p>

            <button
              type="button"
              onClick={() => {
                setSelectedLevel(
                  "all"
                );
                setSearchQuery(
                  ""
                );
                setFavoriteOnly(
                  false
                );
              }}
              className="mt-5 rounded-full bg-pink-500 px-5 py-3 text-sm font-semibold text-white"
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
              (memory) => (
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
                  className={`group cursor-pointer overflow-hidden rounded-3xl border border-pink-100 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:scale-[0.99] ${
                    singleMemoryLayout
                      ? "w-full max-w-[280px]"
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
                        className="aspect-[4/5] w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                      />
                    ) : (
                      <div className="flex aspect-[4/5] w-full items-center justify-center bg-[#fff8fb] text-5xl">
                        💕
                      </div>
                    )}

                    <div className="absolute left-3 top-3 rounded-full bg-black/45 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">
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
                      className={`absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-lg shadow-sm backdrop-blur-sm transition disabled:opacity-50 ${
                        memory.is_favorite
                          ? "bg-pink-500 text-white"
                          : "bg-black/35 text-white"
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

                    <div className="absolute bottom-3 right-3 rounded-full bg-black/45 px-2.5 py-1 text-[10px] font-medium text-white backdrop-blur-sm">
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
                    <p className="truncate text-sm font-bold leading-5">
                      {
                        memory.reward_title
                      }
                    </p>

                    {memory.message && (
                      <p className="mt-2 line-clamp-2 text-sm leading-5 text-gray-600">
                        {
                          memory.message
                        }
                      </p>
                    )}

                    <p className="mt-3 text-[11px] font-medium text-pink-400">
                      추억 보기 →
                    </p>
                  </div>
                </article>
              )
            )}
          </section>
        )}

        {selectedMemory && (
          <div
            className="fixed inset-0 z-[130] flex items-center justify-center bg-black/70 px-4 py-6"
            onClick={() =>
              setSelectedMemory(
                null
              )
            }
          >
            <div
              className="relative w-full max-w-sm overflow-hidden rounded-[32px] bg-white shadow-2xl"
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
                className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-xl text-white backdrop-blur"
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
                    className="max-h-[70vh] w-full object-contain"
                  />
                </div>
              ) : (
                <div className="flex h-64 items-center justify-center bg-[#fff8fb] text-6xl">
                  💕
                </div>
              )}

              <div className="p-5">
                <p className="text-xs font-semibold tracking-[0.18em] text-pink-400">
                  OUR MEMORY
                </p>

                <p className="mt-2 text-sm font-semibold text-pink-500">
                  LV.
                  {
                    selectedMemory.unlock_level
                  }
                  {" · "}
                  {
                    selectedMemory.reward_title
                  }
                </p>

                {selectedMemory.message && (
                  <p className="mt-4 whitespace-pre-wrap text-base leading-7 text-gray-700">
                    {
                      selectedMemory.message
                    }
                  </p>
                )}

                <p className="mt-4 text-sm text-gray-400">
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
                  className={`mt-6 w-full rounded-2xl px-5 py-4 text-center text-sm font-semibold transition disabled:opacity-50 ${
                    selectedMemory.is_favorite
                      ? "bg-pink-500 text-white"
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
                  className="mt-6 block w-full rounded-2xl border border-pink-200 px-5 py-4 text-center text-sm font-semibold text-pink-500"
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
