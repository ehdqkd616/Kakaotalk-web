export default function ChatIndexPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center chat-bg">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-[28px] bg-kakao-yellow shadow-lg">
          <svg
            viewBox="0 0 24 24"
            className="h-11 w-11 fill-kakao-brown"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M12 2C6.477 2 2 5.918 2 10.773c0 3.11 1.857 5.845 4.67 7.479l-1.19 4.337a.25.25 0 0 0 .376.272L10.5 20.17A11.38 11.38 0 0 0 12 20.25c5.523 0 10-3.918 10-8.75S17.523 2 12 2z" />
          </svg>
        </div>
        <p className="text-base font-medium text-gray-700">
          대화를 선택하세요
        </p>
        <p className="text-sm text-gray-500">
          왼쪽 목록에서 채팅방을 선택해 시작하세요
        </p>
      </div>
    </div>
  );
}
