import axios from 'axios';
import type { User, ChatRoom, Message } from '@/types';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401) {
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  },
);

export const authApi = {
  me: () => api.get<User>('/api/auth/me'),
  logout: () => api.post('/api/auth/logout'),
  loginUrl: () => `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/auth/kakao`,
};

export const messagesApi = {
  getRooms: () => api.get<ChatRoom[]>('/api/messages/rooms'),
  getMessages: (roomId: string) =>
    api.get<Message[]>(`/api/messages/${roomId}`),
  send: (roomId: string, content: string, image_url?: string, skipKakao?: boolean) =>
    api.post<Message>('/api/messages/send', { roomId, content, image_url, skipKakao }),
  uploadImage: (file: File) => {
    const fd = new FormData();
    fd.append('image', file);
    return api.post<{ url: string }>('/api/messages/upload', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export const relayApi = {
  getStatus: () => api.get('/api/relay/status'),
};

export default api;
