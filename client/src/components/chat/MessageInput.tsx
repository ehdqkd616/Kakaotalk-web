'use client';

import { useState, useRef, useCallback } from 'react';
import { getSocket } from '@/lib/socket';

interface Props {
  onSend: (content: string) => Promise<void>;
  roomId: string;
}

export default function MessageInput({ onSend, roomId }: Props) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const emitTyping = useCallback(() => {
    getSocket().emit('typing', { roomId });
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      typingTimeout.current = null;
    }, 2000);
  }, [roomId]);

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      await onSend(trimmed);
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    // 높이 자동 조절
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
    emitTyping();
  };

  return (
    <div className="border-t border-gray-200 bg-white px-4 py-3">
      <div className="flex items-end gap-2 rounded-2xl border border-gray-200 bg-kakao-input-bg px-3 py-2 shadow-sm">
        {/* 이모티콘 버튼 (기능 없음, UI용) */}
        <button className="mb-0.5 flex-shrink-0 text-gray-400 transition hover:text-gray-600">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>

        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="메시지를 입력하세요 (Shift+Enter: 줄바꿈)"
          rows={1}
          disabled={sending}
          className="flex-1 resize-none bg-transparent text-sm text-gray-900 placeholder-gray-400 disabled:opacity-60"
          style={{ maxHeight: '120px', minHeight: '24px' }}
        />

        {/* 전송 버튼 */}
        <button
          onClick={handleSubmit}
          disabled={!text.trim() || sending}
          className={`mb-0.5 flex-shrink-0 rounded-full p-1 transition ${
            text.trim() && !sending
              ? 'bg-kakao-yellow text-kakao-brown hover:brightness-95 active:scale-95'
              : 'text-gray-300'
          }`}
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </div>

      <p className="mt-1 text-center text-[10px] text-gray-400">
        Enter: 전송 &nbsp;·&nbsp; Shift+Enter: 줄바꿈
      </p>
    </div>
  );
}
