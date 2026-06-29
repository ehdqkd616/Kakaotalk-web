'use client';

import { useEffect, useRef } from 'react';
import { useChatStore } from '@/stores/useChatStore';
import type { Message } from '@/types';
import MessageBubble from './MessageBubble';

interface Props {
  roomId: string;
  messages: Message[];
}

function DateDivider({ date }: { date: string }) {
  return (
    <div className="my-4 flex items-center gap-3">
      <div className="flex-1 border-t border-gray-300/50" />
      <span className="text-[10px] text-gray-500">{date}</span>
      <div className="flex-1 border-t border-gray-300/50" />
    </div>
  );
}

function TypingIndicator({ names }: { names: string[] }) {
  if (names.length === 0) return null;
  return (
    <div className="flex items-center gap-2 px-4 py-1">
      <div className="flex items-center gap-1 rounded-2xl bg-white px-3 py-2 shadow-sm">
        <span className="typing-dot h-1.5 w-1.5 rounded-full bg-gray-400" />
        <span className="typing-dot h-1.5 w-1.5 rounded-full bg-gray-400" />
        <span className="typing-dot h-1.5 w-1.5 rounded-full bg-gray-400" />
      </div>
      <span className="text-[10px] text-gray-500">
        {names.join(', ')} 입력 중
      </span>
    </div>
  );
}

export default function MessageList({ roomId, messages }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingUsers = useChatStore((s) => s.typingUsers[roomId] ?? []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, typingUsers.length]);

  const formatDateLabel = (iso: string) => {
    return new Date(iso).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });
  };

  // 날짜별 구분선 삽입
  const rendered: React.ReactNode[] = [];
  let lastDate = '';

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const msgDate = new Date(msg.created_at).toDateString();
    if (msgDate !== lastDate) {
      rendered.push(
        <DateDivider key={`date-${msgDate}`} date={formatDateLabel(msg.created_at)} />,
      );
      lastDate = msgDate;
    }

    const prev = messages[i - 1];
    const showSender =
      msg.direction === 'received' &&
      (i === 0 || prev.sender_id !== msg.sender_id || prev.direction !== msg.direction);

    rendered.push(
      <MessageBubble key={msg.id} message={msg} showSender={showSender} />,
    );
  }

  return (
    <div className="chat-bg flex-1 overflow-y-auto px-4 py-4">
      {messages.length === 0 && (
        <div className="flex h-full items-center justify-center">
          <p className="text-sm text-gray-500">첫 번째 메시지를 보내보세요</p>
        </div>
      )}
      <div className="flex flex-col gap-2">{rendered}</div>
      <TypingIndicator names={typingUsers} />
      <div ref={bottomRef} />
    </div>
  );
}
