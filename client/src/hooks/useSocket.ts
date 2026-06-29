'use client';

import { useEffect } from 'react';
import { getSocket, connectSocket } from '@/lib/socket';
import { useChatStore } from '@/stores/useChatStore';
import type { Message, RoomUpdatedPayload, TypingPayload } from '@/types';

export function useSocket() {
  const { addMessage, updateRoomLastMessage, setTyping, clearTyping } =
    useChatStore();

  useEffect(() => {
    connectSocket();
    const socket = getSocket();

    socket.on('new_message', (message: Message) => {
      addMessage(message);
    });

    socket.on('room_updated', (payload: RoomUpdatedPayload) => {
      updateRoomLastMessage(payload);
    });

    socket.on('user_typing', ({ roomId, nickname }: TypingPayload) => {
      setTyping(roomId, nickname);
      setTimeout(() => clearTyping(roomId, nickname), 3000);
    });

    socket.on('connect', () => {
      console.log('[WS] 연결됨');
    });

    socket.on('disconnect', () => {
      console.log('[WS] 연결 해제됨');
    });

    socket.on('connect_error', (err) => {
      console.warn('[WS] 연결 오류:', err.message);
    });

    return () => {
      socket.off('new_message');
      socket.off('room_updated');
      socket.off('user_typing');
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
    };
  }, [addMessage, updateRoomLastMessage, setTyping, clearTyping]);
}
