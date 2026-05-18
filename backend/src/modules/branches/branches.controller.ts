import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { BranchAccessGuard } from '../../common/guards/branch-access.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';
import { BranchesService } from './branches.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { FilterBranchDto } from './dto/filter-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';

@ApiTags('Branches')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, BranchAccessGuard)
@Controller('branches')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Roles(UserRole.SUPERADMIN)
  @Get()
  @ApiOperation({ summary: 'List branches' })
  findAll(
    @Query() filter: FilterBranchDto,
    @CurrentUser() user: { role: UserRole; branchId?: string | null },
  ) {
    return this.branchesService.findAll(filter, user);
  }

  @Roles(UserRole.SUPERADMIN)
  @Get(':id')
  @ApiOperation({ summary: 'Get branch by id' })
  findOne(@Param('id', ParseUuidPipe) id: string, @CurrentUser() user: { role: UserRole; branchId?: string | null }) {
    return this.branchesService.findOne(id, user);
  }

  @Roles(UserRole.SUPERADMIN)
  @Post()
  @ApiOperation({ summary: 'Create branch' })
  create(@Body() dto: CreateBranchDto, @CurrentUser() user: { role: UserRole }) {
    return this.branchesService.create(dto, user);
  }

  @Roles(UserRole.SUPERADMIN)
  @Patch(':id')
  @ApiOperation({ summary: 'Update branch' })
  update(
    @Param('id', ParseUuidPipe) id: string,
    @Body() dto: UpdateBranchDto,
    @CurrentUser() user: { role: UserRole; branchId?: string | null },
  ) {
    return this.branchesService.update(id, dto, user);
  }

  @Roles(UserRole.SUPERADMIN)
  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete branch' })
  remove(@Param('id', ParseUuidPipe) id: string, @CurrentUser() user: { role: UserRole }) {
    return this.branchesService.remove(id, user);
  }
}
