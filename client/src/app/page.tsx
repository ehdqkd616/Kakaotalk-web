'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { useChatStore } from '@/stores/useChatStore';

export default function RootPage() {
  const router = useRouter();
  const setUser = useChatStore((s) => s.setUser);

  useEffect(() => {
    authApi
      .me()
      .then(({ data }) => {
        setUser(data);
        router.replace('/chat');
      })
      .catch(() => {
        router.replace('/login');
      });
  }, [router, setUser]);

  return (
    <div className="flex h-screen items-center justify-center bg-kakao-yellow">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-kakao-brown border-t-transparent" />
        <p className="text-sm font-medium text-kakao-brown">불러오는 중...</p>
      </div>
    </div>
  );
}
