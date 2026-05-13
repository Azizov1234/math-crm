import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { FilterExamResultDto } from './dto/filter-exam-result.dto';
import { ExamResultsRepository } from './exam-results.repository';

@Injectable()
export class ExamResultsService {
  constructor(private readonly examResultsRepository: ExamResultsRepository) {}

  findAll(filter: FilterExamResultDto, user: { role: UserRole; branchId?: string | null }) {
    return this.examResultsRepository.findAll(filter, user);
  }

  async findOne(id: string, user: { role: UserRole; branchId?: string | null }) {
    const result = await this.examResultsRepository.findById(id);
    if (!result) {
      throw new NotFoundException('Exam result not found');
    }

    if (user.role === UserRole.ADMIN && user.branchId !== result.exam.branchId) {
      throw new ForbiddenException('Admin can only access own branch exam results');
    }

    return result;
  }
}
