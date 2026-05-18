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
import { CreateStudentDto } from './dto/create-student.dto';
import { FilterStudentDto } from './dto/filter-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { StudentsService } from './students.service';

@ApiTags('Students')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, BranchAccessGuard)
@Roles(UserRole.SUPERADMIN)
@Controller('students')
export class StudentsController {
  constructor(
    private readonly studentsService: StudentsService,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List students with pagination and filters' })
  findAll(
    @Query() filter: FilterStudentDto,
    @CurrentUser() user: { role: UserRole; branchId?: string | null },
  ) {
    return this.studentsService.findAll(filter, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get student by id' })
  findOne(
    @Param('id', ParseUuidPipe) id: string,
    @CurrentUser() user: { role: UserRole; branchId?: string | null },
  ) {
    return this.studentsService.findOne(id, user);
  }

  @Post()
  @ApiOperation({ summary: 'Create student' })
  create(@Body() dto: CreateStudentDto, @CurrentUser() user: { id: string; role: UserRole; branchId?: string | null }) {
    return this.studentsService.create(dto, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update student' })
  update(
    @Param('id', ParseUuidPipe) id: string,
    @Body() dto: UpdateStudentDto,
    @CurrentUser() user: { id: string; role: UserRole; branchId?: string | null },
  ) {
    return this.studentsService.update(id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete student' })
  remove(@Param('id', ParseUuidPipe) id: string, @CurrentUser() user: { id: string; role: UserRole; branchId?: string | null }) {
    return this.studentsService.remove(id, user);
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Activate inactive student' })
  activate(@Param('id', ParseUuidPipe) id: string, @CurrentUser() user: { id: string; role: UserRole; branchId?: string | null }) {
    return this.studentsService.activate(id, user);
  }

  @Post(':id/photo')
  @ApiOperation({ summary: 'Upload student photo' })
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
    return this.studentsService.uploadPhoto(id, file, user, this.configService.get<string>('app.baseUrl') ?? 'http://localhost:8000');
  }

  @Get(':id/payments')
  @ApiOperation({ summary: 'Get student payments' })
  payments(@Param('id', ParseUuidPipe) id: string, @CurrentUser() user: { role: UserRole; branchId?: string | null }) {
    return this.studentsService.getPayments(id, user);
  }

  @Get(':id/debts')
  @ApiOperation({ summary: 'Get student debts' })
  debts(@Param('id', ParseUuidPipe) id: string, @CurrentUser() user: { role: UserRole; branchId?: string | null }) {
    return this.studentsService.getDebts(id, user);
  }

  @Get(':id/exams')
  @ApiOperation({ summary: 'Get student monthly exam results' })
  exams(@Param('id', ParseUuidPipe) id: string, @CurrentUser() user: { role: UserRole; branchId?: string | null }) {
    return this.studentsService.getExamResults(id, user);
  }
}
