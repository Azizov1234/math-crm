import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { getDefaultBranch } from '../../common/utils/default-branch.util';
import { PrismaService } from '../../prisma/prisma.service';
import { BranchesRepository } from './branches.repository';
import { CreateBranchDto } from './dto/create-branch.dto';
import { FilterBranchDto } from './dto/filter-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';

@Injectable()
export class BranchesService {
  constructor(
    private readonly branchesRepository: BranchesRepository,
    private readonly prisma: PrismaService,
  ) {}

  findAll(filter: FilterBranchDto, user: { role: UserRole; branchId?: string | null }) {
    if (filter.includeDeleted && user.role !== UserRole.SUPERADMIN) {
      throw new ForbiddenException('Only superadmin can include deleted branches');
    }

    return this.branchesRepository.findAll(filter, user);
  }

  async findOne(id: string, user: { role: UserRole; branchId?: string | null }) {
    if (user.role === UserRole.ADMIN && user.branchId !== id) {
      throw new ForbiddenException('Admins can only view own branch');
    }

    const branch = await this.branchesRepository.findById(id);
    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    return branch;
  }

  async create(dto: CreateBranchDto, user: { role: UserRole }) {
    if (user.role !== UserRole.SUPERADMIN) {
      throw new ForbiddenException('Only superadmin can create branches');
    }

    const count = await this.branchesRepository.countAll();
    if (count > 0) {
      throw new ConflictException("Bu loyiha bitta o'quv markaz uchun. Yangi filial yaratib bo'lmaydi.");
    }

    return this.branchesRepository.create(dto);
  }

  async update(id: string, dto: UpdateBranchDto, user: { role: UserRole; branchId?: string | null }) {
    if (user.role !== UserRole.SUPERADMIN) {
      throw new ForbiddenException('Only superadmin can update branch');
    }

    await this.findOne(id, user);

    return this.branchesRepository.update(id, dto);
  }

  async remove(id: string, user: { role: UserRole }) {
    if (user.role !== UserRole.SUPERADMIN) {
      throw new ForbiddenException('Only superadmin can delete branches');
    }

    const branch = await this.branchesRepository.findById(id);
    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    const defaultBranch = await getDefaultBranch(this.prisma);
    if (defaultBranch.id === id) {
      throw new BadRequestException("Asosiy branchni o'chirib bo'lmaydi.");
    }

    return this.branchesRepository.update(id, {
      status: 'DELETED',
      deletedAt: new Date(),
    });
  }
}
