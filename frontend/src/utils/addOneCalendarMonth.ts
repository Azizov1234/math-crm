/**
 * Adds exactly one calendar month to a date string.
 * Handles end-of-month edge cases (Jan 31 → Feb 28, etc.)
 */
export function addOneCalendarMonth(dateStr: string): string {
  const date = new Date(dateStr);
  const day = date.getDate();
  date.setMonth(date.getMonth() + 1);
  // If the day changed (e.g. Jan 31 → Mar 2), go back to last day of target month
  if (date.getDate() < day) {
    date.setDate(0);
  }
  return date.toISOString();
}

export function calcNextPaymentDate(paidDate: string): string {
  return addOneCalendarMonth(paidDate);
}
