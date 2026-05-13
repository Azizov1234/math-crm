import api from './axios';
import type { ApiEnvelope, PaginatedResponse } from './http';
import { unwrapResponse, withSafePaginationParams } from './http';

export const teachersApi = {
  getAll: async (params?: any) =>
    unwrapResponse(await api.get<ApiEnvelope<PaginatedResponse<any>>>('/teachers', { params: withSafePaginationParams(params) })),
  getById: async (id: string) => unwrapResponse(await api.get<ApiEnvelope<any>>(`/teachers/${id}`)),
  create: async (data: any) => unwrapResponse(await api.post<ApiEnvelope<any>>('/teachers', data)),
  update: async (id: string, data: any) => unwrapResponse(await api.patch<ApiEnvelope<any>>(`/teachers/${id}`, data)),
  delete: async (id: string) => unwrapResponse(await api.delete<ApiEnvelope<any>>(`/teachers/${id}`)),
  getGroups: async (id: string) => unwrapResponse(await api.get<ApiEnvelope<any[]>>(`/teachers/${id}/groups`)),
  getStudents: async (id: string) => unwrapResponse(await api.get<ApiEnvelope<any[]>>(`/teachers/${id}/students`)),
  uploadPhoto: async (id: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return unwrapResponse(
      await api.post<ApiEnvelope<any>>(`/teachers/${id}/photo`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
    );
  },
};
