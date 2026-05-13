const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8020';

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
