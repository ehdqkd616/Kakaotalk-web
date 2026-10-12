import axios from 'axios';
import { config } from '../config';
import type { KakaoUser, KakaoFriend } from '../types';

const KAUTH = 'https://kauth.kakao.com';
const KAPI = 'https://kapi.kakao.com';

export function getAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: config.kakao.restApiKey,
    redirect_uri: config.kakao.redirectUri,
    response_type: 'code',
    scope: 'profile_nickname profile_image friends talk_message',
  });
  return `${KAUTH}/oauth/authorize?${params.toString()}`;
}

export async function getToken(code: string) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: config.kakao.restApiKey,
    redirect_uri: config.kakao.redirectUri,
    code,
  });
  if (config.kakao.clientSecret) {
    body.append('client_secret', config.kakao.clientSecret);
  }

  const { data } = await axios.post<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
    refresh_token_expires_in: number;
    token_type: string;
  }>(`${KAUTH}/oauth/token`, body, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return data;
}

export async function refreshAccessToken(refreshToken: string) {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: config.kakao.restApiKey,
    refresh_token: refreshToken,
  });
  if (config.kakao.clientSecret) {
    body.append('client_secret', config.kakao.clientSecret);
  }

  const { data } = await axios.post<{
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  }>(`${KAUTH}/oauth/token`, body, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return data;
}

export async function getUserInfo(accessToken: string): Promise<KakaoUser> {
  const { data } = await axios.get<KakaoUser>(`${KAPI}/v2/user/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return data;
}

export async function getFriends(
  accessToken: string,
  offset = 0,
  limit = 100,
): Promise<{ elements: KakaoFriend[]; total_count: number }> {
  const { data } = await axios.get(`${KAPI}/v1/api/talk/friends`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    params: { offset, limit },
  });
  return data;
}

export interface OutgoingMessage {
  text: string;
  imageUrl?: string;
  // 메시지의 링크/버튼을 눌렀을 때 열릴 주소 (카카오 콘솔 > 제품 링크 관리 > 웹 도메인에 등록된 도메인이어야 함)
  linkUrl: string;
}

// 이미지가 있으면 피드 템플릿(실제 이미지 표시), 없으면 텍스트 템플릿
function buildTemplate({ text, imageUrl, linkUrl }: OutgoingMessage) {
  const link = { web_url: linkUrl, mobile_web_url: linkUrl };
  if (imageUrl) {
    return {
      object_type: 'feed',
      content: {
        title: text || '사진',
        image_url: imageUrl,
        link,
      },
      buttons: [{ title: '웹에서 보기', link }],
    };
  }
  return {
    object_type: 'text',
    text,
    link,
    button_title: '웹에서 보기',
  };
}

export async function sendMessageToMe(
  accessToken: string,
  message: OutgoingMessage,
): Promise<void> {
  await axios.post(
    `${KAPI}/v2/api/talk/memo/default/send`,
    new URLSearchParams({
      template_object: JSON.stringify(buildTemplate(message)),
    }),
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    },
  );
}

export async function sendMessageToFriend(
  accessToken: string,
  receiverUuids: string[],
  message: OutgoingMessage,
): Promise<void> {
  await axios.post(
    `${KAPI}/v1/api/talk/friends/message/default/send`,
    new URLSearchParams({
      receiver_uuids: JSON.stringify(receiverUuids),
      template_object: JSON.stringify(buildTemplate(message)),
    }),
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    },
  );
}

export function extractProfile(user: KakaoUser): {
  nickname: string;
  profileImage: string;
} {
  const profile = user.kakao_account?.profile;
  const props = user.properties;
  return {
    nickname: profile?.nickname ?? props?.nickname ?? '알 수 없음',
    profileImage:
      profile?.profile_image_url ?? props?.profile_image ?? '',
  };
}
