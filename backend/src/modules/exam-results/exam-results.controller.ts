import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { BranchAccessGuard } from '../../common/guards/branch-access.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';
import { FilterExamResultDto } from './dto/filter-exam-result.dto';
import { ExamResultsService } from './exam-results.service';

@ApiTags('Exam Results')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, BranchAccessGuard)
@Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
@Controller('exam-results')
export class ExamResultsController {
  constructor(private readonly examResultsService: ExamResultsService) {}

  @Get()
  @ApiOperation({ summary: 'List monthly exam results' })
  findAll(@Query() filter: FilterExamResultDto, @CurrentUser() user: { role: UserRole; branchId?: string | null }) {
    return this.examResultsService.findAll(filter, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get exam result by id' })
  findOne(@Param('id', ParseUuidPipe) id: string, @CurrentUser() user: { role: UserRole; branchId?: string | null }) {
    return this.examResultsService.findOne(id, user);
  }
}
