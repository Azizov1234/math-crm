import { Module } from '@nestjs/common';
import { ExamResultsController } from './exam-results.controller';
import { ExamResultsRepository } from './exam-results.repository';
import { ExamResultsService } from './exam-results.service';

@Module({
  controllers: [ExamResultsController],
  providers: [ExamResultsService, ExamResultsRepository],
  exports: [ExamResultsService],
})
export class ExamResultsModule {}
