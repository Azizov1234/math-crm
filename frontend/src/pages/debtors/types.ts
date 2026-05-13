import type { BillingType } from '@/api/groups.api';

export interface DebtorListItem {
  studentId: string;
  fullName: string;
  phone: string;
  parentPhone: string | null;
  groupsCount: number;
  groups: Array<{ id: string; name: string }>;
  monthlyFeeTotal: number;
  totalDebt: number;
  maxOverdueDays: number;
  oldestDebtDate: string | null;
  status: 'OVERDUE';
}

export interface DebtorSummary {
  debtorsCount: number;
  totalDebtAmount: number;
  averageDebtAmount: number;
  maxOverdueDays: number;
  groupsWithDebtCount: number;
}

export interface DebtorMonth {
  invoiceId: string;
  month: number;
  year: number;
  label: string;
  amountDue: number;
  amountPaid: number;
  debtAmount: number;
  dueDate: string;
  paidAt: string | null;
  status: 'PAID' | 'PARTIAL' | 'UNPAID' | 'OVERDUE';
}

export interface DebtorGroupDetails {
  groupId: string;
  groupName: string;
  courseName: string;
  teacherName: string;
  monthlyFee: number;
  billingType?: BillingType;
  discountReason?: string | null;
  totalDue: number;
  totalPaid: number;
  totalDebt: number;
  overdueDays: number;
  months: DebtorMonth[];
}

export interface DebtorStudentDetails {
  student: {
    id: string;
    fullName: string;
    phone: string;
    parentPhone: string | null;
    status: string;
  };
  summary: {
    groupsCount: number;
    monthlyFeeTotal: number;
    totalDebt: number;
    maxOverdueDays: number;
  };
  groups: DebtorGroupDetails[];
}

export type BulkInvoiceOption = {
  invoiceId: string;
  groupId: string;
  groupName: string;
  month: number;
  year: number;
  label: string;
  debtAmount: number;
  dueDate: string;
  status: DebtorMonth['status'];
};
