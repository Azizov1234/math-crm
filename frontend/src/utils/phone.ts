const UZ_PHONE_REGEX = /^\+998\d{9}$/;

export function normalizeUzPhone(value: string): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '';

  const digits = raw.replace(/\D/g, '');

  if (digits.length === 9) {
    return `+998${digits}`;
  }

  if (digits.length === 12 && digits.startsWith('998')) {
    return `+${digits}`;
  }

  if (raw.startsWith('+')) {
    return `+${digits}`;
  }

  return raw;
}

export function isValidUzPhone(value: string): boolean {
  return UZ_PHONE_REGEX.test(value);
}
