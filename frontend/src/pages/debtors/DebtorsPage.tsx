import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import PageHeader from '@/components/common/PageHeader';
import { debtorsApi } from '@/api/debtors.api';
import { groupsApi } from '@/api/groups.api';
import { coursesApi } from '@/api/courses.api';
import { teachersApi } from '@/api/teachers.api';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

import DebtorSummaryCards from './components/DebtorSummaryCards';
import DebtorFilters, { type DebtorFilterState } from './components/DebtorFilters';
import DebtorsTable from './components/DebtorsTable';
import DebtorDetailsDrawer from './components/DebtorDetailsDrawer';
import DebtorPaymentModal, { type SinglePaymentPayload } from './components/DebtorPaymentModal';
import PayAllDebtsModal from './components/PayAllDebtsModal';

import type { DebtorSummary, DebtorListItem, DebtorStudentDetails, BulkInvoiceOption } from './types';

export default function DebtorsPage() {
  // --- STATE ---
  const [summary, setSummary] = useState<DebtorSummary>({
    debtorsCount: 0,
    totalDebtAmount: 0,
    averageDebtAmount: 0,
    maxOverdueDays: 0,
    groupsWithDebtCount: 0,
  });
  const [debtors, setDebtors] = useState<DebtorListItem[]>([]);
  const [totalRows, setTotalRows] = useState(0);

  const [groups, setGroups] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);

  const [pagination, setPagination] = useState({ page: 0, pageSize: 50 });
  const [filters, setFilters] = useState<DebtorFilterState>({
    search: '',
    groupId: '',
    courseId: '',
    teacherId: '',
    minDebt: '',
    maxDebt: '',
    minOverdueDays: '',
    maxOverdueDays: '',
  });

  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingDebtors, setLoadingDebtors] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [details, setDetails] = useState<DebtorStudentDetails | null>(null);

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentPayload, setPaymentPayload] = useState<SinglePaymentPayload | null>(null);

  const [payAllModalOpen, setPayAllModalOpen] = useState(false);
  const [payAllInvoices, setPayAllInvoices] = useState<BulkInvoiceOption[]>([]);
  const [payAllStudentName, setPayAllStudentName] = useState('');

  // --- DATA FETCHING ---
  const fetchSummary = useCallback(async () => {
    try {
      setLoadingSummary(true);
      const res = await debtorsApi.getSummary();
      if (res) setSummary(res);
    } catch (err: any) {
      toast.error(err.message || "Summary ma'lumotlarini yuklashda xatolik");
    } finally {
      setLoadingSummary(false);
    }
  }, []);

  const fetchDictionaries = useCallback(async () => {
    try {
      const [gRes, cRes, tRes] = await Promise.all([
        groupsApi.getAll({ limit: 100 }),
        coursesApi.getAll({ limit: 100 }),
        teachersApi.getAll({ limit: 100 }),
      ]);
      if (gRes.data) setGroups(gRes.data);
      if (cRes.data) setCourses(cRes.data);
      if (tRes.data) setTeachers(tRes.data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchDebtors = useCallback(async () => {
    try {
      setLoadingDebtors(true);
      const queryParams: any = {
        page: pagination.page + 1,
        limit: pagination.pageSize,
        ...filters,
      };
      
      Object.keys(queryParams).forEach((k) => {
        if (!queryParams[k]) delete queryParams[k];
      });

      const res = await debtorsApi.getAll(queryParams);
      if (res.data) {
        setDebtors(res.data);
        setTotalRows(res.meta?.total || 0);
      }
    } catch (err: any) {
      toast.error(err.message || "Qarzdorlarni yuklashda xatolik");
    } finally {
      setLoadingDebtors(false);
    }
  }, [pagination.page, pagination.pageSize, filters]);

  const fetchDetails = useCallback(async (studentId: string) => {
    try {
      setLoadingDetails(true);
      const res = await debtorsApi.getStudentDetails(studentId);
      if (res) setDetails(res);
    } catch (err: any) {
      toast.error(err.message || "Tafsilotlarni yuklashda xatolik");
    } finally {
      setLoadingDetails(false);
    }
  }, []);

  // --- LIFECYCLE ---
  useEffect(() => {
    fetchSummary();
    fetchDictionaries();
  }, [fetchSummary, fetchDictionaries]);

  useEffect(() => {
    fetchDebtors();
  }, [fetchDebtors]);

  useEffect(() => {
    if (drawerOpen && selectedStudentId) {
      fetchDetails(selectedStudentId);
    }
  }, [drawerOpen, selectedStudentId, fetchDetails]);

  // --- HANDLERS ---
  const handleRefresh = () => {
    fetchSummary();
    fetchDebtors();
  };

  const handlePaymentSuccess = () => {
    setPaymentModalOpen(false);
    setPayAllModalOpen(false);
    handleRefresh();
    if (drawerOpen && selectedStudentId) {
      fetchDetails(selectedStudentId);
    }
  };

  const openDrawer = (studentId: string) => {
    setSelectedStudentId(studentId);
    setDrawerOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <PageHeader 
        title="Qarzdorlar" 
        subtitle="To'lov muddati o'tgan o'quvchilar va qarzdorlik tafsilotlari"
      >
        <Button onClick={handleRefresh} variant="outline" className="bg-white shadow-sm hover:bg-slate-50 border-slate-200">
          <RefreshCw size={16} className={`mr-2 text-slate-500 ${loadingDebtors || loadingSummary ? 'animate-spin' : ''}`} /> 
          Yangilash
        </Button>
      </PageHeader>

      <DebtorSummaryCards summary={summary} />

      <DebtorFilters 
        filters={filters} 
        onChange={(f) => { setFilters(f); setPagination((p) => ({ ...p, page: 0 })); }}
        groups={groups}
        courses={courses}
        teachers={teachers}
      />

      <DebtorsTable 
        rows={debtors}
        loading={loadingDebtors}
        totalRows={totalRows}
        paginationModel={pagination}
        onPaginationModelChange={setPagination}
        onViewDetails={openDrawer}
        onPay={(row) => openDrawer(row.studentId)}
      />

      <DebtorDetailsDrawer 
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        loading={loadingDetails}
        details={details}
        onRefresh={() => {
          if (selectedStudentId) fetchDetails(selectedStudentId);
        }}
        onPaySingle={(payload) => {
          setPaymentPayload(payload);
          setPaymentModalOpen(true);
        }}
        onPayAll={(invoices) => {
          setPayAllStudentName(details?.student.fullName || '');
          setPayAllInvoices(invoices);
          setPayAllModalOpen(true);
        }}
        paymentModalOpen={paymentModalOpen}
        payAllModalOpen={payAllModalOpen}
      />

      <DebtorPaymentModal 
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        payload={paymentPayload}
        onSuccess={handlePaymentSuccess}
      />

      <PayAllDebtsModal 
        open={payAllModalOpen}
        onClose={() => setPayAllModalOpen(false)}
        studentId={selectedStudentId || ''}
        studentName={payAllStudentName}
        invoices={payAllInvoices}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  );
}
