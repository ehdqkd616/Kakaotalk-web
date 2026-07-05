'use client';

import { useState, useRef, useCallback } from 'react';
import { getSocket } from '@/lib/socket';
import { messagesApi } from '@/lib/api';
import { shareViaKakao } from '@/lib/kakaoShare';

interface Props {
  onSend: (content: string, imageUrl?: string) => Promise<void>;
  roomId: string;
}

export default function MessageInput({ onSend, roomId }: Props) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const emitTyping = useCallback(() => {
    getSocket().emit('typing', { roomId });
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => { typingTimeout.current = null; }, 2000);
  }, [roomId]);

  const handleReset = () => {
    setText('');
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSend = async () => {
    if ((!text.trim() && !imageFile) || sending) return;

    setSending(true);
    let imageUrl: string | undefined;

    try {
      if (imageFile) {
        setUploading(true);
        const { data } = await messagesApi.uploadImage(imageFile);
        imageUrl = data.url;
        setUploading(false);
      }
      await onSend(text.trim(), imageUrl);
      handleReset();
    } catch {
      // 에러는 onSend에서 처리
    } finally {
      setSending(false);
      setUploading(false);
    }
  };

  const handleKakaoShare = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setSending(true);
    try {
      // DB에 저장 (Kakao REST API 호출 없이)
      await messagesApi.send(roomId, trimmed, undefined, true);
      // Kakao JS SDK 공유 열기
      shareViaKakao(trimmed);
      handleReset();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      alert(e.response?.data?.error ?? '채팅 기록 저장에 실패했습니다.');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const canSend = (!!text.trim() || !!imageFile) && !sending;

  return (
    <div className="flex-shrink-0 border-t border-gray-200 bg-white px-5 py-4">
      {/* 메시지 입력 영역 (outlined Material-style) */}
      <div className="relative rounded border border-gray-300 transition-colors focus-within:border-kakao-brown">
        <span className="absolute -top-2.5 left-3 bg-white px-1 text-[11px] text-gray-500 select-none">
          메시지
        </span>
        <textarea
          value={text}
          onChange={(e) => { setText(e.target.value); emitTyping(); }}
          onKeyDown={handleKeyDown}
          placeholder="한번에 200자까지 전송 가능 (Shift+Enter: 줄바꿈)"
          rows={4}
          disabled={sending}
          className="w-full resize-none bg-transparent px-3 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none disabled:opacity-60"
          style={{ maxHeight: '160px' }}
        />
      </div>

      {/* 글자수 */}
      <div className="mt-1.5 px-0.5">
        <p className="text-[11px] text-gray-400">글자수</p>
        <p className="text-sm font-medium text-gray-700">{text.length}</p>
      </div>

      {/* 이미지 미리보기 */}
      {imagePreview && (
        <div className="mt-2 flex items-start gap-2">
          <div className="relative inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imagePreview}
              alt="첨부 이미지"
              className="h-20 w-20 rounded-lg border border-gray-200 object-cover"
            />
            <button
              onClick={removeImage}
              className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-gray-600 text-[11px] text-white hover:bg-gray-800"
            >
              ×
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500">{imageFile?.name}</p>
        </div>
      )}

      <hr className="my-3 border-gray-200" />

      {/* 버튼 행 */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={handleReset}
          disabled={sending}
          className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-600 transition hover:bg-gray-50 active:bg-gray-100 disabled:opacity-40"
        >
          다시 쓰기
        </button>

        <button
          onClick={() => void handleKakaoShare()}
          disabled={!text.trim() || sending}
          className={`rounded border px-4 py-2 text-sm font-medium transition ${
            text.trim() && !sending
              ? 'border-yellow-400 bg-kakao-yellow text-kakao-brown hover:brightness-95 active:brightness-90'
              : 'border-gray-200 bg-gray-50 text-gray-300'
          }`}
        >
          카톡 전송
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={sending}
          className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-600 transition hover:bg-gray-50 active:bg-gray-100 disabled:opacity-40"
        >
          이미지 올리기
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageSelect}
        />

        {/* 나에게 보내기 버튼 */}
        <button
          onClick={handleSend}
          disabled={!canSend}
          className={`ml-auto rounded px-5 py-2 text-sm font-semibold transition ${
            canSend
              ? 'bg-kakao-brown text-white hover:opacity-90 active:opacity-80'
              : 'bg-gray-100 text-gray-300'
          }`}
        >
          {uploading ? '업로드 중…' : sending ? '전송 중…' : '보내기'}
        </button>
      </div>
    </div>
  );
}
