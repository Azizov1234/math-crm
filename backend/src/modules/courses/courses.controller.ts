import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { BranchAccessGuard } from '../../common/guards/branch-access.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { FilterCourseDto } from './dto/filter-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';

@ApiTags('Courses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, BranchAccessGuard)
@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  @Get()
  @ApiOperation({ summary: 'List courses' })
  findAll(@Query() filter: FilterCourseDto, @CurrentUser() user: { role: UserRole; branchId?: string | null }) {
    return this.coursesService.findAll(filter, user);
  }

  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  @Get(':id')
  @ApiOperation({ summary: 'Get course by id' })
  findOne(@Param('id', ParseUuidPipe) id: string, @CurrentUser() user: { role: UserRole; branchId?: string | null }) {
    return this.coursesService.findOne(id, user);
  }

  @Roles(UserRole.SUPERADMIN)
  @Post()
  @ApiOperation({ summary: 'Create course' })
  create(@Body() dto: CreateCourseDto, @CurrentUser() user: { role: UserRole; branchId?: string | null }) {
    return this.coursesService.create(dto, user);
  }

  @Roles(UserRole.SUPERADMIN)
  @Patch(':id')
  @ApiOperation({ summary: 'Update course' })
  update(
    @Param('id', ParseUuidPipe) id: string,
    @Body() dto: UpdateCourseDto,
    @CurrentUser() user: { role: UserRole; branchId?: string | null },
  ) {
    return this.coursesService.update(id, dto, user);
  }

  @Roles(UserRole.SUPERADMIN)
  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete course' })
  remove(@Param('id', ParseUuidPipe) id: string, @CurrentUser() user: { role: UserRole; branchId?: string | null }) {
    return this.coursesService.remove(id, user);
  }
}
