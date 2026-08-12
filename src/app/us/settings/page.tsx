"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import BottomNav from "@/components/BottomNav";

type Member = {
  user_id: string;
  nickname: string;
  avatar_path: string | null;
  avatar_url: string | null;
};

type CoupleInfo = {
  id: string;
  invite_code: string;
  relationship_started_at: string | null;
};

export default function UsSettingsPage() {
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

  const [savingDate, setSavingDate] =
    useState(false);

  const [
    savingNickname,
    setSavingNickname,
  ] = useState(false);

  const [loggingOut, setLoggingOut] =
    useState(false);

  const [deletingAccount, setDeletingAccount] =
    useState(false);

  const [uploadingAvatar, setUploadingAvatar] =
    useState(false);

  const [deletingAvatar, setDeletingAvatar] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [couple, setCouple] =
    useState<CoupleInfo | null>(null);

  const [members, setMembers] =
    useState<Member[]>([]);

  const [
    relationshipDate,
    setRelationshipDate,
  ] = useState("");

  const [nickname, setNickname] =
    useState("");

  // =========================================
  // 설정 데이터 불러오기
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

    async function loadSettings() {
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
          currentUser.id
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
      // 커플 정보
      // =====================================

      const {
        data: coupleData,
        error: coupleError,
      } = await supabase
        .from("couples")
        .select(`
          id,
          invite_code,
          relationship_started_at
        `)
        .eq(
          "id",
          coupleId
        )
        .maybeSingle();

      if (cancelled) {
        return;
      }

      if (
        coupleError ||
        !coupleData
      ) {
        console.error(
          "커플 정보 조회 오류:",
          coupleError
        );

        setMessage(
          "커플 정보를 불러오지 못했어요."
        );

        setLoading(false);
        return;
      }

      setCouple(
        coupleData as CoupleInfo
      );

      setRelationshipDate(
        coupleData.relationship_started_at
          ? coupleData.relationship_started_at.slice(
              0,
              10
            )
          : ""
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
        )
        .order(
          "joined_at",
          {
            ascending: true,
          }
        );

      if (cancelled) {
        return;
      }

      if (memberError) {
        console.error(
          "멤버 조회 오류:",
          memberError
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
      // 프로필 조회
      // =====================================

      const {
        data: profileRows,
        error: profileError,
      } = userIds.length
        ? await supabase
            .from("profiles")
            .select(
              "id, nickname, avatar_path"
            )
            .in(
              "id",
              userIds
            )
        : {
            data: [],
            error: null,
          };

      if (cancelled) {
        return;
      }

      if (profileError) {
        console.error(
          "프로필 조회 오류:",
          profileError
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

            const avatarPath =
              profile?.avatar_path ??
              null;

            const avatarUrl =
              avatarPath
                ? supabase.storage
                    .from("avatars")
                    .getPublicUrl(
                      avatarPath
                    ).data.publicUrl
                : null;

            return {
              user_id:
                userId,

              nickname:
                profile?.nickname ??
                "이름 없음",

              avatar_path:
                avatarPath,

              avatar_url:
                avatarUrl,
            };
          }
        );

      setMembers(
        loadedMembers
      );

      const myProfile =
        loadedMembers.find(
          (member) =>
            member.user_id ===
            currentUser.id
        );

      setNickname(
        myProfile?.nickname ??
          ""
      );

      setLoading(false);
    }

    loadSettings();

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
  // 함께한 날짜 저장
  // =========================================

  async function saveRelationshipDate(
  e: FormEvent
) {
  e.preventDefault();

  if (!couple) {
    return;
  }

  if (!relationshipDate) {
    setMessage(
      "함께한 날짜를 선택해주세요."
    );
    return;
  }

  setSavingDate(true);
  setMessage("");

  const {
    data,
    error,
  } = await supabase
    .from("couples")
    .update({
      relationship_started_at:
        relationshipDate,
    })
    .eq(
      "id",
      couple.id
    )
    .select(
      "id, relationship_started_at"
    )
    .maybeSingle();

  setSavingDate(false);

  if (error) {
    const errorText =
      `날짜 저장 오류 | ` +
      `message=${error.message} | ` +
      `code=${error.code ?? ""} | ` +
      `details=${error.details ?? ""} | ` +
      `hint=${error.hint ?? ""}`;

    setMessage(errorText);
    return;
  }

  if (!data) {
    setMessage(
      "날짜를 수정할 권한이 없거나 수정할 커플을 찾지 못했어요."
    );
    return;
  }

  setCouple(
    (current) =>
      current
        ? {
            ...current,
            relationship_started_at:
              data.relationship_started_at,
          }
        : current
  );

  setRelationshipDate(
    data.relationship_started_at
      ? data.relationship_started_at.slice(
          0,
          10
        )
      : ""
  );

  setMessage(
    "함께한 날짜를 저장했어요 ♡"
  );
}

  // =========================================
  // 닉네임 저장
  // =========================================

  async function saveNickname(
    e: FormEvent
  ) {
    e.preventDefault();

    if (!user) {
      router.replace("/login");
      return;
    }

    const trimmedNickname =
      nickname.trim();

    if (!trimmedNickname) {
      setMessage(
        "닉네임을 입력해주세요."
      );

      return;
    }

    if (
      trimmedNickname.length >
      20
    ) {
      setMessage(
        "닉네임은 20자 이하로 입력해주세요."
      );

      return;
    }

    setSavingNickname(true);
    setMessage("");

    const { error } =
      await supabase
        .from("profiles")
        .update({
          nickname:
            trimmedNickname,
        })
        .eq(
          "id",
          user.id
        );

    setSavingNickname(false);

    if (error) {
      console.error(
        "닉네임 저장 오류:",
        error
      );

      setMessage(
        `닉네임을 변경하지 못했어요: ${error.message}`
      );

      return;
    }

    setMembers(
      (current) =>
        current.map(
          (member) =>
            member.user_id ===
            user.id
              ? {
                  ...member,
                  nickname:
                    trimmedNickname,
                }
              : member
        )
    );

    setNickname(
      trimmedNickname
    );

    setMessage(
      "닉네임을 변경했어요 ♡"
    );
  }

  // =========================================
  // 프로필 사진 업로드
  // =========================================

  async function handleAvatarChange(
    e: ChangeEvent<HTMLInputElement>
  ) {
    const file =
      e.target.files?.[0];

    // 같은 파일을 다시 선택해도 onChange가 동작하도록 초기화
    e.target.value = "";

    if (!file) {
      return;
    }

    if (!user) {
      router.replace("/login");
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      setMessage(
        "JPG, PNG, WEBP 이미지만 올릴 수 있어요."
      );
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage(
        "프로필 사진은 5MB 이하만 올릴 수 있어요."
      );
      return;
    }

    const currentMe =
      members.find(
        (member) =>
          member.user_id === user.id
      );

    const extension =
      file.type === "image/png"
        ? "png"
        : file.type === "image/webp"
        ? "webp"
        : "jpg";

    const newPath =
      `${user.id}/avatar-${Date.now()}.${extension}`;

    setUploadingAvatar(true);
    setMessage("");

    const { error: uploadError } =
      await supabase.storage
        .from("avatars")
        .upload(
          newPath,
          file,
          {
            cacheControl: "3600",
            contentType: file.type,
            upsert: false,
          }
        );

    if (uploadError) {
      setUploadingAvatar(false);
      setMessage(
        `사진을 올리지 못했어요: ${uploadError.message}`
      );
      return;
    }

    const { error: profileError } =
      await supabase
        .from("profiles")
        .update({
          avatar_path: newPath,
        })
        .eq(
          "id",
          user.id
        );

    if (profileError) {
      // DB 저장 실패 시 방금 올린 파일 정리
      await supabase.storage
        .from("avatars")
        .remove([newPath]);

      setUploadingAvatar(false);
      setMessage(
        `프로필 사진을 저장하지 못했어요: ${profileError.message}`
      );
      return;
    }

    const publicUrl =
      supabase.storage
        .from("avatars")
        .getPublicUrl(newPath)
        .data.publicUrl;

    setMembers(
      (current) =>
        current.map(
          (member) =>
            member.user_id === user.id
              ? {
                  ...member,
                  avatar_path: newPath,
                  avatar_url: publicUrl,
                }
              : member
        )
    );

    // 이전 사진이 있으면 새 사진 저장 성공 후 삭제
    if (
      currentMe?.avatar_path &&
      currentMe.avatar_path !== newPath
    ) {
      await supabase.storage
        .from("avatars")
        .remove([
          currentMe.avatar_path,
        ]);
    }

    setUploadingAvatar(false);
    setMessage(
      "프로필 사진을 변경했어요 ♡"
    );
  }

  // =========================================
  // 프로필 사진 삭제
  // =========================================

  async function handleDeleteAvatar() {
    if (!user) {
      router.replace("/login");
      return;
    }

    const currentMe =
      members.find(
        (member) =>
          member.user_id === user.id
      );

    if (!currentMe?.avatar_path) {
      return;
    }

    const confirmed =
      window.confirm(
        "프로필 사진을 삭제할까요?"
      );

    if (!confirmed) {
      return;
    }

    setDeletingAvatar(true);
    setMessage("");

    const oldPath =
      currentMe.avatar_path;

    const { error: profileError } =
      await supabase
        .from("profiles")
        .update({
          avatar_path: null,
        })
        .eq(
          "id",
          user.id
        );

    if (profileError) {
      setDeletingAvatar(false);
      setMessage(
        `프로필 사진을 삭제하지 못했어요: ${profileError.message}`
      );
      return;
    }

    const { error: removeError } =
      await supabase.storage
        .from("avatars")
        .remove([oldPath]);

    if (removeError) {
      console.error(
        "기존 프로필 사진 파일 삭제 오류:",
        removeError
      );
    }

    setMembers(
      (current) =>
        current.map(
          (member) =>
            member.user_id === user.id
              ? {
                  ...member,
                  avatar_path: null,
                  avatar_url: null,
                }
              : member
        )
    );

    setDeletingAvatar(false);
    setMessage(
      "프로필 사진을 삭제했어요."
    );
  }

  // =========================================
  // 로그아웃
  // =========================================

  async function handleLogout() {
    const confirmed =
      window.confirm(
        "로그아웃할까요?"
      );

    if (!confirmed) {
      return;
    }

    setLoggingOut(true);
    setMessage("");

    const { error } =
      await supabase.auth.signOut();

    if (error) {
      console.error(
        "로그아웃 오류:",
        error
      );

      setMessage(
        `로그아웃하지 못했어요: ${error.message}`
      );

      setLoggingOut(false);
      return;
    }

    router.replace("/login");
    router.refresh();
  }

  // =========================================
  // 회원 탈퇴
  // =========================================

  async function handleDeleteAccount() {
    if (!user) {
      router.replace("/login");
      return;
    }

    const firstConfirmed =
      window.confirm(
        "정말 회원 탈퇴하시겠어요?\n\n탈퇴하면 내 계정과 개인 데이터가 삭제돼요. 이 작업은 되돌릴 수 없어요."
      );

    if (!firstConfirmed) {
      return;
    }

    const confirmText =
      window.prompt(
        '계속하려면 "탈퇴"라고 입력해주세요.'
      );

    if (confirmText !== "탈퇴") {
      if (confirmText !== null) {
        setMessage(
          '회원 탈퇴가 취소됐어요. "탈퇴"라고 정확히 입력해주세요.'
        );
      }
      return;
    }

    setDeletingAccount(true);
    setMessage("");

    const { data, error } =
      await supabase.rpc(
        "delete_my_account"
      );

    if (error) {
      console.error(
        "회원 탈퇴 오류:",
        error
      );

      setMessage(
        `회원 탈퇴에 실패했어요: ${error.message}`
      );

      setDeletingAccount(false);
      return;
    }

    const result =
      data as
        | {
            success?: boolean;
          }
        | null;

    if (!result?.success) {
      setMessage(
        "회원 탈퇴 처리 결과를 확인하지 못했어요."
      );
      setDeletingAccount(false);
      return;
    }

    try {
      await supabase.auth.signOut();
    } catch (signOutError) {
      console.error(
        "탈퇴 후 로컬 세션 정리 오류:",
        signOutError
      );
    }

    router.replace("/");
    router.refresh();
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
          우리 설정 불러오는 중...
        </p>
      </main>
    );
  }

  const me =
    members.find(
      (member) =>
        member.user_id ===
        user?.id
    );

  const partner =
    members.find(
      (member) =>
        member.user_id !==
        user?.id
    );

  return (
    <main className="min-h-screen bg-[#fff8fb] px-5 py-8 text-[#2b2b2b]">

      <div className="mx-auto max-w-md pb-28">

        {/* =====================================
            헤더
        ====================================== */}

        <header>

          <Link
            href="/us"
            prefetch={false}
            className="inline-block text-sm font-semibold text-gray-500"
          >
            ← 우리로 돌아가기
          </Link>

          <p className="mt-8 text-sm font-semibold tracking-[0.2em] text-pink-400">
            OURQUEST
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            우리 설정 ⚙️
          </h1>

          <p className="mt-3 text-sm leading-6 text-gray-500">
            우리 둘의 정보와
            <br />
            함께한 날짜를 관리해요.
          </p>

        </header>

        {/* =====================================
            커플 프로필
        ====================================== */}

        <section className="mt-7 rounded-[32px] bg-white p-6 shadow-sm">

          <div className="flex items-center gap-4">

            <div className="relative h-16 w-20 shrink-0">
              <div className="absolute left-0 top-0 flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-pink-50 text-2xl shadow-sm">
                {me?.avatar_url ? (
                  <img
                    src={me.avatar_url}
                    alt={`${me.nickname} 프로필 사진`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span>💗</span>
                )}
              </div>

              <div className="absolute right-0 top-2 flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-pink-50 text-2xl shadow-sm">
                {partner?.avatar_url ? (
                  <img
                    src={partner.avatar_url}
                    alt={`${partner.nickname} 프로필 사진`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span>♡</span>
                )}
              </div>
            </div>

            <div>

              <p className="text-xs font-semibold text-pink-400">
                OUR COUPLE
              </p>

              <h2 className="mt-1 text-xl font-bold">
                {me?.nickname ??
                  "나"}{" "}
                ♡{" "}
                {partner?.nickname ??
                  "파트너"}
              </h2>

            </div>

          </div>

        </section>

        {/* =====================================
            함께한 날짜
        ====================================== */}

        <form
          onSubmit={
            saveRelationshipDate
          }
          className="mt-5 rounded-3xl bg-white p-5 shadow-sm"
        >

          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-pink-50 text-xl">
              💕
            </div>

            <div>

              <h2 className="font-bold">
                함께한 날짜
              </h2>

              <p className="mt-1 text-sm text-gray-400">
                우리 사이가 시작된 날
              </p>

            </div>

          </div>

          <input
            type="date"
            value={
              relationshipDate
            }
            onChange={(e) =>
              setRelationshipDate(
                e.target.value
              )
            }
            max={
              new Date()
                .toISOString()
                .split("T")[0]
            }
            className="mt-5 w-full rounded-2xl border border-pink-100 bg-[#fff8fb] px-4 py-4 outline-none transition focus:border-pink-400"
          />

          <button
            type="submit"
            disabled={
              savingDate
            }
            className="mt-3 w-full rounded-2xl bg-pink-500 px-5 py-4 font-semibold text-white transition hover:bg-pink-600 disabled:opacity-50"
          >
            {savingDate
              ? "저장 중..."
              : relationshipDate
              ? "함께한 날짜 저장"
              : "날짜 설정하기"}
          </button>

        </form>

        {/* =====================================
            내 닉네임
        ====================================== */}

        <form
          onSubmit={
            saveNickname
          }
          className="mt-5 rounded-3xl bg-white p-5 shadow-sm"
        >

          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-pink-50 text-xl">
              👤
            </div>

            <div>

              <h2 className="font-bold">
                내 프로필
              </h2>

              <p className="mt-1 text-sm text-gray-400">
                내 닉네임을 변경할 수 있어요.
              </p>

            </div>

          </div>

          <div className="mt-5 flex flex-col items-center">
            <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-pink-50 text-4xl shadow-sm">
              {me?.avatar_url ? (
                <img
                  src={me.avatar_url}
                  alt={`${me.nickname} 프로필 사진`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span>👤</span>
              )}
            </div>

            <p className="mt-3 text-xs text-gray-400">
              JPG · PNG · WEBP / 최대 5MB
            </p>

            <div className="mt-3 grid w-full grid-cols-2 gap-2">
              <label
                className={`flex cursor-pointer items-center justify-center rounded-2xl border border-pink-200 bg-white px-4 py-3 text-sm font-semibold text-pink-500 transition hover:bg-pink-50 ${
                  uploadingAvatar || deletingAvatar
                    ? "pointer-events-none opacity-50"
                    : ""
                }`}
              >
                {uploadingAvatar
                  ? "사진 올리는 중..."
                  : me?.avatar_url
                  ? "사진 변경"
                  : "사진 추가"}

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  disabled={
                    uploadingAvatar ||
                    deletingAvatar
                  }
                  onChange={
                    handleAvatarChange
                  }
                />
              </label>

              <button
                type="button"
                onClick={
                  handleDeleteAvatar
                }
                disabled={
                  !me?.avatar_path ||
                  uploadingAvatar ||
                  deletingAvatar
                }
                className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-400 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {deletingAvatar
                  ? "삭제 중..."
                  : "사진 삭제"}
              </button>
            </div>
          </div>

          <label className="mt-6 block text-sm font-semibold">
            닉네임
          </label>

          <input
            type="text"
            value={nickname}
            onChange={(e) =>
              setNickname(
                e.target.value
              )
            }
            maxLength={20}
            placeholder="닉네임"
            className="mt-2 w-full rounded-2xl border border-pink-100 bg-[#fff8fb] px-4 py-4 outline-none transition focus:border-pink-400"
          />

          <div className="mt-2 flex justify-end">
            <p className="text-xs text-gray-400">
              {nickname.length} / 20
            </p>
          </div>

          <button
            type="submit"
            disabled={
              savingNickname
            }
            className="mt-3 w-full rounded-2xl border border-pink-200 bg-white px-5 py-4 font-semibold text-pink-500 transition hover:bg-pink-50 disabled:opacity-50"
          >
            {savingNickname
              ? "변경 중..."
              : "닉네임 변경"}
          </button>

        </form>

        {/* =====================================
            상대방 프로필
        ====================================== */}

        <section className="mt-5 rounded-3xl bg-white p-5 shadow-sm">

          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-pink-50 text-xl">
              ♡
            </div>

            <div>

              <h2 className="font-bold">
                상대방
              </h2>

              <p className="mt-1 text-sm text-gray-400">
                연결된 파트너 정보
              </p>

            </div>

          </div>

          <div className="mt-5 flex items-center gap-4 rounded-2xl bg-[#fff8fb] px-4 py-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white text-2xl shadow-sm">
              {partner?.avatar_url ? (
                <img
                  src={partner.avatar_url}
                  alt={`${partner.nickname} 프로필 사진`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span>♡</span>
              )}
            </div>

            <div>
              <p className="text-xs text-gray-400">
                닉네임
              </p>

              <p className="mt-1 font-bold">
                {partner?.nickname ??
                  "파트너"}
              </p>
            </div>
          </div>

          {/* 기존 텍스트 전용 박스는 숨김 처리하지 않고 제거 */}
          <div className="hidden">

            <p className="text-xs text-gray-400">
              닉네임
            </p>

            <p className="mt-1 font-bold">
              {partner?.nickname ??
                "파트너"}
            </p>

          </div>

        </section>

        {/* =====================================
            초대 코드
        ====================================== */}

        <section className="mt-5 rounded-3xl bg-white p-5 shadow-sm">

          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-pink-50 text-xl">
              🔗
            </div>

            <div>

              <h2 className="font-bold">
                커플 정보
              </h2>

              <p className="mt-1 text-sm text-gray-400">
                현재 연결된 우리 정보
              </p>

            </div>

          </div>

          <div className="mt-5 rounded-2xl bg-[#fff8fb] px-4 py-5 text-center">

            <p className="text-xs text-gray-400">
              초대 코드
            </p>

            <p className="mt-2 text-xl font-bold tracking-[0.2em]">
              {couple?.invite_code ??
                "-"}
            </p>

          </div>

        </section>

        {/* =====================================
            상태 메시지
        ====================================== */}

        {message && (
          <div className="mt-5 rounded-2xl bg-white px-4 py-3 text-center text-sm text-gray-600 shadow-sm">
            {message}
          </div>
        )}

        {/* =====================================
            로그아웃
        ====================================== */}

        <section className="mt-5 rounded-3xl bg-white p-5 shadow-sm">

          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-50 text-xl">
              🚪
            </div>

            <div>

              <h2 className="font-bold">
                계정
              </h2>

              <p className="mt-1 text-sm text-gray-400">
                현재 계정에서 로그아웃해요.
              </p>

            </div>

          </div>

          <button
            type="button"
            disabled={
              loggingOut
            }
            onClick={
              handleLogout
            }
            className="mt-5 w-full rounded-2xl border border-gray-200 bg-white px-5 py-4 font-semibold text-gray-500 transition hover:bg-gray-50 disabled:opacity-50"
          >
            {loggingOut
              ? "로그아웃 중..."
              : "로그아웃"}
          </button>

        </section>

        {/* =====================================
            회원 탈퇴
        ====================================== */}

        <section className="mt-5 rounded-3xl border border-red-100 bg-white p-5 shadow-sm">

          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-xl">
              ⚠️
            </div>

            <div>
              <h2 className="font-bold text-red-500">
                회원 탈퇴
              </h2>

              <p className="mt-1 text-sm leading-6 text-gray-400">
                계정과 내 개인 데이터를 삭제해요.
                <br />
                탈퇴 후에는 되돌릴 수 없어요.
              </p>
            </div>

          </div>

          <div className="mt-4 rounded-2xl bg-red-50/60 px-4 py-4 text-sm leading-6 text-red-400">
            상대방이 남아 있으면 둘의 공간과 공동 기록은 유지되고,
            내 계정과 내 개인 데이터만 정리돼요.
          </div>

          <button
            type="button"
            disabled={
              deletingAccount ||
              loggingOut
            }
            onClick={
              handleDeleteAccount
            }
            className="mt-4 w-full rounded-2xl border border-red-200 bg-white px-5 py-4 font-semibold text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {deletingAccount
              ? "회원 탈퇴 처리 중..."
              : "회원 탈퇴"}
          </button>

        </section>

        <BottomNav />

      </div>

    </main>
  );
}