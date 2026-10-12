import { getDB } from '../db';
import { io } from '../index';
import type { Message } from '../types';

// 보낸 메시지를 DB에 기록하고 채팅방/사용자 채널로 실시간 전달
export function recordSentMessage(params: {
  roomId: string;
  userId: string;
  senderName: string;
  content: string;
  imageUrl?: string | null;
  type?: 'text' | 'image';
}): Message {
  const db = getDB();
  const { roomId, userId, senderName, content } = params;
  const imageUrl = params.imageUrl ?? null;
  const type = imageUrl ? 'image' : (params.type ?? 'text');
  const messageId = crypto.randomUUID();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO messages (id, room_id, sender_id, sender_name, content, image_url, type, direction, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'sent', ?)
  `).run(messageId, roomId, userId, senderName, content, imageUrl, type, now);

  db.prepare(
    'UPDATE rooms SET last_message = ?, last_message_at = ? WHERE id = ?',
  ).run(content, now, roomId);

  const message: Message = {
    id: messageId,
    room_id: roomId,
    sender_id: userId,
    sender_name: senderName,
    content,
    image_url: imageUrl,
    type,
    direction: 'sent',
    created_at: now,
  };

  // 방에 들어와 있지 않은 탭(사이드바)도 갱신되도록 사용자 채널에도 전달
  const targets = [roomId, `user_${userId}`];
  io.to(targets).emit('new_message', message);
  io.to(targets).emit('room_updated', {
    roomId,
    lastMessage: content,
    lastMessageAt: now,
    unreadCount: 0,
  });

  return message;
}
