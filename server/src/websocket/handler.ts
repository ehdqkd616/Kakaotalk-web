import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import type { JWTPayload } from '../types';

interface AuthSocket extends Socket {
  user: JWTPayload;
}

function parseCookie(cookieHeader: string, name: string): string | null {
  const match = cookieHeader
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

export function setupWebSocket(io: Server): void {
  // 인증 미들웨어
  io.use((socket, next) => {
    const cookieHeader = socket.handshake.headers.cookie ?? '';
    const token =
      parseCookie(cookieHeader, 'token') ??
      (socket.handshake.auth.token as string | undefined);

    if (!token) {
      return next(new Error('인증이 필요합니다.'));
    }

    try {
      const payload = jwt.verify(token, config.jwt.secret) as JWTPayload;
      (socket as AuthSocket).user = payload;
      next();
    } catch {
      next(new Error('유효하지 않은 토큰입니다.'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket as AuthSocket).user;
    console.log(`[WS] 연결: ${user.nickname} (${user.userId})`);

    // 개인 알림 채널 구독 (릴레이 메시지 수신용)
    socket.join(`user_${user.userId}`);

    // 채팅방 구독
    socket.on('join_room', (roomId: string) => {
      socket.join(roomId);
    });

    // 채팅방 구독 해제
    socket.on('leave_room', (roomId: string) => {
      socket.leave(roomId);
    });

    // 타이핑 중 이벤트
    socket.on('typing', ({ roomId }: { roomId: string }) => {
      socket.to(roomId).emit('user_typing', {
        userId: user.userId,
        nickname: user.nickname,
        roomId,
      });
    });

    socket.on('disconnect', (reason) => {
      console.log(`[WS] 연결 해제: ${user.nickname} (${reason})`);
    });
  });
}
