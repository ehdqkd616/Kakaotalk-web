import { Router, Response } from 'express';
import { requireAuth, type AuthRequest } from '../middleware/auth';
import { getDB } from '../db';
import * as kakao from '../services/kakao';
import { io } from '../index';
import type { ChatRoom, Message } from '../types';

const router = Router();
router.use(requireAuth);

// GET /api/messages/rooms  → 채팅방 목록
router.get('/rooms', async (req: AuthRequest, res: Response) => {
  const db = getDB();
  const userId = req.user!.userId;

  // '나에게 보내기' 방이 없으면 자동 생성
  const selfRoomId = `self_${userId}`;
  db.prepare(`
    INSERT OR IGNORE INTO rooms (id, name, type, owner_id, unread_count)
    VALUES (?, '나에게 보내기', 'self', ?, 0)
  `).run(selfRoomId, userId);

  // 카카오 친구 목록 동기화 (실패해도 무시)
  try {
    const { elements } = await kakao.getFriends(req.user!.accessToken);
    const insertRoom = db.prepare(`
      INSERT OR IGNORE INTO rooms (id, name, type, participant_id, profile_image, owner_id, unread_count)
      VALUES (?, ?, 'direct', ?, ?, ?, 0)
    `);
    const syncFriends = db.transaction(() => {
      for (const friend of elements) {
        const roomId = `friend_${userId}_${friend.uuid}`;
        insertRoom.run(
          roomId,
          friend.profile_nickname,
          friend.uuid,
          friend.profile_thumbnail_image ?? null,
          userId,
        );
      }
    });
    syncFriends();
  } catch {
    // 친구 목록 API 실패 시 로컬 방 목록만 사용
  }

  const rooms = db
    .prepare(
      `SELECT * FROM rooms WHERE owner_id = ?
       ORDER BY CASE WHEN last_message_at IS NULL THEN 1 ELSE 0 END,
                last_message_at DESC, name ASC`,
    )
    .all(userId) as ChatRoom[];

  res.json(rooms);
});

// GET /api/messages/:roomId  → 특정 방의 메시지 목록
router.get('/:roomId', (req: AuthRequest, res: Response) => {
  const db = getDB();
  const userId = req.user!.userId;
  const { roomId } = req.params;

  const room = db
    .prepare('SELECT id FROM rooms WHERE id = ? AND owner_id = ?')
    .get(roomId, userId);

  if (!room) {
    res.status(404).json({ error: '채팅방을 찾을 수 없습니다.' });
    return;
  }

  // 읽음 처리
  db.prepare('UPDATE rooms SET unread_count = 0 WHERE id = ?').run(roomId);

  const messages = db
    .prepare(
      'SELECT * FROM messages WHERE room_id = ? ORDER BY created_at ASC',
    )
    .all(roomId) as Message[];

  res.json(messages);
});

// POST /api/messages/send  → 메시지 발송
router.post('/send', async (req: AuthRequest, res: Response) => {
  const { roomId, content, type = 'text' } = req.body as {
    roomId: string;
    content: string;
    type?: string;
  };

  if (!roomId || !content?.trim()) {
    res.status(400).json({ error: 'roomId 와 content 가 필요합니다.' });
    return;
  }

  const db = getDB();
  const userId = req.user!.userId;

  const room = db
    .prepare('SELECT * FROM rooms WHERE id = ? AND owner_id = ?')
    .get(roomId, userId) as ChatRoom | undefined;

  if (!room) {
    res.status(404).json({ error: '채팅방을 찾을 수 없습니다.' });
    return;
  }

  try {
    // 카카오 API 실제 발송
    if (room.type === 'self') {
      await kakao.sendMessageToMe(req.user!.accessToken, content.trim());
    } else if (room.type === 'direct' && room.participant_id) {
      await kakao.sendMessageToFriend(
        req.user!.accessToken,
        [room.participant_id],
        content.trim(),
      );
    }
  } catch (err: unknown) {
    const axiosErr = err as { response?: { data?: { msg?: string } }; message?: string };
    console.error('[SEND] 카카오 API 오류:', axiosErr.response?.data ?? axiosErr.message);
    // 릴레이 방(relay type)은 카카오 API 없이도 저장 허용
    if (room.type !== 'relay') {
      res
        .status(502)
        .json({
          error:
            axiosErr.response?.data?.msg ??
            '카카오 API로 메시지를 전송하지 못했습니다.',
        });
      return;
    }
  }

  // DB 저장
  const messageId = crypto.randomUUID();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO messages (id, room_id, sender_id, sender_name, content, type, direction, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'sent', ?)
  `).run(messageId, roomId, userId, req.user!.nickname, content.trim(), type, now);

  db.prepare(
    'UPDATE rooms SET last_message = ?, last_message_at = ? WHERE id = ?',
  ).run(content.trim(), now, roomId);

  const message: Message = {
    id: messageId,
    room_id: roomId,
    sender_id: userId,
    sender_name: req.user!.nickname,
    content: content.trim(),
    type: type as 'text',
    direction: 'sent',
    created_at: now,
  };

  // 실시간 브로드캐스트
  io.to(roomId).emit('new_message', message);
  io.to(roomId).emit('room_updated', {
    roomId,
    lastMessage: content.trim(),
    lastMessageAt: now,
  });

  res.json(message);
});

export default router;
