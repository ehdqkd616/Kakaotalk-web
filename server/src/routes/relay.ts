import { Router, Request, Response, NextFunction } from 'express';
import { createHash, randomBytes } from 'crypto';
import { requireAuth, type AuthRequest } from '../middleware/auth';
import { getDB } from '../db';
import { io } from '../index';
import type { Message, RelayDevice } from '../types';

const router = Router();

interface RelayRequest extends Request {
  relayUserId?: string;
}

// Android 릴레이 요청 인증: Authorization: Bearer <릴레이 토큰>
// 사용자는 본문의 userId가 아니라 토큰으로만 결정한다.
function requireRelayToken(req: RelayRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) {
    res.status(401).json({ error: '릴레이 토큰이 필요합니다.' });
    return;
  }
  const row = getDB()
    .prepare('SELECT user_id FROM relay_tokens WHERE token = ?')
    .get(token) as { user_id: string } | undefined;
  if (!row) {
    res.status(401).json({ error: '유효하지 않은 릴레이 토큰입니다.' });
    return;
  }
  req.relayUserId = row.user_id;
  next();
}

function issueRelayToken(userId: string): string {
  const token = randomBytes(24).toString('base64url');
  getDB().prepare(`
    INSERT INTO relay_tokens (user_id, token, created_at) VALUES (?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET token = excluded.token, created_at = excluded.created_at
  `).run(userId, token, new Date().toISOString());
  return token;
}

// GET /api/relay/token  → 내 릴레이 토큰 조회 (없으면 발급)
router.get('/token', requireAuth, (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const row = getDB()
    .prepare('SELECT token FROM relay_tokens WHERE user_id = ?')
    .get(userId) as { token: string } | undefined;
  res.json({ token: row?.token ?? issueRelayToken(userId) });
});

// POST /api/relay/token/rotate  → 릴레이 토큰 재발급 (기존 토큰과 등록 기기는 즉시 무효화)
router.post('/token/rotate', requireAuth, (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const token = issueRelayToken(userId);
  getDB().prepare('DELETE FROM relay_devices WHERE user_id = ?').run(userId);
  res.json({ token });
});

// POST /api/relay/register  → Android 기기 등록
router.post('/register', requireRelayToken, (req: RelayRequest, res: Response) => {
  const userId = req.relayUserId!;
  const { deviceId, deviceName } = req.body as {
    deviceId: string;
    deviceName?: string;
  };

  if (!deviceId) {
    res.status(400).json({ error: 'deviceId 가 필요합니다.' });
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
router.post('/message', requireRelayToken, (req: RelayRequest, res: Response) => {
  const userId = req.relayUserId!;
  const {
    deviceId,
    sender,
    senderProfile,
    roomName,
    content,
    timestamp,
  } = req.body as {
    deviceId: string;
    sender: string;
    senderProfile?: string;
    roomName: string;
    content: string;
    timestamp?: string;
  };

  if (!deviceId || !content || !sender) {
    res.status(400).json({ error: '필수 파라미터가 누락되었습니다.' });
    return;
  }

  const db = getDB();

  // 릴레이 방 이름 기반 ID 생성 (같은 방이면 같은 ID)
  const roomKey = createHash('sha256')
    .update(`${userId}:${roomName}`)
    .digest('hex')
    .slice(0, 24);
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
router.post('/ping', requireRelayToken, (req: RelayRequest, res: Response) => {
  const { deviceId } = req.body as { deviceId: string };
  if (!deviceId) {
    res.status(400).json({ error: 'deviceId 필요' });
    return;
  }

  try {
    const db = getDB();
    db.prepare(
      'UPDATE relay_devices SET last_ping_at = ? WHERE device_id = ? AND user_id = ?',
    ).run(new Date().toISOString(), deviceId, req.relayUserId!);
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
