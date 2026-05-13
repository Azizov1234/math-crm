import { createPortal } from 'react-dom';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: 'danger' | 'warning';
  loading?: boolean;
}

export default function ConfirmDialog({
  open, onClose, onConfirm, title, message, confirmLabel = "O'chirish", variant = 'danger', loading
}: ConfirmDialogProps) {
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 z-[80] bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-[90] w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6">
          <div
            className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${
              variant === 'danger' ? 'bg-rose-100' : 'bg-amber-100'
            }`}
          >
            <AlertTriangle className={variant === 'danger' ? 'text-rose-600' : 'text-amber-600'} size={24} />
          </div>
          <h3 className="text-base font-bold text-slate-900">{title}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{message}</p>
        </div>
        <div className="flex gap-2 px-6 pb-6">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">
            Bekor qilish
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 justify-center ${
              variant === 'danger'
                ? 'btn-danger'
                : 'inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-amber-600'
            }`}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                {confirmLabel}
              </span>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
        <button onClick={onClose} className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100">
          <X size={16} />
        </button>
      </div>
    </div>,
    document.body,
  );
}
