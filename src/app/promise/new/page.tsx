"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";

type Member = {
  user_id: string;
  profiles: {
    nickname: string | null;
  } | null;
};

export default function NewPromisePage() {
  const router = useRouter();

  const supabase = useMemo(
    () => createClient(),
    []
  );

  const {
    user,
    loading: authLoading,
  } = useAuth();

  const [members, setMembers] =
    useState<Member[]>([]);

  const [title, setTitle] =
    useState("");

  const [assignedTo, setAssignedTo] =
    useState("");

  const [isJoint, setIsJoint] =
    useState(false);

  const [repeatType, setRepeatType] =
    useState("daily");

  const [reward7, setReward7] =
    useState("");

  const [reward14, setReward14] =
    useState("");

  const [reward30, setReward30] =
    useState("");

  const [
    photoRequired,
    setPhotoRequired,
  ] = useState(true);

  const [
    partnerApprovalRequired,
    setPartnerApprovalRequired,
  ] = useState(true);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  // =========================================
  // 커플 멤버 불러오기
  // =========================================

  useEffect(() => {
    async function loadMembers() {
      if (authLoading) {
        return;
      }

      if (!user) {
        router.replace(
          "/login"
        );

        return;
      }

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
          user.id
        )
        .maybeSingle();

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

      // =====================================
      // 커플 멤버 user_id 조회
      // =====================================

      const {
        data: memberRows,
        error: memberError,
      } = await supabase
        .from("couple_members")
        .select("user_id")
        .eq(
          "couple_id",
          membership.couple_id
        );

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
          (member) =>
            member.user_id
        ) ?? [];

      // =====================================
      // 닉네임 조회
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
          "프로필 조회 오류:",
          profileError
        );

        setMessage(
          "프로필 정보를 불러오지 못했어요."
        );

        setLoading(false);
        return;
      }

      // =====================================
      // user_id + nickname 합치기
      // =====================================

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

              profiles: {
                nickname:
                  profile?.nickname ??
                  null,
              },
            };
          }
        );

      setMembers(
        loadedMembers
      );

      // 기본 담당자는 현재 로그인한 사람
      setAssignedTo(
        user.id
      );

      setLoading(false);
    }

    loadMembers();
  }, [
    router,
    supabase,
    user,
    authLoading,
  ]);

  // =========================================
  // 약속 생성
  // =========================================

  async function handleSubmit(
    e: FormEvent
  ) {
    e.preventDefault();

    if (!title.trim()) {
      setMessage(
        "약속 이름을 입력해주세요."
      );

      return;
    }

    if (!assignedTo) {
      setMessage(
        "약속을 지킬 사람을 선택해주세요."
      );

      return;
    }

    if (!user) {
      router.replace(
        "/login"
      );

      return;
    }

    setSaving(true);
    setMessage("");

    const promiseTitle =
      title.trim();

    const { error } =
      await supabase.rpc(
        "create_promise_with_rewards",
        {
          p_title:
            promiseTitle,

          p_assigned_to:
            assignedTo,

          p_repeat_type:
            repeatType,

          p_photo_required:
            photoRequired,

          p_partner_approval_required:
            partnerApprovalRequired,

          p_is_joint:
            isJoint,

          p_reward_7:
            reward7.trim() ||
            null,

          p_reward_14:
            reward14.trim() ||
            null,

          p_reward_30:
            reward30.trim() ||
            null,
        }
      );

    if (error) {
      setSaving(false);

      console.error(
        "약속 생성 오류:",
        error
      );

      setMessage(
        `약속을 만들지 못했어요: ${error.message}`
      );

      return;
    }

    // 방금 생성된 약속을 찾아 타임라인에 자동 등록
    const {
      data: membership,
      error: membershipError,
    } = await supabase
      .from("couple_members")
      .select("couple_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (
      membershipError ||
      !membership
    ) {
      setSaving(false);

      console.error(
        "약속 생성 후 커플 조회 오류:",
        membershipError
      );

      setMessage(
        "약속은 만들어졌지만 타임라인 등록을 위한 커플 정보를 찾지 못했어요."
      );

      return;
    }

    const {
      data: createdPromise,
      error: promiseLookupError,
    } = await supabase
      .from("promises")
      .select(
        "id, couple_id, title, created_at, is_joint"
      )
      .eq(
        "couple_id",
        membership.couple_id
      )
      .eq(
        "assigned_to",
        assignedTo
      )
      .eq(
        "title",
        promiseTitle
      )
      .eq(
        "is_joint",
        isJoint
      )
      .order(
        "created_at",
        { ascending: false }
      )
      .limit(1)
      .maybeSingle();

    if (
      promiseLookupError ||
      !createdPromise
    ) {
      setSaving(false);

      console.error(
        "생성된 약속 조회 오류:",
        promiseLookupError
      );

      setMessage(
        "약속은 만들어졌지만 타임라인 등록에 실패했어요."
      );

      return;
    }

    const {
      error: timelineError,
    } = await supabase
      .from(
        "couple_timeline_events"
      )
      .insert({
        couple_id:
          createdPromise.couple_id,
        user_id:
          user.id,
        event_type:
          "promise_created",
        title:
          "✅ 새로운 약속을 만들었어요",
        description:
          `“${createdPromise.title}”`,
        related_id:
          createdPromise.id,
        image_path:
          null,
        event_date:
          createdPromise.created_at,
        source_key:
          `promise_created:${createdPromise.id}`,
      });

    if (
      timelineError &&
      timelineError.code !==
        "23505"
    ) {
      console.error(
        "약속 타임라인 등록 오류:",
        timelineError
      );

      setMessage(
        `약속은 만들어졌지만 타임라인 등록에 실패했어요: ${timelineError.message}`
      );

      setSaving(false);
      return;
    }

    setSaving(false);

    router.push(
      "/couple"
    );

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
      <main className="min-h-screen bg-[#fff8fb] px-6 py-10">
        <div className="mx-auto max-w-md text-gray-500">
          불러오는 중...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fff8fb] text-[#2b2b2b]">

      <div className="mx-auto min-h-screen max-w-md px-6 py-8">

        <button
          type="button"
          onClick={() =>
            router.back()
          }
          className="mb-8 text-sm font-semibold text-gray-500"
        >
          ← 돌아가기
        </button>

        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-pink-400">
              NEW PROMISE
            </p>

            <h1 className="mt-2 text-3xl font-bold">
              새 약속 만들기
            </h1>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              우리 둘이 함께 지켜갈 새로운 약속을 만들어보세요 ♡
            </p>
          </div>

          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-xl shadow-sm">
            ✅
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-7"
        >

          {/* =====================================
              약속 이름
          ====================================== */}

          <div>

            <label className="mb-2 block font-semibold">
              약속 이름
            </label>

            <input
              type="text"
              value={title}
              onChange={(e) =>
                setTitle(
                  e.target.value
                )
              }
              maxLength={50}
              placeholder="예: 술 안 마시기"
              className="w-full rounded-2xl border border-pink-100 bg-white px-4 py-4 shadow-sm outline-none transition placeholder:text-gray-300 focus:border-pink-300 focus:ring-2 focus:ring-pink-100"
            />

          </div>

          {/* =====================================
              담당자
          ====================================== */}

          <div>

            <p className="mb-3 font-semibold">
              누가 지킬까요?
            </p>

            <div className="grid grid-cols-3 gap-2">

              {members.map(
                (member) => {

                  const selected =
                    !isJoint &&
                    assignedTo ===
                      member.user_id;

                  return (
                    <button
                      key={
                        member.user_id
                      }
                      type="button"
                      onClick={() => {
                        setIsJoint(false);

                        setAssignedTo(
                          member.user_id
                        );
                      }}
                      className={`rounded-2xl border px-3 py-4 text-sm font-semibold transition ${
                        selected
                          ? "border-pink-400 bg-pink-500 text-white shadow-sm"
                          : "border-pink-100 bg-white text-gray-600 shadow-sm hover:bg-pink-50"
                      }`}
                    >
                      {member
                        .profiles
                        ?.nickname ??
                        "이름 없음"}
                    </button>
                  );
                }
              )}

              <button
                type="button"
                onClick={() => {
                  setIsJoint(true);

                  if (user?.id) {
                    setAssignedTo(
                      user.id
                    );
                  }
                }}
                className={`rounded-2xl border px-3 py-4 text-sm font-semibold transition ${
                  isJoint
                    ? "border-pink-400 bg-pink-500 text-white shadow-sm"
                    : "border-pink-100 bg-white text-gray-600 shadow-sm hover:bg-pink-50"
                }`}
              >
                💕 서로
              </button>

            </div>

            {isJoint && (
              <div className="mt-3 rounded-2xl border border-pink-100 bg-pink-50/60 px-4 py-3 text-xs leading-5 text-pink-500">
                둘이 함께 지키는 약속이에요. 두 사람 모두 인증할 수 있게 다음 단계에서 인증 권한도 연결해요 ♡
              </div>
            )}

          </div>

          {/* =====================================
              반복 설정
          ====================================== */}

          <div>

            <p className="mb-3 font-semibold">
              얼마나 자주 지킬까요?
            </p>

            <div className="space-y-3">

              <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-pink-100 bg-white px-4 py-4 shadow-sm transition hover:bg-pink-50">

                <input
                  type="radio"
                  name="repeat"
                  checked={
                    repeatType ===
                    "daily"
                  }
                  onChange={() =>
                    setRepeatType(
                      "daily"
                    )
                  }
                />

                <span>
                  매일
                </span>

              </label>

              <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-pink-100 bg-white px-4 py-4 shadow-sm transition hover:bg-pink-50">

                <input
                  type="radio"
                  name="repeat"
                  checked={
                    repeatType ===
                    "weekdays"
                  }
                  onChange={() =>
                    setRepeatType(
                      "weekdays"
                    )
                  }
                />

                <span>
                  평일 (월~금)
                </span>

              </label>

            </div>

          </div>

          {/* =====================================
              인증 설정
          ====================================== */}

          <div>

            <p className="mb-3 font-semibold">
              인증 방법
            </p>

            <div className="space-y-3">

              <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-pink-100 bg-white px-4 py-4 shadow-sm transition hover:bg-pink-50">

                <div>

                  <p className="font-semibold">
                    📷 사진 인증
                  </p>

                  <p className="mt-1 text-sm text-gray-400">
                    사진을 올려 약속을 인증해요.
                  </p>

                </div>

                <input
                  type="checkbox"
                  checked={
                    photoRequired
                  }
                  onChange={(e) =>
                    setPhotoRequired(
                      e.target.checked
                    )
                  }
                />

              </label>

              <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-pink-100 bg-white px-4 py-4 shadow-sm transition hover:bg-pink-50">

                <div>

                  <p className="font-semibold">
                    ♡ 상대방 확인
                  </p>

                  <p className="mt-1 text-sm text-gray-400">
                    파트너가 인증을 확인해요.
                  </p>

                </div>

                <input
                  type="checkbox"
                  checked={
                    partnerApprovalRequired
                  }
                  onChange={(e) =>
                    setPartnerApprovalRequired(
                      e.target.checked
                    )
                  }
                />

              </label>

            </div>

          </div>

          {/* =====================================
              보상 설정
          ====================================== */}

          <div>

            <div className="mb-3">

              <p className="font-semibold">
                🎁 달성 보상
              </p>

              <p className="mt-1 text-sm leading-6 text-gray-400">
                꼭 전부 입력할 필요는 없어요.
                <br />
                달성했을 때 받고 싶은 보상을 자유롭게 정해보세요.
              </p>

            </div>

            <div className="space-y-4">

              {/* 7일 */}

              <div className="rounded-[24px] border border-pink-100 bg-white p-4 shadow-sm">

                <div className="flex items-center gap-3">

                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-pink-50 font-bold text-pink-500">
                    7
                  </div>

                  <div>

                    <p className="font-semibold">
                      7일 달성
                    </p>

                    <p className="text-xs text-gray-400">
                      첫 번째 보상
                    </p>

                  </div>

                </div>

                <input
                  type="text"
                  value={reward7}
                  onChange={(e) =>
                    setReward7(
                      e.target.value
                    )
                  }
                  maxLength={100}
                  placeholder="예: 소원권 1장"
                  className="mt-4 w-full rounded-2xl border border-pink-50 bg-[#fff8fb] px-4 py-3 outline-none transition placeholder:text-gray-300 focus:border-pink-200 focus:ring-2 focus:ring-pink-100"
                />

              </div>

              {/* 14일 */}

              <div className="rounded-[24px] border border-pink-100 bg-white p-4 shadow-sm">

                <div className="flex items-center gap-3">

                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-pink-50 font-bold text-pink-500">
                    14
                  </div>

                  <div>

                    <p className="font-semibold">
                      14일 달성
                    </p>

                    <p className="text-xs text-gray-400">
                      두 번째 보상
                    </p>

                  </div>

                </div>

                <input
                  type="text"
                  value={
                    reward14
                  }
                  onChange={(e) =>
                    setReward14(
                      e.target.value
                    )
                  }
                  maxLength={100}
                  placeholder="예: 먹고 싶은 거 사주기"
                  className="mt-4 w-full rounded-2xl border border-pink-50 bg-[#fff8fb] px-4 py-3 outline-none transition placeholder:text-gray-300 focus:border-pink-200 focus:ring-2 focus:ring-pink-100"
                />

              </div>

              {/* 30일 */}

              <div className="rounded-[24px] border border-pink-100 bg-white p-4 shadow-sm">

                <div className="flex items-center gap-3">

                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-pink-50 font-bold text-pink-500">
                    30
                  </div>

                  <div>

                    <p className="font-semibold">
                      30일 달성
                    </p>

                    <p className="text-xs text-gray-400">
                      큰 보상
                    </p>

                  </div>

                </div>

                <input
                  type="text"
                  value={
                    reward30
                  }
                  onChange={(e) =>
                    setReward30(
                      e.target.value
                    )
                  }
                  maxLength={100}
                  placeholder="예: 데이트 코스 정하기"
                  className="mt-4 w-full rounded-2xl border border-pink-50 bg-[#fff8fb] px-4 py-3 outline-none transition placeholder:text-gray-300 focus:border-pink-200 focus:ring-2 focus:ring-pink-100"
                />

              </div>

            </div>

          </div>

          {/* =====================================
              메시지
          ====================================== */}

          {message && (

            <div className="rounded-2xl border border-pink-100 bg-white px-4 py-3 text-sm text-gray-600 shadow-sm">
              {message}
            </div>

          )}

          {/* =====================================
              저장
          ====================================== */}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-2xl bg-pink-500 px-5 py-4 text-lg font-semibold text-white shadow-sm transition hover:bg-pink-600 active:scale-[0.99] disabled:opacity-50"
          >
            {saving
              ? "만드는 중..."
              : "약속 만들기"}
          </button>

        </form>

      </div>

    </main>
  );
}