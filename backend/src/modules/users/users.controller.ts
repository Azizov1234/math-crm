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
import { OwnerOrSuperadminGuard } from '../../common/guards/owner-or-superadmin.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';
import { generateUniqueFileName, validateImageFile } from '../../common/utils/file-upload.util';
import { CreateUserDto } from './dto/create-user.dto';
import { FilterUserDto } from './dto/filter-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@ApiTags('Admins')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, BranchAccessGuard)
@Controller('admins')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {}

  @Roles(UserRole.SUPERADMIN)
  @Get()
  @ApiOperation({ summary: 'List admins with pagination and filters' })
  findAll(@Query() filter: FilterUserDto, @CurrentUser() user: { role: UserRole; branchId?: string | null }) {
    return this.usersService.findAll(filter, user);
  }

  @UseGuards(OwnerOrSuperadminGuard)
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  @Get(':id')
  @ApiOperation({ summary: 'Get admin by id' })
  findOne(
    @Param('id', ParseUuidPipe) id: string,
    @CurrentUser() user: { role: UserRole; id: string; branchId?: string | null },
  ) {
    return this.usersService.findOne(id, user);
  }

  @Roles(UserRole.SUPERADMIN)
  @Post()
  @ApiOperation({ summary: 'Create admin user' })
  create(@Body() dto: CreateUserDto, @CurrentUser() user: { id: string; role: UserRole; branchId?: string | null }) {
    return this.usersService.create(dto, user);
  }

  @UseGuards(OwnerOrSuperadminGuard)
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  @Patch(':id')
  @ApiOperation({ summary: 'Update admin by id' })
  update(
    @Param('id', ParseUuidPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: { id: string; role: UserRole; branchId?: string | null },
  ) {
    return this.usersService.update(id, dto, user);
  }

  @Roles(UserRole.SUPERADMIN)
  @Patch(':id/status')
  @ApiOperation({ summary: 'Update admin status' })
  updateStatus(
    @Param('id', ParseUuidPipe) id: string,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser() user: { id: string; role: UserRole; branchId?: string | null },
  ) {
    return this.usersService.updateStatus(id, dto, user);
  }

  @Roles(UserRole.SUPERADMIN)
  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete admin' })
  remove(@Param('id', ParseUuidPipe) id: string, @CurrentUser() user: { id: string; role: UserRole; branchId?: string | null }) {
    return this.usersService.remove(id, user);
  }

  @UseGuards(OwnerOrSuperadminGuard)
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  @Post(':id/photo')
  @ApiOperation({ summary: 'Upload admin profile photo' })
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
    const appBaseUrl = this.configService.get<string>('app.baseUrl') ?? 'http://localhost:8000';
    return this.usersService.uploadPhoto(id, file, user, appBaseUrl);
  }
}
