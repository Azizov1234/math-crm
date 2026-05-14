import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { PrismaService } from './prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { cors: true });
  const configService = app.get(ConfigService);

  const uploadDir = configService.get<string>('upload.uploadDir') ?? 'uploads';
  const uploadImagesDir = join(process.cwd(), uploadDir, 'images');
  if (!existsSync(uploadImagesDir)) {
    mkdirSync(uploadImagesDir, { recursive: true });
  }

  app.useStaticAssets(join(process.cwd(), uploadDir), {
    prefix: '/uploads/',
  });

  app.useGlobalPipes( 
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(app.get(HttpExceptionFilter));

  const swaggerConfig = new DocumentBuilder()
    .setTitle('EduCore ERP & CRM API')
    .setDescription('Production-grade Education Center ERP + CRM backend API')
    .setVersion('1.0.0')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      in: 'header',
      name: 'Authorization',
    })
    .build();
    
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  const prisma = app.get(PrismaService);
  prisma.enableShutdownHooks(app);

  const port = configService.get<number>('app.port') ?? 8000;
  await app.listen(port);
}

bootstrap();
  