import { Request, Response, NextFunction } from 'express';
import axios from 'axios';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  console.error('[ERROR]', err.message);

  if (axios.isAxiosError(err) && err.response) {
    const kakaoError = err.response.data as { msg?: string; message?: string };
    res.status(err.response.status).json({
      error: kakaoError.msg ?? kakaoError.message ?? '카카오 API 오류',
    });
    return;
  }

  res.status(500).json({ error: err.message || '서버 오류가 발생했습니다.' });
}
