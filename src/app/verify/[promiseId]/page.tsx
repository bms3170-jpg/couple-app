"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useParams,
  useRouter,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/client";

import {
  useAuth,
} from "@/components/AuthProvider";

type PromiseInfo = {
  id: string;
  couple_id: string;
  title: string;
  assigned_to: string;
  is_joint: boolean;
  photo_required: boolean;
  partner_approval_required: boolean;
};

type ExistingVerification = {
  id: string;
  photo_path: string | null;
  message: string | null;
  status:
    | "pending"
    | "approved"
    | "rejected";
  rejection_reason: string | null;
};

export default function VerifyPage() {
  const router = useRouter();

  const params =
    useParams<{
      promiseId: string;
    }>();

  const supabase =
    useMemo(
      () => createClient(),
      []
    );

  const {
    user,
    loading: authLoading,
  } = useAuth();

  const promiseId =
    params.promiseId;

  const [
    promise,
    setPromise,
  ] =
    useState<PromiseInfo | null>(
      null
    );

  const [
    existingVerification,
    setExistingVerification,
  ] =
    useState<ExistingVerification | null>(
      null
    );

  const [
    nickname,
    setNickname,
  ] = useState("");

  const [
    file,
    setFile,
  ] =
    useState<File | null>(
      null
    );

  const [
    previewUrl,
    setPreviewUrl,
  ] = useState("");

  const [
    photoMenuOpen,
    setPhotoMenuOpen,
  ] = useState(false);

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    notice,
    setNotice,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    uploading,
    setUploading,
  ] = useState(false);

  const today =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          "Asia/Seoul",

        year:
          "numeric",

        month:
          "2-digit",

        day:
          "2-digit",
      }
    ).format(
      new Date()
    );

  // =========================================
  // 페이지 정보 불러오기
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

    async function loadPage() {
      const {
        data:
          promiseData,

        error:
          promiseError,
      } =
        await supabase
          .from(
            "promises"
          )
          .select(`
            id,
            couple_id,
            title,
            assigned_to,
            is_joint,
            photo_required,
            partner_approval_required
          `)
          .eq(
            "id",
            promiseId
          )
          .maybeSingle();

      if (cancelled) {
        return;
      }

      if (
        promiseError ||
        !promiseData
      ) {
        console.error(
          "약속 조회 오류:",
          promiseError
        );

        setNotice(
          "약속을 찾을 수 없어요."
        );

        setLoading(
          false
        );

        return;
      }

      // =====================================
      // 인증 권한 확인
      // =====================================

      if (
        promiseData.is_joint
      ) {
        const {
          data:
            currentMember,

          error:
            memberError,
        } =
          await supabase
            .from(
              "couple_members"
            )
            .select(
              "user_id"
            )
            .eq(
              "couple_id",
              promiseData.couple_id
            )
            .eq(
              "user_id",
              currentUser.id
            )
            .maybeSingle();

        if (
          cancelled
        ) {
          return;
        }

        if (
          memberError ||
          !currentMember
        ) {
          console.error(
            "공동 약속 인증 권한 확인 오류:",
            memberError
          );

          setNotice(
            "이 공동 약속을 인증할 권한이 없어요."
          );

          setLoading(
            false
          );

          return;
        }
      } else if (
        promiseData.assigned_to !==
        currentUser.id
      ) {
        setNotice(
          "이 약속은 담당자만 인증할 수 있어요."
        );

        setLoading(
          false
        );

        return;
      }

      // =====================================
      // 닉네임 조회
      // =====================================

      const {
        data:
          profile,

        error:
          profileError,
      } =
        await supabase
          .from(
            "profiles"
          )
          .select(
            "nickname"
          )
          .eq(
            "id",
            currentUser.id
          )
          .maybeSingle();

      if (cancelled) {
        return;
      }

      if (
        profileError
      ) {
        console.error(
          "프로필 조회 오류:",
          profileError
        );
      }

      // =====================================
      // 오늘 내 인증 확인
      // =====================================

      const {
        data:
          verificationData,

        error:
          verificationError,
      } =
        await supabase
          .from(
            "verifications"
          )
          .select(`
            id,
            photo_path,
            message,
            status,
            rejection_reason
          `)
          .eq(
            "promise_id",
            promiseData.id
          )
          .eq(
            "user_id",
            currentUser.id
          )
          .eq(
            "verification_date",
            today
          )
          .maybeSingle();

      if (cancelled) {
        return;
      }

      if (
        verificationError
      ) {
        console.error(
          "오늘 인증 조회 오류:",
          verificationError
        );
      }

      const existing =
        verificationData as
          | ExistingVerification
          | null;

      // pending 또는 approved 상태면
      // 중복 인증 화면으로 들어오지 못하게 함
      if (
        existing &&
        existing.status !==
          "rejected"
      ) {
        router.replace(
          "/couple"
        );

        return;
      }

      // 반려된 인증이면
      // 이전 내용과 반려 이유 표시
      if (
        existing?.status ===
        "rejected"
      ) {
        setExistingVerification(
          existing
        );

        setMessage(
          existing.message ??
            ""
        );

        setNotice(
          existing.rejection_reason
            ? `반려 이유: ${existing.rejection_reason}`
            : "인증이 반려되었어요. 수정해서 다시 인증해주세요."
        );
      }

      setNickname(
        profile?.nickname ??
          ""
      );

      setPromise(
        promiseData as PromiseInfo
      );

      setLoading(
        false
      );
    }

    loadPage();

    return () => {
      cancelled =
        true;
    };
  }, [
    authLoading,
    user,
    promiseId,
    router,
    supabase,
    today,
  ]);

  // =========================================
  // 미리보기 URL 정리
  // =========================================

  useEffect(() => {
    return () => {
      if (
        previewUrl
      ) {
        URL.revokeObjectURL(
          previewUrl
        );
      }
    };
  }, [
    previewUrl,
  ]);

  // =========================================
  // 사진 선택
  // =========================================

  function handleFileChange(
    e:
      ChangeEvent<HTMLInputElement>
  ) {
    const selectedFile =
      e.target.files?.[0];

    e.target.value =
      "";

    if (
      !selectedFile
    ) {
      return;
    }

    if (
      !selectedFile.type.startsWith(
        "image/"
      )
    ) {
      setNotice(
        "사진 파일만 선택할 수 있어요."
      );

      return;
    }

    if (
      selectedFile.size >
      6 *
        1024 *
        1024
    ) {
      setNotice(
        "사진은 6MB 이하로 선택해주세요."
      );

      return;
    }

    if (
      previewUrl
    ) {
      URL.revokeObjectURL(
        previewUrl
      );
    }

    const newPreviewUrl =
      URL.createObjectURL(
        selectedFile
      );

    setFile(
      selectedFile
    );

    setPreviewUrl(
      newPreviewUrl
    );

    setNotice("");

    setPhotoMenuOpen(
      false
    );
  }

  // =========================================
  // 사진 보관함 열기
  // =========================================

  function openGalleryPicker() {
    setPhotoMenuOpen(
      false
    );

    window.setTimeout(
      () => {
        document
          .getElementById(
            "gallery-photo-input"
          )
          ?.click();
      },
      50
    );
  }

  // =========================================
  // 카메라 열기
  // =========================================

  function openCameraPicker() {
    setPhotoMenuOpen(
      false
    );

    window.setTimeout(
      () => {
        document
          .getElementById(
            "camera-photo-input"
          )
          ?.click();
      },
      50
    );
  }

  // =========================================
  // 인증 제출
  // =========================================

  async function handleSubmit(
    e: FormEvent
  ) {
    e.preventDefault();

    if (!promise) {
      return;
    }

    if (!user) {
      router.replace(
        "/login"
      );

      return;
    }

    // 새 인증은 사진 필수
    // 반려 후 재인증은 기존 사진이 있으면
    // 사진을 다시 선택하지 않아도 제출 가능
    if (
      promise.photo_required &&
      !file &&
      !existingVerification?.photo_path
    ) {
      setNotice(
        "인증 사진을 선택해주세요."
      );

      return;
    }

    const currentUser =
      user;

    setUploading(
      true
    );

    setNotice("");

    let photoPath =
      existingVerification?.photo_path ??
      null;

    let uploadedNewPhotoPath:
      | string
      | null =
        null;

    // =====================================
    // 새 사진 업로드
    // =====================================

    if (file) {
      const extension =
        file.name
          .split(".")
          .pop()
          ?.toLowerCase() ||
        "jpg";

      const fileName =
        `${Date.now()}-${crypto.randomUUID()}.${extension}`;

      uploadedNewPhotoPath =
        `${promise.couple_id}/${currentUser.id}/${fileName}`;

      const {
        error:
          uploadError,
      } =
        await supabase.storage
          .from(
            "verification-images"
          )
          .upload(
            uploadedNewPhotoPath,
            file,
            {
              cacheControl:
                "3600",

              upsert:
                false,

              contentType:
                file.type,
            }
          );

      if (
        uploadError
      ) {
        console.error(
          "사진 업로드 오류:",
          uploadError
        );

        setNotice(
          `사진 업로드에 실패했어요: ${uploadError.message}`
        );

        setUploading(
          false
        );

        return;
      }

      photoPath =
        uploadedNewPhotoPath;
    }

    // =====================================
    // 인증 상태
    // =====================================

    const status =
      promise.partner_approval_required
        ? "pending"
        : "approved";

    let insertedVerification:
      | {
          id: string;
          created_at: string;
          status: string;
        }
      | null =
        null;

    let verificationError:
      | {
          message: string;
          code?: string;
        }
      | null =
        null;

    // =====================================
    // 반려된 인증은 기존 row 업데이트
    // =====================================

    if (
      existingVerification?.status ===
      "rejected"
    ) {
      const {
        data,
        error,
      } =
        await supabase
          .from(
            "verifications"
          )
          .update({
            photo_path:
              photoPath,

            message:
              message.trim() ||
              null,

            status,

            reviewed_by:
              promise.partner_approval_required
                ? null
                : currentUser.id,

            reviewed_at:
              promise.partner_approval_required
                ? null
                : new Date().toISOString(),

            rejection_reason:
              null,
          })
          .eq(
            "id",
            existingVerification.id
          )
          .select(`
            id,
            created_at,
            status
          `)
          .single();

      insertedVerification =
        data;

      verificationError =
        error;
    } else {

      // =====================================
      // 첫 인증은 새 row 생성
      // =====================================

      const {
        data,
        error,
      } =
        await supabase
          .from(
            "verifications"
          )
          .insert({
            couple_id:
              promise.couple_id,

            promise_id:
              promise.id,

            user_id:
              currentUser.id,

            verification_date:
              today,

            photo_path:
              photoPath,

            message:
              message.trim() ||
              null,

            status,

            reviewed_by:
              promise.partner_approval_required
                ? null
                : currentUser.id,

            reviewed_at:
              promise.partner_approval_required
                ? null
                : new Date().toISOString(),
          })
          .select(`
            id,
            created_at,
            status
          `)
          .single();

      insertedVerification =
        data;

      verificationError =
        error;
    }

    // =====================================
    // 인증 저장 오류
    // =====================================

    if (
      verificationError
    ) {
      console.error(
        "인증 저장 오류:",
        verificationError
      );

      if (
        uploadedNewPhotoPath
      ) {
        await supabase.storage
          .from(
            "verification-images"
          )
          .remove([
            uploadedNewPhotoPath,
          ]);
      }

      setNotice(
        `인증 저장에 실패했어요: ${verificationError.message}`
      );

      setUploading(
        false
      );

      return;
    }

    // =====================================
    // 새 사진으로 교체했다면
    // 기존 반려 사진 삭제
    // =====================================

    if (
      uploadedNewPhotoPath &&
      existingVerification?.photo_path &&
      existingVerification.photo_path !==
        uploadedNewPhotoPath
    ) {
      await supabase.storage
        .from(
          "verification-images"
        )
        .remove([
          existingVerification.photo_path,
        ]);
    }
    // =====================================
    // 상대 확인이 필요 없는 경우
    // 첫 성공 인증이면 타임라인 자동 등록
    // =====================================

    if (
      status ===
        "approved" &&
      insertedVerification
    ) {
      const {
        data:
          firstApproved,

        error:
          firstApprovedError,
      } =
        await supabase
          .from(
            "verifications"
          )
          .select(`
            id,
            created_at
          `)
          .eq(
            "couple_id",
            promise.couple_id
          )
          .eq(
            "promise_id",
            promise.id
          )
          .eq(
            "status",
            "approved"
          )
          .order(
            "created_at",
            {
              ascending:
                true,
            }
          )
          .limit(1)
          .maybeSingle();

      if (
        firstApprovedError
      ) {
        console.error(
          "첫 인증 확인 오류:",
          firstApprovedError
        );
      } else if (
        firstApproved?.id ===
        insertedVerification.id
      ) {
        const {
          error:
            timelineError,
        } =
          await supabase
            .from(
              "couple_timeline_events"
            )
            .insert({
              couple_id:
                promise.couple_id,

              user_id:
                currentUser.id,

              event_type:
                "first_verification",

              title:
                "📸 첫 인증을 성공했어요",

              description:
                message.trim()
                  ? `${promise.title} · ${message.trim()}`
                  : promise.title,

              related_id:
                insertedVerification.id,

              image_path:
                photoPath,

              event_date:
                insertedVerification.created_at,

              source_key:
                `first_verification:${promise.id}`,
            });

        if (
          timelineError &&
          timelineError.code !==
            "23505"
        ) {
          console.error(
            "첫 인증 타임라인 등록 오류:",
            timelineError
          );
        }
      }
    }

    setUploading(
      false
    );

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
      <main className="flex min-h-screen items-center justify-center bg-[#fff8fb]">
        <p className="text-sm text-gray-500">
          인증 화면 불러오는 중...
        </p>
      </main>
    );
  }

  // =========================================
  // 담당자가 아니거나 약속 없음
  // =========================================

  if (!promise) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fff8fb] px-5 py-10 text-[#2b2b2b]">
        <div className="w-full max-w-md">

          <section className="rounded-[34px] border border-dashed border-pink-200 bg-white/90 px-6 py-10 shadow-sm">

            <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-[32px] bg-pink-50">

              <div className="relative flex h-20 w-20 items-center justify-center rounded-[24px] bg-white text-4xl shadow-md">
                🔒

                <span className="absolute -left-5 top-1 text-xl">
                  ♡
                </span>

                <span className="absolute -right-5 bottom-1 text-xl">
                  ♡
                </span>

              </div>

            </div>

            <div className="mt-8 text-center">

              <p className="text-sm font-semibold tracking-[0.2em] text-pink-400">
                OURQUEST
              </p>

              <h1 className="mt-4 text-2xl font-bold leading-tight">
                이 약속은
                <br />

                <span className="text-pink-500">
                  약속한 사람만 인증할 수 있어요.
                </span>
              </h1>

              <div className="mx-auto mt-6 flex max-w-[220px] items-center gap-3">

                <div className="h-px flex-1 bg-pink-100" />

                <span className="text-xl text-pink-300">
                  ♡
                </span>

                <div className="h-px flex-1 bg-pink-100" />

              </div>

            </div>

            <div className="mt-7 rounded-2xl border border-pink-50 bg-white p-5 shadow-sm">

              <div className="flex items-start gap-4">

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-pink-50 text-xl">
                  🔐
                </div>

                <div>

                  <p className="font-semibold">
                    약속한 사람의 인증이 필요해요
                  </p>

                  <p className="mt-2 text-sm leading-6 text-gray-500">
                    이 약속은 지키기로 한 사람만
                    인증할 수 있어요.
                    <br />
                    상대방의 인증을 기다려주세요 ♡
                  </p>

                </div>

              </div>

            </div>

            <button
              type="button"
              onClick={() =>
                router.back()
              }
              className="mt-7 w-full rounded-2xl bg-pink-500 px-5 py-4 text-lg font-semibold text-white shadow-sm transition hover:bg-pink-600 active:scale-[0.99]"
            >
              ← 돌아가기
            </button>

          </section>

        </div>
      </main>
    );
  }

  // =========================================
  // 인증 화면
  // =========================================

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
              TODAY VERIFY
            </p>

            <h1 className="mt-2 text-3xl font-bold">
              {existingVerification?.status ===
              "rejected"
                ? "다시 인증하기"
                : "오늘 인증하기"}
            </h1>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              {promise.is_joint
                ? "둘이 함께 지키는 오늘의 퀘스트를 인증해요 ♡"
                : nickname
                ? `${nickname}님의 오늘 퀘스트를 인증해요 ♡`
                : "오늘의 퀘스트를 인증해요 ♡"}
            </p>

          </div>

          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-xl shadow-sm">
            📸
          </div>

        </div>

        {/* =====================================
            반려 안내
        ====================================== */}

        {existingVerification?.status ===
          "rejected" && (

          <section className="mt-6 rounded-[24px] border border-red-100 bg-red-50/70 p-4">

            <div className="flex items-start gap-3">

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-lg shadow-sm">
                ↻
              </div>

              <div className="min-w-0 flex-1">

                <p className="font-bold text-red-500">
                  이전 인증이 반려되었어요
                </p>

                <p className="mt-1 text-xs leading-5 text-red-400">
                  아래 내용을 확인하고 다시 인증해주세요.
                </p>

                <div className="mt-3 rounded-2xl bg-white px-4 py-3">

                  <p className="text-[10px] font-semibold tracking-[0.12em] text-gray-400">
                    반려 이유
                  </p>

                  <p className="mt-1.5 whitespace-pre-wrap break-words text-sm font-medium leading-6 text-gray-700">
                    {existingVerification.rejection_reason?.trim()
                      ? existingVerification.rejection_reason
                      : "상대방이 반려 이유를 남기지 않았어요."}
                  </p>

                </div>

              </div>

            </div>

          </section>
        )}

        {/* =====================================
            오늘 퀘스트
        ====================================== */}

        <section className="mt-7 rounded-[28px] border border-pink-100 bg-gradient-to-br from-white to-pink-50/60 p-5 shadow-sm">

          <p className="text-xs font-semibold text-pink-400">
            TODAY QUEST
          </p>

          <h2 className="mt-2 text-2xl font-bold">
            {promise.title}
          </h2>

          <div className="mt-4 flex flex-wrap gap-2">

            {promise.is_joint && (
              <span className="rounded-full border border-pink-100 bg-white px-3 py-1.5 text-[11px] font-semibold text-pink-500">
                💕 함께 지키는 약속
              </span>
            )}

            {promise.photo_required && (
              <span className="rounded-full border border-pink-100 bg-white px-3 py-1.5 text-[11px] text-pink-500">
                📷 사진 인증
              </span>
            )}

            {promise.partner_approval_required && (
              <span className="rounded-full border border-pink-100 bg-white px-3 py-1.5 text-[11px] text-pink-500">
                ♡ 상대 확인 필요
              </span>
            )}

          </div>

        </section>

        <form
          onSubmit={handleSubmit}
          className="mt-7 space-y-6"
        >

          {/* =====================================
              인증 사진
          ====================================== */}

          {promise.photo_required && (

            <div>

              <p className="mb-3 font-semibold">
                인증 사진
              </p>

              {!previewUrl ? (

                <button
                  type="button"
                  onClick={() =>
                    setPhotoMenuOpen(
                      true
                    )
                  }
                  className="flex min-h-64 w-full flex-col items-center justify-center rounded-[28px] border-2 border-dashed border-pink-200 bg-white px-6 text-center shadow-sm transition hover:bg-pink-50/50"
                >

                  <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-pink-50 text-3xl">
                    📷
                  </div>

                  <p className="mt-4 font-semibold">
                    {existingVerification?.photo_path
                      ? "새 사진으로 변경"
                      : "사진 추가"}
                  </p>

                  <p className="mt-2 text-sm leading-6 text-gray-400">
                    사진 보관함에서 선택하거나
                    <br />
                    카메라로 바로 촬영할 수 있어요.
                  </p>

                  {existingVerification?.photo_path && (
                    <p className="mt-3 text-xs font-medium text-pink-400">
                      새 사진을 고르지 않으면 기존 사진으로 다시 인증돼요.
                    </p>
                  )}

                </button>

              ) : (

                <div>

                  <div className="overflow-hidden rounded-[28px] border border-pink-100 bg-white shadow-sm">

                    <img
                      src={
                        previewUrl
                      }
                      alt="인증 사진 미리보기"
                      className="max-h-[500px] w-full object-cover"
                    />

                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setPhotoMenuOpen(
                        true
                      )
                    }
                    className="mt-3 block w-full rounded-2xl border border-pink-200 bg-white px-4 py-3 text-center font-semibold text-pink-500 shadow-sm transition hover:bg-pink-50"
                  >
                    다른 사진 선택
                  </button>

                </div>
              )}

              {/* =================================
                  사진 보관함용 input
              ================================= */}

              <input
                id="gallery-photo-input"
                type="file"
                accept="image/*"
                onChange={
                  handleFileChange
                }
                className="hidden"
              />

              {/* =================================
                  카메라용 input
              ================================= */}

              <input
                id="camera-photo-input"
                type="file"
                accept="image/*"
                capture="environment"
                onChange={
                  handleFileChange
                }
                className="hidden"
              />

              {/* =================================
                  사진 선택창
              ================================= */}

              {photoMenuOpen && (

                <div
                  className="fixed inset-0 z-[100] flex items-end justify-center bg-black/30 px-4 pb-6"
                  onClick={() =>
                    setPhotoMenuOpen(
                      false
                    )
                  }
                >

                  <div
                    className="w-full max-w-md"
                    onClick={(e) =>
                      e.stopPropagation()
                    }
                  >

                    <div className="overflow-hidden rounded-[28px] bg-white shadow-xl">

                      <div className="px-5 pb-4 pt-5 text-center">

                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-pink-50 text-2xl">
                          📸
                        </div>

                        <p className="mt-3 font-bold">
                          사진을 어떻게 추가할까요?
                        </p>

                        <p className="mt-1 text-sm text-gray-400">
                          원하는 방법을 선택해주세요.
                        </p>

                      </div>

                      <div className="border-t border-gray-100">

                        {/* 사진 보관함 */}

                        <button
                          type="button"
                          onClick={
                            openGalleryPicker
                          }
                          className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-pink-50 active:bg-pink-50"
                        >

                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-pink-50 text-xl">
                            🖼️
                          </div>

                          <div>

                            <p className="font-semibold">
                              사진 보관함
                            </p>

                            <p className="mt-1 text-xs text-gray-400">
                              저장된 사진을 선택해요.
                            </p>

                          </div>

                        </button>

                        <div className="mx-5 border-t border-gray-100" />

                        {/* 카메라 */}

                        <button
                          type="button"
                          onClick={
                            openCameraPicker
                          }
                          className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-pink-50 active:bg-pink-50"
                        >

                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-pink-50 text-xl">
                            📷
                          </div>

                          <div>

                            <p className="font-semibold">
                              카메라로 촬영
                            </p>

                            <p className="mt-1 text-xs text-gray-400">
                              지금 바로 사진을 찍어요.
                            </p>

                          </div>

                        </button>

                      </div>

                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setPhotoMenuOpen(
                          false
                        )
                      }
                      className="mt-3 w-full rounded-[22px] bg-white px-5 py-4 font-semibold text-gray-500 shadow-lg"
                    >
                      취소
                    </button>

                  </div>

                </div>
              )}

            </div>
          )}

          {/* =====================================
              오늘 한마디
          ====================================== */}

          <div>

            <label className="mb-3 block font-semibold">
              오늘 한마디
            </label>

            <textarea
              value={
                message
              }
              onChange={(e) =>
                setMessage(
                  e.target.value
                )
              }
              maxLength={300}
              rows={4}
              placeholder="예: 오늘도 성공! ♡"
              className="w-full resize-none rounded-2xl border border-pink-100 bg-white px-4 py-4 shadow-sm outline-none transition placeholder:text-gray-300 focus:border-pink-300 focus:ring-2 focus:ring-pink-100"
            />

            <p className="mt-2 text-right text-xs text-gray-400">
              {message.length} / 300
            </p>

          </div>

          {/* =====================================
              안내 메시지
          ====================================== */}

          {notice && (

            <div className="rounded-2xl border border-pink-100 bg-white px-4 py-3 text-sm leading-6 text-gray-600 shadow-sm">
              {notice}
            </div>

          )}

          {/* =====================================
              인증 제출
          ====================================== */}

          <button
            type="submit"
            disabled={
              uploading
            }
            className="w-full rounded-2xl bg-pink-500 px-5 py-4 text-lg font-semibold text-white shadow-sm transition hover:bg-pink-600 active:scale-[0.99] disabled:opacity-50"
          >
            {uploading
              ? "인증 올리는 중..."
              : existingVerification?.status ===
                "rejected"
              ? "↻ 다시 인증 보내기 ♡"
              : promise.partner_approval_required
              ? "인증 보내기 ♡"
              : "오늘 인증 완료"}
          </button>

        </form>

      </div>

    </main>
  );
}
