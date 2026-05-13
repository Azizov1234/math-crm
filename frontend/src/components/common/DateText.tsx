import { formatDate } from '@/utils/formatDate';

interface DateTextProps {
  date: string | null | undefined;
  className?: string;
}

export default function DateText({ date, className = '' }: DateTextProps) {
  return <span className={`text-sm tabular-nums ${className}`}>{formatDate(date)}</span>;
}
