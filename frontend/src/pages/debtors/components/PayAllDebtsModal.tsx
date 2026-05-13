import { useEffect, useState, type FormEvent } from 'react';
import { CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { getErrorMessage } from '@/api/http';
import { paymentsApi } from '@/api/payments.api';
import { Modal, Field, FormActions, inputCls } from '@/components/common/Modal';
import StatusBadge from '@/components/common/StatusBadge';
import MoneyText from '@/components/common/MoneyText';
import { Badge } from '@/components/ui/badge';
import type { BulkInvoiceOption } from '../types';

interface Props {
  open: boolean;
  onClose: () => void;
  studentId: string;
  studentName: string;
  invoices: BulkInvoiceOption[];
  onSuccess: () => void;
}

export default function PayAllDebtsModal({ open, onClose, studentId, studentName, invoices, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [method, setMethod] = useState<'CASH' | 'CARD' | 'TRANSFER'>('CASH');
  const [paidAt, setPaidAt] = useState('');
  const [note, setNote] = useState('');
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  useEffect(() => {
    if (open) {
      setMethod('CASH');
      const d = new Date();
      setPaidAt(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
      setNote(`Hamma qarzni to'lash (${invoices.length} ta invoice)`);
      setProgress({ current: 0, total: 0 });
    }
  }, [open, invoices.length]);

  const totalAmount = invoices.reduce((sum, inv) => sum + inv.debtAmount, 0);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!invoices.length) return;

    try {
      setLoading(true);
      setProgress({ current: 0, total: invoices.length });

      for (let i = 0; i < invoices.length; i++) {
        const inv = invoices[i];
        await paymentsApi.create({
          studentId,
          groupId: inv.groupId,
          amount: inv.debtAmount,
          method,
          paidAt: new Date(paidAt).toISOString(),
          note,
          paymentForMonth: inv.month,
          paymentForYear: inv.year,
        });
        setProgress({ current: i + 1, total: invoices.length });
      }

      toast.success("Barcha qarzlar muvaffaqiyatli to'landi");
      onSuccess();
    } catch (error) {
      toast.error(getErrorMessage(error, "To'lov jarayonida xatolik yuz berdi"));
    } finally {
      setLoading(false);
    }
  };

  if (!invoices.length) return null;

  return (
    <Modal open={open} onClose={onClose} title="Qarzdorlikdan to'lov qo'shish" size="lg" zIndex={100} overlayZIndex={90}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-gradient-to-br from-indigo-50 to-blue-50/30 rounded-2xl p-5 border border-indigo-100/60 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 text-indigo-600">
            <CreditCard size={64} />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 relative z-10">
            <div>
              <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-1">O'quvchi</p>
              <p className="text-xl font-bold text-slate-800">{studentName}</p>
            </div>
            <div className="sm:text-right">
              <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-1">To'lanadigan qarzlar</p>
              <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 border-none shadow-none">{invoices.length} ta invoice</Badge>
            </div>
          </div>
          <div className="mt-5 pt-4 border-t border-indigo-100/50 flex flex-col sm:flex-row sm:items-end justify-between gap-2 relative z-10">
            <p className="text-sm font-semibold text-slate-600">Jami to'lanadigan summa:</p>
            <MoneyText amount={totalAmount} className="text-3xl font-black text-indigo-700 leading-none" />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 shadow-sm overflow-hidden bg-white">
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">To'lanadigan qarzlar ro'yxati</h4>
          </div>
          <div className="max-h-48 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-white sticky top-0 shadow-sm">
                <tr className="text-xs text-slate-400 border-b border-slate-100">
                  <th className="px-4 py-2 text-left font-medium">Guruh</th>
                  <th className="px-4 py-2 text-left font-medium">Oy</th>
                  <th className="px-4 py-2 text-left font-medium">Qarz</th>
                  <th className="px-4 py-2 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.invoiceId} className="border-b border-slate-50 last:border-none hover:bg-slate-50/50 transition">
                    <td className="px-4 py-3 font-medium text-slate-700">{invoice.groupName}</td>
                    <td className="px-4 py-3 text-slate-600">{invoice.label}</td>
                    <td className="px-4 py-3"><MoneyText amount={invoice.debtAmount} className="font-semibold text-rose-600" /></td>
                    <td className="px-4 py-3">
                      <StatusBadge status={invoice.status} size="sm" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

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

        {loading && progress.total > 0 && (
          <p className="text-xs text-indigo-600 font-semibold animate-pulse">
            To'lov jarayoni: {progress.current} / {progress.total}
          </p>
        )}

        <FormActions onCancel={onClose} loading={loading} submitLabel="Hamma qarzni to'lash" />
      </form>
    </Modal>
  );
}
