import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#fff8fb] px-5 py-10 text-[#2b2b2b]">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="text-sm font-semibold text-gray-500">
          ← 돌아가기
        </Link>

        <p className="mt-8 text-sm font-semibold tracking-[0.2em] text-pink-400">
          OURQUEST
        </p>

        <h1 className="mt-2 text-3xl font-bold">이용약관</h1>
        <p className="mt-3 text-sm leading-6 text-gray-500">
          시행일: 2026년 8월 13일
        </p>

        <div className="mt-8 space-y-7 rounded-[30px] bg-white p-6 text-sm leading-7 shadow-sm">
          <section>
            <h2 className="text-lg font-bold">제1조 목적</h2>
            <p className="mt-3 text-gray-600">
              본 약관은 OurQuest가 제공하는 커플 약속·인증·기록 및 관련 서비스의 이용 조건과 이용자와 운영자 간의 기본적인 권리·의무를 정하는 것을 목적으로 합니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">제2조 서비스 내용</h2>
            <p className="mt-3 text-gray-600">
              OurQuest는 회원가입 및 로그인, 커플 연결, 약속 생성, 사진 인증 및 상대방 확인, 연속 기록, XP·레벨·보상, 추억·타임라인, 프로필 관리 등의 기능을 제공합니다. 서비스의 세부 기능은 운영 과정에서 추가·변경 또는 종료될 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">제3조 회원가입과 계정 관리</h2>
            <p className="mt-3 text-gray-600">
              이용자는 자신이 사용할 수 있는 이메일 주소 등 정확한 정보를 사용하여 가입해야 합니다. 계정의 비밀번호와 로그인 수단을 안전하게 관리할 책임은 이용자에게 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">제4조 커플 연결 및 공동 데이터</h2>
            <p className="mt-3 text-gray-600">
              커플 연결 기능을 이용하면 연결된 두 이용자 사이에서 약속, 인증 상태, 보상, XP, 기념일 및 일부 기록이 공동으로 표시되거나 처리될 수 있습니다. 초대코드는 신뢰하는 상대에게만 공유해야 합니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">제5조 이용자의 의무</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-gray-600">
              <li>타인의 계정이나 정보를 무단으로 사용하지 않습니다.</li>
              <li>불법적인 자료, 타인의 권리를 침해하는 자료를 업로드하지 않습니다.</li>
              <li>서비스의 정상적인 운영을 방해하거나 보안 기능을 우회하지 않습니다.</li>
              <li>본인이 권리를 보유하거나 적법하게 이용할 수 있는 사진과 콘텐츠만 등록합니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold">제6조 이용자 콘텐츠</h2>
            <p className="mt-3 text-gray-600">
              이용자가 등록한 사진, 메모 및 기타 콘텐츠에 대한 권리는 원칙적으로 해당 이용자에게 있습니다. 이용자는 서비스 제공에 필요한 범위에서 해당 콘텐츠가 저장, 표시 및 연결된 상대방에게 공유되는 것에 동의합니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">제7조 서비스의 변경 및 중단</h2>
            <p className="mt-3 text-gray-600">
              시스템 점검, 장애, 외부 서비스의 변경, 운영상 필요 등의 사유로 서비스 일부가 일시적으로 중단되거나 변경될 수 있습니다. 중요한 변경이 있는 경우 가능한 범위에서 서비스 화면을 통해 안내합니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">제8조 회원 탈퇴</h2>
            <p className="mt-3 text-gray-600">
              이용자는 서비스 내 회원 탈퇴 기능을 통해 언제든 탈퇴를 요청할 수 있습니다. 탈퇴 시 해당 이용자의 계정과 개인 데이터는 원칙적으로 삭제됩니다. 다만 상대방이 계속 서비스를 이용하는 경우 공동 기록 중 상대방의 이용에 필요한 일부 정보는 유지될 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">제9조 책임의 제한</h2>
            <p className="mt-3 text-gray-600">
              OurQuest는 이용자가 직접 입력한 정보 또는 이용자 간의 약속 이행 자체를 보증하지 않습니다. 천재지변, 통신 장애, 클라우드 사업자의 장애 등 합리적으로 통제하기 어려운 사유로 발생한 서비스 중단에 대해서는 관련 법령이 허용하는 범위에서 책임이 제한될 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">제10조 개인정보 보호</h2>
            <p className="mt-3 text-gray-600">
              개인정보의 처리에 관한 사항은 별도의 개인정보처리방침을 따릅니다.
            </p>
            <Link href="/privacy" className="mt-2 inline-block font-semibold text-pink-500">
              개인정보처리방침 보기 →
            </Link>
          </section>

          <section>
            <h2 className="text-lg font-bold">제11조 약관의 변경</h2>
            <p className="mt-3 text-gray-600">
              운영자는 관련 법령을 위반하지 않는 범위에서 본 약관을 변경할 수 있으며, 중요한 변경 사항은 시행 전에 서비스 화면 등을 통해 안내합니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">제12조 문의</h2>
            <p className="mt-3 text-gray-600">
              서비스 이용 및 약관과 관련한 문의는 아래 이메일로 연락해주세요.
            </p>
            <p className="mt-2 font-semibold text-pink-500">bms3170@gmail.com</p>
          </section>
        </div>

        <p className="mt-6 text-center text-xs leading-5 text-gray-400">
          본 문서는 OurQuest의 현재 기능을 기준으로 작성된 운영용 초안입니다. 정식 공개 또는 유료 서비스 전에는 실제 운영 방식과 적용 법령에 맞는지 최종 검토해주세요.
        </p>
      </div>
    </main>
  );
}
