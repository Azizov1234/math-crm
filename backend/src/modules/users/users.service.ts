import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Status, UserRole } from '@prisma/client';
import { hashPassword } from '../../common/utils/password.util';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { FilterUserDto } from './dto/filter-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  findAll(filter: FilterUserDto, currentUser: { role: UserRole; branchId?: string | null }) {
    if (currentUser.role !== UserRole.SUPERADMIN) {
      throw new ForbiddenException('Only superadmin can list admins');
    }

    if (filter.includeDeleted && currentUser.role !== UserRole.SUPERADMIN) {
      throw new ForbiddenException('Only superadmin can include deleted admins');
    }

    return this.usersRepository.findAll(filter, currentUser);
  }

  async findOne(id: string, currentUser: { role: UserRole; id: string; branchId?: string | null }) {
    const user = await this.usersRepository.findById(id);
    if (!user || user.deletedAt || user.status === Status.DELETED || user.role !== UserRole.ADMIN) {
      throw new NotFoundException('Admin not found');
    }

    if (currentUser.role === UserRole.ADMIN && currentUser.id !== user.id) {
      throw new ForbiddenException('Admin can only access own profile');
    }

    if (currentUser.role === UserRole.ADMIN && currentUser.branchId !== user.branchId) {
      throw new ForbiddenException('Admin can only access own branch profile');
    }

    return this.toSafeUser(user);
  }

  async create(dto: CreateUserDto, currentUser: { id: string; role: UserRole; branchId?: string | null }) {
    if (currentUser.role !== UserRole.SUPERADMIN) {
      throw new ForbiddenException('Only superadmin can create admin users');
    }

    const existing = await this.usersRepository.findByUsernameOrEmailOrPhone({
      username: dto.username,
      email: dto.email,
      phone: dto.phone,
    });

    if (existing) {
      throw new ConflictException('Username, email or phone already exists');
    }

    const saltRounds = this.configService.get<number>('app.bcryptSaltRounds') ?? 10;
    const password = await hashPassword(dto.password, saltRounds);

    let targetBranchId = dto.branchId;
    if (!targetBranchId) {
      const defaultBranch = await this.prisma.branch.findFirst({
        where: { deletedAt: null, status: { not: Status.DELETED } },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      });
      targetBranchId = defaultBranch?.id;
    }

    const user = await this.usersRepository.create({
      fullName: dto.fullName,
      username: dto.username,
      email: dto.email,
      phone: dto.phone,
      password,
      role: UserRole.ADMIN,
      status: dto.status ?? Status.ACTIVE,
      ...(targetBranchId ? { branch: { connect: { id: targetBranchId } } } : {}),
    });

    await this.usersRepository.createActionLog({
      userId: currentUser.id,
      role: currentUser.role,
      action: 'CREATE_ADMIN',
      module: 'ADMINS',
      description: `Created admin ${user.username}`,
    });

    return this.toSafeUser(user);
  }

  async update(id: string, dto: UpdateUserDto, currentUser: { id: string; role: UserRole; branchId?: string | null }) {
    const existing = await this.usersRepository.findById(id);
    if (!existing || existing.deletedAt || existing.status === Status.DELETED || existing.role !== UserRole.ADMIN) {
      throw new NotFoundException('Admin not found');
    }

    if (currentUser.role === UserRole.ADMIN && currentUser.id !== id) {
      throw new ForbiddenException('Admin can only update own profile');
    }

    if (currentUser.role === UserRole.ADMIN && currentUser.branchId !== existing.branchId) {
      throw new ForbiddenException('Admin can only update own branch profile');
    }

    if (currentUser.role === UserRole.ADMIN && (dto.branchId || dto.status)) {
      throw new ForbiddenException('Admin cannot change branch or status');
    }

    const duplicate = await this.usersRepository.findByUsernameOrEmailOrPhoneExceptId(id, {
      username: dto.username,
      email: dto.email,
      phone: dto.phone,
    });
    if (duplicate) {
      throw new ConflictException('Username, email or phone already exists');
    }

    const updateData: Record<string, any> = {
      ...(dto.fullName !== undefined ? { fullName: dto.fullName } : {}),
      ...(dto.username !== undefined ? { username: dto.username } : {}),
      ...(dto.email !== undefined ? { email: dto.email } : {}),
      ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
    };

    if (dto.password) {
      const saltRounds = this.configService.get<number>('app.bcryptSaltRounds') ?? 10;
      updateData.password = await hashPassword(dto.password, saltRounds);
    }

    if (dto.branchId && currentUser.role === UserRole.SUPERADMIN) {
      updateData.branch = { connect: { id: dto.branchId } };
    }

    const user = await this.usersRepository.update(id, updateData);

    await this.usersRepository.createActionLog({
      userId: currentUser.id,
      role: currentUser.role,
      action: 'UPDATE_ADMIN',
      module: 'ADMINS',
      description: `Updated admin ${existing.username}`,
    });

    return this.toSafeUser(user);
  }

  async updateStatus(id: string, dto: UpdateUserStatusDto, currentUser: { id: string; role: UserRole; branchId?: string | null }) {
    if (currentUser.role !== UserRole.SUPERADMIN) {
      throw new ForbiddenException('Only superadmin can update admin status');
    }

    const existing = await this.usersRepository.findById(id);
    if (!existing || existing.deletedAt || existing.role !== UserRole.ADMIN) {
      throw new NotFoundException('Admin not found');
    }

    const user = await this.usersRepository.update(id, {
      status: dto.status,
      ...(dto.status === Status.DELETED ? { deletedAt: new Date() } : {}),
    });

    await this.usersRepository.createActionLog({
      userId: currentUser.id,
      role: currentUser.role,
      action: 'UPDATE_ADMIN_STATUS',
      module: 'ADMINS',
      description: `Updated admin status ${existing.username} -> ${dto.status}`,
    });

    return this.toSafeUser(user);
  }

  async remove(id: string, currentUser: { id: string; role: UserRole; branchId?: string | null }) {
    if (currentUser.role !== UserRole.SUPERADMIN) {
      throw new ForbiddenException('Only superadmin can delete admins');
    }

    const existing = await this.usersRepository.findById(id);
    if (!existing || existing.deletedAt || existing.status === Status.DELETED || existing.role !== UserRole.ADMIN) {
      throw new NotFoundException('Admin not found');
    }

    const user = await this.usersRepository.update(id, {
      status: Status.DELETED,
      deletedAt: new Date(),
    });

    await this.usersRepository.createActionLog({
      userId: currentUser.id,
      role: currentUser.role,
      action: 'DELETE_ADMIN',
      module: 'ADMINS',
      description: `Soft deleted admin ${existing.username}`,
    });

    return this.toSafeUser(user);
  }

  async uploadPhoto(
    id: string,
    file: Express.Multer.File,
    currentUser: { id: string; role: UserRole; branchId?: string | null },
    appBaseUrl: string,
  ) {
    const user = await this.usersRepository.findById(id);
    if (!user || user.deletedAt || user.status === Status.DELETED || user.role !== UserRole.ADMIN) {
      throw new NotFoundException('Admin not found');
    }

    if (currentUser.role === UserRole.ADMIN && currentUser.id !== id) {
      throw new ForbiddenException('Admin can only upload own photo');
    }

    const filename = file.filename;
    const relativePath = `images/${filename}`;
    const url = `${appBaseUrl.replace(/\/$/, '')}/uploads/${relativePath}`;

    await this.usersRepository.createUploadedFile({
      ownerId: currentUser.id,
      module: 'ADMIN_PHOTO',
      filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      url,
    });

    const updated = await this.usersRepository.update(id, { photoUrl: url });

    await this.usersRepository.createActionLog({
      userId: currentUser.id,
      role: currentUser.role,
      action: 'UPLOAD_ADMIN_PHOTO',
      module: 'UPLOADS',
      description: `Uploaded admin photo for ${id}`,
    });

    return this.toSafeUser(updated);
  }

  private toSafeUser(user: any) {
    return {
      id: user.id,
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      branchId: user.branchId,
      photoUrl: user.photoUrl,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt,
    };
  }
}


