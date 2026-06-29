import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config } from './config';
import { initDB } from './db';
import authRouter from './routes/auth';
import messagesRouter from './routes/messages';
import relayRouter from './routes/relay';
import { errorHandler } from './middleware/errorHandler';
import { setupWebSocket } from './websocket/handler';

const app = express();
const httpServer = createServer(app);

export const io = new Server(httpServer, {
  cors: {
    origin: config.clientUrl,
    credentials: true,
    methods: ['GET', 'POST'],
  },
});

// ── 미들웨어 ──────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);
app.use(
  cors({
    origin: config.clientUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── 라우터 ────────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/relay', relayRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

// ── WebSocket ─────────────────────────────────────────
setupWebSocket(io);

// ── 시작 ──────────────────────────────────────────────
initDB();
httpServer.listen(config.port, () => {
  console.log(`[서버] http://localhost:${config.port} 에서 실행 중`);
  console.log(`[환경] ${config.nodeEnv}`);
  if (!config.kakao.restApiKey) {
    console.warn('[경고] KAKAO_REST_API_KEY 가 설정되지 않았습니다. .env 파일을 확인하세요.');
  }
});
