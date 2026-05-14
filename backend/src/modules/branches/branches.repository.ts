import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { buildPagination, toPaginatedResponse } from '../../common/utils/pagination.util';
import { FilterBranchDto } from './dto/filter-branch.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class BranchesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filter: FilterBranchDto, user: { role: string; branchId?: string | null }) {
    const { page = 1, limit = 20, search, sortBy = 'createdAt', sortOrder = 'desc', status, includeDeleted } = filter;
    const { skip, take } = buildPagination(page, limit);

    const where: Prisma.BranchWhereInput = {
      ...(includeDeleted ? {} : { deletedAt: null }),
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { address: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(user.role === 'ADMIN' && user.branchId ? { id: user.branchId } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.branch.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.branch.count({ where }),
    ]);

    return toPaginatedResponse(data, total, page, limit);
  }

  findById(id: string) {
    return this.prisma.branch.findFirst({ where: { id, deletedAt: null } });
  }

  create(data: Prisma.BranchCreateInput) {
    return this.prisma.branch.create({ data });
  }

  countNonDeleted() {
    return this.prisma.branch.count({
      where: {
        deletedAt: null,
        status: { not: 'DELETED' },
      },
    });
  }

  countAll() {
    return this.prisma.branch.count();
  }

  update(id: string, data: Prisma.BranchUpdateInput) {
    return this.prisma.branch.update({ where: { id }, data });
  }
}
