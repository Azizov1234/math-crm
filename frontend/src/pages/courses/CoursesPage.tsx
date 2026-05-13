import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Plus, Search, Edit, Trash2, BookOpen, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { coursesApi } from '@/api/courses.api';
import { getErrorMessage } from '@/api/http';
import PageHeader from '@/components/common/PageHeader';
import StatusBadge from '@/components/common/StatusBadge';
import ActionMenu from '@/components/common/ActionMenu';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import EmptyState from '@/components/common/EmptyState';
import { Field, FormActions, inputCls, Modal, selectCls } from '@/components/common/Modal';
import StatCard from '@/components/common/StatCard';
import { formatMoney } from '@/utils/formatMoney';
import { formatDate } from '@/utils/formatDate';

type CourseRow = {
  id: string;
  name: string;
  description?: string | null;
  monthlyPrice: number;
  durationMonths?: number | null;
  groupsCount: number;
  status: string;
  createdAt: string;
};

function mapCourse(item: any): CourseRow {
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    monthlyPrice: Number(item.monthlyPrice ?? 0),
    durationMonths: item.durationMonths,
    groupsCount: Number(item?._count?.groups ?? 0),
    status: item.status,
    createdAt: item.createdAt,
  };
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    monthlyPrice: '',
    durationMonths: '',
    status: 'ACTIVE',
  });
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    monthlyPrice: '',
    durationMonths: '',
    status: 'ACTIVE',
  });
  const [loading, setLoading] = useState(false);

  const loadCourses = async () => {
    try {
      setLoading(true);
      const response = await coursesApi.getAll({
        page: 1,
        limit: 50,
        search: search || undefined,
        status: filterStatus || undefined,
      });
      setCourses((response.data ?? []).map(mapCourse));
    } catch (error) {
      toast.error(getErrorMessage(error, 'Kurslarni yuklashda xatolik'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filterStatus]);

  const filtered = useMemo(() => courses, [courses]);

  useEffect(() => {
    if (expandedCourseId && !filtered.some((course) => course.id === expandedCourseId)) {
      setExpandedCourseId(null);
    }
  }, [filtered, expandedCourseId]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await coursesApi.delete(deleteId);
      toast.success('Kurs nofaol qilindi');
      setDeleteId(null);
      await loadCourses();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Kursni nofaol qilishda xatolik'));
    }
  };

  const openCreateModal = () => {
    setCreateForm({
      name: '',
      description: '',
      monthlyPrice: '',
      durationMonths: '',
      status: 'ACTIVE',
    });
    setCreateOpen(true);
  };

  const openEditModal = async (course: CourseRow) => {
    try {
      const fullCourse = await coursesApi.getById(course.id);
      setEditingCourseId(fullCourse.id);
      setEditForm({
        name: fullCourse.name ?? course.name,
        description: fullCourse.description ?? '',
        monthlyPrice: String(Number(fullCourse.monthlyPrice ?? course.monthlyPrice)),
        durationMonths: fullCourse.durationMonths ? String(fullCourse.durationMonths) : '',
        status: fullCourse.status ?? course.status,
      });
    } catch (error) {
      toast.error(getErrorMessage(error, "Kurs ma'lumotini yuklashda xatolik"));
      setEditingCourseId(course.id);
      setEditForm({
        name: course.name,
        description: course.description ?? '',
        monthlyPrice: String(course.monthlyPrice),
        durationMonths: course.durationMonths ? String(course.durationMonths) : '',
        status: course.status,
      });
    } finally {
      setEditOpen(true);
    }
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setCreateLoading(true);
      const payload: Record<string, any> = {
        name: createForm.name.trim(),
        description: createForm.description.trim() || undefined,
        monthlyPrice: Number(createForm.monthlyPrice),
        status: createForm.status,
      };

      if (createForm.durationMonths.trim()) {
        payload.durationMonths = Number(createForm.durationMonths);
      }

      await coursesApi.create(payload);
      toast.success("Kurs qo'shildi");
      setCreateOpen(false);
      await loadCourses();
    } catch (error) {
      toast.error(getErrorMessage(error, "Kurs qo'shishda xatolik"));
    } finally {
      setCreateLoading(false);
    }
  };

  const handleUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingCourseId) return;

    try {
      setEditLoading(true);
      const payload: Record<string, any> = {
        name: editForm.name.trim(),
        description: editForm.description.trim() || undefined,
        monthlyPrice: Number(editForm.monthlyPrice),
        status: editForm.status,
      };

      if (editForm.durationMonths.trim()) {
        payload.durationMonths = Number(editForm.durationMonths);
      }

      await coursesApi.update(editingCourseId, payload);
      toast.success('Kurs yangilandi');
      setEditOpen(false);
      await loadCourses();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Kursni yangilashda xatolik'));
      console.error(error);
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kurslar"
        subtitle={`Jami ${courses.length} ta kurs`}
        icon={<BookOpen size={20} />}
        actions={
          <button className="btn-primary" onClick={openCreateModal}>
            <Plus size={16} /> Kurs qo'shish
          </button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Jami kurslar" value={courses.length} icon={<BookOpen />} color="indigo" />
        <StatCard title="Faol kurslar" value={courses.filter((course) => course.status === 'ACTIVE').length} icon={<BookOpen />} color="emerald" />
        <StatCard title="Jami guruhlar" value={courses.reduce((sum, course) => sum + course.groupsCount, 0)} icon={<BookOpen />} color="sky" />
        <StatCard
          title="O'rtacha narx"
          value={courses.length ? Math.round(courses.reduce((sum, course) => sum + course.monthlyPrice, 0) / courses.length) : 0}
          icon={<BookOpen />}
          isMoney
          color="amber"
        />
      </div>

      <div className="card overflow-hidden">
        <div className="flex flex-wrap gap-3 p-4 border-b border-slate-100">
          <div className="relative flex-1 min-w-48">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Kurs nomi bo'yicha..."
              className="input-field pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select className="select-field w-auto" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">Barcha statuslar</option>
            <option value="ACTIVE">Faol</option>
            <option value="INACTIVE">Nofaol</option>
          </select>
        </div>

        <div className="md:hidden divide-y divide-slate-100">
          {!loading && filtered.length === 0 ? (
            <EmptyState icon={<BookOpen />} title="Kurs topilmadi" />
          ) : (
            filtered.map((course) => {
              const isExpanded = expandedCourseId === course.id;

              return (
                <div key={course.id} className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                      <BookOpen size={16} className="text-white" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-800 text-sm truncate">{course.name}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <StatusBadge status={course.status} size="sm" />
                      <button
                        type="button"
                        onClick={() => setExpandedCourseId(isExpanded ? null : course.id)}
                        aria-expanded={isExpanded}
                        aria-label={isExpanded ? "Kurs tafsilotlarini yopish" : "Kurs tafsilotlarini ochish"}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 text-slate-500"
                      >
                        <ChevronDown size={16} className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 space-y-3 animate-fade-in">
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="rounded-xl bg-slate-50 px-3 py-2 col-span-2">
                          <p className="text-slate-400 mb-1">Tavsif</p>
                          <p className="font-medium text-slate-700">{course.description || '-'}</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 px-3 py-2">
                          <p className="text-slate-400 mb-1">Oylik narx</p>
                          <p className="font-semibold text-emerald-700">{formatMoney(course.monthlyPrice)}</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 px-3 py-2">
                          <p className="text-slate-400 mb-1">Davomiyligi</p>
                          <p className="font-medium text-slate-700">{course.durationMonths ? `${course.durationMonths} oy` : '-'}</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 px-3 py-2">
                          <p className="text-slate-400 mb-1">Guruhlar</p>
                          <p className="font-medium text-slate-700">{course.groupsCount} ta</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 px-3 py-2">
                          <p className="text-slate-400 mb-1">Qo'shilgan</p>
                          <p className="font-medium text-slate-700">{formatDate(course.createdAt)}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(course)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-medium"
                        >
                          <Edit size={13} />
                          Tahrirlash
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteId(course.id)}
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
                <th className="table-cell">Kurs nomi</th>
                <th className="table-cell">Tavsif</th>
                <th className="table-cell">Oylik narx</th>
                <th className="table-cell">Davomiyligi</th>
                <th className="table-cell">Guruhlar</th>
                <th className="table-cell">Status</th>
                <th className="table-cell">Qo'shilgan</th>
                <th className="table-cell text-right">Amallar</th>
              </tr>
            </thead>
            <tbody>
              {!loading && filtered.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <EmptyState icon={<BookOpen />} title="Kurs topilmadi" />
                  </td>
                </tr>
              ) : (
                filtered.map((course) => (
                  <tr key={course.id} className="table-row">
                    <td className="table-cell">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                          <BookOpen size={14} className="text-white" />
                        </div>
                        <p className="font-semibold text-slate-800 text-sm">{course.name}</p>
                      </div>
                    </td>
                    <td className="table-cell text-slate-500 text-xs max-w-48 truncate">{course.description || '-'}</td>
                    <td className="table-cell font-semibold text-emerald-700">{formatMoney(course.monthlyPrice)}</td>
                    <td className="table-cell text-slate-600">{course.durationMonths ? `${course.durationMonths} oy` : '-'}</td>
                    <td className="table-cell">
                      <span className="font-semibold text-slate-800">{course.groupsCount}</span>
                      <span className="text-slate-400 text-xs ml-1">ta</span>
                    </td>
                    <td className="table-cell">
                      <StatusBadge status={course.status} />
                    </td>
                    <td className="table-cell text-slate-500">{formatDate(course.createdAt)}</td>
                    <td className="table-cell text-right">
                      <ActionMenu
                        actions={[
                          { label: 'Tahrirlash', icon: <Edit size={14} />, onClick: () => openEditModal(course) },
                          { label: "O'chirish", icon: <Trash2 size={14} />, onClick: () => setDeleteId(course.id), variant: 'danger' },
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
        title="Kursni nofaol qilish"
        message="Bu kurs nofaol qilinadi. Mavjud guruhlar ta'sirlanmaydi."
        confirmLabel="Nofaol qilish"
        variant="warning"
      />

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Yangi kurs qo'shish">
        <form onSubmit={handleCreate} className="space-y-4">
          <Field label="Kurs nomi" required>
            <input
              className={inputCls}
              value={createForm.name}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, name: event.target.value }))}
              required
            />
          </Field>

          <Field label="Tavsif">
            <textarea
              className={inputCls}
              rows={3}
              value={createForm.description}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, description: event.target.value }))}
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Oylik narx" required>
              <input
                type="number"
                min="0"
                step="0.01"
                className={inputCls}
                value={createForm.monthlyPrice}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, monthlyPrice: event.target.value }))}
                required
              />
            </Field>

            <Field label="Davomiyligi (oy)">
              <input
                type="number"
                min="1"
                className={inputCls}
                value={createForm.durationMonths}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, durationMonths: event.target.value }))}
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

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Kursni tahrirlash">
        <form onSubmit={handleUpdate} className="space-y-4">
          <Field label="Kurs nomi" required>
            <input
              className={inputCls}
              value={editForm.name}
              onChange={(event) => setEditForm((prev) => ({ ...prev, name: event.target.value }))}
              required
            />
          </Field>

          <Field label="Tavsif">
            <textarea
              className={inputCls}
              rows={3}
              value={editForm.description}
              onChange={(event) => setEditForm((prev) => ({ ...prev, description: event.target.value }))}
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Oylik narx" required>
              <input
                type="number"
                min="0"
                step="0.01"
                className={inputCls}
                value={editForm.monthlyPrice}
                onChange={(event) => setEditForm((prev) => ({ ...prev, monthlyPrice: event.target.value }))}
                required
              />
            </Field>

            <Field label="Davomiyligi (oy)">
              <input
                type="number"
                min="1"
                className={inputCls}
                value={editForm.durationMonths}
                onChange={(event) => setEditForm((prev) => ({ ...prev, durationMonths: event.target.value }))}
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
    </div>
  );
}
