"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";

type CharacterType =
  | "cat"
  | "dog";

type CharacterRow = {
  id: string;
  couple_id: string;
  character_type: CharacterType | null;
  character_selected_at: string | null;
  affection: number;
};

export default function CharacterPage() {
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

  const [saving, setSaving] =
    useState(false);

  const [
    selectedType,
    setSelectedType,
  ] = useState<CharacterType | null>(
    null
  );

  const [
    coupleId,
    setCoupleId,
  ] = useState("");

  const [notice, setNotice] =
    useState("");

  // =========================================
  // 현재 캐릭터 상태 불러오기
  // =========================================

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      router.replace("/login");
      return;
    }

    const currentUser = user;
    let cancelled = false;

    async function loadCharacter() {
      setLoading(true);
      setNotice("");

      // =====================================
      // 내가 속한 커플 찾기
      // =====================================

      const {
        data: membership,
        error: membershipError,
      } = await supabase
        .from("couple_members")
        .select("couple_id")
        .eq(
          "user_id",
          currentUser.id
        )
        .maybeSingle();

      if (cancelled) {
        return;
      }

      if (membershipError) {
        console.error(
          "커플 조회 오류:",
          membershipError
        );

        setNotice(
          `커플 정보를 불러오지 못했어요: ${membershipError.message}`
        );

        setLoading(false);
        return;
      }

      if (!membership) {
        setNotice(
          "연결된 커플 정보를 찾을 수 없어요."
        );

        setLoading(false);
        return;
      }

      const foundCoupleId =
        membership.couple_id;

      setCoupleId(
        foundCoupleId
      );

      // =====================================
      // 캐릭터 정보 조회
      // =====================================

      const {
        data: characterData,
        error: characterError,
      } = await supabase
        .from("couple_characters")
        .select(`
          id,
          couple_id,
          character_type,
          character_selected_at,
          affection
        `)
        .eq(
          "couple_id",
          foundCoupleId
        )
        .maybeSingle();

      if (cancelled) {
        return;
      }

      if (characterError) {
        console.error(
          "캐릭터 조회 오류:",
          characterError
        );

        setNotice(
          `캐릭터 정보를 불러오지 못했어요: ${characterError.message}`
        );

        setLoading(false);
        return;
      }

      // 기존 커플인데 캐릭터 행이 없는 경우 대비
      if (!characterData) {
        const {
          data: createdCharacter,
          error: createError,
        } = await supabase
          .from("couple_characters")
          .insert({
            couple_id:
              foundCoupleId,

            character_type:
              null,

            character_selected_at:
              null,

            affection:
              0,
          })
          .select(`
            id,
            couple_id,
            character_type,
            character_selected_at,
            affection
          `)
          .maybeSingle();

        if (cancelled) {
          return;
        }

        if (
          createError ||
          !createdCharacter
        ) {
          console.error(
            "캐릭터 생성 오류:",
            createError
          );

          setNotice(
            createError
              ? `캐릭터 정보를 준비하지 못했어요: ${createError.message}`
              : "캐릭터 정보를 준비하지 못했어요."
          );

          setLoading(false);
          return;
        }

        setLoading(false);
        return;
      }

      const loadedCharacter =
        characterData as CharacterRow;

      // =====================================
      // 이미 캐릭터를 선택했다면
      // 선택 화면에 다시 접근하지 않음
      // =====================================

      if (
        loadedCharacter.character_type
      ) {
        router.replace(
          "/couple"
        );

        return;
      }

      setLoading(false);
    }

    loadCharacter();

    return () => {
      cancelled = true;
    };
  }, [
    authLoading,
    user,
    router,
    supabase,
  ]);

  // =========================================
  // 캐릭터 선택
  // =========================================

  function chooseCharacter(
    type: CharacterType
  ) {
    if (saving) {
      return;
    }

    setSelectedType(
      type
    );

    setNotice("");
  }

  // =========================================
  // 최종 선택 저장
  // =========================================

  async function confirmCharacter() {
    if (!selectedType) {
      setNotice(
        "고양이 또는 강아지를 선택해주세요."
      );

      return;
    }

    if (!coupleId) {
      setNotice(
        "커플 정보를 확인하지 못했어요."
      );

      return;
    }

    const characterName =
      selectedType === "cat"
        ? "고양이"
        : "강아지";

    const confirmed =
      window.confirm(
        `${characterName}를 우리 캐릭터로 선택할까요?\n\n선택 후에는 고양이 ↔ 강아지 변경이 불가능해요.`
      );

    if (!confirmed) {
      return;
    }

    setSaving(true);
    setNotice("");

    // =====================================
    // 저장 직전 다시 확인
    // 동시에 두 사람이 선택하는 경우 방지
    // =====================================

    const {
      data: latestCharacter,
      error: latestError,
    } = await supabase
      .from("couple_characters")
      .select(
        "character_type"
      )
      .eq(
        "couple_id",
        coupleId
      )
      .maybeSingle();

    if (latestError) {
      console.error(
        "캐릭터 재확인 오류:",
        latestError
      );

      setSaving(false);

      setNotice(
        `캐릭터 상태를 확인하지 못했어요: ${latestError.message}`
      );

      return;
    }

    if (
      latestCharacter?.character_type
    ) {
      setSaving(false);

      setNotice(
        "파트너가 먼저 캐릭터를 선택했어요. 홈으로 이동할게요 ♡"
      );

      window.setTimeout(
        () => {
          window.location.href =
            "/couple";
        },
        900
      );

      return;
    }

    // =====================================
    // 캐릭터 저장
    // character_type이 아직 NULL인 경우에만 저장
    // =====================================

    const {
      data: updatedCharacter,
      error: updateError,
    } = await supabase
      .from("couple_characters")
      .update({
        character_type:
          selectedType,

        character_selected_at:
          new Date().toISOString(),
      })
      .eq(
        "couple_id",
        coupleId
      )
      .is(
        "character_type",
        null
      )
      .select(`
        id,
        couple_id,
        character_type,
        character_selected_at,
        affection
      `)
      .maybeSingle();

    if (updateError) {
      console.error(
        "캐릭터 저장 오류:",
        updateError
      );

      setSaving(false);

      setNotice(
        `캐릭터를 저장하지 못했어요: ${updateError.message}`
      );

      return;
    }

    if (!updatedCharacter) {
      setSaving(false);

      setNotice(
        "이미 캐릭터가 선택되어 있어요."
      );

      window.setTimeout(
        () => {
          window.location.href =
            "/couple";
        },
        900
      );

      return;
    }

    setSaving(false);

    // =====================================
    // 완료
    // =====================================

    window.location.href =
      "/couple";
  }

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
          우리 캐릭터 준비 중...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fff8fb] px-5 py-8 text-[#2b2b2b]">

      <div className="mx-auto max-w-md pb-10">

        {/* =====================================
            뒤로가기
        ====================================== */}

        <button
          type="button"
          onClick={() =>
            router.back()
          }
          className="text-sm font-semibold text-gray-500"
        >
          ← 돌아가기
        </button>

        {/* =====================================
            헤더
        ====================================== */}

        <header className="mt-8">

          <p className="text-xs font-semibold tracking-[0.2em] text-pink-400">
            OUR CHARACTER
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            우리 캐릭터를 골라요 ♡
          </h1>

          <p className="mt-3 text-sm leading-6 text-gray-500">
            둘이 함께 키워갈
            <br />
            하나뿐인 캐릭터를 선택해주세요.
          </p>

        </header>

        {/* =====================================
            변경 불가 안내
        ====================================== */}

        <section className="mt-6 rounded-[24px] border border-amber-100 bg-amber-50/70 px-4 py-4">

          <div className="flex items-start gap-3">

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-lg shadow-sm">
              🔒
            </div>

            <div>

              <p className="font-bold text-amber-700">
                신중하게 선택해주세요
              </p>

              <p className="mt-1 text-sm leading-6 text-amber-600">
                고양이와 강아지 중 하나를 선택하면
                <br />
                이후에는 변경할 수 없어요.
              </p>

            </div>

          </div>

        </section>

        {/* =====================================
            선택 카드
        ====================================== */}

        <section className="mt-7 grid grid-cols-2 gap-4">

          {/* 고양이 */}

          <button
            type="button"
            disabled={saving}
            onClick={() =>
              chooseCharacter(
                "cat"
              )
            }
            className={`relative overflow-hidden rounded-[30px] border p-5 text-center shadow-sm transition disabled:opacity-60 ${
              selectedType === "cat"
                ? "border-pink-400 bg-pink-50 shadow-md"
                : "border-pink-100 bg-white hover:bg-pink-50/50"
            }`}
          >

            {selectedType ===
              "cat" && (

              <div className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-pink-500 text-sm font-bold text-white">
                ✓
              </div>

            )}

            <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-[32px] bg-gradient-to-br from-pink-50 to-white text-7xl shadow-sm">
              🐱
            </div>

            <p className="mt-5 text-xl font-bold">
              고양이
            </p>

            <p className="mt-2 text-xs leading-5 text-gray-400">
              새침하지만
              <br />
              사랑스러운 우리 친구
            </p>

          </button>

          {/* 강아지 */}

          <button
            type="button"
            disabled={saving}
            onClick={() =>
              chooseCharacter(
                "dog"
              )
            }
            className={`relative overflow-hidden rounded-[30px] border p-5 text-center shadow-sm transition disabled:opacity-60 ${
              selectedType === "dog"
                ? "border-pink-400 bg-pink-50 shadow-md"
                : "border-pink-100 bg-white hover:bg-pink-50/50"
            }`}
          >

            {selectedType ===
              "dog" && (

              <div className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-pink-500 text-sm font-bold text-white">
                ✓
              </div>

            )}

            <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-[32px] bg-gradient-to-br from-pink-50 to-white text-7xl shadow-sm">
              🐶
            </div>

            <p className="mt-5 text-xl font-bold">
              강아지
            </p>

            <p className="mt-2 text-xs leading-5 text-gray-400">
              밝고 다정한
              <br />
              우리만의 친구
            </p>

          </button>

        </section>

        {/* =====================================
            미리보기
        ====================================== */}

        {selectedType && (

          <section className="mt-6 rounded-[30px] border border-pink-100 bg-white p-6 text-center shadow-sm">

            <p className="text-xs font-semibold tracking-[0.18em] text-pink-400">
              PREVIEW
            </p>

            <div className="mx-auto mt-4 flex h-32 w-32 items-center justify-center rounded-full bg-[#fff8fb] text-8xl shadow-inner">

              {selectedType ===
                "cat"
                ? "🐱"
                : "🐶"}

            </div>

            <h2 className="mt-5 text-xl font-bold">

              {selectedType ===
                "cat"
                ? "고양이와 함께할까요?"
                : "강아지와 함께할까요?"}

            </h2>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              처음에는 아기 모습으로 시작하고
              <br />
              우리 레벨이 오를 때마다 성장해요 ♡
            </p>

          </section>

        )}

        {/* =====================================
            오류 / 안내 메시지
        ====================================== */}

        {notice && (

          <div className="mt-5 rounded-2xl border border-pink-100 bg-white px-4 py-3 text-center text-sm leading-6 text-gray-600 shadow-sm">
            {notice}
          </div>

        )}

        {/* =====================================
            결정 버튼
        ====================================== */}

        <button
          type="button"
          disabled={
            !selectedType ||
            saving
          }
          onClick={
            confirmCharacter
          }
          className="mt-6 w-full rounded-2xl bg-pink-500 px-5 py-4 text-lg font-semibold text-white shadow-sm transition hover:bg-pink-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
        >

          {saving
            ? "캐릭터 선택 중..."
            : selectedType === "cat"
            ? "🐱 고양이로 결정하기"
            : selectedType === "dog"
            ? "🐶 강아지로 결정하기"
            : "캐릭터를 선택해주세요"}

        </button>

        <p className="mt-4 text-center text-xs leading-5 text-gray-400">
          최종 선택 후에는
          <br />
          고양이 ↔ 강아지 변경이 불가능해요.
        </p>

      </div>

    </main>
  );
}
