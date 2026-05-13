import { Injectable, NotFoundException } from '@nestjs/common';
import { BillingStatus, BillingType, GroupStudentStatus, Prisma, Status, UserRole } from '@prisma/client';
import { createHash } from 'crypto';
import { addOneCalendarMonth, startOfDay } from '../../common/utils/date-billing.util';
import { getPrimaryTeacherFromGroup, PRIMARY_GROUP_TEACHER_INCLUDE } from '../../common/utils/group-teacher.util';
import { buildPagination, toPaginatedResponse } from '../../common/utils/pagination.util';
import { PrismaService } from '../../prisma/prisma.service';
import { FilterDebtorDto } from './dto/filter-debtor.dto';

type UserCtx = { role: UserRole; branchId?: string | null };

type DebtMonth = {
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
  overdueDays: number;
};

type GroupDebtDetail = {
  groupId: string;
  groupName: string;
  courseName: string;
  teacherName: string;
  monthlyFee: number;
  billingType: BillingType;
  discountReason: string | null;
  note: string | null;
  totalDue: number;
  totalPaid: number;
  totalDebt: number;
  overdueDays: number;
  months: DebtMonth[];
};

type StudentAggregate = {
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
};

@Injectable()
export class DebtorsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private billingWhere(filter: FilterDebtorDto, user: UserCtx, today: Date): Prisma.StudentBillingWhereInput {
    return {
      status: BillingStatus.ACTIVE,
      nextPaymentDate: { lt: today },
      student: {
        status: Status.ACTIVE,
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
        status: Status.ACTIVE,
        deletedAt: null,
        ...(filter.groupId ? { id: filter.groupId } : {}),
        ...(filter.courseId ? { courseId: filter.courseId } : {}),
        ...(filter.teacherId ? { teachers: { some: { teacherId: filter.teacherId } } } : {}),
      },
      ...(user.role === UserRole.ADMIN && user.branchId ? { branchId: user.branchId } : {}),
    };
  }

  private monthKey(studentId: string, groupId: string, year: number, month: number) {
    return `${studentId}|${groupId}|${year}|${month}`;
  }

  private pairKey(studentId: string, groupId: string) {
    return `${studentId}|${groupId}`;
  }

  private pseudoInvoiceId(studentId: string, groupId: string, year: number, month: number) {
    const hex = createHash('md5').update(`${studentId}:${groupId}:${year}:${month}`).digest('hex');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
  }

  private formatMonthLabel(date: Date): string {
    return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date);
  }

  private computeMonthStatus(amountDue: number, amountPaid: number, dueDate: Date, today: Date): 'PAID' | 'PARTIAL' | 'UNPAID' | 'OVERDUE' {
    if (amountPaid >= amountDue) {
      return 'PAID';
    }

    if (amountPaid > 0 && amountPaid < amountDue) {
      return dueDate < today ? 'PARTIAL' : 'UNPAID';
    }

    return dueDate < today ? 'OVERDUE' : 'UNPAID';
  }

  private buildGroupDebtDetail(
    billing: any,
    paymentMap: Map<string, { amount: number; paidAt: Date | null }>,
    today: Date,
  ): GroupDebtDetail | null {
    if (!billing.nextPaymentDate) {
      return null;
    }

    const monthlyFee = Number(billing.monthlyFee);
    const months: DebtMonth[] = [];
    let cursor = startOfDay(billing.nextPaymentDate);

    while (cursor < today) {
      const month = cursor.getMonth() + 1;
      const year = cursor.getFullYear();
      const dueDate = new Date(cursor);
      const paymentAgg = paymentMap.get(this.monthKey(billing.studentId, billing.groupId, year, month));
      const amountPaid = Number(paymentAgg?.amount ?? 0);
      const amountDue = monthlyFee;
      const debtAmount = Math.max(0, amountDue - amountPaid);
      const status = this.computeMonthStatus(amountDue, amountPaid, dueDate, today);

      if (debtAmount > 0 && dueDate < today && (status === 'OVERDUE' || status === 'PARTIAL')) {
        const overdueDays = Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / 86400000));
        months.push({
          invoiceId: this.pseudoInvoiceId(billing.studentId, billing.groupId, year, month),
          month,
          year,
          label: this.formatMonthLabel(dueDate),
          amountDue,
          amountPaid,
          debtAmount,
          dueDate: dueDate.toISOString(),
          paidAt: paymentAgg?.paidAt ? paymentAgg.paidAt.toISOString() : null,
          status,
          overdueDays,
        });
      }

      cursor = addOneCalendarMonth(cursor);
    }

    if (months.length === 0) {
      return null;
    }

    const totalDue = months.reduce((sum, item) => sum + item.amountDue, 0);
    const totalPaid = months.reduce((sum, item) => sum + item.amountPaid, 0);
    const totalDebt = months.reduce((sum, item) => sum + item.debtAmount, 0);
    const overdueDays = months.reduce((max, item) => Math.max(max, item.overdueDays), 0);

    return {
      groupId: billing.group.id,
      groupName: billing.group.name,
      courseName: billing.group.course.name,
      teacherName: getPrimaryTeacherFromGroup(billing.group)?.fullName ?? '-',
      monthlyFee,
      billingType: billing.billingType,
      discountReason: billing.discountReason,
      note: billing.note,
      totalDue,
      totalPaid,
      totalDebt,
      overdueDays,
      months,
    };
  }

  private async fetchBillingRows(filter: FilterDebtorDto, user: UserCtx, today: Date) {
    return this.prisma.studentBilling.findMany({
      where: this.billingWhere(filter, user, today),
      include: {
        student: true,
        group: {
          include: {
            course: true,
            ...PRIMARY_GROUP_TEACHER_INCLUDE,
          },
        },
      },
    });
  }

  private async buildPaymentMap(
    billings: any[],
  ): Promise<Map<string, { amount: number; paidAt: Date | null }>> {
    const map = new Map<string, { amount: number; paidAt: Date | null }>();
    if (billings.length === 0) {
      return map;
    }

    const pairSet = new Set<string>();
    const studentIds = new Set<string>();
    const groupIds = new Set<string>();

    for (const billing of billings) {
      pairSet.add(this.pairKey(billing.studentId, billing.groupId));
      studentIds.add(billing.studentId);
      groupIds.add(billing.groupId);
    }

    const payments = await this.prisma.payment.findMany({
      where: {
        deletedAt: null,
        studentId: { in: Array.from(studentIds) },
        groupId: { in: Array.from(groupIds) },
      },
      select: {
        studentId: true,
        groupId: true,
        amount: true,
        paymentForMonth: true,
        paymentForYear: true,
        paidAt: true,
      },
    });

    for (const payment of payments) {
      const pair = this.pairKey(payment.studentId, payment.groupId);
      if (!pairSet.has(pair)) {
        continue;
      }

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

  private buildStudentAggregates(
    billings: any[],
    paymentMap: Map<string, { amount: number; paidAt: Date | null }>,
    today: Date,
  ) {
    const byStudent = new Map<
      string,
      {
        student: { id: string; fullName: string; phone: string; parentPhone: string | null; status: Status };
        groups: GroupDebtDetail[];
      }
    >();

    for (const billing of billings) {
      const groupDebt = this.buildGroupDebtDetail(billing, paymentMap, today);
      if (!groupDebt || groupDebt.totalDebt <= 0) {
        continue;
      }

      const current: {
        student: { id: string; fullName: string; phone: string; parentPhone: string | null; status: Status };
        groups: GroupDebtDetail[];
      } = byStudent.get(billing.studentId) ?? {
        student: {
          id: billing.student.id,
          fullName: billing.student.fullName,
          phone: billing.student.phone,
          parentPhone: billing.student.parentPhone,
          status: billing.student.status,
        },
        groups: [],
      };

      current.groups.push(groupDebt);
      byStudent.set(billing.studentId, current);
    }

    return byStudent;
  }

  private toStudentAggregate(data: {
    student: { id: string; fullName: string; phone: string; parentPhone: string | null };
    groups: GroupDebtDetail[];
  }): StudentAggregate {
    const groups = data.groups.map((item) => ({ id: item.groupId, name: item.groupName }));
    const monthlyFeeTotal = data.groups.reduce((sum, group) => sum + group.monthlyFee, 0);
    const totalDebt = data.groups.reduce((sum, group) => sum + group.totalDebt, 0);
    const maxOverdueDays = data.groups.reduce((max, group) => Math.max(max, group.overdueDays), 0);
    const oldestDebtDateValue = data.groups
      .flatMap((group) => group.months)
      .map((month) => month.dueDate)
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0];

    return {
      studentId: data.student.id,
      fullName: data.student.fullName,
      phone: data.student.phone,
      parentPhone: data.student.parentPhone,
      groupsCount: groups.length,
      groups,
      monthlyFeeTotal,
      totalDebt,
      maxOverdueDays,
      oldestDebtDate: oldestDebtDateValue ?? null,
      status: 'OVERDUE',
    };
  }

  private applyAggregateFilters(items: StudentAggregate[], filter: FilterDebtorDto): StudentAggregate[] {
    return items.filter((item) => {
      if (filter.minDebt !== undefined && item.totalDebt < filter.minDebt) return false;
      if (filter.maxDebt !== undefined && item.totalDebt > filter.maxDebt) return false;
      if (filter.minOverdueDays !== undefined && item.maxOverdueDays < filter.minOverdueDays) return false;
      if (filter.maxOverdueDays !== undefined && item.maxOverdueDays > filter.maxOverdueDays) return false;
      return true;
    });
  }

  private sortAggregates(items: StudentAggregate[], filter: FilterDebtorDto): StudentAggregate[] {
    const sortBy = filter.sortBy ?? 'totalDebt';
    const sortOrder = filter.sortOrder === 'asc' ? 'asc' : 'desc';

    const sorted = [...items].sort((a, b) => {
      if (sortBy === 'fullName') {
        return a.fullName.localeCompare(b.fullName);
      }
      if (sortBy === 'maxOverdueDays') {
        return a.maxOverdueDays - b.maxOverdueDays;
      }
      if (sortBy === 'monthlyFeeTotal') {
        return a.monthlyFeeTotal - b.monthlyFeeTotal;
      }

      return a.totalDebt - b.totalDebt;
    });

    return sortOrder === 'asc' ? sorted : sorted.reverse();
  }

  async list(filter: FilterDebtorDto, user: UserCtx) {
    const today = startOfDay();
    const billingRows = await this.fetchBillingRows(filter, user, today);
    const paymentMap = await this.buildPaymentMap(billingRows);
    const grouped = this.buildStudentAggregates(billingRows, paymentMap, today);

    const aggregates = Array.from(grouped.values()).map((item) => this.toStudentAggregate(item));
    const filtered = this.applyAggregateFilters(aggregates, filter);
    const sorted = this.sortAggregates(filtered, filter);

    const { page = 1, limit = 20 } = filter;
    const { skip, take } = buildPagination(page, limit);

    return toPaginatedResponse(sorted.slice(skip, skip + take), sorted.length, page, limit);
  }

  async summary(filter: FilterDebtorDto, user: UserCtx) {
    const today = startOfDay();
    const billingRows = await this.fetchBillingRows(filter, user, today);
    const paymentMap = await this.buildPaymentMap(billingRows);
    const grouped = this.buildStudentAggregates(billingRows, paymentMap, today);

    const aggregates = Array.from(grouped.values()).map((item) => this.toStudentAggregate(item));
    const filtered = this.applyAggregateFilters(aggregates, filter);

    if (filtered.length === 0) {
      return {
        debtorsCount: 0,
        totalDebtAmount: 0,
        averageDebtAmount: 0,
        maxOverdueDays: 0,
        groupsWithDebtCount: 0,
      };
    }

    const totalDebtAmount = filtered.reduce((sum, item) => sum + item.totalDebt, 0);
    const maxOverdueDays = filtered.reduce((max, item) => Math.max(max, item.maxOverdueDays), 0);
    const groupsWithDebtCount = new Set(filtered.flatMap((item) => item.groups.map((group) => group.id))).size;

    return {
      debtorsCount: filtered.length,
      totalDebtAmount,
      averageDebtAmount: Number((totalDebtAmount / filtered.length).toFixed(2)),
      maxOverdueDays,
      groupsWithDebtCount,
    };
  }

  async byGroup(filter: FilterDebtorDto, user: UserCtx) {
    const today = startOfDay();
    const billingRows = await this.fetchBillingRows(filter, user, today);
    const paymentMap = await this.buildPaymentMap(billingRows);

    const byGroupMap = new Map<
      string,
      {
        groupId: string;
        groupName: string;
        courseName: string;
        teacherName: string;
        debtorsSet: Set<string>;
        totalDebt: number;
      }
    >();

    for (const billing of billingRows) {
      const detail = this.buildGroupDebtDetail(billing, paymentMap, today);
      if (!detail || detail.totalDebt <= 0) {
        continue;
      }

      const current = byGroupMap.get(detail.groupId) ?? {
        groupId: detail.groupId,
        groupName: detail.groupName,
        courseName: detail.courseName,
        teacherName: detail.teacherName,
        debtorsSet: new Set<string>(),
        totalDebt: 0,
      };

      current.totalDebt += detail.totalDebt;
      current.debtorsSet.add(billing.studentId);
      byGroupMap.set(detail.groupId, current);
    }

    const rows = Array.from(byGroupMap.values())
      .map((item) => ({
        groupId: item.groupId,
        groupName: item.groupName,
        courseName: item.courseName,
        teacherName: item.teacherName,
        debtorsCount: item.debtorsSet.size,
        totalDebt: item.totalDebt,
      }))
      .filter((item) => {
        if (filter.minDebt !== undefined && item.totalDebt < filter.minDebt) return false;
        if (filter.maxDebt !== undefined && item.totalDebt > filter.maxDebt) return false;
        return true;
      })
      .sort((a, b) => b.totalDebt - a.totalDebt);

    return rows;
  }

  async byStudentDetails(studentId: string, user: UserCtx) {
    const today = startOfDay();

    const student = await this.prisma.student.findFirst({
      where: {
        id: studentId,
        deletedAt: null,
        ...(user.role === UserRole.ADMIN && user.branchId ? { branchId: user.branchId } : {}),
      },
      select: {
        id: true,
        fullName: true,
        phone: true,
        parentPhone: true,
        status: true,
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const billingRows = await this.prisma.studentBilling.findMany({
      where: {
        studentId,
        status: BillingStatus.ACTIVE,
        nextPaymentDate: { lt: today },
        student: { status: Status.ACTIVE, deletedAt: null },
        group: {
          status: Status.ACTIVE,
          deletedAt: null,
          ...(user.role === UserRole.ADMIN && user.branchId ? { branchId: user.branchId } : {}),
        },
      },
      include: {
        student: true,
        group: {
          include: {
            course: true,
            ...PRIMARY_GROUP_TEACHER_INCLUDE,
            students: {
              where: {
                studentId,
                status: GroupStudentStatus.ACTIVE,
              },
              select: { id: true },
            },
          },
        },
      },
    });

    const membershipFiltered = billingRows.filter((row) => row.group.students.length > 0);
    const paymentMap = await this.buildPaymentMap(membershipFiltered);

    const groups = membershipFiltered
      .map((billing) => this.buildGroupDebtDetail(billing, paymentMap, today))
      .filter((item): item is GroupDebtDetail => Boolean(item))
      .sort((a, b) => b.totalDebt - a.totalDebt);

    const summary = {
      groupsCount: groups.length,
      monthlyFeeTotal: groups.reduce((sum, group) => sum + group.monthlyFee, 0),
      totalDebt: groups.reduce((sum, group) => sum + group.totalDebt, 0),
      maxOverdueDays: groups.reduce((max, group) => Math.max(max, group.overdueDays), 0),
    };

    return {
      student: {
        id: student.id,
        fullName: student.fullName,
        phone: student.phone,
        parentPhone: student.parentPhone,
        status: student.status,
      },
      summary,
      groups,
    };
  }
}

