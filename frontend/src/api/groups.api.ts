import api from './axios';
import type { ApiEnvelope, PaginatedResponse } from './http';
import { unwrapResponse, withSafePaginationParams } from './http';

export type BillingType = 'DEFAULT' | 'DISCOUNTED' | 'FREE';

export type AddStudentToGroupPayload = {
  studentId: string;
  billingType: BillingType;
  monthlyFee: number;
  discountReason?: string;
  note?: string;
};

export type UpdateStudentGroupBillingPayload = {
  billingType: BillingType;
  monthlyFee: number;
  discountReason?: string;
  note?: string;
};

export const groupsApi = {
  getAll: async (params?: any) =>
    unwrapResponse(await api.get<ApiEnvelope<PaginatedResponse<any>>>('/groups', { params: withSafePaginationParams(params) })),
  getById: async (id: string) => unwrapResponse(await api.get<ApiEnvelope<any>>(`/groups/${id}`)),
  create: async (data: any) => unwrapResponse(await api.post<ApiEnvelope<any>>('/groups', data)),
  update: async (id: string, data: any) => unwrapResponse(await api.patch<ApiEnvelope<any>>(`/groups/${id}`, data)),
  delete: async (id: string) => unwrapResponse(await api.delete<ApiEnvelope<any>>(`/groups/${id}`)),
  addStudentToGroup: async (groupId: string, payload: AddStudentToGroupPayload) =>
    unwrapResponse(await api.post<ApiEnvelope<any>>(`/groups/${groupId}/students`, payload)),
  addStudent: async (groupId: string, payloadOrStudentId: AddStudentToGroupPayload | string) =>
    unwrapResponse(
      await api.post<ApiEnvelope<any>>(
        `/groups/${groupId}/students`,
        typeof payloadOrStudentId === 'string' ? { studentId: payloadOrStudentId } : payloadOrStudentId,
      ),
    ),
  updateStudentGroupBilling: async (groupId: string, studentId: string, payload: UpdateStudentGroupBillingPayload) =>
    unwrapResponse(await api.patch<ApiEnvelope<any>>(`/groups/${groupId}/students/${studentId}/billing`, payload)),
  removeStudent: async (id: string, studentId: string) =>
    unwrapResponse(await api.delete<ApiEnvelope<any>>(`/groups/${id}/students/${studentId}`)),
  getStudents: async (id: string) => unwrapResponse(await api.get<ApiEnvelope<any[]>>(`/groups/${id}/students`)),
  getPayments: async (id: string) => unwrapResponse(await api.get<ApiEnvelope<any[]>>(`/groups/${id}/payments`)),
  getDebtors: async (id: string) => unwrapResponse(await api.get<ApiEnvelope<any[]>>(`/groups/${id}/debtors`)),
  getExams: async (id: string) => unwrapResponse(await api.get<ApiEnvelope<any[]>>(`/groups/${id}/exams`)),
};
