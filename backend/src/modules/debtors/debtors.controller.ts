import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { BranchAccessGuard } from '../../common/guards/branch-access.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';
import { DebtorsService } from './debtors.service';
import { FilterDebtorDto } from './dto/filter-debtor.dto';

@ApiTags('Debtors')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, BranchAccessGuard)
@Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
@Controller('debtors')
export class DebtorsController {
  constructor(private readonly debtorsService: DebtorsService) {}

  @Get()
  @ApiOperation({ summary: 'List debtors (student-level aggregated)' })
  list(@Query() filter: FilterDebtorDto, @CurrentUser() user: { role: UserRole; branchId?: string | null }) {
    return this.debtorsService.list(filter, user);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Debtors summary' })
  summary(@Query() filter: FilterDebtorDto, @CurrentUser() user: { role: UserRole; branchId?: string | null }) {
    return this.debtorsService.summary(filter, user);
  }

  @Get('by-group')
  @ApiOperation({ summary: 'Debtors grouped by group' })
  byGroup(@Query() filter: FilterDebtorDto, @CurrentUser() user: { role: UserRole; branchId?: string | null }) {
    return this.debtorsService.byGroup(filter, user);
  }

  @Get('student/:studentId/details')
  @ApiOperation({ summary: 'Get debtor details for drawer by student' })
  byStudentDetails(
    @Param('studentId', ParseUuidPipe) studentId: string,
    @CurrentUser() user: { role: UserRole; branchId?: string | null },
  ) {
    return this.debtorsService.byStudentDetails(studentId, user);
  }

  @Get('student/:studentId')
  @ApiOperation({ summary: 'Get debtor details by student (legacy alias)' })
  byStudent(
    @Param('studentId', ParseUuidPipe) studentId: string,
    @CurrentUser() user: { role: UserRole; branchId?: string | null },
  ) {
    return this.debtorsService.byStudentDetails(studentId, user);
  }
}

