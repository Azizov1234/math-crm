import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarCheck,
  Clock,
  CreditCard,
  DollarSign,
  Layers,
  TrendingUp,
  UserCog,
  Users,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { toast } from 'sonner';
import { dashboardApi } from '@/api/dashboard.api';
import { debtorsApi } from '@/api/debtors.api';
import { getErrorMessage } from '@/api/http';
import { paymentsApi } from '@/api/payments.api';
import { systemLogsApi } from '@/api/systemLogs.api';
import LoadingSkeleton from '@/components/common/LoadingSkeleton';
import PageHeader from '@/components/common/PageHeader';
import StatCard from '@/components/common/StatCard';
import StatusBadge from '@/components/common/StatusBadge';
import { useAuthStore } from '@/store/authStore';
import { formatDate } from '@/utils/formatDate';
import { formatMoney } from '@/utils/formatMoney';

const METHOD_COLORS: Record<string, string> = {
  CASH: '#10b981',
  CARD: '#6366f1',
  TRANSFER: '#f59e0b',
};

const RESULT_COLORS: Record<string, string> = {
  PASSED: '#10b981',
  FAILED: '#f43f5e',
  SKIPPED: '#f59e0b',
  SENT_TO_RETAKE: '#8b5cf6',
};

const EXAM_RESULT_ORDER = ['PASSED', 'FAILED', 'SKIPPED', 'SENT_TO_RETAKE'] as const;

const EXAM_RESULT_LABELS: Record<(typeof EXAM_RESULT_ORDER)[number], string> = {
  PASSED: 'PASSED',
  FAILED: 'FAILED',
  SKIPPED: 'SKIPPED',
  SENT_TO_RETAKE: 'RETAKE',
};

type DashboardSummary = {
  totalStudents: number;
  activeStudents: number;
  inactiveStudents: number;
  totalTeachers: number;
  totalGroups: number;
  thisMonthRevenue: number;
  todayPayments: number;
  debtorsCount: number;
  totalDebtAmount: number;
  monthlyExamCount: number;
  passedCount: number;
  failedCount: number;
  skippedCount: number;
  sentToRetakeCount: number;
};

type RecentDebtor = {
  studentId: string;
  fullName: string;
  overdueDays: number;
  debtAmount: number;
};

type ExamResultKey = (typeof EXAM_RESULT_ORDER)[number];

type ExamChartItem = {
  key: ExamResultKey;
  label: string;
  value: number;
  color: string;
};

export default function DashboardPage() {
  const { user } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [revenueChart, setRevenueChart] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [examResultChart, setExamResultChart] = useState<any[]>([]);
  const [debtorsChart, setDebtorsChart] = useState<any[]>([]);
  const [groupStats, setGroupStats] = useState<any[]>([]);
  const [recentPayments, setRecentPayments] = useState<any[]>([]);
  const [recentDebtors, setRecentDebtors] = useState<RecentDebtor[]>([]);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);

        const [
          summaryData,
          revenueData,
          methodData,
          examData,
          debtorsChartData,
          groupStatsData,
          paymentsData,
          debtorsData,
        ] = await Promise.all([
          dashboardApi.getSummary(),
          dashboardApi.getRevenueChart(),
          dashboardApi.getPaymentMethodChart(),
          dashboardApi.getExamResultChart(),
          dashboardApi.getDebtorsChart(),
          dashboardApi.getGroupStats(),
          paymentsApi.getAll({ page: 1, limit: 6 }),
          debtorsApi.getAll({ page: 1, limit: 5 }),
        ]);

        const logsData = user?.role === 'SUPERADMIN' ? await systemLogsApi.getActions({ page: 1, limit: 5 }) : null;

        setSummary(summaryData ?? null);
        setRevenueChart(revenueData ?? []);
        setPaymentMethods(methodData ?? []);
        setExamResultChart(examData?.items ?? []);
        setDebtorsChart(debtorsChartData ?? []);
        setGroupStats(groupStatsData ?? []);
        setRecentPayments(paymentsData.data ?? []);
        setRecentDebtors(
          (debtorsData.data ?? []).map((item: any) => ({
            studentId: item.studentId,
            fullName: item.fullName ?? '-',
            overdueDays: Number(item.maxOverdueDays ?? 0),
            debtAmount: Number(item.totalDebt ?? 0),
          })),
        );
        setRecentLogs(logsData?.data ?? []);
      } catch (error) {
        toast.error(getErrorMessage(error, "Dashboard ma'lumotlarini yuklashda xatolik"));
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [user?.role]);

  const paymentMethodData = useMemo(
    () =>
      paymentMethods.map((item) => ({
        name: item.method,
        value: Number(item.totalAmount ?? 0),
        color: METHOD_COLORS[item.method] ?? '#64748b',
      })),
    [paymentMethods],
  );

  const examData = useMemo<ExamChartItem[]>(() => {
    const countMap = new Map<string, number>(
      (examResultChart ?? []).map((item) => [item.result, Number(item.count ?? 0)]),
    );

    return EXAM_RESULT_ORDER.map((key) => ({
      key,
      label: EXAM_RESULT_LABELS[key],
      value: countMap.get(key) ?? 0,
      color: RESULT_COLORS[key],
    }));
  }, [examResultChart]);

  if (loading || !summary) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <PageHeader
        title={`Xush kelibsiz, ${user?.fullName?.split(' ')[0] || 'Foydalanuvchi'}!`}
        subtitle="Matematika Academy boshqaruv paneli"
        icon={<Layers size={20} />}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
        <StatCard title="Jami o'quvchilar" value={summary.totalStudents} icon={<Users />} color="indigo" />
        <StatCard title="Faol o'quvchilar" value={summary.activeStudents} icon={<Users />} color="emerald" />
        <StatCard title="Nofaol o'quvchilar" value={summary.inactiveStudents} icon={<Users />} color="amber" />
        <StatCard title="O'qituvchilar" value={summary.totalTeachers} icon={<UserCog />} color="sky" />
        <StatCard title="Guruhlar" value={summary.totalGroups} icon={<Layers />} color="violet" />
        <StatCard title="Bu oy daromad" value={summary.thisMonthRevenue} icon={<DollarSign />} isMoney color="emerald" />
        <StatCard title="Bugungi to'lov" value={summary.todayPayments} icon={<CreditCard />} isMoney color="indigo" />
        <StatCard title="Qarzdorlar" value={summary.debtorsCount} icon={<AlertTriangle />} color="rose" />
        <StatCard title="Umumiy qarz" value={summary.totalDebtAmount} icon={<TrendingUp />} isMoney color="rose" />
        <StatCard title="Oylik imtihonlar" value={summary.monthlyExamCount} icon={<CalendarCheck />} color="sky" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="stat-card border-l-4 border-emerald-500">
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">O'tdi</p>
          <p className="mt-1 text-3xl font-bold text-emerald-600">{summary.passedCount}</p>
        </div>
        <div className="stat-card border-l-4 border-rose-500">
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">O'tmadi</p>
          <p className="mt-1 text-3xl font-bold text-rose-600">{summary.failedCount}</p>
        </div>
        <div className="stat-card border-l-4 border-amber-500">
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Qoldirildi</p>
          <p className="mt-1 text-3xl font-bold text-amber-600">{summary.skippedCount}</p>
        </div>
        <div className="stat-card border-l-4 border-violet-500">
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Qayta topshirish</p>
          <p className="mt-1 text-3xl font-bold text-violet-600">{summary.sentToRetakeCount}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <h3 className="mb-4 text-sm font-semibold text-slate-700">Oylik daromad dinamikasi</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revenueChart}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis
                tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`}
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={false}
                formatter={(v: number) => [formatMoney(v), 'Daromad']}
                contentStyle={{ borderRadius: 10, borderColor: '#e2e8f0' }}
              />
              <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2.5} fill="url(#revGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h3 className="mb-4 text-sm font-semibold text-slate-700">To'lov usullari</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={paymentMethodData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
                {paymentMethodData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                cursor={false}
                formatter={(v: number) => formatMoney(v)}
                contentStyle={{ borderRadius: 10, borderColor: '#e2e8f0' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 flex flex-wrap justify-center gap-4">
            {paymentMethodData.map((entry, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full" style={{ background: entry.color }} />
                <span className="text-xs text-slate-500">{entry.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h3 className="mb-4 text-sm font-semibold text-slate-700">Imtihon natijalari</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={examData} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="label"
                interval={0}
                axisLine={false}
                tickLine={false}
                tick={(props: any) => {
                  const { x, y, payload, index } = props;
                  const tickColor = examData[index]?.color ?? '#94a3b8';
                  return (
                    <text x={x} y={y + 12} textAnchor="middle" fill={tickColor} fontSize={11} fontWeight={700}>
                      {payload.value}
                    </text>
                  );
                }}
              />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ fill: 'transparent' }}
                contentStyle={{ borderRadius: 10, borderColor: '#e2e8f0' }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {examData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-700">Eng ko'p qarzdorlar</h3>
            <a href="/debtors" className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
              Hammasi -&gt;
            </a>
          </div>
          <div className="space-y-2.5">
            {recentDebtors.length === 0 ? (
              <p className="py-4 text-sm text-slate-500">Hozircha qarzdorlar mavjud emas.</p>
            ) : (
              recentDebtors.map((item) => (
                <div key={item.studentId} className="flex items-center justify-between gap-2 py-1.5">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-rose-100 text-xs font-bold text-rose-600">
                      {(item.fullName || 'O').charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium leading-none text-slate-800">{item.fullName}</p>
                      <p className="mt-0.5 text-xs text-slate-400">{item.overdueDays} kun kechikdi</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-rose-600">{(item.debtAmount / 1000000).toFixed(1)}M</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h3 className="mb-4 text-sm font-semibold text-slate-700">Qarzdorlik guruhlar kesimida</h3>
          {debtorsChart.length === 0 ? (
            <p className="py-4 text-sm text-slate-500">Ma'lumot topilmadi</p>
          ) : (
            <div className="space-y-2">
              {debtorsChart.slice(0, 6).map((item) => (
                <div key={item.groupId} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{item.groupName}</p>
                    <p className="text-xs text-slate-500">{item.debtorsCount} ta qarzdor</p>
                  </div>
                  <p className="text-sm font-semibold text-rose-600">{formatMoney(Number(item.debtAmount ?? 0))}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-5">
          <h3 className="mb-4 text-sm font-semibold text-slate-700">Guruh statistikasi</h3>
          {groupStats.length === 0 ? (
            <p className="py-4 text-sm text-slate-500">Ma'lumot topilmadi</p>
          ) : (
            <div className="space-y-2">
              {groupStats.slice(0, 6).map((group) => (
                <div key={group.id} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{group.name}</p>
                    <p className="text-xs text-slate-500">
                      {group.studentsCount} o'quvchi • {group.examsCount} imtihon
                    </p>
                  </div>
                  <StatusBadge status={group.status} size="sm" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={`grid gap-4 ${user?.role === 'SUPERADMIN' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h3 className="text-sm font-semibold text-slate-700">So'nggi to'lovlar</h3>
            <a href="/payments" className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
              Hammasi -&gt;
            </a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="table-head">
                <tr>
                  <th className="table-cell">O'quvchi</th>
                  <th className="table-cell">Miqdor</th>
                  <th className="table-cell">Usul</th>
                  <th className="table-cell">Sana</th>
                </tr>
              </thead>
              <tbody>
                {recentPayments.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="table-cell py-6 text-center text-sm text-slate-500">
                      To'lovlar topilmadi
                    </td>
                  </tr>
                ) : (
                  recentPayments.map((payment) => (
                    <tr key={payment.id} className="table-row">
                      <td className="table-cell font-medium text-slate-800">{payment.student?.fullName || '-'}</td>
                      <td className="table-cell font-semibold text-emerald-700">{formatMoney(Number(payment.amount ?? 0))}</td>
                      <td className="table-cell">
                        <StatusBadge status={payment.method === 'CASH' ? 'PAID' : payment.method === 'CARD' ? 'DUE_SOON' : 'PASSED'} size="sm" />
                      </td>
                      <td className="table-cell text-slate-500">{payment.paidAt ? formatDate(payment.paidAt) : '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {user?.role === 'SUPERADMIN' && (
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3 className="text-sm font-semibold text-slate-700">So'nggi tizim loglari</h3>
              <a href="/system-logs" className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
                Hammasi -&gt;
              </a>
            </div>
            <div className="divide-y divide-slate-100">
              {recentLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 px-5 py-3 transition-colors hover:bg-slate-50">
                  <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100">
                    <Clock size={13} className="text-slate-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-700">{log.description}</p>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className="text-xs text-slate-400">{log.user?.fullName || log.user?.username || 'Unknown'}</span>
                      <span className="text-slate-200">|</span>
                      <span className="text-xs text-slate-400">{formatDate(log.createdAt)}</span>
                    </div>
                  </div>
                  <span className="flex-shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                    {log.module}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
