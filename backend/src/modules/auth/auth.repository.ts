import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  findUserByIdentifier(identifier: string) {
    return this.prisma.user.findFirst({
      where: {
        OR: [{ username: identifier }, { email: identifier }],
        deletedAt: null,
        status: { not: 'DELETED' },
      },
    });
  }

  findUserById(id: string) {
    return this.prisma.user.findFirst({
      where: { id, deletedAt: null, status: { not: 'DELETED' } },
    });
  }

  updateRefreshTokenHash(userId: string, refreshTokenHash: string | null) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash },
    });
  }

  updateLastLoginAt(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }

  updatePassword(userId: string, password: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        password,
        refreshTokenHash: null,
      },
    });
  }

  createActionLog(data: {
    userId?: string;
    role?: string;
    action: string;
    module: string;
    description: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return this.prisma.actionLog.create({
      data: {
        userId: data.userId,
        role: data.role as any,
        action: data.action,
        module: data.module,
        description: data.description,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });
  }
}
