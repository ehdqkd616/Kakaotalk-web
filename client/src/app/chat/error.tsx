'use client';

export default function ChatError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex h-screen items-center justify-center bg-gray-100">
      <div className="max-w-lg rounded-xl bg-white p-8 shadow-lg">
        <h2 className="mb-2 text-lg font-bold text-red-600">오류 발생</h2>
        <p className="mb-4 text-sm text-gray-600">{error.message}</p>
        <pre className="mb-4 max-h-48 overflow-auto rounded bg-gray-50 p-3 text-xs text-gray-700">
          {error.stack}
        </pre>
        <button
          onClick={reset}
          className="rounded-lg bg-kakao-yellow px-4 py-2 text-sm font-semibold text-kakao-brown"
        >
          다시 시도
        </button>
      </div>
    </div>
  );
}
