import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { buildPagination, toPaginatedResponse } from '../../common/utils/pagination.util';
import { PrismaService } from '../../prisma/prisma.service';
import { FilterActionLogsDto } from './dto/filter-action-logs.dto';
import { FilterErrorLogsDto } from './dto/filter-error-logs.dto';

@Injectable()
export class SystemLogsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listActionLogs(filter: FilterActionLogsDto) {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = filter;
    const { skip, take } = buildPagination(page, limit);

    const where: Prisma.ActionLogWhereInput = {
      ...(filter.action ? { action: { contains: filter.action, mode: 'insensitive' } } : {}),
      ...(filter.module ? { module: { contains: filter.module, mode: 'insensitive' } } : {}),
      ...(filter.userId ? { userId: filter.userId } : {}),
      ...((filter.fromDate || filter.toDate)
        ? {
            createdAt: {
              gte: filter.fromDate ? new Date(filter.fromDate) : undefined,
              lte: filter.toDate ? new Date(filter.toDate) : undefined,
            },
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.actionLog.findMany({
        where,
        include: {
          user: { select: { id: true, fullName: true, username: true, role: true } },
        },
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.actionLog.count({ where }),
    ]);

    return toPaginatedResponse(data, total, page, limit);
  }

  findActionLogById(id: string) {
    return this.prisma.actionLog.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, fullName: true, username: true, role: true } },
      },
    });
  }

  async listErrorLogs(filter: FilterErrorLogsDto) {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = filter;
    const { skip, take } = buildPagination(page, limit);

    const where: Prisma.ErrorLogWhereInput = {
      ...(filter.path ? { path: { contains: filter.path, mode: 'insensitive' } } : {}),
      ...(filter.method ? { method: { equals: filter.method.toUpperCase() } } : {}),
      ...(filter.statusCode ? { statusCode: filter.statusCode } : {}),
      ...((filter.fromDate || filter.toDate)
        ? {
            createdAt: {
              gte: filter.fromDate ? new Date(filter.fromDate) : undefined,
              lte: filter.toDate ? new Date(filter.toDate) : undefined,
            },
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.errorLog.findMany({
        where,
        include: {
          user: { select: { id: true, fullName: true, username: true, role: true } },
        },
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.errorLog.count({ where }),
    ]);

    return toPaginatedResponse(data, total, page, limit);
  }

  findErrorLogById(id: string) {
    return this.prisma.errorLog.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, fullName: true, username: true, role: true } },
      },
    });
  }
}
