import { fmtUzs } from '@/utils/format';

interface PriceCellProps {
  value: number;
  variant?: 'neutral' | 'success' | 'danger' | 'muted';
  pill?: boolean;
}

const variantStyles = {
  neutral: { text: 'text-slate-800', bg: 'bg-slate-50', label: 'text-slate-400' },
  success: { text: 'text-emerald-700', bg: 'bg-emerald-50', label: 'text-emerald-400' },
  danger: { text: 'text-red-600', bg: 'bg-red-50', label: 'text-red-300' },
  muted: { text: 'text-slate-400', bg: 'bg-slate-50', label: 'text-slate-300' },
};

export function PriceCell({ value, variant = 'neutral', pill = false }: PriceCellProps) {
  const { text, bg, label } = variantStyles[variant];

  if (value === 0 && variant === 'muted') {
    return <span className="text-slate-300 text-sm">-</span>;
  }

  const inner = (
    <span className="flex items-baseline gap-0.5 leading-none">
      <span className={`text-sm font-semibold tabular-nums ${text}`}>{fmtUzs(value)}</span>
      <span className={`ml-0.5 text-[10px] font-medium ${label}`}>so'm</span>
    </span>
  );

  if (pill) {
    return <span className={`inline-flex items-center rounded-lg px-2 py-1 ${bg}`}>{inner}</span>;
  }

  return inner;
}

export function PriceSummary({
  value,
  label,
  variant = 'neutral',
}: {
  value: number;
  label: string;
  variant?: 'neutral' | 'success' | 'danger';
}) {
  const colors = {
    neutral: 'text-slate-900',
    success: 'text-emerald-600',
    danger: 'text-red-600',
  };

  return (
    <div>
      <p className="mb-0.5 text-xs text-slate-400">{label}</p>
      <p className={`text-lg font-bold tabular-nums ${colors[variant]}`}>
        {fmtUzs(value)} <span className="text-xs font-medium text-slate-400">so'm</span>
      </p>
    </div>
  );
}
