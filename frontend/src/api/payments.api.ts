import api from './axios';
import type { ApiEnvelope, PaginatedResponse } from './http';
import { unwrapResponse, withSafePaginationParams } from './http';

export const paymentsApi = {
  getAll: async (params?: any) =>
    unwrapResponse(await api.get<ApiEnvelope<PaginatedResponse<any>>>('/payments', { params: withSafePaginationParams(params) })),
  getById: async (id: string) => unwrapResponse(await api.get<ApiEnvelope<any>>(`/payments/${id}`)),
  create: async (data: any) => unwrapResponse(await api.post<ApiEnvelope<any>>('/payments', data)),
  update: async (id: string, data: any) => unwrapResponse(await api.patch<ApiEnvelope<any>>(`/payments/${id}`, data)),
  delete: async (id: string) => unwrapResponse(await api.delete<ApiEnvelope<any>>(`/payments/${id}`)),
  getByStudent: async (studentId: string) => unwrapResponse(await api.get<ApiEnvelope<any[]>>(`/payments/student/${studentId}`)),
  getSummary: async () => unwrapResponse(await api.get<ApiEnvelope<any>>('/payments/summary')),
};
