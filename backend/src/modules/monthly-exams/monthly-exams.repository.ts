import { Injectable } from '@nestjs/common';
import { ExamResultStatus, ExamStatus, Prisma, UserRole } from '@prisma/client';
import { buildPagination, toPaginatedResponse } from '../../common/utils/pagination.util';
import { PrismaService } from '../../prisma/prisma.service';
import { FilterMonthlyExamDto } from './dto/filter-monthly-exam.dto';

@Injectable()
export class MonthlyExamsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filter: FilterMonthlyExamDto, user: { role: UserRole; branchId?: string | null }) {
    const { page = 1, limit = 20, search, sortBy = 'examDate', sortOrder = 'desc' } = filter;
    const { skip, take } = buildPagination(page, limit);

    const where: Prisma.MonthlyExamWhereInput = {
      deletedAt: null,
      ...(filter.groupId ? { groupId: filter.groupId } : {}),
      ...(filter.courseId ? { courseId: filter.courseId } : {}),
      ...(filter.status ? { status: filter.status } : {}),
      ...(user.role === UserRole.ADMIN && user.branchId ? { branchId: user.branchId } : {}),
      ...((filter.fromDate || filter.toDate)
        ? {
            examDate: {
              gte: filter.fromDate ? new Date(filter.fromDate) : undefined,
              lte: filter.toDate ? new Date(filter.toDate) : undefined,
            },
          }
        : {}),
      ...(search ? { title: { contains: search, mode: 'insensitive' } } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.monthlyExam.findMany({
        where,
        include: {
          branch: { select: { id: true, name: true } },
          course: { select: { id: true, name: true } },
          group: { select: { id: true, name: true } },
          _count: { select: { results: true } },
        },
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.monthlyExam.count({ where }),
    ]);

    return toPaginatedResponse(data, total, page, limit);
  }

  findById(id: string) {
    return this.prisma.monthlyExam.findUnique({
      where: { id },
      include: {
        branch: true,
        course: true,
        group: true,
        _count: { select: { results: true } },
      },
    });
  }

  findActiveCourse(courseId: string) {
    return this.prisma.course.findFirst({ where: { id: courseId, status: 'ACTIVE', deletedAt: null } });
  }

  findActiveGroup(groupId: string) {
    return this.prisma.group.findFirst({ where: { id: groupId, status: 'ACTIVE', deletedAt: null } });
  }

  findActiveStudentInGroup(studentId: string, groupId: string) {
    return this.prisma.groupStudent.findFirst({
      where: {
        studentId,
        groupId,
        status: 'ACTIVE',
        student: { status: 'ACTIVE', deletedAt: null },
      },
      select: { id: true },
    });
  }

  async listActiveStudentIdsInGroup(groupId: string) {
    const rows = await this.prisma.groupStudent.findMany({
      where: {
        groupId,
        status: 'ACTIVE',
        student: {
          status: 'ACTIVE',
          deletedAt: null,
        },
      },
      select: { studentId: true },
    });

    return rows.map((row) => row.studentId);
  }

  countActiveStudentsInGroup(groupId: string) {
    return this.prisma.groupStudent.count({
      where: {
        groupId,
        status: 'ACTIVE',
        student: {
          status: 'ACTIVE',
          deletedAt: null,
        },
      },
    });
  }

  countPassedResults(examId: string) {
    return this.prisma.monthlyExamResult.count({
      where: {
        examId,
        result: 'PASSED',
      },
    });
  }

  setExamStatus(examId: string, status: ExamStatus) {
    return this.prisma.monthlyExam.update({
      where: { id: examId },
      data: { status },
      select: { id: true, status: true },
    });
  }

  create(data: Prisma.MonthlyExamCreateInput) {
    return this.prisma.monthlyExam.create({
      data,
      include: {
        branch: true,
        course: true,
        group: true,
      },
    });
  }

  update(id: string, data: Prisma.MonthlyExamUpdateInput) {
    return this.prisma.monthlyExam.update({
      where: { id },
      data,
      include: {
        branch: true,
        course: true,
        group: true,
      },
    });
  }

  findResultByExamStudent(examId: string, studentId: string) {
    return this.prisma.monthlyExamResult.findUnique({ where: { examId_studentId: { examId, studentId } } });
  }

  createResult(data: Prisma.MonthlyExamResultCreateInput) {
    return this.prisma.monthlyExamResult.create({
      data,
      include: {
        student: { select: { id: true, fullName: true, phone: true } },
        exam: { select: { id: true, title: true, examDate: true, groupId: true, courseId: true } },
        createdBy: { select: { id: true, fullName: true, username: true } },
      },
    });
  }

  createManyDefaultResults(examId: string, studentIds: string[], createdById: string) {
    if (studentIds.length === 0) {
      return Promise.resolve({ count: 0 });
    }

    return this.prisma.monthlyExamResult.createMany({
      data: studentIds.map((studentId) => ({
        examId,
        studentId,
        result: ExamResultStatus.NOT_SUBMITTED,
        comment: null,
        createdById,
        checkedAt: null,
      })),
      skipDuplicates: true,
    });
  }

  findResultById(id: string) {
    return this.prisma.monthlyExamResult.findUnique({
      where: { id },
      include: {
        exam: true,
        student: true,
      },
    });
  }

  updateResult(id: string, data: Prisma.MonthlyExamResultUpdateInput) {
    return this.prisma.monthlyExamResult.update({
      where: { id },
      data,
      include: {
        student: { select: { id: true, fullName: true, phone: true } },
        exam: { select: { id: true, title: true, examDate: true, groupId: true, courseId: true } },
        createdBy: { select: { id: true, fullName: true, username: true } },
      },
    });
  }

  deleteResult(id: string) {
    return this.prisma.monthlyExamResult.delete({ where: { id } });
  }

  listResults(examId: string, user: { role: UserRole; branchId?: string | null }) {
    return this.prisma.monthlyExamResult.findMany({
      where: {
        examId,
        ...(user.role === UserRole.ADMIN && user.branchId
          ? { exam: { branchId: user.branchId } }
          : {}),
      },
      include: {
        student: { select: { id: true, fullName: true, phone: true } },
        createdBy: { select: { id: true, fullName: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async statistics(examId: string, user: { role: UserRole; branchId?: string | null }) {
    const rows = await this.prisma.monthlyExamResult.groupBy({
      by: ['result'],
      where: {
        examId,
        ...(user.role === UserRole.ADMIN && user.branchId ? { exam: { branchId: user.branchId } } : {}),
      },
      _count: { id: true },
    });

    const counts: Record<string, number> = {
      PASSED: 0,
      FAILED: 0,
      SKIPPED: 0,
      SENT_TO_RETAKE: 0,
      NOT_SUBMITTED: 0,
    };

    for (const row of rows) {
      counts[row.result] = row._count.id;
    }

    const total = counts.PASSED + counts.FAILED + counts.SKIPPED + counts.SENT_TO_RETAKE + counts.NOT_SUBMITTED;
    const pct = (value: number) => (total > 0 ? Number(((value / total) * 100).toFixed(2)) : 0);

    return {
      totalResults: total,
      passedCount: counts.PASSED,
      failedCount: counts.FAILED,
      skippedCount: counts.SKIPPED,
      sentToRetakeCount: counts.SENT_TO_RETAKE,
      notSubmittedCount: counts.NOT_SUBMITTED,
      passedPercent: pct(counts.PASSED),
      failedPercent: pct(counts.FAILED),
      skippedPercent: pct(counts.SKIPPED),
      sentToRetakePercent: pct(counts.SENT_TO_RETAKE),
      notSubmittedPercent: pct(counts.NOT_SUBMITTED),
    };
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
