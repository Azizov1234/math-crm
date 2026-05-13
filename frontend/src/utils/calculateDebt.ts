export function calculateDebt(monthlyFee: number, nextPaymentDate: string): {
  overdueDays: number;
  overdueMonths: number;
  debtAmount: number;
  isOverdue: boolean;
} {
  const now = new Date();
  const next = new Date(nextPaymentDate);
  const diffMs = now.getTime() - next.getTime();
  const overdueDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  const overdueMonths = Math.max(
    0,
    (now.getFullYear() - next.getFullYear()) * 12 + (now.getMonth() - next.getMonth())
  );
  const isOverdue = overdueDays > 0;
  return {
    overdueDays,
    overdueMonths: isOverdue ? Math.max(1, overdueMonths) : 0,
    debtAmount: isOverdue ? monthlyFee * Math.max(1, overdueMonths) : 0,
    isOverdue,
  };
}
