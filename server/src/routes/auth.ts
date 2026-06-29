import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import * as kakao from '../services/kakao';
import { config } from '../config';
import { requireAuth, type AuthRequest } from '../middleware/auth';

const router = Router();

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: config.nodeEnv === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
};

// GET /api/auth/kakao  → 카카오 로그인 페이지로 리다이렉트
router.get('/kakao', (_req: Request, res: Response) => {
  const url = kakao.getAuthUrl();
  res.redirect(url);
});

// GET /api/auth/kakao/callback  → 카카오 OAuth 콜백
router.get('/kakao/callback', async (req: Request, res: Response) => {
  const { code, error } = req.query as Record<string, string>;

  if (error || !code) {
    return res.redirect(`${config.clientUrl}/login?error=access_denied`);
  }

  try {
    const tokens = await kakao.getToken(code);
    const userInfo = await kakao.getUserInfo(tokens.access_token);
    const { nickname, profileImage } = kakao.extractProfile(userInfo);

    const payload = {
      userId: String(userInfo.id),
      nickname,
      profileImage,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
    };

    const jwtToken = jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });

    res.cookie('token', jwtToken, COOKIE_OPTIONS);
    res.redirect(`${config.clientUrl}/chat`);
  } catch (err) {
    console.error('[AUTH] 카카오 콜백 오류:', err);
    res.redirect(`${config.clientUrl}/login?error=server_error`);
  }
});

// GET /api/auth/me  → 현재 사용자 정보
router.get('/me', requireAuth, (req: AuthRequest, res: Response) => {
  const { accessToken, refreshToken, ...publicInfo } = req.user!;
  void accessToken;
  void refreshToken;
  res.json(publicInfo);
});

// POST /api/auth/logout
router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie('token', { path: '/' });
  res.json({ ok: true });
});

// POST /api/auth/refresh  → 토큰 갱신
router.post('/refresh', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const newTokens = await kakao.refreshAccessToken(req.user!.refreshToken);

    const payload = {
      ...req.user!,
      accessToken: newTokens.access_token,
      refreshToken: newTokens.refresh_token ?? req.user!.refreshToken,
    };

    const jwtToken = jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });

    res.cookie('token', jwtToken, COOKIE_OPTIONS);
    res.json({ ok: true });
  } catch (err) {
    console.error('[AUTH] 토큰 갱신 오류:', err);
    res.status(401).json({ error: '토큰 갱신에 실패했습니다.' });
  }
});

export default router;
