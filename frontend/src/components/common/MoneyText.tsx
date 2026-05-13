import { formatMoney, formatMoneyCompact } from '@/utils/formatMoney';

interface MoneyTextProps {
  amount: number;
  className?: string;
  compact?: boolean;
}

export function MoneyText({ amount, className = '', compact }: MoneyTextProps) {
  const text = compact ? formatMoneyCompact(amount) : formatMoney(amount);
  return <span className={`font-semibold tabular-nums ${className}`}>{text}</span>;
}

export default MoneyText;
