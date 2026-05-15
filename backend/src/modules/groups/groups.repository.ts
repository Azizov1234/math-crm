import { Injectable } from '@nestjs/common';
import { BillingType, Prisma, UserRole } from '@prisma/client';
import { calculateDebt, calculateOverdueMonths } from '../../common/utils/calculate-debt.util';
import { buildPagination, toPaginatedResponse } from '../../common/utils/pagination.util';
import { startOfDay } from '../../common/utils/date-billing.util';
import {
  getPrimaryTeacherFromGroup,
  PRIMARY_GROUP_TEACHER_INCLUDE,
  withPrimaryTeacher,
} from '../../common/utils/group-teacher.util';
import { PrismaService } from '../../prisma/prisma.service';
import { FilterGroupDto } from './dto/filter-group.dto';

@Injectable()
export class GroupsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private mapBillingPayload(
    billing:
      | {
          studentId: string;
          groupId: string;
          monthlyFee: Prisma.Decimal | number;
          billingType: BillingType;
          discountReason: string | null;
          note: string | null;
        }
      | undefined
      | null,
  ) {
    if (!billing) {
      return null;
    }

    return {
      studentId: billing.studentId,
      groupId: billing.groupId,
      monthlyFee: Number(billing.monthlyFee),
      billingType: billing.billingType,
      discountReason: billing.discountReason,
      note: billing.note,
    };
  }

  private mapMembershipWithBilling(
    membership: any,
  ) {
    const [billing] = membership.student.billings;
    const { billings, ...student } = membership.student;

    return {
      ...membership,
      student,
      fullName: student.fullName,
      phone: student.phone,
      billing: this.mapBillingPayload(billing),
    };
  }

  async findAll(filter: FilterGroupDto, user: { role: UserRole; branchId?: string | null }) {
    const { page = 1, limit = 20, search, sortBy = 'createdAt', sortOrder = 'desc', status, includeDeleted, courseId, teacherId } = filter;
    const { skip, take } = buildPagination(page, limit);

    const where: Prisma.GroupWhereInput = {
      ...(includeDeleted ? {} : { deletedAt: null, status: { not: 'DELETED' } }),
      ...(status ? { status } : {}),
      ...(courseId ? { courseId } : {}),
      ...(teacherId
        ? {
            teachers: {
              some: {
                teacherId,
                teacher: { deletedAt: null, status: { not: 'DELETED' } },
              },
            },
          }
        : {}),
      ...(user.role === UserRole.ADMIN && user.branchId ? { branchId: user.branchId } : {}),
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.group.findMany({
        where,
        include: {
          branch: { select: { id: true, name: true } },
          course: { select: { id: true, name: true } },
          ...PRIMARY_GROUP_TEACHER_INCLUDE,
          _count: { select: { students: true } },
        },
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.group.count({ where }),
    ]);

    return toPaginatedResponse(data.map((group) => withPrimaryTeacher(group)), total, page, limit);
  }

  findById(id: string) {
    return this.prisma.group.findUnique({
      where: { id },
      include: {
        branch: true,
        course: true,
        ...PRIMARY_GROUP_TEACHER_INCLUDE,
        students: {
          where: { status: 'ACTIVE' },
          include: {
            student: {
              include: {
                billings: {
                  where: { groupId: id, status: 'ACTIVE' },
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
          },
          orderBy: { joinedAt: 'desc' },
        },
        _count: { select: { students: true } },
      },
    }).then((group) => {
      if (!group) return group;

      const withTeacher = withPrimaryTeacher(group);
      return {
        ...withTeacher,
        students: withTeacher.students.map((membership) => this.mapMembershipWithBilling(membership)),
      };
    });
  }

  create(data: Prisma.GroupCreateInput) {
    return this.prisma.group.create({
      data,
      include: { branch: true, course: true, ...PRIMARY_GROUP_TEACHER_INCLUDE, _count: { select: { students: true } } },
    }).then((group) => withPrimaryTeacher(group));
  }

  update(id: string, data: Prisma.GroupUpdateInput) {
    return this.prisma.group.update({
      where: { id },
      data,
      include: { branch: true, course: true, ...PRIMARY_GROUP_TEACHER_INCLUDE, _count: { select: { students: true } } },
    }).then((group) => withPrimaryTeacher(group));
  }

  findActiveCourse(courseId: string) {
    return this.prisma.course.findFirst({ where: { id: courseId, deletedAt: null, status: 'ACTIVE' } });
  }

  findActiveTeacher(teacherId: string) {
    return this.prisma.teacher.findFirst({ where: { id: teacherId, deletedAt: null, status: 'ACTIVE' } });
  }

  async setTeachers(groupId: string, teacherIds: string[]) {
    await this.prisma.$transaction(async (tx) => {
      await tx.groupTeacher.deleteMany({ where: { groupId } });
      if (teacherIds.length > 0) {
        await tx.groupTeacher.createMany({
          data: teacherIds.map((teacherId) => ({
            groupId,
            teacherId,
          })),
        });
      }
    });
  }

  findActiveStudent(studentId: string) {
    return this.prisma.student.findFirst({ where: { id: studentId, deletedAt: null, status: 'ACTIVE' } });
  }

  updateStudentBranch(studentId: string, branchId: string) {
    return this.prisma.student.update({
      where: { id: studentId },
      data: { branchId },
    });
  }

  findMembership(groupId: string, studentId: string) {
    return this.prisma.groupStudent.findFirst({ where: { groupId, studentId, status: 'ACTIVE' } });
  }

  addOrActivateStudent(groupId: string, studentId: string) {
    return this.prisma.groupStudent.upsert({
      where: { groupId_studentId: { groupId, studentId } },
      update: { status: 'ACTIVE', joinedAt: new Date(), leftAt: null },
      create: {
        group: { connect: { id: groupId } },
        student: { connect: { id: studentId } },
        status: 'ACTIVE',
      },
    });
  }

  deactivateMembership(groupId: string, studentId: string) {
    return this.prisma.groupStudent.updateMany({
      where: { groupId, studentId, status: 'ACTIVE' },
      data: { status: 'INACTIVE', leftAt: new Date() },
    });
  }

  upsertStudentBilling(data: {
    studentId: string;
    groupId: string;
    branchId: string;
    monthlyFee: number;
    billingType: BillingType;
    discountReason?: string | null;
    note?: string | null;
    nextPaymentDate?: Date | null;
  }) {
    return this.prisma.studentBilling.upsert({
      where: { studentId_groupId: { studentId: data.studentId, groupId: data.groupId } },
      update: {
        status: 'ACTIVE',
        branchId: data.branchId,
        monthlyFee: data.monthlyFee,
        billingType: data.billingType,
        discountReason: data.discountReason ?? null,
        note: data.note ?? null,
        ...(data.nextPaymentDate !== undefined ? { nextPaymentDate: data.nextPaymentDate } : {}),
      },
      create: {
        studentId: data.studentId,
        groupId: data.groupId,
        branchId: data.branchId,
        monthlyFee: data.monthlyFee,
        billingType: data.billingType,
        discountReason: data.discountReason ?? null,
        note: data.note ?? null,
        ...(data.nextPaymentDate !== undefined ? { nextPaymentDate: data.nextPaymentDate } : {}),
        status: 'ACTIVE',
      },
    });
  }

  findStudentBilling(studentId: string, groupId: string) {
    return this.prisma.studentBilling.findUnique({
      where: { studentId_groupId: { studentId, groupId } },
    });
  }

  updateStudentBilling(data: {
    studentId: string;
    groupId: string;
    branchId: string;
    monthlyFee: number;
    billingType: BillingType;
    discountReason?: string | null;
    note?: string | null;
  }) {
    return this.prisma.studentBilling.update({
      where: { studentId_groupId: { studentId: data.studentId, groupId: data.groupId } },
      data: {
        status: 'ACTIVE',
        branchId: data.branchId,
        monthlyFee: data.monthlyFee,
        billingType: data.billingType,
        discountReason: data.discountReason ?? null,
        note: data.note ?? null,
      },
    });
  }

  deactivateStudentBilling(studentId: string, groupId: string) {
    return this.prisma.studentBilling.updateMany({
      where: { studentId, groupId, status: 'ACTIVE' },
      data: { status: 'INACTIVE' },
    });
  }

  listStudents(groupId: string) {
    return this.prisma.groupStudent.findMany({
      where: { groupId, status: 'ACTIVE' },
      include: {
        student: {
          include: {
            billings: {
              where: { groupId, status: 'ACTIVE' },
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
      },
      orderBy: { joinedAt: 'desc' },
    }).then((memberships) => memberships.map((membership) => this.mapMembershipWithBilling(membership)));
  }

  listPayments(groupId: string, user: { role: UserRole; branchId?: string | null }) {
    return this.prisma.payment.findMany({
      where: {
        groupId,
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
              where: { groupId, status: 'ACTIVE' },
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
        createdBy: { select: { id: true, fullName: true, username: true } },
      },
      orderBy: { paidAt: 'desc' },
    }).then((payments) =>
      payments.map((payment) => {
        const [billing] = payment.student.billings;
        return {
          ...payment,
          billing: this.mapBillingPayload(billing),
          student: {
            id: payment.student.id,
            fullName: payment.student.fullName,
            phone: payment.student.phone,
          },
        };
      }),
    );
  }

  async listDebtors(groupId: string, user: { role: UserRole; branchId?: string | null }) {
    const billings = await this.prisma.studentBilling.findMany({
      where: {
        groupId,
        status: 'ACTIVE',
        student: { status: 'ACTIVE', deletedAt: null },
        group: { status: 'ACTIVE', deletedAt: null },
        ...(user.role === UserRole.ADMIN && user.branchId ? { branchId: user.branchId } : {}),
      },
      include: {
        student: true,
        group: {
          include: {
            course: true,
            ...PRIMARY_GROUP_TEACHER_INCLUDE,
          },
        },
        branch: { select: { id: true, name: true } },
      },
    });

    const today = startOfDay();
    return billings
      .map((billing) => {
        const overdueMonths = calculateOverdueMonths(billing.nextPaymentDate, today);
        const monthlyFee = Number(billing.monthlyFee);
        const debtAmount = calculateDebt(monthlyFee, overdueMonths);
        const overdueDays = billing.nextPaymentDate
          ? Math.max(0, Math.floor((today.getTime() - startOfDay(billing.nextPaymentDate).getTime()) / 86400000))
          : 0;

        return {
          studentId: billing.student.id,
          fullName: billing.student.fullName,
          phone: billing.student.phone,
          parentPhone: billing.student.parentPhone,
          group: { id: billing.group.id, name: billing.group.name },
          course: { id: billing.group.course.id, name: billing.group.course.name },
          teacher: (() => {
            const teacher = getPrimaryTeacherFromGroup(billing.group);
            return teacher
              ? { id: teacher.id, fullName: teacher.fullName }
              : { id: null, fullName: '-' };
          })(),
          monthlyFee,
          billingType: billing.billingType,
          discountReason: billing.discountReason,
          note: billing.note,
          lastPaymentDate: billing.lastPaymentDate,
          nextPaymentDate: billing.nextPaymentDate,
          overdueDays,
          overdueMonths,
          debtAmount,
          branch: billing.branch,
        };
      })
      .filter((item) => item.debtAmount > 0);
  }

  listExams(groupId: string, user: { role: UserRole; branchId?: string | null }) {
    return this.prisma.monthlyExam.findMany({
      where: {
        groupId,
        deletedAt: null,
        ...(user.role === UserRole.ADMIN && user.branchId ? { branchId: user.branchId } : {}),
      },
      include: {
        course: { select: { id: true, name: true } },
        results: { select: { id: true, result: true, studentId: true } },
      },
      orderBy: { examDate: 'desc' },
    });
  }

  createActionLog(data: {
    userId?: string;
    role?: UserRole;
    action: string;
    module: string;
    description: string;
  }) {
    return this.prisma.actionLog.create({
      data: {
        userId: data.userId,
        role: data.role,
        action: data.action,
        module: data.module,
        description: data.description,
      },
    });
  }
}
