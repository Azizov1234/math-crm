import api from './axios';
import type { ApiEnvelope } from './http';
import { unwrapResponse } from './http';

export const authApi = {
  login: async (data: { identifier: string; password: string }) =>
    unwrapResponse(
      await api.post<ApiEnvelope<{ accessToken: string; refreshToken: string; user: any }>>('/auth/login', data),
    ),
  refresh: async (refreshToken: string) =>
    unwrapResponse(
      await api.post<ApiEnvelope<{ accessToken: string; refreshToken: string; user: any }>>('/auth/refresh', { refreshToken }),
    ),
  me: async () => unwrapResponse(await api.get<ApiEnvelope<any>>('/auth/me')),
  logout: async () => unwrapResponse(await api.post<ApiEnvelope<{ success: boolean }>>('/auth/logout')),
};
