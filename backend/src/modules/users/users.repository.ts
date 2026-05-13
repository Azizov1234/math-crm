import { Injectable } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { buildPagination, toPaginatedResponse } from '../../common/utils/pagination.util';
import { FilterUserDto } from './dto/filter-user.dto';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filter: FilterUserDto, currentUser: { role: UserRole; branchId?: string | null }) {
    const { page = 1, limit = 20, search, sortBy = 'createdAt', sortOrder = 'desc', status, includeDeleted } = filter;
    const { skip, take } = buildPagination(page, limit);

    const where: Prisma.UserWhereInput = {
      role: UserRole.ADMIN,
      ...(includeDeleted ? {} : { deletedAt: null, status: { not: 'DELETED' } }),
      ...(status ? { status } : {}),
      ...(currentUser.role === UserRole.ADMIN && currentUser.branchId ? { branchId: currentUser.branchId } : {}),
      ...(search
        ? {
            OR: [
              { fullName: { contains: search, mode: 'insensitive' } },
              { username: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          fullName: true,
          username: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          photoUrl: true,
          branchId: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return toPaginatedResponse(data, total, page, limit);
  }

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findByUsernameOrEmailOrPhone(data: { username?: string; email?: string; phone?: string }) {
    const conditions: Prisma.UserWhereInput[] = [];
    if (data.username) conditions.push({ username: data.username });
    if (data.email) conditions.push({ email: data.email });
    if (data.phone) conditions.push({ phone: data.phone });

    if (conditions.length === 0) {
      return Promise.resolve(null);
    }

    return this.prisma.user.findFirst({
      where: {
        OR: conditions,
      },
    });
  }

  findByUsernameOrEmailOrPhoneExceptId(id: string, data: { username?: string; email?: string; phone?: string }) {
    const conditions: Prisma.UserWhereInput[] = [];
    if (data.username) conditions.push({ username: data.username });
    if (data.email) conditions.push({ email: data.email });
    if (data.phone) conditions.push({ phone: data.phone });

    if (conditions.length === 0) {
      return Promise.resolve(null);
    }

    return this.prisma.user.findFirst({
      where: {
        id: { not: id },
        OR: conditions,
      },
    });
  }

  create(data: Prisma.UserCreateInput) {
    return this.prisma.user.create({ data });
  }

  update(id: string, data: Prisma.UserUpdateInput) {
    return this.prisma.user.update({ where: { id }, data });
  }

  createActionLog(data: {
    userId?: string;
    role?: UserRole;
    action: string;
    module: string;
    description: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return this.prisma.actionLog.create({
      data: {
        userId: data.userId,
        role: data.role,
        action: data.action,
        module: data.module,
        description: data.description,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });
  }

  createUploadedFile(data: Prisma.UploadedFileCreateInput) {
    return this.prisma.uploadedFile.create({ data });
  }
}
