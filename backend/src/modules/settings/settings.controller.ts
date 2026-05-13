import { Body, Controller, Get, Patch, Post, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { UserRole } from '@prisma/client';
import { diskStorage } from 'multer';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { BranchAccessGuard } from '../../common/guards/branch-access.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { generateUniqueFileName, validateImageFile } from '../../common/utils/file-upload.util';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { SettingsService } from './settings.service';

@ApiTags('Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, BranchAccessGuard)
@Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
@Controller('settings')
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get system settings' })
  getSettings() {
    return this.settingsService.getSettings();
  }

  @Patch()
  @Roles(UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Update system settings' })
  updateSettings(@Body() dto: UpdateSettingsDto, @CurrentUser() user: { id: string; role: UserRole }) {
    return this.settingsService.updateSettings(dto, user);
  }

  @Post('logo')
  @Roles(UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Upload academy logo' })
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
  uploadLogo(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: { id: string; role: UserRole },
    @Req() request: Request,
  ) {
    validateImageFile(file, this.configService.get<number>('upload.maxImageSize') ?? 2097152);
    const configuredBaseUrl = this.configService.get<string>('app.baseUrl') ?? 'http://localhost:8000';
    const forwardedProto = (request.headers['x-forwarded-proto'] as string | undefined)?.split(',')[0]?.trim();
    const forwardedHost = (request.headers['x-forwarded-host'] as string | undefined)?.split(',')[0]?.trim();
    const protocol = forwardedProto || request.protocol || 'http';
    const host = forwardedHost || request.get('host');
    const appBaseUrl = host ? `${protocol}://${host}` : configuredBaseUrl;
    return this.settingsService.uploadLogo(file, appBaseUrl, user);
  }
}
