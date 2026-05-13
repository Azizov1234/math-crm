import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  zIndex?: number;
  overlayZIndex?: number;
  contentClassName?: string;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  size = 'md',
  zIndex = 90,
  overlayZIndex = 80,
  contentClassName,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const widths = {
    sm: 'max-w-[640px]',
    md: 'max-w-[640px]',
    lg: 'max-w-[760px]',
    xl: 'max-w-[1100px]',
  };

  return createPortal(
    <div
      data-custom-modal-root="true"
      className="fixed inset-0 flex items-center justify-center p-2 sm:p-4 pointer-events-auto"
      style={{ zIndex, pointerEvents: 'auto' }}
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto"
        style={{ zIndex: overlayZIndex, pointerEvents: 'auto' }}
        onClick={onClose}
      />
      <div
        className={`relative w-full max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-2xl pointer-events-auto ${widths[size]} animate-fade-in ${contentClassName ?? ''}`}
        style={{ zIndex, pointerEvents: 'auto' }}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-6 sm:py-4">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[calc(90vh-88px)] overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

// Shared field components

interface FieldProps {
  label: string;
  required?: boolean;
  children: ReactNode;
}

export function Field({ label, required, children }: FieldProps) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

export const inputCls = `
  w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl
  focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400
  bg-slate-50 focus:bg-white transition placeholder-slate-300
`.trim();

export const selectCls = `
  w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl
  focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400
  bg-slate-50 focus:bg-white transition cursor-pointer appearance-none
`.trim();

interface FormActionsProps {
  onCancel: () => void;
  loading?: boolean;
  submitLabel?: string;
  accentColor?: string;
}

export function FormActions({
  onCancel,
  loading,
  submitLabel = 'Saqlash',
  accentColor = 'bg-indigo-600 hover:bg-indigo-700',
}: FormActionsProps) {
  return (
    <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
      <button
        type="button"
        onClick={onCancel}
        className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-200"
      >
        Bekor qilish
      </button>
      <button
        type="submit"
        disabled={loading}
        className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition disabled:opacity-60 ${accentColor}`}
      >
        {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
        {submitLabel}
      </button>
    </div>
  );
}
