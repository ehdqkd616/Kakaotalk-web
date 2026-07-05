export interface KakaoUser {
  id: number;
  kakao_account?: {
    profile?: {
      nickname: string;
      profile_image_url?: string;
      thumbnail_image_url?: string;
    };
    email?: string;
  };
  properties?: {
    nickname: string;
    profile_image?: string;
    thumbnail_image?: string;
  };
}

export interface JWTPayload {
  userId: string;
  nickname: string;
  profileImage: string;
  accessToken: string;
  refreshToken: string;
}

export interface ChatRoom {
  id: string;
  name: string;
  type: 'direct' | 'group' | 'self' | 'relay';
  participant_id?: string | null;
  last_message?: string | null;
  last_message_at?: string | null;
  unread_count: number;
  profile_image?: string | null;
  owner_id: string;
}

export interface Message {
  id: string;
  room_id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  image_url?: string | null;
  type: 'text' | 'image';
  direction: 'sent' | 'received';
  created_at: string;
}

export interface KakaoFriend {
  id: number;
  uuid: string;
  profile_nickname: string;
  profile_thumbnail_image?: string;
  favorite: boolean;
  allowed_msg: boolean;
}

export interface RelayDevice {
  device_id: string;
  user_id: string;
  device_name?: string;
  registered_at: string;
  last_ping_at: string;
}
