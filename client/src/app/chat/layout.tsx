'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { authApi, messagesApi } from '@/lib/api';
import { useChatStore } from '@/stores/useChatStore';
import { useSocket } from '@/hooks/useSocket';
import ChatSidebar from '@/components/chat/ChatSidebar';

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  // 모바일(md 미만)에서는 채팅방에 들어가 있으면 목록을 숨기고, 아니면 채팅 영역을 숨김
  const inRoom = pathname.startsWith('/chat/');
  const { setUser, setRooms, user } = useChatStore();

  useSocket();

  useEffect(() => {
    authApi
      .me()
      .then(({ data }) => {
        setUser(data);
        return messagesApi.getRooms();
      })
      .then(({ data }) => setRooms(data))
      .catch(() => router.replace('/login'));
  }, [router, setUser, setRooms]);

  if (!user) {
    return (
      <div className="flex h-dvh items-center justify-center bg-kakao-chat-bg">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-kakao-brown border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-kakao-sidebar-bg">
      <ChatSidebar className={inRoom ? 'hidden md:flex' : 'flex'} />
      <main className={`${inRoom ? 'flex' : 'hidden md:flex'} min-w-0 flex-1 flex-col overflow-hidden`}>
        {children}
      </main>
    </div>
  );
}
