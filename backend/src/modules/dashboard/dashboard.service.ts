import { Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { DashboardRepository } from './dashboard.repository';

@Injectable()
export class DashboardService {
  constructor(private readonly dashboardRepository: DashboardRepository) {}

  summary(user: { role: UserRole; branchId?: string | null }) {
    return this.dashboardRepository.summary(user);
  }

  revenueChart(user: { role: UserRole; branchId?: string | null }) {
    return this.dashboardRepository.revenueChart(user);
  }

  paymentMethodChart(user: { role: UserRole; branchId?: string | null }) {
    return this.dashboardRepository.paymentMethodChart(user);
  }

  debtorsChart(user: { role: UserRole; branchId?: string | null }) {
    return this.dashboardRepository.debtorsChart(user);
  }

  examResultChart(user: { role: UserRole; branchId?: string | null }) {
    return this.dashboardRepository.examResultChart(user);
  }

  groupStats(user: { role: UserRole; branchId?: string | null }) {
    return this.dashboardRepository.groupStats(user);
  }
}
