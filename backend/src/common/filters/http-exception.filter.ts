import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  constructor(private readonly prisma: PrismaService) {}

  async catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request & { user?: { id?: string } }>();
    const response = ctx.getResponse<Response>();

    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const responseBody = exception instanceof HttpException ? exception.getResponse() : null;

    const message =
      typeof responseBody === 'string'
        ? responseBody
        : typeof responseBody === 'object' && responseBody !== null && 'message' in responseBody
          ? (responseBody as { message?: string | string[] }).message
          : 'Internal server error';

    const errorMessage = Array.isArray(message) ? message.join(', ') : (message ?? 'Internal server error');

    if (status >= 500) {
      this.logger.error(errorMessage, exception instanceof Error ? exception.stack : undefined);
    }

    await this.prisma.errorLog.create({
      data: {
        userId: request.user?.id ?? null,
        path: request.originalUrl,
        method: request.method,
        message: errorMessage,
        stack: exception instanceof Error ? exception.stack ?? null : null,
        statusCode: status,
      },
    }).catch(() => {
      this.logger.warn('Failed to persist error log');
    });

    response.status(status).json({
      statusCode: status,
      message: status >= 500 ? 'Internal server error' : errorMessage,
      timestamp: new Date().toISOString(),
      path: request.originalUrl,
    });
  }
}
