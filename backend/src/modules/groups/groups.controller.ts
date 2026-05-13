import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { BranchAccessGuard } from '../../common/guards/branch-access.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';
import { AddStudentToGroupDto } from './dto/add-student-to-group.dto';
import { CreateGroupDto } from './dto/create-group.dto';
import { FilterGroupDto } from './dto/filter-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { UpdateStudentGroupBillingDto } from './dto/update-student-group-billing.dto';
import { GroupsService } from './groups.service';

@ApiTags('Groups')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, BranchAccessGuard)
@Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Get()
  @ApiOperation({ summary: 'List groups' })
  findAll(@Query() filter: FilterGroupDto, @CurrentUser() user: { role: UserRole; branchId?: string | null }) {
    return this.groupsService.findAll(filter, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get group by id' })
  findOne(@Param('id', ParseUuidPipe) id: string, @CurrentUser() user: { role: UserRole; branchId?: string | null }) {
    return this.groupsService.findOne(id, user);
  }

  @Post()
  @ApiOperation({ summary: 'Create group' })
  create(@Body() dto: CreateGroupDto, @CurrentUser() user: { role: UserRole; branchId?: string | null }) {
    return this.groupsService.create(dto, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update group' })
  update(
    @Param('id', ParseUuidPipe) id: string,
    @Body() dto: UpdateGroupDto,
    @CurrentUser() user: { role: UserRole; branchId?: string | null },
  ) {
    return this.groupsService.update(id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete group' })
  remove(@Param('id', ParseUuidPipe) id: string, @CurrentUser() user: { role: UserRole; branchId?: string | null }) {
    return this.groupsService.remove(id, user);
  }

  @Post(':id/students')
  @ApiOperation({ summary: 'Add student to group' })
  addStudent(
    @Param('id', ParseUuidPipe) id: string,
    @Body() dto: AddStudentToGroupDto,
    @CurrentUser() user: { role: UserRole; branchId?: string | null },
  ) {
    return this.groupsService.addStudent(id, dto, user);
  }

  @Patch(':id/students/:studentId/billing')
  @ApiOperation({ summary: 'Update student billing in group' })
  updateStudentBilling(
    @Param('id', ParseUuidPipe) id: string,
    @Param('studentId', ParseUuidPipe) studentId: string,
    @Body() dto: UpdateStudentGroupBillingDto,
    @CurrentUser() user: { id?: string; role: UserRole; branchId?: string | null },
  ) {
    return this.groupsService.updateStudentBilling(id, studentId, dto, user);
  }

  @Delete(':id/students/:studentId')
  @ApiOperation({ summary: 'Remove student from group' })
  removeStudent(
    @Param('id', ParseUuidPipe) id: string,
    @Param('studentId', ParseUuidPipe) studentId: string,
    @CurrentUser() user: { role: UserRole; branchId?: string | null },
  ) {
    return this.groupsService.removeStudent(id, studentId, user);
  }

  @Get(':id/students')
  @ApiOperation({ summary: 'List group students' })
  listStudents(@Param('id', ParseUuidPipe) id: string, @CurrentUser() user: { role: UserRole; branchId?: string | null }) {
    return this.groupsService.listStudents(id, user);
  }

  @Get(':id/payments')
  @ApiOperation({ summary: 'List group payments' })
  listPayments(@Param('id', ParseUuidPipe) id: string, @CurrentUser() user: { role: UserRole; branchId?: string | null }) {
    return this.groupsService.listPayments(id, user);
  }

  @Get(':id/debtors')
  @ApiOperation({ summary: 'List group debtors' })
  listDebtors(@Param('id', ParseUuidPipe) id: string, @CurrentUser() user: { role: UserRole; branchId?: string | null }) {
    return this.groupsService.listDebtors(id, user);
  }

  @Get(':id/exams')
  @ApiOperation({ summary: 'List group monthly exams' })
  listExams(@Param('id', ParseUuidPipe) id: string, @CurrentUser() user: { role: UserRole; branchId?: string | null }) {
    return this.groupsService.listExams(id, user);
  }
}
