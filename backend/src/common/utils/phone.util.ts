export const UZ_PHONE_REGEX = /^\+998\d{9}$/;

export function normalizeUzPhone(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const digits = trimmed.replace(/\D/g, '');

  // Local number (9 digits) -> +998XXXXXXXXX
  if (digits.length === 9) {
    return `+998${digits}`;
  }

  // 998XXXXXXXXX -> +998XXXXXXXXX
  if (digits.length === 12 && digits.startsWith('998')) {
    return `+${digits}`;
  }

  // Already in international format, keep sanitized version.
  if (trimmed.startsWith('+')) {
    return `+${digits}`;
  }

  return trimmed;
}
