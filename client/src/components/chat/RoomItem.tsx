import type { ChatRoom } from '@/types';

const TYPE_ICON: Record<string, string> = {
  self: '🔔',
  relay: '📱',
  group: '👥',
};

interface Props {
  room: ChatRoom;
  isActive: boolean;
  onClick: () => void;
}

export default function RoomItem({ room, isActive, onClick }: Props) {
  const initial = room.name[0] ?? '?';
  const icon = TYPE_ICON[room.type];

  const formatTime = (iso?: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
      return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' });
  };

  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition ${
        isActive
          ? 'bg-kakao-sidebar-active'
          : 'hover:bg-kakao-sidebar-hover'
      }`}
    >
      {/* 아바타 */}
      <div className="relative flex-shrink-0">
        {room.profile_image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={room.profile_image}
            alt={room.name}
            className="h-11 w-11 rounded-[14px] object-cover"
          />
        ) : (
          <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-gradient-to-br from-kakao-yellow to-yellow-400 text-base font-bold text-kakao-brown">
            {icon ?? initial}
          </div>
        )}
        {room.unread_count > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {room.unread_count > 99 ? '99+' : room.unread_count}
          </span>
        )}
      </div>

      {/* 텍스트 */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-baseline justify-between gap-1">
          <p className="truncate text-sm font-semibold text-gray-100">
            {room.name}
          </p>
          <span className="flex-shrink-0 text-[10px] text-gray-500">
            {formatTime(room.last_message_at)}
          </span>
        </div>
        <p className="truncate text-xs text-gray-400">
          {room.last_message ?? '대화를 시작해보세요'}
        </p>
      </div>
    </button>
  );
}
