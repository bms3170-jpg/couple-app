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
  | "dog"
  | "cat"
  | "penguin"
  | "red_panda";

type MembershipRow = {
  couple_id: string;
};

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
          couple_id
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
      // 이미 캐릭터가 선택된 커플이면 선택 페이지를 건너뜁니다.
      if (loadedCharacter.character_type) {
        router.replace("/couple");
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
  // 미리보기 이미지
  // =========================================

  const previewPath = selectedType
    ? `/characters/${
        selectedType === "red_panda" ? "red-panda" : selectedType
      }/baby.png`
    : null;

  // =========================================
  // 최종 저장
  // =========================================

  async function confirmCharacter() {
    if (!selectedType) {
      setNotice("함께할 캐릭터를 선택해주세요.");
      return;
    }

    if (!coupleId || !user) {
      setNotice("커플 정보를 확인하지 못했어요.");
      return;
    }

    const names: Record<CharacterType, string> = {
      dog: "강아지",
      cat: "고양이",
      penguin: "펭귄",
      red_panda: "레서판다",
    };

    const confirmed = window.confirm(
      `${names[selectedType]} 캐릭터로 시작할까요?\n\n선택 후에는 커플 캐릭터 종류를 변경할 수 없어요.`
    );

    if (!confirmed) return;

    setSaving(true);
    setNotice("");

    const { data: latestCharacter, error: latestError } = await supabase
      .from("couple_characters")
      .select("character_type")
      .eq("couple_id", coupleId)
      .maybeSingle();

    if (latestError) {
      setSaving(false);
      setNotice(`캐릭터 상태를 확인하지 못했어요: ${latestError.message}`);
      return;
    }

    if (latestCharacter?.character_type) {
      setSaving(false);
      router.replace("/couple");
      return;
    }

    const { data: updatedCharacter, error: updateError } = await supabase
      .from("couple_characters")
      .update({
        character_type: selectedType,
        character_selected_at: new Date().toISOString(),
      })
      .eq("couple_id", coupleId)
      .is("character_type", null)
      .select("character_type")
      .maybeSingle();

    if (updateError) {
      setSaving(false);
      setNotice(`캐릭터를 저장하지 못했어요: ${updateError.message}`);
      return;
    }

    // 동시에 파트너가 먼저 선택한 경우도 그대로 커플 페이지에서 최신 값을 사용
    if (!updatedCharacter) {
      setSaving(false);
      router.replace("/couple");
      return;
    }

    setSaving(false);
    window.location.href = "/couple";
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
          onClick={() => router.back()}
          className="text-sm font-semibold text-gray-500"
        >
          ← 돌아가기
        </button>

        <header className="mt-8">
          <p className="text-xs font-semibold tracking-[0.2em] text-pink-400">
            OUR CHARACTER
          </p>
          <h1 className="mt-2 text-3xl font-bold">우리 캐릭터를 골라요 ♡</h1>
          <p className="mt-3 text-sm leading-6 text-gray-500">
            우리 둘과 함께 성장할 친구를 선택해요.
            <br />
            처음 선택한 캐릭터가 커플의 캐릭터가 돼요.
          </p>
        </header>

        <section className="mt-6 rounded-[24px] border border-amber-100 bg-amber-50/70 px-4 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-lg shadow-sm">
              🔒
            </div>
            <div>
              <p className="font-bold text-amber-700">처음 한 번만 선택해요</p>
              <p className="mt-1 text-sm leading-6 text-amber-600">
                강아지 · 고양이 · 펭귄 · 레서판다 중 한 친구를 선택해주세요.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-7">
          <p className="text-xs font-semibold tracking-[0.18em] text-pink-400">
            STEP 1
          </p>
          <h2 className="mt-1 text-xl font-bold">어떤 친구와 함께할까요?</h2>

          <div className="mt-4 grid grid-cols-2 gap-4">
            {(
              [
                { type: "dog", name: "강아지", path: "/characters/dog/baby.png" },
                { type: "cat", name: "고양이", path: "/characters/cat/baby.png" },
                { type: "penguin", name: "펭귄", path: "/characters/penguin/baby.png" },
                { type: "red_panda", name: "레서판다", path: "/characters/red-panda/baby.png" },
              ] as const
            ).map((item) => {
              const selected = selectedType === item.type;

              return (
                <button
                  key={item.type}
                  type="button"
                  disabled={saving || !!lockedCharacterType}
                  onClick={() => chooseCharacter(item.type)}
                  className={`relative overflow-hidden rounded-[28px] border p-4 text-center shadow-sm transition disabled:cursor-default ${
                    selected
                      ? "border-pink-400 bg-pink-50 ring-2 ring-pink-100"
                      : "border-pink-100 bg-white"
                  }`}
                >
                  {selected && (
                    <div className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-pink-500 text-sm font-bold text-white">
                      ✓
                    </div>
                  )}

                  <div className="mx-auto flex h-32 items-end justify-center">
                    <img
                      src={item.path}
                      alt={item.name}
                      className="max-h-32 max-w-full object-contain"
                    />
                  </div>

                  <p className="mt-3 text-lg font-bold">{item.name}</p>
                </button>
              );
            })}
          </div>
        </section>

        {previewPath && (
          <section className="mt-7 overflow-hidden rounded-[30px] border border-pink-100 bg-white p-6 text-center shadow-sm">
            <p className="text-xs font-semibold tracking-[0.18em] text-pink-400">
              PREVIEW
            </p>

            <div className="mt-4 flex h-52 items-end justify-center rounded-[26px] bg-gradient-to-b from-white to-pink-50/70 px-5 pb-4">
              <img
                src={previewPath}
                alt="캐릭터 미리보기"
                className="max-h-[190px] max-w-full object-contain drop-shadow-sm"
              />
            </div>

            <h2 className="mt-5 text-xl font-bold">
              {selectedType === "dog"
                ? "강아지"
                : selectedType === "cat"
                ? "고양이"
                : selectedType === "penguin"
                ? "펭귄"
                : "레서판다"}
            </h2>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              아기 모습으로 시작하고
              <br />
              레벨이 오르면 꼬마 → 청년 → 성년으로 성장해요 ♡
            </p>
          </section>
        )}

        {notice && (
          <div className="mt-5 rounded-2xl border border-pink-100 bg-white px-4 py-3 text-center text-sm leading-6 text-gray-600 shadow-sm">
            {notice}
          </div>
        )}

        <button
          type="button"
          disabled={!selectedType || saving}
          onClick={confirmCharacter}
          className="mt-6 w-full rounded-2xl bg-pink-500 px-5 py-4 text-lg font-semibold text-white shadow-sm transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving
            ? "캐릭터 저장 중..."
            : selectedType
            ? "이 캐릭터로 시작하기 ♡"
            : "캐릭터를 선택해주세요"}
        </button>

        <p className="mt-4 text-center text-xs leading-5 text-gray-400">
          선택한 캐릭터는 두 사람이 함께 키우게 돼요.
        </p>
      </div>
    </main>
  );
}
