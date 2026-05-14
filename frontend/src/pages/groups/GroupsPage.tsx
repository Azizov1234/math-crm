import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Edit, Eye, Layers, Plus, Search, Trash2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { coursesApi } from '@/api/courses.api';
import { getErrorMessage } from '@/api/http';
import { groupsApi } from '@/api/groups.api';
import { teachersApi } from '@/api/teachers.api';
import ActionMenu from '@/components/common/ActionMenu';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import EmptyState from '@/components/common/EmptyState';
import { Field, FormActions, inputCls, Modal, selectCls } from '@/components/common/Modal';
import PageHeader from '@/components/common/PageHeader';
import StatusBadge from '@/components/common/StatusBadge';
import { formatMoney } from '@/utils/formatMoney';

type GroupRow = {
  id: string;
  name: string;
  courseId: string;
  courseName: string;
  teacherIds: string[];
  teacherName: string;
  lessonDays: string;
  lessonTime: string;
  startDate: string;
  endDate?: string | null;
  monthlyFee: number;
  studentsCount: number;
  status: string;
};

type SelectOption = { id: string; name: string; monthlyPrice?: number };

type GroupForm = {
  courseId: string;
  teacherIds: string[];
  name: string;
  lessonDays: string;
  lessonTime: string;
  startDate: string;
  endDate: string;
  monthlyFee: string;
  status: string;
};

const initialForm: GroupForm = {
  courseId: '',
  teacherIds: [],
  name: '',
  lessonDays: '',
  lessonTime: '',
  startDate: '',
  endDate: '',
  monthlyFee: '',
  status: 'ACTIVE',
};

function normalizeMoneyInput(value: string) {
  return value.replace(/[^\d]/g, '');
}

function mapGroup(item: any): GroupRow {
  return {
    id: item.id,
    name: item.name,
    courseId: item.course?.id ?? item.courseId,
    courseName: item.course?.name ?? '-',
    teacherIds: item.teacherIds ?? (item.teacher?.id ? [item.teacher.id] : []),
    teacherName: item.allTeachers ? item.allTeachers.map((t: any) => t.fullName).join(', ') : (item.teacher?.fullName ?? '-'),
    lessonDays: item.lessonDays,
    lessonTime: item.lessonTime,
    startDate: item.startDate,
    endDate: item.endDate,
    monthlyFee: Number(item.monthlyFee ?? 0),
    studentsCount: Number(item?._count?.students ?? 0),
    status: item.status,
  };
}

function toInputDate(value?: string | null) {
  if (!value) return '';
  return value.slice(0, 10);
}

export default function GroupsPage() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [search, setSearch] = useState('');
  const [filterCourse, setFilterCourse] = useState('');
  const [filterTeacher, setFilterTeacher] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [coursesOptions, setCoursesOptions] = useState<SelectOption[]>([]);
  const [teachersOptions, setTeachersOptions] = useState<SelectOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createForm, setCreateForm] = useState<GroupForm>(initialForm);
  const [createCourseSearch, setCreateCourseSearch] = useState('');
  const [createTeacherSearch, setCreateTeacherSearch] = useState('');
  const [createCourseOpen, setCreateCourseOpen] = useState(false);
  const [createTeacherOpen, setCreateTeacherOpen] = useState(false);
  const createCourseRef = useRef<HTMLDivElement>(null);
  const createTeacherRef = useRef<HTMLDivElement>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<GroupForm>(initialForm);
  const [editCourseSearch, setEditCourseSearch] = useState('');
  const [editTeacherSearch, setEditTeacherSearch] = useState('');
  const [editCourseOpen, setEditCourseOpen] = useState(false);
  const [editTeacherOpen, setEditTeacherOpen] = useState(false);
  const editCourseRef = useRef<HTMLDivElement>(null);
  const editTeacherRef = useRef<HTMLDivElement>(null);

  const WEEKDAYS = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sha', 'Ya'];

  // Outside click to close dropdowns
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (createCourseRef.current && !createCourseRef.current.contains(e.target as Node)) {
        setCreateCourseOpen(false);
      }
      if (createTeacherRef.current && !createTeacherRef.current.contains(e.target as Node)) {
        setCreateTeacherOpen(false);
      }
      if (editCourseRef.current && !editCourseRef.current.contains(e.target as Node)) {
        setEditCourseOpen(false);
      }
      if (editTeacherRef.current && !editTeacherRef.current.contains(e.target as Node)) {
        setEditTeacherOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const loadGroups = async () => {
    try {
      setLoading(true);
      const response = await groupsApi.getAll({
        page: 1,
        limit: 50,
        search: search || undefined,
        courseId: filterCourse || undefined,
        teacherId: filterTeacher || undefined,
        status: filterStatus || undefined,
      });
      setGroups((response.data ?? []).map(mapGroup));
    } catch (error) {
      toast.error(getErrorMessage(error, 'Guruhlarni yuklashda xatolik'));
    } finally {
      setLoading(false);
    }
  };

  const loadSelectOptions = async () => {
    try {
      setOptionsLoading(true);
      const [coursesResponse, teachersResponse] = await Promise.all([
        coursesApi.getAll({ page: 1, limit: 100, status: 'ACTIVE' }),
        teachersApi.getAll({ page: 1, limit: 100, status: 'ACTIVE' }),
      ]);

      setCoursesOptions(
        (coursesResponse.data ?? []).map((item: any) => ({
          id: item.id,
          name: item.name,
          monthlyPrice: Number(item.monthlyPrice ?? 0),
        })),
      );
      setTeachersOptions(
        (teachersResponse.data ?? []).map((item: any) => ({
          id: item.id,
          name: item.fullName,
        })),
      );
    } catch (error) {
      toast.error(getErrorMessage(error, "Select ma'lumotlarini yuklashda xatolik"));
      console.error(error);
    } finally {
      setOptionsLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filterCourse, filterTeacher, filterStatus]);

  useEffect(() => {
    loadSelectOptions();
  }, []);

  useEffect(() => {
    if (expandedGroupId && !groups.some((group) => group.id === expandedGroupId)) {
      setExpandedGroupId(null);
    }
  }, [groups, expandedGroupId]);

  const makeCreatePayload = (form: GroupForm) => ({
    courseId: form.courseId,
    teacherIds: form.teacherIds,
    name: form.name.trim(),
    lessonDays: form.lessonDays.trim(),
    lessonTime: form.lessonTime.trim(),
    startDate: form.startDate,
    endDate: form.endDate || undefined,
    monthlyFee: Number(form.monthlyFee),
    status: form.status,
  });

  const makeUpdatePayload = (form: GroupForm) => ({
    courseId: form.courseId,
    teacherIds: form.teacherIds,
    name: form.name.trim(),
    lessonDays: form.lessonDays.trim(),
    lessonTime: form.lessonTime.trim(),
    startDate: form.startDate,
    endDate: form.endDate || null,
    monthlyFee: Number(form.monthlyFee),
    status: form.status,
  });

  const openCreateModal = () => {
    setCreateForm(initialForm);
    setCreateCourseSearch('');
    setCreateTeacherSearch('');
    setCreateOpen(true);
  };

  const getCourseMonthlyPrice = (courseId: string) => {
    const selectedCourse = coursesOptions.find((course) => course.id === courseId);
    if (!selectedCourse) return '';
    return String(selectedCourse.monthlyPrice ?? '');
  };

  const visibleCreateTeachers = teachersOptions;

  const visibleEditTeachers = teachersOptions;

  const openEditModal = (group: GroupRow) => {
    setEditingGroupId(group.id);
    setEditCourseSearch('');
    setEditTeacherSearch('');
    setEditForm({
      courseId: group.courseId,
      teacherIds: group.teacherIds,
      name: group.name,
      lessonDays: group.lessonDays,
      lessonTime: group.lessonTime,
      startDate: toInputDate(group.startDate),
      endDate: toInputDate(group.endDate),
      monthlyFee: String(group.monthlyFee),
      status: group.status,
    });
    setEditOpen(true);
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setCreateLoading(true);
      await groupsApi.create(makeCreatePayload(createForm));
      toast.success("Guruh qo'shildi");
      setCreateOpen(false);
      await loadGroups();
    } catch (error) {
      toast.error(getErrorMessage(error, "Guruh qo'shishda xatolik"));
      console.error(error);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingGroupId) return;

    try {
      setEditLoading(true);
      await groupsApi.update(editingGroupId, makeUpdatePayload(editForm));
      toast.success('Guruh yangilandi');
      setEditOpen(false);
      await loadGroups();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Guruhni yangilashda xatolik'));
      console.error(error);
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await groupsApi.delete(deleteId);
      toast.success("Guruh o'chirildi");
      setDeleteId(null);
      await loadGroups();
    } catch (error) {
      toast.error(getErrorMessage(error, "Guruhni o'chirishda xatolik"));
      console.error(error);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Guruhlar"
        subtitle={`Jami ${groups.length} ta, ${groups.filter((group) => group.status === 'ACTIVE').length} ta faol`}
        icon={<Layers size={20} />}
        actions={
          <button className="btn-primary" onClick={openCreateModal}>
            <Plus size={16} /> Guruh qo'shish
          </button>
        }
      />

      <div className="card overflow-hidden">
        <div className="flex flex-wrap gap-3 border-b border-slate-100 p-4">
          <div className="relative min-w-48 flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Guruh nomi..."
              className="input-field pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select className="select-field w-auto" value={filterCourse} onChange={(e) => setFilterCourse(e.target.value)}>
            <option value="">Barcha kurslar</option>
            {coursesOptions.map((course) => (
              <option key={course.id} value={course.id}>
                {course.name}
              </option>
            ))}
          </select>
          <select className="select-field w-auto" value={filterTeacher} onChange={(e) => setFilterTeacher(e.target.value)}>
            <option value="">Barcha o'qituvchilar</option>
            {teachersOptions.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.name}
              </option>
            ))}
          </select>
          <select className="select-field w-auto" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">Barcha statuslar</option>
            <option value="ACTIVE">Faol</option>
            <option value="INACTIVE">Nofaol</option>
            <option value="COMPLETED">Yakunlangan</option>
          </select>
        </div>

        <div className="md:hidden divide-y divide-slate-100">
          {!loading && groups.length === 0 ? (
            <EmptyState icon={<Layers />} title="Guruh topilmadi" />
          ) : (
            groups.map((group) => {
              const isExpanded = expandedGroupId === group.id;

              return (
                <div key={group.id} className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600">
                      <Layers size={16} className="text-white" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-800">{group.name}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <StatusBadge status={group.status} size="sm" />
                      <button
                        type="button"
                        onClick={() => setExpandedGroupId(isExpanded ? null : group.id)}
                        aria-expanded={isExpanded}
                        aria-label={isExpanded ? 'Guruh tafsilotlarini yopish' : 'Guruh tafsilotlarini ochish'}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500"
                      >
                        <ChevronDown size={16} className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 space-y-3 animate-fade-in">
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="rounded-xl bg-slate-50 px-3 py-2">
                          <p className="mb-1 text-slate-400">Kurs</p>
                          <p className="font-medium text-slate-700 truncate">{group.courseName}</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 px-3 py-2">
                          <p className="mb-1 text-slate-400">O'qituvchi</p>
                          <p className="font-medium text-slate-700 truncate">{group.teacherName}</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 px-3 py-2">
                          <p className="mb-1 text-slate-400">Dars kunlari</p>
                          <p className="font-medium text-slate-700">{group.lessonDays}</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 px-3 py-2">
                          <p className="mb-1 text-slate-400">Vaqti</p>
                          <p className="font-medium text-slate-700">{group.lessonTime}</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 px-3 py-2">
                          <p className="mb-1 text-slate-400">Oylik to'lov</p>
                          <p className="font-semibold text-emerald-700">{formatMoney(group.monthlyFee)}</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 px-3 py-2">
                          <p className="mb-1 text-slate-400">O'quvchilar</p>
                          <p className="font-medium text-slate-700">{group.studentsCount} ta</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => navigate(`/groups/${group.id}`)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700"
                        >
                          <Eye size={13} />
                          Ko'rish
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(group)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700"
                        >
                          <Edit size={13} />
                          Tahrirlash
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteId(group.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600"
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
                <th className="table-cell">Guruh</th>
                <th className="table-cell">Kurs</th>
                <th className="table-cell">O'qituvchi</th>
                <th className="table-cell">Dars kunlari</th>
                <th className="table-cell">Vaqti</th>
                <th className="table-cell">Oylik to'lov</th>
                <th className="table-cell">O'quvchilar</th>
                <th className="table-cell">Status</th>
                <th className="table-cell text-right">Amallar</th>
              </tr>
            </thead>
            <tbody>
              {!loading && groups.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <EmptyState icon={<Layers />} title="Guruh topilmadi" />
                  </td>
                </tr>
              ) : (
                groups.map((group) => (
                  <tr key={group.id} className="table-row cursor-pointer" onClick={() => navigate(`/groups/${group.id}`)}>
                    <td className="table-cell">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600">
                          <Layers size={14} className="text-white" />
                        </div>
                        <p className="text-sm font-semibold text-slate-800">{group.name}</p>
                      </div>
                    </td>
                    <td className="table-cell text-sm text-slate-600">{group.courseName}</td>
                    <td className="table-cell text-sm text-slate-600">{group.teacherName}</td>
                    <td className="table-cell text-xs text-slate-500">{group.lessonDays}</td>
                    <td className="table-cell text-slate-600">{group.lessonTime}</td>
                    <td className="table-cell font-semibold text-emerald-700">{formatMoney(group.monthlyFee)}</td>
                    <td className="table-cell">
                      <span className="font-semibold text-slate-800">{group.studentsCount}</span>
                      <span className="ml-1 text-xs text-slate-400">ta</span>
                    </td>
                    <td className="table-cell">
                      <StatusBadge status={group.status} />
                    </td>
                    <td className="table-cell text-right" onClick={(event) => event.stopPropagation()}>
                      <ActionMenu
                        actions={[
                          { label: "O'quvchi qo'shish", icon: <UserPlus size={14} />, onClick: () => navigate(`/groups/${group.id}`) },
                          { label: "Ko'rish", icon: <Eye size={14} />, onClick: () => navigate(`/groups/${group.id}`) },
                          { label: 'Tahrirlash', icon: <Edit size={14} />, onClick: () => openEditModal(group) },
                          { label: "O'chirish", icon: <Trash2 size={14} />, onClick: () => setDeleteId(group.id), variant: 'danger' },
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
        title="Guruhni o'chirish"
        message="Bu guruh soft delete qilinadi."
        confirmLabel="O'chirish"
        variant="danger"
      />

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Yangi guruh qo'shish" size="lg">
        <form onSubmit={handleCreate} className="space-y-4" autoComplete="off">

          {/* Kurs qidirish - yopiladigan */}
          <Field label="Kurs" required>
            <div ref={createCourseRef} className="space-y-1">
              <button
                type="button"
                onClick={() => setCreateCourseOpen((v) => !v)}
                className={`w-full flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm transition ${
                  createCourseOpen ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <span className={createForm.courseId ? 'font-semibold text-slate-800' : 'text-slate-400'}>
                  {createForm.courseId ? coursesOptions.find(c => c.id === createForm.courseId)?.name : 'Kurs tanlang...'}
                </span>
                <ChevronDown size={16} className={`text-slate-400 transition-transform duration-200 ${createCourseOpen ? 'rotate-180' : ''}`} />
              </button>
              {createCourseOpen && (
                <div className="rounded-xl border border-slate-200 bg-white shadow-lg">
                  <div className="p-2 border-b border-slate-100">
                    <div className="relative">
                      <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs outline-none focus:border-indigo-400"
                        placeholder="Qidirish..."
                        value={createCourseSearch}
                        onChange={(e) => setCreateCourseSearch(e.target.value)}
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="max-h-40 overflow-y-auto p-1.5 space-y-0.5">
                    {coursesOptions.filter(c => c.name.toLowerCase().includes(createCourseSearch.toLowerCase())).map((course) => (
                      <button
                        type="button"
                        key={course.id}
                        onClick={() => {
                          setCreateForm((prev) => ({ ...prev, courseId: course.id, monthlyFee: getCourseMonthlyPrice(course.id) }));
                          setCreateCourseOpen(false);
                        }}
                        className={`w-full text-left rounded-lg px-3 py-2 text-xs font-medium transition ${
                          createForm.courseId === course.id ? 'bg-indigo-600 text-white' : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {course.name}
                      </button>
                    ))}
                    {coursesOptions.filter(c => c.name.toLowerCase().includes(createCourseSearch.toLowerCase())).length === 0 && (
                      <p className="px-3 py-2 text-xs text-slate-400">Kurs topilmadi</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Field>

          {/* O'qituvchilar - yopiladigan multi-select */}
          <Field label="O'qituvchi(lar)" required>
            <div ref={createTeacherRef} className="space-y-1">
              <button
                type="button"
                onClick={() => setCreateTeacherOpen((v) => !v)}
                className={`w-full flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm transition ${
                  createTeacherOpen ? 'border-sky-400 bg-sky-50' : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <span className={createForm.teacherIds.length > 0 ? 'font-semibold text-slate-800' : 'text-slate-400'}>
                  {createForm.teacherIds.length > 0
                    ? `${createForm.teacherIds.length} ta o'qituvchi tanlandi`
                    : "O'qituvchi tanlang..."}
                </span>
                <ChevronDown size={16} className={`text-slate-400 transition-transform duration-200 ${createTeacherOpen ? 'rotate-180' : ''}`} />
              </button>
              {createTeacherOpen && (
                <div className="rounded-xl border border-slate-200 bg-white shadow-lg">
                  <div className="p-2 border-b border-slate-100">
                    <div className="relative">
                      <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs outline-none focus:border-sky-400"
                        placeholder="Qidirish..."
                        value={createTeacherSearch}
                        onChange={(e) => setCreateTeacherSearch(e.target.value)}
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="max-h-44 overflow-y-auto p-1.5 space-y-0.5">
                    {visibleCreateTeachers
                      .filter(t => t.name.toLowerCase().includes(createTeacherSearch.toLowerCase()))
                      .map((teacher) => {
                        const selected = createForm.teacherIds.includes(teacher.id);
                        return (
                          <button
                            type="button"
                            key={teacher.id}
                            onClick={() => setCreateForm((prev) => ({
                              ...prev,
                              teacherIds: selected
                                ? prev.teacherIds.filter(id => id !== teacher.id)
                                : [...prev.teacherIds, teacher.id],
                            }))}
                            className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs transition ${
                              selected ? 'bg-sky-50 border border-sky-300' : 'text-slate-700 hover:bg-slate-100 border border-transparent'
                            }`}
                          >
                            <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                              selected ? 'bg-sky-600 border-sky-600' : 'border-slate-300'
                            }`}>
                              {selected && <div className="h-2 w-2 rounded-sm bg-white" />}
                            </div>
                            <span className={selected ? 'font-semibold text-sky-700' : ''}>{teacher.name}</span>
                          </button>
                        );
                      })}
                    {visibleCreateTeachers.filter(t => t.name.toLowerCase().includes(createTeacherSearch.toLowerCase())).length === 0 && (
                      <p className="px-3 py-2 text-xs text-slate-400">O'qituvchi topilmadi</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Field>

          <Field label="Guruh nomi" required>
            <input
              className={inputCls}
              value={createForm.name}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, name: event.target.value }))}
              autoComplete="off"
              spellCheck={false}
              required
            />
          </Field>

          {/* Hafta kunlari checkbox */}
          <Field label="Dars kunlari" required>
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map((day) => {
                const selected = createForm.lessonDays.split('/').map(d => d.trim()).filter(Boolean).includes(day);
                return (
                  <button
                    type="button"
                    key={day}
                    onClick={() => {
                      const days = createForm.lessonDays.split('/').map(d => d.trim()).filter(Boolean);
                      const next = selected ? days.filter(d => d !== day) : [...days, day];
                      setCreateForm(prev => ({ ...prev, lessonDays: next.join('/') }));
                    }}
                    className={`h-9 w-10 rounded-lg border text-xs font-semibold transition ${
                      selected
                        ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:bg-indigo-50'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
            {createForm.lessonDays && (
              <p className="mt-1 text-xs text-slate-500">Tanlangan: <span className="font-medium">{createForm.lessonDays}</span></p>
            )}
          </Field>

          <Field label="Dars vaqti" required>
            <input
              type="time"
              className={inputCls}
              value={createForm.lessonTime}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, lessonTime: event.target.value }))}
              required
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Boshlanish sanasi" required>
              <input
                type="date"
                className={inputCls}
                value={createForm.startDate}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, startDate: event.target.value }))}
                required
              />
            </Field>

            <Field label="Tugash sanasi">
              <input
                type="date"
                className={inputCls}
                value={createForm.endDate}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, endDate: event.target.value }))}
              />
            </Field>

            <Field label="Oylik to'lov" required>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                min="0"
                className={inputCls}
                value={createForm.monthlyFee}
                onWheel={(event) => (event.currentTarget as HTMLInputElement).blur()}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, monthlyFee: normalizeMoneyInput(event.target.value) }))}
                required
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

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Guruhni tahrirlash" size="lg">
        <form onSubmit={handleUpdate} className="space-y-4" autoComplete="off">

          {/* Kurs qidirish - yopiladigan */}
          <Field label="Kurs" required>
            <div ref={editCourseRef} className="space-y-1">
              <button
                type="button"
                onClick={() => setEditCourseOpen((v) => !v)}
                className={`w-full flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm transition ${
                  editCourseOpen ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <span className={editForm.courseId ? 'font-semibold text-slate-800' : 'text-slate-400'}>
                  {editForm.courseId ? coursesOptions.find(c => c.id === editForm.courseId)?.name : 'Kurs tanlang...'}
                </span>
                <ChevronDown size={16} className={`text-slate-400 transition-transform duration-200 ${editCourseOpen ? 'rotate-180' : ''}`} />
              </button>
              {editCourseOpen && (
                <div className="rounded-xl border border-slate-200 bg-white shadow-lg">
                  <div className="p-2 border-b border-slate-100">
                    <div className="relative">
                      <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs outline-none focus:border-indigo-400"
                        placeholder="Qidirish..."
                        value={editCourseSearch}
                        onChange={(e) => setEditCourseSearch(e.target.value)}
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="max-h-40 overflow-y-auto p-1.5 space-y-0.5">
                    {coursesOptions.filter(c => c.name.toLowerCase().includes(editCourseSearch.toLowerCase())).map((course) => (
                      <button
                        type="button"
                        key={course.id}
                        onClick={() => {
                          setEditForm((prev) => ({ ...prev, courseId: course.id, monthlyFee: getCourseMonthlyPrice(course.id) }));
                          setEditCourseOpen(false);
                        }}
                        className={`w-full text-left rounded-lg px-3 py-2 text-xs font-medium transition ${
                          editForm.courseId === course.id ? 'bg-indigo-600 text-white' : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {course.name}
                      </button>
                    ))}
                    {coursesOptions.filter(c => c.name.toLowerCase().includes(editCourseSearch.toLowerCase())).length === 0 && (
                      <p className="px-3 py-2 text-xs text-slate-400">Kurs topilmadi</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Field>

          {/* O'qituvchilar - yopiladigan multi-select */}
          <Field label="O'qituvchi(lar)" required>
            <div ref={editTeacherRef} className="space-y-1">
              <button
                type="button"
                onClick={() => setEditTeacherOpen((v) => !v)}
                className={`w-full flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm transition ${
                  editTeacherOpen ? 'border-sky-400 bg-sky-50' : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <span className={editForm.teacherIds.length > 0 ? 'font-semibold text-slate-800' : 'text-slate-400'}>
                  {editForm.teacherIds.length > 0
                    ? `${editForm.teacherIds.length} ta o'qituvchi tanlandi`
                    : "O'qituvchi tanlang..."}
                </span>
                <ChevronDown size={16} className={`text-slate-400 transition-transform duration-200 ${editTeacherOpen ? 'rotate-180' : ''}`} />
              </button>
              {editTeacherOpen && (
                <div className="rounded-xl border border-slate-200 bg-white shadow-lg">
                  <div className="p-2 border-b border-slate-100">
                    <div className="relative">
                      <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs outline-none focus:border-sky-400"
                        placeholder="Qidirish..."
                        value={editTeacherSearch}
                        onChange={(e) => setEditTeacherSearch(e.target.value)}
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="max-h-44 overflow-y-auto p-1.5 space-y-0.5">
                    {visibleEditTeachers
                      .filter(t => t.name.toLowerCase().includes(editTeacherSearch.toLowerCase()))
                      .map((teacher) => {
                        const selected = editForm.teacherIds.includes(teacher.id);
                        return (
                          <button
                            type="button"
                            key={teacher.id}
                            onClick={() => setEditForm((prev) => ({
                              ...prev,
                              teacherIds: selected
                                ? prev.teacherIds.filter(id => id !== teacher.id)
                                : [...prev.teacherIds, teacher.id],
                            }))}
                            className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs transition ${
                              selected ? 'bg-sky-50 border border-sky-300' : 'text-slate-700 hover:bg-slate-100 border border-transparent'
                            }`}
                          >
                            <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                              selected ? 'bg-sky-600 border-sky-600' : 'border-slate-300'
                            }`}>
                              {selected && <div className="h-2 w-2 rounded-sm bg-white" />}
                            </div>
                            <span className={selected ? 'font-semibold text-sky-700' : ''}>{teacher.name}</span>
                          </button>
                        );
                      })}
                    {visibleEditTeachers.filter(t => t.name.toLowerCase().includes(editTeacherSearch.toLowerCase())).length === 0 && (
                      <p className="px-3 py-2 text-xs text-slate-400">O'qituvchi topilmadi</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Field>

          <Field label="Guruh nomi" required>
            <input
              className={inputCls}
              value={editForm.name}
              onChange={(event) => setEditForm((prev) => ({ ...prev, name: event.target.value }))}
              autoComplete="off"
              spellCheck={false}
              required
            />
          </Field>

          {/* Hafta kunlari checkbox */}
          <Field label="Dars kunlari" required>
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map((day) => {
                const selected = editForm.lessonDays.split('/').map(d => d.trim()).filter(Boolean).includes(day);
                return (
                  <button
                    type="button"
                    key={day}
                    onClick={() => {
                      const days = editForm.lessonDays.split('/').map(d => d.trim()).filter(Boolean);
                      const next = selected ? days.filter(d => d !== day) : [...days, day];
                      setEditForm(prev => ({ ...prev, lessonDays: next.join('/') }));
                    }}
                    className={`h-9 w-10 rounded-lg border text-xs font-semibold transition ${
                      selected
                        ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:bg-indigo-50'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
            {editForm.lessonDays && (
              <p className="mt-1 text-xs text-slate-500">Tanlangan: <span className="font-medium">{editForm.lessonDays}</span></p>
            )}
          </Field>

          <Field label="Dars vaqti" required>
            <input
              type="time"
              className={inputCls}
              value={editForm.lessonTime}
              onChange={(event) => setEditForm((prev) => ({ ...prev, lessonTime: event.target.value }))}
              required
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Boshlanish sanasi" required>
              <input
                type="date"
                className={inputCls}
                value={editForm.startDate}
                onChange={(event) => setEditForm((prev) => ({ ...prev, startDate: event.target.value }))}
                required
              />
            </Field>

            <Field label="Tugash sanasi">
              <input
                type="date"
                className={inputCls}
                value={editForm.endDate}
                onChange={(event) => setEditForm((prev) => ({ ...prev, endDate: event.target.value }))}
              />
            </Field>

            <Field label="Oylik to'lov" required>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                min="0"
                className={inputCls}
                value={editForm.monthlyFee}
                onWheel={(event) => (event.currentTarget as HTMLInputElement).blur()}
                onChange={(event) => setEditForm((prev) => ({ ...prev, monthlyFee: normalizeMoneyInput(event.target.value) }))}
                required
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
              <option value="COMPLETED">Yakunlangan</option>
            </select>
          </Field>

          <FormActions onCancel={() => setEditOpen(false)} loading={editLoading} submitLabel="Yangilash" />
        </form>
      </Modal>
    </div>
  );
}
