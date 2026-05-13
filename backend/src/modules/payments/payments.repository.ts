import { Injectable, NotFoundException } from '@nestjs/common';
import { BillingType, Prisma, UserRole } from '@prisma/client';
import { addOneCalendarMonth, startOfDay } from '../../common/utils/date-billing.util';
import { buildPagination, toPaginatedResponse } from '../../common/utils/pagination.util';
import { PrismaService } from '../../prisma/prisma.service';
import { FilterPaymentDto } from './dto/filter-payment.dto';

@Injectable()
export class PaymentsRepository {
  constructor(private readonly prisma: PrismaService) {}

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

      await tx.studentBilling.upsert({
        where: { studentId_groupId: { studentId: data.studentId, groupId: data.groupId } },
        update: {
          branchId: data.branchId,
          status: 'ACTIVE',
          lastPaymentDate: data.paidAt,
          nextPaymentDate: addOneCalendarMonth(data.paidAt),
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
          lastPaymentDate: data.paidAt,
          nextPaymentDate: addOneCalendarMonth(data.paidAt),
        },
      });

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

      await this.refreshBillingByLatestPaymentTx(tx, data.studentId, data.groupId);
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
      const payment = await tx.payment.update({
        where: { id: data.paymentId },
        data: { deletedAt: new Date() },
      });

      await this.refreshBillingByLatestPaymentTx(tx, data.studentId, data.groupId);
      await tx.actionLog.create({ data: data.actionLog });

      return payment;
    });
  }

  private async refreshBillingByLatestPaymentTx(tx: Prisma.TransactionClient, studentId: string, groupId: string) {
    const latest = await tx.payment.findFirst({
      where: { studentId, groupId, deletedAt: null },
      orderBy: [{ paidAt: 'desc' }, { createdAt: 'desc' }],
      select: { paidAt: true },
    });

    if (!latest) {
      await tx.studentBilling.updateMany({
        where: { studentId, groupId },
        data: { lastPaymentDate: null, nextPaymentDate: null },
      });
      return;
    }

    await tx.studentBilling.updateMany({
      where: { studentId, groupId },
      data: {
        status: 'ACTIVE',
        lastPaymentDate: latest.paidAt,
        nextPaymentDate: addOneCalendarMonth(latest.paidAt),
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
