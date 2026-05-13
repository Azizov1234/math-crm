import { useEffect, useState } from 'react';
import { Search, Filter, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface DebtorFilterState {
  search: string;
  groupId: string;
  courseId: string;
  teacherId: string;
  minDebt: string;
  maxDebt: string;
  minOverdueDays: string;
  maxOverdueDays: string;
}

interface FilterProps {
  filters: DebtorFilterState;
  onChange: (filters: DebtorFilterState) => void;
  groups: any[];
  courses: any[];
  teachers: any[];
}

export default function DebtorFilters({ filters, onChange, groups, courses, teachers }: FilterProps) {
  const [localSearch, setLocalSearch] = useState(filters.search);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== filters.search) {
        onChange({ ...filters, search: localSearch });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, filters, onChange]);

  const handleChange = (key: keyof DebtorFilterState, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    setLocalSearch('');
    onChange({
      search: '',
      groupId: '',
      courseId: '',
      teacherId: '',
      minDebt: '',
      maxDebt: '',
      minOverdueDays: '',
      maxOverdueDays: '',
    });
  };

  const filterInputCls = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Filter className="h-5 w-5 text-slate-400" />
        <h3 className="font-semibold text-slate-700">Filterlar</h3>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        <div className="relative col-span-1 sm:col-span-2 md:col-span-3 lg:col-span-1 xl:col-span-2">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="O'quvchi ismi, tel..."
            className={`${filterInputCls} pl-9`}
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
          />
        </div>

        <select
          className={filterInputCls}
          value={filters.groupId}
          onChange={(e) => handleChange('groupId', e.target.value)}
        >
          <option value="">Barcha guruhlar</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>

        <select
          className={filterInputCls}
          value={filters.courseId}
          onChange={(e) => handleChange('courseId', e.target.value)}
        >
          <option value="">Barcha kurslar</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <select
          className={filterInputCls}
          value={filters.teacherId}
          onChange={(e) => handleChange('teacherId', e.target.value)}
        >
          <option value="">Barcha o'qituvchilar</option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>{t.fullName}</option>
          ))}
        </select>

        <input
          type="number"
          placeholder="Min qarz"
          className={filterInputCls}
          value={filters.minDebt}
          onChange={(e) => handleChange('minDebt', e.target.value)}
        />
        <input
          type="number"
          placeholder="Max qarz"
          className={filterInputCls}
          value={filters.maxDebt}
          onChange={(e) => handleChange('maxDebt', e.target.value)}
        />
        <input
          type="number"
          placeholder="Min kechikish (kun)"
          className={filterInputCls}
          value={filters.minOverdueDays}
          onChange={(e) => handleChange('minOverdueDays', e.target.value)}
        />

        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Max kun"
            className={`${filterInputCls} flex-1`}
            value={filters.maxOverdueDays}
            onChange={(e) => handleChange('maxOverdueDays', e.target.value)}
          />
          <Button variant="outline" className="shrink-0" onClick={clearFilters} title="Tozalash">
            <RefreshCw size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}
