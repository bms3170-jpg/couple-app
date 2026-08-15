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

type TimelineFilter =
  | "all"
  | "promise"
  | "verification"
  | "level"
  | "reward"
  | "memory"
  | "important";

type TimelineOrder =
  | "oldest"
  | "newest"
  | "pinned";

const KOREA_TIME_ZONE = "Asia/Seoul";

const TIMELINE_IMAGES = {
  header: "/images/timeline01header.png",
  story: "/images/timeline02story.png",
  memory: "/images/timeline03memory.png",
  rewards: "/images/timeline04rewards.png",
  promises: "/images/timeline05promises.png",
  moments: "/images/timeline06moments.png",
} as const;

const FILTERS: {
  key: TimelineFilter;
  label: string;
  icon: string;
}[] = [
  { key: "all", label: "전체", icon: "♡" },
  { key: "promise", label: "약속", icon: "✓" },
  { key: "verification", label: "인증", icon: "✦" },
  { key: "level", label: "레벨업", icon: "↑" },
  { key: "reward", label: "보상", icon: "◇" },
  { key: "memory", label: "추억", icon: "◌" },
  { key: "important", label: "대표 순간", icon: "♥" },
];

function getEventEmoji(eventType: string) {
  switch (eventType) {
    case "couple_started":
      return "💕";
    case "first_promise":
    case "promise_created":
      return "✅";
    case "promise_ended":
      return "🌙";
    case "first_verification":
      return "📸";
    case "level_milestone":
    case "level_up":
      return "✨";
    case "level_reward_used":
    case "promise_reward_used":
      return "🎁";
    case "memory_created":
      return "💗";
    default:
      return "♡";
  }
}

function getEventAccent(eventType: string) {
  switch (eventType) {
    case "couple_started":
      return "bg-pink-400";
    case "first_promise":
    case "promise_created":
      return "bg-emerald-400";
    case "promise_ended":
      return "bg-slate-400";
    case "first_verification":
      return "bg-violet-400";
    case "level_milestone":
    case "level_up":
      return "bg-amber-400";
    case "level_reward_used":
    case "promise_reward_used":
      return "bg-orange-400";
    case "memory_created":
      return "bg-rose-400";
    default:
      return "bg-pink-400";
  }
}

function getEventCardStyle(eventType: string) {
  switch (eventType) {
    case "couple_started":
      return {
        card:
          "border-pink-100 bg-gradient-to-br from-white via-white to-pink-50/90",
        badge: "bg-pink-50 text-pink-500",
        label: "우리 시작",
      };

    case "first_promise":
    case "promise_created":
      return {
        card:
          "border-emerald-100 bg-gradient-to-br from-white via-white to-emerald-50/70",
        badge: "bg-emerald-50 text-emerald-600",
        label: "약속",
      };

    case "promise_ended":
      return {
        card:
          "border-slate-200 bg-gradient-to-br from-white to-slate-50",
        badge: "bg-slate-100 text-slate-600",
        label: "약속 종료",
      };

    case "first_verification":
      return {
        card:
          "border-violet-100 bg-gradient-to-br from-white via-white to-violet-50/70",
        badge: "bg-violet-50 text-violet-600",
        label: "인증",
      };

    case "level_milestone":
    case "level_up":
      return {
        card:
          "border-amber-100 bg-gradient-to-br from-white via-white to-amber-50/70",
        badge: "bg-amber-50 text-amber-700",
        label: "레벨업",
      };

    case "level_reward_used":
    case "promise_reward_used":
      return {
        card:
          "border-orange-100 bg-gradient-to-br from-white via-white to-orange-50/70",
        badge: "bg-orange-50 text-orange-600",
        label: "보상",
      };

    case "memory_created":
      return {
        card:
          "border-rose-100 bg-gradient-to-br from-white via-white to-rose-50/70",
        badge: "bg-rose-50 text-rose-600",
        label: "추억",
      };

    default:
      return {
        card: "border-pink-100 bg-white",
        badge: "bg-pink-50 text-pink-500",
        label: "기록",
      };
  }
}

function formatDateLabel(value: string) {
  return new Date(value).toLocaleDateString("ko-KR", {
    timeZone: KOREA_TIME_ZONE,
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("ko-KR", {
    timeZone: KOREA_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getKoreaDateKey(value: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: KOREA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));

  const year =
    parts.find((part) => part.type === "year")?.value ?? "";
  const month =
    parts.find((part) => part.type === "month")?.value ?? "";
  const day =
    parts.find((part) => part.type === "day")?.value ?? "";

  return `${year}-${month}-${day}`;
}

function getKoreaMonthKey(value: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: KOREA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date(value));

  const year =
    parts.find((part) => part.type === "year")?.value ?? "";
  const month =
    parts.find((part) => part.type === "month")?.value ?? "";

  return `${year}-${month}`;
}

function getKoreaMonthDay(value: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: KOREA_TIME_ZONE,
    month: "short",
    day: "2-digit",
  }).formatToParts(new Date(value));

  const month =
    parts.find((part) => part.type === "month")?.value ?? "";
  const day =
    parts.find((part) => part.type === "day")?.value ?? "";

  return {
    month: month.toUpperCase(),
    day,
  };
}

function matchesTimelineFilter(
  eventType: string,
  filter: TimelineFilter
) {
  if (filter === "all") return true;

  if (filter === "promise") {
    return [
      "first_promise",
      "promise_created",
      "promise_ended",
    ].includes(eventType);
  }

  if (filter === "verification") {
    return eventType === "first_verification";
  }

  if (filter === "level") {
    return ["level_milestone", "level_up"].includes(eventType);
  }

  if (filter === "reward") {
    return [
      "level_reward_used",
      "promise_reward_used",
    ].includes(eventType);
  }

  if (filter === "memory") {
    return eventType === "memory_created";
  }

  return true;
}

function isPromiseEvent(eventType: string) {
  return [
    "first_promise",
    "promise_created",
    "promise_ended",
  ].includes(eventType);
}

function isRewardEvent(eventType: string) {
  return [
    "level_reward_used",
    "promise_reward_used",
  ].includes(eventType);
}

function isLevelEvent(eventType: string) {
  return ["level_milestone", "level_up"].includes(eventType);
}

export default function UsTimelinePage() {
  const supabase = useMemo(() => createClient(), []);

  const {
    user,
    loading: authLoading,
  } = useAuth();

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [selectedEvent, setSelectedEvent] =
    useState<TimelineEvent | null>(null);
  const [pinProcessingId, setPinProcessingId] =
    useState<string | null>(null);
  const [order, setOrder] =
    useState<TimelineOrder>("oldest");
  const [filter, setFilter] =
    useState<TimelineFilter>("all");

  const monthRefs = useRef<
    Record<string, HTMLDivElement | null>
  >({});

  useEffect(() => {
    let cancelled = false;

    async function loadTimeline() {
      if (authLoading) return;

      if (!user) {
        window.location.href = "/login";
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
        .eq("user_id", user.id)
        .maybeSingle();

      if (cancelled) return;

      if (membershipError || !membership) {
        console.error("커플 조회 오류:", membershipError);
        setMessage("커플 정보를 찾을 수 없어요.");
        setLoading(false);
        return;
      }

      const coupleId = membership.couple_id;

      const {
        data: timelineRows,
        error: timelineError,
      } = await supabase
        .from("couple_timeline_events")
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
        .eq("couple_id", coupleId)
        .order("event_date", {
          ascending: true,
        });

      if (cancelled) return;

      if (timelineError) {
        console.error("타임라인 조회 오류:", timelineError);
        setMessage("타임라인을 불러오지 못했어요.");
        setLoading(false);
        return;
      }

      const promiseRelatedIds = Array.from(
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
                ].includes(item.event_type) &&
                item.related_id
            )
            .map((item) => item.related_id as string)
        )
      );

      const jointPromiseIds = new Set<string>();

      if (promiseRelatedIds.length > 0) {
        const {
          data: promiseRows,
          error: promiseError,
        } = await supabase
          .from("promises")
          .select("id, is_joint")
          .in("id", promiseRelatedIds);

        if (promiseError) {
          console.error(
            "타임라인 공동 약속 조회 오류:",
            promiseError
          );
        } else {
          (promiseRows ?? [])
            .filter((promise) => promise.is_joint)
            .forEach((promise) =>
              jointPromiseIds.add(promise.id)
            );
        }
      }

      const mappedEvents = await Promise.all(
        (timelineRows ?? []).map(async (item) => {
          let imageUrl: string | null = null;

          if (item.image_path) {
            if (item.event_type === "first_verification") {
              const {
                data: signedData,
                error: signedError,
              } = await supabase.storage
                .from("verification-images")
                .createSignedUrl(
                  item.image_path,
                  60 * 60
                );

              if (!signedError && signedData) {
                imageUrl = signedData.signedUrl;
              } else if (signedError) {
                console.error(
                  "인증 사진 URL 생성 오류:",
                  signedError
                );
              }
            }

            if (item.event_type === "memory_created") {
              imageUrl = supabase.storage
                .from("level-reward-memories")
                .getPublicUrl(item.image_path).data.publicUrl;
            }
          }

          return {
            ...item,
            is_pinned: item.is_pinned ?? false,
            image_url: imageUrl,
            is_joint_promise: Boolean(
              item.related_id &&
                jointPromiseIds.has(item.related_id)
            ),
          };
        })
      );

      if (cancelled) return;

      setEvents(mappedEvents as TimelineEvent[]);
      setLoading(false);
    }

    void loadTimeline();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user, supabase]);

  const counts = useMemo(() => {
    return {
      total: events.length,
      promise: events.filter((event) =>
        isPromiseEvent(event.event_type)
      ).length,
      verification: events.filter(
        (event) => event.event_type === "first_verification"
      ).length,
      level: events.filter((event) =>
        isLevelEvent(event.event_type)
      ).length,
      reward: events.filter((event) =>
        isRewardEvent(event.event_type)
      ).length,
      memory: events.filter(
        (event) => event.event_type === "memory_created"
      ).length,
      important: events.filter((event) => event.is_pinned).length,
    };
  }, [events]);

  const featuredEvent = useMemo(() => {
    const pinned = events
      .filter((event) => event.is_pinned)
      .sort(
        (a, b) =>
          new Date(b.event_date).getTime() -
          new Date(a.event_date).getTime()
      );

    return pinned[0] ?? null;
  }, [events]);

  const todayMemory = useMemo(() => {
    if (events.length === 0) return null;

    const todayParts = new Intl.DateTimeFormat("en-US", {
      timeZone: KOREA_TIME_ZONE,
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());

    const todayMonth =
      todayParts.find((part) => part.type === "month")?.value ??
      "";
    const todayDay =
      todayParts.find((part) => part.type === "day")?.value ?? "";

    const candidates = events
      .filter((event) => {
        const parts = new Intl.DateTimeFormat("en-US", {
          timeZone: KOREA_TIME_ZONE,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).formatToParts(new Date(event.event_date));

        const year = Number(
          parts.find((part) => part.type === "year")?.value ?? 0
        );
        const month =
          parts.find((part) => part.type === "month")?.value ?? "";
        const day =
          parts.find((part) => part.type === "day")?.value ?? "";

        const currentYear = Number(
          new Intl.DateTimeFormat("en-US", {
            timeZone: KOREA_TIME_ZONE,
            year: "numeric",
          }).format(new Date())
        );

        return (
          month === todayMonth &&
          day === todayDay &&
          year < currentYear
        );
      })
      .sort(
        (a, b) =>
          new Date(b.event_date).getTime() -
          new Date(a.event_date).getTime()
      );

    return candidates[0] ?? null;
  }, [events]);

  const filteredEvents = events.filter((event) => {
    if (filter === "important") return event.is_pinned;

    return matchesTimelineFilter(
      event.event_type,
      filter
    );
  });

  const sortedEvents = [...filteredEvents].sort((a, b) => {
    const aTime = new Date(a.event_date).getTime();
    const bTime = new Date(b.event_date).getTime();

    if (
      order === "pinned" &&
      a.is_pinned !== b.is_pinned
    ) {
      return a.is_pinned ? -1 : 1;
    }

    if (order === "oldest") {
      return aTime - bTime;
    }

    return bTime - aTime;
  });

  const groups: TimelineGroup[] = Array.from(
    sortedEvents.reduce((map, event) => {
      const dateKey = getKoreaDateKey(event.event_date);
      const current = map.get(dateKey) ?? [];

      current.push(event);
      map.set(dateKey, current);

      return map;
    }, new Map<string, TimelineEvent[]>())
  ).map(([dateKey, groupEvents]) => ({
    dateKey,
    dateLabel: formatDateLabel(
      groupEvents[0].event_date
    ),
    events: groupEvents,
  }));

  const availableMonths = Array.from(
    new Set(
      sortedEvents.map((event) =>
        getKoreaMonthKey(event.event_date)
      )
    )
  );

  const monthlyRecaps = useMemo(() => {
    const map = new Map<
      string,
      {
        total: number;
        promise: number;
        verification: number;
        reward: number;
        memory: number;
      }
    >();

    events.forEach((event) => {
      const key = getKoreaMonthKey(event.event_date);
      const current = map.get(key) ?? {
        total: 0,
        promise: 0,
        verification: 0,
        reward: 0,
        memory: 0,
      };

      current.total += 1;

      if (isPromiseEvent(event.event_type)) {
        current.promise += 1;
      }

      if (event.event_type === "first_verification") {
        current.verification += 1;
      }

      if (isRewardEvent(event.event_type)) {
        current.reward += 1;
      }

      if (event.event_type === "memory_created") {
        current.memory += 1;
      }

      map.set(key, current);
    });

    return map;
  }, [events]);

  async function togglePinned(event: TimelineEvent) {
    if (pinProcessingId === event.id) return;

    setPinProcessingId(event.id);

    const nextValue = !event.is_pinned;

    const { error } = await supabase
      .from("couple_timeline_events")
      .update({
        is_pinned: nextValue,
      })
      .eq("id", event.id);

    setPinProcessingId(null);

    if (error) {
      console.error("대표 순간 변경 오류:", error);
      window.alert(
        `대표 순간을 변경하지 못했어요: ${error.message}`
      );
      return;
    }

    setEvents((prev) =>
      prev.map((item) =>
        item.id === event.id
          ? {
              ...item,
              is_pinned: nextValue,
            }
          : item
      )
    );

    if (selectedEvent?.id === event.id) {
      setSelectedEvent({
        ...selectedEvent,
        is_pinned: nextValue,
      });
    }
  }

  function scrollToMonth(monthKey: string) {
    monthRefs.current[monthKey]?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  if (authLoading || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fff8fb]">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center overflow-hidden rounded-[22px] border border-pink-100 bg-white p-1 shadow-sm">
            <img
              src={TIMELINE_IMAGES.header}
              alt="OurQuest"
              className="h-full w-full rounded-[18px] object-cover"
            />
          </div>
          <p className="mt-4 text-sm text-gray-500">
            우리의 시간 불러오는 중...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top,_#fff0f7_0,_#fff8fb_34%,_#fff8fb_100%)] px-4 py-7 text-[#2b2b2b] sm:px-5 sm:py-8">
      <div className="mx-auto max-w-md pb-28">
        <Link
          href="/us"
          prefetch={false}
          className="inline-flex items-center gap-1.5 rounded-full px-1 py-1 text-sm font-semibold text-gray-500 transition hover:text-pink-500"
        >
          <span>←</span>
          <span>우리로 돌아가기</span>
        </Link>

        <header className="mt-5 aspect-[16/10] overflow-hidden rounded-[32px] border border-pink-100/80 bg-[#fff4f9] shadow-[0_14px_40px_rgba(236,72,153,0.08)]">
          <img
            src={TIMELINE_IMAGES.header}
            alt="우리의 타임라인"
            className="h-full w-full scale-[1.01] object-cover object-[center_54%]"
          />
        </header>

        {message && (
          <div className="mt-4 rounded-2xl border border-pink-100 bg-white px-4 py-3 text-center text-sm text-gray-600 shadow-sm">
            {message}
          </div>
        )}

        {events.length > 0 && (
          <section className="mt-4 aspect-[16/9] overflow-hidden rounded-[32px] border border-pink-100/90 bg-[#fff4f9] shadow-[0_10px_30px_rgba(236,72,153,0.06)]">
            <img
              src={TIMELINE_IMAGES.story}
              alt="Our Story"
              className="h-full w-full scale-[1.01] object-cover object-center"
            />
          </section>
        )}

        {events.length > 0 && (
          <section className="mt-5">
            <div className="mb-3 flex items-end justify-between px-1">
              <div>
                <p className="text-[10px] font-extrabold tracking-[0.18em] text-pink-400">
                  STORY COLLECTION
                </p>
                <h2 className="mt-1 text-base font-black">
                  우리 이야기 골라보기
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setFilter("all")}
                className="text-[11px] font-semibold text-gray-400"
              >
                전체 보기
              </button>
            </div>

            <div className="-mr-4 flex gap-3 overflow-x-auto pb-2 pr-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {[
                {
                  key: "promise" as TimelineFilter,
                  image: TIMELINE_IMAGES.promises,
                  eyebrow: "PROMISE",
                  title: "함께하는 약속",
                  count: counts.promise,
                },
                {
                  key: "reward" as TimelineFilter,
                  image: TIMELINE_IMAGES.rewards,
                  eyebrow: "REWARD",
                  title: "우리의 보상",
                  count: counts.reward,
                },
                {
                  key: "memory" as TimelineFilter,
                  image: TIMELINE_IMAGES.memory,
                  eyebrow: "MEMORY",
                  title: "우리의 추억",
                  count: counts.memory,
                },
              ].map((item) => (
                <button
                  type="button"
                  key={item.key}
                  onClick={() => setFilter(item.key)}
                  className={`w-[245px] shrink-0 overflow-hidden rounded-[26px] border bg-white text-left shadow-sm transition active:scale-[0.99] ${
                    filter === item.key
                      ? "border-pink-300 ring-2 ring-pink-100"
                      : "border-pink-100"
                  }`}
                >
                  <div className="h-[120px] overflow-hidden bg-[#fff3f8]">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-[9px] font-extrabold tracking-[0.16em] text-pink-400">
                        {item.eyebrow}
                      </p>
                      <p className="mt-0.5 truncate text-sm font-black">
                        {item.title}
                      </p>
                    </div>
                    <div className="flex h-9 min-w-9 items-center justify-center rounded-full bg-pink-50 px-2 text-xs font-black text-pink-500">
                      {item.count}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {featuredEvent && (
          <button
            type="button"
            onClick={() => setSelectedEvent(featuredEvent)}
            className="mt-5 w-full overflow-hidden rounded-[30px] border border-pink-100 bg-white text-left shadow-[0_12px_35px_rgba(236,72,153,0.07)] transition active:scale-[0.99]"
          >
            <div className="relative h-[150px] overflow-hidden bg-[#fff3f8]">
              <img
                src={TIMELINE_IMAGES.moments}
                alt="우리의 순간"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white via-white/55 to-transparent" />
              <div className="absolute left-3 top-3 rounded-full bg-pink-500 px-3 py-1.5 text-[10px] font-bold text-white shadow-sm">
                ♥ 대표 순간
              </div>
            </div>

            <div className="relative -mt-3 px-4 pb-4">
              <div className="rounded-[22px] border border-pink-100/80 bg-white px-4 py-3 shadow-sm">
                <p className="text-[9px] font-extrabold tracking-[0.18em] text-pink-400">
                  OUR FAVORITE MOMENT
                </p>
                <p className="mt-1.5 line-clamp-2 font-black leading-6">
                  {featuredEvent.title}
                </p>
                <p className="mt-1 text-[11px] text-gray-400">
                  {formatDateLabel(featuredEvent.event_date)}
                </p>
              </div>
            </div>
          </button>
        )}

        {todayMemory && (
          <button
            type="button"
            onClick={() => setSelectedEvent(todayMemory)}
            className="mt-4 w-full overflow-hidden rounded-[26px] border border-pink-100 bg-white text-left shadow-sm"
          >
            <div className="flex items-center gap-3 p-3">
              <div className="h-16 w-20 shrink-0 overflow-hidden rounded-[18px] bg-pink-50">
                <img
                  src={TIMELINE_IMAGES.memory}
                  alt="오늘의 추억"
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-extrabold tracking-[0.18em] text-pink-400">
                  ON THIS DAY
                </p>
                <p className="mt-1 truncate text-sm font-black">
                  오늘의 추억 · {todayMemory.title}
                </p>
                <p className="mt-1 text-[10px] text-gray-400">
                  같은 날짜에 남긴 우리의 기록이에요.
                </p>
              </div>

              <span className="pr-1 text-lg text-pink-300">›</span>
            </div>
          </button>
        )}

        {events.length > 0 && (
          <section className="mt-5 -mr-4">
            <div className="flex gap-2 overflow-x-auto pb-2 pr-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {FILTERS.map((item) => {
                const active = filter === item.key;

                return (
                  <button
                    type="button"
                    key={item.key}
                    onClick={() => setFilter(item.key)}
                    className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2.5 text-xs font-semibold transition ${
                      active
                        ? "bg-pink-500 text-white shadow-md shadow-pink-200/50"
                        : "border border-pink-100 bg-white text-gray-500 shadow-[0_2px_10px_rgba(236,72,153,0.04)]"
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {filteredEvents.length > 0 &&
          availableMonths.length > 1 && (
            <section className="mt-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {availableMonths.map((monthKey) => {
                const [year, month] = monthKey.split("-");
                const recap = monthlyRecaps.get(monthKey);

                return (
                  <button
                    type="button"
                    key={monthKey}
                    onClick={() => scrollToMonth(monthKey)}
                    className="shrink-0 rounded-2xl border border-pink-100 bg-white px-4 py-3 text-left shadow-sm"
                  >
                    <p className="text-[10px] font-semibold text-pink-400">
                      {year}.{month}
                    </p>
                    <p className="mt-1 text-xs font-bold text-gray-700">
                      {recap?.total ?? 0}개의 순간
                    </p>
                  </button>
                );
              })}
            </section>
          )}

        {events.length > 0 && (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-[22px] border border-pink-100/70 bg-white/70 px-3 py-2.5 shadow-sm backdrop-blur">
            <div>
              <p className="text-[9px] font-extrabold tracking-[0.16em] text-pink-400">
                STORY ARCHIVE
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-gray-400">
                {filteredEvents.length}개의 기록
              </p>
            </div>

            <select
              value={order}
              onChange={(e) =>
                setOrder(e.target.value as TimelineOrder)
              }
              className="rounded-full border border-pink-100 bg-white px-3.5 py-2 text-xs font-semibold text-gray-600 shadow-sm outline-none"
              aria-label="타임라인 정렬"
            >
              <option value="oldest">오래된순</option>
              <option value="newest">최신순</option>
              <option value="pinned">♥ 대표 순간 우선</option>
            </select>
          </div>
        )}

        {events.length === 0 ? (
          <section className="mt-7 overflow-hidden rounded-[32px] border border-dashed border-pink-200 bg-white text-center shadow-sm">
            <div className="h-[150px] overflow-hidden bg-[#fff3f8]">
              <img
                src={TIMELINE_IMAGES.moments}
                alt="우리의 첫 이야기"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="p-7">
              <p className="text-[10px] font-bold tracking-[0.2em] text-pink-400">
                OUR FIRST STORY
              </p>

              <h2 className="mt-2 text-lg font-bold">
                아직 타임라인이 없어요
              </h2>

              <p className="mt-2 text-sm leading-6 text-gray-500">
                약속과 인증, 레벨업과 추억이 쌓이면
                <br />
                이곳에 둘만의 이야기가 만들어져요 ♡
              </p>
            </div>
          </section>
        ) : filteredEvents.length === 0 ? (
          <section className="mt-7 rounded-[32px] border border-dashed border-pink-200 bg-white p-8 text-center shadow-sm">
            <div className="text-4xl">
              {filter === "important" ? "💖" : "💕"}
            </div>

            <h2 className="mt-4 text-lg font-bold">
              {filter === "important"
                ? "아직 대표 순간이 없어요"
                : "이 종류의 기록은 아직 없어요"}
            </h2>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              {filter === "important" ? (
                <>
                  마음에 남는 기록의 ♡를 눌러
                  <br />
                  둘만의 대표 순간으로 남겨보세요.
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
              onClick={() => setFilter("all")}
              className="mt-5 rounded-full bg-pink-500 px-5 py-3 text-sm font-semibold text-white shadow-sm"
            >
              전체 기록 보기
            </button>
          </section>
        ) : (
          <section className="mt-7">
            {groups.map((group, groupIndex) => {
              const chapter = getKoreaMonthDay(
                group.events[0].event_date
              );
              const monthKey = getKoreaMonthKey(
                group.events[0].event_date
              );
              const recap = monthlyRecaps.get(monthKey);
              const previousGroup = groups[groupIndex - 1];
              const previousMonthKey = previousGroup
                ? getKoreaMonthKey(
                    previousGroup.events[0].event_date
                  )
                : null;
              const isNewMonth =
                groupIndex === 0 ||
                previousMonthKey !== monthKey;

              return (
                <div
                  key={group.dateKey}
                  ref={(element) => {
                    if (isNewMonth) {
                      monthRefs.current[monthKey] = element;
                    }
                  }}
                  className={
                    groupIndex === 0
                      ? "scroll-mt-24"
                      : "mt-9 scroll-mt-24"
                  }
                >
                  {isNewMonth && (
                    <div className="mb-5 rounded-[24px] border border-pink-100 bg-white/85 px-4 py-3 shadow-sm backdrop-blur">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-bold tracking-[0.2em] text-pink-400">
                            MONTHLY RECAP
                          </p>
                          <p className="mt-1 text-sm font-bold">
                            {monthKey.replace("-", ".")} ·{" "}
                            {recap?.total ?? 0}개의 순간
                          </p>
                        </div>

                        <div className="text-right text-[10px] leading-5 text-gray-400">
                          <p>
                            약속 {recap?.promise ?? 0} · 인증{" "}
                            {recap?.verification ?? 0}
                          </p>
                          <p>
                            보상 {recap?.reward ?? 0} · 추억{" "}
                            {recap?.memory ?? 0}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mb-5 flex items-end gap-3">
                    <div className="min-w-[62px]">
                      <p className="text-[10px] font-bold tracking-[0.16em] text-pink-400">
                        {chapter.month}
                      </p>
                      <p className="mt-0.5 text-3xl font-black tracking-tight">
                        {chapter.day}
                      </p>
                    </div>

                    <div className="mb-1 min-w-0 flex-1 border-b border-pink-100 pb-2">
                      <p className="truncate text-xs font-semibold text-gray-500">
                        {group.dateLabel}
                      </p>
                      <p className="mt-1 text-[10px] text-pink-400">
                        우리의 순간 {group.events.length}개
                      </p>
                    </div>
                  </div>

                  <div className="relative">
                    <div className="absolute bottom-0 left-[19px] top-0 w-px bg-gradient-to-b from-pink-200 via-pink-100 to-transparent" />

                    <div className="space-y-4">
                      {group.events.map((event) => {
                        const style = getEventCardStyle(
                          event.event_type
                        );

                        return (
                          <div
                            key={event.id}
                            role="button"
                            tabIndex={0}
                            onClick={() =>
                              setSelectedEvent(event)
                            }
                            onKeyDown={(e) => {
                              if (
                                e.key === "Enter" ||
                                e.key === " "
                              ) {
                                e.preventDefault();
                                setSelectedEvent(event);
                              }
                            }}
                            className="relative flex w-full cursor-pointer items-start gap-4 text-left"
                          >
                            <div className="relative z-[1] flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-[4px] border-[#fff8fb] bg-white text-lg shadow-sm">
                              {getEventEmoji(event.event_type)}
                            </div>

                            <article
                              className={`min-w-0 flex-1 overflow-hidden rounded-[28px] border shadow-[0_8px_28px_rgba(236,72,153,0.055)] transition active:scale-[0.995] ${style.card}`}
                            >
                              {event.image_url && (
                                <div className="relative mx-4 mt-4 overflow-hidden rounded-[22px] bg-white shadow-sm">
                                  <img
                                    src={event.image_url}
                                    alt="타임라인 사진"
                                    className="max-h-72 w-full object-cover"
                                  />

                                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/20 to-transparent" />
                                </div>
                              )}

                              <div className="p-4">
                                <div className="flex items-start gap-2">
                                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                                    <span
                                      className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${style.badge}`}
                                    >
                                      {style.label}
                                    </span>

                                    {event.is_joint_promise && (
                                      <span className="rounded-full border border-pink-100 bg-white/80 px-2.5 py-1 text-[10px] font-semibold text-pink-500">
                                        {event.event_type ===
                                        "first_verification"
                                          ? "💕 공동 약속 인증"
                                          : "💕 서로의 약속"}
                                      </span>
                                    )}

                                    {event.is_pinned && (
                                      <span className="rounded-full bg-pink-50 px-2.5 py-1 text-[10px] font-semibold text-pink-500">
                                        ♥ 대표 순간
                                      </span>
                                    )}
                                  </div>

                                  <button
                                    type="button"
                                    disabled={
                                      pinProcessingId === event.id
                                    }
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      void togglePinned(event);
                                    }}
                                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base transition disabled:opacity-50 ${
                                      event.is_pinned
                                        ? "bg-pink-100 text-pink-500"
                                        : "bg-white/80 text-gray-300"
                                    }`}
                                    aria-label={
                                      event.is_pinned
                                        ? "대표 순간 해제"
                                        : "대표 순간으로 저장"
                                    }
                                  >
                                    {event.is_pinned ? "♥" : "♡"}
                                  </button>
                                </div>

                                <p className="mt-3 text-[11px] font-medium text-gray-400">
                                  {formatTime(event.event_date)}
                                </p>

                                <h3 className="mt-1 font-bold leading-6">
                                  {event.title}
                                </h3>

                                {event.description && (
                                  <p className="mt-1 line-clamp-3 break-words text-sm leading-6 text-gray-500">
                                    {event.description}
                                  </p>
                                )}

                                <div className="mt-4 flex items-center justify-between">
                                  <span className="text-[10px] font-medium text-gray-300">
                                    눌러서 자세히 보기
                                  </span>

                                  <span
                                    className={`h-2.5 w-2.5 rounded-full ${getEventAccent(
                                      event.event_type
                                    )}`}
                                  />
                                </div>
                              </div>
                            </article>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </section>
        )}

        <Link
          href="/us"
          prefetch={false}
          className="mt-8 block w-full rounded-2xl border border-pink-100 bg-white/80 px-4 py-3.5 text-center text-xs font-semibold text-gray-400 transition hover:bg-pink-50 hover:text-pink-500"
        >
          우리 페이지로 돌아가기
        </Link>

        {selectedEvent && (
          <div
            className="fixed inset-0 z-[130] flex items-end justify-center bg-black/45 px-4 pb-4 pt-12 backdrop-blur-[2px] sm:items-center sm:py-6"
            onClick={() => setSelectedEvent(null)}
          >
            <div
              className="relative max-h-[88vh] w-full max-w-sm overflow-y-auto rounded-[34px] bg-[#fffafd] shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 z-20 flex justify-end p-4 pb-0">
                <button
                  type="button"
                  onClick={() => setSelectedEvent(null)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-xl text-gray-500 shadow-sm backdrop-blur"
                  aria-label="닫기"
                >
                  ×
                </button>
              </div>

              {selectedEvent.image_url && (
                <div className="-mt-10 bg-black">
                  <img
                    src={selectedEvent.image_url}
                    alt="타임라인 사진 크게 보기"
                    className="max-h-[48vh] w-full object-contain"
                  />
                </div>
              )}

              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-3xl shadow-sm">
                    {getEventEmoji(
                      selectedEvent.event_type
                    )}
                  </div>

                  <p className="text-[10px] font-bold tracking-[0.2em] text-pink-400">
                    OUR MOMENT
                  </p>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-2">
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

                  {selectedEvent.is_pinned && (
                    <span className="rounded-full bg-pink-100 px-2.5 py-1 text-[10px] font-semibold text-pink-500">
                      ♥ 대표 순간
                    </span>
                  )}
                </div>

                <h2 className="mt-3 text-xl font-bold leading-8">
                  {selectedEvent.title}
                </h2>

                {selectedEvent.description && (
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-gray-600">
                    {selectedEvent.description}
                  </p>
                )}

                <div className="mt-5 rounded-2xl bg-white px-4 py-3 shadow-sm">
                  <p className="text-[10px] font-bold tracking-[0.16em] text-pink-400">
                    THE DAY
                  </p>
                  <p className="mt-1 text-sm font-semibold text-gray-600">
                    {formatDateLabel(selectedEvent.event_date)}
                    {" · "}
                    {formatTime(selectedEvent.event_date)}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={
                    pinProcessingId === selectedEvent.id
                  }
                  onClick={() => {
                    void togglePinned(selectedEvent);
                  }}
                  className={`mt-4 w-full rounded-2xl px-4 py-3.5 text-sm font-semibold transition disabled:opacity-50 ${
                    selectedEvent.is_pinned
                      ? "bg-pink-500 text-white shadow-sm"
                      : "border border-pink-100 bg-white text-pink-500"
                  }`}
                >
                  {selectedEvent.is_pinned
                    ? "♥ 우리의 대표 순간으로 저장됨"
                    : "♡ 우리의 대표 순간으로 남기기"}
                </button>
              </div>
            </div>
          </div>
        )}

        <BottomNav />
      </div>
    </main>
  );
}
