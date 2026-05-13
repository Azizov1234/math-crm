import { Injectable } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { buildPagination, toPaginatedResponse } from '../../common/utils/pagination.util';
import { PrismaService } from '../../prisma/prisma.service';
import { FilterExamResultDto } from './dto/filter-exam-result.dto';

@Injectable()
export class ExamResultsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filter: FilterExamResultDto, user: { role: UserRole; branchId?: string | null }) {
    const { page = 1, limit = 20, search, sortBy = 'createdAt', sortOrder = 'desc' } = filter;
    const { skip, take } = buildPagination(page, limit);

    const examWhere: Prisma.MonthlyExamWhereInput = {
      ...(filter.groupId ? { groupId: filter.groupId } : {}),
      ...(filter.courseId ? { courseId: filter.courseId } : {}),
      ...(user.role === UserRole.ADMIN && user.branchId ? { branchId: user.branchId } : {}),
    };

    const where: Prisma.MonthlyExamResultWhereInput = {
      ...(filter.examId ? { examId: filter.examId } : {}),
      ...(filter.result ? { result: filter.result } : {}),
      ...(Object.keys(examWhere).length > 0 ? { exam: examWhere } : {}),
      ...((filter.fromDate || filter.toDate)
        ? {
            createdAt: {
              gte: filter.fromDate ? new Date(filter.fromDate) : undefined,
              lte: filter.toDate ? new Date(filter.toDate) : undefined,
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { student: { fullName: { contains: search, mode: 'insensitive' } } },
              { student: { phone: { contains: search, mode: 'insensitive' } } },
              { exam: { title: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.monthlyExamResult.findMany({
        where,
        include: {
          student: { select: { id: true, fullName: true, phone: true } },
          exam: {
            select: {
              id: true,
              title: true,
              examDate: true,
              group: { select: { id: true, name: true } },
              course: { select: { id: true, name: true } },
              branch: { select: { id: true, name: true } },
            },
          },
          createdBy: { select: { id: true, fullName: true, username: true } },
        },
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.monthlyExamResult.count({ where }),
    ]);

    return toPaginatedResponse(data, total, page, limit);
  }

  findById(id: string) {
    return this.prisma.monthlyExamResult.findUnique({
      where: { id },
      include: {
        student: { select: { id: true, fullName: true, phone: true } },
        exam: {
          include: {
            group: { select: { id: true, name: true } },
            course: { select: { id: true, name: true } },
            branch: { select: { id: true, name: true } },
          },
        },
        createdBy: { select: { id: true, fullName: true, username: true } },
      },
    });
  }
}
