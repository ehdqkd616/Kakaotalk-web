import { Router, Request, Response } from 'express';
import { requireAuth, type AuthRequest } from '../middleware/auth';
import { getDB } from '../db';
import { io } from '../index';
import type { Message, RelayDevice } from '../types';

const router = Router();

// POST /api/relay/register  → Android 기기 등록
router.post('/register', (req: Request, res: Response) => {
  const { deviceId, userId, deviceName } = req.body as {
    deviceId: string;
    userId: string;
    deviceName?: string;
  };

  if (!deviceId || !userId) {
    res.status(400).json({ error: 'deviceId 와 userId 가 필요합니다.' });
    return;
  }

  const db = getDB();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT OR REPLACE INTO relay_devices (device_id, user_id, device_name, registered_at, last_ping_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(deviceId, userId, deviceName ?? '알 수 없는 기기', now, now);

  console.log(`[RELAY] 기기 등록: ${deviceName ?? deviceId} (user: ${userId})`);
  res.json({ ok: true, deviceId });
});

// POST /api/relay/message  → Android 앱에서 수신한 카카오톡 메시지 전달
router.post('/message', (req: Request, res: Response) => {
  const {
    deviceId,
    userId,
    sender,
    senderProfile,
    roomName,
    content,
    timestamp,
  } = req.body as {
    deviceId: string;
    userId: string;
    sender: string;
    senderProfile?: string;
    roomName: string;
    content: string;
    timestamp?: string;
  };

  if (!deviceId || !userId || !content || !sender) {
    res.status(400).json({ error: '필수 파라미터가 누락되었습니다.' });
    return;
  }

  const db = getDB();

  // 릴레이 방 이름 기반 ID 생성 (같은 방이면 같은 ID)
  const roomKey = Buffer.from(`${userId}:${roomName}`)
    .toString('base64')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 20);
  const roomId = `relay_${roomKey}`;
  const createdAt = timestamp ?? new Date().toISOString();

  // 채팅방 자동 생성
  db.prepare(`
    INSERT OR IGNORE INTO rooms (id, name, type, owner_id, unread_count, last_message_at)
    VALUES (?, ?, 'relay', ?, 0, ?)
  `).run(roomId, roomName, userId, createdAt);

  // 메시지 저장
  const messageId = crypto.randomUUID();

  db.prepare(`
    INSERT INTO messages (id, room_id, sender_id, sender_name, content, type, direction, created_at)
    VALUES (?, ?, ?, ?, ?, 'text', 'received', ?)
  `).run(messageId, roomId, `relay_${deviceId}`, sender, content, createdAt);

  db.prepare(`
    UPDATE rooms SET last_message = ?, last_message_at = ?, unread_count = unread_count + 1
    WHERE id = ?
  `).run(content, createdAt, roomId);

  const message: Message & { senderProfile?: string } = {
    id: messageId,
    room_id: roomId,
    sender_id: `relay_${deviceId}`,
    sender_name: sender,
    content,
    type: 'text',
    direction: 'received',
    created_at: createdAt,
    senderProfile,
  };

  // 해당 유저의 WebSocket으로 실시간 전달
  io.to(`user_${userId}`).emit('new_message', message);
  io.to(`user_${userId}`).emit('room_updated', {
    roomId,
    roomName,
    lastMessage: content,
    lastMessageAt: createdAt,
    unreadCount: 1,
  });

  res.json({ ok: true });
});

// POST /api/relay/ping  → Android 기기 생존 신호
router.post('/ping', (req: Request, res: Response) => {
  const { deviceId } = req.body as { deviceId: string };
  if (!deviceId) {
    res.status(400).json({ error: 'deviceId 필요' });
    return;
  }

  try {
    const db = getDB();
    db.prepare(
      "UPDATE relay_devices SET last_ping_at = ? WHERE device_id = ?",
    ).run(new Date().toISOString(), deviceId);
  } catch {
    // 등록되지 않은 기기는 무시
  }

  res.json({ ok: true, timestamp: new Date().toISOString() });
});

// GET /api/relay/status  → 릴레이 연결 기기 목록 (인증 필요)
router.get('/status', requireAuth, (req: AuthRequest, res: Response) => {
  const db = getDB();
  const devices = db
    .prepare('SELECT * FROM relay_devices WHERE user_id = ?')
    .all(req.user!.userId) as RelayDevice[];
  res.json({ devices });
});

export default router;
