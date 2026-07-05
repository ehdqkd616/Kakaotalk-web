import { Router, Response } from 'express';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import { requireAuth, type AuthRequest } from '../middleware/auth';
import { getDB } from '../db';
import * as kakao from '../services/kakao';
import { config } from '../config';
import { io } from '../index';
import type { ChatRoom, Message } from '../types';

const router = Router();
router.use(requireAuth);

// 이미지 업로드 설정
const storage = multer.diskStorage({
  destination: path.join(process.cwd(), 'uploads'),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('이미지 파일만 업로드 가능합니다.'));
  },
});

// POST /api/messages/upload  → 이미지 업로드
router.post('/upload', upload.single('image'), (req: AuthRequest, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: '파일이 없습니다.' });
    return;
  }
  res.json({ url: `/uploads/${req.file.filename}` });
});

// GET /api/messages/rooms  → 채팅방 목록
router.get('/rooms', async (req: AuthRequest, res: Response) => {
  const db = getDB();
  const userId = req.user!.userId;

  const selfRoomId = `self_${userId}`;
  db.prepare(`
    INSERT OR IGNORE INTO rooms (id, name, type, owner_id, unread_count)
    VALUES (?, '나에게 보내기', 'self', ?, 0)
  `).run(selfRoomId, userId);

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

  db.prepare('UPDATE rooms SET unread_count = 0 WHERE id = ?').run(roomId);

  const messages = db
    .prepare('SELECT * FROM messages WHERE room_id = ? ORDER BY created_at ASC')
    .all(roomId) as Message[];

  res.json(messages);
});

// POST /api/messages/send  → 메시지 발송
router.post('/send', async (req: AuthRequest, res: Response) => {
  const { roomId, content, image_url, type, skipKakao } = req.body as {
    roomId: string;
    content?: string;
    image_url?: string;
    type?: string;
    skipKakao?: boolean;
  };

  if (!roomId || (!content?.trim() && !image_url)) {
    res.status(400).json({ error: 'roomId와 content 또는 image_url이 필요합니다.' });
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

  const textContent = content?.trim() || '';
  // 이미지만 있을 때는 Kakao API에 '[이미지]' 텍스트로 전송
  const kakaoText = textContent || '[이미지]';
  const msgType = image_url ? 'image' : (type ?? 'text');

  const isKakaoTokenError = (e: unknown) => {
    const d = (e as { response?: { data?: { code?: number } } })?.response?.data;
    return d?.code === -401;
  };

  const sendViaKakao = async (accessToken: string) => {
    if (room.type === 'self') {
      await kakao.sendMessageToMe(accessToken, kakaoText);
    } else if (room.type === 'direct' && room.participant_id) {
      await kakao.sendMessageToFriend(accessToken, [room.participant_id], kakaoText);
    }
  };

  if (!skipKakao) try {
    await sendViaKakao(req.user!.accessToken);
  } catch (err: unknown) {
    if (isKakaoTokenError(err) && req.user!.refreshToken) {
      try {
        const newTokens = await kakao.refreshAccessToken(req.user!.refreshToken);
        await sendViaKakao(newTokens.access_token);

        const newPayload = { ...req.user!, accessToken: newTokens.access_token, refreshToken: newTokens.refresh_token ?? req.user!.refreshToken };
        const newJwt = jwt.sign(newPayload, config.jwt.secret, { expiresIn: '7d' });
        res.cookie('token', newJwt, {
          httpOnly: true,
          secure: config.nodeEnv === 'production',
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60 * 1000,
          path: '/',
        });
      } catch (refreshErr: unknown) {
        console.error('[SEND] 토큰 갱신 실패:', refreshErr);
        res.status(401).json({ error: '로그인이 만료되었습니다. 다시 로그인해주세요.' });
        return;
      }
    } else if (room.type !== 'relay') {
      const axiosErr = err as { response?: { data?: { msg?: string } }; message?: string };
      console.error('[SEND] 카카오 API 오류:', axiosErr.response?.data ?? axiosErr.message);
      res.status(502).json({
        error: axiosErr.response?.data?.msg ?? '카카오 API로 메시지를 전송하지 못했습니다.',
      });
      return;
    }
  }

  // DB 저장
  const messageId = crypto.randomUUID();
  const now = new Date().toISOString();
  const displayContent = textContent || '[이미지]';

  db.prepare(`
    INSERT INTO messages (id, room_id, sender_id, sender_name, content, image_url, type, direction, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'sent', ?)
  `).run(messageId, roomId, userId, req.user!.nickname, displayContent, image_url ?? null, msgType, now);

  db.prepare(
    'UPDATE rooms SET last_message = ?, last_message_at = ? WHERE id = ?',
  ).run(displayContent, now, roomId);

  const message: Message = {
    id: messageId,
    room_id: roomId,
    sender_id: userId,
    sender_name: req.user!.nickname,
    content: displayContent,
    image_url: image_url ?? null,
    type: msgType as 'text' | 'image',
    direction: 'sent',
    created_at: now,
  };

  io.to(roomId).emit('new_message', message);
  io.to(roomId).emit('room_updated', {
    roomId,
    lastMessage: displayContent,
    lastMessageAt: now,
  });

  res.json(message);
});

export default router;
