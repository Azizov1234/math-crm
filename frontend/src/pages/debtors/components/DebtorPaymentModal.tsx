import { useEffect, useState, type FormEvent } from 'react';
import { CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { getErrorMessage } from '@/api/http';
import { paymentsApi } from '@/api/payments.api';
import { Modal, Field, FormActions, inputCls } from '@/components/common/Modal';

export interface SinglePaymentPayload {
  studentId: string;
  studentName: string;
  groupId: string;
  groupName: string;
  invoiceId: string;
  invoiceLabel: string;
  debtAmount: number;
  month: number;
  year: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  payload: SinglePaymentPayload | null;
  onSuccess: () => void;
}

function normalizeMoneyInput(value: string) {
  return value.replace(/[^\d]/g, '');
}

export default function DebtorPaymentModal({ open, onClose, payload, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'CASH' | 'CARD' | 'TRANSFER'>('CASH');
  const [paidAt, setPaidAt] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (open && payload) {
      setAmount(String(Math.max(0, Math.round(Number(payload.debtAmount ?? 0)))));
      setMethod('CASH');
      const d = new Date();
      setPaidAt(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
      setNote(`Qarz to'lovi: ${payload.invoiceLabel}`);
    }
  }, [open, payload]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!payload) return;

    try {
      setLoading(true);
      await paymentsApi.create({
        studentId: payload.studentId,
        groupId: payload.groupId,
        amount: Number(amount),
        method,
        paidAt: new Date(paidAt).toISOString(),
        note,
        paymentForMonth: payload.month,
        paymentForYear: payload.year,
      });
      toast.success("To'lov muvaffaqiyatli saqlandi");
      onSuccess();
    } catch (error) {
      toast.error(getErrorMessage(error, "To'lovni saqlashda xatolik"));
    } finally {
      setLoading(false);
    }
  };

  if (!payload) return null;

  return (
    <Modal open={open} onClose={onClose} title="Qarzdorlikdan to'lov qo'shish" size="md" zIndex={100} overlayZIndex={90}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50/30 rounded-2xl p-5 border border-emerald-100/60 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 text-emerald-600">
            <CreditCard size={64} />
          </div>
          <div className="flex flex-col gap-4 relative z-10">
            <div>
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">O'quvchi</p>
              <p className="text-xl font-bold text-slate-800">{payload.studentName}</p>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-emerald-100/50">
              <div>
                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Guruh nomi</p>
                <p className="text-sm font-semibold text-slate-700">{payload.groupName}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Qarz oyi</p>
                <p className="text-sm font-bold text-rose-600 bg-rose-50 inline-block px-2 py-0.5 rounded border border-rose-100">
                  {payload.invoiceLabel}
                </p>
              </div>
            </div>
          </div>
        </div>

        <Field label="To'lanayotgan summa" required>
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              className={`${inputCls} pl-14 text-xl font-bold text-slate-800 h-14`}
              value={amount}
              onWheel={(event) => (event.currentTarget as HTMLInputElement).blur()}
              onChange={(e) => setAmount(normalizeMoneyInput(e.target.value))}
              required
            />
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">UZS</div>
          </div>
        </Field>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
          <Field label="To'lov usuli" required>
            <div className="flex gap-2">
              {(['CASH', 'CARD', 'TRANSFER'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  className={`flex-1 py-2.5 rounded-xl border text-xs font-semibold transition ${
                    method === m
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </Field>

          <Field label="To'langan sana" required>
            <input type="date" className={inputCls} value={paidAt} onChange={(e) => setPaidAt(e.target.value)} required />
          </Field>
        </div>

        <Field label="Qo'shimcha izoh">
          <textarea
            className={`${inputCls} resize-none`}
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="To'lov bo'yicha izoh..."
          />
        </Field>

        <FormActions onCancel={onClose} loading={loading} submitLabel="To'lovni saqlash" accentColor="bg-emerald-600 hover:bg-emerald-700" />
      </form>
    </Modal>
  );
}
