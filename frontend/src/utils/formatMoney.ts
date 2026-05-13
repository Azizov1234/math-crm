export function formatMoney(amount: number, currency = "so'm"): string {
  return `${amount.toLocaleString('uz-UZ')} ${currency}`;
}

export function formatMoneyCompact(amount: number): string {
  if (amount >= 1_000_000_000) return `${(amount/1_000_000_000).toFixed(1)}B so'm`;
  if (amount >= 1_000_000) return `${(amount/1_000_000).toFixed(1)}M so'm`;
  if (amount >= 1_000) return `${(amount/1_000).toFixed(0)}K so'm`;
  return `${amount} so'm`;
}
