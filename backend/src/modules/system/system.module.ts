import { Module } from '@nestjs/common';
import { SystemController } from './system.controller';
import { SystemRepository } from './system.repository';
import { SystemService } from './system.service';

@Module({
  controllers: [SystemController],
  providers: [SystemService, SystemRepository],
})
export class SystemModule {}
