/**
 * Format a number as Uzbek Sum (UZS) with proper display:
 *  1 331 826  →  "1 331 826"  (space-separated thousands)
 */
export function fmtUzs(value: number): string {
  return new Intl.NumberFormat('uz-UZ')
    .format(Math.round(value))
    .replace(/\u00A0/g, ' ');
}

/**
 * Shorten large amounts:
 *  5 400 000 → "5.4M"
 *  125 000   → "125K"
 */
export function fmtShort(value: number): string {
  if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + 'M';
  if (value >= 1_000)     return (value / 1_000).toFixed(0) + 'K';
  return String(value);
}
