import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SystemRepository {
  constructor(private readonly configService: ConfigService) {}

  settings() {
    return {
      appName: 'EduCore ERP & CRM Backend',
      port: this.configService.get<number>('app.port') ?? 8000,
      baseUrl: this.configService.get<string>('app.baseUrl') ?? 'http://localhost:8000',
      uploadDir: this.configService.get<string>('upload.uploadDir') ?? 'uploads',
      now: new Date().toISOString(),
    };
  }

  health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
