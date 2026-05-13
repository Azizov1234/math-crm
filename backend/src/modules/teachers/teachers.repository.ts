import { Injectable } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { buildPagination, toPaginatedResponse } from '../../common/utils/pagination.util';
import { PRIMARY_GROUP_TEACHER_INCLUDE, withPrimaryTeacher } from '../../common/utils/group-teacher.util';
import { PrismaService } from '../../prisma/prisma.service';
import { FilterTeacherDto } from './dto/filter-teacher.dto';

@Injectable()
export class TeachersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filter: FilterTeacherDto, user: { role: UserRole; branchId?: string | null }) {
    const { page = 1, limit = 20, search, sortBy = 'createdAt', sortOrder = 'desc', status, includeDeleted, subject } = filter;
    const { skip, take } = buildPagination(page, limit);

    const where: Prisma.TeacherWhereInput = {
      ...(includeDeleted ? {} : { deletedAt: null, status: { not: 'DELETED' } }),
      ...(status ? { status } : {}),
      ...(subject ? { subject: { contains: subject, mode: 'insensitive' } } : {}),
      ...(user.role === UserRole.ADMIN && user.branchId ? { branchId: user.branchId } : {}),
      ...(search
        ? {
            OR: [
              { fullName: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search, mode: 'insensitive' } },
              { subject: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.teacher.findMany({
        where,
        include: {
          branch: { select: { id: true, name: true } },
          _count: {
            select: {
              groups: {
                where: {
                  group: {
                    deletedAt: null,
                    status: { not: 'DELETED' },
                  },
                },
              },
            },
          },
        },
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.teacher.count({ where }),
    ]);

    return toPaginatedResponse(data, total, page, limit);
  }

  findById(id: string) {
    return this.prisma.teacher.findUnique({
      where: { id },
      include: {
        branch: true,
        _count: {
          select: {
            groups: {
              where: {
                group: {
                  deletedAt: null,
                  status: { not: 'DELETED' },
                },
              },
            },
          },
        },
      },
    });
  }

  create(data: Prisma.TeacherCreateInput) {
    return this.prisma.teacher.create({ data, include: { branch: true } });
  }

  update(id: string, data: Prisma.TeacherUpdateInput) {
    return this.prisma.teacher.update({ where: { id }, data, include: { branch: true } });
  }

  findTeacherGroups(id: string, user: { role: UserRole; branchId?: string | null }) {
    return this.prisma.group
      .findMany({
        where: {
          teachers: { some: { teacherId: id } },
          deletedAt: null,
          status: { not: 'DELETED' },
          ...(user.role === UserRole.ADMIN && user.branchId ? { branchId: user.branchId } : {}),
        },
        include: {
          course: { select: { id: true, name: true } },
          ...PRIMARY_GROUP_TEACHER_INCLUDE,
          _count: { select: { students: true } },
        },
        orderBy: { createdAt: 'desc' },
      })
      .then((groups) => groups.map((group) => withPrimaryTeacher(group)));
  }

  findTeacherStudents(id: string, user: { role: UserRole; branchId?: string | null }) {
    return this.prisma.groupStudent.findMany({
      where: {
        status: 'ACTIVE',
        group: {
          teachers: { some: { teacherId: id } },
          deletedAt: null,
          status: { not: 'DELETED' },
          ...(user.role === UserRole.ADMIN && user.branchId ? { branchId: user.branchId } : {}),
        },
      },
      include: {
        student: true,
        group: { select: { id: true, name: true } },
      },
      orderBy: { joinedAt: 'desc' },
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
