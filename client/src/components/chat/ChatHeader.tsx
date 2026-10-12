import Link from 'next/link';
import type { ChatRoom } from '@/types';

const TYPE_LABEL: Record<string, string> = {
  self: '나에게 보내기',
  direct: '직접 메시지',
  relay: '릴레이 수신',
  group: '그룹 채팅',
};

interface Props {
  room: ChatRoom;
}

export default function ChatHeader({ room }: Props) {
  return (
    <header className="flex flex-shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-3 py-3 shadow-sm md:px-5">
      <Link
        href="/chat"
        aria-label="채팅 목록으로"
        className="-ml-1 rounded-lg p-1.5 text-gray-600 transition hover:bg-gray-100 md:hidden"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </Link>
      {room.profile_image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={room.profile_image}
          alt={room.name}
          className="h-9 w-9 rounded-xl object-cover"
        />
      ) : (
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-kakao-yellow text-sm font-bold text-kakao-brown">
          {room.name[0] ?? '?'}
        </div>
      )}
      <div className="min-w-0">
        <h1 className="truncate text-sm font-semibold text-gray-900">{room.name}</h1>
        <p className="text-xs text-gray-400">{TYPE_LABEL[room.type] ?? room.type}</p>
      </div>
    </header>
  );
}
