'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useChatStore } from '@/stores/useChatStore';
import { authApi } from '@/lib/api';
import { disconnectSocket } from '@/lib/socket';
import RoomItem from './RoomItem';

function CopyUserId({ userId }: { userId: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(userId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button
      onClick={handleCopy}
      title="Android 릴레이 앱에 입력할 유저 ID"
      className="w-full rounded-lg px-3 py-2 text-left transition hover:bg-kakao-sidebar-hover"
    >
      <p className="text-[10px] text-gray-500">유저 ID (Android 릴레이용)</p>
      <p className="mt-0.5 truncate font-mono text-xs text-gray-300">
        {copied ? '✓ 복사됨' : userId}
      </p>
    </button>
  );
}

export default function ChatSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, rooms } = useChatStore();
  const [search, setSearch] = useState('');

  const filtered = rooms.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase()),
  );

  const handleLogout = async () => {
    await authApi.logout();
    disconnectSocket();
    router.replace('/login');
  };

  const activeRoomId = pathname.split('/chat/')[1] ?? '';

  return (
    <aside className="flex w-72 flex-shrink-0 flex-col border-r border-[#2A2D38] bg-kakao-sidebar-bg">
      {/* 프로필 헤더 */}
      <div className="flex items-center gap-3 border-b border-[#2A2D38] px-4 py-3">
        <div className="relative">
          {user?.profileImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.profileImage}
              alt={user.nickname}
              className="h-9 w-9 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-kakao-yellow text-sm font-bold text-kakao-brown">
              {user?.nickname?.[0] ?? '?'}
            </div>
          )}
          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-kakao-sidebar-bg bg-green-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-semibold text-white">
            {user?.nickname}
          </p>
          <p className="text-xs text-gray-400">온라인</p>
        </div>
        <button
          onClick={handleLogout}
          title="로그아웃"
          className="rounded-lg p-1.5 text-gray-400 transition hover:bg-kakao-sidebar-hover hover:text-white"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>

      {/* 검색창 */}
      <div className="px-3 py-2">
        <div className="flex items-center gap-2 rounded-lg bg-kakao-sidebar-hover px-3 py-2">
          <svg className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="검색"
            className="w-full bg-transparent text-xs text-gray-200 placeholder-gray-500 focus:outline-none"
          />
        </div>
      </div>

      {/* 채팅방 탭 */}
      <div className="px-4 pb-1 pt-1">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
          채팅 ({filtered.length})
        </p>
      </div>

      {/* 방 목록 */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-gray-500">
            {search ? '검색 결과가 없습니다.' : '채팅방이 없습니다.'}
          </div>
        ) : (
          filtered.map((room) => (
            <RoomItem
              key={room.id}
              room={room}
              isActive={room.id === activeRoomId}
              onClick={() => router.push(`/chat/${room.id}`)}
            />
          ))
        )}
      </div>

      {/* 유저 ID (Android 릴레이용) */}
      {user?.userId && (
        <div className="border-t border-[#2A2D38] px-2 py-2">
          <CopyUserId userId={user.userId} />
        </div>
      )}
    </aside>
  );
}
