import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { BranchAccessGuard } from '../../common/guards/branch-access.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';
import { FilterActionLogsDto } from './dto/filter-action-logs.dto';
import { FilterErrorLogsDto } from './dto/filter-error-logs.dto';
import { SystemLogsService } from './system-logs.service';

@ApiTags('System Logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, BranchAccessGuard)
@Roles(UserRole.SUPERADMIN)
@Controller('system-logs')
export class SystemLogsController {
  constructor(private readonly systemLogsService: SystemLogsService) {}

  @Get('actions')
  @ApiOperation({ summary: 'List action logs (superadmin only)' })
  listActionLogs(@Query() filter: FilterActionLogsDto, @CurrentUser() user: { role: UserRole }) {
    return this.systemLogsService.listActionLogs(filter, user);
  }

  @Get('actions/:id')
  @ApiOperation({ summary: 'Get action log by id (superadmin only)' })
  getActionLog(@Param('id', ParseUuidPipe) id: string, @CurrentUser() user: { role: UserRole }) {
    return this.systemLogsService.getActionLog(id, user);
  }

  @Get('errors')
  @ApiOperation({ summary: 'List error logs (superadmin only)' })
  listErrorLogs(@Query() filter: FilterErrorLogsDto, @CurrentUser() user: { role: UserRole }) {
    return this.systemLogsService.listErrorLogs(filter, user);
  }

  @Get('errors/:id')
  @ApiOperation({ summary: 'Get error log by id (superadmin only)' })
  getErrorLog(@Param('id', ParseUuidPipe) id: string, @CurrentUser() user: { role: UserRole }) {
    return this.systemLogsService.getErrorLog(id, user);
  }
}
