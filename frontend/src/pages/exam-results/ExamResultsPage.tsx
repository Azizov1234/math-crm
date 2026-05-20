import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, ClipboardList, Edit2, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { examResultsApi } from '@/api/examResults.api';
import { getErrorMessage } from '@/api/http';
import { groupsApi } from '@/api/groups.api';
import { monthlyExamsApi } from '@/api/monthlyExams.api';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import EmptyState from '@/components/common/EmptyState';
import { Field, FormActions, Modal, inputCls } from '@/components/common/Modal';
import PageHeader from '@/components/common/PageHeader';
import StatusBadge from '@/components/common/StatusBadge';
import { formatDate } from '@/utils/formatDate';

type ExamResultRow = {
  id: string;
  studentName: string;
  examId?: string;
  examTitle: string;
  groupName: string;
  courseName: string;
  result: 'PASSED' | 'FAILED' | 'SKIPPED' | 'SENT_TO_RETAKE' | 'NOT_SUBMITTED';
  comment?: string | null;
  checkedDate?: string | null;
  checkedBy: string;
};

type ExamOption = {
  id: string;
  title: string;
  groupId: string;
  groupName: string;
  courseName: string;
};

type GroupStudentOption = {
  id: string;
  fullName: string;
};

const RESULT_OPTIONS: Array<{
  value: ExamResultRow['result'];
  label: string;
  activeClassName: string;
}> = [
  { value: 'PASSED', label: "O'tdi", activeClassName: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  { value: 'FAILED', label: "O'tmadi", activeClassName: 'border-rose-200 bg-rose-50 text-rose-700' },
  { value: 'SKIPPED', label: 'Qoldirildi', activeClassName: 'border-amber-200 bg-amber-50 text-amber-700' },
  { value: 'NOT_SUBMITTED', label: 'Topshirmadi', activeClassName: 'border-slate-400 bg-slate-200 text-slate-900' },
  {
    value: 'SENT_TO_RETAKE',
    label: 'Qayta topshirishga yuborildi',
    activeClassName: 'border-sky-200 bg-sky-50 text-sky-700',
  },
];

function mapResult(item: any): ExamResultRow {
  return {
    id: item.id,
    studentName: item.student?.fullName ?? '-',
    examId: item.exam?.id,
    examTitle: item.exam?.title ?? '-',
    groupName: item.exam?.group?.name ?? '-',
    courseName: item.exam?.course?.name ?? '-',
    result: item.result,
    comment: item.comment,
    checkedDate: item.checkedAt ?? null,
    checkedBy: item.createdBy?.fullName ?? item.createdBy?.username ?? '-',
  };
}

function mapExam(item: any): ExamOption {
  return {
    id: item.id,
    title: item.title,
    groupId: item.group?.id ?? item.groupId,
    groupName: item.group?.name ?? '-',
    courseName: item.course?.name ?? '-',
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
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`rounded-xl border px-3 py-2 text-left text-sm font-semibold transition ${
              selected ? option.activeClassName : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export default function ExamResultsPage() {
  const [results, setResults] = useState<ExamResultRow[]>([]);
  const [examOptions, setExamOptions] = useState<ExamOption[]>([]);
  const [search, setSearch] = useState('');
  const [filterExam, setFilterExam] = useState('');
  const [filterResult, setFilterResult] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [expandedResultId, setExpandedResultId] = useState<string | null>(null);

  const [groupStudents, setGroupStudents] = useState<GroupStudentOption[]>([]);
  const [groupStudentsLoading, setGroupStudentsLoading] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addSearch, setAddSearch] = useState('');
  const [addExamSearch, setAddExamSearch] = useState('');
  const [addExamOpen, setAddExamOpen] = useState(false);
  const addExamRef = useRef<HTMLDivElement>(null);
  const [addStudentOpen, setAddStudentOpen] = useState(false);
  const addStudentRef = useRef<HTMLDivElement>(null);
  const [addForm, setAddForm] = useState({
    examId: '',
    studentId: '',
    result: 'PASSED' as ExamResultRow['result'],
    comment: '',
  });

  const [editOpen, setEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editingRow, setEditingRow] = useState<ExamResultRow | null>(null);
  const [editForm, setEditForm] = useState({ result: 'PASSED' as ExamResultRow['result'], comment: '' });

  const [deleteRow, setDeleteRow] = useState<ExamResultRow | null>(null);

  const selectedAddExam = useMemo(
    () => examOptions.find((option) => option.id === addForm.examId) ?? null,
    [addForm.examId, examOptions],
  );

  const filteredStudents = useMemo(() => {
    const keyword = addSearch.trim().toLowerCase();
    if (!keyword) return groupStudents;
    return groupStudents.filter((student) => student.fullName.toLowerCase().includes(keyword));
  }, [addSearch, groupStudents]);

  const filteredAddExams = useMemo(() => {
    const keyword = addExamSearch.trim().toLowerCase();
    if (!keyword) return examOptions;
    return examOptions.filter((exam) =>
      `${exam.title} ${exam.groupName} ${exam.courseName}`.toLowerCase().includes(keyword),
    );
  }, [addExamSearch, examOptions]);

  const loadExamOptions = async () => {
    try {
      const response = await monthlyExamsApi.getAll({ page: 1, limit: 100 });
      setExamOptions((response.data ?? []).map(mapExam));
    } catch (error) {
      toast.error(getErrorMessage(error, "Imtihonlar ro'yxatini yuklashda xatolik"));
      console.error(error);
    }
  };

  const loadResults = async () => {
    try {
      setLoading(true);
      const response = await examResultsApi.getAll({
        page,
        limit,
        search: search || undefined,
        examId: filterExam || undefined,
        result: filterResult || undefined,
      });
      const rows = (response.data ?? []).map(mapResult);
      const meta = response.meta;
      setResults(rows);
      setTotal(meta?.total ?? rows.length);
      setTotalPages(Math.max(meta?.totalPages ?? 1, 1));

      const metaPage = meta?.page ?? page;
      if (metaPage !== page) {
        setPage(metaPage);
      }
    } catch (error) {
      toast.error(getErrorMessage(error, 'Imtihon natijalarini yuklashda xatolik'));
      console.error(error);
    } finally {
      setLoading(false);
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

  useEffect(() => {
    loadExamOptions();
  }, []);

  useEffect(() => {
    loadResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, search, filterExam, filterResult]);

  useEffect(() => {
    if (!loading && page > totalPages) {
      setPage(totalPages);
    }
  }, [loading, page, totalPages]);

  useEffect(() => {
    if (expandedResultId && !results.some((result) => result.id === expandedResultId)) {
      setExpandedResultId(null);
    }
  }, [results, expandedResultId]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (addExamRef.current && !addExamRef.current.contains(e.target as Node)) {
        setAddExamOpen(false);
      }
      if (addStudentRef.current && !addStudentRef.current.contains(e.target as Node)) {
        setAddStudentOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  const startItem = total === 0 ? 0 : (page - 1) * limit + 1;
  const endItem = total === 0 ? 0 : Math.min(page * limit, total);

  const openAddModal = async () => {
    const defaultExamId = addForm.examId || filterExam || examOptions[0]?.id || '';
    setAddForm({
      examId: defaultExamId,
      studentId: '',
      result: 'PASSED',
      comment: '',
    });
    setAddExamSearch('');
    setAddExamOpen(false);
    setAddSearch('');
    setAddStudentOpen(false);
    setAddOpen(true);

    const exam = examOptions.find((item) => item.id === defaultExamId);
    await loadGroupStudents(exam?.groupId);
  };

  const handleAddExamChange = async (examId: string) => {
    setAddForm((prev) => ({ ...prev, examId, studentId: '' }));
    setAddExamOpen(false);
    setAddExamSearch('');
    setAddSearch('');
    setAddStudentOpen(false);
    const exam = examOptions.find((item) => item.id === examId);
    await loadGroupStudents(exam?.groupId);
  };

  const handleAdd = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!addForm.examId || !addForm.studentId) {
      toast.error("Imtihon va o'quvchini tanlang");
      return;
    }

    try {
      setAddLoading(true);
      await monthlyExamsApi.createResult(addForm.examId, {
        studentId: addForm.studentId,
        result: addForm.result,
        comment: addForm.comment.trim() || undefined,
      });
      toast.success("Natija qo'shildi");
      setAddStudentOpen(false);
      setAddOpen(false);
      await Promise.all([loadResults(), loadExamOptions()]);
    } catch (error) {
      toast.error(getErrorMessage(error, "Natija qo'shishda xatolik"));
      console.error(error);
    } finally {
      setAddLoading(false);
    }
  };

  const openEditModal = async (row: ExamResultRow) => {
    try {
      const fullResult = await examResultsApi.getById(row.id);
      const mapped = mapResult(fullResult);
      setEditingRow(mapped);
      setEditForm({
        result: mapped.result,
        comment: mapped.comment ?? '',
      });
    } catch (error) {
      toast.error(getErrorMessage(error, "Natija ma'lumotini yuklashda xatolik"));
      setEditingRow(row);
      setEditForm({
        result: row.result,
        comment: row.comment ?? '',
      });
    } finally {
      setEditOpen(true);
    }
  };

  const handleUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingRow?.examId) {
      toast.error('Exam ID topilmadi');
      return;
    }

    try {
      setEditLoading(true);
      await monthlyExamsApi.updateResult(editingRow.examId, editingRow.id, {
        result: editForm.result,
        comment: editForm.comment.trim() || undefined,
      });
      toast.success('Natija yangilandi');
      setEditOpen(false);
      await Promise.all([loadResults(), loadExamOptions()]);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Natijani yangilashda xatolik'));
      console.error(error);
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteRow?.examId) {
      toast.error('Exam ID topilmadi');
      return;
    }

    try {
      await monthlyExamsApi.deleteResult(deleteRow.examId, deleteRow.id);
      toast.success("Natija o'chirildi");
      setDeleteRow(null);
      await Promise.all([loadResults(), loadExamOptions()]);
    } catch (error) {
      toast.error(getErrorMessage(error, "Natijani o'chirishda xatolik"));
      console.error(error);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Imtihon Natijalari"
        subtitle={`Jami ${total} ta natija`}
        icon={<ClipboardList size={20} />}
        actions={
          <button className="btn-primary" onClick={openAddModal}>
            <Plus size={16} /> Natija qo'shish
          </button>
        }
      />

      <div className="card overflow-hidden">
        <div className="flex flex-wrap gap-3 border-b border-slate-100 p-4">
          <div className="relative min-w-48 flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="O'quvchi ismi..."
              className="input-field pl-9"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <select
            className="select-field w-auto"
            value={filterExam}
            onChange={(e) => {
              setFilterExam(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Barcha imtihonlar</option>
            {examOptions.map((exam) => (
              <option key={exam.id} value={exam.id}>
                {exam.title} ({exam.groupName})
              </option>
            ))}
          </select>
          <select
            className="select-field w-auto"
            value={filterResult}
            onChange={(e) => {
              setFilterResult(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Barcha natijalar</option>
            <option value="PASSED">O'tdi</option>
            <option value="FAILED">O'tmadi</option>
            <option value="SKIPPED">Qoldirildi</option>
            <option value="NOT_SUBMITTED">Topshirmadi</option>
            <option value="SENT_TO_RETAKE">Qayta topshirish</option>
          </select>
        </div>

        <div className="md:hidden">
          {!loading && results.length === 0 ? (
            <EmptyState icon={<ClipboardList />} title="Natijalar topilmadi" />
          ) : (
            <div className="divide-y divide-slate-100">
              {results.map((result) => (
                <div key={result.id} className="space-y-3 p-4">
                  <button
                    type="button"
                    className="flex w-full items-start justify-between gap-3 text-left"
                    onClick={() => setExpandedResultId((prev) => (prev === result.id ? null : result.id))}
                  >
                    <p className="min-w-0 text-sm font-semibold text-slate-800">{result.studentName}</p>
                    <div className="flex shrink-0 items-center gap-2">
                      <StatusBadge status={result.result} size="sm" />
                      <ChevronDown
                        size={16}
                        className={`text-slate-400 transition-transform ${expandedResultId === result.id ? 'rotate-180' : ''}`}
                      />
                    </div>
                  </button>

                  {expandedResultId === result.id && (
                    <div className="space-y-3 animate-fade-in">
                      <div className="text-xs text-slate-500">
                        <p className="font-semibold text-slate-700">{result.examTitle}</p>
                        <p className="font-medium text-slate-600">{result.groupName}</p>
                        <p className="text-slate-400">{result.courseName}</p>
                        <p className="mt-1">{result.checkedDate ? formatDate(result.checkedDate) : '-'}</p>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
                        <p className="text-slate-500">
                          Izoh: <span className="font-medium text-slate-700">{result.comment || '-'}</span>
                        </p>
                        <p className="mt-1 text-slate-500">
                          Tekshirdi: <span className="font-medium text-slate-700">{result.checkedBy}</span>
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          className="flex h-7 w-full items-center justify-center gap-1 rounded-md border border-slate-200 bg-white px-1.5 text-[11px] font-medium text-slate-700 transition hover:bg-slate-50"
                          onClick={() => openEditModal(result)}
                        >
                          <Edit2 size={12} /> Tahrirlash
                        </button>
                        <button
                          type="button"
                          className="flex h-7 w-full items-center justify-center gap-1 rounded-md border border-rose-200 bg-white px-1.5 text-[11px] font-medium text-rose-600 transition hover:bg-rose-50"
                          onClick={() => setDeleteRow(result)}
                        >
                          <Trash2 size={12} /> O'chirish
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="table-head">
              <tr>
                <th className="table-cell">O'quvchi</th>
                <th className="table-cell">Imtihon</th>
                <th className="table-cell">Guruh / Kurs</th>
                <th className="table-cell">Natija</th>
                <th className="table-cell">Izoh</th>
                <th className="table-cell">Sana</th>
                <th className="table-cell">Tekshirdi</th>
                <th className="table-cell text-right">Amallar</th>
              </tr>
            </thead>
            <tbody>
              {!loading && results.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <EmptyState icon={<ClipboardList />} title="Natijalar topilmadi" />
                  </td>
                </tr>
              ) : (
                results.map((result) => (
                  <tr key={result.id} className="table-row">
                    <td className="table-cell font-medium text-slate-800">{result.studentName}</td>
                    <td className="table-cell text-sm text-slate-700">{result.examTitle}</td>
                    <td className="table-cell">
                      <p className="text-sm font-medium text-slate-700">{result.groupName}</p>
                      <p className="text-xs text-slate-400">{result.courseName}</p>
                    </td>
                    <td className="table-cell">
                      <StatusBadge status={result.result} size="sm" />
                    </td>
                    <td className="table-cell max-w-xs truncate text-xs text-slate-500">{result.comment || '-'}</td>
                    <td className="table-cell text-slate-500">{result.checkedDate ? formatDate(result.checkedDate) : '-'}</td>
                    <td className="table-cell text-xs text-slate-600">{result.checkedBy}</td>
                    <td className="table-cell text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-indigo-600"
                          onClick={() => openEditModal(result)}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                          onClick={() => setDeleteRow(result)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-xs text-slate-500">
            {startItem}-{endItem} / {total} ta natija
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              className="select-field w-auto py-2 text-xs"
              value={limit}
              onChange={(event) => {
                const nextLimit = Number(event.target.value);
                setLimit(nextLimit);
                setPage(1);
              }}
            >
              <option value={20}>20 ta</option>
              <option value={50}>50 ta</option>
              <option value={100}>100 ta</option>
            </select>

            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              disabled={page <= 1 || loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
            >
              <ChevronLeft size={14} />
              Oldingi
            </button>

            <span className="text-xs text-slate-500 px-1.5">
              Sahifa {page} / {totalPages}
            </span>

            <button
              type="button"
              onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={page >= totalPages || loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
            >
              Keyingi
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Natija qo'shish" size="md" zIndex={90} overlayZIndex={80}>
        <form onSubmit={handleAdd} className="space-y-4">
          <Field label="Imtihon" required>
            <div ref={addExamRef} className="space-y-1">
              <button
                type="button"
                onClick={() => setAddExamOpen((v) => !v)}
                className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-sm transition ${
                  addExamOpen ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <span className={addForm.examId ? 'font-semibold text-slate-800' : 'text-slate-400'}>
                  {addForm.examId
                    ? (() => {
                        const selected = examOptions.find((exam) => exam.id === addForm.examId);
                        return selected ? `${selected.title} - ${selected.groupName}` : 'Imtihon tanlangan';
                      })()
                    : "Imtihonni tanlang..."}
                </span>
                <ChevronDown
                  size={16}
                  className={`text-slate-400 transition-transform duration-200 ${addExamOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {addExamOpen && (
                <div className="rounded-xl border border-slate-200 bg-white shadow-lg">
                  <div className="border-b border-slate-100 p-2">
                    <div className="relative">
                      <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs outline-none focus:border-indigo-400"
                        placeholder="Imtihon qidiring..."
                        value={addExamSearch}
                        onChange={(event) => setAddExamSearch(event.target.value)}
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="max-h-44 space-y-0.5 overflow-y-auto p-1.5">
                    {filteredAddExams.map((exam) => {
                      const selected = addForm.examId === exam.id;
                      return (
                        <button
                          type="button"
                          key={exam.id}
                          onClick={() => {
                            void handleAddExamChange(exam.id);
                          }}
                          className={`w-full rounded-lg px-3 py-2 text-left text-xs font-medium transition ${
                            selected ? 'bg-indigo-600 text-white' : 'text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {exam.title} - {exam.groupName}
                        </button>
                      );
                    })}
                    {filteredAddExams.length === 0 ? (
                      <p className="px-3 py-2 text-xs text-slate-400">Imtihon topilmadi</p>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          </Field>

          {selectedAddExam ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              <p className="font-semibold text-slate-700">{selectedAddExam.groupName}</p>
              <p>{selectedAddExam.courseName}</p>
            </div>
          ) : null}

          <Field label="O'quvchi" required>
            <div ref={addStudentRef} className="space-y-1">
              <button
                type="button"
                onClick={() => setAddStudentOpen((v) => !v)}
                className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-sm transition ${
                  addStudentOpen ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <span className={addForm.studentId ? 'font-semibold text-slate-800' : 'text-slate-400'}>
                  {addForm.studentId
                    ? groupStudents.find((student) => student.id === addForm.studentId)?.fullName ?? "O'quvchi tanlangan"
                    : !addForm.examId
                    ? 'Avval imtihonni tanlang...'
                    : groupStudentsLoading
                    ? 'Yuklanmoqda...'
                    : "O'quvchini tanlang..."}
                </span>
                <ChevronDown
                  size={16}
                  className={`text-slate-400 transition-transform duration-200 ${addStudentOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {addStudentOpen && (
                <div className="rounded-xl border border-slate-200 bg-white shadow-lg">
                  <div className="border-b border-slate-100 p-2">
                    <div className="relative">
                      <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs outline-none focus:border-indigo-400"
                        placeholder="Ism bo'yicha qidiring..."
                        value={addSearch}
                        onChange={(event) => setAddSearch(event.target.value)}
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="max-h-44 space-y-0.5 overflow-y-auto p-1.5">
                    {filteredStudents.map((student) => {
                      const selected = addForm.studentId === student.id;
                      return (
                        <button
                          type="button"
                          key={student.id}
                          onClick={() => {
                            setAddForm((prev) => ({ ...prev, studentId: student.id }));
                            setAddStudentOpen(false);
                          }}
                          className={`w-full rounded-lg px-3 py-2 text-left text-xs font-medium transition ${
                            selected ? 'bg-indigo-600 text-white' : 'text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {student.fullName}
                        </button>
                      );
                    })}
                    {!groupStudentsLoading && filteredStudents.length === 0 ? (
                      <p className="px-3 py-2 text-xs text-slate-400">O'quvchilar topilmadi</p>
                    ) : null}
                    {groupStudentsLoading && <p className="px-3 py-2 text-xs text-slate-400">Yuklanmoqda...</p>}
                  </div>
                </div>
              )}
            </div>
          </Field>

          <Field label="Natija" required>
            <ResultButtons value={addForm.result} onChange={(result) => setAddForm((prev) => ({ ...prev, result }))} />
          </Field>

          <Field label="Izoh">
            <textarea
              className={inputCls}
              rows={3}
              value={addForm.comment}
              onChange={(event) => setAddForm((prev) => ({ ...prev, comment: event.target.value }))}
            />
          </Field>

          <FormActions onCancel={() => setAddOpen(false)} loading={addLoading} submitLabel="Saqlash" />
        </form>
      </Modal>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Natijani yangilash" size="md" zIndex={90} overlayZIndex={80}>
        <form onSubmit={handleUpdate} className="space-y-4">
          <Field label="Natija" required>
            <ResultButtons value={editForm.result} onChange={(result) => setEditForm((prev) => ({ ...prev, result }))} />
          </Field>

          <Field label="Izoh">
            <textarea
              className={inputCls}
              rows={3}
              value={editForm.comment}
              onChange={(event) => setEditForm((prev) => ({ ...prev, comment: event.target.value }))}
            />
          </Field>

          <FormActions onCancel={() => setEditOpen(false)} loading={editLoading} submitLabel="Yangilash" />
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteRow}
        onClose={() => setDeleteRow(null)}
        onConfirm={handleDelete}
        title="Natijani o'chirish"
        message={deleteRow ? `${deleteRow.studentName} uchun natija o'chiriladi.` : "Natija o'chiriladi."}
        confirmLabel="O'chirish"
        variant="danger"
      />
    </div>
  );
}
