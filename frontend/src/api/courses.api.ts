import api from './axios';
import type { ApiEnvelope, PaginatedResponse } from './http';
import { unwrapResponse, withSafePaginationParams } from './http';

export const coursesApi = {
  getAll: async (params?: any) =>
    unwrapResponse(await api.get<ApiEnvelope<PaginatedResponse<any>>>('/courses', { params: withSafePaginationParams(params) })),
  getById: async (id: string) => unwrapResponse(await api.get<ApiEnvelope<any>>(`/courses/${id}`)),
  create: async (data: any) => unwrapResponse(await api.post<ApiEnvelope<any>>('/courses', data)),
  update: async (id: string, data: any) => unwrapResponse(await api.patch<ApiEnvelope<any>>(`/courses/${id}`, data)),
  delete: async (id: string) => unwrapResponse(await api.delete<ApiEnvelope<any>>(`/courses/${id}`)),
};
