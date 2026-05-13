import api from './axios';
import type { ApiEnvelope, PaginatedResponse } from './http';
import { unwrapResponse, withSafePaginationParams } from './http';

export const adminsApi = {
  getAll: async (params?: any) =>
    unwrapResponse(await api.get<ApiEnvelope<PaginatedResponse<any>>>('/admins', { params: withSafePaginationParams(params) })),
  getById: async (id: string) => unwrapResponse(await api.get<ApiEnvelope<any>>(`/admins/${id}`)),
  create: async (data: any) => unwrapResponse(await api.post<ApiEnvelope<any>>('/admins', data)),
  update: async (id: string, data: any) => unwrapResponse(await api.patch<ApiEnvelope<any>>(`/admins/${id}`, data)),
  delete: async (id: string) => unwrapResponse(await api.delete<ApiEnvelope<any>>(`/admins/${id}`)),
  updateStatus: async (id: string, status: string) =>
    unwrapResponse(await api.patch<ApiEnvelope<any>>(`/admins/${id}/status`, { status })),
  uploadPhoto: async (id: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return unwrapResponse(
      await api.post<ApiEnvelope<any>>(`/admins/${id}/photo`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
    );
  },
};
