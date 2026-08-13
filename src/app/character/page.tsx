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

type CharacterColor =
  | "original"
  | "gray"
  | "brown"
  | "black";

type CharacterRow = {
  id: string;
  couple_id: string;
  character_type: CharacterType | null;
  character_selected_at: string | null;
  affection: number;
};

type MembershipRow = {
  couple_id: string;
  character_color: CharacterColor | null;
};

const COLORS: {
  value: CharacterColor;
  label: string;
  description: string;
}[] = [
  {
    value: "original",
    label: "기본",
    description: "따뜻한 기본 색상",
  },
  {
    value: "gray",
    label: "회색",
    description: "차분한 회색",
  },
  {
    value: "brown",
    label: "갈색",
    description: "포근한 갈색",
  },
  {
    value: "black",
    label: "검정",
    description: "시크한 검정",
  },
];

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
    selectedType,
    setSelectedType,
  ] =
    useState<CharacterType | null>(
      null
    );

  const [
    selectedColor,
    setSelectedColor,
  ] =
    useState<CharacterColor | null>(
      null
    );

  const [
    lockedCharacterType,
    setLockedCharacterType,
  ] =
    useState<CharacterType | null>(
      null
    );

  const [
    notice,
    setNotice,
  ] = useState("");

  // =========================================
  // 현재 캐릭터 상태 불러오기
  // =========================================

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      router.replace(
        "/login"
      );
      return;
    }

    const currentUser =
      user;

    let cancelled =
      false;

    async function loadCharacter() {
      setLoading(true);
      setNotice("");

      // =====================================
      // 내 커플 + 내 색상
      // =====================================

      const {
        data: membership,
        error: membershipError,
      } = await supabase
        .from(
          "couple_members"
        )
        .select(`
          couple_id,
          character_color
        `)
        .eq(
          "user_id",
          currentUser.id
        )
        .maybeSingle();

      if (cancelled) {
        return;
      }

      if (
        membershipError
      ) {
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

      if (
        !membership
      ) {
        setNotice(
          "연결된 커플 정보를 찾을 수 없어요."
        );

        setLoading(false);
        return;
      }

      const membershipData =
        membership as MembershipRow;

      const foundCoupleId =
        membershipData.couple_id;

      setCoupleId(
        foundCoupleId
      );

      if (
        membershipData.character_color
      ) {
        setSelectedColor(
          membershipData.character_color
        );
      }

      // =====================================
      // 커플 공통 캐릭터
      // =====================================

      const {
        data: characterData,
        error: characterError,
      } = await supabase
        .from(
          "couple_characters"
        )
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

      if (
        characterError
      ) {
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

      // =====================================
      // 캐릭터 행이 없는 경우 생성
      // =====================================

      if (
        !characterData
      ) {
        const {
          error:
            createError,
        } = await supabase
          .from(
            "couple_characters"
          )
          .insert({
            couple_id:
              foundCoupleId,

            character_type:
              null,

            character_selected_at:
              null,

            affection:
              0,
          });

        if (cancelled) {
          return;
        }

        if (
          createError
        ) {
          console.error(
            "캐릭터 생성 오류:",
            createError
          );

          setNotice(
            `캐릭터 정보를 준비하지 못했어요: ${createError.message}`
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
      // 이미 동물이 선택된 커플
      // → 동물 변경 금지
      // → 내 색상만 선택 가능
      // =====================================

      if (
        loadedCharacter.character_type
      ) {
        setLockedCharacterType(
          loadedCharacter.character_type
        );

        setSelectedType(
          loadedCharacter.character_type
        );
      }

      // =====================================
      // 동물 + 내 색상 모두 이미 선택 완료
      // =====================================

      if (
        loadedCharacter.character_type &&
        membershipData.character_color
      ) {
        router.replace(
          "/couple"
        );

        return;
      }

      setLoading(false);
    }

    void loadCharacter();

    return () => {
      cancelled =
        true;
    };
  }, [
    authLoading,
    user,
    router,
    supabase,
  ]);

  // =========================================
  // 캐릭터 종류 선택
  // =========================================

  function chooseCharacter(
    type: CharacterType
  ) {
    if (
      saving ||
      lockedCharacterType
    ) {
      return;
    }

    setSelectedType(
      type
    );

    setNotice("");
  }

  // =========================================
  // 색상 선택
  // =========================================

  function chooseColor(
    color: CharacterColor
  ) {
    if (saving) {
      return;
    }

    setSelectedColor(
      color
    );

    setNotice("");
  }

  // =========================================
  // 미리보기 이미지
  // =========================================

  const previewPath =
    selectedType &&
    selectedColor
      ? `/characters/${selectedType}/${selectedColor}/lv1.png`
      : null;

  // =========================================
  // 최종 저장
  // =========================================

  async function confirmCharacter() {
    if (
      !selectedType
    ) {
      setNotice(
        "고양이 또는 강아지를 선택해주세요."
      );

      return;
    }

    if (
      !selectedColor
    ) {
      setNotice(
        "캐릭터 색상을 선택해주세요."
      );

      return;
    }

    if (
      !coupleId ||
      !user
    ) {
      setNotice(
        "커플 정보를 확인하지 못했어요."
      );

      return;
    }

    const characterName =
      selectedType ===
      "cat"
        ? "고양이"
        : "강아지";

    const colorLabel =
      COLORS.find(
        (item) =>
          item.value ===
          selectedColor
      )?.label ??
      selectedColor;

    const confirmed =
      window.confirm(
        lockedCharacterType
          ? `${colorLabel} 색상으로 내 캐릭터를 결정할까요?\n\n색상 선택 후에는 변경할 수 없어요.`
          : `${characterName} · ${colorLabel} 색상으로 시작할까요?\n\n고양이 ↔ 강아지는 선택 후 변경할 수 없어요.`
      );

    if (
      !confirmed
    ) {
      return;
    }

    setSaving(true);
    setNotice("");

    // =====================================
    // 커플 캐릭터 종류 최신 상태 확인
    // =====================================

    const {
      data:
        latestCharacter,
      error:
        latestError,
    } = await supabase
      .from(
        "couple_characters"
      )
      .select(`
        character_type
      `)
      .eq(
        "couple_id",
        coupleId
      )
      .maybeSingle();

    if (
      latestError
    ) {
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

    let finalType:
      CharacterType =
      selectedType;

    // =====================================
    // 아직 아무도 동물을 선택하지 않은 경우
    // =====================================

    if (
      !latestCharacter
        ?.character_type
    ) {
      const {
        data:
          updatedCharacter,
        error:
          updateError,
      } = await supabase
        .from(
          "couple_characters"
        )
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
        .select(
          "character_type"
        )
        .maybeSingle();

      if (
        updateError
      ) {
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

      // =====================================
      // 동시에 상대가 먼저 저장한 경우
      // =====================================

      if (
        !updatedCharacter
      ) {
        const {
          data:
            refreshedCharacter,
          error:
            refreshError,
        } = await supabase
          .from(
            "couple_characters"
          )
          .select(
            "character_type"
          )
          .eq(
            "couple_id",
            coupleId
          )
          .maybeSingle();

        if (
          refreshError ||
          !refreshedCharacter
            ?.character_type
        ) {
          setSaving(false);

          setNotice(
            "캐릭터 정보를 다시 확인해주세요."
          );

          return;
        }

        finalType =
          refreshedCharacter.character_type as CharacterType;
      }
    } else {
      finalType =
        latestCharacter.character_type as CharacterType;
    }

    // =====================================
    // 상대방이 이미 다른 동물을 선택한 경우
    // =====================================

    if (
      finalType !==
      selectedType
    ) {
      setSaving(false);

      setLockedCharacterType(
        finalType
      );

      setSelectedType(
        finalType
      );

      setNotice(
        `파트너가 먼저 ${
          finalType ===
          "cat"
            ? "고양이"
            : "강아지"
        }를 선택했어요. 색상만 다시 선택해주세요 ♡`
      );

      return;
    }

    // =====================================
    // 내 개인 색상 저장
    // =====================================

    const {
      error:
        colorUpdateError,
    } = await supabase
      .from(
        "couple_members"
      )
      .update({
        character_color:
          selectedColor,
      })
      .eq(
        "couple_id",
        coupleId
      )
      .eq(
        "user_id",
        user.id
      )
      .is(
        "character_color",
        null
      );

    if (
      colorUpdateError
    ) {
      console.error(
        "캐릭터 색상 저장 오류:",
        colorUpdateError
      );

      setSaving(false);

      setNotice(
        `색상을 저장하지 못했어요: ${colorUpdateError.message}`
      );

      return;
    }

    setSaving(false);

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
            우리 둘의 동물을 선택하고
            <br />
            나는 원하는 색상을 골라요.
          </p>

        </header>

        {/* =====================================
            안내
        ====================================== */}

        <section className="mt-6 rounded-[24px] border border-amber-100 bg-amber-50/70 px-4 py-4">

          <div className="flex items-start gap-3">

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-lg shadow-sm">
              🔒
            </div>

            <div>

              <p className="font-bold text-amber-700">
                처음 한 번만 선택해요
              </p>

              <p className="mt-1 text-sm leading-6 text-amber-600">

                {lockedCharacterType
                  ? `${
                      lockedCharacterType ===
                      "cat"
                        ? "고양이"
                        : "강아지"
                    }로 이미 결정됐어요. 내 색상을 선택해주세요.`
                  : "고양이와 강아지 중 하나를 먼저 선택해주세요."}

              </p>

            </div>

          </div>

        </section>

        {/* =====================================
            동물 선택
        ====================================== */}

        <section className="mt-7">

          <p className="text-xs font-semibold tracking-[0.18em] text-pink-400">
            STEP 1
          </p>

          <h2 className="mt-1 text-xl font-bold">
            어떤 친구와 함께할까요?
          </h2>

          <div className="mt-4 grid grid-cols-2 gap-4">

            {/* 고양이 */}

            <button
              type="button"
              disabled={
                saving ||
                !!lockedCharacterType
              }
              onClick={() =>
                chooseCharacter(
                  "cat"
                )
              }
              className={`relative overflow-hidden rounded-[28px] border p-4 text-center shadow-sm transition disabled:cursor-default ${
                selectedType ===
                "cat"
                  ? "border-pink-400 bg-pink-50"
                  : "border-pink-100 bg-white"
              }`}
            >

              {selectedType ===
                "cat" && (

                <div className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-pink-500 text-sm font-bold text-white">
                  ✓
                </div>

              )}

              <div className="mx-auto flex h-28 items-center justify-center">

                <img
                  src="/characters/cat/original/lv1.png"
                  alt="고양이"
                  className="max-h-28 max-w-full object-contain"
                />

              </div>

              <p className="mt-3 text-lg font-bold">
                고양이
              </p>

            </button>

            {/* 강아지 */}

            <button
              type="button"
              disabled={
                saving ||
                !!lockedCharacterType
              }
              onClick={() =>
                chooseCharacter(
                  "dog"
                )
              }
              className={`relative overflow-hidden rounded-[28px] border p-4 text-center shadow-sm transition disabled:cursor-default ${
                selectedType ===
                "dog"
                  ? "border-pink-400 bg-pink-50"
                  : "border-pink-100 bg-white"
              }`}
            >

              {selectedType ===
                "dog" && (

                <div className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-pink-500 text-sm font-bold text-white">
                  ✓
                </div>

              )}

              <div className="mx-auto flex h-28 items-center justify-center">

                <img
                  src="/characters/dog/original/lv1.png"
                  alt="강아지"
                  className="max-h-28 max-w-full object-contain"
                />

              </div>

              <p className="mt-3 text-lg font-bold">
                강아지
              </p>

            </button>

          </div>

        </section>

        {/* =====================================
            색상 선택
        ====================================== */}

        {selectedType && (

          <section className="mt-8">

            <p className="text-xs font-semibold tracking-[0.18em] text-pink-400">
              STEP 2
            </p>

            <h2 className="mt-1 text-xl font-bold">
              내 캐릭터 색상을 골라요
            </h2>

            <p className="mt-2 text-sm text-gray-400">
              상대방과 다른 색상을 선택해도 괜찮아요 ♡
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3">

              {COLORS.map(
                (color) => {

                  const selected =
                    selectedColor ===
                    color.value;

                  return (

                    <button
                      key={
                        color.value
                      }
                      type="button"
                      disabled={
                        saving
                      }
                      onClick={() =>
                        chooseColor(
                          color.value
                        )
                      }
                      className={`relative rounded-[26px] border p-4 text-center shadow-sm transition ${
                        selected
                          ? "border-pink-400 bg-pink-50 ring-2 ring-pink-100"
                          : "border-pink-100 bg-white"
                      }`}
                    >

                      {selected && (

                        <div className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-pink-500 text-xs font-bold text-white">
                          ✓
                        </div>

                      )}

                      <div className="flex h-28 items-center justify-center">

                        <img
                          src={`/characters/${selectedType}/${color.value}/lv1.png`}
                          alt={
                            color.label
                          }
                          className="max-h-28 max-w-full object-contain"
                        />

                      </div>

                      <p className="mt-3 font-bold">
                        {color.label}
                      </p>

                      <p className="mt-1 text-[11px] text-gray-400">
                        {color.description}
                      </p>

                    </button>

                  );
                }
              )}

            </div>

          </section>

        )}

        {/* =====================================
            최종 미리보기
        ====================================== */}

        {previewPath && (

          <section className="mt-7 overflow-hidden rounded-[30px] border border-pink-100 bg-white p-6 text-center shadow-sm">

            <p className="text-xs font-semibold tracking-[0.18em] text-pink-400">
              PREVIEW
            </p>

            <div className="mt-4 flex h-48 items-end justify-center rounded-[26px] bg-gradient-to-b from-white to-pink-50/70 px-5 pb-4">

              <img
                src={
                  previewPath
                }
                alt="캐릭터 미리보기"
                className="max-h-[170px] max-w-full object-contain drop-shadow-sm"
              />

            </div>

            <h2 className="mt-5 text-xl font-bold">

              {selectedType ===
              "cat"
                ? "고양이"
                : "강아지"}{" "}

              ·{" "}

              {COLORS.find(
                (item) =>
                  item.value ===
                  selectedColor
              )?.label}

            </h2>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              LV.1 모습으로 시작하고
              <br />
              레벨이 오르면 자동으로 다음 포즈로 성장해요 ♡
            </p>

          </section>

        )}

        {/* =====================================
            안내 / 오류
        ====================================== */}

        {notice && (

          <div className="mt-5 rounded-2xl border border-pink-100 bg-white px-4 py-3 text-center text-sm leading-6 text-gray-600 shadow-sm">
            {notice}
          </div>

        )}

        {/* =====================================
            저장
        ====================================== */}

        <button
          type="button"
          disabled={
            !selectedType ||
            !selectedColor ||
            saving
          }
          onClick={
            confirmCharacter
          }
          className="mt-6 w-full rounded-2xl bg-pink-500 px-5 py-4 text-lg font-semibold text-white shadow-sm transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
        >

          {saving
            ? "캐릭터 저장 중..."
            : selectedType &&
              selectedColor
            ? "이 캐릭터로 시작하기 ♡"
            : "동물과 색상을 선택해주세요"}

        </button>

        <p className="mt-4 text-center text-xs leading-5 text-gray-400">
          선택한 색상은 나에게만 적용되고
          <br />
          레벨업할 때 색상은 그대로 유지돼요.
        </p>

      </div>

    </main>
  );
}
