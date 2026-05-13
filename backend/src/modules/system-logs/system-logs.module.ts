import { Module } from '@nestjs/common';
import { SystemLogsController } from './system-logs.controller';
import { SystemLogsRepository } from './system-logs.repository';
import { SystemLogsService } from './system-logs.service';

@Module({
  controllers: [SystemLogsController],
  providers: [SystemLogsService, SystemLogsRepository],
  exports: [SystemLogsService],
})
export class SystemLogsModule {}
