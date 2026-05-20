import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BadgePercent, ChevronDown, CircleDollarSign, Clock, DollarSign, Gift, Layers, Pencil, Plus, Search, UserMinus, Users } from 'lucide-react';
import { toast } from 'sonner';
import { groupsApi, type BillingType } from '@/api/groups.api';
import { studentsApi } from '@/api/students.api';
import { getErrorMessage } from '@/api/http';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import EmptyState from '@/components/common/EmptyState';
import { inputCls, Modal } from '@/components/common/Modal';
import StatusBadge from '@/components/common/StatusBadge';
import { formatDate } from '@/utils/formatDate';
import { formatMoney } from '@/utils/formatMoney';

// UI da ko'rsatiladigan billing turlari (INDIVIDUAL olib tashlandi, DISCOUNTED bilan birlashtirildi)
type VisibleBillingType = 'DEFAULT' | 'DISCOUNTED' | 'FREE';

type StudentOption = {
  id: string;
  fullName: string;
  status: string;
  phone?: string | null;
};

type GroupStudentBilling = {
  monthlyFee: number;
  billingType: BillingType;
  discountReason?: string | null;
  note?: string | null;
};

type GroupStudentRow = {
  id: string;
  studentId: string;
  joinedAt?: string;
  status: string;
  student?: {
    id: string;
    fullName: string;
    phone?: string | null;
    status?: string;
  };
  billing?: GroupStudentBilling | null;
};

// Badge va karta uchun meta ma'lumotlari (INDIVIDUAL -> DISCOUNTED ga yo'naltirilgan)
const BILLING_META: Record<
  BillingType,
  {
    label: string;
    shortLabel: string;
    description: string;
    icon: typeof CircleDollarSign;
    cardClass: string;
    badgeClass: string;
  }
> = {
  DEFAULT: {
    label: 'Guruh narxi bo‘yicha',
    shortLabel: 'Guruh narxi',
    description: 'Guruhning standart oylik narxi ishlatiladi',
    icon: CircleDollarSign,
    cardClass: 'border-blue-200 bg-blue-50 text-blue-700',
    badgeClass: 'border-blue-200 bg-blue-50 text-blue-700',
  },
  // INDIVIDUAL eski ma'lumotlar uchun saqlanadi, UI da ko'rsatilmaydi
  INDIVIDUAL: {
    label: 'Imtiyozli narx',
    shortLabel: 'Imtiyozli',
    description: 'Maxsus narx qo‘llanadi',
    icon: BadgePercent,
    cardClass: 'border-amber-200 bg-amber-50 text-amber-700',
    badgeClass: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  DISCOUNTED: {
    label: 'Imtiyozli narx',
    shortLabel: 'Imtiyozli',
    description: 'Maxsus chegirma bilan oylik narx belgilanadi',
    icon: BadgePercent,
    cardClass: 'border-amber-200 bg-amber-50 text-amber-700',
    badgeClass: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  FREE: {
    label: 'Bepul',
    shortLabel: 'Bepul',
    description: 'Oylik to‘lov 0 so‘m bo‘ladi',
    icon: Gift,
    cardClass: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    badgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
};

// Foydalanuvchiga ko'rsatiladigan 3 ta variant (INDIVIDUAL olib tashlandi)
const VISIBLE_BILLING_TYPES: VisibleBillingType[] = ['DEFAULT', 'DISCOUNTED', 'FREE'];

function BillingTypeBadge({ type }: { type?: BillingType }) {
  // INDIVIDUAL ni DISCOUNTED kabi ko'rsatamiz (eski ma'lumotlar uchun)
  const resolvedType: BillingType = type === 'INDIVIDUAL' ? 'DISCOUNTED' : (type ?? 'DEFAULT');
  const meta = BILLING_META[resolvedType];
  return <span className={`inline-flex items-center rounded-lg border px-2 py-1 text-[11px] font-semibold ${meta.badgeClass}`}>{meta.shortLabel}</span>;
}

function normalizeMoneyInput(value: string) {
  return value.replace(/[^\d]/g, '');
}

export default function GroupDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [group, setGroup] = useState<any>(null);
  const [students, setStudents] = useState<GroupStudentRow[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [debtors, setDebtors] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [addStudentOpen, setAddStudentOpen] = useState(false);
  const [addStudentOptionsLoading, setAddStudentOptionsLoading] = useState(false);
  const [addStudentLoading, setAddStudentLoading] = useState(false);
  const [studentOptions, setStudentOptions] = useState<StudentOption[]>([]);
  const [studentSearchResults, setStudentSearchResults] = useState<StudentOption[] | null>(null);
  const [studentSearchLoading, setStudentSearchLoading] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const studentSearchRequestIdRef = useRef(0);
  const [addForm, setAddForm] = useState<{
    studentIds: string[];
    billingType: BillingType;
    monthlyFee: string;
    discountReason: string;
    note: string;
  }>({
    studentIds: [],
    billingType: 'DEFAULT',
    monthlyFee: '0',
    discountReason: '',
    note: '',
  });
  const [editBillingOpen, setEditBillingOpen] = useState(false);
  const [editBillingLoading, setEditBillingLoading] = useState(false);
  const [editingStudent, setEditingStudent] = useState<GroupStudentRow | null>(null);
  const [editForm, setEditForm] = useState<{
    billingType: BillingType;
    monthlyFee: string;
    discountReason: string;
    note: string;
  }>({
    billingType: 'DEFAULT',
    monthlyFee: '0',
    discountReason: '',
    note: '',
  });
  const [removeStudentId, setRemoveStudentId] = useState<string | null>(null);
  const [expandedStudentRowId, setExpandedStudentRowId] = useState<string | null>(null);
  const [expandedPaymentRowId, setExpandedPaymentRowId] = useState<string | null>(null);
  const [expandedExamRowId, setExpandedExamRowId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const groupMonthlyFee = Number(group?.monthlyFee ?? 0);

  const loadDetails = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [groupData, groupStudents, groupPayments, groupDebtors, groupExams] = await Promise.all([
        groupsApi.getById(id),
        groupsApi.getStudents(id),
        groupsApi.getPayments(id),
        groupsApi.getDebtors(id),
        groupsApi.getExams(id),
      ]);

      setGroup(groupData);
      setStudents(
        (groupStudents ?? []).map((row: any) => ({
          ...row,
          studentId: row.studentId ?? row.student?.id,
          billing: row.billing
            ? {
                monthlyFee: Number(row.billing.monthlyFee ?? 0),
                billingType: (row.billing.billingType ?? 'DEFAULT') as BillingType,
                discountReason: row.billing.discountReason ?? null,
                note: row.billing.note ?? null,
              }
            : null,
        })),
      );
      setPayments(groupPayments ?? []);
      setDebtors(groupDebtors ?? []);
      setExams(groupExams ?? []);
    } catch (error) {
      toast.error(getErrorMessage(error, "Guruh ma'lumotlarini yuklashda xatolik"));
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (expandedStudentRowId && !students.some((row) => row.id === expandedStudentRowId)) {
      setExpandedStudentRowId(null);
    }
  }, [students, expandedStudentRowId]);

  useEffect(() => {
    if (expandedPaymentRowId && !payments.some((payment) => payment.id === expandedPaymentRowId)) {
      setExpandedPaymentRowId(null);
    }
  }, [payments, expandedPaymentRowId]);

  useEffect(() => {
    if (expandedExamRowId && !exams.some((exam) => exam.id === expandedExamRowId)) {
      setExpandedExamRowId(null);
    }
  }, [exams, expandedExamRowId]);

  const totalStudents = useMemo(() => students.length || Number(group?._count?.students ?? 0), [students.length, group]);
  const studentOptionsSource = studentSearchResults ?? studentOptions;
  const filteredStudentOptions = useMemo(() => {
    const keyword = studentSearch.trim().toLowerCase();
    if (!keyword) return studentOptionsSource;
    return studentOptionsSource.filter((student) => {
      const name = student.fullName.toLowerCase();
      const phone = student.phone?.toLowerCase() ?? '';
      return name.includes(keyword) || phone.includes(keyword);
    });
  }, [studentOptionsSource, studentSearch]);
  const selectedStudentOptions = useMemo(
    () => studentOptions.filter((option) => addForm.studentIds.includes(option.id)),
    [studentOptions, addForm.studentIds],
  );

  useEffect(() => {
    if (!addStudentOpen) return;
    if (addForm.billingType === 'DEFAULT') {
      setAddForm((prev) => ({ ...prev, monthlyFee: String(groupMonthlyFee), discountReason: '' }));
      return;
    }
    if (addForm.billingType === 'FREE') {
      setAddForm((prev) => ({ ...prev, monthlyFee: '0', discountReason: '' }));
    }
  }, [addForm.billingType, addStudentOpen, groupMonthlyFee]);

  useEffect(() => {
    if (!editBillingOpen) return;
    if (editForm.billingType === 'DEFAULT') {
      setEditForm((prev) => ({ ...prev, monthlyFee: String(groupMonthlyFee), discountReason: '' }));
      return;
    }
    if (editForm.billingType === 'FREE') {
      setEditForm((prev) => ({ ...prev, monthlyFee: '0', discountReason: '' }));
    }
  }, [editForm.billingType, editBillingOpen, groupMonthlyFee]);

  useEffect(() => {
    if (!addStudentOpen) return;

    const keyword = studentSearch.trim();
    if (!keyword) {
      setStudentSearchResults(null);
      setStudentSearchLoading(false);
      return;
    }

    const requestId = ++studentSearchRequestIdRef.current;
    setStudentSearchLoading(true);

    const timer = window.setTimeout(async () => {
      try {
        const response = await studentsApi.getStudentsForSelect(keyword);
        if (studentSearchRequestIdRef.current !== requestId) {
          return;
        }

        const existingStudentIds = new Set((students ?? []).map((item) => item.student?.id ?? item.studentId));
        const options = (response.data ?? [])
          .map((item: any) => ({
            id: item.id,
            fullName: item.fullName,
            status: item.status,
            phone: item.phone,
          }))
          .filter((item: StudentOption) => !existingStudentIds.has(item.id));

        setStudentSearchResults(options);
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
  }, [addStudentOpen, studentSearch, students]);

  const openAddStudentModal = async () => {
    if (!id) return;
    setAddStudentOpen(true);
    setStudentSearch('');
    setStudentSearchResults(null);
    setStudentSearchLoading(false);
    setAddForm({
      studentIds: [],
      billingType: 'DEFAULT',
      monthlyFee: String(groupMonthlyFee),
      discountReason: '',
      note: '',
    });
    try {
      setAddStudentOptionsLoading(true);
      const response = await studentsApi.getStudentsForSelect();
      const existingStudentIds = new Set((students ?? []).map((item) => item.student?.id ?? item.studentId));
      const rawOptions = (response.data ?? [])
        .map((item: any) => ({
          id: item.id,
          fullName: item.fullName,
          status: item.status,
          phone: item.phone,
        }));

      const options = rawOptions.filter((item: StudentOption) => !existingStudentIds.has(item.id));

      setStudentOptions(options);
    } catch (error) {
      toast.error(getErrorMessage(error, "O'quvchi ro'yxatini yuklashda xatolik"));
      console.error(error);
    } finally {
      setAddStudentOptionsLoading(false);
    }
  };

  const handleAddStudent = async () => {
    if (!id) return;
    if (addForm.studentIds.length === 0) {
      toast.error("O'quvchini tanlang");
      return;
    }

    const monthlyFeeValue =
      addForm.billingType === 'DEFAULT' ? groupMonthlyFee : addForm.billingType === 'FREE' ? 0 : Number(addForm.monthlyFee);

    if (!Number.isFinite(monthlyFeeValue) || monthlyFeeValue < 0) {
      toast.error("Oylik to'lov noto'g'ri");
      return;
    }

    try {
      setAddStudentLoading(true);
      
      await Promise.all(
        addForm.studentIds.map((studentId) =>
          groupsApi.addStudentToGroup(id, {
            studentId,
            billingType: addForm.billingType,
            monthlyFee: monthlyFeeValue,
            ...(addForm.discountReason.trim() ? { discountReason: addForm.discountReason.trim() } : {}),
            ...(addForm.note.trim() ? { note: addForm.note.trim() } : {}),
          }),
        )
      );

      toast.success(`${addForm.studentIds.length} ta o'quvchi guruhga qo'shildi`);
      setAddStudentOpen(false);
      await loadDetails();
    } catch (error) {
      toast.error(getErrorMessage(error, "O'quvchi qo'shishda xatolik"));
      console.error(error);
    } finally {
      setAddStudentLoading(false);
    }
  };

  const openEditBillingModal = (row: GroupStudentRow) => {
    const currentBilling = row.billing;
    // INDIVIDUAL eski ma'lumot bo'lsa DISCOUNTED ga normalize qilamiz
    const rawBillingType = currentBilling?.billingType ?? 'DEFAULT';
    const normalizedBillingType: BillingType = rawBillingType === 'INDIVIDUAL' ? 'DISCOUNTED' : rawBillingType;
    setEditingStudent(row);
    setEditForm({
      billingType: normalizedBillingType,
      monthlyFee: String(
        normalizedBillingType === 'DEFAULT'
          ? groupMonthlyFee
          : normalizedBillingType === 'FREE'
            ? 0
            : Number(currentBilling?.monthlyFee ?? groupMonthlyFee),
      ),
      discountReason: currentBilling?.discountReason ?? '',
      note: currentBilling?.note ?? '',
    });
    setEditBillingOpen(true);
  };

  const handleUpdateBilling = async () => {
    if (!id || !editingStudent) return;
    const studentId = editingStudent.studentId ?? editingStudent.student?.id;
    if (!studentId) return;

    const monthlyFeeValue =
      editForm.billingType === 'DEFAULT' ? groupMonthlyFee : editForm.billingType === 'FREE' ? 0 : Number(editForm.monthlyFee);

    if (!Number.isFinite(monthlyFeeValue) || monthlyFeeValue < 0) {
      toast.error("Oylik to'lov noto'g'ri");
      return;
    }

    try {
      setEditBillingLoading(true);
      await groupsApi.updateStudentGroupBilling(id, studentId, {
        billingType: editForm.billingType,
        monthlyFee: monthlyFeeValue,
        ...(editForm.discountReason.trim() ? { discountReason: editForm.discountReason.trim() } : {}),
        ...(editForm.note.trim() ? { note: editForm.note.trim() } : {}),
      });

      toast.success("O'quvchi billing yangilandi");
      setEditBillingOpen(false);
      setEditingStudent(null);
      await loadDetails();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Billing yangilashda xatolik'));
      console.error(error);
    } finally {
      setEditBillingLoading(false);
    }
  };

  const handleRemoveStudent = async () => {
    if (!id || !removeStudentId) return;
    try {
      await groupsApi.removeStudent(id, removeStudentId);
      toast.success("O'quvchi guruhdan chiqarildi");
      setRemoveStudentId(null);
      await loadDetails();
    } catch (error) {
      toast.error(getErrorMessage(error, "O'quvchini guruhdan chiqarishda xatolik"));
      console.error(error);
    }
  };

  if (!id) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center">
        <p className="mb-4 text-slate-500">Guruh ID topilmadi</p>
        <button onClick={() => navigate('/groups')} className="btn-secondary">
          Guruhlar sahifasiga qaytish
        </button>
      </div>
    );
  }

  if (!loading && !group) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center">
        <p className="mb-4 text-slate-500">Guruh topilmadi</p>
        <button onClick={() => navigate('/groups')} className="btn-secondary">
          Guruhlar sahifasiga qaytish
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/groups')} className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100">
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-md">
            <Layers size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{group?.name}</h1>
            <p className="text-sm text-slate-500">
              {group?.course?.name} • {group?.teacher?.fullName}
            </p>
          </div>
        </div>
        <div className="ml-auto">{group?.status ? <StatusBadge status={group.status} /> : null}</div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="stat-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">O'quvchilar</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">{totalStudents}</p>
        </div>
        <div className="stat-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Dars kunlari</p>
          <p className="mt-1 text-lg font-bold text-slate-900">{group?.lessonDays || '-'}</p>
        </div>
        <div className="stat-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Dars vaqti</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{group?.lessonTime || '-'}</p>
        </div>
        <div className="stat-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Oylik to'lov</p>
          <p className="mt-1 text-xl font-bold text-emerald-700">{formatMoney(Number(group?.monthlyFee ?? 0))}</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-700">O'quvchilar ({students.length})</h3>
          </div>
          <button className="btn-primary py-2 text-xs" onClick={openAddStudentModal}>
            <Plus size={14} /> O'quvchi qo'shish
          </button>
        </div>
        {students.length === 0 ? (
          <EmptyState icon={<Users />} title="Bu guruhda o'quvchi yo'q" />
        ) : (
          <>
            <div className="md:hidden divide-y divide-slate-100">
              {students.map((row) => {
                const isExpanded = expandedStudentRowId === row.id;
                const studentName = row.student?.fullName || '-';
                const status = row.status || row.student?.status || 'ACTIVE';
                const billing = row.billing;
                const billingType = billing?.billingType ?? 'DEFAULT';
                const actualMonthlyFee = Number(
                  billing?.monthlyFee ?? (billingType === 'FREE' ? 0 : groupMonthlyFee),
                );

                return (
                  <div key={row.id} className="p-4">
                    <button
                      type="button"
                      onClick={() => setExpandedStudentRowId(isExpanded ? null : row.id)}
                      aria-expanded={isExpanded}
                      aria-label={isExpanded ? "O'quvchi tafsilotlarini yopish" : "O'quvchi tafsilotlarini ochish"}
                      className="w-full flex items-center gap-3 text-left"
                    >
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {studentName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-800 text-sm truncate">{studentName}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={status} size="sm" />
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 text-slate-500">
                          <ChevronDown size={16} className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                        </span>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="mt-3 space-y-3 animate-fade-in">
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div className="rounded-xl bg-slate-50 px-3 py-2">
                            <p className="text-slate-400 mb-1">Telefon</p>
                            <p className="font-medium text-slate-700">{row.student?.phone || '-'}</p>
                          </div>
                          <div className="rounded-xl bg-slate-50 px-3 py-2">
                            <p className="text-slate-400 mb-1">Qo'shilgan sana</p>
                            <p className="font-medium text-slate-700">{row.joinedAt ? formatDate(row.joinedAt) : '-'}</p>
                          </div>
                          <div className="rounded-xl bg-slate-50 px-3 py-2">
                            <p className="text-slate-400 mb-1">Oylik to'lov</p>
                            <p className="font-semibold text-emerald-700">{formatMoney(actualMonthlyFee)}</p>
                          </div>
                          <div className="rounded-xl bg-slate-50 px-3 py-2">
                            <p className="text-slate-400 mb-1">To'lov turi</p>
                            <BillingTypeBadge type={billingType} />
                          </div>
                          {billing?.discountReason ? (
                            <div className="rounded-xl bg-slate-50 px-3 py-2 col-span-2">
                              <p className="text-slate-400 mb-1">Imtiyoz sababi</p>
                              <p className="font-medium text-slate-700">{billing.discountReason}</p>
                            </div>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50"
                            onClick={() => openEditBillingModal(row)}
                          >
                            <Pencil size={12} /> Billing tahrirlash
                          </button>
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50"
                            onClick={() => setRemoveStudentId(row.student?.id ?? row.studentId)}
                          >
                            <UserMinus size={12} /> Chiqarish
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="table-head">
                  <tr>
                    <th className="table-cell">O'quvchi</th>
                    <th className="table-cell">Telefon</th>
                    <th className="table-cell">Oylik to'lov</th>
                    <th className="table-cell">To'lov turi</th>
                    <th className="table-cell">Status</th>
                    <th className="table-cell text-right">Amallar</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((row) => {
                    const billingType = row.billing?.billingType ?? 'DEFAULT';
                    const actualMonthlyFee = Number(
                      row.billing?.monthlyFee ?? (billingType === 'FREE' ? 0 : groupMonthlyFee),
                    );

                    return (
                      <tr key={row.id} className="table-row">
                        <td className="table-cell font-medium text-slate-800">{row.student?.fullName || '-'}</td>
                        <td className="table-cell text-xs text-slate-600">{row.student?.phone || '-'}</td>
                        <td className="table-cell font-semibold text-emerald-700">{formatMoney(actualMonthlyFee)}</td>
                        <td className="table-cell">
                          <div className="space-y-1">
                            <BillingTypeBadge type={billingType} />
                            {row.billing?.discountReason ? (
                              <p className="text-[11px] text-slate-500">{row.billing.discountReason}</p>
                            ) : null}
                          </div>
                        </td>
                        <td className="table-cell">
                          <StatusBadge status={row.status || row.student?.status || 'ACTIVE'} size="sm" />
                        </td>
                        <td className="table-cell text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50"
                              onClick={() => openEditBillingModal(row)}
                            >
                              <Pencil size={12} /> Billing
                            </button>
                            <button
                              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50"
                              onClick={() => setRemoveStudentId(row.student?.id ?? row.studentId)}
                            >
                              <UserMinus size={12} /> Chiqarish
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
          <DollarSign size={16} className="text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-700">To'lovlar ({payments.length})</h3>
        </div>
        {payments.length === 0 ? (
          <EmptyState icon={<DollarSign />} title="To'lovlar topilmadi" />
        ) : (
          <>
            <div className="md:hidden divide-y divide-slate-100">
              {payments.slice(0, 20).map((payment) => {
                const isExpanded = expandedPaymentRowId === payment.id;
                const studentName = payment.student?.fullName || '-';

                return (
                  <div key={payment.id} className="p-4">
                    <button
                      type="button"
                      onClick={() => setExpandedPaymentRowId(isExpanded ? null : payment.id)}
                      aria-expanded={isExpanded}
                      aria-label={isExpanded ? "To'lov tafsilotlarini yopish" : "To'lov tafsilotlarini ochish"}
                      className="w-full flex items-center gap-3 text-left"
                    >
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {studentName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-800 text-sm truncate">{studentName}</p>
                        <p className="text-xs text-emerald-700 font-semibold truncate">{formatMoney(Number(payment.amount ?? 0))}</p>
                      </div>
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 text-slate-500">
                        <ChevronDown size={16} className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                      </span>
                    </button>

                    {isExpanded && (
                      <div className="mt-3 space-y-3 animate-fade-in">
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div className="rounded-xl bg-slate-50 px-3 py-2">
                            <p className="text-slate-400 mb-1">Usul</p>
                            <p className="font-medium text-slate-700">{payment.method || '-'}</p>
                          </div>
                          <div className="rounded-xl bg-slate-50 px-3 py-2">
                            <p className="text-slate-400 mb-1">To'langan</p>
                            <p className="font-medium text-slate-700">{payment.paidAt ? formatDate(payment.paidAt) : '-'}</p>
                          </div>
                          <div className="rounded-xl bg-slate-50 px-3 py-2 col-span-2">
                            <p className="text-slate-400 mb-1">Qabul qildi</p>
                            <p className="font-medium text-slate-700">{payment.createdBy?.fullName || payment.createdBy?.username || '-'}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="table-head">
                  <tr>
                    <th className="table-cell">O'quvchi</th>
                    <th className="table-cell">Miqdor</th>
                    <th className="table-cell">Usul</th>
                    <th className="table-cell">To'langan</th>
                    <th className="table-cell">Qabul qildi</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.slice(0, 20).map((payment) => (
                    <tr key={payment.id} className="table-row">
                      <td className="table-cell font-medium text-slate-800">{payment.student?.fullName || '-'}</td>
                      <td className="table-cell font-semibold text-emerald-700">{formatMoney(Number(payment.amount ?? 0))}</td>
                      <td className="table-cell text-xs font-medium text-slate-600">{payment.method}</td>
                      <td className="table-cell text-slate-500">{payment.paidAt ? formatDate(payment.paidAt) : '-'}</td>
                      <td className="table-cell text-slate-500">{payment.createdBy?.fullName || payment.createdBy?.username || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
          <Clock size={16} className="text-rose-400" />
          <h3 className="text-sm font-semibold text-slate-700">Qarzdorlar ({debtors.length})</h3>
        </div>
        {debtors.length === 0 ? (
          <EmptyState icon={<Clock />} title="Qarzdorlar topilmadi" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="table-head">
                <tr>
                  <th className="table-cell">O'quvchi</th>
                  <th className="table-cell">Kechikish</th>
                  <th className="table-cell">Qarz miqdori</th>
                </tr>
              </thead>
              <tbody>
                {debtors.map((debtor) => (
                  <tr key={`${debtor.studentId}-${debtor.group?.id}`} className="table-row">
                    <td className="table-cell font-medium text-slate-800">{debtor.fullName}</td>
                    <td className="table-cell">
                      <span className="font-semibold text-rose-600">{debtor.overdueDays} kun</span>
                    </td>
                    <td className="table-cell font-bold text-rose-700">{formatMoney(Number(debtor.debtAmount ?? 0))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
          <Clock size={16} className="text-indigo-400" />
          <h3 className="text-sm font-semibold text-slate-700">Imtihonlar ({exams.length})</h3>
        </div>
        {exams.length === 0 ? (
          <EmptyState icon={<Clock />} title="Imtihonlar topilmadi" />
        ) : (
          <>
            <div className="md:hidden divide-y divide-slate-100">
              {exams.map((exam) => {
                const isExpanded = expandedExamRowId === exam.id;
                const examTitle = exam.title || '-';

                return (
                  <div key={exam.id} className="p-4">
                    <button
                      type="button"
                      onClick={() => setExpandedExamRowId(isExpanded ? null : exam.id)}
                      aria-expanded={isExpanded}
                      aria-label={isExpanded ? 'Imtihon tafsilotlarini yopish' : 'Imtihon tafsilotlarini ochish'}
                      className="w-full flex items-center gap-3 text-left"
                    >
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {examTitle.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-800 text-sm truncate">{examTitle}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={exam.status || 'SCHEDULED'} size="sm" />
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 text-slate-500">
                          <ChevronDown size={16} className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                        </span>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="mt-3 space-y-3 animate-fade-in">
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div className="rounded-xl bg-slate-50 px-3 py-2">
                            <p className="text-slate-400 mb-1">Sana</p>
                            <p className="font-medium text-slate-700">{exam.examDate ? formatDate(exam.examDate) : '-'}</p>
                          </div>
                          <div className="rounded-xl bg-slate-50 px-3 py-2">
                            <p className="text-slate-400 mb-1">Natijalar</p>
                            <p className="font-medium text-slate-700">{Number(exam?._count?.results ?? 0)} ta</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="table-head">
                  <tr>
                    <th className="table-cell">Sarlavha</th>
                    <th className="table-cell">Sana</th>
                    <th className="table-cell">Status</th>
                    <th className="table-cell">Natijalar</th>
                  </tr>
                </thead>
                <tbody>
                  {exams.map((exam) => (
                    <tr key={exam.id} className="table-row">
                      <td className="table-cell font-medium text-slate-800">{exam.title || '-'}</td>
                      <td className="table-cell text-slate-500">{exam.examDate ? formatDate(exam.examDate) : '-'}</td>
                      <td className="table-cell">
                        <StatusBadge status={exam.status || 'SCHEDULED'} size="sm" />
                      </td>
                      <td className="table-cell text-slate-600">{Number(exam?._count?.results ?? 0)} ta</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <Modal open={addStudentOpen} onClose={() => setAddStudentOpen(false)} title="O'quvchi qo'shish">
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-xs text-slate-500">Guruhning standart oylik narxi</p>
            <p className="text-sm font-semibold text-emerald-700">{formatMoney(groupMonthlyFee)}</p>
          </div>

          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              className={`${inputCls} pl-9`}
              placeholder="Ism yoki telefon bo'yicha qidiring..."
              value={studentSearch}
              onChange={(event) => setStudentSearch(event.target.value)}
            />
          </div>

          <div className="max-h-64 space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-2">
            {addStudentOptionsLoading ? (
              <p className="px-2 py-1 text-xs text-slate-500">O'quvchilar yuklanmoqda...</p>
            ) : studentSearchLoading ? (
              <p className="px-2 py-1 text-xs text-slate-500">Qidirilmoqda...</p>
            ) : filteredStudentOptions.length === 0 ? (
              <p className="px-2 py-1 text-xs text-slate-500">Biriktiriladigan o'quvchi topilmadi</p>
            ) : (
              filteredStudentOptions.map((student) => {
                const selected = addForm.studentIds.includes(student.id);

                return (
                  <button
                    type="button"
                    key={student.id}
                    onClick={() => {
                      setAddForm((prev) => {
                        const isSelected = prev.studentIds.includes(student.id);
                        return {
                          ...prev,
                          studentIds: isSelected
                            ? prev.studentIds.filter((id) => id !== student.id)
                            : [...prev.studentIds, student.id],
                        };
                      });
                    }}
                    className={`w-full flex items-start gap-3 rounded-lg border px-2.5 py-2 text-xs transition ${
                      selected ? 'border-indigo-400 bg-indigo-50/50' : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div
                      className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                        selected ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'
                      }`}
                    >
                      {selected && <div className="h-2 w-2 rounded-sm bg-white" />}
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <p className="truncate font-medium text-slate-700">{student.fullName}</p>
                      <p className="truncate text-slate-500">{student.phone || '-'}</p>
                    </div>
                    <StatusBadge status={student.status} size="sm" />
                  </button>
                );
              })
            )}
          </div>

          <div className="flex items-center justify-between px-1">
            <p className="text-xs text-slate-500">
              Tanlangan: <span className="font-semibold text-slate-700">{addForm.studentIds.length} ta o'quvchi</span>
            </p>
            {addForm.studentIds.length > 0 && (
              <button
                type="button"
                onClick={() => setAddForm((prev) => ({ ...prev, studentIds: [] }))}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
              >
                Tanlovni tozalash
              </button>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">To'lov turi</p>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              {VISIBLE_BILLING_TYPES.map((type) => {
                const meta = BILLING_META[type];
                const Icon = meta.icon;
                const selected = addForm.billingType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setAddForm((prev) => ({ ...prev, billingType: type }))}
                    className={`rounded-xl border px-3 py-2 text-left transition ${
                      selected ? `${meta.cardClass} border-2` : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon size={15} />
                      <p className="text-sm font-semibold">{meta.label}</p>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{meta.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Oylik to'lov</p>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                min={0}
                className={inputCls}
                value={addForm.monthlyFee}
                onWheel={(event) => (event.currentTarget as HTMLInputElement).blur()}
                onChange={(event) => setAddForm((prev) => ({ ...prev, monthlyFee: normalizeMoneyInput(event.target.value) }))}
                readOnly={addForm.billingType === 'DEFAULT' || addForm.billingType === 'FREE'}
                required
              />
            </div>
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Amaldagi summa</p>
              <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-emerald-700">
                {formatMoney(
                  addForm.billingType === 'DEFAULT' ? groupMonthlyFee : addForm.billingType === 'FREE' ? 0 : Number(addForm.monthlyFee || 0),
                )}
              </p>
            </div>
          </div>

          {(addForm.billingType === 'INDIVIDUAL' || addForm.billingType === 'DISCOUNTED') ? (
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Imtiyoz sababi</p>
              <input
                type="text"
                className={inputCls}
                value={addForm.discountReason}
                onChange={(event) => setAddForm((prev) => ({ ...prev, discountReason: event.target.value }))}
                placeholder="Sababni kiriting"
              />
            </div>
          ) : null}

          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Izoh</p>
            <textarea
              className={inputCls}
              rows={3}
              value={addForm.note}
              onChange={(event) => setAddForm((prev) => ({ ...prev, note: event.target.value }))}
              placeholder="Qo'shimcha izoh"
            />
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
            <button
              type="button"
              onClick={() => setAddStudentOpen(false)}
              className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-200"
            >
              Bekor qilish
            </button>
            <button
              type="button"
              onClick={handleAddStudent}
              disabled={addForm.studentIds.length === 0 || addStudentLoading}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
            >
              {addStudentLoading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
              Qo'shish
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={editBillingOpen}
        onClose={() => {
          setEditBillingOpen(false);
          setEditingStudent(null);
        }}
        title="Student billing tahrirlash"
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-xs text-slate-500">O'quvchi</p>
            <p className="text-sm font-semibold text-slate-800">{editingStudent?.student?.fullName || '-'}</p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">To'lov turi</p>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              {VISIBLE_BILLING_TYPES.map((type) => {
                const meta = BILLING_META[type];
                const Icon = meta.icon;
                // INDIVIDUAL bo'lsa DISCOUNTED kabi highlight qilinadi
                const selected = editForm.billingType === type || (type === 'DISCOUNTED' && editForm.billingType === 'INDIVIDUAL');
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setEditForm((prev) => ({ ...prev, billingType: type }))}
                    className={`rounded-xl border px-3 py-2 text-left transition ${
                      selected ? `${meta.cardClass} border-2` : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon size={15} />
                      <p className="text-sm font-semibold">{meta.label}</p>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{meta.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Oylik to'lov</p>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                min={0}
                className={inputCls}
                value={editForm.monthlyFee}
                onWheel={(event) => (event.currentTarget as HTMLInputElement).blur()}
                onChange={(event) => setEditForm((prev) => ({ ...prev, monthlyFee: normalizeMoneyInput(event.target.value) }))}
                readOnly={editForm.billingType === 'DEFAULT' || editForm.billingType === 'FREE'}
                required
              />
            </div>
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Amaldagi summa</p>
              <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-emerald-700">
                {formatMoney(
                  editForm.billingType === 'DEFAULT' ? groupMonthlyFee : editForm.billingType === 'FREE' ? 0 : Number(editForm.monthlyFee || 0),
                )}
              </p>
            </div>
          </div>

          {(editForm.billingType === 'INDIVIDUAL' || editForm.billingType === 'DISCOUNTED') ? (
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Imtiyoz sababi</p>
              <input
                type="text"
                className={inputCls}
                value={editForm.discountReason}
                onChange={(event) => setEditForm((prev) => ({ ...prev, discountReason: event.target.value }))}
                placeholder="Sababni kiriting"
              />
            </div>
          ) : null}

          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Izoh</p>
            <textarea
              className={inputCls}
              rows={3}
              value={editForm.note}
              onChange={(event) => setEditForm((prev) => ({ ...prev, note: event.target.value }))}
              placeholder="Qo'shimcha izoh"
            />
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
            <button
              type="button"
              onClick={() => {
                setEditBillingOpen(false);
                setEditingStudent(null);
              }}
              className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-200"
            >
              Bekor qilish
            </button>
            <button
              type="button"
              onClick={handleUpdateBilling}
              disabled={editBillingLoading}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
            >
              {editBillingLoading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
              Saqlash
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!removeStudentId}
        onClose={() => setRemoveStudentId(null)}
        onConfirm={handleRemoveStudent}
        title="O'quvchini guruhdan chiqarish"
        message="Bu o'quvchi guruhdan chiqariladi."
        confirmLabel="Chiqarish"
        variant="danger"
      />
    </div>
  );
}


