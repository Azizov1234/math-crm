import api from './axios';
import type { ApiEnvelope } from './http';
import { unwrapResponse } from './http';

export const settingsApi = {
  getSettings: async () => unwrapResponse(await api.get<ApiEnvelope<any>>('/settings')),
  updateSettings: async (data: any) => unwrapResponse(await api.patch<ApiEnvelope<any>>('/settings', data)),
  uploadLogo: async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return unwrapResponse(
      await api.post<ApiEnvelope<any>>('/settings/logo', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
    );
  },
};
