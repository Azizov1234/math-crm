import api from './axios';
import type { ApiEnvelope, PaginatedResponse } from './http';
import { unwrapResponse, withSafePaginationParams } from './http';

export const examResultsApi = {
  getAll: async (params?: any) =>
    unwrapResponse(await api.get<ApiEnvelope<PaginatedResponse<any>>>('/exam-results', { params: withSafePaginationParams(params) })),
  getById: async (id: string) => unwrapResponse(await api.get<ApiEnvelope<any>>(`/exam-results/${id}`)),
};
