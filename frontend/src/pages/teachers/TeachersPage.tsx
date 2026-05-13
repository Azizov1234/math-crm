import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ChevronDown, Eye, Plus, Search, Edit, Trash2, UserCog, X } from 'lucide-react';
import { toast } from 'sonner';
import { groupsApi } from '@/api/groups.api';
import { teachersApi } from '@/api/teachers.api';
import { getErrorMessage } from '@/api/http';
import PageHeader from '@/components/common/PageHeader';
import StatusBadge from '@/components/common/StatusBadge';
import ActionMenu from '@/components/common/ActionMenu';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import EmptyState from '@/components/common/EmptyState';
import { Field, FormActions, inputCls, Modal, selectCls } from '@/components/common/Modal';
import { formatMoney } from '@/utils/formatMoney';

type TeacherRow = {
  id: string;
  fullName: string;
  phone?: string | null;
  subject: string;
  groupsCount: number;
  studentsCount: number;
  salary: number;
  status: string;
};

type AssignableGroup = {
  id: string;
  name: string;
  courseName: string;
  status: string;
};

function mapTeacher(item: any): TeacherRow {
  return {
    id: item.id,
    fullName: item.fullName,
    phone: item.phone,
    subject: item.subject,
    groupsCount: Number(item?._count?.groups ?? 0),
    studentsCount: 0,
    salary: Number(item.salary ?? 0),
    status: item.status,
  };
}

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [expandedTeacherId, setExpandedTeacherId] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsTeacher, setDetailsTeacher] = useState<any>(null);
  const [detailsGroups, setDetailsGroups] = useState<any[]>([]);
  const [detailsStudents, setDetailsStudents] = useState<any[]>([]);
  const [groupPickerOpen, setGroupPickerOpen] = useState(false);
  const [groupSearch, setGroupSearch] = useState('');
  const [groupOptions, setGroupOptions] = useState<AssignableGroup[]>([]);
  const [groupOptionsLoading, setGroupOptionsLoading] = useState(false);
  const [selectedCreateGroups, setSelectedCreateGroups] = useState<AssignableGroup[]>([]);
  const [createForm, setCreateForm] = useState({
    fullName: '',
    phone: '',
    subject: '',
    salary: '',
    status: 'ACTIVE',
  });
  const [editForm, setEditForm] = useState({
    fullName: '',
    phone: '',
    subject: '',
    salary: '',
    status: 'ACTIVE',
  });
  const [loading, setLoading] = useState(false);

  const loadTeachers = async () => {
    try {
      setLoading(true);
      const response = await teachersApi.getAll({
        page: 1,
        limit: 50,
        search: search || undefined,
        status: filterStatus || undefined,
        subject: filterSubject || undefined,
      });
      setTeachers((response.data ?? []).map(mapTeacher));
    } catch (error) {
      toast.error(getErrorMessage(error, "O'qituvchilarni yuklashda xatolik"));
    } finally {
      setLoading(false);
    }
  };

  const loadGroupOptions = async (searchQuery?: string) => {
    try {
      setGroupOptionsLoading(true);
      const response = await groupsApi.getAll({
        page: 1,
        limit: 100,
        search: searchQuery?.trim() || undefined,
      });

      const options = (response.data ?? []).map((group: any) => ({
        id: group.id,
        name: group.name,
        courseName: group.course?.name ?? '-',
        status: group.status ?? 'ACTIVE',
      }));

      setGroupOptions(options);
    } catch (error) {
      toast.error(getErrorMessage(error, "Guruhlar ro'yxatini yuklashda xatolik"));
      setGroupOptions([]);
    } finally {
      setGroupOptionsLoading(false);
    }
  };

  useEffect(() => {
    loadTeachers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filterStatus, filterSubject]);

  useEffect(() => {
    if (expandedTeacherId && !teachers.some((teacher) => teacher.id === expandedTeacherId)) {
      setExpandedTeacherId(null);
    }
  }, [teachers, expandedTeacherId]);

  useEffect(() => {
    if (!groupPickerOpen) return;
    const timer = setTimeout(() => {
      void loadGroupOptions(groupSearch);
    }, 250);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupSearch, groupPickerOpen]);

  const subjects = useMemo(() => [...new Set(teachers.map((teacher) => teacher.subject))], [teachers]);
  const filtered = useMemo(() => teachers, [teachers]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await teachersApi.delete(deleteId);
      toast.success("O'qituvchi nofaol qilindi");
      setDeleteId(null);
      await loadTeachers();
    } catch (error) {
      toast.error(getErrorMessage(error, "O'qituvchini nofaol qilishda xatolik"));
    }
  };

  const openCreateModal = () => {
    setCreateForm({
      fullName: '',
      phone: '',
      subject: '',
      salary: '',
      status: 'ACTIVE',
    });
    setSelectedCreateGroups([]);
    setGroupSearch('');
    setGroupOptions([]);
    setGroupPickerOpen(false);
    setCreateOpen(true);
  };

  const toggleCreateGroupSelection = (group: AssignableGroup) => {
    setSelectedCreateGroups((prev) => {
      const exists = prev.some((item) => item.id === group.id);
      if (exists) {
        return prev.filter((item) => item.id !== group.id);
      }
      return [...prev, group];
    });
  };

  const openEditModal = async (teacher: TeacherRow) => {
    try {
      const fullTeacher = await teachersApi.getById(teacher.id);
      setEditingTeacherId(fullTeacher.id);
      setEditForm({
        fullName: fullTeacher.fullName ?? teacher.fullName,
        phone: fullTeacher.phone ?? '',
        subject: fullTeacher.subject ?? teacher.subject,
        salary: fullTeacher.salary ? String(fullTeacher.salary) : '',
        status: fullTeacher.status ?? teacher.status,
      });
    } catch (error) {
      toast.error(getErrorMessage(error, "O'qituvchi ma'lumotini yuklashda xatolik"));
      setEditingTeacherId(teacher.id);
      setEditForm({
        fullName: teacher.fullName,
        phone: teacher.phone ?? '',
        subject: teacher.subject,
        salary: teacher.salary ? String(teacher.salary) : '',
        status: teacher.status,
      });
    } finally {
      setEditOpen(true);
    }
  };

  const openDetailsModal = async (teacher: TeacherRow) => {
    try {
      setDetailsLoading(true);
      setDetailsOpen(true);
      const [teacherInfo, teacherGroups, teacherStudents] = await Promise.all([
        teachersApi.getById(teacher.id),
        teachersApi.getGroups(teacher.id),
        teachersApi.getStudents(teacher.id),
      ]);

      setDetailsTeacher(teacherInfo);
      setDetailsGroups(teacherGroups ?? []);
      setDetailsStudents(teacherStudents ?? []);
    } catch (error) {
      toast.error(getErrorMessage(error, "O'qituvchi tafsilotlarini yuklashda xatolik"));
      console.error(error);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setCreateLoading(true);
      const payload: Record<string, any> = {
        fullName: createForm.fullName.trim(),
        phone: createForm.phone.trim(),
        subject: createForm.subject.trim(),
        status: createForm.status,
      };

      if (createForm.salary.trim()) {
        payload.salary = Number(createForm.salary);
      }

      if (selectedCreateGroups.length > 0) {
        payload.groupIds = selectedCreateGroups.map((group) => group.id);
      }

      await teachersApi.create(payload);
      toast.success("O'qituvchi qo'shildi");
      setCreateOpen(false);
      await loadTeachers();
    } catch (error) {
      toast.error(getErrorMessage(error, "O'qituvchi qo'shishda xatolik"));
    } finally {
      setCreateLoading(false);
    }
  };

  const handleUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingTeacherId) return;

    try {
      setEditLoading(true);
      const payload: Record<string, any> = {
        fullName: editForm.fullName.trim(),
        phone: editForm.phone.trim(),
        subject: editForm.subject.trim(),
        status: editForm.status,
      };

      if (editForm.salary.trim()) {
        payload.salary = Number(editForm.salary);
      }

      await teachersApi.update(editingTeacherId, payload);
      toast.success("O'qituvchi yangilandi");
      setEditOpen(false);
      await loadTeachers();
    } catch (error) {
      toast.error(getErrorMessage(error, "O'qituvchini yangilashda xatolik"));
      console.error(error);
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="O'qituvchilar"
        subtitle={`Jami ${teachers.length} ta, ${teachers.filter((teacher) => teacher.status === 'ACTIVE').length} ta faol`}
        icon={<UserCog size={20} />}
        actions={
          <button className="btn-primary w-full sm:w-auto justify-center" onClick={openCreateModal}>
            <Plus size={16} /> O'qituvchi qo'shish
          </button>
        }
      />

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
          <select className="select-field w-auto" value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)}>
            <option value="">Barcha fanlar</option>
            {subjects.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </select>
          <select className="select-field w-auto" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">Barcha statuslar</option>
            <option value="ACTIVE">Faol</option>
            <option value="INACTIVE">Nofaol</option>
          </select>
        </div>

        <div className="md:hidden divide-y divide-slate-100">
          {!loading && filtered.length === 0 ? (
            <EmptyState icon={<UserCog />} title="O'qituvchi topilmadi" />
          ) : (
            filtered.map((teacher) => {
              const isExpanded = expandedTeacherId === teacher.id;

              return (
                <div key={teacher.id} className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {teacher.fullName.charAt(0)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-800 text-sm truncate">{teacher.fullName}</p>
                      <p className="text-xs text-slate-500 truncate">{teacher.phone || '-'}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <StatusBadge status={teacher.status} size="sm" />
                      <button
                        type="button"
                        onClick={() => setExpandedTeacherId(isExpanded ? null : teacher.id)}
                        aria-expanded={isExpanded}
                        aria-label={isExpanded ? "O'qituvchi tafsilotlarini yopish" : "O'qituvchi tafsilotlarini ochish"}
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
                          <p className="text-slate-400 mb-1">Fan</p>
                          <p className="font-medium text-slate-700">{teacher.subject}</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 px-3 py-2">
                          <p className="text-slate-400 mb-1">Guruhlar</p>
                          <p className="font-medium text-slate-700">{teacher.groupsCount} ta</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 px-3 py-2">
                          <p className="text-slate-400 mb-1">O'quvchilar</p>
                          <p className="font-medium text-slate-700">{teacher.studentsCount} ta</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 px-3 py-2">
                          <p className="text-slate-400 mb-1">Maosh</p>
                          <p className="font-semibold text-slate-800">{formatMoney(teacher.salary)}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => openDetailsModal(teacher)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-medium"
                        >
                          <Eye size={13} />
                          Ko'rish
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(teacher)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-medium"
                        >
                          <Edit size={13} />
                          Tahrirlash
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteId(teacher.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-rose-200 bg-rose-50 text-rose-600 text-xs font-medium"
                        >
                          <Trash2 size={13} />
                          Nofaol qilish
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
                <th className="table-cell">O'qituvchi</th>
                <th className="table-cell">Fan</th>
                <th className="table-cell">Guruhlar</th>
                <th className="table-cell">O'quvchilar</th>
                <th className="table-cell">Maosh</th>
                <th className="table-cell">Status</th>
                <th className="table-cell text-right">Amallar</th>
              </tr>
            </thead>
            <tbody>
              {!loading && filtered.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState icon={<UserCog />} title="O'qituvchi topilmadi" />
                  </td>
                </tr>
              ) : (
                filtered.map((teacher) => (
                  <tr key={teacher.id} className="table-row">
                    <td className="table-cell">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {teacher.fullName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 text-sm">{teacher.fullName}</p>
                          <p className="text-xs text-slate-400">{teacher.phone || '-'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className="px-2 py-1 bg-sky-50 text-sky-700 rounded-lg text-xs font-medium">{teacher.subject}</span>
                    </td>
                    <td className="table-cell">
                      <span className="font-semibold text-slate-800">{teacher.groupsCount}</span>
                      <span className="text-slate-400 text-xs ml-1">ta guruh</span>
                    </td>
                    <td className="table-cell">
                      <span className="font-semibold text-slate-800">{teacher.studentsCount}</span>
                      <span className="text-slate-400 text-xs ml-1">ta</span>
                    </td>
                    <td className="table-cell font-semibold text-emerald-700">{formatMoney(teacher.salary)}</td>
                    <td className="table-cell">
                      <StatusBadge status={teacher.status} />
                    </td>
                    <td className="table-cell text-right">
                      <ActionMenu
                        actions={[
                          { label: "Ko'rish", icon: <Eye size={14} />, onClick: () => openDetailsModal(teacher) },
                          { label: 'Tahrirlash', icon: <Edit size={14} />, onClick: () => openEditModal(teacher) },
                          { label: 'Nofaol qilish', icon: <Trash2 size={14} />, onClick: () => setDeleteId(teacher.id), variant: 'danger' },
                        ]}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="O'qituvchini nofaol qilish"
        message="Bu o'qituvchi nofaol qilinadi."
        confirmLabel="Nofaol qilish"
        variant="warning"
      />

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Yangi o'qituvchi qo'shish">
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
              className={inputCls}
              value={createForm.phone}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, phone: event.target.value }))}
              required
            />
          </Field>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-700">Guruh biriktirish (ixtiyoriy)</p>
              <button
                type="button"
                onClick={() => {
                  const next = !groupPickerOpen;
                  setGroupPickerOpen(next);
                  if (next) void loadGroupOptions(groupSearch);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700"
              >
                <Plus size={12} />
                Guruh qo'shish
              </button>
            </div>

            {selectedCreateGroups.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedCreateGroups.map((group) => (
                  <div
                    key={group.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700"
                  >
                    <span>
                      {group.name} - {group.courseName}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedCreateGroups((prev) => prev.filter((item) => item.id !== group.id))}
                      className="rounded-full p-0.5 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
                      aria-label={`Guruhni olib tashlash: ${group.name}`}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {groupPickerOpen && (
              <div className="rounded-xl border border-slate-200 p-3 space-y-3">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    className={`${inputCls} pl-9`}
                    placeholder="Guruh qidirish..."
                    value={groupSearch}
                    onChange={(event) => setGroupSearch(event.target.value)}
                  />
                </div>

                <div className="max-h-44 overflow-y-auto space-y-2">
                  {groupOptionsLoading ? (
                    <p className="text-xs text-slate-500">Guruhlar yuklanmoqda...</p>
                  ) : groupOptions.length === 0 ? (
                    <p className="text-xs text-slate-500">Guruh topilmadi</p>
                  ) : (
                    groupOptions.map((group) => {
                      const selected = selectedCreateGroups.some((item) => item.id === group.id);
                      const isActive = group.status === 'ACTIVE';

                      return (
                        <label
                          key={group.id}
                          className={`flex items-start gap-2 rounded-lg border px-2.5 py-2 text-xs ${
                            selected ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 bg-white'
                          } ${!isActive ? 'opacity-60' : ''}`}
                        >
                          <input
                            type="checkbox"
                            className="mt-0.5"
                            checked={selected}
                            disabled={!isActive}
                            onChange={() => toggleCreateGroupSelection(group)}
                          />
                          <div className="min-w-0">
                            <p className="font-medium text-slate-700 truncate">{group.name}</p>
                            <p className="text-slate-500 truncate">
                              {group.courseName} - {group.status}
                            </p>
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Fan" required>
              <input
                className={inputCls}
                value={createForm.subject}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, subject: event.target.value }))}
                required
              />
            </Field>

            <Field label="Maosh">
              <input
                type="number"
                min="0"
                step="0.01"
                className={inputCls}
                value={createForm.salary}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, salary: event.target.value }))}
              />
            </Field>
          </div>

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

          <FormActions onCancel={() => setCreateOpen(false)} loading={createLoading} submitLabel="Saqlash" />
        </form>
      </Modal>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="O'qituvchini tahrirlash">
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
              className={inputCls}
              value={editForm.phone}
              onChange={(event) => setEditForm((prev) => ({ ...prev, phone: event.target.value }))}
              required
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Fan" required>
              <input
                className={inputCls}
                value={editForm.subject}
                onChange={(event) => setEditForm((prev) => ({ ...prev, subject: event.target.value }))}
                required
              />
            </Field>

            <Field label="Maosh">
              <input
                type="number"
                min="0"
                step="0.01"
                className={inputCls}
                value={editForm.salary}
                onChange={(event) => setEditForm((prev) => ({ ...prev, salary: event.target.value }))}
              />
            </Field>
          </div>

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

          <FormActions onCancel={() => setEditOpen(false)} loading={editLoading} submitLabel="Yangilash" />
        </form>
      </Modal>

      <Modal open={detailsOpen} onClose={() => setDetailsOpen(false)} title="O'qituvchi tafsilotlari" size="lg">
        {detailsLoading ? (
          <p className="py-8 text-center text-sm text-slate-500">Yuklanmoqda...</p>
        ) : !detailsTeacher ? (
          <EmptyState icon={<UserCog />} title="Ma'lumot topilmadi" />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">F.I.O</p>
                <p className="font-semibold text-slate-800">{detailsTeacher.fullName || '-'}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Telefon</p>
                <p className="font-semibold text-slate-800">{detailsTeacher.phone || '-'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-xs text-slate-500">Guruhlar soni</p>
                <p className="text-2xl font-bold text-slate-800">{detailsGroups.length}</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-xs text-slate-500">O'quvchilar soni</p>
                <p className="text-2xl font-bold text-slate-800">{detailsStudents.length}</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200">
              <div className="border-b border-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">Guruhlar</div>
              <div className="max-h-40 overflow-y-auto px-3 py-2 text-sm text-slate-700">
                {detailsGroups.length === 0 ? (
                  <p className="text-slate-500">Guruh topilmadi</p>
                ) : (
                  detailsGroups.map((group) => (
                    <p key={group.id} className="py-1">
                      {group.name || '-'}
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
