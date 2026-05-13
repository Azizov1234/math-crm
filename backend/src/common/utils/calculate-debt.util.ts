import { calculateOverdueMonths } from './date-billing.util';

export function calculateDebt(monthlyFee: number, overdueMonths: number): number {
  return Math.max(monthlyFee, 0) * Math.max(overdueMonths, 0);
}

export { calculateOverdueMonths };
