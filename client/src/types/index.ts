export interface User {
  userId: string;
  nickname: string;
  profileImage: string;
}

export interface ChatRoom {
  id: string;
  name: string;
  type: 'direct' | 'self' | 'relay' | 'group';
  participant_id?: string | null;
  profile_image?: string | null;
  last_message?: string | null;
  last_message_at?: string | null;
  unread_count: number;
  owner_id: string;
}

export interface Message {
  id: string;
  room_id: string;
  sender_id: string;
  sender_name: string;
  senderProfile?: string;
  content: string;
  image_url?: string | null;
  type: 'text' | 'image';
  direction: 'sent' | 'received';
  created_at: string;
}

export interface RoomUpdatedPayload {
  roomId: string;
  roomName?: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount?: number;
}

export interface TypingPayload {
  userId: string;
  nickname: string;
  roomId: string;
}
