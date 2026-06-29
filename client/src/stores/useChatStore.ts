'use client';

import { create } from 'zustand';
import type { User, ChatRoom, Message, RoomUpdatedPayload } from '@/types';

interface ChatState {
  user: User | null;
  rooms: ChatRoom[];
  messages: Record<string, Message[]>;
  activeRoomId: string | null;
  typingUsers: Record<string, string[]>;

  setUser: (user: User | null) => void;
  setRooms: (rooms: ChatRoom[]) => void;
  setMessages: (roomId: string, messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateRoomLastMessage: (payload: RoomUpdatedPayload) => void;
  setActiveRoom: (roomId: string | null) => void;
  markRoomRead: (roomId: string) => void;
  setTyping: (roomId: string, nickname: string) => void;
  clearTyping: (roomId: string, nickname: string) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  user: null,
  rooms: [],
  messages: {},
  activeRoomId: null,
  typingUsers: {},

  setUser: (user) => set({ user }),

  setRooms: (rooms) => set({ rooms }),

  setMessages: (roomId, messages) =>
    set((s) => ({ messages: { ...s.messages, [roomId]: messages } })),

  addMessage: (message) =>
    set((s) => {
      const prev = s.messages[message.room_id] ?? [];
      const already = prev.some((m) => m.id === message.id);
      if (already) return s;
      return {
        messages: {
          ...s.messages,
          [message.room_id]: [...prev, message],
        },
      };
    }),

  updateRoomLastMessage: ({ roomId, lastMessage, lastMessageAt, unreadCount }) =>
    set((s) => ({
      rooms: s.rooms.map((r) =>
        r.id === roomId
          ? {
              ...r,
              last_message: lastMessage,
              last_message_at: lastMessageAt,
              unread_count:
                s.activeRoomId === roomId
                  ? 0
                  : (r.unread_count ?? 0) + (unreadCount ?? 1),
            }
          : r,
      ),
    })),

  setActiveRoom: (roomId) =>
    set((s) => ({
      activeRoomId: roomId,
      rooms: s.rooms.map((r) =>
        r.id === roomId ? { ...r, unread_count: 0 } : r,
      ),
    })),

  markRoomRead: (roomId) =>
    set((s) => ({
      rooms: s.rooms.map((r) =>
        r.id === roomId ? { ...r, unread_count: 0 } : r,
      ),
    })),

  setTyping: (roomId, nickname) =>
    set((s) => {
      const prev = s.typingUsers[roomId] ?? [];
      if (prev.includes(nickname)) return s;
      return { typingUsers: { ...s.typingUsers, [roomId]: [...prev, nickname] } };
    }),

  clearTyping: (roomId, nickname) =>
    set((s) => ({
      typingUsers: {
        ...s.typingUsers,
        [roomId]: (s.typingUsers[roomId] ?? []).filter((n) => n !== nickname),
      },
    })),
}));
