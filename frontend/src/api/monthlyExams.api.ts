import api from './axios';
import type { ApiEnvelope, PaginatedResponse } from './http';
import { unwrapResponse, withSafePaginationParams } from './http';

export const monthlyExamsApi = {
  getAll: async (params?: any) =>
    unwrapResponse(await api.get<ApiEnvelope<PaginatedResponse<any>>>('/monthly-exams', { params: withSafePaginationParams(params) })),
  getById: async (id: string) => unwrapResponse(await api.get<ApiEnvelope<any>>(`/monthly-exams/${id}`)),
  create: async (data: any) => unwrapResponse(await api.post<ApiEnvelope<any>>('/monthly-exams', data)),
  update: async (id: string, data: any) => unwrapResponse(await api.patch<ApiEnvelope<any>>(`/monthly-exams/${id}`, data)),
  delete: async (id: string) => unwrapResponse(await api.delete<ApiEnvelope<any>>(`/monthly-exams/${id}`)),
  listResults: async (id: string) => unwrapResponse(await api.get<ApiEnvelope<any[]>>(`/monthly-exams/${id}/results`)),
  getStatistics: async (id: string) => unwrapResponse(await api.get<ApiEnvelope<any>>(`/monthly-exams/${id}/statistics`)),
  createResult: async (id: string, data: any) =>
    unwrapResponse(await api.post<ApiEnvelope<any>>(`/monthly-exams/${id}/results`, data)),
  updateResult: async (id: string, resultId: string, data: any) =>
    unwrapResponse(await api.patch<ApiEnvelope<any>>(`/monthly-exams/${id}/results/${resultId}`, data)),
  deleteResult: async (id: string, resultId: string) =>
    unwrapResponse(await api.delete<ApiEnvelope<any>>(`/monthly-exams/${id}/results/${resultId}`)),
};
