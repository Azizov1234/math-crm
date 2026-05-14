import { Injectable } from '@nestjs/common';
import { BillingStatus, Prisma, UserRole } from '@prisma/client';
import { createHash } from 'crypto';
import { addOneCalendarMonth, startOfDay } from '../../common/utils/date-billing.util';
import { buildPagination, toPaginatedResponse } from '../../common/utils/pagination.util';
import { PrismaService } from '../../prisma/prisma.service';
import { FilterInvoiceDto } from './dto/filter-invoice.dto';
import { GenerateMonthlyInvoicesDto } from './dto/generate-monthly-invoices.dto';

type UserCtx = { id?: string; role: UserRole; branchId?: string | null };
type InvoiceStatus = 'PAID' | 'PARTIAL' | 'UNPAID' | 'OVERDUE';

type InvoiceRow = {
  id: string;
  studentId: string;
  groupId: string;
  branchId: string;
  month: number;
  year: number;
  label: string;
  amountDue: number;
  amountPaid: number;
  debtAmount: number;
  dueDate: string;
  paidAt: string | null;
  status: InvoiceStatus;
  student: {
    id: string;
    fullName: string;
    phone: string;
    parentPhone: string | null;
  };
  group: {
    id: string;
    name: string;
    courseName: string;
  };
};

@Injectable()
export class InvoicesRepository {
  constructor(private readonly prisma: PrismaService) {}

  private monthKey(studentId: string, groupId: string, year: number, month: number) {
    return `${studentId}|${groupId}|${year}|${month}`;
  }

  private pseudoInvoiceId(studentId: string, groupId: string, year: number, month: number) {
    const hex = createHash('md5').update(`${studentId}:${groupId}:${year}:${month}`).digest('hex');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
  }

  private formatMonthLabel(date: Date): string {
    return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date);
  }

  private computeInvoiceStatus(amountDue: number, amountPaid: number, dueDate: Date, today: Date): InvoiceStatus {
    if (amountPaid >= amountDue) {
      return 'PAID';
    }

    if (amountPaid > 0 && amountPaid < amountDue) {
      return dueDate < today ? 'PARTIAL' : 'UNPAID';
    }

    return dueDate < today ? 'OVERDUE' : 'UNPAID';
  }

  private resolveDueDate(anchorDate: Date | null | undefined, year: number, month: number) {
    const anchorDay = anchorDate?.getDate() ?? 1;
    const lastDay = new Date(year, month, 0).getDate();
    return startOfDay(new Date(year, month - 1, Math.min(anchorDay, lastDay)));
  }

  private billingWhere(filter: Pick<FilterInvoiceDto, 'search' | 'studentId' | 'groupId' | 'branchId'>, user: UserCtx): Prisma.StudentBillingWhereInput {
    const branchFilter =
      user.role === UserRole.ADMIN
        ? user.branchId
          ? { branchId: user.branchId }
          : {}
        : filter.branchId
          ? { branchId: filter.branchId }
          : {};

    return {
      status: BillingStatus.ACTIVE,
      ...(filter.studentId ? { studentId: filter.studentId } : {}),
      ...(filter.groupId ? { groupId: filter.groupId } : {}),
      ...branchFilter,
      student: {
        deletedAt: null,
        ...(filter.search
          ? {
              OR: [
                { fullName: { contains: filter.search, mode: 'insensitive' } },
                { phone: { contains: filter.search, mode: 'insensitive' } },
                { parentPhone: { contains: filter.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      group: {
        deletedAt: null,
      },
    };
  }

  private async fetchBillings(filter: Pick<FilterInvoiceDto, 'search' | 'studentId' | 'groupId' | 'branchId'>, user: UserCtx) {
    return this.prisma.studentBilling.findMany({
      where: this.billingWhere(filter, user),
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            parentPhone: true,
          },
        },
        group: {
          select: {
            id: true,
            name: true,
            course: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });
  }

  private async buildPaymentMap(
    billings: Array<{ studentId: string; groupId: string }>,
    target?: { month?: number; year?: number },
  ): Promise<Map<string, { amount: number; paidAt: Date | null }>> {
    const map = new Map<string, { amount: number; paidAt: Date | null }>();
    if (billings.length === 0) {
      return map;
    }

    const studentIds = Array.from(new Set(billings.map((item) => item.studentId)));
    const groupIds = Array.from(new Set(billings.map((item) => item.groupId)));

    const payments = await this.prisma.payment.findMany({
      where: {
        deletedAt: null,
        studentId: { in: studentIds },
        groupId: { in: groupIds },
        ...(target?.month ? { paymentForMonth: target.month } : {}),
        ...(target?.year ? { paymentForYear: target.year } : {}),
      },
      select: {
        studentId: true,
        groupId: true,
        amount: true,
        paidAt: true,
        paymentForMonth: true,
        paymentForYear: true,
      },
    });

    for (const payment of payments) {
      const month = payment.paymentForMonth ?? payment.paidAt.getMonth() + 1;
      const year = payment.paymentForYear ?? payment.paidAt.getFullYear();
      const key = this.monthKey(payment.studentId, payment.groupId, year, month);
      const current = map.get(key) ?? { amount: 0, paidAt: null };
      current.amount += Number(payment.amount);
      if (!current.paidAt || payment.paidAt > current.paidAt) {
        current.paidAt = payment.paidAt;
      }
      map.set(key, current);
    }

    return map;
  }

  private buildInvoiceRow(
    billing: {
      studentId: string;
      groupId: string;
      branchId: string;
      monthlyFee: Prisma.Decimal;
      nextPaymentDate: Date | null;
      student: { id: string; fullName: string; phone: string; parentPhone: string | null };
      group: { id: string; name: string; course: { name: string } };
    },
    month: number,
    year: number,
    paymentMap: Map<string, { amount: number; paidAt: Date | null }>,
    today: Date,
  ): InvoiceRow {
    const dueDate = this.resolveDueDate(billing.nextPaymentDate, year, month);
    const amountDue = Number(billing.monthlyFee);
    const paymentAgg = paymentMap.get(this.monthKey(billing.studentId, billing.groupId, year, month));
    const amountPaid = Number(paymentAgg?.amount ?? 0);
    const debtAmount = Math.max(0, amountDue - amountPaid);
    const status = this.computeInvoiceStatus(amountDue, amountPaid, dueDate, today);

    return {
      id: this.pseudoInvoiceId(billing.studentId, billing.groupId, year, month),
      studentId: billing.studentId,
      groupId: billing.groupId,
      branchId: billing.branchId,
      month,
      year,
      label: this.formatMonthLabel(dueDate),
      amountDue,
      amountPaid,
      debtAmount,
      dueDate: dueDate.toISOString(),
      paidAt: paymentAgg?.paidAt ? paymentAgg.paidAt.toISOString() : null,
      status,
      student: {
        id: billing.student.id,
        fullName: billing.student.fullName,
        phone: billing.student.phone,
        parentPhone: billing.student.parentPhone,
      },
      group: {
        id: billing.group.id,
        name: billing.group.name,
        courseName: billing.group.course.name,
      },
    };
  }

  private sortRows(items: InvoiceRow[], sortBy: string, sortOrder: 'asc' | 'desc') {
    const sorted = [...items].sort((a, b) => {
      if (sortBy === 'amountDue') return a.amountDue - b.amountDue;
      if (sortBy === 'amountPaid') return a.amountPaid - b.amountPaid;
      if (sortBy === 'debtAmount') return a.debtAmount - b.debtAmount;
      if (sortBy === 'studentName') return a.student.fullName.localeCompare(b.student.fullName);
      if (sortBy === 'groupName') return a.group.name.localeCompare(b.group.name);
      if (sortBy === 'status') return a.status.localeCompare(b.status);
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

    return sortOrder === 'asc' ? sorted : sorted.reverse();
  }

  private buildOverdueRows(
    billings: Array<{
      studentId: string;
      groupId: string;
      branchId: string;
      monthlyFee: Prisma.Decimal;
      nextPaymentDate: Date | null;
      student: { id: string; fullName: string; phone: string; parentPhone: string | null };
      group: { id: string; name: string; course: { name: string } };
    }>,
    paymentMap: Map<string, { amount: number; paidAt: Date | null }>,
    today: Date,
  ) {
    const rows: InvoiceRow[] = [];

    for (const billing of billings) {
      if (!billing.nextPaymentDate) {
        continue;
      }

      let cursor = startOfDay(billing.nextPaymentDate);
      let guard = 0;
      while (cursor < today && guard < 240) {
        const month = cursor.getMonth() + 1;
        const year = cursor.getFullYear();
        const row = this.buildInvoiceRow(billing, month, year, paymentMap, today);
        if (row.debtAmount > 0) {
          rows.push(row);
        }
        cursor = addOneCalendarMonth(cursor);
        guard += 1;
      }
    }

    return rows;
  }

  async list(filter: FilterInvoiceDto, user: UserCtx) {
    const today = startOfDay();
    const billings = await this.fetchBillings(filter, user);
    const paymentMap = await this.buildPaymentMap(billings, {
      month: filter.month,
      year: filter.year,
    });

    let rows: InvoiceRow[] = [];
    if (filter.month && filter.year) {
      rows = billings.map((billing) => this.buildInvoiceRow(billing, filter.month!, filter.year!, paymentMap, today));
    } else {
      rows = this.buildOverdueRows(billings, paymentMap, today);
    }

    if (filter.status) {
      rows = rows.filter((item) => item.status === filter.status);
    }

    const sorted = this.sortRows(rows, filter.sortBy ?? 'dueDate', filter.sortOrder ?? 'desc');
    const { page = 1, limit = 20 } = filter;
    const { skip } = buildPagination(page, limit);

    return toPaginatedResponse(sorted.slice(skip, skip + limit), sorted.length, page, limit);
  }

  async findById(id: string, user: UserCtx) {
    const today = startOfDay();
    const billings = await this.fetchBillings({}, user);
    const paymentMap = await this.buildPaymentMap(billings);
    const overdueRows = this.buildOverdueRows(billings, paymentMap, today);
    const directOverdue = overdueRows.find((item) => item.id === id);
    if (directOverdue) {
      return directOverdue;
    }

    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();

    for (const billing of billings) {
      const currentRow = this.buildInvoiceRow(billing, currentMonth, currentYear, paymentMap, today);
      if (currentRow.id === id) {
        return currentRow;
      }
    }

    for (const [key] of paymentMap) {
      const [studentId, groupId, yearRaw, monthRaw] = key.split('|');
      const year = Number(yearRaw);
      const month = Number(monthRaw);
      const billing = billings.find((item) => item.studentId === studentId && item.groupId === groupId);
      if (!billing || !month || !year) {
        continue;
      }

      const row = this.buildInvoiceRow(billing, month, year, paymentMap, today);
      if (row.id === id) {
        return row;
      }
    }

    return null;
  }

  async listByStudent(studentId: string, user: UserCtx) {
    const filter: Pick<FilterInvoiceDto, 'studentId' | 'branchId'> = {
      studentId,
    };

    const today = startOfDay();
    const billings = await this.fetchBillings(filter, user);
    const paymentMap = await this.buildPaymentMap(billings);
    const rows = this.sortRows(this.buildOverdueRows(billings, paymentMap, today), 'dueDate', 'desc');

    const student = rows[0]?.student ?? null;
    const summary = {
      totalDue: rows.reduce((sum, item) => sum + item.amountDue, 0),
      totalPaid: rows.reduce((sum, item) => sum + item.amountPaid, 0),
      totalDebt: rows.reduce((sum, item) => sum + item.debtAmount, 0),
      invoicesCount: rows.length,
    };

    return {
      student,
      summary,
      invoices: rows,
    };
  }

  async generateMonthly(
    dto: GenerateMonthlyInvoicesDto,
    user: UserCtx,
  ) {
    const now = new Date();
    const month = dto.month ?? now.getMonth() + 1;
    const year = dto.year ?? now.getFullYear();

    const list = await this.list(
      {
        page: 1,
        limit: 10000,
        sortBy: 'dueDate',
        sortOrder: 'desc',
        month,
        year,
        branchId: dto.branchId,
      },
      user,
    );

    return {
      month,
      year,
      generatedAt: new Date().toISOString(),
      totalInvoices: list.meta.total,
      totalAmountDue: list.data.reduce((sum, item) => sum + item.amountDue, 0),
      totalAmountPaid: list.data.reduce((sum, item) => sum + item.amountPaid, 0),
      totalDebtAmount: list.data.reduce((sum, item) => sum + item.debtAmount, 0),
      invoices: list.data,
    };
  }

  createActionLog(data: {
    userId?: string;
    role?: UserRole;
    action: string;
    module: string;
    description: string;
  }) {
    return this.prisma.actionLog.create({ data });
  }
}
