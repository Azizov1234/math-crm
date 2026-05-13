import type { AxiosError, AxiosResponse } from 'axios';

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export const DEFAULT_LIMIT = 50;
export const MAX_LIMIT = 100;

export function withSafePaginationParams<T extends Record<string, unknown> | undefined>(
  params?: T,
  defaultLimit = DEFAULT_LIMIT,
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...(params ?? {}) };

  const rawLimit = next.limit;
  const parsedLimit = Number(rawLimit);
  if (!Number.isFinite(parsedLimit) || parsedLimit <= 0) {
    next.limit = defaultLimit;
  } else {
    next.limit = Math.min(Math.floor(parsedLimit), MAX_LIMIT);
  }

  if (next.page !== undefined) {
    const parsedPage = Number(next.page);
    next.page = Number.isFinite(parsedPage) && parsedPage > 0 ? Math.floor(parsedPage) : 1;
  }

  return next;
}

export function unwrapResponse<T>(response: AxiosResponse<ApiEnvelope<T>>): T {
  return response.data.data;
}

export function getErrorMessage(error: unknown, fallback = "Xatolik yuz berdi"): string {
  const axiosError = error as AxiosError<{ message?: string | string[]; error?: string }>;
  const message = axiosError?.response?.data?.message;

  if (Array.isArray(message) && message.length > 0) {
    return message.join(', ');
  }

  if (typeof message === 'string' && message.trim().length > 0) {
    return message;
  }

  if (axiosError?.message) {
    return axiosError.message;
  }

  return fallback;
}
