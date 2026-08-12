"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";

import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import BottomNav from "@/components/BottomNav";

type TimelineEvent = {
  id: string;
  event_type: string;
  title: string;
  description: string | null;
  related_id: string | null;
  image_path: string | null;
  image_url: string | null;
  event_date: string;
  is_pinned: boolean;
  is_joint_promise: boolean;
};

type TimelineGroup = {
  dateKey: string;
  dateLabel: string;
  events: TimelineEvent[];
};

function getEventEmoji(
  eventType: string
) {
  switch (eventType) {
    case "couple_started":
      return "💕";

    case "first_promise":
      return "✅";

    case "first_verification":
      return "📸";

    case "level_milestone":
      return "🎉";

    case "level_reward_used":
      return "🎁";

    case "memory_created":
      return "📷";

    default:
      return "💗";
  }
}

function getEventAccent(
  eventType: string
) {
  switch (eventType) {
    case "couple_started":
      return "bg-pink-500";

    case "first_promise":
      return "bg-emerald-400";

    case "first_verification":
      return "bg-violet-400";

    case "level_milestone":
      return "bg-amber-400";

    case "level_reward_used":
      return "bg-orange-400";

    case "memory_created":
      return "bg-rose-400";

    default:
      return "bg-pink-400";
  }
}

const KOREA_TIME_ZONE =
  "Asia/Seoul";


function getEventCardStyle(
  eventType: string
) {
  switch (eventType) {
    case "couple_started":
      return {
        card:
          "border-pink-200 bg-gradient-to-br from-white to-pink-50",
        badge:
          "bg-pink-100 text-pink-600",
        label:
          "우리 시작",
      };

    case "first_promise":
    case "promise_created":
      return {
        card:
          "border-emerald-100 bg-gradient-to-br from-white to-emerald-50/60",
        badge:
          "bg-emerald-100 text-emerald-600",
        label:
          "약속",
      };

    case "promise_ended":
      return {
        card:
          "border-slate-200 bg-gradient-to-br from-white to-slate-50",
        badge:
          "bg-slate-100 text-slate-600",
        label:
          "약속 종료",
      };

    case "first_verification":
      return {
        card:
          "border-violet-100 bg-gradient-to-br from-white to-violet-50/60",
        badge:
          "bg-violet-100 text-violet-600",
        label:
          "인증",
      };

    case "level_milestone":
    case "level_up":
      return {
        card:
          "border-amber-100 bg-gradient-to-br from-white to-amber-50/70",
        badge:
          "bg-amber-100 text-amber-700",
        label:
          "레벨업",
      };

    case "level_reward_used":
    case "promise_reward_used":
      return {
        card:
          "border-orange-100 bg-gradient-to-br from-white to-orange-50/70",
        badge:
          "bg-orange-100 text-orange-600",
        label:
          "보상",
      };

    case "memory_created":
      return {
        card:
          "border-rose-100 bg-gradient-to-br from-white to-rose-50/70",
        badge:
          "bg-rose-100 text-rose-600",
        label:
          "추억",
      };

    default:
      return {
        card:
          "border-pink-100 bg-white",
        badge:
          "bg-pink-100 text-pink-600",
        label:
          "기록",
      };
  }
}

function formatDateLabel(
  value: string
) {
  const date =
    new Date(value);

  return date.toLocaleDateString(
    "ko-KR",
    {
      timeZone:
        KOREA_TIME_ZONE,
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short",
    }
  );
}

function formatTime(
  value: string
) {
  const date =
    new Date(value);

  return date.toLocaleTimeString(
    "ko-KR",
    {
      timeZone:
        KOREA_TIME_ZONE,
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}

function getKoreaDateKey(
  value: string
) {
  const parts =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          KOREA_TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }
    ).formatToParts(
      new Date(value)
    );

  const year =
    parts.find(
      (part) =>
        part.type === "year"
    )?.value ?? "";

  const month =
    parts.find(
      (part) =>
        part.type === "month"
    )?.value ?? "";

  const day =
    parts.find(
      (part) =>
        part.type === "day"
    )?.value ?? "";

  return `${year}-${month}-${day}`;
}


function matchesTimelineFilter(
  eventType: string,
  filter:
    | "all"
    | "promise"
    | "verification"
    | "level"
    | "reward"
    | "memory"
    | "important"
) {
  if (filter === "all") {
    return true;
  }

  if (filter === "promise") {
    return [
      "first_promise",
      "promise_created",
      "promise_ended",
    ].includes(eventType);
  }

  if (filter === "verification") {
    return eventType ===
      "first_verification";
  }

  if (filter === "level") {
    return [
      "level_milestone",
      "level_up",
    ].includes(eventType);
  }

  if (filter === "reward") {
    return [
      "level_reward_used",
      "promise_reward_used",
    ].includes(eventType);
  }

  if (filter === "memory") {
    return eventType ===
      "memory_created";
  }

  return true;
}


function getKoreaMonthKey(
  value: string
) {
  const parts =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          KOREA_TIME_ZONE,
        year: "numeric",
        month: "2-digit",
      }
    ).formatToParts(
      new Date(value)
    );

  const year =
    parts.find(
      (part) =>
        part.type === "year"
    )?.value ?? "";

  const month =
    parts.find(
      (part) =>
        part.type === "month"
    )?.value ?? "";

  return `${year}-${month}`;
}

function formatMonthChip(
  monthKey: string
) {
  const [
    year,
    month,
  ] = monthKey.split("-");

  return `${year}.${month}`;
}

export default function UsTimelinePage() {
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
    events,
    setEvents,
  ] = useState<TimelineEvent[]>(
    []
  );

  const [
    selectedEvent,
    setSelectedEvent,
  ] = useState<TimelineEvent | null>(
    null
  );

  const [
    pinProcessingId,
    setPinProcessingId,
  ] = useState<string | null>(
    null
  );

  const [
    order,
    setOrder,
  ] = useState<
    | "oldest"
    | "newest"
    | "pinned"
  >("oldest");

  const [
    filter,
    setFilter,
  ] = useState<
    | "all"
    | "promise"
    | "verification"
    | "level"
    | "reward"
    | "memory"
    | "important"
  >("all");

  const monthRefs =
    useRef<
      Record<
        string,
        HTMLDivElement | null
      >
    >({});

  useEffect(() => {
    let cancelled = false;

    async function loadTimeline() {
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

        setMessage(
          "커플 정보를 찾을 수 없어요."
        );

        setLoading(false);

        return;
      }

      const coupleId =
        membership.couple_id;

      // =====================================
      // 타임라인 이벤트 조회
      // =====================================

      const {
        data: timelineRows,
        error: timelineError,
      } = await supabase
        .from(
          "couple_timeline_events"
        )
        .select(`
          id,
          event_type,
          title,
          description,
          related_id,
          image_path,
          event_date,
          is_pinned
        `)
        .eq(
          "couple_id",
          coupleId
        )
        .order(
          "event_date",
          {
            ascending: true,
          }
        );

      if (cancelled) {
        return;
      }

      if (timelineError) {
        console.error(
          "타임라인 조회 오류:",
          timelineError
        );

        setMessage(
          "타임라인을 불러오지 못했어요."
        );

        setLoading(false);

        return;
      }

      // =====================================
      // 공동 약속 여부 확인
      // =====================================

      const promiseRelatedIds =
        Array.from(
          new Set(
            (timelineRows ?? [])
              .filter(
                (item) =>
                  [
                    "first_promise",
                    "promise_created",
                    "promise_ended",
                    "first_verification",
                    "promise_reward_used",
                  ].includes(
                    item.event_type
                  ) &&
                  item.related_id
              )
              .map(
                (item) =>
                  item.related_id as string
              )
          )
        );

      const jointPromiseIds =
        new Set<string>();

      if (promiseRelatedIds.length > 0) {
        const {
          data: promiseRows,
          error: promiseError,
        } = await supabase
          .from("promises")
          .select("id, is_joint")
          .in(
            "id",
            promiseRelatedIds
          );

        if (promiseError) {
          console.error(
            "타임라인 공동 약속 조회 오류:",
            promiseError
          );
        } else {
          (promiseRows ?? [])
            .filter(
              (promise) =>
                promise.is_joint
            )
            .forEach(
              (promise) =>
                jointPromiseIds.add(
                  promise.id
                )
            );
        }
      }

      // =====================================
      // 이벤트별 사진 URL 만들기
      // =====================================

      const mappedEvents =
        await Promise.all(
          (
            timelineRows ??
            []
          ).map(
            async (item) => {
              let imageUrl:
                | string
                | null = null;

              if (
                item.image_path
              ) {
                // 인증 사진은 private bucket
                if (
                  item.event_type ===
                  "first_verification"
                ) {
                  const {
                    data:
                      signedData,
                    error:
                      signedError,
                  } =
                    await supabase.storage
                      .from(
                        "verification-images"
                      )
                      .createSignedUrl(
                        item.image_path,
                        60 * 60
                      );

                  if (
                    !signedError &&
                    signedData
                  ) {
                    imageUrl =
                      signedData.signedUrl;
                  } else if (
                    signedError
                  ) {
                    console.error(
                      "인증 사진 URL 생성 오류:",
                      signedError
                    );
                  }
                }

                // 추억 사진은 public bucket
                if (
                  item.event_type ===
                  "memory_created"
                ) {
                  imageUrl =
                    supabase.storage
                      .from(
                        "level-reward-memories"
                      )
                      .getPublicUrl(
                        item.image_path
                      ).data.publicUrl;
                }
              }

              return {
                ...item,
                is_pinned:
                  item.is_pinned ??
                  false,
                image_url:
                  imageUrl,
                is_joint_promise:
                  Boolean(
                    item.related_id &&
                    jointPromiseIds.has(
                      item.related_id
                    )
                  ),
              };
            }
          )
        );

      if (cancelled) {
        return;
      }

      setEvents(
        mappedEvents as TimelineEvent[]
      );

      setLoading(false);
    }

    void loadTimeline();

    return () => {
      cancelled = true;
    };
  }, [
    authLoading,
    user,
    supabase,
  ]);

  const filteredEvents =
    events.filter(
      (event) => {
        if (
          filter ===
          "important"
        ) {
          return event.is_pinned;
        }

        return matchesTimelineFilter(
          event.event_type,
          filter
        );
      }
    );

  const sortedEvents =
    [...filteredEvents].sort(
      (a, b) => {
        const aTime =
          new Date(
            a.event_date
          ).getTime();

        const bTime =
          new Date(
            b.event_date
          ).getTime();

        if (
          order === "pinned" &&
          a.is_pinned !==
            b.is_pinned
        ) {
          return a.is_pinned
            ? -1
            : 1;
        }

        return order ===
          "oldest"
          ? aTime - bTime
          : bTime - aTime;
      }
    );

  const groups:
    TimelineGroup[] =
    Array.from(
      sortedEvents.reduce(
        (
          map,
          event
        ) => {
          const dateKey =
            getKoreaDateKey(
              event.event_date
            );

          const current =
            map.get(
              dateKey
            ) ?? [];

          current.push(
            event
          );

          map.set(
            dateKey,
            current
          );

          return map;
        },
        new Map<
          string,
          TimelineEvent[]
        >()
      )
    ).map(
      ([
        dateKey,
        groupEvents,
      ]) => ({
        dateKey,
        dateLabel:
          formatDateLabel(
            groupEvents[0]
              .event_date
          ),
        events:
          groupEvents,
      })
    );

  async function togglePinned(
    event: TimelineEvent
  ) {
    if (
      pinProcessingId ===
      event.id
    ) {
      return;
    }

    setPinProcessingId(
      event.id
    );

    const nextValue =
      !event.is_pinned;

    const {
      error,
    } = await supabase
      .from(
        "couple_timeline_events"
      )
      .update({
        is_pinned:
          nextValue,
      })
      .eq(
        "id",
        event.id
      );

    setPinProcessingId(
      null
    );

    if (error) {
      console.error(
        "중요 기록 변경 오류:",
        error
      );

      window.alert(
        `중요 기록을 변경하지 못했어요: ${error.message}`
      );

      return;
    }

    setEvents(
      (prev) =>
        prev.map(
          (item) =>
            item.id ===
            event.id
              ? {
                  ...item,
                  is_pinned:
                    nextValue,
                }
              : item
        )
    );

    if (
      selectedEvent?.id ===
      event.id
    ) {
      setSelectedEvent({
        ...selectedEvent,
        is_pinned:
          nextValue,
      });
    }
  }

  const availableMonths =
    Array.from(
      new Set(
        sortedEvents.map(
          (event) =>
            getKoreaMonthKey(
              event.event_date
            )
        )
      )
    );

  function scrollToMonth(
    monthKey: string
  ) {
    monthRefs.current[
      monthKey
    ]?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  if (
    authLoading ||
    loading
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fff8fb]">
        <p className="text-sm text-gray-500">
          우리의 시간 불러오는 중...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fff8fb] px-5 py-8 text-[#2b2b2b]">
      <div className="mx-auto max-w-md pb-28">

        <Link
          href="/us"
          prefetch={false}
          className="text-sm font-semibold text-gray-500"
        >
          ← 우리로 돌아가기
        </Link>

        <header className="mt-7">
          <p className="text-sm font-semibold tracking-[0.2em] text-pink-400">
            OUR TIMELINE
          </p>

          <div className="mt-2 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                우리의 타임라인 💕
              </h1>

              <p className="mt-3 text-sm leading-6 text-gray-500">
                처음부터 지금까지
                <br />
                둘이 만든 순간들을 모았어요.
              </p>
            </div>

            <div className="shrink-0 rounded-full border border-pink-100 bg-white px-3 py-2 text-xs font-semibold text-pink-500 shadow-sm">
              {events.length}개
            </div>
          </div>
        </header>

        {message && (
          <div className="mt-5 rounded-2xl border border-pink-100 bg-white px-4 py-3 text-center text-sm text-gray-600 shadow-sm">
            {message}
          </div>
        )}

        {events.length >
          0 && (
          <section className="mt-5 -mr-4">
            <div className="flex gap-2 overflow-x-auto pb-2 pr-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {[
                {
                  key: "all",
                  label: "전체",
                },
                {
                  key: "promise",
                  label: "약속",
                },
                {
                  key: "verification",
                  label: "인증",
                },
                {
                  key: "level",
                  label: "레벨업",
                },
                {
                  key: "reward",
                  label: "보상",
                },
                {
                  key: "memory",
                  label: "추억",
                },
                {
                  key: "important",
                  label: "중요",
                },
              ].map(
                (item) => {
                  const active =
                    filter ===
                    item.key;

                  return (
                    <button
                      type="button"
                      key={
                        item.key
                      }
                      onClick={() =>
                        setFilter(
                          item.key as
                            | "all"
                            | "promise"
                            | "verification"
                            | "level"
                            | "reward"
                            | "memory"
                            | "important"
                        )
                      }
                      className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold transition ${
                        active
                          ? "bg-pink-500 text-white shadow-sm"
                          : "border border-pink-100 bg-pink-50/60 text-gray-500 hover:bg-pink-50"
                      }`}
                    >
                      {item.key ===
                        "important" &&
                      active
                        ? "★ 중요"
                        : item.label}
                    </button>
                  );
                }
              )}
            </div>
          </section>
        )}

        {filteredEvents.length >
          0 &&
          availableMonths.length >
            1 && (
          <section className="mt-3">
            <select
              defaultValue=""
              onChange={(e) => {
                const monthKey =
                  e.target.value;

                if (!monthKey) {
                  return;
                }

                scrollToMonth(
                  monthKey
                );
              }}
              className="rounded-full border border-pink-100 bg-white px-4 py-2 text-xs font-semibold text-gray-600 shadow-sm outline-none"
              aria-label="타임라인 월 이동"
            >
              <option
                value=""
                disabled
              >
                📅 날짜 이동
              </option>

              {availableMonths.map(
                (monthKey) => {
                  const [
                    year,
                    month,
                  ] =
                    monthKey.split(
                      "-"
                    );

                  return (
                    <option
                      key={
                        monthKey
                      }
                      value={
                        monthKey
                      }
                    >
                      {year}년{" "}
                      {Number(
                        month
                      )}
                      월
                    </option>
                  );
                }
              )}
            </select>
          </section>
        )}

        {events.length >
          0 && (
          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-xs font-semibold text-gray-400">
              {
                filteredEvents.length
              }
              개의 기록
            </p>

            <select
              value={order}
              onChange={(e) =>
                setOrder(
                  e.target
                    .value as
                    | "oldest"
                    | "newest"
                    | "pinned"
                )
              }
              className="rounded-full border border-pink-100 bg-white px-3.5 py-2 text-xs font-semibold text-gray-600 shadow-sm outline-none"
            >
              <option value="oldest">
                오래된순
              </option>

              <option value="newest">
                최신순
              </option>

              <option value="pinned">
                ⭐ 중요 기록 우선
              </option>
            </select>
          </div>
        )}


        {events.length ===
        0 ? (
          <section className="mt-7 rounded-3xl border border-dashed border-pink-200 bg-white p-8 text-center shadow-sm">
            <div className="text-4xl">
              💗
            </div>

            <h2 className="mt-4 text-lg font-bold">
              아직 타임라인이 없어요
            </h2>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              약속과 인증,
              레벨업과 추억이 쌓이면
              <br />
              이곳에 우리의 이야기가 만들어져요 ♡
            </p>
          </section>
        ) : filteredEvents.length ===
          0 ? (
          <section className="mt-7 rounded-3xl border border-dashed border-pink-200 bg-white p-8 text-center shadow-sm">
            <div className="text-4xl">
              💕
            </div>

            <h2 className="mt-4 text-lg font-bold">
              {filter ===
              "important"
                ? "아직 중요 기록이 없어요"
                : "이 필터의 기록은 아직 없어요"}
            </h2>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              {filter ===
              "important" ? (
                <>
                  마음에 드는 기록의 ☆를 눌러
                  <br />
                  중요 기록으로 모아보세요 ♡
                </>
              ) : (
                <>
                  다른 종류의 타임라인을
                  <br />
                  확인해보세요 ♡
                </>
              )}
            </p>

            <button
              type="button"
              onClick={() =>
                setFilter(
                  "all"
                )
              }
              className="mt-5 rounded-full bg-pink-500 px-5 py-3 text-sm font-semibold text-white"
            >
              전체 기록 보기
            </button>
          </section>
        ) : (
          <section className="mt-7">
            {groups.map(
              (
                group,
                groupIndex
              ) => (
                <div
                  key={
                    group.dateKey
                  }
                  ref={(element) => {
                    const monthKey =
                      getKoreaMonthKey(
                        group.events[0]
                          .event_date
                      );

                    const previousGroup =
                      groups[
                        groupIndex -
                          1
                      ];

                    const previousMonthKey =
                      previousGroup
                        ? getKoreaMonthKey(
                            previousGroup
                              .events[0]
                              .event_date
                          )
                        : null;

                    if (
                      groupIndex ===
                        0 ||
                      previousMonthKey !==
                        monthKey
                    ) {
                      monthRefs.current[
                        monthKey
                      ] = element;
                    }
                  }}
                  className={
                    groupIndex ===
                    0
                      ? "scroll-mt-24"
                      : "mt-8 scroll-mt-24"
                  }
                >
                  <div className="sticky top-3 z-10 mb-4">
                    <span className="inline-flex items-center gap-2 rounded-full border border-pink-100 bg-white/95 px-4 py-2 text-xs font-semibold text-gray-600 shadow-sm backdrop-blur">
                      <span>
                        {
                          group.dateLabel
                        }
                      </span>

                      <span className="text-pink-400">
                        {
                          group.events.length
                        }
                        개
                      </span>
                    </span>
                  </div>

                  <div className="relative">
                    <div className="absolute bottom-0 left-[18px] top-0 w-px bg-pink-100" />

                    <div className="space-y-4">
                      {group.events.map(
                        (
                          event
                        ) => (
                          <div
                            key={
                              event.id
                            }
                            role="button"
                            tabIndex={0}
                            onClick={() =>
                              setSelectedEvent(
                                event
                              )
                            }
                            onKeyDown={(e) => {
                              if (
                                e.key ===
                                  "Enter" ||
                                e.key === " "
                              ) {
                                e.preventDefault();
                                setSelectedEvent(
                                  event
                                );
                              }
                            }}
                            className="relative flex w-full cursor-pointer items-start gap-4 text-left"
                          >
                            <div className="relative z-[1] flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-4 border-[#fff8fb] bg-white text-lg shadow-sm">
                              {
                                getEventEmoji(
                                  event.event_type
                                )
                              }
                            </div>

                            <div
                              className={`min-w-0 flex-1 rounded-3xl border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                                getEventCardStyle(
                                  event.event_type
                                ).card
                              }`}
                            >
                              <div className="mb-3 flex items-center justify-between gap-3">
                                <span
                                  className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                                    getEventCardStyle(
                                      event.event_type
                                    ).badge
                                  }`}
                                >
                                  {
                                    getEventCardStyle(
                                      event.event_type
                                    ).label
                                  }
                                </span>

                                {event.is_joint_promise && (
                                  <span className="rounded-full border border-pink-100 bg-pink-50 px-2.5 py-1 text-[10px] font-semibold text-pink-500">
                                    {event.event_type ===
                                    "first_verification"
                                      ? "💕 공동 약속 인증"
                                      : "💕 서로의 약속"}
                                  </span>
                                )}

                                <div className="ml-auto flex items-center gap-2">
                                  <span className="text-[11px] font-medium text-gray-400">
                                    {
                                      formatTime(
                                        event.event_date
                                      )
                                    }
                                  </span>

                                  <button
                                    type="button"
                                    disabled={
                                      pinProcessingId ===
                                      event.id
                                    }
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      void togglePinned(
                                        event
                                      );
                                    }}
                                    className={`flex h-8 w-8 items-center justify-center rounded-full text-sm transition disabled:opacity-50 ${
                                      event.is_pinned
                                        ? "bg-amber-100 text-amber-600"
                                        : "bg-white/70 text-gray-300"
                                    }`}
                                    aria-label={
                                      event.is_pinned
                                        ? "중요 기록 해제"
                                        : "중요 기록 고정"
                                    }
                                  >
                                    {event.is_pinned
                                      ? "★"
                                      : "☆"}
                                  </button>
                                </div>
                              </div>

                              {event.is_pinned && (
                                <p className="mb-1 text-[11px] font-semibold text-amber-600">
                                  ⭐ 중요 기록
                                </p>
                              )}

                              <p className="font-bold leading-6">
                                {
                                  event.title
                                }
                              </p>

                              {event.description && (
                                <p className="mt-1 break-words text-sm leading-6 text-gray-500">
                                  {
                                    event.description
                                  }
                                </p>
                              )}

                              {event.image_url && (
                                <div className="mt-3 overflow-hidden rounded-2xl bg-white/70">
                                  <img
                                    src={
                                      event.image_url
                                    }
                                    alt="타임라인 사진"
                                    className="max-h-52 w-full object-cover transition duration-300 hover:scale-[1.02]"
                                  />
                                </div>
                              )}

                              <div className="mt-3 flex items-center justify-end">
                                <span
                                  className={`h-2.5 w-2.5 rounded-full ${getEventAccent(
                                    event.event_type
                                  )}`}
                                />
                              </div>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>
              )
            )}
          </section>
        )}

        {selectedEvent && (
          <div
            className="fixed inset-0 z-[130] flex items-center justify-center bg-black/60 px-5 py-6"
            onClick={() =>
              setSelectedEvent(
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
                  setSelectedEvent(
                    null
                  )
                }
                className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-xl text-white backdrop-blur"
                aria-label="닫기"
              >
                ×
              </button>

              {selectedEvent.image_url && (
                <div className="bg-black">
                  <img
                    src={
                      selectedEvent.image_url
                    }
                    alt="타임라인 사진 크게 보기"
                    className="max-h-[55vh] w-full object-contain"
                  />
                </div>
              )}

              <div className="p-6">
                <div className="text-4xl">
                  {
                    getEventEmoji(
                      selectedEvent.event_type
                    )
                  }
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <p className="text-xs font-semibold tracking-[0.18em] text-pink-400">
                    OUR TIMELINE
                  </p>

                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                      getEventCardStyle(
                        selectedEvent.event_type
                      ).badge
                    }`}
                  >
                    {
                      getEventCardStyle(
                        selectedEvent.event_type
                      ).label
                    }
                  </span>

                  {selectedEvent.is_joint_promise && (
                    <span className="rounded-full border border-pink-100 bg-pink-50 px-2.5 py-1 text-[10px] font-semibold text-pink-500">
                      {selectedEvent.event_type ===
                      "first_verification"
                        ? "💕 공동 약속 인증"
                        : "💕 서로의 약속"}
                    </span>
                  )}
                </div>

                <h2 className="mt-2 text-xl font-bold leading-8">
                  {
                    selectedEvent.title
                  }
                </h2>

                {selectedEvent.description && (
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-gray-600">
                    {
                      selectedEvent.description
                    }
                  </p>
                )}

                <button
                  type="button"
                  disabled={
                    pinProcessingId ===
                    selectedEvent.id
                  }
                  onClick={() => {
                    void togglePinned(
                      selectedEvent
                    );
                  }}
                  className={`mt-5 w-full rounded-2xl px-4 py-3 text-sm font-semibold transition disabled:opacity-50 ${
                    selectedEvent.is_pinned
                      ? "bg-amber-100 text-amber-700"
                      : "border border-amber-100 bg-white text-amber-600"
                  }`}
                >
                  {selectedEvent.is_pinned
                    ? "★ 중요 기록으로 고정됨"
                    : "☆ 중요 기록으로 고정"}
                </button>

                <p className="mt-5 text-sm text-gray-400">
                  {
                    formatDateLabel(
                      selectedEvent.event_date
                    )
                  }
                  {" · "}
                  {
                    formatTime(
                      selectedEvent.event_date
                    )
                  }
                </p>
              </div>
            </div>
          </div>
        )}

        <BottomNav />
      </div>
    </main>
  );
}
