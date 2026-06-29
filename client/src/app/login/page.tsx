'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authApi } from '@/lib/api';

const ERROR_MESSAGES: Record<string, string> = {
  access_denied: '카카오 로그인이 취소되었습니다.',
  server_error: '서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
};

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const errorCode = params.get('error');

  useEffect(() => {
    authApi
      .me()
      .then(() => router.replace('/chat'))
      .catch(() => {});
  }, [router]);

  const handleLogin = () => {
    window.location.href = authApi.loginUrl();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-kakao-yellow to-yellow-300">
      <div className="w-full max-w-sm rounded-2xl bg-white px-8 py-10 shadow-2xl">
        {/* 로고 */}
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-[28px] bg-kakao-yellow shadow-md">
            <svg
              viewBox="0 0 24 24"
              className="h-11 w-11 fill-kakao-brown"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 2C6.477 2 2 5.918 2 10.773c0 3.11 1.857 5.845 4.67 7.479l-1.19 4.337a.25.25 0 0 0 .376.272L10.5 20.17A11.38 11.38 0 0 0 12 20.25c5.523 0 10-3.918 10-8.75S17.523 2 12 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">KakaoTalk Web</h1>
          <p className="mt-1 text-sm text-gray-500">
            카카오 계정으로 웹에서 이용하세요
          </p>
        </div>

        {/* 에러 메시지 */}
        {errorCode && ERROR_MESSAGES[errorCode] && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
            {ERROR_MESSAGES[errorCode]}
          </div>
        )}

        {/* 카카오 로그인 버튼 */}
        <button
          onClick={handleLogin}
          className="flex w-full items-center justify-center gap-3 rounded-xl bg-kakao-yellow py-3.5 text-sm font-semibold text-kakao-brown transition hover:brightness-95 active:scale-[0.98]"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5 fill-kakao-brown"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M12 2C6.477 2 2 5.918 2 10.773c0 3.11 1.857 5.845 4.67 7.479l-1.19 4.337a.25.25 0 0 0 .376.272L10.5 20.17A11.38 11.38 0 0 0 12 20.25c5.523 0 10-3.918 10-8.75S17.523 2 12 2z" />
          </svg>
          카카오 계정으로 로그인
        </button>

        <p className="mt-6 text-center text-xs text-gray-400 leading-relaxed">
          카카오 계정으로 로그인하면 친구 목록과
          <br />
          메시지 발송 권한이 요청됩니다.
        </p>
      </div>
    </div>
  );
}
