import { Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { DebtorsRepository } from './debtors.repository';
import { FilterDebtorDto } from './dto/filter-debtor.dto';

@Injectable()
export class DebtorsService {
  constructor(private readonly debtorsRepository: DebtorsRepository) {}

  list(filter: FilterDebtorDto, user: { role: UserRole; branchId?: string | null }) {
    return this.debtorsRepository.list(filter, user);
  }

  summary(filter: FilterDebtorDto, user: { role: UserRole; branchId?: string | null }) {
    return this.debtorsRepository.summary(filter, user);
  }

  byGroup(filter: FilterDebtorDto, user: { role: UserRole; branchId?: string | null }) {
    return this.debtorsRepository.byGroup(filter, user);
  }

  byStudentDetails(studentId: string, user: { role: UserRole; branchId?: string | null }) {
    return this.debtorsRepository.byStudentDetails(studentId, user);
  }
}

