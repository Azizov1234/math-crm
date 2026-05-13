import { Injectable } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { buildPagination, toPaginatedResponse } from '../../common/utils/pagination.util';
import { calculateOverdueMonths, startOfDay } from '../../common/utils/date-billing.util';
import { getPrimaryTeacherFromGroup, PRIMARY_GROUP_TEACHER_INCLUDE } from '../../common/utils/group-teacher.util';
import { PrismaService } from '../../prisma/prisma.service';
import { FilterStudentDto, StudentDebtStatusFilter, StudentPaymentStatusFilter } from './dto/filter-student.dto';

@Injectable()
export class StudentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findDuplicateStudent(payload: { phone: string; fullName?: string; branchId?: string }) {
    return this.prisma.student.findFirst({
      where: {
        deletedAt: null,
        OR: [
          { phone: payload.phone },
          ...(payload.fullName ? [{ fullName: payload.fullName, phone: payload.phone }] : []),
        ],
        ...(payload.branchId ? { branchId: payload.branchId } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAll(filter: FilterStudentDto, user: { role: UserRole; branchId?: string | null }) {
    const { page = 1, limit = 20, search, sortBy = 'createdAt', sortOrder = 'desc', status, includeDeleted } = filter;
    const { skip, take } = buildPagination(page, limit);
    const today = startOfDay();

    const overdueBillingCondition: Prisma.StudentBillingWhereInput = {
      status: 'ACTIVE',
      nextPaymentDate: { lt: today },
      group: { status: 'ACTIVE', deletedAt: null },
      student: { status: 'ACTIVE', deletedAt: null },
    };

    const where: Prisma.StudentWhereInput = {
      ...(includeDeleted ? {} : { deletedAt: null, status: { not: 'DELETED' } }),
      ...(status ? { status } : {}),
      ...(user.role === UserRole.ADMIN && user.branchId ? { branchId: user.branchId } : {}),
      ...(filter.groupId
        ? {
            groupMemberships: {
              some: {
                groupId: filter.groupId,
                status: 'ACTIVE',
                group: { deletedAt: null, status: { not: 'DELETED' } },
              },
            },
          }
        : {}),
      ...(filter.courseId
        ? {
            groupMemberships: {
              some: {
                status: 'ACTIVE',
                group: {
                  courseId: filter.courseId,
                  deletedAt: null,
                  status: { not: 'DELETED' },
                },
              },
            },
          }
        : {}),
      ...(filter.examResult
        ? {
            examResults: {
              some: {
                result: filter.examResult,
              },
            },
          }
        : {}),
      ...(filter.paymentStatus === StudentPaymentStatusFilter.OVERDUE
        ? { billings: { some: overdueBillingCondition } }
        : {}),
      ...(filter.paymentStatus === StudentPaymentStatusFilter.CURRENT
        ? { NOT: { billings: { some: overdueBillingCondition } } }
        : {}),
      ...(filter.debtStatus === StudentDebtStatusFilter.HAS_DEBT
        ? { billings: { some: overdueBillingCondition } }
        : {}),
      ...(filter.debtStatus === StudentDebtStatusFilter.NO_DEBT
        ? { NOT: { billings: { some: overdueBillingCondition } } }
        : {}),
      ...(search
        ? {
            OR: [
              { fullName: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search, mode: 'insensitive' } },
              { parentPhone: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.student.findMany({
        where,
        include: {
          branch: { select: { id: true, name: true } },
          groupMemberships: {
            where: { status: 'ACTIVE' },
            include: {
              group: {
                select: {
                  id: true,
                  name: true,
                  course: { select: { id: true, name: true } },
                },
              },
            },
          },
          billings: {
            where: { status: 'ACTIVE' },
            select: {
              id: true,
              monthlyFee: true,
              lastPaymentDate: true,
              nextPaymentDate: true,
            },
          },
        },
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.student.count({ where }),
    ]);

    return toPaginatedResponse(data, total, page, limit);
  }

  findById(id: string) {
    return this.prisma.student.findUnique({
      where: { id },
      include: {
        branch: true,
        groupMemberships: {
          where: { status: 'ACTIVE' },
          include: {
            group: {
              include: {
                course: true,
                ...PRIMARY_GROUP_TEACHER_INCLUDE,
              },
            },
          },
        },
      },
    }).then((student) => {
      if (!student) return student;
      return {
        ...student,
        groupMemberships: student.groupMemberships.map((membership) => {
          const teacher = getPrimaryTeacherFromGroup(membership.group);
          return {
            ...membership,
            group: {
              ...membership.group,
              teacher,
              teacherId: teacher?.id ?? null,
            },
          };
        }),
      };
    });
  }

  create(data: Prisma.StudentCreateInput) {
    return this.prisma.student.create({
      data,
      include: {
        branch: true,
      },
    });
  }

  update(id: string, data: Prisma.StudentUpdateInput) {
    return this.prisma.student.update({
      where: { id },
      data,
      include: {
        branch: true,
      },
    });
  }

  getPayments(id: string, user: { role: UserRole; branchId?: string | null }) {
    return this.prisma.payment.findMany({
      where: {
        studentId: id,
        deletedAt: null,
        ...(user.role === UserRole.ADMIN && user.branchId ? { branchId: user.branchId } : {}),
      },
      include: {
        group: { select: { id: true, name: true } },
        createdBy: { select: { id: true, fullName: true, username: true } },
      },
      orderBy: { paidAt: 'desc' },
    });
  }

  async getDebts(id: string, user: { role: UserRole; branchId?: string | null }) {
    const billings = await this.prisma.studentBilling.findMany({
      where: {
        studentId: id,
        status: 'ACTIVE',
        group: { status: 'ACTIVE', deletedAt: null },
        student: { status: 'ACTIVE', deletedAt: null },
        ...(user.role === UserRole.ADMIN && user.branchId ? { branchId: user.branchId } : {}),
      },
      include: {
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
        return {
          billingId: billing.id,
          studentId: billing.studentId,
          group: { id: billing.group.id, name: billing.group.name },
          course: { id: billing.group.course.id, name: billing.group.course.name },
          teacher: (() => {
            const teacher = getPrimaryTeacherFromGroup(billing.group);
            return teacher
              ? { id: teacher.id, fullName: teacher.fullName }
              : { id: null, fullName: '-' };
          })(),
          monthlyFee,
          lastPaymentDate: billing.lastPaymentDate,
          nextPaymentDate: billing.nextPaymentDate,
          overdueMonths,
          debtAmount: monthlyFee * overdueMonths,
          branch: billing.branch,
        };
      })
      .filter((item) => item.debtAmount > 0);
  }

  getExamResults(id: string, user: { role: UserRole; branchId?: string | null }) {
    return this.prisma.monthlyExamResult.findMany({
      where: {
        studentId: id,
        ...(user.role === UserRole.ADMIN && user.branchId ? { exam: { branchId: user.branchId } } : {}),
      },
      include: {
        exam: {
          include: {
            group: { select: { id: true, name: true } },
            course: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  createUploadedFile(data: Prisma.UploadedFileCreateInput) {
    return this.prisma.uploadedFile.create({ data });
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
