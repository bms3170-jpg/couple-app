"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";


type LevelUpNotification = {
  id: string;
  from_level: number;
  to_level: number;
  seen: boolean;
};


type TitleUnlockNotification = {
  id: string;
  level: number;
  title: string;
  seen: boolean;
};


const menus = [
  {
    href: "/couple",
    icon: "🏠",
    label: "홈",
  },
  {
    href: "/promises",
    icon: "✅",
    label: "약속",
  },
  {
    href: "/verifications",
    icon: "📸",
    label: "인증",
  },
  {
    href: "/rewards",
    icon: "🎁",
    label: "보상",
  },
  {
    href: "/us",
    icon: "♡",
    label: "우리",
  },
];


export default function BottomNav() {
  const pathname =
    usePathname();


  const supabase = useMemo(
    () => createClient(),
    []
  );


  const {
    user,
    loading: authLoading,
  } = useAuth();


  const [
    levelNotification,
    setLevelNotification,
  ] =
    useState<LevelUpNotification | null>(
      null
    );


  const [
    titleNotification,
    setTitleNotification,
  ] =
    useState<TitleUnlockNotification | null>(
      null
    );


  const [
    closingNotification,
    setClosingNotification,
  ] = useState(false);


  // =========================================
  // 다음에 보여줄 알림 확인
  //
  // 1. 레벨업 알림
  // 2. 칭호 해금 알림
  // =========================================

  const loadNextNotification =
    useCallback(async () => {
      if (
        authLoading ||
        !user
      ) {
        return;
      }


      // =====================================
      // 1. 레벨업 알림 먼저 확인
      // =====================================

      const {
        data: levelData,
        error: levelError,
      } = await supabase
        .from(
          "level_up_notifications"
        )
        .select(`
          id,
          from_level,
          to_level,
          seen
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


      if (levelError) {
        console.error(
          "레벨업 알림 조회 오류:",
          levelError
        );

        return;
      }


      if (levelData) {
        setTitleNotification(
          null
        );

        setLevelNotification(
          levelData as LevelUpNotification
        );

        return;
      }


      // =====================================
      // 레벨업 알림이 없으면
      // 칭호 알림 확인
      // =====================================

      setLevelNotification(
        null
      );


      const {
        data: titleData,
        error: titleError,
      } = await supabase
        .from(
          "title_unlock_notifications"
        )
        .select(`
          id,
          level,
          title,
          seen
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


      if (titleError) {
        console.error(
          "칭호 알림 조회 오류:",
          titleError
        );

        return;
      }


      setTitleNotification(
        titleData
          ? (
              titleData as
                TitleUnlockNotification
            )
          : null
      );
    }, [
      authLoading,
      user,
      supabase,
    ]);


  useEffect(() => {
    void loadNextNotification();
  }, [
    loadNextNotification,
    pathname,
  ]);


  // =========================================
  // 레벨업 알림 확인 완료
  // =========================================

  async function closeLevelNotification() {
    if (
      !levelNotification ||
      closingNotification
    ) {
      return;
    }


    setClosingNotification(
      true
    );


    const {
      error,
    } = await supabase
      .from(
        "level_up_notifications"
      )
      .update({
        seen: true,
      })
      .eq(
        "id",
        levelNotification.id
      );


    setClosingNotification(
      false
    );


    if (error) {
      console.error(
        "레벨업 알림 확인 오류:",
        error
      );

      return;
    }


    setLevelNotification(
      null
    );


    // 다음 알림 확인
    // 레벨업 알림이 더 있으면 그것부터,
    // 없으면 칭호 알림 표시
    await loadNextNotification();
  }


  // =========================================
  // 칭호 알림 확인 완료
  // =========================================

  async function closeTitleNotification() {
    if (
      !titleNotification ||
      closingNotification
    ) {
      return;
    }


    setClosingNotification(
      true
    );


    const {
      error,
    } = await supabase
      .from(
        "title_unlock_notifications"
      )
      .update({
        seen: true,
      })
      .eq(
        "id",
        titleNotification.id
      );


    setClosingNotification(
      false
    );


    if (error) {
      console.error(
        "칭호 알림 확인 오류:",
        error
      );

      return;
    }


    setTitleNotification(
      null
    );


    // 다음 안 읽은 알림 확인
    await loadNextNotification();
  }


  const nextRequiredXp =
    levelNotification
      ? 100 +
        (
          (
            levelNotification.to_level -
            1
          ) *
          50
        )
      : 0;


  return (
    <>
      {/* =====================================
          하단 메뉴
      ====================================== */}

      <nav className="fixed bottom-0 left-1/2 z-40 flex w-full max-w-md -translate-x-1/2 border-t border-pink-100 bg-white px-4 py-3 shadow-sm">

        {menus.map((menu) => {
          const active =
            pathname ===
              menu.href ||
            (
              menu.href ===
                "/us" &&
              pathname.startsWith(
                "/us/"
              )
            );


          if (active) {
            return (
              <div
                key={menu.href}
                className="flex flex-1 flex-col items-center gap-1 text-pink-500"
              >
                <span className="text-xl">
                  {menu.icon}
                </span>

                <span className="text-xs font-semibold">
                  {menu.label}
                </span>
              </div>
            );
          }


          return (
            <Link
              key={menu.href}
              href={menu.href}
              prefetch={false}
              className="flex flex-1 flex-col items-center gap-1 text-gray-400 transition hover:text-pink-400"
            >
              <span className="text-xl">
                {menu.icon}
              </span>

              <span className="text-xs">
                {menu.label}
              </span>
            </Link>
          );
        })}

      </nav>


      {/* =====================================
          공통 레벨업 팝업
      ====================================== */}

      {levelNotification && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-5">

          <div className="w-full max-w-sm rounded-[32px] bg-white p-6 text-center shadow-2xl">

            <div className="text-6xl">
              🎉
            </div>


            <p className="mt-4 text-xs font-bold tracking-[0.25em] text-pink-400">
              LEVEL UP!
            </p>


            <h2 className="mt-3 text-2xl font-bold">
              우리 레벨이 올랐어요 ♡
            </h2>


            <div className="mt-6 rounded-2xl bg-[#fff8fb] p-5">

              <p className="text-xs text-gray-400">
                새로운 우리 레벨
              </p>


              <div className="mt-4 flex items-center justify-center gap-4">

                <span className="text-xl font-bold text-gray-400">
                  LV.
                  {
                    levelNotification.from_level
                  }
                </span>


                <span className="text-pink-400">
                  →
                </span>


                <span className="text-3xl font-bold text-pink-500">
                  LV.
                  {
                    levelNotification.to_level
                  }
                </span>

              </div>

            </div>


            <div className="mt-5 rounded-2xl bg-pink-50 px-4 py-4">

              <p className="text-sm text-gray-500">
                다음 레벨까지
              </p>


              <p className="mt-2 font-semibold text-pink-500">
                {nextRequiredXp} XP
              </p>

            </div>


            <p className="mt-5 text-sm leading-6 text-gray-500">
              둘이 함께 쌓은 XP로
              <br />
              한 단계 더 성장했어요 ♡
            </p>


            <button
              type="button"
              disabled={
                closingNotification
              }
              onClick={() => {
                void closeLevelNotification();
              }}
              className="mt-6 w-full rounded-2xl bg-pink-500 px-5 py-4 font-semibold text-white disabled:opacity-50"
            >
              {closingNotification
                ? "확인 중..."
                : "확인했어요 ♡"}
            </button>

          </div>

        </div>
      )}


      {/* =====================================
          칭호 해금 팝업
      ====================================== */}

      {!levelNotification &&
        titleNotification && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-5">

            <div className="w-full max-w-sm rounded-[32px] bg-white p-6 text-center shadow-2xl">

              <div className="text-6xl">
                💕
              </div>


              <p className="mt-4 text-xs font-bold tracking-[0.25em] text-pink-400">
                NEW TITLE!
              </p>


              <h2 className="mt-3 text-2xl font-bold">
                새로운 칭호를 얻었어요 ♡
              </h2>


              <div className="mt-6 rounded-2xl bg-[#fff8fb] p-6">

                <p className="text-xs text-gray-400">
                  우리 칭호
                </p>


                <p className="mt-3 text-2xl font-bold text-pink-500">
                  {
                    titleNotification.title
                  }
                </p>


                <p className="mt-2 text-sm text-gray-400">
                  LV.
                  {
                    titleNotification.level
                  }{" "}
                  달성
                </p>

              </div>


              <p className="mt-5 text-sm leading-6 text-gray-500">
                함께할수록
                <br />
                우리만의 이야기가
                더 특별해지고 있어요 ♡
              </p>


              <button
                type="button"
                disabled={
                  closingNotification
                }
                onClick={() => {
                  void closeTitleNotification();
                }}
                className="mt-6 w-full rounded-2xl bg-pink-500 px-5 py-4 font-semibold text-white disabled:opacity-50"
              >
                {closingNotification
                  ? "확인 중..."
                  : "칭호 확인했어요 ♡"}
              </button>

            </div>

          </div>
        )}
    </>
  );
}