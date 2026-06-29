'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
      <div className="flex h-screen items-center justify-center bg-kakao-chat-bg">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-kakao-brown border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-kakao-sidebar-bg">
      <ChatSidebar />
      <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
    </div>
  );
}
