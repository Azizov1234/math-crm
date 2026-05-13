import { formatMoneyCompact } from '@/utils/formatMoney';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  isMoney?: boolean;
  trend?: number;
  trendLabel?: string;
  color?: 'indigo' | 'emerald' | 'rose' | 'amber' | 'sky' | 'violet';
  suffix?: string;
}

const colorMap = {
  indigo: 'from-indigo-500 to-indigo-600 shadow-indigo-200',
  emerald: 'from-emerald-500 to-emerald-600 shadow-emerald-200',
  rose: 'from-rose-500 to-rose-600 shadow-rose-200',
  amber: 'from-amber-500 to-amber-600 shadow-amber-200',
  sky: 'from-sky-500 to-sky-600 shadow-sky-200',
  violet: 'from-violet-500 to-violet-600 shadow-violet-200',
};

export default function StatCard({ title, value, icon, isMoney, trend, trendLabel, color = 'indigo', suffix }: StatCardProps) {
  const gradient = colorMap[color];
  const displayValue = isMoney && typeof value === 'number'
    ? formatMoneyCompact(value)
    : `${value}${suffix || ''}`;

  return (
    <div className="stat-card group min-h-[132px] hover:-translate-y-0.5 transition-all duration-300">
      <div className="grid grid-cols-[1fr_auto] items-start gap-3">
        <div className="min-w-0 pr-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 sm:text-xs leading-4 break-words">{title}</p>
          <p className="mt-1.5 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl leading-tight">{displayValue}</p>
          {trend !== undefined && (
            <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trend >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              <span>{Math.abs(trend)}% {trendLabel || 'o\'tgan oyga nisbatan'}</span>
            </div>
          )}
        </div>
        <div
          className={`h-10 w-10 rounded-2xl bg-gradient-to-br ${gradient} flex shrink-0 items-center justify-center shadow-lg sm:h-11 sm:w-11 group-hover:scale-110 transition-transform duration-300`}
        >
          <span className="text-white [&>*]:h-5 [&>*]:w-5">{icon}</span>
        </div>
      </div>
    </div>
  );
}
