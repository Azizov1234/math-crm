import api from './axios';
import type { ApiEnvelope, PaginatedResponse } from './http';
import { unwrapResponse, withSafePaginationParams } from './http';

export const studentsApi = {
  getAll: async (params?: any) =>
    unwrapResponse(await api.get<ApiEnvelope<PaginatedResponse<any>>>('/students', { params: withSafePaginationParams(params) })),
  getById: async (id: string) => unwrapResponse(await api.get<ApiEnvelope<any>>(`/students/${id}`)),
  create: async (data: any) => unwrapResponse(await api.post<ApiEnvelope<any>>('/students', data)),
  update: async (id: string, data: any) => unwrapResponse(await api.patch<ApiEnvelope<any>>(`/students/${id}`, data)),
  delete: async (id: string) => unwrapResponse(await api.delete<ApiEnvelope<any>>(`/students/${id}`)),
  activate: async (id: string) => unwrapResponse(await api.patch<ApiEnvelope<any>>(`/students/${id}/activate`)),
  getPayments: async (id: string) => unwrapResponse(await api.get<ApiEnvelope<any[]>>(`/students/${id}/payments`)),
  getDebts: async (id: string) => unwrapResponse(await api.get<ApiEnvelope<any[]>>(`/students/${id}/debts`)),
  getExams: async (id: string) => unwrapResponse(await api.get<ApiEnvelope<any[]>>(`/students/${id}/exams`)),
  getStudentsForSelect: async (search = '') =>
    unwrapResponse(
      await api.get<ApiEnvelope<PaginatedResponse<any>>>('/students', {
        params: withSafePaginationParams({
          page: 1,
          limit: 100,
          status: 'ACTIVE',
          ...(search.trim() ? { search: search.trim() } : {}),
        }),
      }),
    ),
  uploadPhoto: async (id: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return unwrapResponse(
      await api.post<ApiEnvelope<any>>(`/students/${id}/photo`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
    );
  },
};
