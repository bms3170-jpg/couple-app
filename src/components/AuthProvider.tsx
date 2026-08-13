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
  const supabase = useMemo(() => createClient(), []);
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [savingDate, setSavingDate] = useState(false);
  const [savingNickname, setSavingNickname] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [deletingAvatar, setDeletingAvatar] = useState(false);
  const [message, setMessage] = useState("");
  const [couple, setCouple] = useState<CoupleInfo | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [relationshipDate, setRelationshipDate] = useState("");
  const [nickname, setNickname] = useState("");

  // =========================================
  // ì¤ì  ë°ì´í° ë¶ë¬ì¤ê¸°
  // =========================================

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      // íì íí´ ì²ë¦¬ ì¤ìë ë¡ê·¸ì¸ íì´ì§ë¡ ê°ì  ì´ëíì§ ìì
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

      const { data: membership, error: membershipError } = await supabase
        .from("couple_members")
        .select("couple_id")
        .eq("user_id", currentUser.id)
        .maybeSingle();

      if (cancelled) return;

      if (membershipError || !membership) {
        console.error("ì»¤í ì¡°í ì¤ë¥:", membershipError);
        setMessage("ì»¤í ì ë³´ë¥¼ ì°¾ì ì ìì´ì.");
        setLoading(false);
        return;
      }

      const coupleId = membership.couple_id;

      const { data: coupleData, error: coupleError } = await supabase
        .from("couples")
        .select(`
          id,
          invite_code,
          relationship_started_at
        `)
        .eq("id", coupleId)
        .maybeSingle();

      if (cancelled) return;

      if (coupleError || !coupleData) {
        console.error("ì»¤í ì ë³´ ì¡°í ì¤ë¥:", coupleError);
        setMessage("ì»¤í ì ë³´ë¥¼ ë¶ë¬ì¤ì§ ëª»íì´ì.");
        setLoading(false);
        return;
      }

      setCouple(coupleData as CoupleInfo);

      setRelationshipDate(
        coupleData.relationship_started_at
          ? coupleData.relationship_started_at.slice(0, 10)
          : ""
      );

      const { data: memberRows, error: memberError } = await supabase
        .from("couple_members")
        .select("user_id")
        .eq("couple_id", coupleId)
        .order("joined_at", { ascending: true });

      if (cancelled) return;

      if (memberError) {
        console.error("ë©¤ë² ì¡°í ì¤ë¥:", memberError);
        setMessage("ë©¤ë² ì ë³´ë¥¼ ë¶ë¬ì¤ì§ ëª»íì´ì.");
        setLoading(false);
        return;
      }

      const userIds = memberRows?.map((item) => item.user_id) ?? [];

      const { data: profileRows, error: profileError } = userIds.length
        ? await supabase
            .from("profiles")
            .select("id, nickname, avatar_path")
            .in("id", userIds)
        : {
            data: [],
            error: null,
          };

      if (cancelled) return;

      if (profileError) {
        console.error("íë¡í ì¡°í ì¤ë¥:", profileError);
        setMessage("íë¡í ì ë³´ë¥¼ ë¶ë¬ì¤ì§ ëª»íì´ì.");
        setLoading(false);
        return;
      }

      const loadedMembers: Member[] = userIds.map((userId) => {
        const profile = profileRows?.find((item) => item.id === userId);
        const avatarPath = profile?.avatar_path ?? null;

        const avatarUrl = avatarPath
          ? supabase.storage.from("avatars").getPublicUrl(avatarPath).data.publicUrl
          : null;

        return {
          user_id: userId,
          nickname: profile?.nickname ?? "ì´ë¦ ìì",
          avatar_path: avatarPath,
          avatar_url: avatarUrl,
        };
      });

      setMembers(loadedMembers);

      const myProfile = loadedMembers.find(
        (member) => member.user_id === currentUser.id
      );

      setNickname(myProfile?.nickname ?? "");
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

  // =========================================
  // í¨ê»í ë ì§ ì ì¥
  // =========================================

  async function saveRelationshipDate(e: FormEvent) {
    e.preventDefault();

    if (!couple) return;

    if (!relationshipDate) {
      setMessage("í¨ê»í ë ì§ë¥¼ ì íí´ì£¼ì¸ì.");
      return;
    }

    setSavingDate(true);
    setMessage("");

    const { data, error } = await supabase
      .from("couples")
      .update({
        relationship_started_at: relationshipDate,
      })
      .eq("id", couple.id)
      .select("id, relationship_started_at")
      .maybeSingle();

    setSavingDate(false);

    if (error) {
      const errorText =
        `ë ì§ ì ì¥ ì¤ë¥ | ` +
        `message=${error.message} | ` +
        `code=${error.code ?? ""} | ` +
        `details=${error.details ?? ""} | ` +
        `hint=${error.hint ?? ""}`;

      setMessage(errorText);
      return;
    }

    if (!data) {
      setMessage("ë ì§ë¥¼ ìì í  ê¶íì´ ìê±°ë ìì í  ì»¤íì ì°¾ì§ ëª»íì´ì.");
      return;
    }

    setCouple((current) =>
      current
        ? {
            ...current,
            relationship_started_at: data.relationship_started_at,
          }
        : current
    );

    setRelationshipDate(
      data.relationship_started_at
        ? data.relationship_started_at.slice(0, 10)
        : ""
    );

    setMessage("í¨ê»í ë ì§ë¥¼ ì ì¥íì´ì â¡");
  }

  // =========================================
  // ëë¤ì ì ì¥
  // =========================================

  async function saveNickname(e: FormEvent) {
    e.preventDefault();

    if (!user) {
      router.replace("/login");
      return;
    }

    const trimmedNickname = nickname.trim();

    if (!trimmedNickname) {
      setMessage("ëë¤ìì ìë ¥í´ì£¼ì¸ì.");
      return;
    }

    if (trimmedNickname.length > 20) {
      setMessage("ëë¤ìì 20ì ì´íë¡ ìë ¥í´ì£¼ì¸ì.");
      return;
    }

    setSavingNickname(true);
    setMessage("");

    const { error } = await supabase
      .from("profiles")
      .update({ nickname: trimmedNickname })
      .eq("id", user.id);

    setSavingNickname(false);

    if (error) {
      console.error("ëë¤ì ì ì¥ ì¤ë¥:", error);
      setMessage(`ëë¤ìì ë³ê²½íì§ ëª»íì´ì: ${error.message}`);
      return;
    }

    setMembers((current) =>
      current.map((member) =>
        member.user_id === user.id
          ? { ...member, nickname: trimmedNickname }
          : member
      )
    );

    setNickname(trimmedNickname);
    setMessage("ëë¤ìì ë³ê²½íì´ì â¡");
  }

  // =========================================
  // íë¡í ì¬ì§ ìë¡ë
  // =========================================

  async function handleAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";

    if (!file) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      setMessage("JPG, PNG, WEBP ì´ë¯¸ì§ë§ ì¬ë¦´ ì ìì´ì.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage("íë¡í ì¬ì§ì 5MB ì´íë§ ì¬ë¦´ ì ìì´ì.");
      return;
    }

    const currentMe = members.find((member) => member.user_id === user.id);

    const extension =
      file.type === "image/png"
        ? "png"
        : file.type === "image/webp"
        ? "webp"
        : "jpg";

    const newPath = `${user.id}/avatar-${Date.now()}.${extension}`;

    setUploadingAvatar(true);
    setMessage("");

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(newPath, file, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      setUploadingAvatar(false);
      setMessage(`ì¬ì§ì ì¬ë¦¬ì§ ëª»íì´ì: ${uploadError.message}`);
      return;
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ avatar_path: newPath })
      .eq("id", user.id);

    if (profileError) {
      await supabase.storage.from("avatars").remove([newPath]);
      setUploadingAvatar(false);
      setMessage(`íë¡í ì¬ì§ì ì ì¥íì§ ëª»íì´ì: ${profileError.message}`);
      return;
    }

    const publicUrl = supabase.storage
      .from("avatars")
      .getPublicUrl(newPath).data.publicUrl;

    setMembers((current) =>
      current.map((member) =>
        member.user_id === user.id
          ? {
              ...member,
              avatar_path: newPath,
              avatar_url: publicUrl,
            }
          : member
      )
    );

    if (currentMe?.avatar_path && currentMe.avatar_path !== newPath) {
      await supabase.storage.from("avatars").remove([currentMe.avatar_path]);
    }

    setUploadingAvatar(false);
    setMessage("íë¡í ì¬ì§ì ë³ê²½íì´ì â¡");
  }

  // =========================================
  // íë¡í ì¬ì§ ì­ì 
  // =========================================

  async function handleDeleteAvatar() {
    if (!user) {
      router.replace("/login");
      return;
    }

    const currentMe = members.find((member) => member.user_id === user.id);

    if (!currentMe?.avatar_path) return;

    const confirmed = window.confirm("íë¡í ì¬ì§ì ì­ì í ê¹ì?");

    if (!confirmed) return;

    setDeletingAvatar(true);
    setMessage("");

    const oldPath = currentMe.avatar_path;

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ avatar_path: null })
      .eq("id", user.id);

    if (profileError) {
      setDeletingAvatar(false);
      setMessage(`íë¡í ì¬ì§ì ì­ì íì§ ëª»íì´ì: ${profileError.message}`);
      return;
    }

    const { error: removeError } = await supabase.storage
      .from("avatars")
      .remove([oldPath]);

    if (removeError) {
      console.error("ê¸°ì¡´ íë¡í ì¬ì§ íì¼ ì­ì  ì¤ë¥:", removeError);
    }

    setMembers((current) =>
      current.map((member) =>
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
    setMessage("íë¡í ì¬ì§ì ì­ì íì´ì.");
  }

  // =========================================
  // ë¡ê·¸ìì
  // =========================================

  async function handleLogout() {
    const confirmed = window.confirm("ë¡ê·¸ììí ê¹ì?");

    if (!confirmed) return;

    setLoggingOut(true);
    setMessage("");

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("ë¡ê·¸ìì ì¤ë¥:", error);
      setMessage(`ë¡ê·¸ììíì§ ëª»íì´ì: ${error.message}`);
      setLoggingOut(false);
      return;
    }

    router.replace("/login");
    router.refresh();
  }

  // =========================================
  // íì íí´
  // =========================================

  async function handleDeleteAccount() {
    if (!user) {
      router.replace("/login");
      return;
    }

    const firstConfirmed = window.confirm(
      "ì ë§ íì íí´íìê² ì´ì?\n\níí´íë©´ ë´ ê³ì ê³¼ ê°ì¸ ë°ì´í°ê° ì­ì ë¼ì. ì´ ììì ëëë¦´ ì ìì´ì."
    );

    if (!firstConfirmed) return;

    const confirmText = window.prompt(
      'ê³ìíë ¤ë©´ "íí´"ë¼ê³  ìë ¥í´ì£¼ì¸ì.'
    );

    if (confirmText !== "íí´") {
      if (confirmText !== null) {
        setMessage('íì íí´ê° ì·¨ìëì´ì. "íí´"ë¼ê³  ì íí ìë ¥í´ì£¼ì¸ì.');
      }
      return;
    }

    // ì´ ê°ì ë¨¼ì  trueë¡ ë§ë¤ì´ auth ìíê° ì¬ë¼ì ¸ë
    // useEffectê° /loginì¼ë¡ ë³´ë´ì§ ìëë¡ í¨
    setDeletingAccount(true);
    setMessage("");

    const { data, error } = await supabase.rpc("delete_my_account");

    if (error) {
      console.error("íì íí´ ì¤ë¥:", error);
      setMessage(`íì íí´ì ì¤í¨íì´ì: ${error.message}`);
      setDeletingAccount(false);
      return;
    }

    const result = data as
      | {
          success?: boolean;
        }
      | null;

    if (!result?.success) {
      setMessage("íì íí´ ì²ë¦¬ ê²°ê³¼ë¥¼ íì¸íì§ ëª»íì´ì.");
      setDeletingAccount(false);
      return;
    }

    try {
      await supabase.auth.signOut();
    } catch (signOutError) {
      console.error("íí´ í ë¡ì»¬ ì¸ì ì ë¦¬ ì¤ë¥:", signOutError);
    }

    // íí´ ìë£ í ë¡ê·¸ì¸ íì´ì§ê° ìë OurQuest ì²« íë©´ì¼ë¡ ì´ë
    router.replace("/");
    router.refresh();
  }

  // =========================================
  // ë¡ë©
  // =========================================

  if (authLoading || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fff8fb]">
        <p className="text-sm text-gray-500">ì°ë¦¬ ì¤ì  ë¶ë¬ì¤ë ì¤...</p>
      </main>
    );
  }

  const me = members.find((member) => member.user_id === user?.id);
  const partner = members.find((member) => member.user_id !== user?.id);

  return (
    <main className="min-h-screen bg-[#fff8fb] px-5 py-8 text-[#2b2b2b]">
      <div className="mx-auto max-w-md pb-28">
        <header>
          <Link
            href="/us"
            prefetch={false}
            className="inline-block text-sm font-semibold text-gray-500"
          >
            â ì°ë¦¬ë¡ ëìê°ê¸°
          </Link>

          <p className="mt-8 text-sm font-semibold tracking-[0.2em] text-pink-400">
            OURQUEST
          </p>

          <h1 className="mt-2 text-3xl font-bold">ì°ë¦¬ ì¤ì  âï¸</h1>

          <p className="mt-3 text-sm leading-6 text-gray-500">
            ì°ë¦¬ ëì ì ë³´ì
            <br />
            í¨ê»í ë ì§ë¥¼ ê´ë¦¬í´ì.
          </p>
        </header>

        <section className="mt-7 rounded-[32px] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="relative h-16 w-20 shrink-0">
              <div className="absolute left-0 top-0 flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-pink-50 text-2xl shadow-sm">
                {me?.avatar_url ? (
                  <img
                    src={me.avatar_url}
                    alt={`${me.nickname} íë¡í ì¬ì§`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span>ð</span>
                )}
              </div>

              <div className="absolute right-0 top-2 flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-pink-50 text-2xl shadow-sm">
                {partner?.avatar_url ? (
                  <img
                    src={partner.avatar_url}
                    alt={`${partner.nickname} íë¡í ì¬ì§`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span>â¡</span>
                )}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-pink-400">OUR COUPLE</p>
              <h2 className="mt-1 text-xl font-bold">
                {me?.nickname ?? "ë"} â¡ {partner?.nickname ?? "íí¸ë"}
              </h2>
            </div>
          </div>
        </section>

        <form
          onSubmit={saveRelationshipDate}
          className="mt-5 rounded-3xl bg-white p-5 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-pink-50 text-xl">
              ð
            </div>
            <div>
              <h2 className="font-bold">í¨ê»í ë ì§</h2>
              <p className="mt-1 text-sm text-gray-400">ì°ë¦¬ ì¬ì´ê° ììë ë </p>
            </div>
          </div>

          <input
            type="date"
            value={relationshipDate}
            onChange={(e) => setRelationshipDate(e.target.value)}
            max={new Date().toISOString().split("T")[0]}
            className="mt-5 block h-14 w-full min-w-0 appearance-none rounded-2xl border border-pink-100 bg-[#fff8fb] px-4 text-base text-[#2b2b2b] outline-none transition focus:border-pink-400"
          />

          <button
            type="submit"
            disabled={savingDate}
            className="mt-3 w-full rounded-2xl bg-pink-500 px-5 py-4 font-semibold text-white transition hover:bg-pink-600 disabled:opacity-50"
          >
            {savingDate
              ? "ì ì¥ ì¤..."
              : relationshipDate
              ? "í¨ê»í ë ì§ ì ì¥"
              : "ë ì§ ì¤ì íê¸°"}
          </button>
        </form>

        <form
          onSubmit={saveNickname}
          className="mt-5 rounded-3xl bg-white p-5 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-pink-50 text-xl">
              ð¤
            </div>
            <div>
              <h2 className="font-bold">ë´ íë¡í</h2>
              <p className="mt-1 text-sm text-gray-400">
                ë´ ëë¤ìì ë³ê²½í  ì ìì´ì.
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-col items-center">
            <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-pink-50 text-4xl shadow-sm">
              {me?.avatar_url ? (
                <img
                  src={me.avatar_url}
                  alt={`${me.nickname} íë¡í ì¬ì§`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span>ð¤</span>
              )}
            </div>

            <p className="mt-3 text-xs text-gray-400">
              JPG Â· PNG Â· WEBP / ìµë 5MB
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
                  ? "ì¬ì§ ì¬ë¦¬ë ì¤..."
                  : me?.avatar_url
                  ? "ì¬ì§ ë³ê²½"
                  : "ì¬ì§ ì¶ê°"}

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  disabled={uploadingAvatar || deletingAvatar}
                  onChange={handleAvatarChange}
                />
              </label>

              <button
                type="button"
                onClick={handleDeleteAvatar}
                disabled={
                  !me?.avatar_path || uploadingAvatar || deletingAvatar
                }
                className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-400 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {deletingAvatar ? "ì­ì  ì¤..." : "ì¬ì§ ì­ì "}
              </button>
            </div>
          </div>

          <label className="mt-6 block text-sm font-semibold">ëë¤ì</label>

          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={20}
            placeholder="ëë¤ì"
            className="mt-2 w-full rounded-2xl border border-pink-100 bg-[#fff8fb] px-4 py-4 outline-none transition focus:border-pink-400"
          />

          <div className="mt-2 flex justify-end">
            <p className="text-xs text-gray-400">{nickname.length} / 20</p>
          </div>

          <button
            type="submit"
            disabled={savingNickname}
            className="mt-3 w-full rounded-2xl border border-pink-200 bg-white px-5 py-4 font-semibold text-pink-500 transition hover:bg-pink-50 disabled:opacity-50"
          >
            {savingNickname ? "ë³ê²½ ì¤..." : "ëë¤ì ë³ê²½"}
          </button>
        </form>

        <section className="mt-5 rounded-3xl bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-pink-50 text-xl">
              â¡
            </div>
            <div>
              <h2 className="font-bold">ìëë°©</h2>
              <p className="mt-1 text-sm text-gray-400">ì°ê²°ë íí¸ë ì ë³´</p>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-4 rounded-2xl bg-[#fff8fb] px-4 py-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white text-2xl shadow-sm">
              {partner?.avatar_url ? (
                <img
                  src={partner.avatar_url}
                  alt={`${partner.nickname} íë¡í ì¬ì§`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span>â¡</span>
              )}
            </div>

            <div>
              <p className="text-xs text-gray-400">ëë¤ì</p>
              <p className="mt-1 font-bold">{partner?.nickname ?? "íí¸ë"}</p>
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-3xl bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-pink-50 text-xl">
              ð
            </div>
            <div>
              <h2 className="font-bold">ì»¤í ì ë³´</h2>
              <p className="mt-1 text-sm text-gray-400">íì¬ ì°ê²°ë ì°ë¦¬ ì ë³´</p>
            </div>
          </div>

          <div className="mt-5 rounded-2xl bg-[#fff8fb] px-4 py-5 text-center">
            <p className="text-xs text-gray-400">ì´ë ì½ë</p>
            <p className="mt-2 text-xl font-bold tracking-[0.2em]">
              {couple?.invite_code ?? "-"}
            </p>
          </div>
        </section>

        {message && (
          <div className="mt-5 rounded-2xl bg-white px-4 py-3 text-center text-sm text-gray-600 shadow-sm">
            {message}
          </div>
        )}

        <section className="mt-5 rounded-3xl bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-50 text-xl">
              ðª
            </div>
            <div>
              <h2 className="font-bold">ê³ì </h2>
              <p className="mt-1 text-sm text-gray-400">
                íì¬ ê³ì ìì ë¡ê·¸ììí´ì.
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={loggingOut}
            onClick={handleLogout}
            className="mt-5 w-full rounded-2xl border border-gray-200 bg-white px-5 py-4 font-semibold text-gray-500 transition hover:bg-gray-50 disabled:opacity-50"
          >
            {loggingOut ? "ë¡ê·¸ìì ì¤..." : "ë¡ê·¸ìì"}
          </button>
        </section>

        <section className="mt-5 rounded-3xl border border-red-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-xl">
              â ï¸
            </div>

            <div>
              <h2 className="font-bold text-red-500">íì íí´</h2>
              <p className="mt-1 text-sm leading-6 text-gray-400">
                ê³ì ê³¼ ë´ ê°ì¸ ë°ì´í°ë¥¼ ì­ì í´ì.
                <br />
                íí´ íìë ëëë¦´ ì ìì´ì.
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-red-50/60 px-4 py-4 text-sm leading-6 text-red-400">
            ìëë°©ì´ ë¨ì ìì¼ë©´ ëì ê³µê°ê³¼ ê³µë ê¸°ë¡ì ì ì§ëê³ ,
            ë´ ê³ì ê³¼ ë´ ê°ì¸ ë°ì´í°ë§ ì ë¦¬ë¼ì.
          </div>

          <button
            type="button"
            disabled={deletingAccount || loggingOut}
            onClick={handleDeleteAccount}
            className="mt-4 w-full rounded-2xl border border-red-200 bg-white px-5 py-4 font-semibold text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {deletingAccount ? "íì íí´ ì²ë¦¬ ì¤..." : "íì íí´"}
          </button>
        </section>

        <BottomNav />
      </div>
    </main>
  );
}
