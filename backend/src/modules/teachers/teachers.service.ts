import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Status, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { FilterTeacherDto } from './dto/filter-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { TeachersRepository } from './teachers.repository';

@Injectable()
export class TeachersService {
  constructor(
    private readonly teachersRepository: TeachersRepository,
    private readonly prisma: PrismaService,
  ) {}

  findAll(filter: FilterTeacherDto, user: { role: UserRole; branchId?: string | null }) {
    if (filter.includeDeleted && user.role !== UserRole.SUPERADMIN) {
      throw new ForbiddenException('Only superadmin can include deleted teachers');
    }

    return this.teachersRepository.findAll(filter, user);
  }

  async findOne(id: string, user: { role: UserRole; branchId?: string | null }) {
    const teacher = await this.teachersRepository.findById(id);
    if (!teacher || teacher.deletedAt || teacher.status === Status.DELETED) {
      throw new NotFoundException('Teacher not found');
    }

    if (user.role === UserRole.ADMIN && user.branchId !== teacher.branchId) {
      throw new ForbiddenException('Admin can only access own branch teachers');
    }

    return teacher;
  }

  async create(dto: CreateTeacherDto, user: { id: string; role: UserRole; branchId?: string | null }) {
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
      throw new ForbiddenException('Admin can only create teacher in own branch');
    }

    const groupIds = Array.from(new Set(dto.groupIds ?? []));
    if (groupIds.length > 0) {
      const groups = await this.prisma.group.findMany({
        where: {
          id: { in: groupIds },
          deletedAt: null,
          status: Status.ACTIVE,
        },
        select: {
          id: true,
          branchId: true,
        },
      });

      if (groups.length !== groupIds.length) {
        throw new BadRequestException('One or more groups are not active or not found');
      }

      const invalidGroup = groups.find((group) => group.branchId !== targetBranchId);
      if (invalidGroup) {
        throw new BadRequestException('All selected groups must belong to the teacher branch');
      }
    }

    const teacher = await this.teachersRepository.create({
      branch: { connect: { id: targetBranchId } },
      fullName: dto.fullName,
      phone: dto.phone,
      subject: dto.subject,
      salary: dto.salary,
      status: dto.status ?? Status.ACTIVE,
    });

    if (groupIds.length > 0) {
      await this.prisma.groupTeacher.createMany({
        data: groupIds.map((groupId) => ({
          groupId,
          teacherId: teacher.id,
        })),
        skipDuplicates: true,
      });
    }

    await this.teachersRepository.createActionLog({
      userId: user.id,
      role: user.role,
      action: 'CREATE_TEACHER',
      module: 'TEACHERS',
      description: `Created teacher ${teacher.id}`,
    });

    return teacher;
  }

  async update(id: string, dto: UpdateTeacherDto, user: { id: string; role: UserRole; branchId?: string | null }) {
    await this.findOne(id, user);

    if (user.role === UserRole.ADMIN && dto.branchId && dto.branchId !== user.branchId) {
      throw new ForbiddenException('Admin can only set own branch');
    }

    const updated = await this.teachersRepository.update(id, {
      ...(dto.branchId ? { branch: { connect: { id: dto.branchId } } } : {}),
      ...(dto.fullName !== undefined ? { fullName: dto.fullName } : {}),
      ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
      ...(dto.subject !== undefined ? { subject: dto.subject } : {}),
      ...(dto.salary !== undefined ? { salary: dto.salary } : {}),
      ...(dto.status ? { status: dto.status } : {}),
      ...(dto.status === Status.DELETED ? { deletedAt: new Date() } : {}),
      ...(dto.photoUrl !== undefined ? { photoUrl: dto.photoUrl } : {}),
    });

    await this.teachersRepository.createActionLog({
      userId: user.id,
      role: user.role,
      action: 'UPDATE_TEACHER',
      module: 'TEACHERS',
      description: `Updated teacher ${id}`,
    });

    return updated;
  }

  async remove(id: string, user: { id: string; role: UserRole; branchId?: string | null }) {
    await this.findOne(id, user);

    const removed = await this.teachersRepository.update(id, {
      status: Status.DELETED,
      deletedAt: new Date(),
    });

    await this.teachersRepository.createActionLog({
      userId: user.id,
      role: user.role,
      action: 'DELETE_TEACHER',
      module: 'TEACHERS',
      description: `Soft deleted teacher ${id}`,
    });

    return removed;
  }

  async uploadPhoto(
    id: string,
    file: Express.Multer.File,
    user: { id: string; role: UserRole; branchId?: string | null },
    appBaseUrl: string,
  ) {
    await this.findOne(id, user);

    const url = `${appBaseUrl.replace(/\/$/, '')}/uploads/images/${file.filename}`;

    await this.teachersRepository.createUploadedFile({
      ownerId: user.id,
      module: 'TEACHER_PHOTO',
      filename: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      url,
    });

    const updated = await this.teachersRepository.update(id, { photoUrl: url });

    await this.teachersRepository.createActionLog({
      userId: user.id,
      role: user.role,
      action: 'UPLOAD_TEACHER_PHOTO',
      module: 'UPLOADS',
      description: `Uploaded teacher photo for ${id}`,
    });

    return updated;
  }

  getGroups(id: string, user: { role: UserRole; branchId?: string | null }) {
    return this.findOne(id, user).then(() => this.teachersRepository.findTeacherGroups(id, user));
  }

  getStudents(id: string, user: { role: UserRole; branchId?: string | null }) {
    return this.findOne(id, user).then(() => this.teachersRepository.findTeacherStudents(id, user));
  }
}
