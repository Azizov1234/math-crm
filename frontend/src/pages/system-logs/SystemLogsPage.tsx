import { useEffect, useMemo, useState } from 'react';
import { AlertOctagon, Clock, ScrollText, Search } from 'lucide-react';
import { toast } from 'sonner';
import EmptyState from '@/components/common/EmptyState';
import LoadingSkeleton from '@/components/common/LoadingSkeleton';
import PageHeader from '@/components/common/PageHeader';
import { systemLogsApi } from '@/api/systemLogs.api';
import { getErrorMessage } from '@/api/http';
import { formatDate } from '@/utils/formatDate';

type ActionLogRow = {
  id: string;
  createdAt: string;
  user?: { id: string; fullName?: string; username?: string; role?: string } | null;
  role?: string | null;
  action: string;
  module: string;
  description: string;
  ipAddress?: string | null;
};

type ErrorLogRow = {
  id: string;
  createdAt: string;
  user?: { id: string; fullName?: string; username?: string; role?: string } | null;
  path: string;
  method: string;
  message: string;
  statusCode: number;
};

export default function SystemLogsPage() {
  const [tab, setTab] = useState<'ACTION' | 'ERROR'>('ACTION');
  const [actionLogs, setActionLogs] = useState<ActionLogRow[]>([]);
  const [errorLogs, setErrorLogs] = useState<ErrorLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterModule, setFilterModule] = useState('');

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        const [actions, errors] = await Promise.all([
          systemLogsApi.getActions({ page: 1, limit: 100 }),
          systemLogsApi.getErrors({ page: 1, limit: 100 }),
        ]);
        setActionLogs(actions.data ?? []);
        setErrorLogs(errors.data ?? []);
      } catch (error) {
        toast.error(getErrorMessage(error, 'Loglarni yuklashda xatolik'));
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  const modules = useMemo(() => [...new Set(actionLogs.map((log) => log.module))], [actionLogs]);

  const filteredActions = useMemo(
    () =>
      actionLogs.filter((log) => {
        const userName = log.user?.fullName || log.user?.username || '';
        const matchSearch =
          !search ||
          userName.toLowerCase().includes(search.toLowerCase()) ||
          log.description.toLowerCase().includes(search.toLowerCase()) ||
          log.action.toLowerCase().includes(search.toLowerCase());
        const matchModule = !filterModule || log.module === filterModule;
        return matchSearch && matchModule;
      }),
    [actionLogs, filterModule, search],
  );

  const filteredErrors = useMemo(
    () =>
      errorLogs.filter((log) => {
        const matchSearch =
          !search ||
          log.path.toLowerCase().includes(search.toLowerCase()) ||
          log.message.toLowerCase().includes(search.toLowerCase()) ||
          log.method.toLowerCase().includes(search.toLowerCase());
        return matchSearch;
      }),
    [errorLogs, search],
  );

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader title="Tizim Loglari" subtitle="Foydalanuvchi harakatlari va tizim xatolari" icon={<ScrollText size={20} />} />

      <div className="flex gap-1.5 p-1 bg-slate-100 rounded-xl w-fit">
        <button
          onClick={() => setTab('ACTION')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === 'ACTION' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Clock size={16} /> Harakatlar
        </button>
        <button
          onClick={() => setTab('ERROR')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === 'ERROR' ? 'bg-white shadow-sm text-rose-600' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <AlertOctagon size={16} /> Xatolar
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="flex flex-wrap gap-3 p-4 border-b border-slate-100">
          <div className="relative flex-1 min-w-48">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Qidirish..."
              className="input-field pl-9"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          {tab === 'ACTION' && (
            <select className="select-field w-auto" value={filterModule} onChange={(event) => setFilterModule(event.target.value)}>
              <option value="">Barcha modullar</option>
              {modules.map((module) => (
                <option key={module} value={module}>
                  {module}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            {tab === 'ACTION' ? (
              <>
                <thead className="table-head">
                  <tr>
                    <th className="table-cell w-48">Sana</th>
                    <th className="table-cell">Foydalanuvchi</th>
                    <th className="table-cell">Modul</th>
                    <th className="table-cell">Harakat</th>
                    <th className="table-cell">IP Manzil</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredActions.length === 0 ? (
                    <tr>
                      <td colSpan={5}>
                        <EmptyState icon={<ScrollText />} title="Log topilmadi" />
                      </td>
                    </tr>
                  ) : (
                    filteredActions.map((log) => (
                      <tr key={log.id} className="table-row">
                        <td className="table-cell text-slate-500 text-xs">{formatDate(log.createdAt)}</td>
                        <td className="table-cell">
                          <span className="font-medium text-slate-800 text-sm">{log.user?.fullName || log.user?.username || 'Unknown'}</span>
                          <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">{log.user?.role || log.role || '-'}</span>
                        </td>
                        <td className="table-cell">
                          <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">{log.module}</span>
                        </td>
                        <td className="table-cell text-sm text-slate-700">{log.description}</td>
                        <td className="table-cell text-xs text-slate-400 font-mono">{log.ipAddress || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </>
            ) : (
              <>
                <thead className="table-head">
                  <tr>
                    <th className="table-cell w-48">Sana</th>
                    <th className="table-cell">Foydalanuvchi</th>
                    <th className="table-cell">Yo'l / Metod</th>
                    <th className="table-cell">Xato xabari</th>
                    <th className="table-cell">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredErrors.length === 0 ? (
                    <tr>
                      <td colSpan={5}>
                        <EmptyState icon={<AlertOctagon />} title="Xato topilmadi" />
                      </td>
                    </tr>
                  ) : (
                    filteredErrors.map((log) => (
                      <tr key={log.id} className="table-row">
                        <td className="table-cell text-slate-500 text-xs">{formatDate(log.createdAt)}</td>
                        <td className="table-cell text-slate-800 text-sm">{log.user?.fullName || log.user?.username || 'Tizim'}</td>
                        <td className="table-cell">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-500">{log.method}</span>
                            <span className="text-xs font-mono text-slate-600">{log.path}</span>
                          </div>
                        </td>
                        <td className="table-cell text-sm text-rose-600 max-w-md truncate">{log.message}</td>
                        <td className="table-cell">
                          <span className="text-xs font-bold text-rose-700 bg-rose-100 px-2 py-1 rounded-md">{log.statusCode}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
