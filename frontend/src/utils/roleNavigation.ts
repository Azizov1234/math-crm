import type { Role } from '@/store/authStore';

export function getHomePathByRole(role?: Role | null): string {
  if (role === 'ADMIN') {
    return '/monthly-exams';
  }

  return '/dashboard';
}
