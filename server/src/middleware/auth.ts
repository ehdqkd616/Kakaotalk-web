import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import type { JWTPayload } from '../types';

export interface AuthRequest extends Request {
  user?: JWTPayload;
}

function extractToken(req: Request): string | null {
  const fromCookie = req.cookies?.token as string | undefined;
  if (fromCookie) return fromCookie;

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return null;
}

export function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ error: '인증이 필요합니다.' });
    return;
  }

  try {
    const payload = jwt.verify(token, config.jwt.secret) as JWTPayload;
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: '유효하지 않은 토큰입니다.' });
  }
}

export function optionalAuth(
  req: AuthRequest,
  _res: Response,
  next: NextFunction,
): void {
  const token = extractToken(req);
  if (token) {
    try {
      req.user = jwt.verify(token, config.jwt.secret) as JWTPayload;
    } catch {
      // 유효하지 않은 토큰은 무시
    }
  }
  next();
}
