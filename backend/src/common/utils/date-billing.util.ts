export function addOneCalendarMonth(date: Date): Date {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();

  const targetMonth = month + 1;
  const targetYear = year + Math.floor(targetMonth / 12);
  const normalizedTargetMonth = targetMonth % 12;

  const lastDayOfTargetMonth = new Date(targetYear, normalizedTargetMonth + 1, 0).getDate();
  const finalDay = Math.min(day, lastDayOfTargetMonth);

  const result = new Date(date);
  result.setFullYear(targetYear, normalizedTargetMonth, finalDay);
  return result;
}

export function calculateOverdueMonths(nextPaymentDate: Date | null | undefined, today = new Date()): number {
  if (!nextPaymentDate) {
    return 0;
  }

  const next = new Date(nextPaymentDate);
  if (next >= today) {
    return 0;
  }

  let count = 0;
  let cursor = new Date(next);
  while (cursor < today) {
    count += 1;
    cursor = addOneCalendarMonth(cursor);
  }

  return count;
}

export function startOfDay(date = new Date()): Date {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}
