import { Injectable } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { buildPagination, toPaginatedResponse } from '../../common/utils/pagination.util';
import { FilterCourseDto } from './dto/filter-course.dto';

@Injectable()
export class CoursesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filter: FilterCourseDto, user: { role: UserRole; branchId?: string | null }) {
    const { page = 1, limit = 20, search, sortBy = 'createdAt', sortOrder = 'desc', status, includeDeleted } = filter;
    const { skip, take } = buildPagination(page, limit);

    const where: Prisma.CourseWhereInput = {
      ...(includeDeleted ? {} : { deletedAt: null, status: { not: 'DELETED' } }),
      ...(status ? { status } : {}),
      ...(user.role === UserRole.ADMIN && user.branchId ? { branchId: user.branchId } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.course.findMany({
        where,
        include: {
          branch: { select: { id: true, name: true } },
          _count: { select: { groups: true } },
        },
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.course.count({ where }),
    ]);

    return toPaginatedResponse(data, total, page, limit);
  }

  findById(id: string) {
    return this.prisma.course.findUnique({
      where: { id },
      include: { branch: true, _count: { select: { groups: true } } },
    });
  }

  create(data: Prisma.CourseCreateInput) {
    return this.prisma.course.create({ data, include: { branch: true, _count: { select: { groups: true } } } });
  }

  update(id: string, data: Prisma.CourseUpdateInput) {
    return this.prisma.course.update({ where: { id }, data, include: { branch: true, _count: { select: { groups: true } } } });
  }
}
