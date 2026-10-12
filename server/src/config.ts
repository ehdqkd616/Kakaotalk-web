import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config();

export const config = {
  kakao: {
    restApiKey: process.env.KAKAO_REST_API_KEY || '',
    clientSecret: process.env.KAKAO_CLIENT_SECRET || '',
    // 카카오톡 공유 웹훅 요청 검증용 (앱 > 어드민 키의 대표 어드민 키)
    adminKey: process.env.KAKAO_ADMIN_KEY || '',
    redirectUri:
      process.env.KAKAO_REDIRECT_URI ||
      'http://localhost:4000/api/auth/kakao/callback',
  },
  jwt: {
    secret:
      process.env.JWT_SECRET ||
      'dev-secret-please-change-in-production',
    expiresIn: '7d' as const,
  },
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3100',
  port: parseInt(process.env.PORT || '4000', 10),
  // 기본은 이 서버 안에서만 접속 (외부는 Caddy 경유). 외부에 직접 열려면 HOST=0.0.0.0
  host: process.env.HOST || '127.0.0.1',
  nodeEnv: process.env.NODE_ENV || 'development',
};
