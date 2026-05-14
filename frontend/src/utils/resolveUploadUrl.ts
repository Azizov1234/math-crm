function resolveApiBaseUrl() {
  const envBase = String(import.meta.env.VITE_API_URL ?? '').trim();
  if (envBase) {
    return envBase;
  }

  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://localhost:8000';
    }
  }

  return '/api';
}

const API_BASE_URL = resolveApiBaseUrl();

export function resolveUploadUrl(rawUrl: string | null | undefined) {
  const value = String(rawUrl ?? '').trim();
  if (!value) return '';

  const normalizedApiBase = API_BASE_URL.replace(/\/$/, '');

  if (value.startsWith('/uploads/')) {
    return `${normalizedApiBase}${value}`;
  }

  try {
    const parsed = new URL(value);
    if (parsed.pathname.startsWith('/uploads/')) {
      return `${normalizedApiBase}${parsed.pathname}${parsed.search}`;
    }
  } catch {
    return value;
  }

  return value;
}
