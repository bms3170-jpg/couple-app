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

    if (file.size >
