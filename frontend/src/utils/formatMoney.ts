const uzMoneyFormatter = new Intl.NumberFormat('uz-UZ', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function normalizeUzNumber(value: number): string {
  const safeValue = Number.isFinite(value) ? value : 0;
  return uzMoneyFormatter.format(safeValue).replace(/\u00A0/g, ' ');
}

export function formatMoney(amount: number, currency = "so'm"): string {
  return `${normalizeUzNumber(amount)} ${currency}`;
}

export function formatMoneyCompact(amount: number): string {
  return formatMoney(amount);
}
