import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config();

export const config = {
  kakao: {
    restApiKey: process.env.KAKAO_REST_API_KEY || '',
    clientSecret: process.env.KAKAO_CLIENT_SECRET || '',
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
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
};
