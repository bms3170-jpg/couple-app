"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";

import { createClient } from "@/lib/supabase/client";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/components/AuthProvider";

type Member = {
  user_id: string;
  nickname: string;
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
  is_active: boolean;
  created_at: string;
  deleted_at: string | null;
};

export default function PromisesPage() {
  const supabase = useMemo(
    () => createClient(),
    []
  );

  // =========================================
  // 공통 로그인 정보
  // =========================================

  const {
    user,
    loading: authLoading,
  } = useAuth();

  // =========================================
  // 상태
  // =========================================

  const [loading, setLoading] =
    useState(true);

  const [message, setMessage] =
    useState("");

  const [members, setMembers] =
    useState<Member[]>([]);

  const [promises, setPromises] =
    useState<PromiseItem[]>([]);

  const [
    currentCoupleId,
    setCurrentCoupleId,
  ] = useState<string | null>(
    null
  );

  const [
    endingPromiseId,
    setEndingPromiseId,
  ] = useState<string | null>(
    null
  );

  const [tab, setTab] =
    useState<
      "active" | "ended"
    >("active");

  const [
    expandedPromiseId,
    setExpandedPromiseId,
  ] = useState<string | null>(
    null
  );

  const [
    showPromiseList,
    setShowPromiseList,
  ] = useState(true);

  // =========================================
  // 약속 불러오기
  // =========================================

  const loadPromises =
    useCallback(
      async () => {
        // AuthProvider가 로그인 상태 확인 중이면 기다림
        if (authLoading) {
          return;
        }

        // 로그인 상태 확인이 끝났는데 user가 없는 경우
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
          .from("couple_members")
          .select("couple_id")
          .eq(
            "user_id",
            user.id
          )
          .maybeSingle();

        if (membershipError) {
          console.error(
            `멤버십 조회 오류 | message=${membershipError.message} | code=${membershipError.code} | details=${membershipError.details ?? ""} | hint=${membershipError.hint ?? ""}`
          );

          setMessage(
            "커플 정보를 찾을 수 없어요."
          );

          setLoading(false);
          return;
        }

        if (!membership) {
          setMessage(
            "커플 정보를 찾을 수 없어요."
          );

          setLoading(false);
          return;
        }

        const coupleId =
          membership.couple_id;

        setCurrentCoupleId(
          coupleId
        );

        // =====================================
        // 커플 멤버
        // =====================================

        const {
          data: memberRows,
          error: memberError,
        } = await supabase
          .from("couple_members")
          .select("user_id")
          .eq(
            "couple_id",
            coupleId
          );

        if (memberError) {
          console.error(
            `멤버 조회 오류 | message=${memberError.message} | code=${memberError.code} | details=${memberError.details ?? ""} | hint=${memberError.hint ?? ""}`
          );

          setMessage(
            "멤버 정보를 불러오지 못했어요."
          );

          setLoading(false);
          return;
        }

        const userIds =
          memberRows?.map(
            (item) =>
              item.user_id
          ) ?? [];

        // =====================================
        // 닉네임
        // =====================================

        const {
          data: profileRows,
          error: profileError,
        } = userIds.length
          ? await supabase
              .from("profiles")
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

        if (profileError) {
          console.error(
            `프로필 조회 오류 | message=${profileError.message} | code=${profileError.code} | details=${profileError.details ?? ""} | hint=${profileError.hint ?? ""}`
          );

          setMessage(
            "프로필 정보를 불러오지 못했어요."
          );

          setLoading(false);
          return;
        }

        const loadedMembers:
          Member[] =
          userIds.map(
            (userId) => {
              const profile =
                profileRows?.find(
                  (item) =>
                    item.id ===
                    userId
                );

              return {
                user_id:
                  userId,

                nickname:
                  profile?.nickname ??
                  "이름 없음",
              };
            }
          );

        setMembers(
          loadedMembers
        );

        // =====================================
        // 모든 약속
        // =====================================

        const {
          data: promiseRows,
          error: promiseError,
        } = await supabase
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
            partner_approval_required,
            is_active,
            created_at,
            deleted_at
          `)
          .eq(
            "couple_id",
            coupleId
          )
          .order(
            "created_at",
            {
              ascending:
                false,
            }
          );

        if (promiseError) {
          console.error(
            `약속 조회 오류 | message=${promiseError.message} | code=${promiseError.code} | details=${promiseError.details ?? ""} | hint=${promiseError.hint ?? ""}`
          );

          setMessage(
            "약속을 불러오지 못했어요."
          );

          setLoading(false);
          return;
        }

        setPromises(
          (promiseRows ??
            []) as PromiseItem[]
        );

        setLoading(false);
      },
      [
        supabase,
        user,
        authLoading,
      ]
    );

  // =========================================
  // 최초 실행
  // =========================================

  useEffect(() => {
    loadPromises();
  }, [loadPromises]);

  // =========================================
  // 약속 종료
  // =========================================

  async function endPromise(
    promise: PromiseItem
  ) {
    if (!promise.is_active) {
      return;
    }

    if (
      !user ||
      !currentCoupleId
    ) {
      setMessage(
        "커플 정보를 확인하지 못했어요."
      );
      return;
    }

    const confirmed =
      window.confirm(
        `"${promise.title}" 약속을 종료할까요?\n종료된 약속은 기록에 남아요.`
      );

    if (!confirmed) {
      return;
    }

    setEndingPromiseId(
      promise.id
    );

    setMessage("");

    const endedAt =
      new Date().toISOString();

    const {
      data: updatedPromise,
      error: updateError,
    } = await supabase
      .from("promises")
      .update({
        is_active: false,
        deleted_at:
          endedAt,
      })
      .eq(
        "id",
        promise.id
      )
      .eq(
        "couple_id",
        currentCoupleId
      )
      .eq(
        "is_active",
        true
      )
      .select(`
        id,
        title,
        best_streak,
        total_success,
        deleted_at
      `)
      .maybeSingle();

    if (updateError) {
      setEndingPromiseId(
        null
      );

      console.error(
        "약속 종료 오류:",
        updateError
      );

      setMessage(
        `약속을 종료하지 못했어요: ${updateError.message}`
      );

      return;
    }

    if (!updatedPromise) {
      setEndingPromiseId(
        null
      );

      setMessage(
        "약속 상태가 이미 변경됐거나 종료할 약속을 찾지 못했어요."
      );

      await loadPromises();
      return;
    }

    const sourceKey =
      `promise_ended:${promise.id}`;

    const {
      error: timelineError,
    } = await supabase
      .from(
        "couple_timeline_events"
      )
      .insert({
        couple_id:
          currentCoupleId,
        user_id:
          user.id,
        event_type:
          "promise_ended",
        title:
          "📖 약속을 마무리했어요",
        description:
          `${updatedPromise.title} · 최고 연속 ${updatedPromise.best_streak}일 · 총 성공 ${updatedPromise.total_success}일`,
        related_id:
          promise.id,
        image_path:
          null,
        event_date:
          updatedPromise.deleted_at ??
          endedAt,
        source_key:
          sourceKey,
      });

    setEndingPromiseId(
      null
    );

    if (
      timelineError &&
      timelineError.code !==
        "23505"
    ) {
      console.error(
        "약속 종료 타임라인 등록 오류:",
        timelineError
      );

      setMessage(
        "약속은 종료됐지만 타임라인 등록에 실패했어요."
      );

      await loadPromises();
      return;
    }

    setMessage(
      "약속을 종료했고 타임라인에도 기록했어요 ♡"
    );

    setTab(
      "ended"
    );

    await loadPromises();
  }

  // =========================================
  // 로그인 또는 데이터 로딩 중
  // =========================================

  if (
    authLoading ||
    loading
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fff8fb]">
        <p className="text-sm text-gray-500">
          약속 불러오는 중...
        </p>
      </main>
    );
  }

  // =========================================
  // 진행 / 종료 약속 분리
  // =========================================

  const activePromises =
    promises.filter(
      (promise) =>
        promise.is_active
    );

  const endedPromises =
    promises.filter(
      (promise) =>
        !promise.is_active
    );

  const visiblePromises =
    tab === "active"
      ? activePromises
      : endedPromises;

  return (
    <main className="min-h-screen bg-[#fff8fb] px-5 py-8 text-[#2b2b2b]">

      <div className="mx-auto max-w-md pb-28">

        {/* =========================================
            헤더
        ========================================== */}

        <header className="flex items-end justify-between gap-4">

          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-pink-400">
              OUR PROMISES
            </p>

            <h1 className="mt-2 text-3xl font-bold">
              우리의 약속
            </h1>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              함께 시작한 약속과 지나온 기록을 모아봤어요 ♡
            </p>
          </div>

          <Link
            href="/promise/new"
            prefetch={false}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-pink-500 text-2xl text-white shadow-sm transition hover:bg-pink-600 active:scale-[0.98]"
          >
            +
          </Link>

        </header>

        {/* =========================================
            탭
        ========================================== */}

        <section className="mt-7 rounded-[22px] border border-pink-100 bg-white p-1.5 shadow-sm">

          <div className="grid grid-cols-2 gap-1">

            <button
              type="button"
              onClick={() => {
                setTab(
                  "active"
                );
                setExpandedPromiseId(
                  null
                );
              }}
              className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                tab ===
                "active"
                  ? "bg-pink-500 text-white shadow-sm"
                  : "text-gray-400 hover:bg-pink-50"
              }`}
            >
              진행 중{" "}
              {
                activePromises.length
              }
            </button>

            <button
              type="button"
              onClick={() => {
                setTab(
                  "ended"
                );
                setExpandedPromiseId(
                  null
                );
              }}
              className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                tab ===
                "ended"
                  ? "bg-pink-500 text-white shadow-sm"
                  : "text-gray-400 hover:bg-pink-50"
              }`}
            >
              종료됨{" "}
              {
                endedPromises.length
              }
            </button>

          </div>

        </section>

        {/* =========================================
            메시지
        ========================================== */}

        {message && (
          <div className="mt-4 rounded-2xl border border-pink-100 bg-white/80 px-4 py-3 text-center text-xs text-gray-500 shadow-sm">
            {message}
          </div>
        )}

        {/* =========================================
            약속 없음
        ========================================== */}

        {visiblePromises.length ===
        0 ? (

          <section className="mt-6 rounded-[30px] border border-dashed border-pink-200 bg-white p-8 text-center shadow-sm">

            <div className="text-4xl">
              {tab ===
              "active"
                ? "🌱"
                : "📖"}
            </div>

            <h2 className="mt-4 text-lg font-bold">
              {tab ===
              "active"
                ? "진행 중인 약속이 없어요"
                : "종료된 약속이 없어요"}
            </h2>

            <p className="mt-2 text-sm leading-6 text-gray-500">

              {tab ===
              "active" ? (
                <>
                  둘이 함께 지킬
                  <br />
                  새로운 약속을 만들어보세요.
                </>
              ) : (
                <>
                  함께 끝낸 약속이 생기면
                  <br />
                  이곳에 기록으로 남아요.
                </>
              )}

            </p>

            {tab ===
              "active" && (

              <Link
                href="/promise/new"
                prefetch={false}
                className="mt-6 block w-full rounded-2xl bg-pink-500 px-5 py-4 text-center font-semibold text-white shadow-sm transition hover:bg-pink-600 active:scale-[0.99]"
              >
                새 약속 만들기
              </Link>

            )}

          </section>

        ) : (

          /* =========================================
              약속 목록
          ========================================== */

          <section className="mt-6">

            <button
              type="button"
              onClick={() => {
                setShowPromiseList(
                  (prev) => !prev
                );

                if (showPromiseList) {
                  setExpandedPromiseId(
                    null
                  );
                }
              }}
              className="flex w-full items-center justify-between rounded-[24px] border border-pink-100 bg-white px-4 py-3.5 text-left shadow-sm transition hover:bg-pink-50/50"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-pink-50 text-base">
                  {tab === "active"
                    ? "✅"
                    : "📖"}
                </div>

                <div>
                  <p className="text-sm font-semibold">
                    {tab === "active"
                      ? "진행 중인 약속"
                      : "종료된 약속"}
                  </p>

                  <p className="mt-0.5 text-[11px] text-gray-400">
                    {visiblePromises.length}개의 약속
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-pink-400">
                  {showPromiseList
                    ? "전체 접기"
                    : "전체 보기"}
                </span>

                <span
                  className={`text-gray-300 transition ${
                    showPromiseList
                      ? "rotate-180"
                      : ""
                  }`}
                >
                  ⌄
                </span>
              </div>
            </button>

            {showPromiseList && (
              <div className="mt-4 space-y-4">

            {visiblePromises.map(
              (promise) => {

                const assignee =
                  members.find(
                    (member) =>
                      member.user_id ===
                      promise.assigned_to
                  );

                const repeatLabel =
                  promise.repeat_type ===
                  "daily"
                    ? "매일"
                    : promise.repeat_type ===
                      "weekdays"
                    ? "평일"
                    : "사용자 지정";

                return (
                  <article
                    key={
                      promise.id
                    }
                    className="overflow-hidden rounded-[30px] border border-pink-100 bg-white p-5 shadow-sm"
                  >

                    {/* 상단 */}

                    <div className="flex items-start justify-between gap-4">

                      <div>

                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-pink-50 px-2.5 py-1 text-[10px] font-semibold tracking-[0.1em] text-pink-500">
                            {repeatLabel}
                          </span>

                          <span className="text-[11px] text-gray-400">
                            {promise.is_joint
                              ? "💕 서로의 약속"
                              : `${assignee?.nickname ?? "이름 없음"}님의 약속`}
                          </span>
                        </div>

                        <h2 className="mt-3 break-words text-xl font-bold leading-7">
                          {promise.title}
                        </h2>

                      </div>

                      {promise.is_active ? (

                        <span className="shrink-0 rounded-2xl bg-pink-50 px-3 py-2 text-xs font-semibold text-pink-500">
                          진행 중
                        </span>

                      ) : (

                        <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-semibold text-gray-500">
                          종료됨
                        </span>

                      )}

                    </div>

                    {/* =========================================
                        펼치기 / 접기
                    ========================================== */}

                    <button
                      type="button"
                      onClick={() =>
                        setExpandedPromiseId(
                          expandedPromiseId ===
                            promise.id
                            ? null
                            : promise.id
                        )
                      }
                      className="mt-4 flex w-full items-center justify-between rounded-2xl bg-[#fff8fb] px-4 py-3 text-left transition hover:bg-pink-50"
                    >
                      <span className="text-xs font-medium text-gray-500">
                        🔥 현재 {promise.current_streak}일
                        <span className="mx-2 text-pink-200">·</span>
                        🏆 최고 {promise.best_streak}일
                        <span className="mx-2 text-pink-200">·</span>
                        ✓ 성공 {promise.total_success}일
                      </span>

                      <span
                        className={`ml-2 shrink-0 text-sm text-pink-300 transition ${
                          expandedPromiseId ===
                          promise.id
                            ? "rotate-180"
                            : ""
                        }`}
                      >
                        ⌄
                      </span>
                    </button>

                    {expandedPromiseId ===
                      promise.id && (
                      <div className="pt-1">
                        {/* 인증 방식 */}

                        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 px-1 text-[11px] text-gray-400">
                          {promise.is_joint && (
                            <span className="font-semibold text-pink-500">
                              💕 공동
                            </span>
                          )}

                          {promise.photo_required && (
                            <span>📷 사진</span>
                          )}

                          {promise.partner_approval_required && (
                            <span>♡ 상대 확인</span>
                          )}

                          {!promise.is_joint &&
                            !promise.photo_required &&
                            !promise.partner_approval_required && (
                              <span>✓ 기본 인증</span>
                            )}
                        </div>

                        {/* 진행 중 약속 */}

                        {promise.is_active && (
                          <>
                            <Link
                              href={`/verify/${promise.id}`}
                              prefetch={false}
                              className="mt-4 block w-full rounded-2xl bg-pink-500 px-4 py-3.5 text-center font-semibold text-white shadow-sm transition hover:bg-pink-600 active:scale-[0.99]"
                            >
                              📸 오늘 인증하기
                            </Link>

                            <button
                              type="button"
                              disabled={
                                endingPromiseId ===
                                promise.id
                              }
                              onClick={() => {
                                void endPromise(
                                  promise
                                );
                              }}
                              className="mt-3 w-full rounded-2xl border border-pink-100 bg-white px-4 py-3 text-center text-sm font-semibold text-gray-400 transition hover:bg-pink-50 hover:text-pink-500 disabled:opacity-50"
                            >
                              {endingPromiseId ===
                              promise.id
                                ? "종료 처리 중..."
                                : "📖 약속 종료하기"}
                            </button>
                          </>
                        )}

                        {/* 종료된 약속 */}

                        {!promise.is_active &&
                          promise.deleted_at && (
                            <p className="mt-4 text-center text-xs text-gray-400">
                              종료일{" "}
                              {new Date(
                                promise.deleted_at
                              ).toLocaleDateString(
                                "ko-KR"
                              )}
                            </p>
                          )}
                      </div>
                    )}

                  </article>
                );
              }
            )}

              </div>
            )}

          </section>

        )}

        {/* =========================================
            공통 하단 메뉴
        ========================================== */}

        <BottomNav />

      </div>

    </main>
  );
}