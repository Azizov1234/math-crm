import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Status, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { FilterStudentDto } from './dto/filter-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { StudentsRepository } from './students.repository';

@Injectable()
export class StudentsService {
  constructor(
    private readonly studentsRepository: StudentsRepository,
    private readonly prisma: PrismaService,
  ) {}

  findAll(filter: FilterStudentDto, user: { role: UserRole; branchId?: string | null }) {
    if (filter.includeDeleted && user.role !== UserRole.SUPERADMIN) {
      throw new ForbiddenException('Only superadmin can include deleted students');
    }

    return this.studentsRepository.findAll(filter, user);
  }

  async findOne(id: string, user: { role: UserRole; branchId?: string | null }) {
    const student = await this.studentsRepository.findById(id);
    if (!student || student.deletedAt || student.status === Status.DELETED) {
      throw new NotFoundException('Student not found');
    }

    if (user.role === UserRole.ADMIN && user.branchId !== student.branchId) {
      throw new ForbiddenException('Admin can only access own branch students');
    }

    return student;
  }

  async create(dto: CreateStudentDto, user: { id: string; role: UserRole; branchId?: string | null }) {
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
      throw new ForbiddenException('Admin can only create student in own branch');
    }

    const nextStatus = dto.status ?? Status.ACTIVE;

    const duplicate = await this.studentsRepository.findDuplicateStudent({
      phone: dto.phone,
      fullName: dto.fullName,
      branchId: targetBranchId,
    });

    if (duplicate) {
      await this.studentsRepository.createActionLog({
        userId: user.id,
        role: user.role,
        action: 'DUPLICATE_STUDENT_ATTEMPT',
        module: 'STUDENTS',
        description: `Duplicate create attempt for phone ${dto.phone}`,
      });

      if (duplicate.status === Status.INACTIVE) {
        throw new ConflictException("Bu o‘quvchi allaqachon mavjud, hozir INACTIVE holatda. Uni qayta ACTIVE qiling.");
      }

      throw new ConflictException("Bu o‘quvchi allaqachon mavjud.");
    }

    const student = await this.prisma.$transaction(async (tx) => {
      const createdStudent = await tx.student.create({
        data: {
          branchId: targetBranchId,
          fullName: dto.fullName,
          phone: dto.phone,
          parentPhone: dto.parentPhone,
          birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
          status: nextStatus,
        },
        include: {
          branch: true,
        },
      });

      return createdStudent;
    });

    await this.studentsRepository.createActionLog({
      userId: user.id,
      role: user.role,
      action: 'STUDENT_CREATED',
      module: 'STUDENTS',
      description: `Student created ${student.id}`,
    });

    return student;
  }

  async update(id: string, dto: UpdateStudentDto, user: { id: string; role: UserRole; branchId?: string | null }) {
    const existingStudent = await this.findOne(id, user);

    if (user.role === UserRole.ADMIN && dto.branchId && dto.branchId !== user.branchId) {
      throw new ForbiddenException('Admin can only set own branch');
    }

    const updated = await this.studentsRepository.update(id, {
      ...(dto.branchId ? { branch: { connect: { id: dto.branchId } } } : {}),
      ...(dto.fullName !== undefined ? { fullName: dto.fullName } : {}),
      ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
      ...(dto.parentPhone !== undefined ? { parentPhone: dto.parentPhone } : {}),
      ...(dto.birthDate !== undefined ? { birthDate: dto.birthDate ? new Date(dto.birthDate) : null } : {}),
      ...(dto.status ? { status: dto.status } : {}),
      ...(dto.photoUrl !== undefined ? { photoUrl: dto.photoUrl } : {}),
    });

    await this.studentsRepository.createActionLog({
      userId: user.id,
      role: user.role,
      action: 'STUDENT_UPDATED',
      module: 'STUDENTS',
      description: `Student updated ${existingStudent.id}`,
    });

    return updated;
  }

  async remove(id: string, user: { id: string; role: UserRole; branchId?: string | null }) {
    await this.findOne(id, user);

    const removed = await this.studentsRepository.update(id, {
      status: Status.INACTIVE,
      deactivatedAt: new Date(),
    });

    await this.studentsRepository.createActionLog({
      userId: user.id,
      role: user.role,
      action: 'STUDENT_DEACTIVATED',
      module: 'STUDENTS',
      description: `Student deactivated ${id}`,
    });

    return removed;
  }

  async activate(id: string, user: { id: string; role: UserRole; branchId?: string | null }) {
    await this.findOne(id, user);

    const activated = await this.studentsRepository.update(id, {
      status: Status.ACTIVE,
      deactivatedAt: null,
    });

    await this.studentsRepository.createActionLog({
      userId: user.id,
      role: user.role,
      action: 'STUDENT_ACTIVATED',
      module: 'STUDENTS',
      description: `Student activated ${id}`,
    });

    return activated;
  }

  async uploadPhoto(
    id: string,
    file: Express.Multer.File,
    user: { id: string; role: UserRole; branchId?: string | null },
    appBaseUrl: string,
  ) {
    await this.findOne(id, user);
    const url = `${appBaseUrl.replace(/\/$/, '')}/uploads/images/${file.filename}`;

    await this.studentsRepository.createUploadedFile({
      ownerId: user.id,
      module: 'STUDENT_PHOTO',
      filename: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      url,
    });

    const updated = await this.studentsRepository.update(id, { photoUrl: url });

    await this.studentsRepository.createActionLog({
      userId: user.id,
      role: user.role,
      action: 'STUDENT_PHOTO_UPLOADED',
      module: 'UPLOADS',
      description: `Uploaded student photo for ${id}`,
    });

    return updated;
  }

  async getPayments(id: string, user: { role: UserRole; branchId?: string | null }) {
    await this.findOne(id, user);
    return this.studentsRepository.getPayments(id, user);
  }

  async getDebts(id: string, user: { role: UserRole; branchId?: string | null }) {
    await this.findOne(id, user);
    return this.studentsRepository.getDebts(id, user);
  }

  async getExamResults(id: string, user: { role: UserRole; branchId?: string | null }) {
    await this.findOne(id, user);
    return this.studentsRepository.getExamResults(id, user);
  }
}

