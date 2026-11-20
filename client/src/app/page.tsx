'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { useChatStore } from '@/stores/useChatStore';
import Landing from '@/components/landing/Landing';

export default function RootPage() {
  const router = useRouter();
  const setUser = useChatStore((s) => s.setUser);
  // 로그인 전이면 로그인 화면으로 보내지 않고 서비스 소개를 보여 준다
  const [loggedOut, setLoggedOut] = useState(false);

  useEffect(() => {
    authApi
      .me()
      .then(({ data }) => {
        setUser(data);
        router.replace('/chat');
      })
      .catch(() => {
        setLoggedOut(true);
      });
  }, [router, setUser]);

  if (loggedOut) return <Landing signupHref="" accent="#FEE500" />;

  return (
    <div className="flex h-dvh items-center justify-center bg-kakao-yellow">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-kakao-brown border-t-transparent" />
        <p className="text-sm font-medium text-kakao-brown">불러오는 중...</p>
      </div>
    </div>
  );
}
