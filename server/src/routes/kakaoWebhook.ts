import { Router, Request, Response } from 'express';
import { getDB } from '../db';
import { config } from '../config';
import { recordSentMessage } from '../services/sentMessages';

const router = Router();

interface PendingShare {
  id: string;
  room_id: string;
  user_id: string;
  sender_name: string;
  content: string;
}

// GET|POST /api/kakao/share-webhook  → 카카오톡 공유 전송 완료 웹훅
// 카카오 콘솔 > 앱 > 웹훅 > 카카오톡 공유 웹훅에 이 주소를 등록한다.
// 사용자가 공유창에서 실제로 전송했을 때만 호출되며, 공유 시 넘긴 serverCallbackArgs(shareId)가 함께 온다.
function handleShareWebhook(req: Request, res: Response) {
  if (config.kakao.adminKey && req.headers.authorization !== `KakaoAK ${config.kakao.adminKey}`) {
    res.status(401).end();
    return;
  }

  // 카카오는 3초 안에 2XX 응답을 요구하므로 먼저 응답
  res.status(200).end();

  const params = { ...(req.query as Record<string, unknown>), ...(req.body ?? {}) };
  const shareId = typeof params.shareId === 'string' ? params.shareId : '';
  if (!shareId) return;

  const db = getDB();
  const pending = db
    .prepare('SELECT * FROM pending_shares WHERE id = ?')
    .get(shareId) as PendingShare | undefined;
  if (!pending) return;

  // 같은 공유에 대해 웹훅이 중복으로 와도 한 번만 기록
  db.prepare('DELETE FROM pending_shares WHERE id = ?').run(shareId);

  recordSentMessage({
    roomId: pending.room_id,
    userId: pending.user_id,
    senderName: pending.sender_name,
    content: pending.content,
  });
  console.log(`[SHARE] 공유 전송 확인: ${pending.room_id} (${params.CHAT_TYPE ?? '?'})`);
}

router.get('/share-webhook', handleShareWebhook);
router.post('/share-webhook', handleShareWebhook);

export default router;
