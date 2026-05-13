import api from './axios';
import type { ApiEnvelope, PaginatedResponse } from './http';
import { unwrapResponse } from './http';

export const systemLogsApi = {
  getActions: async (params?: any) =>
    unwrapResponse(await api.get<ApiEnvelope<PaginatedResponse<any>>>('/system-logs/actions', { params })),
  getErrors: async (params?: any) =>
    unwrapResponse(await api.get<ApiEnvelope<PaginatedResponse<any>>>('/system-logs/errors', { params })),
};
