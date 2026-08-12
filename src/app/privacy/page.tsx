import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#fff8fb] px-5 py-10 text-[#2b2b2b]">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="text-sm font-semibold text-gray-500">
          ← 돌아가기
        </Link>

        <p className="mt-8 text-sm font-semibold tracking-[0.2em] text-pink-400">
          OURQUEST
        </p>

        <h1 className="mt-2 text-3xl font-bold">개인정보처리방침</h1>
        <p className="mt-3 text-sm leading-6 text-gray-500">
          시행일: 2026년 8월 13일
        </p>

        <div className="mt-8 space-y-7 rounded-[30px] bg-white p-6 text-sm leading-7 shadow-sm">
          <section>
            <h2 className="text-lg font-bold">1. 개인정보의 처리 목적</h2>
            <p className="mt-3 text-gray-600">
              OurQuest는 회원가입 및 로그인, 커플 연결, 약속과 인증 관리,
              사진 및 추억 보관, 보상·XP·레벨 기능 제공, 회원 문의 및
              서비스 안정성 확보를 위해 필요한 범위에서 개인정보를 처리합니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">2. 처리하는 개인정보 항목</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-gray-600">
              <li>계정 정보: 이메일 주소, 인증 관련 정보</li>
              <li>프로필 정보: 닉네임, 프로필 사진</li>
              <li>커플 정보: 커플 연결 정보, 초대코드, 함께한 날짜</li>
              <li>서비스 이용 정보: 약속, 인증 상태, 인증 사진, 메모, 보상, XP, 레벨, 타임라인 및 추억 기록</li>
              <li>기술 정보: 서비스 이용 중 생성되는 접속·오류 기록 등 운영에 필요한 정보</li>
            </ul>
            <p className="mt-3 text-gray-500">
              비밀번호는 인증 서비스에서 보호된 방식으로 처리되며 운영자가 평문 비밀번호를 확인하는 방식으로 저장하지 않습니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">3. 개인정보의 처리 및 보유 기간</h2>
            <p className="mt-3 text-gray-600">
              개인정보는 회원이 서비스를 이용하는 동안 보유·이용하며, 회원 탈퇴 시 원칙적으로 해당 회원의 계정 및 개인 데이터를 지체 없이 삭제합니다. 다만 관계 법령에 따라 보존할 의무가 있는 정보가 있는 경우에는 해당 기간 동안 별도로 보관할 수 있습니다.
            </p>
            <p className="mt-3 text-gray-600">
              커플 서비스 특성상 한 명만 탈퇴하고 상대방이 남아 있는 경우, 상대방에게 필요한 공동 공간 및 공동 기록의 일부는 서비스 제공을 위해 유지될 수 있습니다. 탈퇴 회원을 직접 식별하는 프로필 정보는 삭제 또는 분리 처리합니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">4. 개인정보의 제3자 제공</h2>
            <p className="mt-3 text-gray-600">
              OurQuest는 원칙적으로 이용자의 개인정보를 제3자에게 판매하거나 임의로 제공하지 않습니다. 다만 법령에 따른 요청이 있거나 이용자가 별도로 동의한 경우에는 예외로 할 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">5. 개인정보 처리업무의 위탁 및 서비스 제공자</h2>
            <p className="mt-3 text-gray-600">
              OurQuest는 서비스 제공을 위해 클라우드 및 인증·데이터베이스 서비스를 이용합니다.
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-gray-600">
              <li>Supabase: 회원 인증, 데이터베이스, 파일 저장 등</li>
              <li>Vercel: 웹 애플리케이션 호스팅 및 배포 등</li>
            </ul>
            <p className="mt-3 text-gray-500">
              ※ 실제 서버 지역 및 국외 이전 여부는 운영 중인 Supabase/Vercel 프로젝트 설정에 따라 달라질 수 있습니다. 정식 공개 전 실제 설정을 확인하여 국외 이전에 해당하는 경우 이전 국가, 항목, 목적, 보유기간, 이전 방법 등을 이 방침에 추가해야 합니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">6. 개인정보의 파기</h2>
            <p className="mt-3 text-gray-600">
              보유기간이 끝나거나 처리 목적이 달성된 개인정보는 복구 또는 재생이 어렵도록 삭제합니다. 전자적 파일은 데이터베이스 및 저장소에서 삭제하고, 별도 문서가 존재하는 경우 관련 기준에 따라 안전하게 파기합니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">7. 이용자의 권리</h2>
            <p className="mt-3 text-gray-600">
              이용자는 자신의 개인정보에 대해 열람, 정정, 삭제 및 처리정지를 요청할 수 있으며, 서비스 내 설정에서 가능한 항목은 직접 수정할 수 있습니다. 회원 탈퇴 기능을 통해 계정 삭제를 요청할 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">8. 개인정보의 안전성 확보 조치</h2>
            <p className="mt-3 text-gray-600">
              OurQuest는 접근 권한 관리, 인증된 사용자에 대한 데이터 접근 제한, 비공개 저장소 및 서명 URL 등 서비스 구조에 맞는 기술적·관리적 보호조치를 적용하기 위해 노력합니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">9. 개인정보 관련 문의</h2>
            <p className="mt-3 text-gray-600">
              개인정보 처리와 관련한 문의, 열람·정정·삭제 요청은 아래 이메일로 연락할 수 있습니다.
            </p>
            <p className="mt-2 font-semibold text-pink-500">bms3170@gmail.com</p>
          </section>

          <section>
            <h2 className="text-lg font-bold">10. 개인정보처리방침의 변경</h2>
            <p className="mt-3 text-gray-600">
              본 방침의 내용이 변경되는 경우 서비스 화면 등을 통해 변경 내용과 시행일을 안내합니다.
            </p>
          </section>
        </div>

        <p className="mt-6 text-center text-xs leading-5 text-gray-400">
          본 문서는 OurQuest의 현재 기능을 기준으로 작성된 운영용 초안입니다. 실제 공개·상용 서비스 전에는 실제 데이터 처리 구조와 서버 지역, 적용 법령에 맞는지 최종 확인해주세요.
        </p>
      </div>
    </main>
  );
}
