import { Module } from '@nestjs/common';
import { MonthlyExamsController } from './monthly-exams.controller';
import { MonthlyExamsRepository } from './monthly-exams.repository';
import { MonthlyExamsService } from './monthly-exams.service';

@Module({
  controllers: [MonthlyExamsController],
  providers: [MonthlyExamsService, MonthlyExamsRepository],
  exports: [MonthlyExamsService, MonthlyExamsRepository],
})
export class MonthlyExamsModule {}
