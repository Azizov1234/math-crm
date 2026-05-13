import { ForbiddenException, Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { SettingsRepository } from './settings.repository';

@Injectable()
export class SettingsService {
  constructor(private readonly settingsRepository: SettingsRepository) {}

  getSettings() {
    return this.settingsRepository.getOrCreateDefault();
  }

  async updateSettings(dto: UpdateSettingsDto, user: { id: string; role: UserRole }) {
    if (user.role !== UserRole.SUPERADMIN) {
      throw new ForbiddenException('Only superadmin can update settings');
    }

    const settings = await this.settingsRepository.getOrCreateDefault();
    const updated = await this.settingsRepository.update(settings.id, {
      ...(dto.academyName !== undefined ? { academyName: dto.academyName } : {}),
      ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
      ...(dto.address !== undefined ? { address: dto.address } : {}),
      ...(dto.description !== undefined ? { description: dto.description } : {}),
      updatedBy: { connect: { id: user.id } },
    });

    await this.settingsRepository.createActionLog({
      userId: user.id,
      role: user.role,
      action: 'SETTINGS_UPDATED',
      module: 'SETTINGS',
      description: 'System settings updated',
    });

    return updated;
  }

  async uploadLogo(file: Express.Multer.File, appBaseUrl: string, user: { id: string; role: UserRole }) {
    if (user.role !== UserRole.SUPERADMIN) {
      throw new ForbiddenException('Only superadmin can upload settings logo');
    }

    const settings = await this.settingsRepository.getOrCreateDefault();
    const logoUrl = `${appBaseUrl.replace(/\/$/, '')}/uploads/images/${file.filename}`;

    await this.settingsRepository.createUploadedFile({
      ownerId: user.id,
      module: 'SETTINGS_LOGO',
      filename: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      url: logoUrl,
    });

    const updated = await this.settingsRepository.update(settings.id, {
      logoUrl,
      updatedBy: { connect: { id: user.id } },
    });

    await this.settingsRepository.createActionLog({
      userId: user.id,
      role: user.role,
      action: 'SETTINGS_LOGO_UPLOADED',
      module: 'SETTINGS',
      description: 'Settings logo uploaded',
    });

    return updated;
  }
}
