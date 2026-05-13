import { RefreshCw, CreditCard, Layers } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import StatusBadge from '@/components/common/StatusBadge';
import MoneyText from '@/components/common/MoneyText';
import LoadingSkeleton from '@/components/common/LoadingSkeleton';
import { Modal } from '@/components/common/Modal';
import type { DebtorStudentDetails, BulkInvoiceOption } from '../types';

interface Props {
  open: boolean;
  onClose: () => void;
  loading: boolean;
  details: DebtorStudentDetails | null;
  onRefresh: () => void;
  onPaySingle: (payload: any) => void;
  onPayAll: (invoices: BulkInvoiceOption[]) => void;
  paymentModalOpen: boolean;
  payAllModalOpen: boolean;
}

export default function DebtorDetailsDrawer({
  open,
  onClose,
  loading,
  details,
  onRefresh,
  onPaySingle,
  onPayAll,
  paymentModalOpen,
  payAllModalOpen,
}: Props) {
  const isAnyModalOpen = paymentModalOpen || payAllModalOpen;

  const handlePayAll = () => {
    if (!details) return;
    const allInvoices: BulkInvoiceOption[] = [];
    details.groups.forEach((g) => {
      g.months.forEach((m) => {
        if (m.debtAmount > 0) {
          allInvoices.push({
            invoiceId: m.invoiceId,
            groupId: g.groupId,
            groupName: g.groupName,
            month: m.month,
            year: m.year,
            label: m.label,
            debtAmount: m.debtAmount,
            dueDate: m.dueDate,
            status: m.status,
          });
        }
      });
    });
    onPayAll(allInvoices);
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!isAnyModalOpen) onClose();
      }}
      title="Qarzdor tafsilotlari"
      size="xl"
      zIndex={95}
      overlayZIndex={90}
      contentClassName="max-w-[1100px]"
    >
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-slate-500">Student kesimida guruhlar va oylik qarz tafsiloti</p>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:gap-3">
          <Button
            variant="outline"
            onClick={onRefresh}
            disabled={loading}
            className="w-full justify-center bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-sm sm:w-auto"
          >
            <RefreshCw size={16} className={`mr-2 ${loading ? 'animate-spin' : ''}`} /> Yangilash
          </Button>
          {details && details.summary.totalDebt > 0 && (
            <Button
              onClick={handlePayAll}
              className="w-full justify-center bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-transform active:scale-95 sm:w-auto"
            >
              <CreditCard size={16} className="mr-2" /> Hamma qarzni to'lash
            </Button>
          )}
        </div>
      </div>

      {loading && !details ? (
        <LoadingSkeleton />
      ) : !details ? (
        <div className="flex h-72 items-center justify-center text-slate-400 font-medium">Ma'lumot topilmadi</div>
      ) : (
        <div className="space-y-5 max-w-5xl mx-auto">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">O'quvchi</p>
              <p className="text-base sm:text-lg font-bold text-slate-800">{details.student.fullName}</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Umumiy qarz</p>
              <MoneyText amount={details.summary.totalDebt} className="text-lg sm:text-xl font-bold text-rose-600" />
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Guruhlar soni</p>
              <p className="text-base sm:text-lg font-bold text-slate-800">{details.summary.groupsCount} ta</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Kechikish</p>
              <p className="text-base sm:text-lg font-bold text-amber-600">{details.summary.maxOverdueDays} kun</p>
            </div>
          </div>

          {details.groups.length > 0 ? (
            <Accordion type="multiple" className="space-y-4">
              {details.groups.map((g) => (
                <AccordionItem key={g.groupId} value={g.groupId} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden px-1">
                  <AccordionTrigger className="hover:no-underline px-3 py-3 sm:px-5 sm:py-4 focus-visible:ring-0 focus-visible:outline-none">
                    <div className="flex flex-col md:flex-row md:items-center justify-between w-full gap-4 text-left pr-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
                          <Layers size={20} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-lg">{g.groupName}</p>
                          <p className="text-xs font-medium text-slate-500 mt-0.5">{g.courseName} - {g.teacherName}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right hidden sm:block">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Guruh qarzi</p>
                          <MoneyText amount={g.totalDebt} className="font-bold text-rose-600" />
                        </div>
                        <div className="text-right hidden md:block">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Oylik to'lov</p>
                          <MoneyText amount={g.monthlyFee} className="font-semibold text-slate-700" />
                        </div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-3 pb-4 pt-2 sm:px-5 sm:pb-5 border-t border-slate-100">
                    <div className="space-y-2 md:hidden">
                      {g.months.map((m) => (
                        <div key={m.invoiceId} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                          <div className="mb-2 flex items-start justify-between gap-3">
                            <p className="text-sm font-semibold text-slate-700">{m.label}</p>
                            <StatusBadge status={m.status} size="sm" />
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <p className="text-slate-400">To'lanishi kerak</p>
                              <MoneyText amount={m.amountDue} className="font-semibold text-slate-700" />
                            </div>
                            <div>
                              <p className="text-slate-400">To'langan</p>
                              <MoneyText amount={m.amountPaid} className="font-semibold text-emerald-600" />
                            </div>
                          </div>
                          <div className="mt-2 flex items-center justify-between">
                            <div>
                              <p className="text-[11px] text-slate-400">Qarz</p>
                              <MoneyText amount={m.debtAmount} className="font-bold text-rose-600" />
                            </div>
                            {m.debtAmount > 0 && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300 transition-colors"
                                onClick={() =>
                                  onPaySingle({
                                    studentId: details.student.id,
                                    studentName: details.student.fullName,
                                    groupId: g.groupId,
                                    groupName: g.groupName,
                                    invoiceId: m.invoiceId,
                                    invoiceLabel: m.label,
                                    debtAmount: m.debtAmount,
                                    month: m.month,
                                    year: m.year,
                                  })
                                }
                              >
                                To'lash
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200 bg-slate-50/50">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-slate-100/50 text-slate-500 text-xs uppercase font-semibold">
                          <tr>
                            <th className="px-4 py-3 rounded-tl-xl">Oy</th>
                            <th className="px-4 py-3">To'lanishi kerak</th>
                            <th className="px-4 py-3">To'langan</th>
                            <th className="px-4 py-3">Qarz</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3 text-right rounded-tr-xl">Amal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {g.months.map((m) => (
                            <tr key={m.invoiceId} className="border-t border-slate-200/60 hover:bg-white transition-colors">
                              <td className="px-4 py-3 font-medium text-slate-700">{m.label}</td>
                              <td className="px-4 py-3 text-slate-600"><MoneyText amount={m.amountDue} /></td>
                              <td className="px-4 py-3 text-emerald-600 font-medium"><MoneyText amount={m.amountPaid} /></td>
                              <td className="px-4 py-3 text-rose-600 font-bold"><MoneyText amount={m.debtAmount} /></td>
                              <td className="px-4 py-3"><StatusBadge status={m.status} size="sm" /></td>
                              <td className="px-4 py-3 text-right">
                                {m.debtAmount > 0 && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300 transition-colors"
                                    onClick={() =>
                                      onPaySingle({
                                        studentId: details.student.id,
                                        studentName: details.student.fullName,
                                        groupId: g.groupId,
                                        groupName: g.groupName,
                                        invoiceId: m.invoiceId,
                                        invoiceLabel: m.label,
                                        debtAmount: m.debtAmount,
                                        month: m.month,
                                        year: m.year,
                                      })
                                    }
                                  >
                                    To'lash
                                  </Button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
              <p className="text-slate-500 font-medium">Bu o'quvchida hozircha guruhlar yo'q</p>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
