"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";

type CharacterType = "dog" | "cat" | "penguin" | "red_panda";

type MembershipRow = {
  couple_id: string;
};

type MemberCharacterRow = {
  id: string;
  couple_id: string;
  user_id: string;
  character_type: CharacterType | null;
  character_selected_at: string | null;
};

const CHARACTER_OPTIONS = [
  { type: "dog", name: "강아지", path: "/characters/dog/baby.png" },
  { type: "cat", name: "고양이", path: "/characters/cat/baby.png" },
  { type: "penguin", name: "펭귄", path: "/characters/penguin/baby.png" },
  { type: "red_panda", name: "레서판다", path: "/characters/red-panda/baby.png" },
] as const;

export default function CharacterPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [coupleId, setCoupleId] = useState("");
  const [selectedType, setSelectedType] = useState<CharacterType | null>(null);
  const [savedType, setSavedType] = useState<CharacterType | null>(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    const currentUser = user;
    let cancelled = false;

    async function loadCharacter() {
      setLoading(true);
      setNotice("");

      const { data: membership, error: membershipError } = await supabase
        .from("couple_members")
        .select("couple_id")
        .eq("user_id", currentUser.id)
        .maybeSingle();

      if (cancelled) return;

      if (membershipError || !membership) {
        console.error("커플 조회 오류:", membershipError);
        setNotice(
          membershipError
            ? `커플 정보를 불러오지 못했어요: ${membershipError.message}`
            : "연결된 커플 정보를 찾을 수 없어요."
        );
        setLoading(false);
        return;
      }

      const foundCoupleId = (membership as MembershipRow).couple_id;
      setCoupleId(foundCoupleId);

      const { data: characterData, error: characterError } = await supabase
        .from("couple_member_characters")
        .select(`
          id,
          couple_id,
          user_id,
          character_type,
          character_selected_at
        `)
        .eq("couple_id", foundCoupleId)
        .eq("user_id", currentUser.id)
        .maybeSingle();

      if (cancelled) return;

      if (characterError) {
        console.error("내 캐릭터 조회 오류:", characterError);
        setNotice(`내 캐릭터 정보를 불러오지 못했어요: ${characterError.message}`);
        setLoading(false);
        return;
      }

      const loaded = characterData
        ? (characterData as MemberCharacterRow)
        : null;

      setSavedType(loaded?.character_type ?? null);
      setSelectedType(loaded?.character_type ?? null);
      setLoading(false);
    }

    void loadCharacter();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user, router, supabase]);

  function chooseCharacter(type: CharacterType) {
    if (saving) return;
    setSelectedType(type);
    setNotice("");
  }

  const previewPath = selectedType
    ? `/characters/${
        selectedType === "red_panda" ? "red-panda" : selectedType
      }/baby.png`
    : null;

  async function confirmCharacter() {
    if (!selectedType) {
      setNotice("내 캐릭터를 선택해주세요.");
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

    const isChanging = !!savedType && savedType !== selectedType;

    const confirmed = window.confirm(
      isChanging
        ? `${names[selectedType]} 캐릭터로 변경할까요?\n\n상대방 캐릭터에는 영향을 주지 않아요.`
        : `${names[selectedType]} 캐릭터로 시작할까요?\n\n상대방도 자신의 캐릭터를 따로 선택할 수 있어요.`
    );

    if (!confirmed) return;

    setSaving(true);
    setNotice("");

    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("couple_member_characters")
      .upsert(
        {
          couple_id: coupleId,
          user_id: user.id,
          character_type: selectedType,
          character_selected_at: now,
          updated_at: now,
        },
        { onConflict: "couple_id,user_id" }
      )
      .select("character_type")
      .maybeSingle();

    setSaving(false);

    if (error) {
      console.error("내 캐릭터 저장 오류:", error);
      setNotice(`캐릭터를 저장하지 못했어요: ${error.message}`);
      return;
    }

    if (!data) {
      setNotice("캐릭터 저장 결과를 확인하지 못했어요.");
      return;
    }

    window.location.href = "/couple";
  }

  if (authLoading || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fff8fb]">
        <p className="text-sm text-gray-500">내 캐릭터 준비 중...</p>
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
            MY CHARACTER
          </p>

          <h1 className="mt-2 text-3xl font-bold">내 캐릭터를 골라요 ♡</h1>

          <p className="mt-3 text-sm leading-6 text-gray-500">
            우리와 함께 성장할 나만의 친구를 선택해요.
            <br />
            상대방도 자신의 캐릭터를 따로 선택할 수 있어요.
          </p>
        </header>

        <section className="mt-6 rounded-[24px] border border-violet-100 bg-gradient-to-br from-violet-50/70 to-pink-50/70 px-4 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-lg shadow-sm">
              💕
            </div>

            <div>
              <p className="font-bold text-violet-700">각자 원하는 친구를 선택해요</p>
              <p className="mt-1 text-sm leading-6 text-violet-500">
                둘 다 같은 캐릭터를 골라도 되고,
                서로 다른 캐릭터를 골라도 돼요.
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
            {CHARACTER_OPTIONS.map((item) => {
              const selected = selectedType === item.type;

              return (
                <button
                  key={item.type}
                  type="button"
                  disabled={saving}
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

                  {savedType === item.type && (
                    <span className="mt-2 inline-flex rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-bold text-violet-500">
                      현재 캐릭터
                    </span>
                  )}
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
              {CHARACTER_OPTIONS.find((item) => item.type === selectedType)?.name ?? ""}
            </h2>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              커플 레벨은 둘이 함께 올리고,
              <br />
              내 캐릭터는 아기 → 꼬마 → 청년 → 성년으로 성장해요 ♡
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
            : savedType
            ? "내 캐릭터 저장하기 ♡"
            : selectedType
            ? "이 캐릭터로 시작하기 ♡"
            : "캐릭터를 선택해주세요"}
        </button>

        <p className="mt-4 text-center text-xs leading-5 text-gray-400">
          캐릭터 종류와 코디는 각자 관리하고,
          레벨 · XP · 애정도는 둘이 함께 키워요.
        </p>
      </div>
    </main>
  );
}
