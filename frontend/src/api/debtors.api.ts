import api from './axios';
import type { ApiEnvelope, PaginatedResponse } from './http';
import { unwrapResponse, withSafePaginationParams } from './http';

export const debtorsApi = {
  getAll: async (params?: any) =>
    unwrapResponse(await api.get<ApiEnvelope<PaginatedResponse<any>>>('/debtors', { params: withSafePaginationParams(params) })),
  getSummary: async (params?: any) => unwrapResponse(await api.get<ApiEnvelope<any>>('/debtors/summary', { params })),
  getByGroup: async (params?: any) => unwrapResponse(await api.get<ApiEnvelope<any[]>>('/debtors/by-group', { params })),
  getStudentDetails: async (studentId: string) =>
    unwrapResponse(await api.get<ApiEnvelope<any>>(`/debtors/student/${studentId}/details`)),
};

