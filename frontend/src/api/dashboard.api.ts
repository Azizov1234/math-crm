import api from './axios';
import type { ApiEnvelope } from './http';
import { unwrapResponse } from './http';

export const dashboardApi = {
  getSummary: async () => unwrapResponse(await api.get<ApiEnvelope<any>>('/dashboard/summary')),
  getRevenueChart: async () => unwrapResponse(await api.get<ApiEnvelope<any[]>>('/dashboard/revenue-chart')),
  getPaymentMethodChart: async () => unwrapResponse(await api.get<ApiEnvelope<any[]>>('/dashboard/payment-method-chart')),
  getDebtorsChart: async () => unwrapResponse(await api.get<ApiEnvelope<any[]>>('/dashboard/debtors-chart')),
  getExamResultChart: async () => unwrapResponse(await api.get<ApiEnvelope<any>>('/dashboard/exam-result-chart')),
  getGroupStats: async () => unwrapResponse(await api.get<ApiEnvelope<any[]>>('/dashboard/group-stats')),
};
