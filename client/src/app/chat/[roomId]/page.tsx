'use client';

import { useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { messagesApi } from '@/lib/api';
import { useChatStore } from '@/stores/useChatStore';
import { getSocket } from '@/lib/socket';
import ChatHeader from '@/components/chat/ChatHeader';
import MessageList from '@/components/chat/MessageList';
import MessageInput from '@/components/chat/MessageInput';

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const { rooms, messages, setMessages, addMessage, setActiveRoom, markRoomRead } =
    useChatStore();
  const room = rooms.find((r) => r.id === roomId);
  const roomMessages = messages[roomId] ?? [];
  const fetchedRef = useRef(false);

  // 방 입장 처리
  useEffect(() => {
    setActiveRoom(roomId);
    markRoomRead(roomId);
    const socket = getSocket();
    socket.emit('join_room', roomId);

    return () => {
      socket.emit('leave_room', roomId);
      setActiveRoom(null);
    };
  }, [roomId, setActiveRoom, markRoomRead]);

  // 메시지 초기 로드
  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    messagesApi
      .getMessages(roomId)
      .then(({ data }) => setMessages(roomId, data))
      .catch(console.error);

    return () => {
      fetchedRef.current = false;
    };
  }, [roomId, setMessages]);

  const handleSend = async (content: string) => {
    try {
      const { data } = await messagesApi.send(roomId, content);
      addMessage(data);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      alert(e.response?.data?.error ?? '메시지 전송에 실패했습니다.');
    }
  };

  if (!room) {
    return (
      <div className="flex h-full items-center justify-center chat-bg">
        <p className="text-gray-500">채팅방을 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <ChatHeader room={room} />
      <MessageList roomId={roomId} messages={roomMessages} />
      <MessageInput onSend={handleSend} roomId={roomId} />
    </div>
  );
}
