import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { getDefaultBranch } from '../../common/utils/default-branch.util';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BranchesBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(BranchesBootstrapService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    const defaultBranch = await getDefaultBranch(this.prisma);
    this.logger.log(`Default branch is ready: ${defaultBranch.id}`);
  }
}
