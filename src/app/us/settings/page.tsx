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

const SETTINGS_IMAGES = {
  header: "/images/settings/settings-header.PNG",
  coupleHearts: "/images/settings/couple-hearts.PNG",
  togetherDayCalendar: "/images/settings/together-day-calendar.PNG",
  profileAvatar: "/images/settings/profile-avatar.PNG",
  catAvatar: "/images/settings/cat-avatar.PNG",
  dogAvatar: "/images/settings/dog-avatar.PNG",
  loveLetter: "/images/settings/love-letter.PNG",
  rewardGift: "/images/settings/reward-gift.PNG",
  dateEditCalendar: "/images/settings/date-edit-calendar.PNG",
  coupleLock: "/images/settings/couple-lock.PNG",
  memoryCamera: "/images/settings/memory-camera.PNG",
  anniversary100Days: "/images/settings/anniversary-100days.PNG",
  coupleDiary: "/images/settings/couple-diary.PNG",
  settingsGear: "/images/settings/settings-gear.PNG",
} as const;

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function getDaysTogether(value: string) {
  if (!value) return null;

  const started = startOfDay(new Date(`${value}T00:00:00`));
  const today = startOfDay(new Date());

  const diff = Math.floor(
    (today.getTime() - started.getTime()) /
      (1000 * 60 * 60 * 24)
  );

  return diff >= 0 ? diff + 1 : null;
}

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

  const [
    deletingAccount,
    setDeletingAccount,
  ] = useState(false);

  const [
    uploadingAvatar,
    setUploadingAvatar,
  ] = useState(false);

  const [
    deletingAvatar,
    setDeletingAvatar,
  ] = useState(false);

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

  const [
    avatarPreviewUrl,
    setAvatarPreviewUrl,
  ] = useState<string | null>(null);

  const [
    copiedInvite,
    setCopiedInvite,
  ] = useState(false);

  useEffect(() => {
    if (!message) return;

    const timer = window.setTimeout(() => {
      setMessage("");
    }, 2800);

    return () => {
      window.clearTimeout(timer);
    };
  }, [message]);

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl) {
        URL.revokeObjectURL(
          avatarPreviewUrl
        );
      }
    };
  }, [avatarPreviewUrl]);

  // =========================================
  // 설정 데이터 불러오기
  // =========================================

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      if (deletingAccount) {
        return;
      }

      router.replace("/login");
      return;
    }

    const currentUser = user;
    let cancelled = false;

    async function loadSettings() {
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
    deletingAccount,
  ]);

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
      setMessage(
        `날짜를 저장하지 못했어요: ${error.message}`
      );
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

  async function handleAvatarChange(
    e: ChangeEvent<HTMLInputElement>
  ) {
    const file =
      e.target.files?.[0];

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

    if (
      file.size >
      5 * 1024 * 1024
    ) {
      setMessage(
        "프로필 사진은 5MB 이하만 올릴 수 있어요."
      );
      return;
    }

    if (avatarPreviewUrl) {
      URL.revokeObjectURL(
        avatarPreviewUrl
      );
    }

    const localPreview =
      URL.createObjectURL(file);

    setAvatarPreviewUrl(
      localPreview
    );

    const currentMe =
      members.find(
        (member) =>
          member.user_id ===
          user.id
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

    const {
      error: uploadError,
    } =
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
      setAvatarPreviewUrl(null);

      setMessage(
        `사진을 올리지 못했어요: ${uploadError.message}`
      );

      return;
    }

    const {
      error: profileError,
    } =
      await supabase
        .from("profiles")
        .update({
          avatar_path:
            newPath,
        })
        .eq(
          "id",
          user.id
        );

    if (profileError) {
      await supabase.storage
        .from("avatars")
        .remove([
          newPath,
        ]);

      setUploadingAvatar(false);
      setAvatarPreviewUrl(null);

      setMessage(
        `프로필 사진을 저장하지 못했어요: ${profileError.message}`
      );

      return;
    }

    const publicUrl =
      supabase.storage
        .from("avatars")
        .getPublicUrl(
          newPath
        ).data.publicUrl;

    setMembers(
      (current) =>
        current.map(
          (member) =>
            member.user_id ===
            user.id
              ? {
                  ...member,
                  avatar_path:
                    newPath,
                  avatar_url:
                    publicUrl,
                }
              : member
        )
    );

    if (
      currentMe?.avatar_path &&
      currentMe.avatar_path !==
        newPath
    ) {
      await supabase.storage
        .from("avatars")
        .remove([
          currentMe.avatar_path,
        ]);
    }

    setUploadingAvatar(false);
    setAvatarPreviewUrl(null);

    setMessage(
      "프로필 사진을 변경했어요 ♡"
    );
  }

  async function handleDeleteAvatar() {
    if (!user) {
      router.replace("/login");
      return;
    }

    const currentMe =
      members.find(
        (member) =>
          member.user_id ===
          user.id
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

    const {
      error: profileError,
    } =
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

    const {
      error: removeError,
    } =
      await supabase.storage
        .from("avatars")
        .remove([
          oldPath,
        ]);

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
            member.user_id ===
            user.id
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

  async function copyInviteCode() {
    if (!couple?.invite_code) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        couple.invite_code
      );

      setCopiedInvite(true);
      setMessage(
        "초대코드를 복사했어요 ♡"
      );

      window.setTimeout(() => {
        setCopiedInvite(false);
      }, 1800);
    } catch {
      setMessage(
        "초대코드를 복사하지 못했어요."
      );
    }
  }

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

  async function handleDeleteAccount() {
    if (!user) {
      router.replace("/login");
      return;
    }

    const firstConfirmed =
      window.confirm(
        "정말 회원 탈퇴하시겠어요?\n\n삭제되는 항목: 내 계정과 개인 데이터\n유지되는 항목: 상대방이 남아 있다면 공동 공간과 공동 기록\n\n이 작업은 되돌릴 수 없어요."
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

    const {
      data,
      error,
    } =
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

  if (
    authLoading ||
    loading
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fff8fb]">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-xl shadow-sm">
            ⚙️
          </div>
          <p className="mt-4 text-sm text-gray-500">
            우리 설정 불러오는 중...
          </p>
        </div>
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

  const savedRelationshipDate =
    couple?.relationship_started_at
      ? couple.relationship_started_at.slice(
          0,
          10
        )
      : "";

  const isDateDirty =
    relationshipDate !==
    savedRelationshipDate;

  const savedNickname =
    me?.nickname ?? "";

  const isNicknameDirty =
    nickname.trim() !==
    savedNickname.trim();

  const daysTogether =
    getDaysTogether(
      relationshipDate
    );

  const currentAvatarUrl =
    avatarPreviewUrl ??
    me?.avatar_url ??
    null;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8fb_0%,#fffafd_42%,#fff7fb_100%)] px-4 py-7 text-[#2b2b2b] sm:px-5 sm:py-8">
      <div className="mx-auto w-full max-w-md pb-28">

        <header className="relative overflow-hidden rounded-[34px] border border-pink-100/70 bg-gradient-to-br from-white via-[#fff9fc] to-[#fff1f7] px-5 pb-6 pt-5 shadow-[0_12px_34px_rgba(236,72,153,0.07)]">
          <div className="pointer-events-none absolute -right-8 -top-6 h-44 w-44 rounded-full bg-pink-100/55 blur-3xl" />

          <img
            src={SETTINGS_IMAGES.header}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute right-0 top-4 h-[150px] w-[185px] object-contain object-right opacity-[0.9]"
          />

          <div className="relative z-10 max-w-[57%]">
            <Link
              href="/us"
              prefetch={false}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-400"
            >
              ← 우리로 돌아가기
            </Link>

            <p className="mt-5 text-[10px] font-black tracking-[0.24em] text-pink-400">
              OURQUEST
            </p>

            <h1 className="mt-2 text-[33px] font-black tracking-[-0.04em]">
              우리 설정 ⚙️
            </h1>

            <p className="mt-2 text-[12px] leading-5 text-gray-500">
              우리 둘의 정보와
              <br />
              함께한 날짜를 관리해요.
            </p>
          </div>
        </header>

        <section className="mt-4 overflow-hidden rounded-[30px] border border-pink-100/80 bg-white/90 p-5 shadow-[0_8px_24px_rgba(236,72,153,0.05)]">
          <div className="relative flex items-center gap-4">
            <img
              src={SETTINGS_IMAGES.coupleHearts}
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute -right-3 -top-4 h-20 w-24 object-contain opacity-[0.18]"
            />

            <div className="relative h-16 w-[92px] shrink-0">
              <div className="absolute left-0 top-0 flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-gradient-to-br from-pink-50 to-rose-50 text-2xl shadow-sm">
                {me?.avatar_url ? (
                  <img
                    src={me.avatar_url}
                    alt={`${me.nickname} 프로필 사진`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <img
                    src={SETTINGS_IMAGES.catAvatar}
                    alt=""
                    aria-hidden="true"
                    className="h-full w-full object-cover"
                  />
                )}
              </div>

              <div className="absolute right-0 top-2 flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-gradient-to-br from-purple-50 to-pink-50 text-2xl shadow-sm">
                {partner?.avatar_url ? (
                  <img
                    src={partner.avatar_url}
                    alt={`${partner.nickname} 프로필 사진`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <img
                    src={SETTINGS_IMAGES.dogAvatar}
                    alt=""
                    aria-hidden="true"
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
            </div>

            <div className="min-w-0">
              <p className="text-[10px] font-black tracking-[0.18em] text-pink-400">
                OUR COUPLE
              </p>

              <h2 className="mt-1 truncate text-xl font-black">
                {me?.nickname ?? "나"}{" "}
                ♡{" "}
                {partner?.nickname ?? "파트너"}
              </h2>

              <span className="mt-2 inline-flex rounded-full bg-pink-50 px-2.5 py-1 text-[10px] font-bold text-pink-500">
                연결됨 ♡
              </span>
            </div>
          </div>
        </section>

        <form
          onSubmit={saveRelationshipDate}
          className="relative mt-4 overflow-hidden rounded-[30px] border border-pink-100 bg-gradient-to-br from-white via-[#fffafd] to-[#fff5ed] p-5 shadow-[0_8px_24px_rgba(236,72,153,0.05)]"
        >
          <img
            src={SETTINGS_IMAGES.anniversary100Days}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute -right-2 top-4 h-28 w-32 object-contain opacity-[0.52]"
          />

          <div className="relative z-10">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-pink-50">
                <img
                  src={SETTINGS_IMAGES.togetherDayCalendar}
                  alt=""
                  aria-hidden="true"
                  className="h-9 w-9 object-contain"
                />
              </div>

              <div>
                <h2 className="font-black">
                  함께한 날짜
                </h2>

                <p className="mt-1 text-xs text-gray-400">
                  우리 사이가 시작된 날
                </p>
              </div>
            </div>

            {daysTogether !== null && (
              <div className="mt-4 inline-flex rounded-full border border-pink-100 bg-white/90 px-3 py-2 text-xs font-black text-pink-500 shadow-sm">
                오늘은 D+{daysTogether} ♡
              </div>
            )}

            <div className="relative mt-4">
              <img
                src={SETTINGS_IMAGES.dateEditCalendar}
                alt=""
                aria-hidden="true"
                className="pointer-events-none absolute right-3 top-1/2 h-8 w-8 -translate-y-1/2 object-contain opacity-45"
              />

              <input
                type="date"
                value={relationshipDate}
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
                style={{
                  width: "100%",
                  maxWidth: "100%",
                  minWidth: 0,
                  boxSizing: "border-box",
                  WebkitAppearance: "none",
                }}
                className="block w-full min-w-0 max-w-full rounded-[18px] border border-pink-100 bg-white/85 px-4 py-4 text-base outline-none transition focus:border-pink-400"
              />
            </div>

            {isDateDirty && (
              <p className="mt-2 text-[11px] font-semibold text-orange-500">
                저장되지 않은 변경사항이 있어요.
              </p>
            )}

            <button
              type="submit"
              disabled={
                savingDate ||
                !isDateDirty
              }
              className="mt-3 w-full rounded-[18px] bg-gradient-to-r from-pink-500 to-fuchsia-500 px-5 py-4 font-black text-white shadow-sm transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45"
            >
              {savingDate
                ? "저장 중..."
                : isDateDirty
                ? "함께한 날짜 저장"
                : "저장 완료 ♡"}
            </button>
          </div>
        </form>

        <form
          onSubmit={saveNickname}
          className="mt-4 rounded-[30px] border border-pink-100 bg-white/95 p-5 shadow-[0_8px_24px_rgba(236,72,153,0.05)]"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-blue-50">
              <img
                src={SETTINGS_IMAGES.profileAvatar}
                alt=""
                aria-hidden="true"
                className="h-9 w-9 object-contain"
              />
            </div>

            <div>
              <h2 className="font-black">
                내 프로필
              </h2>

              <p className="mt-1 text-xs text-gray-400">
                사진과 닉네임을 관리해요.
              </p>
            </div>
          </div>

          <div className="relative mt-5 flex flex-col items-center">
            <img
              src={SETTINGS_IMAGES.memoryCamera}
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute right-2 top-0 h-16 w-20 object-contain opacity-[0.16]"
            />

            <div className="relative">
              <button
                type="button"
                className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-gradient-to-br from-pink-50 to-purple-50 text-4xl shadow-[0_8px_24px_rgba(236,72,153,0.12)]"
                aria-label="내 프로필 사진"
              >
                {currentAvatarUrl ? (
                  <img
                    src={currentAvatarUrl}
                    alt={`${me?.nickname ?? "내"} 프로필 사진`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <img
                    src={SETTINGS_IMAGES.catAvatar}
                    alt=""
                    aria-hidden="true"
                    className="h-full w-full object-cover"
                  />
                )}
              </button>

              {uploadingAvatar && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/35 text-xs font-black text-white backdrop-blur-sm">
                  업로드 중...
                </div>
              )}
            </div>

            <p className="mt-3 text-[10px] text-gray-400">
              JPG · PNG · WEBP / 최대 5MB
            </p>

            <div className="mt-3 grid w-full grid-cols-2 gap-2">
              <label
                className={`flex cursor-pointer items-center justify-center rounded-[16px] border border-pink-200 bg-white px-4 py-3 text-sm font-black text-pink-500 transition active:scale-[0.99] ${
                  uploadingAvatar ||
                  deletingAvatar
                    ? "pointer-events-none opacity-50"
                    : ""
                }`}
              >
                {me?.avatar_url
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
                className="rounded-[16px] border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-400 transition disabled:cursor-not-allowed disabled:opacity-40"
              >
                {deletingAvatar
                  ? "삭제 중..."
                  : "사진 삭제"}
              </button>
            </div>
          </div>

          <label className="mt-6 block text-sm font-black">
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
            className="mt-2 w-full rounded-[18px] border border-pink-100 bg-[#fff8fb] px-4 py-4 outline-none transition focus:border-pink-400"
          />

          <div className="mt-2 flex items-center justify-between">
            <p className={`text-[11px] font-semibold ${
              isNicknameDirty
                ? "text-orange-500"
                : "text-transparent"
            }`}>
              저장되지 않은 변경사항
            </p>

            <p className="text-xs text-gray-400">
              {nickname.length} / 20
            </p>
          </div>

          <button
            type="submit"
            disabled={
              savingNickname ||
              !isNicknameDirty
            }
            className="mt-3 w-full rounded-[18px] border border-pink-200 bg-gradient-to-r from-white to-pink-50 px-5 py-4 font-black text-pink-500 transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45"
          >
            {savingNickname
              ? "변경 중..."
              : isNicknameDirty
              ? "닉네임 변경"
              : "변경 완료 ♡"}
          </button>
        </form>

        <section className="mt-4 rounded-[30px] border border-purple-100 bg-gradient-to-br from-white via-[#fcf9ff] to-purple-50/60 p-5 shadow-[0_8px_24px_rgba(139,92,246,0.05)]">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-purple-50">
              <img
                src={SETTINGS_IMAGES.dogAvatar}
                alt=""
                aria-hidden="true"
                className="h-9 w-9 object-contain"
              />
            </div>

            <div>
              <h2 className="font-black">
                상대방
              </h2>

              <p className="mt-1 text-xs text-gray-400">
                연결된 파트너 정보
              </p>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-4 rounded-[22px] border border-white bg-white/70 px-4 py-4 shadow-sm">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white text-2xl shadow-sm">
              {partner?.avatar_url ? (
                <img
                  src={partner.avatar_url}
                  alt={`${partner.nickname} 프로필 사진`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <img
                  src={SETTINGS_IMAGES.dogAvatar}
                  alt=""
                  aria-hidden="true"
                  className="h-full w-full object-cover"
                />
              )}
            </div>

            <div>
              <p className="text-xs text-gray-400">
                닉네임
              </p>

              <p className="mt-1 font-black">
                {partner?.nickname ??
                  "파트너"}
              </p>

              <span className="mt-2 inline-flex rounded-full bg-purple-50 px-2.5 py-1 text-[10px] font-bold text-purple-500">
                연결된 파트너 ♡
              </span>
            </div>
          </div>
        </section>

        <section className="relative mt-4 overflow-hidden rounded-[30px] border border-emerald-100 bg-gradient-to-br from-white via-[#fbfffd] to-emerald-50/60 p-5 shadow-[0_8px_24px_rgba(16,185,129,0.05)]">
          <div className="pointer-events-none absolute -right-6 -bottom-6 h-28 w-28 rounded-full bg-emerald-100/45 blur-2xl" />

          <div className="relative z-10">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-emerald-50">
                <img
                  src={SETTINGS_IMAGES.coupleLock}
                  alt=""
                  aria-hidden="true"
                  className="h-9 w-9 object-contain"
                />
              </div>

              <div>
                <h2 className="font-black">
                  커플 정보
                </h2>

                <p className="mt-1 text-xs text-gray-400">
                  현재 연결된 우리 정보
                </p>
              </div>
            </div>

            <div className="relative mt-5 overflow-hidden rounded-[22px] border border-white bg-white/78 px-4 py-5 text-center shadow-sm">
              <img
                src={SETTINGS_IMAGES.loveLetter}
                alt=""
                aria-hidden="true"
                className="pointer-events-none absolute -left-3 -bottom-2 h-20 w-24 object-contain opacity-[0.16]"
              />

              <img
                src={SETTINGS_IMAGES.rewardGift}
                alt=""
                aria-hidden="true"
                className="pointer-events-none absolute -right-2 -top-2 h-16 w-20 object-contain opacity-[0.14]"
              />
              <p className="text-[10px] font-bold tracking-[0.14em] text-emerald-500">
                초대 코드
              </p>

              <p className="mt-2 text-xl font-black tracking-[0.2em]">
                {couple?.invite_code ??
                  "-"}
              </p>

              <button
                type="button"
                onClick={() => {
                  void copyInviteCode();
                }}
                className="mt-3 rounded-full bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-600 transition active:scale-95"
              >
                {copiedInvite
                  ? "복사 완료 ✓"
                  : "초대코드 복사"}
              </button>
            </div>
          </div>
        </section>

        <section className="mt-4 rounded-[28px] border border-gray-100 bg-white/95 p-5 shadow-[0_7px_20px_rgba(0,0,0,0.035)]">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-gray-50">
                <img
                  src={SETTINGS_IMAGES.coupleDiary}
                  alt=""
                  aria-hidden="true"
                  className="h-9 w-9 object-contain"
                />
              </div>

              <div>
                <h2 className="font-black">
                  계정
                </h2>

                <p className="mt-1 text-xs text-gray-400">
                  현재 계정에서 로그아웃해요.
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={loggingOut}
              onClick={handleLogout}
              className="shrink-0 rounded-[16px] border border-gray-200 bg-white px-4 py-3 text-sm font-black text-gray-500 transition active:scale-95 disabled:opacity-50"
            >
              {loggingOut
                ? "로그아웃 중..."
                : "로그아웃"}
            </button>
          </div>
        </section>

        <section className="relative mt-4 overflow-hidden rounded-[30px] border border-red-100 bg-gradient-to-br from-white via-[#fffafa] to-red-50/65 p-5 shadow-[0_8px_24px_rgba(239,68,68,0.045)]">
          <div className="pointer-events-none absolute -right-8 -bottom-8 h-28 w-28 rounded-full bg-red-100/40 blur-2xl" />

          <div className="relative z-10">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-red-50">
                <img
                  src={SETTINGS_IMAGES.rewardGift}
                  alt=""
                  aria-hidden="true"
                  className="h-9 w-9 object-contain opacity-75"
                />
              </div>

              <div>
                <h2 className="font-black text-red-500">
                  회원 탈퇴
                </h2>

                <p className="mt-1 text-xs leading-5 text-gray-400">
                  계정과 내 개인 데이터를 삭제해요.
                  <br />
                  탈퇴 후에는 되돌릴 수 없어요.
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-[18px] border border-red-100/70 bg-white/70 px-4 py-4 text-xs leading-5 text-red-400">
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
              className="mt-4 w-full rounded-[18px] border border-red-200 bg-white px-5 py-4 font-black text-red-500 transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {deletingAccount
                ? "회원 탈퇴 처리 중..."
                : "회원 탈퇴"}
            </button>
          </div>
        </section>

        <Link
          href="/us"
          prefetch={false}
          className="relative mt-5 flex w-full items-center justify-center overflow-hidden rounded-[18px] border border-pink-100 bg-gradient-to-r from-white via-[#fffafd] to-pink-50/60 px-4 py-3.5 text-center text-xs font-black text-gray-400 shadow-sm"
        >
          <img
            src={SETTINGS_IMAGES.coupleDiary}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute left-3 h-8 w-10 object-contain opacity-45"
          />
          우리 페이지로 돌아가기
        </Link>

        {message && (
          <div className="fixed inset-x-4 bottom-24 z-[120] mx-auto max-w-sm rounded-full border border-pink-100 bg-white/95 px-4 py-3 text-center text-xs font-black text-gray-600 shadow-xl backdrop-blur">
            {message}
          </div>
        )}

        <BottomNav />
      </div>
    </main>
  );
}
