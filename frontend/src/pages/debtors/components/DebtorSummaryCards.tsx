import { AlertTriangle, CreditCard, Layers, Clock, Wallet } from 'lucide-react';
import StatCard from '@/components/common/StatCard';
import type { DebtorSummary } from '../types';

export default function DebtorSummaryCards({ summary }: { summary: DebtorSummary }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      <StatCard
        title="Qarzdorlar soni"
        value={summary.debtorsCount}
        icon={<AlertTriangle />}
        color="rose"
      />
      <StatCard
        title="Jami qarz"
        value={summary.totalDebtAmount}
        isMoney
        icon={<CreditCard />}
        color="indigo"
      />
      <StatCard
        title="O'rtacha qarz"
        value={summary.averageDebtAmount}
        isMoney
        icon={<Wallet />}
        color="amber"
      />
      <StatCard
        title="Eng ko'p kechikkan"
        value={summary.maxOverdueDays}
        suffix=" kun"
        icon={<Clock />}
        color="sky"
      />
      <StatCard
        title="Qarzdor guruhlar"
        value={summary.groupsWithDebtCount}
        icon={<Layers />}
        color="violet"
      />
    </div>
  );
}
