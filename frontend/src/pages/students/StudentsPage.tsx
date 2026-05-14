import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ChevronDown, Eye, Plus, Search, Edit, UserX, UserCheck, Users } from 'lucide-react';
import { toast } from 'sonner';
import { studentsApi } from '@/api/students.api';
import { getErrorMessage } from '@/api/http';
import PageHeader from '@/components/common/PageHeader';
import StatusBadge from '@/components/common/StatusBadge';
import ActionMenu from '@/components/common/ActionMenu';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import EmptyState from '@/components/common/EmptyState';
import { Field, FormActions, inputCls, Modal, selectCls } from '@/components/common/Modal';
import { formatDate } from '@/utils/formatDate';
import { formatMoney } from '@/utils/formatMoney';
import { isValidUzPhone, normalizeUzPhone } from '@/utils/phone';

type StudentRow = {
  id: string;
  fullName: string;
  username?: string | null;
  phone?: string | null;
  parentPhone?: string | null;
  birthDate?: string | null;
  groupId?: string;
  groupName: string;
  courseName: string;
  monthlyFee: number;
  lastPaymentDate?: string | null;
  nextPaymentDate?: string | null;
  paymentStatus: 'PAID' | 'DUE_SOON' | 'OVERDUE' | 'NO_PAYMENT';
  status: string;
};

function derivePaymentStatus(
  lastPaymentDate?: string | Date | null,
  nextPaymentDate?: string | Date | null,
): StudentRow['paymentStatus'] {
  if (!nextPaymentDate) return 'NO_PAYMENT';

  const due = new Date(nextPaymentDate);
  if (Number.isNaN(due.getTime())) return 'NO_PAYMENT';

  const dueAtStartOfDay = new Date(due);
  dueAtStartOfDay.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!lastPaymentDate) {
    return dueAtStartOfDay < today ? 'OVERDUE' : 'NO_PAYMENT';
  }

  const day = 24 * 60 * 60 * 1000;
  const diff = Math.ceil((dueAtStartOfDay.getTime() - today.getTime()) / day);

  if (diff < 0) return 'OVERDUE';
  if (diff <= 5) return 'DUE_SOON';
  return 'PAID';
}

function mapStudent(item: any): StudentRow {
  const membership = item.groupMemberships?.[0];
  const group = membership?.group;
  const billing =
    item.billings?.find((billingItem: any) => billingItem.groupId === group?.id) ??
    item.billings?.[0];
  const lastPaymentDate = billing?.lastPaymentDate ?? null;
  const nextPaymentDate = billing?.nextPaymentDate ?? null;

  return {
    id: item.id,
    fullName: item.fullName,
    username: item.username ?? item.user?.username ?? null,
    phone: item.phone,
    parentPhone: item.parentPhone,
    birthDate: item.birthDate ?? null,
    groupId: group?.id,
    groupName: group?.name ?? '-',
    courseName: group?.course?.name ?? '-',
    monthlyFee: Number(billing?.monthlyFee ?? 0),
    lastPaymentDate,
    nextPaymentDate,
    paymentStatus: derivePaymentStatus(lastPaymentDate, nextPaymentDate),
    status: item.status,
  };
}

export default function StudentsPage() {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [counts, setCounts] = useState({
    all: 0,
    active: 0,
    inactive: 0,
  });
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ACTIVE');
  const [filterPayment, setFilterPayment] = useState('');
  const [deactivateId, setDeactivateId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsStudent, setDetailsStudent] = useState<any>(null);
  const [detailsPayments, setDetailsPayments] = useState<any[]>([]);
  const [detailsDebts, setDetailsDebts] = useState<any[]>([]);
  const [detailsExams, setDetailsExams] = useState<any[]>([]);
  const [createForm, setCreateForm] = useState({
    fullName: '',
    phone: '',
    parentPhone: '',
    birthDate: '',
    status: 'ACTIVE',
  });
  const [editForm, setEditForm] = useState({
    fullName: '',
    phone: '',
    parentPhone: '',
    birthDate: '',
    status: 'ACTIVE',
  });
  const [loading, setLoading] = useState(false);

  const buildSharedParams = () => {
    const params: Record<string, any> = {};
    if (search) params.search = search;
    if (filterPayment === 'OVERDUE') params.paymentStatus = 'OVERDUE';
    if (filterPayment === 'PAID') params.paymentStatus = 'CURRENT';
    return params;
  };

  const loadStudents = async () => {
    try {
      setLoading(true);
      const params: Record<string, any> = {
        page: 1,
        limit: 50,
        ...buildSharedParams(),
      };

      if (filterStatus && filterStatus !== 'ALL') params.status = filterStatus;

      const response = await studentsApi.getAll(params);
      setStudents((response.data ?? []).map(mapStudent));
    } catch (error) {
      toast.error(getErrorMessage(error, "O'quvchilarni yuklashda xatolik"));
    } finally {
      setLoading(false);
    }
  };

  const loadCounts = async () => {
    try {
      const baseParams = {
        page: 1,
        limit: 1,
        ...buildSharedParams(),
      };

      const [allRes, activeRes, inactiveRes] = await Promise.all([
        studentsApi.getAll(baseParams),
        studentsApi.getAll({ ...baseParams, status: 'ACTIVE' }),
        studentsApi.getAll({ ...baseParams, status: 'INACTIVE' }),
      ]);

      setCounts({
        all: Number(allRes.meta?.total ?? allRes.data?.length ?? 0),
        active: Number(activeRes.meta?.total ?? activeRes.data?.length ?? 0),
        inactive: Number(inactiveRes.meta?.total ?? inactiveRes.data?.length ?? 0),
      });
    } catch (error) {
      toast.error(getErrorMessage(error, "O'quvchilar sonini yuklashda xatolik"));
      console.error(error);
    }
  };

  useEffect(() => {
    loadStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filterStatus, filterPayment]);

  useEffect(() => {
    loadCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filterPayment]);

  useEffect(() => {
    if (expandedStudentId && !students.some((student) => student.id === expandedStudentId)) {
      setExpandedStudentId(null);
    }
  }, [students, expandedStudentId]);

  const filtered = useMemo(
    () =>
      students.filter((student) => {
        if (!filterPayment) return true;
        return student.paymentStatus === filterPayment;
      }),
    [students, filterPayment],
  );

  const handleDeactivate = async () => {
    if (!deactivateId) return;
    try {
      await studentsApi.delete(deactivateId);
      toast.success("O'quvchi nofaol qilindi");
      setDeactivateId(null);
      await Promise.all([loadStudents(), loadCounts()]);
    } catch (error) {
      toast.error(getErrorMessage(error, "O'quvchini nofaol qilishda xatolik"));
    }
  };

  const handleActivate = async (id: string) => {
    try {
      await studentsApi.activate(id);
      toast.success("O'quvchi faollashtirildi");
      await Promise.all([loadStudents(), loadCounts()]);
    } catch (error) {
      toast.error(getErrorMessage(error, "O'quvchini faollashtirishda xatolik"));
    }
  };

  const openCreateModal = () => {
    setCreateForm({
      fullName: '',
      phone: '',
      parentPhone: '',
      birthDate: '',
      status: 'ACTIVE',
    });
    setCreateOpen(true);
  };

  const openEditModal = async (student: StudentRow) => {
    try {
      const fullStudent = await studentsApi.getById(student.id);
      setEditingStudentId(fullStudent.id);
      setEditForm({
        fullName: fullStudent.fullName ?? '',
        phone: fullStudent.phone ?? '',
        parentPhone: fullStudent.parentPhone ?? '',
        birthDate: fullStudent.birthDate ? String(fullStudent.birthDate).slice(0, 10) : '',
        status: fullStudent.status ?? student.status,
      });
    } catch (error) {
      toast.error(getErrorMessage(error, "O'quvchi ma'lumotini yuklashda xatolik"));
      setEditingStudentId(student.id);
      setEditForm({
        fullName: student.fullName,
        phone: student.phone ?? '',
        parentPhone: student.parentPhone ?? '',
        birthDate: student.birthDate ? student.birthDate.slice(0, 10) : '',
        status: student.status,
      });
    } finally {
      setEditOpen(true);
    }
  };

  const openDetailsModal = async (student: StudentRow) => {
    try {
      setDetailsOpen(true);
      setDetailsLoading(true);
      const [studentInfo, payments, debts, exams] = await Promise.all([
        studentsApi.getById(student.id),
        studentsApi.getPayments(student.id),
        studentsApi.getDebts(student.id),
        studentsApi.getExams(student.id),
      ]);
      setDetailsStudent(studentInfo);
      setDetailsPayments(payments ?? []);
      setDetailsDebts(debts ?? []);
      setDetailsExams(exams ?? []);
    } catch (error) {
      toast.error(getErrorMessage(error, "O'quvchi tafsilotlarini yuklashda xatolik"));
      console.error(error);
    } finally {
      setDetailsLoading(false);
    }
  };

  const normalizeAndValidatePhones = (phone: string, parentPhone: string) => {
    const normalizedPhone = normalizeUzPhone(phone);
    if (!isValidUzPhone(normalizedPhone)) {
      toast.error("Telefon formati +998901234567 ko'rinishida bo'lishi kerak");
      return null;
    }

    const parentRaw = parentPhone.trim();
    if (!parentRaw) {
      return { normalizedPhone, normalizedParentPhone: undefined as string | undefined };
    }

    const normalizedParentPhone = normalizeUzPhone(parentRaw);
    if (!isValidUzPhone(normalizedParentPhone)) {
      toast.error("Ota-ona telefoni +998901234567 ko'rinishida bo'lishi kerak");
      return null;
    }

    return { normalizedPhone, normalizedParentPhone };
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const phonePayload = normalizeAndValidatePhones(createForm.phone, createForm.parentPhone);
    if (!phonePayload) return;

    try {
      setCreateLoading(true);
      const payload: Record<string, any> = {
        fullName: createForm.fullName.trim(),
        phone: phonePayload.normalizedPhone,
        parentPhone: phonePayload.normalizedParentPhone,
        birthDate: createForm.birthDate || undefined,
        status: createForm.status,
      };

      await studentsApi.create(payload);
      toast.success("O'quvchi qo'shildi");
      setCreateOpen(false);
      await Promise.all([loadStudents(), loadCounts()]);
    } catch (error) {
      toast.error(getErrorMessage(error, "O'quvchi qo'shishda xatolik"));
    } finally {
      setCreateLoading(false);
    }
  };

  const handleUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingStudentId) return;
    const phonePayload = normalizeAndValidatePhones(editForm.phone, editForm.parentPhone);
    if (!phonePayload) return;

    try {
      setEditLoading(true);
      const payload: Record<string, any> = {
        fullName: editForm.fullName.trim(),
        phone: phonePayload.normalizedPhone,
        parentPhone: phonePayload.normalizedParentPhone,
        birthDate: editForm.birthDate || undefined,
        status: editForm.status,
      };

      await studentsApi.update(editingStudentId, payload);
      toast.success("O'quvchi yangilandi");
      setEditOpen(false);
      await Promise.all([loadStudents(), loadCounts()]);
    } catch (error) {
      toast.error(getErrorMessage(error, "O'quvchini yangilashda xatolik"));
      console.error(error);
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="O'quvchilar"
        subtitle={`Jami: ${counts.all} / Faol: ${counts.active} / Nofaol: ${counts.inactive}`}
        icon={<Users size={20} />}
        actions={
          <button className="btn-primary w-full sm:w-auto justify-center" onClick={openCreateModal}>
            <Plus size={16} /> O'quvchi qo'shish
          </button>
        }
      />

      <div className="flex gap-1.5 p-1 bg-slate-100 rounded-xl w-fit">
        {[
          ['ACTIVE', 'Faol'],
          ['INACTIVE', 'Nofaol'],
          ['ALL', 'Hammasi'],
        ].map(([value, label]) => (
          <button
            key={value}
            onClick={() => setFilterStatus(value)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              filterStatus === value ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {label}{' '}
            {value === 'ACTIVE' ? `(${counts.active})` : value === 'INACTIVE' ? `(${counts.inactive})` : `(${counts.all})`}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="flex flex-wrap gap-3 p-4 border-b border-slate-100">
          <div className="relative flex-1 min-w-48">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Ism, telefon bo'yicha..."
              className="input-field pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select className="select-field w-auto" value={filterPayment} onChange={(e) => setFilterPayment(e.target.value)}>
            <option value="">To'lov holati</option>
            <option value="PAID">To'langan</option>
            <option value="DUE_SOON">Yaqin</option>
            <option value="OVERDUE">Kechikkan</option>
            <option value="NO_PAYMENT">To'lov yo'q</option>
          </select>
        </div>

        <div className="md:hidden divide-y divide-slate-100">
          {!loading && filtered.length === 0 ? (
            <EmptyState icon={<Users />} title="O'quvchi topilmadi" description="Qidiruv yoki filterni o'zgartiring" />
          ) : (
            filtered.map((student) => {
              const isExpanded = expandedStudentId === student.id;

              return (
                <div key={student.id} className="p-4">
                  <button
                    type="button"
                    onClick={() => setExpandedStudentId(isExpanded ? null : student.id)}
                    className="w-full flex items-center gap-3 text-left"
                    aria-expanded={isExpanded}
                    aria-label={isExpanded ? "O'quvchi tafsilotlarini yopish" : "O'quvchi tafsilotlarini ochish"}
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {student.fullName.charAt(0)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-800 text-sm truncate">{student.fullName}</p>
                      <p className="text-xs text-slate-500 truncate">{student.username ? `@${student.username}` : student.phone || '-'}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <StatusBadge status={student.status} size="sm" />
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
                          <p className="font-medium text-slate-700">{student.phone || '-'}</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 px-3 py-2">
                          <p className="text-slate-400 mb-1">Ota-ona telefoni</p>
                          <p className="font-medium text-slate-700">{student.parentPhone || '-'}</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 px-3 py-2">
                          <p className="text-slate-400 mb-1">Guruh</p>
                          <p className="font-medium text-slate-700 truncate">{student.groupName}</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 px-3 py-2">
                          <p className="text-slate-400 mb-1">Kurs</p>
                          <p className="font-medium text-slate-700 truncate">{student.courseName}</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 px-3 py-2">
                          <p className="text-slate-400 mb-1">Oylik to'lov</p>
                          <p className="font-semibold text-slate-800">{formatMoney(student.monthlyFee)}</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 px-3 py-2">
                          <p className="text-slate-400 mb-1">To'lov holati</p>
                          <StatusBadge status={student.paymentStatus} size="sm" />
                        </div>
                        <div className="rounded-xl bg-slate-50 px-3 py-2 col-span-2">
                          <p className="text-slate-400 mb-1">Keyingi to'lov</p>
                          <p className="font-medium text-slate-700">{student.nextPaymentDate ? formatDate(student.nextPaymentDate) : '-'}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => openDetailsModal(student)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-medium"
                        >
                          <Eye size={13} />
                          Ko'rish
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(student)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-medium"
                        >
                          <Edit size={13} />
                          Tahrirlash
                        </button>
                        {student.status === 'INACTIVE' ? (
                          <button
                            type="button"
                            onClick={() => handleActivate(student.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-medium"
                          >
                            <UserCheck size={13} />
                            Faollashtirish
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeactivateId(student.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-rose-200 bg-rose-50 text-rose-600 text-xs font-medium"
                          >
                            <UserX size={13} />
                            Nofaol qilish
                          </button>
                        )}
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
                <th className="table-cell">Telefon</th>
                <th className="table-cell">Guruh</th>
                <th className="table-cell">Oylik to'lov</th>
                <th className="table-cell">Keyingi to'lov</th>
                <th className="table-cell">To'lov holati</th>
                <th className="table-cell">Status</th>
                <th className="table-cell text-right">Amallar</th>
              </tr>
            </thead>
            <tbody>
              {!loading && filtered.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <EmptyState icon={<Users />} title="O'quvchi topilmadi" description="Qidiruv yoki filterni o'zgartiring" />
                  </td>
                </tr>
              ) : (
                filtered.map((student) => (
                  <tr key={student.id} className={`table-row ${student.status === 'INACTIVE' ? 'opacity-60 bg-slate-50/50' : ''}`}>
                    <td className="table-cell">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                          {student.fullName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 text-sm leading-none">{student.fullName}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{student.username ? `@${student.username}` : student.parentPhone || '-'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell text-slate-600 text-xs">{student.phone || '-'}</td>
                    <td className="table-cell">
                      <div>
                        <p className="text-sm font-medium text-slate-700">{student.groupName}</p>
                        <p className="text-xs text-slate-400">{student.courseName}</p>
                      </div>
                    </td>
                    <td className="table-cell font-semibold text-slate-800">{formatMoney(student.monthlyFee)}</td>
                    <td className="table-cell text-slate-500">{student.nextPaymentDate ? formatDate(student.nextPaymentDate) : '-'}</td>
                    <td className="table-cell">
                      <StatusBadge status={student.paymentStatus} size="sm" />
                    </td>
                    <td className="table-cell">
                      <StatusBadge status={student.status} size="sm" />
                    </td>
                    <td className="table-cell text-right">
                      {student.status === 'INACTIVE' ? (
                        <button
                          onClick={() => handleActivate(student.id)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition"
                        >
                          <UserCheck size={12} /> Faollashtirish
                        </button>
                      ) : (
                        <ActionMenu
                          actions={[
                            { label: "Ko'rish", icon: <Eye size={14} />, onClick: () => openDetailsModal(student) },
                            { label: 'Tahrirlash', icon: <Edit size={14} />, onClick: () => openEditModal(student) },
                            { label: 'Nofaol qilish', icon: <UserX size={14} />, onClick: () => setDeactivateId(student.id), variant: 'danger' },
                          ]}
                        />
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-400">{filtered.length} ta {students.length} dan ko'rsatilmoqda</div>
      </div>

      <ConfirmDialog
        open={!!deactivateId}
        onClose={() => setDeactivateId(null)}
        onConfirm={handleDeactivate}
        title="O'quvchini nofaol qilish"
        message="Bu o'quvchi nofaol qilinadi. Ma'lumotlari saqlab qolinadi va keyinchalik faollashtirish mumkin."
        confirmLabel="Nofaol qilish"
        variant="warning"
      />

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Yangi o'quvchi qo'shish">
        <form onSubmit={handleCreate} className="space-y-4">
          <Field label="F.I.O" required>
            <input
              className={inputCls}
              value={createForm.fullName}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, fullName: event.target.value }))}
              required
            />
          </Field>

          <Field label="Telefon" required>
            <input
              type="tel"
              inputMode="tel"
              placeholder="+998901234567"
              className={inputCls}
              value={createForm.phone}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, phone: event.target.value }))}
              onBlur={() => setCreateForm((prev) => ({ ...prev, phone: normalizeUzPhone(prev.phone) }))}
              required
            />
          </Field>

          <Field label="Ota-ona telefoni">
            <input
              type="tel"
              inputMode="tel"
              placeholder="+998901234567"
              className={inputCls}
              value={createForm.parentPhone}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, parentPhone: event.target.value }))}
              onBlur={() => setCreateForm((prev) => ({ ...prev, parentPhone: normalizeUzPhone(prev.parentPhone) }))}
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Tug'ilgan sana">
              <input
                type="date"
                className={inputCls}
                value={createForm.birthDate}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, birthDate: event.target.value }))}
              />
            </Field>

            <Field label="Status" required>
              <select
                className={selectCls}
                value={createForm.status}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, status: event.target.value }))}
              >
                <option value="ACTIVE">Faol</option>
                <option value="INACTIVE">Nofaol</option>
              </select>
            </Field>
          </div>

          <FormActions onCancel={() => setCreateOpen(false)} loading={createLoading} submitLabel="Saqlash" />
        </form>
      </Modal>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="O'quvchini tahrirlash">
        <form onSubmit={handleUpdate} className="space-y-4">
          <Field label="F.I.O" required>
            <input
              className={inputCls}
              value={editForm.fullName}
              onChange={(event) => setEditForm((prev) => ({ ...prev, fullName: event.target.value }))}
              required
            />
          </Field>

          <Field label="Telefon" required>
            <input
              type="tel"
              inputMode="tel"
              placeholder="+998901234567"
              className={inputCls}
              value={editForm.phone}
              onChange={(event) => setEditForm((prev) => ({ ...prev, phone: event.target.value }))}
              onBlur={() => setEditForm((prev) => ({ ...prev, phone: normalizeUzPhone(prev.phone) }))}
              required
            />
          </Field>

          <Field label="Ota-ona telefoni">
            <input
              type="tel"
              inputMode="tel"
              placeholder="+998901234567"
              className={inputCls}
              value={editForm.parentPhone}
              onChange={(event) => setEditForm((prev) => ({ ...prev, parentPhone: event.target.value }))}
              onBlur={() => setEditForm((prev) => ({ ...prev, parentPhone: normalizeUzPhone(prev.parentPhone) }))}
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Tug'ilgan sana">
              <input
                type="date"
                className={inputCls}
                value={editForm.birthDate}
                onChange={(event) => setEditForm((prev) => ({ ...prev, birthDate: event.target.value }))}
              />
            </Field>

            <Field label="Status" required>
              <select
                className={selectCls}
                value={editForm.status}
                onChange={(event) => setEditForm((prev) => ({ ...prev, status: event.target.value }))}
              >
                <option value="ACTIVE">Faol</option>
                <option value="INACTIVE">Nofaol</option>
              </select>
            </Field>
          </div>

          <FormActions onCancel={() => setEditOpen(false)} loading={editLoading} submitLabel="Yangilash" />
        </form>
      </Modal>

      <Modal open={detailsOpen} onClose={() => setDetailsOpen(false)} title="O'quvchi tafsilotlari" size="lg">
        {detailsLoading ? (
          <p className="py-8 text-center text-sm text-slate-500">Yuklanmoqda...</p>
        ) : !detailsStudent ? (
          <EmptyState icon={<Users />} title="Ma'lumot topilmadi" />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">F.I.O</p>
                <p className="font-semibold text-slate-800">{detailsStudent.fullName}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Telefon</p>
                <p className="font-semibold text-slate-800">{detailsStudent.phone || '-'}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Ota-ona telefoni</p>
                <p className="font-semibold text-slate-800">{detailsStudent.parentPhone || '-'}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-slate-200 p-3 text-center">
                <p className="text-xs text-slate-500">To'lovlar</p>
                <p className="text-xl font-bold text-slate-800">{detailsPayments.length}</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-3 text-center">
                <p className="text-xs text-slate-500">Qarzlar</p>
                <p className="text-xl font-bold text-rose-600">{detailsDebts.length}</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-3 text-center">
                <p className="text-xs text-slate-500">Imtihonlar</p>
                <p className="text-xl font-bold text-slate-800">{detailsExams.length}</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200">
              <div className="border-b border-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">Oxirgi to'lovlar</div>
              <div className="max-h-36 overflow-y-auto px-3 py-2 text-sm text-slate-700">
                {detailsPayments.length === 0 ? (
                  <p className="text-slate-500">To'lov topilmadi</p>
                ) : (
                  detailsPayments.slice(0, 5).map((payment) => (
                    <p key={payment.id} className="py-1">
                      {payment.paidAt ? formatDate(payment.paidAt) : '-'} - {formatMoney(Number(payment.amount ?? 0))}
                    </p>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
