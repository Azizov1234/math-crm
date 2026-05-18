import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { BranchAccessGuard } from '../../common/guards/branch-access.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, BranchAccessGuard)
@Roles(UserRole.SUPERADMIN)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Dashboard summary statistics' })
  summary(@CurrentUser() user: { role: UserRole; branchId?: string | null }) {
    return this.dashboardService.summary(user);
  }

  @Get('revenue-chart')
  @ApiOperation({ summary: 'Revenue chart data' })
  revenueChart(@CurrentUser() user: { role: UserRole; branchId?: string | null }) {
    return this.dashboardService.revenueChart(user);
  }

  @Get('payment-method-chart')
  @ApiOperation({ summary: 'Payment method chart data' })
  paymentMethodChart(@CurrentUser() user: { role: UserRole; branchId?: string | null }) {
    return this.dashboardService.paymentMethodChart(user);
  }

  @Get('debtors-chart')
  @ApiOperation({ summary: 'Debtors chart data' })
  debtorsChart(@CurrentUser() user: { role: UserRole; branchId?: string | null }) {
    return this.dashboardService.debtorsChart(user);
  }

  @Get('exam-result-chart')
  @ApiOperation({ summary: 'Exam result chart data' })
  examResultChart(@CurrentUser() user: { role: UserRole; branchId?: string | null }) {
    return this.dashboardService.examResultChart(user);
  }

  @Get('group-stats')
  @ApiOperation({ summary: 'Group statistics for dashboard table' })
  groupStats(@CurrentUser() user: { role: UserRole; branchId?: string | null }) {
    return this.dashboardService.groupStats(user);
  }
}
