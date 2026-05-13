import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Status, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { FilterCourseDto } from './dto/filter-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { CoursesRepository } from './courses.repository';

@Injectable()
export class CoursesService {
  constructor(
    private readonly coursesRepository: CoursesRepository,
    private readonly prisma: PrismaService,
  ) {}

  findAll(filter: FilterCourseDto, user: { role: UserRole; branchId?: string | null }) {
    if (filter.includeDeleted && user.role !== UserRole.SUPERADMIN) {
      throw new ForbiddenException('Only superadmin can include deleted courses');
    }

    return this.coursesRepository.findAll(filter, user);
  }

  async findOne(id: string, user: { role: UserRole; branchId?: string | null }) {
    const course = await this.coursesRepository.findById(id);
    if (!course || course.deletedAt || course.status === Status.DELETED) {
      throw new NotFoundException('Course not found');
    }

    if (user.role === UserRole.ADMIN && user.branchId !== course.branchId) {
      throw new ForbiddenException('Admin can only access own branch courses');
    }

    return course;
  }

  async create(dto: CreateCourseDto, user: { role: UserRole; branchId?: string | null }) {
    if (user.role !== UserRole.SUPERADMIN && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('You are not allowed to create course');
    }

    let targetBranchId = user.role === UserRole.ADMIN ? user.branchId : dto.branchId;
    if (!targetBranchId && user.role === UserRole.SUPERADMIN) {
      const defaultBranch = await this.prisma.branch.findFirst({
        where: { deletedAt: null, status: { not: Status.DELETED } },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      });
      targetBranchId = defaultBranch?.id;
    }

    if (!targetBranchId) {
      throw new BadRequestException('No active branch configured');
    }

    if (user.role === UserRole.ADMIN && dto.branchId && user.branchId !== dto.branchId) {
      throw new ForbiddenException('Admin can only create own branch courses');
    }

    return this.coursesRepository.create({
      branch: { connect: { id: targetBranchId } },
      name: dto.name,
      description: dto.description,
      monthlyPrice: dto.monthlyPrice,
      durationMonths: dto.durationMonths,
      status: dto.status ?? Status.ACTIVE,
    });
  }

  async update(id: string, dto: UpdateCourseDto, user: { role: UserRole; branchId?: string | null }) {
    await this.findOne(id, user);

    if (user.role === UserRole.ADMIN && dto.branchId && dto.branchId !== user.branchId) {
      throw new ForbiddenException('Admin can only set own branch');
    }

    return this.coursesRepository.update(id, {
      ...(dto.branchId ? { branch: { connect: { id: dto.branchId } } } : {}),
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.description !== undefined ? { description: dto.description } : {}),
      ...(dto.monthlyPrice !== undefined ? { monthlyPrice: dto.monthlyPrice } : {}),
      ...(dto.durationMonths !== undefined ? { durationMonths: dto.durationMonths } : {}),
      ...(dto.status ? { status: dto.status } : {}),
      ...(dto.status === Status.DELETED ? { deletedAt: new Date() } : {}),
    });
  }

  async remove(id: string, user: { role: UserRole; branchId?: string | null }) {
    await this.findOne(id, user);

    return this.coursesRepository.update(id, {
      status: Status.DELETED,
      deletedAt: new Date(),
    });
  }
}
