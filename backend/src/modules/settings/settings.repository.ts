import { Injectable } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreateDefault() {
    const existing = await this.prisma.systemSettings.findFirst({ orderBy: { createdAt: 'asc' } });
    if (existing) {
      return existing;
    }

    return this.prisma.systemSettings.create({
      data: {
        academyName: 'Academy CRM',
      },
    });
  }

  update(id: string, data: Prisma.SystemSettingsUpdateInput) {
    return this.prisma.systemSettings.update({ where: { id }, data });
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
