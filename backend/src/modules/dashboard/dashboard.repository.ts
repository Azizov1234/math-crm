import { Injectable } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { calculateDebt, calculateOverdueMonths } from '../../common/utils/calculate-debt.util';
import { startOfDay } from '../../common/utils/date-billing.util';
import { getPrimaryTeacherFromGroup, PRIMARY_GROUP_TEACHER_INCLUDE } from '../../common/utils/group-teacher.util';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardRepository {
  constructor(private readonly prisma: PrismaService) {}

  private branchScope(user: { role: UserRole; branchId?: string | null }) {
    return user.role === UserRole.ADMIN && user.branchId ? user.branchId : undefined;
  }

  async summary(user: { role: UserRole; branchId?: string | null }) {
    const branchId = this.branchScope(user);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const dayStart = startOfDay(now);

    const studentWhere: Prisma.StudentWhereInput = {
      deletedAt: null,
      status: { not: 'DELETED' },
      ...(branchId ? { branchId } : {}),
    };

    const teacherWhere: Prisma.TeacherWhereInput = {
      deletedAt: null,
      status: { not: 'DELETED' },
      ...(branchId ? { branchId } : {}),
    };

    const courseWhere: Prisma.CourseWhereInput = {
      deletedAt: null,
      status: { not: 'DELETED' },
      ...(branchId ? { branchId } : {}),
    };

    const groupWhere: Prisma.GroupWhereInput = {
      deletedAt: null,
      status: { not: 'DELETED' },
      ...(branchId ? { branchId } : {}),
    };

    const adminWhere: Prisma.UserWhereInput = {
      role: UserRole.ADMIN,
      deletedAt: null,
      status: { not: 'DELETED' },
      ...(branchId ? { branchId } : {}),
    };

    const paymentWhere: Prisma.PaymentWhereInput = {
      deletedAt: null,
      ...(branchId ? { branchId } : {}),
    };

    const examWhere: Prisma.MonthlyExamWhereInput = {
      deletedAt: null,
      ...(branchId ? { branchId } : {}),
    };

    const examResultWhere: Prisma.MonthlyExamResultWhereInput = {
      ...(branchId ? { exam: { branchId } } : {}),
    };

    const [
      totalStudents,
      activeStudents,
      inactiveStudents,
      totalTeachers,
      totalAdmins,
      totalCourses,
      totalGroups,
      monthlyPaymentAgg,
      todayPaymentAgg,
      methodAgg,
      billings,
      monthlyExamCount,
      examResultAgg,
      actionLogsCount,
      errorLogsCount,
    ] = await Promise.all([
      this.prisma.student.count({ where: studentWhere }),
      this.prisma.student.count({ where: { ...studentWhere, status: 'ACTIVE' } }),
      this.prisma.student.count({ where: { ...studentWhere, status: 'INACTIVE' } }),
      this.prisma.teacher.count({ where: teacherWhere }),
      this.prisma.user.count({ where: adminWhere }),
      this.prisma.course.count({ where: courseWhere }),
      this.prisma.group.count({ where: groupWhere }),
      this.prisma.payment.aggregate({
        where: { ...paymentWhere, paidAt: { gte: monthStart, lte: now } },
        _sum: { amount: true },
      }),
      this.prisma.payment.aggregate({
        where: { ...paymentWhere, paidAt: { gte: dayStart, lte: now } },
        _sum: { amount: true },
      }),
      this.prisma.payment.groupBy({
        by: ['method'],
        where: { ...paymentWhere, paidAt: { gte: monthStart, lte: now } },
        _sum: { amount: true },
      }),
      this.prisma.studentBilling.findMany({
        where: {
          status: 'ACTIVE',
          nextPaymentDate: { lt: dayStart },
          student: { status: 'ACTIVE', deletedAt: null },
          group: { status: 'ACTIVE', deletedAt: null },
          ...(branchId ? { branchId } : {}),
        },
        select: {
          monthlyFee: true,
          nextPaymentDate: true,
        },
      }),
      this.prisma.monthlyExam.count({ where: examWhere }),
      this.prisma.monthlyExamResult.groupBy({ by: ['result'], where: examResultWhere, _count: { id: true } }),
      this.prisma.actionLog.count(),
      this.prisma.errorLog.count(),
    ]);

    const today = startOfDay();
    const debts = billings.map((billing) => {
      const overdueMonths = calculateOverdueMonths(billing.nextPaymentDate, today);
      return calculateDebt(Number(billing.monthlyFee), overdueMonths);
    });

    const debtorsCount = debts.filter((item) => item > 0).length;
    const totalDebtAmount = debts.reduce((sum, value) => sum + value, 0);

    const methodTotals = {
      CASH: 0,
      CARD: 0,
      TRANSFER: 0,
    } as Record<string, number>;

    for (const row of methodAgg) {
      methodTotals[row.method] = Number(row._sum.amount ?? 0);
    }

    const resultCounts = {
      PASSED: 0,
      FAILED: 0,
      SKIPPED: 0,
      SENT_TO_RETAKE: 0,
    } as Record<string, number>;

    for (const row of examResultAgg) {
      resultCounts[row.result] = row._count.id;
    }

    return {
      totalStudents,
      activeStudents,
      inactiveStudents,
      totalTeachers,
      totalAdmins,
      totalCourses,
      totalGroups,
      thisMonthRevenue: Number(monthlyPaymentAgg._sum.amount ?? 0),
      todayPayments: Number(todayPaymentAgg._sum.amount ?? 0),
      cashPaymentsThisMonth: methodTotals.CASH,
      cardPaymentsThisMonth: methodTotals.CARD,
      transferPaymentsThisMonth: methodTotals.TRANSFER,
      debtorsCount,
      totalDebtAmount,
      monthlyExamCount,
      passedCount: resultCounts.PASSED,
      failedCount: resultCounts.FAILED,
      skippedCount: resultCounts.SKIPPED,
      sentToRetakeCount: resultCounts.SENT_TO_RETAKE,
      systemLogsCount: actionLogsCount + errorLogsCount,
    };
  }

  async revenueChart(user: { role: UserRole; branchId?: string | null }) {
    const branchId = this.branchScope(user);
    const now = new Date();
    const result: Array<{ month: string; revenue: number }> = [];

    for (let i = 5; i >= 0; i -= 1) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
      const aggregate = await this.prisma.payment.aggregate({
        where: {
          deletedAt: null,
          paidAt: { gte: start, lte: end },
          ...(branchId ? { branchId } : {}),
        },
        _sum: { amount: true },
      });

      result.push({
        month: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`,
        revenue: Number(aggregate._sum.amount ?? 0),
      });
    }

    return result;
  }

  async paymentMethodChart(user: { role: UserRole; branchId?: string | null }) {
    const branchId = this.branchScope(user);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const rows = await this.prisma.payment.groupBy({
      by: ['method'],
      where: {
        deletedAt: null,
        paidAt: { gte: monthStart, lte: now },
        ...(branchId ? { branchId } : {}),
      },
      _sum: { amount: true },
      _count: { id: true },
    });

    return rows.map((row) => ({
      method: row.method,
      totalAmount: Number(row._sum.amount ?? 0),
      count: row._count.id,
    }));
  }

  async debtorsChart(user: { role: UserRole; branchId?: string | null }) {
    const branchId = this.branchScope(user);
    const today = startOfDay();

    const billings = await this.prisma.studentBilling.findMany({
      where: {
        status: 'ACTIVE',
        nextPaymentDate: { lt: today },
        student: { status: 'ACTIVE', deletedAt: null },
        group: { status: 'ACTIVE', deletedAt: null },
        ...(branchId ? { branchId } : {}),
      },
      include: {
        group: { select: { id: true, name: true } },
      },
    });

    const map = new Map<string, { groupId: string; groupName: string; debtorsCount: number; debtAmount: number }>();
    for (const row of billings) {
      const overdueMonths = calculateOverdueMonths(row.nextPaymentDate, today);
      const debtAmount = calculateDebt(Number(row.monthlyFee), overdueMonths);
      if (debtAmount <= 0) {
        continue;
      }

      const current = map.get(row.group.id) ?? {
        groupId: row.group.id,
        groupName: row.group.name,
        debtorsCount: 0,
        debtAmount: 0,
      };
      current.debtorsCount += 1;
      current.debtAmount += debtAmount;
      map.set(row.group.id, current);
    }

    return Array.from(map.values()).sort((a, b) => b.debtAmount - a.debtAmount);
  }

  async examResultChart(user: { role: UserRole; branchId?: string | null }) {
    const branchId = this.branchScope(user);

    const rows = await this.prisma.monthlyExamResult.groupBy({
      by: ['result'],
      where: {
        ...(branchId ? { exam: { branchId } } : {}),
      },
      _count: { id: true },
    });

    const counts = {
      PASSED: 0,
      FAILED: 0,
      SKIPPED: 0,
      SENT_TO_RETAKE: 0,
    } as Record<string, number>;

    for (const row of rows) {
      counts[row.result] = row._count.id;
    }

    const total = counts.PASSED + counts.FAILED + counts.SKIPPED + counts.SENT_TO_RETAKE;
    const toPercent = (value: number) => (total > 0 ? Number(((value / total) * 100).toFixed(2)) : 0);

    return {
      total,
      items: [
        { result: 'PASSED', count: counts.PASSED, percent: toPercent(counts.PASSED) },
        { result: 'FAILED', count: counts.FAILED, percent: toPercent(counts.FAILED) },
        { result: 'SKIPPED', count: counts.SKIPPED, percent: toPercent(counts.SKIPPED) },
        { result: 'SENT_TO_RETAKE', count: counts.SENT_TO_RETAKE, percent: toPercent(counts.SENT_TO_RETAKE) },
      ],
    };
  }

  async groupStats(user: { role: UserRole; branchId?: string | null }) {
    const branchId = this.branchScope(user);

    const groups = await this.prisma.group.findMany({
      where: {
        deletedAt: null,
        status: { not: 'DELETED' },
        ...(branchId ? { branchId } : {}),
      },
      include: {
        _count: { select: { students: true, monthlyExams: true } },
        course: { select: { id: true, name: true } },
        ...PRIMARY_GROUP_TEACHER_INCLUDE,
      },
      orderBy: { createdAt: 'desc' },
    });

    return groups.map((group) => ({
      id: group.id,
      name: group.name,
      course: group.course,
      teacher: getPrimaryTeacherFromGroup(group),
      monthlyFee: Number(group.monthlyFee),
      studentsCount: group._count.students,
      examsCount: group._count.monthlyExams,
      status: group.status,
    }));
  }
}
