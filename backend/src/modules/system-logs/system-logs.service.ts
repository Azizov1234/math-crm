import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { FilterActionLogsDto } from './dto/filter-action-logs.dto';
import { FilterErrorLogsDto } from './dto/filter-error-logs.dto';
import { SystemLogsRepository } from './system-logs.repository';

@Injectable()
export class SystemLogsService {
  constructor(private readonly systemLogsRepository: SystemLogsRepository) {}

  private assertSuperadmin(user: { role: UserRole }) {
    if (user.role !== UserRole.SUPERADMIN) {
      throw new ForbiddenException('Only superadmin can access system logs');
    }
  }

  listActionLogs(filter: FilterActionLogsDto, user: { role: UserRole }) {
    this.assertSuperadmin(user);
    return this.systemLogsRepository.listActionLogs(filter);
  }

  async getActionLog(id: string, user: { role: UserRole }) {
    this.assertSuperadmin(user);
    const log = await this.systemLogsRepository.findActionLogById(id);
    if (!log) {
      throw new NotFoundException('Action log not found');
    }
    return log;
  }

  listErrorLogs(filter: FilterErrorLogsDto, user: { role: UserRole }) {
    this.assertSuperadmin(user);
    return this.systemLogsRepository.listErrorLogs(filter);
  }

  async getErrorLog(id: string, user: { role: UserRole }) {
    this.assertSuperadmin(user);
    const log = await this.systemLogsRepository.findErrorLogById(id);
    if (!log) {
      throw new NotFoundException('Error log not found');
    }
    return log;
  }
}
