import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { diskStorage } from 'multer';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { BranchAccessGuard } from '../../common/guards/branch-access.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';
import { generateUniqueFileName, validateImageFile } from '../../common/utils/file-upload.util';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { FilterTeacherDto } from './dto/filter-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { TeachersService } from './teachers.service';

@ApiTags('Teachers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, BranchAccessGuard)
@Roles(UserRole.SUPERADMIN)
@Controller('teachers')
export class TeachersController {
  constructor(
    private readonly teachersService: TeachersService,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List teachers with pagination and filters' })
  findAll(@Query() filter: FilterTeacherDto, @CurrentUser() user: { role: UserRole; branchId?: string | null }) {
    return this.teachersService.findAll(filter, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get teacher by id' })
  findOne(@Param('id', ParseUuidPipe) id: string, @CurrentUser() user: { role: UserRole; branchId?: string | null }) {
    return this.teachersService.findOne(id, user);
  }

  @Post()
  @ApiOperation({ summary: 'Create teacher profile' })
  create(@Body() dto: CreateTeacherDto, @CurrentUser() user: { id: string; role: UserRole; branchId?: string | null }) {
    return this.teachersService.create(dto, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update teacher profile' })
  update(
    @Param('id', ParseUuidPipe) id: string,
    @Body() dto: UpdateTeacherDto,
    @CurrentUser() user: { id: string; role: UserRole; branchId?: string | null },
  ) {
    return this.teachersService.update(id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete teacher profile' })
  remove(@Param('id', ParseUuidPipe) id: string, @CurrentUser() user: { id: string; role: UserRole; branchId?: string | null }) {
    return this.teachersService.remove(id, user);
  }

  @Post(':id/photo')
  @ApiOperation({ summary: 'Upload teacher photo' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: 'uploads/images',
        filename: (_req, file, cb) => cb(null, generateUniqueFileName(file.originalname)),
      }),
    }),
  )
  uploadPhoto(
    @Param('id', ParseUuidPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: { id: string; role: UserRole; branchId?: string | null },
  ) {
    validateImageFile(file, this.configService.get<number>('upload.maxImageSize') ?? 2097152);
    return this.teachersService.uploadPhoto(id, file, user, this.configService.get<string>('app.baseUrl') ?? 'http://localhost:8000');
  }

  @Get(':id/groups')
  @ApiOperation({ summary: 'Get teacher groups' })
  getGroups(@Param('id', ParseUuidPipe) id: string, @CurrentUser() user: { role: UserRole; branchId?: string | null }) {
    return this.teachersService.getGroups(id, user);
  }

  @Get(':id/students')
  @ApiOperation({ summary: 'Get students of teacher groups' })
  getStudents(@Param('id', ParseUuidPipe) id: string, @CurrentUser() user: { role: UserRole; branchId?: string | null }) {
    return this.teachersService.getStudents(id, user);
  }
}
