type StatusKey =
  | 'ACTIVE' | 'INACTIVE' | 'DELETED' | 'BLOCKED'
  | 'PAID' | 'PARTIAL' | 'UNPAID' | 'DUE_SOON' | 'OVERDUE' | 'NO_PAYMENT'
  | 'PASSED' | 'FAILED' | 'SKIPPED' | 'SENT_TO_RETAKE' | 'NOT_SUBMITTED'
  | 'SCHEDULED' | 'FINISHED' | 'CANCELLED'
  | 'COMPLETED';

interface StatusConfig {
  label: string;
  className: string;
  dotColor: string;
}

const STATUS_MAP: Record<StatusKey, StatusConfig> = {
  ACTIVE:           { label: 'Faol',              className: 'bg-emerald-50 text-emerald-700 ring-emerald-200',   dotColor: 'bg-emerald-500' },
  INACTIVE:         { label: 'Nofaol',            className: 'bg-amber-50 text-amber-700 ring-amber-200',         dotColor: 'bg-amber-500' },
  DELETED:          { label: "O'chirilgan",       className: 'bg-rose-50 text-rose-700 ring-rose-200',            dotColor: 'bg-rose-500' },
  BLOCKED:          { label: 'Bloklangan',         className: 'bg-rose-50 text-rose-700 ring-rose-200',            dotColor: 'bg-rose-500' },
  COMPLETED:        { label: 'Yakunlangan',        className: 'bg-slate-50 text-slate-700 ring-slate-200',         dotColor: 'bg-slate-500' },
  PAID:             { label: "To'langan",         className: 'bg-emerald-50 text-emerald-700 ring-emerald-200',   dotColor: 'bg-emerald-500' },
  PARTIAL:          { label: 'Qisman',             className: 'bg-amber-50 text-amber-700 ring-amber-200',         dotColor: 'bg-amber-500' },
  UNPAID:           { label: "To'lanmagan",       className: 'bg-orange-50 text-orange-700 ring-orange-200',      dotColor: 'bg-orange-500' },
  DUE_SOON:         { label: 'Yaqin',              className: 'bg-sky-50 text-sky-700 ring-sky-200',               dotColor: 'bg-sky-500' },
  OVERDUE:          { label: "Muddati o'tgan",    className: 'bg-rose-50 text-rose-700 ring-rose-200',            dotColor: 'bg-rose-500' },
  NO_PAYMENT:       { label: "To'lov yo'q",       className: 'bg-amber-50 text-amber-700 ring-amber-200',         dotColor: 'bg-amber-500' },
  PASSED:           { label: "O'tdi",             className: 'bg-emerald-50 text-emerald-700 ring-emerald-200',   dotColor: 'bg-emerald-500' },
  FAILED:           { label: "O'tmadi",           className: 'bg-rose-50 text-rose-700 ring-rose-200',            dotColor: 'bg-rose-500' },
  SKIPPED:          { label: 'Qoldirildi',         className: 'bg-amber-50 text-amber-700 ring-amber-200',         dotColor: 'bg-amber-500' },
  SENT_TO_RETAKE:   { label: 'Qayta topshirishga', className: 'bg-violet-50 text-violet-700 ring-violet-200',      dotColor: 'bg-violet-500' },
  NOT_SUBMITTED:    { label: 'Topshirmadi',        className: 'bg-slate-200 text-slate-900 ring-slate-400',         dotColor: 'bg-slate-700' },
  SCHEDULED:        { label: 'Rejalashtirilgan',   className: 'bg-sky-50 text-sky-700 ring-sky-200',               dotColor: 'bg-sky-500' },
  FINISHED:         { label: 'Yakunlandi',         className: 'bg-emerald-50 text-emerald-700 ring-emerald-200',   dotColor: 'bg-emerald-500' },
  CANCELLED:        { label: 'Bekor qilindi',      className: 'bg-rose-50 text-rose-700 ring-rose-200',            dotColor: 'bg-rose-500' },
};

export function getStatusConfig(status: string): StatusConfig {
  return STATUS_MAP[status as StatusKey] ?? { label: status, className: 'bg-slate-50 text-slate-600 ring-slate-200', dotColor: 'bg-slate-400' };
}

