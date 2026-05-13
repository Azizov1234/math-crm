import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { BranchAccessGuard } from '../../common/guards/branch-access.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';
import { CreateExamResultDto } from './dto/create-exam-result.dto';
import { CreateMonthlyExamDto } from './dto/create-monthly-exam.dto';
import { FilterMonthlyExamDto } from './dto/filter-monthly-exam.dto';
import { UpdateExamResultDto } from './dto/update-exam-result.dto';
import { UpdateMonthlyExamDto } from './dto/update-monthly-exam.dto';
import { MonthlyExamsService } from './monthly-exams.service';

@ApiTags('Monthly Exams')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, BranchAccessGuard)
@Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
@Controller('monthly-exams')
export class MonthlyExamsController {
  constructor(private readonly monthlyExamsService: MonthlyExamsService) {}

  @Get()
  @ApiOperation({ summary: 'List monthly exams' })
  findAll(@Query() filter: FilterMonthlyExamDto, @CurrentUser() user: { role: UserRole; branchId?: string | null }) {
    return this.monthlyExamsService.findAll(filter, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get monthly exam by id' })
  findOne(@Param('id', ParseUuidPipe) id: string, @CurrentUser() user: { role: UserRole; branchId?: string | null }) {
    return this.monthlyExamsService.findOne(id, user);
  }

  @Post()
  @ApiOperation({ summary: 'Create monthly exam' })
  create(@Body() dto: CreateMonthlyExamDto, @CurrentUser() user: { id: string; role: UserRole; branchId?: string | null }) {
    return this.monthlyExamsService.create(dto, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update monthly exam' })
  update(
    @Param('id', ParseUuidPipe) id: string,
    @Body() dto: UpdateMonthlyExamDto,
    @CurrentUser() user: { id: string; role: UserRole; branchId?: string | null },
  ) {
    return this.monthlyExamsService.update(id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete monthly exam' })
  remove(@Param('id', ParseUuidPipe) id: string, @CurrentUser() user: { id: string; role: UserRole; branchId?: string | null }) {
    return this.monthlyExamsService.remove(id, user);
  }

  @Post(':id/results')
  @ApiOperation({ summary: 'Create monthly exam result' })
  createResult(
    @Param('id', ParseUuidPipe) id: string,
    @Body() dto: CreateExamResultDto,
    @CurrentUser() user: { id: string; role: UserRole; branchId?: string | null },
  ) {
    return this.monthlyExamsService.createResult(id, dto, user);
  }

  @Patch(':id/results/:resultId')
  @ApiOperation({ summary: 'Update monthly exam result' })
  updateResult(
    @Param('id', ParseUuidPipe) id: string,
    @Param('resultId', ParseUuidPipe) resultId: string,
    @Body() dto: UpdateExamResultDto,
    @CurrentUser() user: { id: string; role: UserRole; branchId?: string | null },
  ) {
    return this.monthlyExamsService.updateResult(id, resultId, dto, user);
  }

  @Delete(':id/results/:resultId')
  @ApiOperation({ summary: 'Delete monthly exam result' })
  deleteResult(
    @Param('id', ParseUuidPipe) id: string,
    @Param('resultId', ParseUuidPipe) resultId: string,
    @CurrentUser() user: { id: string; role: UserRole; branchId?: string | null },
  ) {
    return this.monthlyExamsService.deleteResult(id, resultId, user);
  }

  @Get(':id/results')
  @ApiOperation({ summary: 'List monthly exam results' })
  listResults(@Param('id', ParseUuidPipe) id: string, @CurrentUser() user: { role: UserRole; branchId?: string | null }) {
    return this.monthlyExamsService.listResults(id, user);
  }

  @Get(':id/statistics')
  @ApiOperation({ summary: 'Monthly exam result statistics' })
  statistics(@Param('id', ParseUuidPipe) id: string, @CurrentUser() user: { role: UserRole; branchId?: string | null }) {
    return this.monthlyExamsService.statistics(id, user);
  }
}
