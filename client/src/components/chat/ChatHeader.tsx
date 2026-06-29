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
    <header className="flex items-center gap-3 border-b border-gray-200 bg-white px-5 py-3 shadow-sm">
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
      <div>
        <h1 className="text-sm font-semibold text-gray-900">{room.name}</h1>
        <p className="text-xs text-gray-400">{TYPE_LABEL[room.type] ?? room.type}</p>
      </div>
    </header>
  );
}
