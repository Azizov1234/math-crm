import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { CalendarCheck, ChevronDown, Edit, Eye, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { coursesApi } from '@/api/courses.api';
import { groupsApi } from '@/api/groups.api';
import { getErrorMessage } from '@/api/http';
import { monthlyExamsApi } from '@/api/monthlyExams.api';
import ActionMenu from '@/components/common/ActionMenu';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import EmptyState from '@/components/common/EmptyState';
import { Field, FormActions, inputCls, Modal, selectCls } from '@/components/common/Modal';
import PageHeader from '@/components/common/PageHeader';
import StatusBadge from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/utils/formatDate';

type ExamRow = {
  id: string;
  title: string;
  courseId?: string;
  courseName: string;
  groupId?: string;
  groupName: string;
  examDate: string;
  status: string;
  resultsCount: number;
};

type SelectOption = { id: string; name: string; courseId?: string };

type ExamForm = {
  title: string;
  courseId: string;
  groupId: string;
  examDate: string;
  status: string;
};

type ExamResultRow = {
  id: string;
  studentId: string;
  studentName: string;
  result: 'PASSED' | 'FAILED' | 'SKIPPED' | 'SENT_TO_RETAKE' | 'NOT_SUBMITTED';
  comment?: string | null;
  checkedAt?: string | null;
  createdBy: string;
};

type GroupStudentOption = {
  id: string;
  fullName: string;
};

const initialExamForm: ExamForm = {
  title: '',
  courseId: '',
  groupId: '',
  examDate: '',
  status: 'SCHEDULED',
};

const RESULT_OPTIONS: Array<{
  value: ExamResultRow['result'];
  label: string;
  className: string;
}> = [
  { value: 'PASSED', label: "O'tdi", className: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  { value: 'FAILED', label: "O'tmadi", className: 'border-rose-200 bg-rose-50 text-rose-700' },
  { value: 'SKIPPED', label: 'Qoldirildi', className: 'border-amber-200 bg-amber-50 text-amber-700' },
  { value: 'NOT_SUBMITTED', label: 'Topshirmadi', className: 'border-slate-400 bg-slate-200 text-slate-900' },
  { value: 'SENT_TO_RETAKE', label: 'Qayta topshirishga yuborildi', className: 'border-sky-200 bg-sky-50 text-sky-700' },
];

function mapExam(item: any): ExamRow {
  return {
    id: item.id,
    title: item.title,
    courseId: item.course?.id ?? item.courseId,
    courseName: item.course?.name ?? '-',
    groupId: item.group?.id ?? item.groupId,
    groupName: item.group?.name ?? '-',
    examDate: item.examDate,
    status: item.status,
    resultsCount: Number(item?._count?.results ?? 0),
  };
}

function mapResult(item: any): ExamResultRow {
  return {
    id: item.id,
    studentId: item.student?.id ?? item.studentId,
    studentName: item.student?.fullName ?? '-',
    result: item.result,
    comment: item.comment ?? null,
    checkedAt: item.checkedAt ?? null,
    createdBy: item.createdBy?.fullName ?? item.createdBy?.username ?? '-',
  };
}

function ResultButtons({
  value,
  onChange,
}: {
  value: ExamResultRow['result'];
  onChange: (value: ExamResultRow['result']) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {RESULT_OPTIONS.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`rounded-xl border px-3 py-2 text-left text-sm font-semibold transition ${
              selected ? option.className : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export default function MonthlyExamsPage() {
  const [exams, setExams] = useState<ExamRow[]>([]);
  const [statsMap, setStatsMap] = useState<Record<string, any>>({});
  const [search, setSearch] = useState('');
  const [filterCourse, setFilterCourse] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const [coursesOptions, setCoursesOptions] = useState<SelectOption[]>([]);
  const [groupsOptions, setGroupsOptions] = useState<SelectOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createForm, setCreateForm] = useState<ExamForm>(initialExamForm);
  const [createCourseSearch, setCreateCourseSearch] = useState('');
  const [createGroupSearch, setCreateGroupSearch] = useState('');
  const [createCourseOpen, setCreateCourseOpen] = useState(false);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const createCourseRef = useRef<HTMLDivElement>(null);
  const createGroupRef = useRef<HTMLDivElement>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ExamForm>(initialExamForm);
  const [editCourseSearch, setEditCourseSearch] = useState('');
  const [editGroupSearch, setEditGroupSearch] = useState('');
  const [editCourseOpen, setEditCourseOpen] = useState(false);
  const [editGroupOpen, setEditGroupOpen] = useState(false);
  const editCourseRef = useRef<HTMLDivElement>(null);
  const editGroupRef = useRef<HTMLDivElement>(null);

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [resultsOpen, setResultsOpen] = useState(false);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [selectedExam, setSelectedExam] = useState<ExamRow | null>(null);
  const [selectedExamStats, setSelectedExamStats] = useState<any>(null);
  const [results, setResults] = useState<ExamResultRow[]>([]);
  const [expandedExamId, setExpandedExamId] = useState<string | null>(null);

  const [groupStudents, setGroupStudents] = useState<GroupStudentOption[]>([]);
  const [groupStudentsLoading, setGroupStudentsLoading] = useState(false);

  const [addResultOpen, setAddResultOpen] = useState(false);
  const [addResultLoading, setAddResultLoading] = useState(false);
  const [addResultSearch, setAddResultSearch] = useState('');
  const [addResultStudentOpen, setAddResultStudentOpen] = useState(false);
  const addResultStudentRef = useRef<HTMLDivElement>(null);
  const [addResultForm, setAddResultForm] = useState({
    studentId: '',
    result: 'PASSED' as ExamResultRow['result'],
    comment: '',
  });

  const [updateResultOpen, setUpdateResultOpen] = useState(false);
  const [updateResultLoading, setUpdateResultLoading] = useState(false);
  const [updateResultForm, setUpdateResultForm] = useState({
    resultId: '',
    studentName: '',
    result: 'PASSED' as ExamResultRow['result'],
    comment: '',
  });

  const [deleteResultTarget, setDeleteResultTarget] = useState<{ id: string; studentName: string } | null>(null);

  const loadExams = async () => {
    try {
      setLoading(true);
      const response = await monthlyExamsApi.getAll({
        page: 1,
        limit: 50,
        search: search || undefined,
        courseId: filterCourse || undefined,
        status: filterStatus || undefined,
      });

      const mapped = (response.data ?? []).map(mapExam);
      setExams(mapped);

      const statisticsEntries = await Promise.all(
        mapped.map(async (exam) => {
          try {
            const stats = await monthlyExamsApi.getStatistics(exam.id);
            return [exam.id, stats] as const;
          } catch {
            return [exam.id, null] as const;
          }
        }),
      );
      setStatsMap(Object.fromEntries(statisticsEntries));
    } catch (error) {
      toast.error(getErrorMessage(error, 'Imtihonlarni yuklashda xatolik'));
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadSelectOptions = async () => {
    try {
      setOptionsLoading(true);
      const [coursesResponse, groupsResponse] = await Promise.all([
        coursesApi.getAll({ page: 1, limit: 100, status: 'ACTIVE' }),
        groupsApi.getAll({ page: 1, limit: 100, status: 'ACTIVE' }),
      ]);

      setCoursesOptions((coursesResponse.data ?? []).map((item: any) => ({ id: item.id, name: item.name })));
      setGroupsOptions(
        (groupsResponse.data ?? []).map((item: any) => ({
          id: item.id,
          name: item.name,
          courseId: item.course?.id ?? item.courseId,
        })),
      );
    } catch (error) {
      toast.error(getErrorMessage(error, "Select ma'lumotlarini yuklashda xatolik"));
      console.error(error);
    } finally {
      setOptionsLoading(false);
    }
  };

  const loadGroupStudents = async (groupId?: string) => {
    if (!groupId) {
      setGroupStudents([]);
      return;
    }

    try {
      setGroupStudentsLoading(true);
      const response = await groupsApi.getStudents(groupId);
      setGroupStudents(
        (response ?? []).map((item: any) => ({
          id: item.student?.id ?? item.studentId,
          fullName: item.student?.fullName ?? '-',
        })),
      );
    } catch (error) {
      toast.error(getErrorMessage(error, "O'quvchilarni yuklashda xatolik"));
      console.error(error);
    } finally {
      setGroupStudentsLoading(false);
    }
  };

  const loadResultsForExam = async (exam: ExamRow) => {
    try {
      setResultsLoading(true);
      const [resultsResponse, statsResponse] = await Promise.all([
        monthlyExamsApi.listResults(exam.id),
        monthlyExamsApi.getStatistics(exam.id),
      ]);
      setResults((resultsResponse ?? []).map(mapResult));
      setSelectedExamStats(statsResponse);
      setStatsMap((prev) => ({ ...prev, [exam.id]: statsResponse }));
    } catch (error) {
      toast.error(getErrorMessage(error, 'Natijalarni yuklashda xatolik'));
      console.error(error);
    } finally {
      setResultsLoading(false);
    }
  };

  const refreshSelectedExamData = async () => {
    if (!selectedExam) return;
    await Promise.all([loadExams(), loadResultsForExam(selectedExam)]);
  };

  useEffect(() => {
    loadExams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filterCourse, filterStatus]);

  useEffect(() => {
    loadSelectOptions();
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (createCourseRef.current && !createCourseRef.current.contains(e.target as Node)) {
        setCreateCourseOpen(false);
      }
      if (createGroupRef.current && !createGroupRef.current.contains(e.target as Node)) {
        setCreateGroupOpen(false);
      }
      if (editCourseRef.current && !editCourseRef.current.contains(e.target as Node)) {
        setEditCourseOpen(false);
      }
      if (editGroupRef.current && !editGroupRef.current.contains(e.target as Node)) {
        setEditGroupOpen(false);
      }
      if (addResultStudentRef.current && !addResultStudentRef.current.contains(e.target as Node)) {
        setAddResultStudentOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const courses = useMemo(
    () => Array.from(new Map(exams.filter((exam) => exam.courseId).map((exam) => [exam.courseId, exam])).values()),
    [exams],
  );

  const filteredCreateGroups = useMemo(() => {
    if (!createForm.courseId) return groupsOptions;
    return groupsOptions.filter((group) => group.courseId === createForm.courseId);
  }, [groupsOptions, createForm.courseId]);

  const filteredEditGroups = useMemo(() => {
    if (!editForm.courseId) return groupsOptions;
    return groupsOptions.filter((group) => group.courseId === editForm.courseId);
  }, [groupsOptions, editForm.courseId]);

  const filteredStudents = useMemo(() => {
    const keyword = addResultSearch.trim().toLowerCase();
    if (!keyword) return groupStudents;
    return groupStudents.filter((student) => student.fullName.toLowerCase().includes(keyword));
  }, [groupStudents, addResultSearch]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await monthlyExamsApi.delete(deleteId);
      toast.success("Imtihon o'chirildi");
      setDeleteId(null);
      await loadExams();
    } catch (error) {
      toast.error(getErrorMessage(error, "Imtihonni o'chirishda xatolik"));
      console.error(error);
    }
  };

  const openCreateModal = () => {
    setCreateForm(initialExamForm);
    setCreateCourseSearch('');
    setCreateGroupSearch('');
    setCreateCourseOpen(false);
    setCreateGroupOpen(false);
    setCreateOpen(true);
  };

  const openEditModal = async (exam: ExamRow) => {
    try {
      const fullExam = await monthlyExamsApi.getById(exam.id);
      setEditingExamId(fullExam.id);
      setEditForm({
        title: fullExam.title ?? exam.title,
        courseId: fullExam.course?.id ?? fullExam.courseId ?? exam.courseId ?? '',
        groupId: fullExam.group?.id ?? fullExam.groupId ?? exam.groupId ?? '',
        examDate: String(fullExam.examDate ?? exam.examDate).slice(0, 10),
        status: fullExam.status ?? exam.status,
      });
    } catch (error) {
      toast.error(getErrorMessage(error, "Imtihon ma'lumotini yuklashda xatolik"));
      setEditingExamId(exam.id);
      setEditForm({
        title: exam.title,
        courseId: exam.courseId ?? '',
        groupId: exam.groupId ?? '',
        examDate: exam.examDate.slice(0, 10),
        status: exam.status,
      });
    } finally {
      setEditCourseSearch('');
      setEditGroupSearch('');
      setEditCourseOpen(false);
      setEditGroupOpen(false);
      setEditOpen(true);
    }
  };

  const openResultsModal = async (exam: ExamRow) => {
    try {
      const fullExam = await monthlyExamsApi.getById(exam.id);
      const mapped = mapExam(fullExam);
      setSelectedExam(mapped);
      setResultsOpen(true);
      await Promise.all([loadResultsForExam(mapped), loadGroupStudents(mapped.groupId)]);
    } catch (error) {
      toast.error(getErrorMessage(error, "Imtihon tafsilotini yuklashda xatolik"));
      setSelectedExam(exam);
      setResultsOpen(true);
      await Promise.all([loadResultsForExam(exam), loadGroupStudents(exam.groupId)]);
    }
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!createForm.courseId) {
      toast.warning('Kursni tanlang');
      return;
    }
    if (!createForm.groupId) {
      toast.warning('Guruhni tanlang');
      return;
    }
    try {
      setCreateLoading(true);
      await monthlyExamsApi.create({
        title: createForm.title.trim(),
        courseId: createForm.courseId,
        groupId: createForm.groupId,
        examDate: createForm.examDate,
        status: createForm.status,
      });

      toast.success("Imtihon qo'shildi");
      setCreateOpen(false);
      await loadExams();
    } catch (error) {
      toast.error(getErrorMessage(error, "Imtihon qo'shishda xatolik"));
      console.error(error);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingExamId) return;
    if (!editForm.courseId) {
      toast.warning('Kursni tanlang');
      return;
    }
    if (!editForm.groupId) {
      toast.warning('Guruhni tanlang');
      return;
    }

    try {
      setEditLoading(true);
      await monthlyExamsApi.update(editingExamId, {
        title: editForm.title.trim(),
        courseId: editForm.courseId,
        groupId: editForm.groupId,
        examDate: editForm.examDate,
        status: editForm.status,
      });

      toast.success('Imtihon yangilandi');
      setEditOpen(false);
      await loadExams();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Imtihonni yangilashda xatolik'));
      console.error(error);
    } finally {
      setEditLoading(false);
    }
  };

  const openAddResultModal = () => {
    setAddResultForm({ studentId: '', result: 'PASSED', comment: '' });
    setAddResultSearch('');
    setAddResultStudentOpen(false);
    setAddResultOpen(true);
  };

  const handleAddResult = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedExam) return;
    if (!addResultForm.studentId) {
      toast.error("O'quvchini tanlang");
      return;
    }

    try {
      setAddResultLoading(true);
      await monthlyExamsApi.createResult(selectedExam.id, {
        studentId: addResultForm.studentId,
        result: addResultForm.result,
        comment: addResultForm.comment.trim() || undefined,
      });
      toast.success("Natija qo'shildi");
      setAddResultStudentOpen(false);
      setAddResultOpen(false);
      await refreshSelectedExamData();
    } catch (error) {
      toast.error(getErrorMessage(error, "Natija qo'shishda xatolik"));
      console.error(error);
    } finally {
      setAddResultLoading(false);
    }
  };

  const openUpdateResultModal = (row: ExamResultRow) => {
    setUpdateResultForm({
      resultId: row.id,
      studentName: row.studentName,
      result: row.result,
      comment: row.comment ?? '',
    });
    setUpdateResultOpen(true);
  };

  const handleUpdateResult = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedExam || !updateResultForm.resultId) return;

    try {
      setUpdateResultLoading(true);
      await monthlyExamsApi.updateResult(selectedExam.id, updateResultForm.resultId, {
        result: updateResultForm.result,
        comment: updateResultForm.comment.trim() || undefined,
      });
      toast.success('Natija yangilandi');
      setUpdateResultOpen(false);
      await refreshSelectedExamData();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Natijani yangilashda xatolik'));
      console.error(error);
    } finally {
      setUpdateResultLoading(false);
    }
  };

  const handleDeleteResult = async () => {
    if (!selectedExam || !deleteResultTarget) return;
    try {
      await monthlyExamsApi.deleteResult(selectedExam.id, deleteResultTarget.id);
      toast.success("Natija o'chirildi");
      setDeleteResultTarget(null);
      await refreshSelectedExamData();
    } catch (error) {
      toast.error(getErrorMessage(error, "Natijani o'chirishda xatolik"));
      console.error(error);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Oylik Imtihonlar"
        subtitle={`Jami ${exams.length} ta imtihon`}
        icon={<CalendarCheck size={20} />}
        actions={
          <button className="btn-primary" onClick={openCreateModal}>
            <Plus size={16} /> Imtihon qo'shish
          </button>
        }
      />

      <div className="card overflow-hidden">
        <div className="flex flex-wrap gap-3 border-b border-slate-100 p-4">
          <div className="relative min-w-48 flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Sarlavha yoki guruh..."
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
          <select className="select-field w-auto" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">Barcha holatlar</option>
            <option value="SCHEDULED">Rejalashtirilgan</option>
            <option value="FINISHED">Yakunlangan</option>
            <option value="CANCELLED">Bekor qilingan</option>
          </select>
        </div>

        <div className="md:hidden">
          {!loading && exams.length === 0 ? (
            <EmptyState icon={<CalendarCheck />} title="Imtihonlar topilmadi" />
          ) : (
            <div className="divide-y divide-slate-100">
              {exams.map((exam) => {
                const stats = statsMap[exam.id];
                return (
                  <div key={exam.id} className="space-y-3 p-4">
                    <button
                      type="button"
                      className="flex w-full items-start justify-between gap-3 text-left"
                      onClick={() => setExpandedExamId((prev) => (prev === exam.id ? null : exam.id))}
                    >
                      <p className="min-w-0 text-sm font-semibold text-slate-800">{exam.title}</p>
                      <div className="flex items-center gap-2 shrink-0">
                        <StatusBadge status={exam.status} size="sm" />
                        <ChevronDown
                          size={16}
                          className={`text-slate-400 transition-transform ${expandedExamId === exam.id ? 'rotate-180' : ''}`}
                        />
                      </div>
                    </button>

                    {expandedExamId === exam.id && (
                      <div className="space-y-3 animate-fade-in">
                        <div className="text-xs text-slate-500">
                          <p className="font-medium text-slate-700">{exam.groupName}</p>
                          <p className="text-slate-400">{exam.courseName}</p>
                          <p className="mt-1">{formatDate(exam.examDate)}</p>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <p className="text-slate-500">
                            Natijalar: <span className="font-semibold text-slate-700">{exam.resultsCount} ta</span>
                          </p>
                          {stats ? (
                            <div className="flex gap-1">
                              <span className="font-semibold text-emerald-600">{stats.passedCount}</span>
                              <span className="text-slate-300">/</span>
                              <span className="font-semibold text-rose-600">{stats.failedCount}</span>
                              <span className="text-slate-300">/</span>
                              <span className="font-semibold text-amber-600">{stats.skippedCount}</span>
                              <span className="text-slate-300">/</span>
                              <span className="font-semibold text-slate-600">{stats.notSubmittedCount ?? 0}</span>
                              <span className="text-slate-300">/</span>
                              <span className="font-semibold text-sky-600">{stats.sentToRetakeCount}</span>
                            </div>
                          ) : (
                            <span className="italic text-slate-400">Hisoblanmadi</span>
                          )}
                        </div>

                        <div className="grid grid-cols-3 gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 w-full min-w-0 px-1.5 text-[11px] leading-none [&_svg]:size-3"
                            onClick={() => openResultsModal(exam)}
                          >
                            <Eye /> Natijalar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 w-full min-w-0 px-1.5 text-[11px] leading-none [&_svg]:size-3"
                            onClick={() => openEditModal(exam)}
                          >
                            <Edit /> Tahrirlash
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 w-full min-w-0 px-1.5 text-[11px] leading-none text-rose-600 border-rose-200 hover:bg-rose-50 [&_svg]:size-3"
                            onClick={() => setDeleteId(exam.id)}
                          >
                            <Trash2 /> O'chirish
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="table-head">
              <tr>
                <th className="table-cell">Sarlavha</th>
                <th className="table-cell">Guruh / Kurs</th>
                <th className="table-cell">Sana</th>
                <th className="table-cell">Holati</th>
                <th className="table-cell">Natijalar soni</th>
                <th className="table-cell text-center">Statistika</th>
                <th className="table-cell text-right">Amallar</th>
              </tr>
            </thead>
            <tbody>
              {!loading && exams.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState icon={<CalendarCheck />} title="Imtihonlar topilmadi" />
                  </td>
                </tr>
              ) : (
                exams.map((exam) => {
                  const stats = statsMap[exam.id];
                  return (
                    <tr key={exam.id} className="table-row">
                      <td className="table-cell font-medium text-slate-800">{exam.title}</td>
                      <td className="table-cell">
                        <p className="text-sm font-medium text-slate-700">{exam.groupName}</p>
                        <p className="text-xs text-slate-400">{exam.courseName}</p>
                      </td>
                      <td className="table-cell text-slate-500">{formatDate(exam.examDate)}</td>
                      <td className="table-cell">
                        <StatusBadge status={exam.status} size="sm" />
                      </td>
                      <td className="table-cell font-semibold text-slate-700">{exam.resultsCount} ta</td>
                      <td className="table-cell">
                        {stats ? (
                          <div className="flex justify-center gap-2 text-xs">
                            <span className="font-semibold text-emerald-600">{stats.passedCount}</span>/
                            <span className="font-semibold text-rose-600">{stats.failedCount}</span>/
                            <span className="font-semibold text-amber-600">{stats.skippedCount}</span>/
                            <span className="font-semibold text-slate-600">{stats.notSubmittedCount ?? 0}</span>/
                            <span className="font-semibold text-sky-600">{stats.sentToRetakeCount}</span>
                          </div>
                        ) : (
                          <span className="text-xs italic text-slate-400">Hisoblanmadi</span>
                        )}
                      </td>
                      <td className="table-cell text-right">
                        <ActionMenu
                          actions={[
                            { label: "Natijalarni ko'rish", icon: <Eye size={14} />, onClick: () => openResultsModal(exam) },
                            { label: 'Tahrirlash', icon: <Edit size={14} />, onClick: () => openEditModal(exam) },
                            { label: "O'chirish", icon: <Trash2 size={14} />, onClick: () => setDeleteId(exam.id), variant: 'danger' },
                          ]}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Imtihonni o'chirish"
        message="Imtihon soft delete qilinadi."
        confirmLabel="O'chirish"
        variant="danger"
      />

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Yangi imtihon qo'shish" size="md">
        <form onSubmit={handleCreate} className="space-y-4">
          <Field label="Sarlavha" required>
            <input
              className={inputCls}
              value={createForm.title}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, title: event.target.value }))}
              required
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Kurs" required>
              <div ref={createCourseRef} className="space-y-1">
                <button
                  type="button"
                  onClick={() => setCreateCourseOpen((v) => !v)}
                  className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-sm transition ${
                    createCourseOpen ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <span className={createForm.courseId ? 'font-semibold text-slate-800' : 'text-slate-400'}>
                    {createForm.courseId
                      ? coursesOptions.find((course) => course.id === createForm.courseId)?.name
                      : optionsLoading
                      ? 'Yuklanmoqda...'
                      : 'Kurs tanlang...'}
                  </span>
                  <ChevronDown
                    size={16}
                    className={`text-slate-400 transition-transform duration-200 ${createCourseOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {createCourseOpen && (
                  <div className="rounded-xl border border-slate-200 bg-white shadow-lg">
                    <div className="border-b border-slate-100 p-2">
                      <div className="relative">
                        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs outline-none focus:border-indigo-400"
                          placeholder="Kurs qidiring..."
                          value={createCourseSearch}
                          onChange={(e) => setCreateCourseSearch(e.target.value)}
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="max-h-44 space-y-0.5 overflow-y-auto p-1.5">
                      {coursesOptions
                        .filter((course) => course.name.toLowerCase().includes(createCourseSearch.toLowerCase()))
                        .map((course) => (
                          <button
                            type="button"
                            key={course.id}
                            onClick={() => {
                              setCreateForm((prev) => ({ ...prev, courseId: course.id, groupId: '' }));
                              setCreateCourseOpen(false);
                              setCreateGroupSearch('');
                            }}
                            className={`w-full rounded-lg px-3 py-2 text-left text-xs font-medium transition ${
                              createForm.courseId === course.id ? 'bg-indigo-600 text-white' : 'text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {course.name}
                          </button>
                        ))}
                      {coursesOptions.filter((course) => course.name.toLowerCase().includes(createCourseSearch.toLowerCase())).length ===
                        0 && <p className="px-3 py-2 text-xs text-slate-400">Kurs topilmadi</p>}
                    </div>
                  </div>
                )}
              </div>
            </Field>

            <Field label="Guruh" required>
              <div ref={createGroupRef} className="space-y-1">
                <button
                  type="button"
                  onClick={() => setCreateGroupOpen((v) => !v)}
                  className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-sm transition ${
                    createGroupOpen ? 'border-sky-400 bg-sky-50' : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <span className={createForm.groupId ? 'font-semibold text-slate-800' : 'text-slate-400'}>
                    {createForm.groupId
                      ? filteredCreateGroups.find((group) => group.id === createForm.groupId)?.name ?? 'Guruh tanlangan'
                      : !createForm.courseId
                      ? 'Avval kurs tanlang...'
                      : optionsLoading
                      ? 'Yuklanmoqda...'
                      : 'Guruh tanlang...'}
                  </span>
                  <ChevronDown
                    size={16}
                    className={`text-slate-400 transition-transform duration-200 ${createGroupOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {createGroupOpen && (
                  <div className="rounded-xl border border-slate-200 bg-white shadow-lg">
                    <div className="border-b border-slate-100 p-2">
                      <div className="relative">
                        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs outline-none focus:border-sky-400"
                          placeholder="Guruh qidiring..."
                          value={createGroupSearch}
                          onChange={(e) => setCreateGroupSearch(e.target.value)}
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="max-h-44 space-y-0.5 overflow-y-auto p-1.5">
                      {filteredCreateGroups
                        .filter((group) => group.name.toLowerCase().includes(createGroupSearch.toLowerCase()))
                        .map((group) => {
                          const selected = createForm.groupId === group.id;
                          return (
                            <button
                              type="button"
                              key={group.id}
                              onClick={() => setCreateForm((prev) => ({ ...prev, groupId: selected ? '' : group.id }))}
                              className={`flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-xs transition ${
                                selected
                                  ? 'border-sky-300 bg-sky-50 text-sky-700'
                                  : 'border-transparent text-slate-700 hover:border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              <div
                                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                                  selected ? 'border-sky-600 bg-sky-600' : 'border-slate-300'
                                }`}
                              >
                                {selected && <div className="h-2 w-2 rounded-sm bg-white" />}
                              </div>
                              <span className={selected ? 'font-semibold' : ''}>{group.name}</span>
                            </button>
                          );
                        })}
                      {filteredCreateGroups.filter((group) => group.name.toLowerCase().includes(createGroupSearch.toLowerCase()))
                        .length === 0 && <p className="px-3 py-2 text-xs text-slate-400">Guruh topilmadi</p>}
                    </div>
                  </div>
                )}
              </div>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Imtihon sanasi" required>
              <input
                type="date"
                className={inputCls}
                value={createForm.examDate}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, examDate: event.target.value }))}
                required
              />
            </Field>

            <Field label="Holat" required>
              <select
                className={selectCls}
                value={createForm.status}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, status: event.target.value }))}
              >
                <option value="SCHEDULED">Rejalashtirilgan</option>
                <option value="FINISHED">Yakunlangan</option>
                <option value="CANCELLED">Bekor qilingan</option>
              </select>
            </Field>
          </div>

          <FormActions onCancel={() => setCreateOpen(false)} loading={createLoading} submitLabel="Saqlash" />
        </form>
      </Modal>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Imtihonni tahrirlash" size="md">
        <form onSubmit={handleUpdate} className="space-y-4">
          <Field label="Sarlavha" required>
            <input
              className={inputCls}
              value={editForm.title}
              onChange={(event) => setEditForm((prev) => ({ ...prev, title: event.target.value }))}
              required
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Kurs" required>
              <div ref={editCourseRef} className="space-y-1">
                <button
                  type="button"
                  onClick={() => setEditCourseOpen((v) => !v)}
                  className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-sm transition ${
                    editCourseOpen ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <span className={editForm.courseId ? 'font-semibold text-slate-800' : 'text-slate-400'}>
                    {editForm.courseId
                      ? coursesOptions.find((course) => course.id === editForm.courseId)?.name
                      : optionsLoading
                      ? 'Yuklanmoqda...'
                      : 'Kurs tanlang...'}
                  </span>
                  <ChevronDown
                    size={16}
                    className={`text-slate-400 transition-transform duration-200 ${editCourseOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {editCourseOpen && (
                  <div className="rounded-xl border border-slate-200 bg-white shadow-lg">
                    <div className="border-b border-slate-100 p-2">
                      <div className="relative">
                        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs outline-none focus:border-indigo-400"
                          placeholder="Kurs qidiring..."
                          value={editCourseSearch}
                          onChange={(e) => setEditCourseSearch(e.target.value)}
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="max-h-44 space-y-0.5 overflow-y-auto p-1.5">
                      {coursesOptions
                        .filter((course) => course.name.toLowerCase().includes(editCourseSearch.toLowerCase()))
                        .map((course) => (
                          <button
                            type="button"
                            key={course.id}
                            onClick={() => {
                              setEditForm((prev) => ({ ...prev, courseId: course.id, groupId: '' }));
                              setEditCourseOpen(false);
                              setEditGroupSearch('');
                            }}
                            className={`w-full rounded-lg px-3 py-2 text-left text-xs font-medium transition ${
                              editForm.courseId === course.id ? 'bg-indigo-600 text-white' : 'text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {course.name}
                          </button>
                        ))}
                      {coursesOptions.filter((course) => course.name.toLowerCase().includes(editCourseSearch.toLowerCase())).length ===
                        0 && <p className="px-3 py-2 text-xs text-slate-400">Kurs topilmadi</p>}
                    </div>
                  </div>
                )}
              </div>
            </Field>

            <Field label="Guruh" required>
              <div ref={editGroupRef} className="space-y-1">
                <button
                  type="button"
                  onClick={() => setEditGroupOpen((v) => !v)}
                  className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-sm transition ${
                    editGroupOpen ? 'border-sky-400 bg-sky-50' : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <span className={editForm.groupId ? 'font-semibold text-slate-800' : 'text-slate-400'}>
                    {editForm.groupId
                      ? filteredEditGroups.find((group) => group.id === editForm.groupId)?.name ?? 'Guruh tanlangan'
                      : !editForm.courseId
                      ? 'Avval kurs tanlang...'
                      : optionsLoading
                      ? 'Yuklanmoqda...'
                      : 'Guruh tanlang...'}
                  </span>
                  <ChevronDown
                    size={16}
                    className={`text-slate-400 transition-transform duration-200 ${editGroupOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {editGroupOpen && (
                  <div className="rounded-xl border border-slate-200 bg-white shadow-lg">
                    <div className="border-b border-slate-100 p-2">
                      <div className="relative">
                        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs outline-none focus:border-sky-400"
                          placeholder="Guruh qidiring..."
                          value={editGroupSearch}
                          onChange={(e) => setEditGroupSearch(e.target.value)}
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="max-h-44 space-y-0.5 overflow-y-auto p-1.5">
                      {filteredEditGroups
                        .filter((group) => group.name.toLowerCase().includes(editGroupSearch.toLowerCase()))
                        .map((group) => {
                          const selected = editForm.groupId === group.id;
                          return (
                            <button
                              type="button"
                              key={group.id}
                              onClick={() => setEditForm((prev) => ({ ...prev, groupId: selected ? '' : group.id }))}
                              className={`flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-xs transition ${
                                selected
                                  ? 'border-sky-300 bg-sky-50 text-sky-700'
                                  : 'border-transparent text-slate-700 hover:border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              <div
                                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                                  selected ? 'border-sky-600 bg-sky-600' : 'border-slate-300'
                                }`}
                              >
                                {selected && <div className="h-2 w-2 rounded-sm bg-white" />}
                              </div>
                              <span className={selected ? 'font-semibold' : ''}>{group.name}</span>
                            </button>
                          );
                        })}
                      {filteredEditGroups.filter((group) => group.name.toLowerCase().includes(editGroupSearch.toLowerCase()))
                        .length === 0 && <p className="px-3 py-2 text-xs text-slate-400">Guruh topilmadi</p>}
                    </div>
                  </div>
                )}
              </div>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Imtihon sanasi" required>
              <input
                type="date"
                className={inputCls}
                value={editForm.examDate}
                onChange={(event) => setEditForm((prev) => ({ ...prev, examDate: event.target.value }))}
                required
              />
            </Field>

            <Field label="Holat" required>
              <select
                className={selectCls}
                value={editForm.status}
                onChange={(event) => setEditForm((prev) => ({ ...prev, status: event.target.value }))}
              >
                <option value="SCHEDULED">Rejalashtirilgan</option>
                <option value="FINISHED">Yakunlangan</option>
                <option value="CANCELLED">Bekor qilingan</option>
              </select>
            </Field>
          </div>

          <FormActions onCancel={() => setEditOpen(false)} loading={editLoading} submitLabel="Yangilash" />
        </form>
      </Modal>

      <Modal
        open={resultsOpen}
        onClose={() => setResultsOpen(false)}
        title={selectedExam ? `${selectedExam.title} natijalari` : 'Natijalar'}
        size="lg"
        zIndex={90}
        overlayZIndex={80}
      >
        {selectedExam ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-800">{selectedExam.groupName} - {selectedExam.courseName}</p>
              <p className="text-xs text-slate-500">{formatDate(selectedExam.examDate)}</p>
              {selectedExamStats ? (
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
                  <div className="rounded-lg bg-white p-2 text-center text-xs">
                    <p className="text-slate-500">O'tdi</p>
                    <p className="font-bold text-emerald-600">{selectedExamStats.passedCount}</p>
                  </div>
                  <div className="rounded-lg bg-white p-2 text-center text-xs">
                    <p className="text-slate-500">O'tmadi</p>
                    <p className="font-bold text-rose-600">{selectedExamStats.failedCount}</p>
                  </div>
                  <div className="rounded-lg bg-white p-2 text-center text-xs">
                    <p className="text-slate-500">Qoldirildi</p>
                    <p className="font-bold text-amber-600">{selectedExamStats.skippedCount}</p>
                  </div>
                  <div className="rounded-lg bg-white p-2 text-center text-xs">
                    <p className="text-slate-500">Topshirmadi</p>
                    <p className="font-bold text-slate-700">{selectedExamStats.notSubmittedCount ?? 0}</p>
                  </div>
                  <div className="rounded-lg bg-white p-2 text-center text-xs">
                    <p className="text-slate-500">Qayta</p>
                    <p className="font-bold text-sky-600">{selectedExamStats.sentToRetakeCount}</p>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-between">
              <Button type="button" variant="outline" onClick={() => loadResultsForExam(selectedExam)}>
                <RefreshCw size={14} /> Yangilash
              </Button>
              <Button type="button" onClick={openAddResultModal}>
                <Plus size={14} /> Natija qo'shish
              </Button>
            </div>

            {resultsLoading ? (
              <div className="py-8 text-center text-sm text-slate-500">Yuklanmoqda...</div>
            ) : results.length === 0 ? (
              <EmptyState icon={<CalendarCheck />} title="Natijalar topilmadi" />
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full">
                  <thead className="table-head">
                    <tr>
                      <th className="table-cell">O'quvchi</th>
                      <th className="table-cell">Natija</th>
                      <th className="table-cell">Izoh</th>
                      <th className="table-cell">Sana</th>
                      <th className="table-cell">Tekshirdi</th>
                      <th className="table-cell text-right">Amallar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((row) => (
                      <tr key={row.id} className="table-row">
                        <td className="table-cell font-medium text-slate-800">{row.studentName}</td>
                        <td className="table-cell">
                          <StatusBadge status={row.result} size="sm" />
                        </td>
                        <td className="table-cell text-xs text-slate-500">{row.comment || '-'}</td>
                        <td className="table-cell text-slate-500">{row.checkedAt ? formatDate(row.checkedAt) : '-'}</td>
                        <td className="table-cell text-xs text-slate-500">{row.createdBy}</td>
                        <td className="table-cell text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-indigo-600"
                              onClick={() => openUpdateResultModal(row)}
                            >
                              <Edit size={15} />
                            </button>
                            <button
                              type="button"
                              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                              onClick={() => setDeleteResultTarget({ id: row.id, studentName: row.studentName })}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : null}
      </Modal>

      <Modal open={addResultOpen} onClose={() => setAddResultOpen(false)} title="Natija qo'shish" size="md" zIndex={96} overlayZIndex={95}>
        <form onSubmit={handleAddResult} className="space-y-4">
          <Field label="O'quvchi" required>
            <div ref={addResultStudentRef} className="space-y-1">
              <button
                type="button"
                onClick={() => setAddResultStudentOpen((v) => !v)}
                className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-sm transition ${
                  addResultStudentOpen ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <span className={addResultForm.studentId ? 'font-semibold text-slate-800' : 'text-slate-400'}>
                  {addResultForm.studentId
                    ? groupStudents.find((student) => student.id === addResultForm.studentId)?.fullName ?? "O'quvchi tanlangan"
                    : groupStudentsLoading
                    ? 'Yuklanmoqda...'
                    : "O'quvchini tanlang..."}
                </span>
                <ChevronDown
                  size={16}
                  className={`text-slate-400 transition-transform duration-200 ${addResultStudentOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {addResultStudentOpen && (
                <div className="rounded-xl border border-slate-200 bg-white shadow-lg">
                  <div className="border-b border-slate-100 p-2">
                    <div className="relative">
                      <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs outline-none focus:border-indigo-400"
                        placeholder="Ism bo'yicha qidiring..."
                        value={addResultSearch}
                        onChange={(event) => setAddResultSearch(event.target.value)}
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="max-h-44 space-y-0.5 overflow-y-auto p-1.5">
                    {filteredStudents.map((student) => {
                      const selected = addResultForm.studentId === student.id;
                      return (
                        <button
                          type="button"
                          key={student.id}
                          onClick={() => {
                            setAddResultForm((prev) => ({ ...prev, studentId: student.id }));
                            setAddResultStudentOpen(false);
                          }}
                          className={`w-full rounded-lg px-3 py-2 text-left text-xs font-medium transition ${
                            selected ? 'bg-indigo-600 text-white' : 'text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {student.fullName}
                        </button>
                      );
                    })}
                    {!groupStudentsLoading && filteredStudents.length === 0 && (
                      <p className="px-3 py-2 text-xs text-slate-400">O'quvchilar topilmadi</p>
                    )}
                    {groupStudentsLoading && <p className="px-3 py-2 text-xs text-slate-400">Yuklanmoqda...</p>}
                  </div>
                </div>
              )}
            </div>
          </Field>

          <Field label="Natija" required>
            <ResultButtons value={addResultForm.result} onChange={(value) => setAddResultForm((prev) => ({ ...prev, result: value }))} />
          </Field>

          <Field label="Izoh">
            <textarea
              className={inputCls}
              rows={3}
              value={addResultForm.comment}
              onChange={(event) => setAddResultForm((prev) => ({ ...prev, comment: event.target.value }))}
            />
          </Field>

          <FormActions onCancel={() => setAddResultOpen(false)} loading={addResultLoading} submitLabel="Saqlash" />
        </form>
      </Modal>

      <Modal open={updateResultOpen} onClose={() => setUpdateResultOpen(false)} title="Natijani yangilash" size="md" zIndex={96} overlayZIndex={95}>
        <form onSubmit={handleUpdateResult} className="space-y-4">
          <Field label="O'quvchi">
            <input className={inputCls} value={updateResultForm.studentName} readOnly />
          </Field>

          <Field label="Natija" required>
            <ResultButtons
              value={updateResultForm.result}
              onChange={(value) => setUpdateResultForm((prev) => ({ ...prev, result: value }))}
            />
          </Field>

          <Field label="Izoh">
            <textarea
              className={inputCls}
              rows={3}
              value={updateResultForm.comment}
              onChange={(event) => setUpdateResultForm((prev) => ({ ...prev, comment: event.target.value }))}
            />
          </Field>

          <FormActions onCancel={() => setUpdateResultOpen(false)} loading={updateResultLoading} submitLabel="Yangilash" />
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteResultTarget}
        onClose={() => setDeleteResultTarget(null)}
        onConfirm={handleDeleteResult}
        title="Natijani o'chirish"
        message={
          deleteResultTarget
            ? `${deleteResultTarget.studentName} uchun natija o'chiriladi. Davom etasizmi?`
            : "Natija o'chiriladi."
        }
        confirmLabel="O'chirish"
        variant="danger"
      />
    </div>
  );
}
