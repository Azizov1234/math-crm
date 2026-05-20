import { useEffect, useRef, useMemo, useState, type FormEvent } from 'react';
import { Plus, Search, Edit, CreditCard, Filter, Trash2, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { groupsApi } from '@/api/groups.api';
import { getErrorMessage } from '@/api/http';
import { paymentsApi } from '@/api/payments.api';
import { studentsApi } from '@/api/students.api';
import PageHeader from '@/components/common/PageHeader';
import StatusBadge from '@/components/common/StatusBadge';
import ActionMenu from '@/components/common/ActionMenu';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import EmptyState from '@/components/common/EmptyState';
import { Field, FormActions, inputCls, Modal, selectCls } from '@/components/common/Modal';
import StatCard from '@/components/common/StatCard';
import { formatMoney } from '@/utils/formatMoney';
import { formatDate } from '@/utils/formatDate';

type PaymentRow = {
  id: string;
  studentId?: string;
  studentName: string;
  groupId?: string;
  groupName: string;
  courseId?: string;
  courseName: string;
  amount: number;
  monthlyFee: number;
  paymentStatus: 'PAID' | 'PARTIAL';
  method: 'CASH' | 'CARD' | 'TRANSFER';
  paidDate?: string;
  nextPaymentDate?: string;
  note?: string;
  createdBy: string;
};

type StudentOption = {
  id: string;
  fullName: string;
  phone: string;
  groupIds: string[];
};

function getPaymentStatus(amount: number, monthlyFee: number): 'PAID' | 'PARTIAL' {
  if (monthlyFee > 0 && amount < monthlyFee) {
    return 'PARTIAL';
  }
  return 'PAID';
}

function mapPayment(item: any): PaymentRow {
  const amount = Number(item.amount ?? 0);
  const monthlyFee = Number(item.billing?.monthlyFee ?? item.group?.monthlyFee ?? 0);
  return {
    id: item.id,
    studentId: item.student?.id,
    studentName: item.student?.fullName ?? '-',
    groupId: item.group?.id,
    groupName: item.group?.name ?? '-',
    courseId: item.group?.course?.id,
    courseName: item.group?.course?.name ?? '-',
    amount,
    monthlyFee,
    paymentStatus: getPaymentStatus(amount, monthlyFee),
    method: item.method,
    paidDate: item.paidAt,
    nextPaymentDate: item.nextPaymentDate,
    note: item.note,
    createdBy: item.createdBy?.fullName ?? item.createdBy?.username ?? '-',
  };
}

function normalizeMoneyInput(value: string) {
  return value.replace(/[^\d]/g, '');
}

function toMoneyInputValue(value: number | null | undefined) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return '0';
  }
  return String(Math.round(numeric));
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [summary, setSummary] = useState({
    cashTotal: 0,
    cardTotal: 0,
    transferTotal: 0,
  });
  const [search, setSearch] = useState('');
  const [filterMethod, setFilterMethod] = useState('');
  const [filterCourse, setFilterCourse] = useState('');
  const [loading, setLoading] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [expandedPaymentId, setExpandedPaymentId] = useState<string | null>(null);
  const [deletePaymentId, setDeletePaymentId] = useState<string | null>(null);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [studentSearchResults, setStudentSearchResults] = useState<StudentOption[] | null>(null);
  const [studentSearchLoading, setStudentSearchLoading] = useState(false);
  const [groups, setGroups] = useState<Array<{ id: string; name: string; startDate?: string; endDate?: string | null; monthlyFee?: number }>>([]);
  const [groupMonths, setGroupMonths] = useState<Array<{ month: number; year: number; label: string }>>([]);
  const [paidMonths, setPaidMonths] = useState<Set<string>>(new Set());
  const [monthsLoading, setMonthsLoading] = useState(false);
  const [createForm, setCreateForm] = useState({
    studentId: '',
    groupId: '',
    amount: '',
    method: 'CASH',
    paidAt: '',
    paymentMonth: String(new Date().getMonth() + 1),
    paymentYear: String(new Date().getFullYear()),
    note: '',
  });
  const [editForm, setEditForm] = useState({
    studentName: '',
    groupName: '',
    amount: '',
    method: 'CASH',
    paidAt: '',
    note: '',
  });
  const [studentHistoryOpen, setStudentHistoryOpen] = useState(false);
  const [studentHistoryLoading, setStudentHistoryLoading] = useState(false);
  const [studentHistoryName, setStudentHistoryName] = useState('');
  const [studentHistoryRows, setStudentHistoryRows] = useState<PaymentRow[]>([]);

  // Dropdown open/close states
  const [studentDropOpen, setStudentDropOpen] = useState(false);
  const [groupDropOpen, setGroupDropOpen] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [groupSearch, setGroupSearch] = useState('');
  const studentSearchRequestIdRef = useRef(0);
  const studentDropRef = useRef<HTMLDivElement>(null);
  const groupDropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (studentDropRef.current && !studentDropRef.current.contains(e.target as Node)) {
        setStudentDropOpen(false);
      }
      if (groupDropRef.current && !groupDropRef.current.contains(e.target as Node)) {
        setGroupDropOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const loadPayments = async () => {
    try {
      setLoading(true);
      const params: Record<string, any> = {
        page: 1,
        limit: 50,
      };

      if (search) params.search = search;
      if (filterMethod) params.method = filterMethod;
      if (filterCourse) params.courseId = filterCourse;

      const [list, summaryData] = await Promise.all([paymentsApi.getAll(params), paymentsApi.getSummary()]);
      setPayments((list.data ?? []).map(mapPayment));
      setSummary({
        cashTotal: Number(summaryData.cashTotal ?? 0),
        cardTotal: Number(summaryData.cardTotal ?? 0),
        transferTotal: Number(summaryData.transferTotal ?? 0),
      });
    } catch (error) {
      toast.error(getErrorMessage(error, "To'lovlarni yuklashda xatolik"));
    } finally {
      setLoading(false);
    }
  };

  const loadCreateOptions = async () => {
    try {
      setOptionsLoading(true);
      const [studentsResponse, groupsResponse] = await Promise.all([
        studentsApi.getAll({ page: 1, limit: 100, status: 'ACTIVE' }),
        groupsApi.getAll({ page: 1, limit: 100, status: 'ACTIVE' }),
      ]);

      setStudents(
        (studentsResponse.data ?? []).map((item: any) => ({
          id: item.id,
          fullName: item.fullName,
          phone: item.phone ?? '',
          groupIds: (item.groupMemberships ?? []).map((gm: any) => gm.groupId),
        })),
      );

      setGroups(
        (groupsResponse.data ?? []).map((item: any) => ({
          id: item.id,
          name: item.name,
          startDate: item.startDate,
          endDate: item.endDate ?? null,
          monthlyFee: item.monthlyFee,
        })),
      );
    } catch (error) {
      toast.error(getErrorMessage(error, "Forma ma'lumotlarini yuklashda xatolik"));
      console.error(error);
    } finally {
      setOptionsLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filterMethod, filterCourse]);

  useEffect(() => {
    if (!createOpen) {
      return;
    }

    const normalizedSearch = studentSearch.trim();
    if (!normalizedSearch) {
      setStudentSearchResults(null);
      setStudentSearchLoading(false);
      return;
    }

    const requestId = ++studentSearchRequestIdRef.current;
    setStudentSearchLoading(true);

    const timer = window.setTimeout(async () => {
      try {
        const response = await studentsApi.getAll({
          page: 1,
          limit: 100,
          status: 'ACTIVE',
          search: normalizedSearch,
        });
        if (studentSearchRequestIdRef.current !== requestId) {
          return;
        }
        setStudentSearchResults(
          (response.data ?? []).map((item: any) => ({
            id: item.id,
            fullName: item.fullName,
            phone: item.phone ?? '',
            groupIds: (item.groupMemberships ?? []).map((gm: any) => gm.groupId),
          })),
        );
      } catch (error) {
        if (studentSearchRequestIdRef.current === requestId) {
          setStudentSearchResults([]);
        }
      } finally {
        if (studentSearchRequestIdRef.current === requestId) {
          setStudentSearchLoading(false);
        }
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [createOpen, studentSearch]);

  useEffect(() => {
    if (expandedPaymentId && !payments.some((payment) => payment.id === expandedPaymentId)) {
      setExpandedPaymentId(null);
    }
  }, [payments, expandedPaymentId]);

  const MONTH_NAMES = ['Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentabr','Oktabr','Noyabr','Dekabr'];

  // Generate months between startDate and endDate
  const generateGroupMonths = (startDate: string, endDate: string | null) => {
    const start = new Date(startDate);
    const today = new Date();
    const startMonth = new Date(start.getFullYear(), start.getMonth(), 1);
    const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const defaultEndByCurrent = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 12, 0);
    const end = endDate ? new Date(endDate) : defaultEndByCurrent;
    if (end < startMonth) {
      return [];
    }

    const months: Array<{ month: number; year: number; label: string }> = [];
    const cur = new Date(startMonth.getFullYear(), startMonth.getMonth(), 1);
    while (cur <= end) {
      months.push({
        month: cur.getMonth() + 1,
        year: cur.getFullYear(),
        label: `${MONTH_NAMES[cur.getMonth()]} ${cur.getFullYear()}`,
      });
      cur.setMonth(cur.getMonth() + 1);
    }
    return months;
  };

  // When student + group both selected, load paid months
  useEffect(() => {
    const { studentId, groupId } = createForm;
    if (!studentId || !groupId) {
      setPaidMonths(new Set());
      const grp = groups.find(g => g.id === groupId);
      if (grp?.startDate) setGroupMonths(generateGroupMonths(grp.startDate, grp.endDate ?? null));
      else setGroupMonths([]);
      return;
    }
    const grp = groups.find(g => g.id === groupId);
    if (grp?.startDate) setGroupMonths(generateGroupMonths(grp.startDate, grp.endDate ?? null));
    setMonthsLoading(true);
    paymentsApi.getByStudent(studentId)
      .then((list: any[]) => {
        const paidByMonth = new Map<string, number>();
        const groupMonthlyFee = Number(grp?.monthlyFee ?? 0);
        (list ?? []).forEach((p: any) => {
          if (p.groupId === groupId && p.paymentForMonth && p.paymentForYear && !p.deletedAt) {
            const key = `${p.paymentForYear}-${p.paymentForMonth}`;
            const current = paidByMonth.get(key) ?? 0;
            paidByMonth.set(key, current + Number(p.amount ?? 0));
          }
        });
        const fullyPaid = new Set<string>();
        paidByMonth.forEach((amountPaid, key) => {
          if (groupMonthlyFee > 0 ? amountPaid >= groupMonthlyFee : amountPaid > 0) {
            fullyPaid.add(key);
          }
        });
        setPaidMonths(fullyPaid);
      })
      .catch(() => {})
      .finally(() => setMonthsLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createForm.studentId, createForm.groupId]);

  // When group selected (without student), still show months
  useEffect(() => {
    const grp = groups.find(g => g.id === createForm.groupId);
    if (grp?.startDate) setGroupMonths(generateGroupMonths(grp.startDate, grp.endDate ?? null));
    else setGroupMonths([]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createForm.groupId, groups]);

  const courses = useMemo(
    () =>
      Array.from(new Map(payments.filter((payment) => payment.courseId).map((payment) => [payment.courseId, payment])).values()),
    [payments],
  );
  const totalAmount = useMemo(() => payments.reduce((sum, payment) => sum + payment.amount, 0), [payments]);

  // Derived filtered lists for dropdowns
  const combinedStudents = useMemo(() => {
    const map = new Map<string, StudentOption>();
    students.forEach((student) => map.set(student.id, student));
    (studentSearchResults ?? []).forEach((student) => map.set(student.id, student));
    return Array.from(map.values());
  }, [students, studentSearchResults]);

  const studentOptionsSource = studentSearchResults ?? students;

  const availableStudentsForDropdown = createForm.groupId
    ? studentOptionsSource.filter((s) => s.groupIds.includes(createForm.groupId))
    : studentOptionsSource;

  const availableGroupsForDropdown = createForm.studentId
    ? groups.filter((g) => combinedStudents.find((s) => s.id === createForm.studentId)?.groupIds.includes(g.id))
    : groups;

  const normalizedStudentSearch = studentSearch.trim().toLowerCase();
  const visibleStudentsForDropdown = availableStudentsForDropdown.filter((student) => {
    if (!normalizedStudentSearch) {
      return true;
    }
    return (
      student.fullName.toLowerCase().includes(normalizedStudentSearch) ||
      student.phone.toLowerCase().includes(normalizedStudentSearch)
    );
  });

  const openCreateModal = async () => {
    const now = new Date();
    setCreateForm({
      studentId: '',
      groupId: '',
      amount: '',
      method: 'CASH',
      paidAt: '',
      paymentMonth: String(now.getMonth() + 1),
      paymentYear: String(now.getFullYear()),
      note: '',
    });
    setGroupMonths([]);
    setPaidMonths(new Set());
    setStudentSearch('');
    setStudentSearchResults(null);
    setStudentSearchLoading(false);
    setGroupSearch('');
    setStudentDropOpen(false);
    setGroupDropOpen(false);
    await loadCreateOptions();
    setCreateOpen(true);
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setCreateLoading(true);
      const paidAtDate = createForm.paidAt ? new Date(createForm.paidAt) : new Date();
      await paymentsApi.create({
        studentId: createForm.studentId,
        groupId: createForm.groupId,
        amount: Number(createForm.amount),
        method: createForm.method,
        paidAt: paidAtDate.toISOString(),
        paymentForMonth: Number(createForm.paymentMonth),
        paymentForYear: Number(createForm.paymentYear),
        note: createForm.note.trim() || undefined,
      });
      toast.success("To'lov qo'shildi");
      setCreateOpen(false);
      await loadPayments();
    } catch (error) {
      toast.error(getErrorMessage(error, "To'lov qo'shishda xatolik"));
    } finally {
      setCreateLoading(false);
    }
  };

  const openEditModal = async (payment: PaymentRow) => {
    try {
      const fullPayment = await paymentsApi.getById(payment.id);
      const mapped = mapPayment(fullPayment);
      setEditingPaymentId(mapped.id);
      setEditForm({
        studentName: mapped.studentName,
        groupName: mapped.groupName,
        amount: toMoneyInputValue(mapped.amount),
        method: mapped.method,
        paidAt: mapped.paidDate ? mapped.paidDate.slice(0, 10) : '',
        note: mapped.note ?? '',
      });
    } catch (error) {
      toast.error(getErrorMessage(error, "To'lov ma'lumotini yuklashda xatolik"));
      setEditingPaymentId(payment.id);
      setEditForm({
        studentName: payment.studentName,
        groupName: payment.groupName,
        amount: toMoneyInputValue(payment.amount),
        method: payment.method,
        paidAt: payment.paidDate ? payment.paidDate.slice(0, 10) : '',
        note: payment.note ?? '',
      });
    } finally {
      setEditOpen(true);
    }
  };

  const openStudentHistory = async (payment: PaymentRow) => {
    if (!payment.studentId) {
      toast.error("O'quvchi ID topilmadi");
      return;
    }

    try {
      setStudentHistoryOpen(true);
      setStudentHistoryLoading(true);
      setStudentHistoryName(payment.studentName);
      const response = await paymentsApi.getByStudent(payment.studentId);
      setStudentHistoryRows((response ?? []).map(mapPayment));
    } catch (error) {
      toast.error(getErrorMessage(error, "O'quvchi to'lov tarixini yuklashda xatolik"));
      console.error(error);
    } finally {
      setStudentHistoryLoading(false);
    }
  };

  const handleUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingPaymentId) return;

    try {
      setEditLoading(true);
      await paymentsApi.update(editingPaymentId, {
        amount: Number(editForm.amount),
        method: editForm.method,
        paidAt: editForm.paidAt ? new Date(editForm.paidAt).toISOString() : undefined,
        note: editForm.note.trim() || undefined,
      });

      toast.success("To'lov yangilandi");
      setEditOpen(false);
      await loadPayments();
    } catch (error) {
      toast.error(getErrorMessage(error, "To'lovni yangilashda xatolik"));
      console.error(error);
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletePaymentId) return;
    try {
      await paymentsApi.delete(deletePaymentId);
      toast.success("To'lov o'chirildi");
      setDeletePaymentId(null);
      await loadPayments();
    } catch (error) {
      toast.error(getErrorMessage(error, "To'lovni o'chirishda xatolik"));
      console.error(error);
    }
  };

  const filteredStudents = useMemo(() => students, [students]);

  const filteredGroups = useMemo(() => groups, [groups]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="To'lovlar"
        subtitle={`Jami ${payments.length} ta to'lov, ${formatMoney(totalAmount)}`}
        icon={<CreditCard size={20} />}
        actions={
          <button className="btn-primary" onClick={openCreateModal}>
            <Plus size={16} /> To'lov qo'shish
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Jami naqd to'lovlar" value={summary.cashTotal} icon={<CreditCard />} isMoney color="emerald" />
        <StatCard title="Jami karta orqali" value={summary.cardTotal} icon={<CreditCard />} isMoney color="indigo" />
        <StatCard title="Jami o'tkazma" value={summary.transferTotal} icon={<CreditCard />} isMoney color="amber" />
      </div>

      <div className="card overflow-hidden">
        <div className="flex flex-wrap gap-3 p-4 border-b border-slate-100">
          <div className="relative flex-1 min-w-48">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="O'quvchi ismi..."
              className="input-field pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select className="select-field w-auto" value={filterCourse} onChange={(e) => setFilterCourse(e.target.value)}>
            <option value="">Barcha kurslar</option>
            {courses.map((course) => (
              <option key={course.courseId} value={course.courseId}>
                {course.courseName}
              </option>
            ))}
          </select>
          <select className="select-field w-auto" value={filterMethod} onChange={(e) => setFilterMethod(e.target.value)}>
            <option value="">Barcha usullar</option>
            <option value="CASH">Naqd</option>
            <option value="CARD">Karta</option>
            <option value="TRANSFER">O'tkazma</option>
          </select>
        </div>

        <div className="md:hidden divide-y divide-slate-100">
          {!loading && payments.length === 0 ? (
            <EmptyState icon={<CreditCard />} title="To'lov topilmadi" />
          ) : (
            payments.slice(0, 50).map((payment) => {
              const isExpanded = expandedPaymentId === payment.id;

              return (
                <div key={payment.id} className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white flex-shrink-0">
                      <CreditCard size={18} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-800 text-sm truncate">{payment.studentName}</p>
                      <p className="text-xs font-bold text-emerald-600 truncate">{formatMoney(payment.amount)}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <StatusBadge status={payment.paymentStatus} size="sm" />
                      <button
                        type="button"
                        onClick={() => setExpandedPaymentId(isExpanded ? null : payment.id)}
                        aria-expanded={isExpanded}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 text-slate-500"
                      >
                        <ChevronDown size={16} className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 space-y-3 animate-fade-in">
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="rounded-xl bg-slate-50 px-3 py-2">
                          <p className="text-slate-400 mb-1">Guruh</p>
                          <p className="font-medium text-slate-700">{payment.groupName}</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 px-3 py-2">
                          <p className="text-slate-400 mb-1">Usul</p>
                          <p className="font-medium text-slate-700">{payment.method}</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 px-3 py-2">
                          <p className="text-slate-400 mb-1">Sana</p>
                          <p className="font-medium text-slate-700">{payment.paidDate ? formatDate(payment.paidDate) : '-'}</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 px-3 py-2">
                          <p className="text-slate-400 mb-1">Qabul qildi</p>
                          <p className="font-medium text-slate-700">{payment.createdBy}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => openStudentHistory(payment)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-medium"
                        >
                          <CreditCard size={13} />
                          Tarixi
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(payment)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-medium"
                        >
                          <Edit size={13} />
                          Tahrirlash
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletePaymentId(payment.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-rose-200 bg-rose-50 text-rose-600 text-xs font-medium"
                        >
                          <Trash2 size={13} />
                          O'chirish
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="table-head">
              <tr>
                <th className="table-cell">O'quvchi</th>
                <th className="table-cell">Guruh / Kurs</th>
                <th className="table-cell">Miqdor</th>
                <th className="table-cell">Usul</th>
                <th className="table-cell">Sana</th>
                <th className="table-cell">Keyingi to'lov</th>
                <th className="table-cell">Qabul qildi</th>
                <th className="table-cell text-right">Amallar</th>
              </tr>
            </thead>
            <tbody>
              {!loading && payments.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <EmptyState icon={<CreditCard />} title="To'lov topilmadi" />
                  </td>
                </tr>
              ) : (
                payments.slice(0, 50).map((payment) => (
                  <tr key={payment.id} className="table-row">
                    <td className="table-cell font-medium text-slate-800">{payment.studentName}</td>
                    <td className="table-cell">
                      <p className="text-sm font-medium text-slate-700">{payment.groupName}</p>
                      <p className="text-xs text-slate-400">{payment.courseName}</p>
                    </td>
                    <td className="table-cell font-semibold text-emerald-700">{formatMoney(payment.amount)}</td>
                    <td className="table-cell">
                      <StatusBadge status={payment.paymentStatus} size="sm" />
                      <span className="ml-2 text-xs text-slate-500">{payment.method}</span>
                    </td>
                    <td className="table-cell text-slate-600">{payment.paidDate ? formatDate(payment.paidDate) : '-'}</td>
                    <td className="table-cell text-slate-500">{payment.nextPaymentDate ? formatDate(payment.nextPaymentDate) : '-'}</td>
                    <td className="table-cell text-slate-600 text-xs">{payment.createdBy}</td>
                    <td className="table-cell text-right">
                      <ActionMenu
                        actions={[
                          { label: "Chekni ko'rish", icon: <Filter size={14} />, onClick: () => openEditModal(payment) },
                          { label: "O'quvchi tarixi", icon: <CreditCard size={14} />, onClick: () => openStudentHistory(payment) },
                          { label: 'Tahrirlash', icon: <Edit size={14} />, onClick: () => openEditModal(payment) },
                          { label: "O'chirish", icon: <Trash2 size={14} />, onClick: () => setDeletePaymentId(payment.id), variant: 'danger' },
                        ]}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-400 text-center bg-slate-50">
          Oxirgi 50 ta to'lov ko'rsatilmoqda (Jami {payments.length})
        </div>
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Yangi to'lov qo'shish">
        <form onSubmit={handleCreate} className="space-y-4">

          {/* O'quvchi - yopiladigan dropdown */}
          <Field label="O'quvchi" required>
            <div ref={studentDropRef} className="space-y-1">
              <button
                type="button"
                onClick={() => setStudentDropOpen((v) => !v)}
                className={`w-full flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm transition ${
                  studentDropOpen ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <span className={createForm.studentId ? 'font-semibold text-slate-800' : 'text-slate-400'}>
                  {createForm.studentId
                    ? combinedStudents.find((s) => s.id === createForm.studentId)?.fullName
                    : optionsLoading ? 'Yuklanmoqda...' : "O'quvchi tanlang..."}
                </span>
                <ChevronDown size={16} className={`text-slate-400 transition-transform duration-200 ${studentDropOpen ? 'rotate-180' : ''}`} />
              </button>
              {studentDropOpen && (
                <div className="rounded-xl border border-slate-200 bg-white shadow-lg z-10">
                  <div className="p-2 border-b border-slate-100">
                    <div className="relative">
                      <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs outline-none focus:border-indigo-400"
                        placeholder="Ism yoki telefon bo'yicha..."
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="max-h-44 overflow-y-auto p-1.5 space-y-0.5">
                    {studentSearchLoading && (
                      <p className="px-3 py-2 text-xs text-slate-400">Qidirilmoqda...</p>
                    )}
                    {visibleStudentsForDropdown.map((student) => (
                        <button
                          type="button"
                          key={student.id}
                          onClick={() => {
                            setCreateForm((prev) => ({ ...prev, studentId: student.id }));
                            setStudentDropOpen(false);
                          }}
                          className={`w-full text-left rounded-lg px-3 py-2 text-xs font-medium transition ${
                            createForm.studentId === student.id ? 'bg-indigo-600 text-white' : 'text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {student.fullName}
                        </button>
                      ))}
                    {!studentSearchLoading && visibleStudentsForDropdown.length === 0 && (
                      <p className="px-3 py-2 text-xs text-slate-400">O'quvchi topilmadi</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Field>

          {/* Guruh - yopiladigan dropdown */}
          <Field label="Guruh" required>
            <div ref={groupDropRef} className="space-y-1">
              <button
                type="button"
                onClick={() => setGroupDropOpen((v) => !v)}
                className={`w-full flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm transition ${
                  groupDropOpen ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <span className={createForm.groupId ? 'font-semibold text-slate-800' : 'text-slate-400'}>
                  {createForm.groupId
                    ? groups.find((g) => g.id === createForm.groupId)?.name
                    : optionsLoading ? 'Yuklanmoqda...' : 'Guruh tanlang...'}
                </span>
                <ChevronDown size={16} className={`text-slate-400 transition-transform duration-200 ${groupDropOpen ? 'rotate-180' : ''}`} />
              </button>
              {groupDropOpen && (
                <div className="rounded-xl border border-slate-200 bg-white shadow-lg z-10">
                  <div className="p-2 border-b border-slate-100">
                    <div className="relative">
                      <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs outline-none focus:border-indigo-400"
                        placeholder="Guruh nomini qidiring..."
                        value={groupSearch}
                        onChange={(e) => setGroupSearch(e.target.value)}
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="max-h-44 overflow-y-auto p-1.5 space-y-0.5">
                    {availableGroupsForDropdown
                      .filter((g) => g.name.toLowerCase().includes(groupSearch.toLowerCase()))
                      .map((group) => (
                        <button
                          type="button"
                          key={group.id}
                          onClick={() => {
                            const grp = availableGroupsForDropdown.find(g => g.id === group.id);
                            setCreateForm((prev) => ({ 
                              ...prev, 
                              groupId: group.id,
                              amount: grp?.monthlyFee != null ? toMoneyInputValue(grp.monthlyFee) : prev.amount
                            }));
                            setGroupDropOpen(false);
                          }}
                          className={`w-full text-left rounded-lg px-3 py-2 text-xs font-medium transition ${
                            createForm.groupId === group.id ? 'bg-indigo-600 text-white' : 'text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {group.name}
                        </button>
                      ))}
                    {availableGroupsForDropdown.filter((g) => g.name.toLowerCase().includes(groupSearch.toLowerCase())).length === 0 && (
                      <p className="px-3 py-2 text-xs text-slate-400">Guruh topilmadi</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Miqdor" required>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                className={inputCls}
                value={createForm.amount}
                onWheel={(event) => (event.currentTarget as HTMLInputElement).blur()}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, amount: normalizeMoneyInput(event.target.value) }))}
                required
              />
            </Field>

            <Field label="Usul" required>
              <select
                className={selectCls}
                value={createForm.method}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, method: event.target.value }))}
              >
                <option value="CASH">Naqd</option>
                <option value="CARD">Karta</option>
                <option value="TRANSFER">O'tkazma</option>
              </select>
            </Field>
          </div>

          <Field label="To'lov sanasi">
            <input
              type="date"
              className={inputCls}
              value={createForm.paidAt}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, paidAt: event.target.value }))}
            />
          </Field>

          {/* Qaysi oy uchun - guruh oylik gridi */}
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Qaysi oy uchun to'lov?</p>
              {monthsLoading && <span className="text-xs text-amber-500 animate-pulse">Yuklanmoqda...</span>}
            </div>

            {!createForm.groupId ? (
              <p className="text-xs text-amber-600 italic">Avval guruh tanlang</p>
            ) : groupMonths.length === 0 ? (
              <p className="text-xs text-amber-600 italic">Bu guruh uchun oylar aniqlanmadi</p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
	                  {groupMonths.map(({ month, year, label }) => {
	                    const key = `${year}-${month}`;
	                    const isPaid = paidMonths.has(key);
	                    const monthStartTs = new Date(year, month - 1, 1).getTime();
	                    const currentMonthStartTs = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
	                    const isPastPeriod = monthStartTs < currentMonthStartTs;
	                    const isDisabled = isPaid || isPastPeriod;
	                    const isSelected = createForm.paymentMonth === String(month) && createForm.paymentYear === String(year);
                    return (
                      <button
                        type="button"
                        key={key}
	                        disabled={isDisabled}
	                        title={isPaid ? `${label} - allaqachon to'langan` : isPastPeriod ? `${label} - oldingi oy, tanlab bo'lmaydi` : label}
	                        onClick={() => {
	                          if (isPaid) {
	                            toast.warning(`${label} oyi uchun to'lov allaqachon amalga oshirilgan!`);
	                            return;
	                          }
	                          if (isPastPeriod) {
	                            toast.warning(`${label} oyi eski davrga tegishli, tanlab bo'lmaydi`);
	                            return;
	                          }
	                          setCreateForm((prev) => ({
                            ...prev,
                            paymentMonth: String(month),
                            paymentYear: String(year),
                          }));
                        }}
	                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
	                          isPaid
	                            ? 'border-emerald-300 bg-emerald-100 text-emerald-600 cursor-not-allowed opacity-70 line-through'
	                            : isPastPeriod
	                            ? 'border-slate-300 bg-slate-100 text-slate-500 cursor-not-allowed opacity-80'
	                            : isSelected
	                            ? 'border-amber-600 bg-amber-600 text-white shadow-sm'
	                            : 'border-amber-200 bg-white text-slate-700 hover:border-amber-400 hover:bg-amber-50'
	                        }`}
                      >
                        {label}
	                        {isPaid && <span className="ml-1 text-emerald-500">OK</span>}
                      </button>
                    );
                  })}
                </div>
                {createForm.paymentMonth && createForm.paymentYear && (
                  <p className="text-xs text-amber-700">
                    Tanlangan:{' '}
                    <span className="font-bold">
                      {MONTH_NAMES[Number(createForm.paymentMonth) - 1]} {createForm.paymentYear}
                    </span>
                  </p>
                )}
	                {createForm.studentId && (
	                  <p className="text-xs text-slate-500">
	                    <span className="inline-block w-3 h-3 rounded-sm bg-emerald-200 border border-emerald-300 mr-1 align-middle" />
	                    To'langan oylar - tanlab bo'lmaydi
	                  </p>
	                )}
	                <p className="text-xs text-slate-500">
	                  <span className="inline-block w-3 h-3 rounded-sm bg-slate-200 border border-slate-300 mr-1 align-middle" />
	                  Eski oylar - faqat ko'rinadi, tanlab bo'lmaydi
	                </p>
	              </>
	            )}
          </div>


          <Field label="Izoh">
            <textarea
              className={inputCls}
              rows={2}
              value={createForm.note}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, note: event.target.value }))}
            />
          </Field>

          <FormActions onCancel={() => setCreateOpen(false)} loading={createLoading} submitLabel="Saqlash" />
        </form>
      </Modal>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="To'lovni tahrirlash">
        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="O'quvchi">
              <input className={inputCls} value={editForm.studentName} readOnly />
            </Field>

            <Field label="Guruh">
              <input className={inputCls} value={editForm.groupName} readOnly />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Miqdor" required>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                className={inputCls}
                value={editForm.amount}
                onWheel={(event) => (event.currentTarget as HTMLInputElement).blur()}
                onChange={(event) => setEditForm((prev) => ({ ...prev, amount: normalizeMoneyInput(event.target.value) }))}
                required
              />
            </Field>

            <Field label="Usul" required>
              <select
                className={selectCls}
                value={editForm.method}
                onChange={(event) => setEditForm((prev) => ({ ...prev, method: event.target.value }))}
              >
                <option value="CASH">Naqd</option>
                <option value="CARD">Karta</option>
                <option value="TRANSFER">O'tkazma</option>
              </select>
            </Field>
          </div>

          <Field label="To'lov sanasi">
            <input
              type="date"
              className={inputCls}
              value={editForm.paidAt}
              onChange={(event) => setEditForm((prev) => ({ ...prev, paidAt: event.target.value }))}
            />
          </Field>

          <Field label="Izoh">
            <textarea
              className={inputCls}
              rows={2}
              value={editForm.note}
              onChange={(event) => setEditForm((prev) => ({ ...prev, note: event.target.value }))}
            />
          </Field>

          <FormActions onCancel={() => setEditOpen(false)} loading={editLoading} submitLabel="Yangilash" />
        </form>
      </Modal>

      <Modal open={studentHistoryOpen} onClose={() => setStudentHistoryOpen(false)} title={`${studentHistoryName} to'lov tarixi`} size="lg">
        {studentHistoryLoading ? (
          <p className="py-8 text-center text-sm text-slate-500">Yuklanmoqda...</p>
        ) : studentHistoryRows.length === 0 ? (
          <EmptyState icon={<CreditCard />} title="To'lovlar topilmadi" />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full">
              <thead className="table-head">
                <tr>
                  <th className="table-cell">Guruh</th>
                  <th className="table-cell">Miqdor</th>
                  <th className="table-cell">Usul</th>
                  <th className="table-cell">Sana</th>
                </tr>
              </thead>
              <tbody>
                {studentHistoryRows.map((row) => (
                  <tr key={row.id} className="table-row">
                    <td className="table-cell">{row.groupName}</td>
                    <td className="table-cell font-semibold text-emerald-700">{formatMoney(row.amount)}</td>
                    <td className="table-cell">{row.method}</td>
                    <td className="table-cell">{row.paidDate ? formatDate(row.paidDate) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deletePaymentId}
        onClose={() => setDeletePaymentId(null)}
        onConfirm={handleDelete}
        title="To'lovni o'chirish"
        message="Bu to'lov o'chiriladi."
        confirmLabel="O'chirish"
        variant="danger"
      />
    </div>
  );
}
