import { getStatusConfig } from '@/utils/statusColor';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const config = getStatusConfig(status);
  return (
    <span className={`badge ${config.className} ${size === 'sm' ? 'text-[10px] px-2 py-0.5' : ''}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor} flex-shrink-0`} />
      {config.label}
    </span>
  );
}
