import { Module } from '@nestjs/common';
import { BranchesBootstrapService } from './branches.bootstrap.service';
import { BranchesController } from './branches.controller';
import { BranchesRepository } from './branches.repository';
import { BranchesService } from './branches.service';

@Module({
  controllers: [BranchesController],
  providers: [BranchesService, BranchesRepository, BranchesBootstrapService],
  exports: [BranchesService],
})
export class BranchesModule {}
