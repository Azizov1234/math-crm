import { Injectable, NotFoundException } from '@nestjs/common';
import { BillingType, Prisma, UserRole } from '@prisma/client';
import { addOneCalendarMonth, startOfDay } from '../../common/utils/date-billing.util';
import { buildPagination, toPaginatedResponse } from '../../common/utils/pagination.util';
import { PrismaService } from '../../prisma/prisma.service';
import { FilterPaymentDto } from './dto/filter-payment.dto';

@Injectable()
export class PaymentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private resolvePaymentPeriodStart(month: number | null | undefined, year: number | null | undefined, paidAt: Date) {
    if (month && year) {
      return startOfDay(new Date(year, month - 1, 1));
    }
    return startOfDay(paidAt);
  }

  private toMonthKey(date: Date) {
    return `${date.getFullYear()}-${date.getMonth() + 1}`;
  }

  private minDate(dates: Date[]) {
    return new Date(Math.min(...dates.map((item) => item.getTime())));
  }

  async findAll(filter: FilterPaymentDto, user: { role: UserRole; branchId?: string | null }) {
    const { page = 1, limit = 20, search, sortBy = 'paidAt', sortOrder = 'desc' } = filter;
    const { skip, take } = buildPagination(page, limit);

    const paidAtWhere =
      filter.fromDate || filter.toDate
        ? {
            gte: filter.fromDate ? startOfDay(new Date(filter.fromDate)) : undefined,
            lte: filter.toDate ? new Date(filter.toDate) : undefined,
          }
        : undefined;

    const where: Prisma.PaymentWhereInput = {
      deletedAt: null,
      ...(user.role === UserRole.ADMIN && user.branchId ? { branchId: user.branchId } : {}),
      ...(filter.groupId ? { groupId: filter.groupId } : {}),
      ...(filter.method ? { method: filter.method } : {}),
      ...(filter.studentId ? { studentId: filter.studentId } : {}),
      ...(filter.courseId ? { group: { courseId: filter.courseId } } : {}),
      ...(filter.teacherId ? { group: { teachers: { some: { teacherId: filter.teacherId } } } } : {}),
      ...(paidAtWhere ? { paidAt: paidAtWhere } : {}),
      ...(filter.month || filter.year
        ? {
            ...(filter.month ? { paymentForMonth: filter.month } : {}),
            ...(filter.year ? { paymentForYear: filter.year } : {}),
          }
        : {}),
      ...(search
        ? {
            OR: [
              { student: { fullName: { contains: search, mode: 'insensitive' } } },
              { student: { phone: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        include: {
          student: {
            select: {
              id: true,
              fullName: true,
              phone: true,
              billings: {
                where: { status: 'ACTIVE' },
                select: {
                  id: true,
                  studentId: true,
                  groupId: true,
                  monthlyFee: true,
                  billingType: true,
                  discountReason: true,
                  note: true,
                  nextPaymentDate: true,
                  lastPaymentDate: true,
                },
              },
            },
          },
          group: {
            select: {
              id: true,
              name: true,
              monthlyFee: true,
              course: { select: { id: true, name: true } },
            },
          },
          createdBy: { select: { id: true, fullName: true, username: true } },
          branch: { select: { id: true, name: true } },
        },
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.payment.count({ where }),
    ]);

    const mapped = data.map((payment) => {
      const billing = payment.student.billings.find((item) => item.groupId === payment.groupId);
      return {
        ...payment,
        nextPaymentDate: billing?.nextPaymentDate ?? null,
        lastPaymentDate: billing?.lastPaymentDate ?? null,
        billing: billing
          ? {
              studentId: billing.studentId,
              groupId: billing.groupId,
              monthlyFee: Number(billing.monthlyFee),
              billingType: billing.billingType,
              discountReason: billing.discountReason,
              note: billing.note,
            }
          : null,
      };
    });

    return toPaginatedResponse(mapped, total, page, limit);
  }

  findById(id: string) {
    return this.prisma.payment.findFirst({
      where: { id, deletedAt: null },
      include: {
        student: {
          include: {
            billings: {
              where: { status: 'ACTIVE' },
              select: {
                studentId: true,
                groupId: true,
                monthlyFee: true,
                billingType: true,
                discountReason: true,
                note: true,
              },
            },
          },
        },
        group: { include: { course: true } },
        branch: true,
        createdBy: { select: { id: true, fullName: true, username: true } },
      },
    }).then((payment) => {
      if (!payment) return payment;
      const billing = payment.student.billings.find((item) => item.groupId === payment.groupId);
      return {
        ...payment,
        billing: billing
          ? {
              studentId: billing.studentId,
              groupId: billing.groupId,
              monthlyFee: Number(billing.monthlyFee),
              billingType: billing.billingType,
              discountReason: billing.discountReason,
              note: billing.note,
            }
          : null,
      };
    });
  }

  findActiveStudent(studentId: string) {
    return this.prisma.student.findFirst({
      where: { id: studentId, status: 'ACTIVE', deletedAt: null },
      select: { id: true, branchId: true },
    });
  }

  findActiveGroup(groupId: string) {
    return this.prisma.group.findFirst({
      where: { id: groupId, status: 'ACTIVE', deletedAt: null },
      select: { id: true, branchId: true, monthlyFee: true, courseId: true },
    });
  }

  findActiveMembership(groupId: string, studentId: string) {
    return this.prisma.groupStudent.findFirst({
      where: { groupId, studentId, status: 'ACTIVE' },
      select: { id: true },
    });
  }

  findActiveBilling(groupId: string, studentId: string) {
    return this.prisma.studentBilling.findFirst({
      where: { groupId, studentId, status: 'ACTIVE' },
      select: {
        studentId: true,
        groupId: true,
        monthlyFee: true,
        nextPaymentDate: true,
        billingType: true,
        discountReason: true,
        note: true,
      },
    });
  }

  async getPaidAmountForMonth(
    studentId: string,
    groupId: string,
    month: number,
    year: number,
    excludePaymentId?: string,
  ) {
    const aggregated = await this.prisma.payment.aggregate({
      where: {
        studentId,
        groupId,
        paymentForMonth: month,
        paymentForYear: year,
        deletedAt: null,
        ...(excludePaymentId ? { id: { not: excludePaymentId } } : {}),
      },
      _sum: { amount: true },
    });
    return Number(aggregated._sum.amount ?? 0);
  }

  async createPaymentWithBilling(data: {
    payload: Prisma.PaymentCreateInput;
    studentId: string;
    groupId: string;
    branchId: string;
    monthlyFee: number;
    billingType?: BillingType;
    discountReason?: string | null;
    note?: string | null;
    paidAt: Date;
    actionLog: { userId?: string; role?: UserRole; action: string; module: string; description: string };
  }) {
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: data.payload,
        include: {
          student: true,
          group: { include: { course: true } },
          branch: true,
          createdBy: { select: { id: true, fullName: true, username: true } },
        },
      });

      const periodStart = this.resolvePaymentPeriodStart(payment.paymentForMonth, payment.paymentForYear, payment.paidAt);

      await tx.studentBilling.upsert({
        where: { studentId_groupId: { studentId: data.studentId, groupId: data.groupId } },
        update: {
          branchId: data.branchId,
          status: 'ACTIVE',
        },
        create: {
          studentId: data.studentId,
          groupId: data.groupId,
          branchId: data.branchId,
          monthlyFee: data.monthlyFee,
          billingType: data.billingType ?? BillingType.DEFAULT,
          discountReason: data.discountReason ?? null,
          note: data.note ?? null,
          status: 'ACTIVE',
          nextPaymentDate: periodStart,
        },
      });

      await this.refreshBillingByPaymentScheduleTx(tx, data.studentId, data.groupId, [periodStart]);
      await tx.actionLog.create({ data: data.actionLog });
      return payment;
    });
  }

  async updatePaymentWithBilling(data: {
    paymentId: string;
    updateData: Prisma.PaymentUpdateInput;
    studentId: string;
    groupId: string;
    actionLog: { userId?: string; role?: UserRole; action: string; module: string; description: string };
  }) {
    return this.prisma.$transaction(async (tx) => {
      const previousPayment = await tx.payment.findUnique({
        where: { id: data.paymentId },
        select: {
          paidAt: true,
          paymentForMonth: true,
          paymentForYear: true,
        },
      });

      if (!previousPayment) {
        throw new NotFoundException('Payment not found');
      }

      const payment = await tx.payment.update({
        where: { id: data.paymentId },
        data: data.updateData,
        include: {
          student: true,
          group: { include: { course: true } },
          branch: true,
          createdBy: { select: { id: true, fullName: true, username: true } },
        },
      });

      const previousPeriod = this.resolvePaymentPeriodStart(
        previousPayment.paymentForMonth,
        previousPayment.paymentForYear,
        previousPayment.paidAt,
      );
      const nextPeriod = this.resolvePaymentPeriodStart(payment.paymentForMonth, payment.paymentForYear, payment.paidAt);

      await this.refreshBillingByPaymentScheduleTx(tx, data.studentId, data.groupId, [previousPeriod, nextPeriod]);
      await tx.actionLog.create({ data: data.actionLog });

      return payment;
    });
  }

  async softDeletePaymentWithBilling(data: {
    paymentId: string;
    studentId: string;
    groupId: string;
    actionLog: { userId?: string; role?: UserRole; action: string; module: string; description: string };
  }) {
    return this.prisma.$transaction(async (tx) => {
      const paymentBeforeDelete = await tx.payment.findUnique({
        where: { id: data.paymentId },
        select: {
          paidAt: true,
          paymentForMonth: true,
          paymentForYear: true,
        },
      });

      if (!paymentBeforeDelete) {
        throw new NotFoundException('Payment not found');
      }

      const payment = await tx.payment.update({
        where: { id: data.paymentId },
        data: { deletedAt: new Date() },
      });

      const deletedPeriod = this.resolvePaymentPeriodStart(
        paymentBeforeDelete.paymentForMonth,
        paymentBeforeDelete.paymentForYear,
        paymentBeforeDelete.paidAt,
      );

      await this.refreshBillingByPaymentScheduleTx(tx, data.studentId, data.groupId, [deletedPeriod]);
      await tx.actionLog.create({ data: data.actionLog });

      return payment;
    });
  }

  private async refreshBillingByPaymentScheduleTx(
    tx: Prisma.TransactionClient,
    studentId: string,
    groupId: string,
    anchorDates: Date[] = [],
  ) {
    const billing = await tx.studentBilling.findUnique({
      where: { studentId_groupId: { studentId, groupId } },
      select: { nextPaymentDate: true, monthlyFee: true },
    });

    if (!billing) {
      return;
    }

    const payments = await tx.payment.findMany({
      where: { studentId, groupId, deletedAt: null },
      select: {
        amount: true,
        paidAt: true,
        paymentForMonth: true,
        paymentForYear: true,
      },
    });

    const normalizedAnchors: Date[] = anchorDates.map((item) => startOfDay(item));
    if (billing.nextPaymentDate) {
      normalizedAnchors.push(startOfDay(billing.nextPaymentDate));
    }

    if (normalizedAnchors.length === 0) {
      if (payments.length > 0) {
        for (const payment of payments) {
          normalizedAnchors.push(
            this.resolvePaymentPeriodStart(payment.paymentForMonth, payment.paymentForYear, payment.paidAt),
          );
        }
      } else {
        normalizedAnchors.push(startOfDay(new Date()));
      }
    }

    let nextPaymentDate = this.minDate(normalizedAnchors);
    const monthlyFee = Number(billing.monthlyFee ?? 0);
    const paidByMonth = new Map<string, number>();
    let latestPaidAt: Date | null = null;

    for (const payment of payments) {
      const period = this.resolvePaymentPeriodStart(payment.paymentForMonth, payment.paymentForYear, payment.paidAt);
      const key = this.toMonthKey(period);
      paidByMonth.set(key, (paidByMonth.get(key) ?? 0) + Number(payment.amount ?? 0));
      if (!latestPaidAt || payment.paidAt > latestPaidAt) {
        latestPaidAt = payment.paidAt;
      }
    }

    if (monthlyFee > 0) {
      const epsilon = 0.00001;
      let guard = 0;
      while (guard < 600) {
        const monthPaid = paidByMonth.get(this.toMonthKey(nextPaymentDate)) ?? 0;
        if (monthPaid + epsilon < monthlyFee) {
          break;
        }
        nextPaymentDate = addOneCalendarMonth(nextPaymentDate);
        guard += 1;
      }
    }

    await tx.studentBilling.update({
      where: { studentId_groupId: { studentId, groupId } },
      data: {
        status: 'ACTIVE',
        lastPaymentDate: latestPaidAt,
        nextPaymentDate,
      },
    });
  }

  listByStudent(studentId: string, user: { role: UserRole; branchId?: string | null }) {
    return this.prisma.payment.findMany({
      where: {
        studentId,
        deletedAt: null,
        ...(user.role === UserRole.ADMIN && user.branchId ? { branchId: user.branchId } : {}),
      },
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            billings: {
              where: { status: 'ACTIVE' },
              select: {
                studentId: true,
                groupId: true,
                monthlyFee: true,
                billingType: true,
                discountReason: true,
                note: true,
              },
            },
          },
        },
        group: { include: { course: true } },
        createdBy: { select: { id: true, fullName: true, username: true } },
      },
      orderBy: { paidAt: 'desc' },
    }).then((payments) =>
      payments.map((payment) => {
        const billing = payment.student.billings.find((item) => item.groupId === payment.groupId);
        return {
          ...payment,
          billing: billing
            ? {
                studentId: billing.studentId,
                groupId: billing.groupId,
                monthlyFee: Number(billing.monthlyFee),
                billingType: billing.billingType,
                discountReason: billing.discountReason,
                note: billing.note,
              }
            : null,
        };
      }),
    );
  }

  async summary(user: { role: UserRole; branchId?: string | null }) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const dayStart = startOfDay(now);

    const where = {
      deletedAt: null,
      ...(user.role === UserRole.ADMIN && user.branchId ? { branchId: user.branchId } : {}),
    } as Prisma.PaymentWhereInput;

    const [total, thisMonth, today, byMethod] = await Promise.all([
      this.prisma.payment.aggregate({ where, _sum: { amount: true }, _count: { id: true } }),
      this.prisma.payment.aggregate({
        where: { ...where, paidAt: { gte: monthStart, lte: now } },
        _sum: { amount: true },
      }),
      this.prisma.payment.aggregate({
        where: { ...where, paidAt: { gte: dayStart, lte: now } },
        _sum: { amount: true },
      }),
      this.prisma.payment.groupBy({ by: ['method'], where, _sum: { amount: true } }),
    ]);

    const cash = byMethod.find((item) => item.method === 'CASH');
    const card = byMethod.find((item) => item.method === 'CARD');
    const transfer = byMethod.find((item) => item.method === 'TRANSFER');

    return {
      totalPaymentsAmount: Number(total._sum.amount ?? 0),
      thisMonthRevenue: Number(thisMonth._sum.amount ?? 0),
      todayPayments: Number(today._sum.amount ?? 0),
      cashTotal: Number(cash?._sum.amount ?? 0),
      cardTotal: Number(card?._sum.amount ?? 0),
      transferTotal: Number(transfer?._sum.amount ?? 0),
      paymentsCount: Number(total._count.id ?? 0),
    };
  }
}
