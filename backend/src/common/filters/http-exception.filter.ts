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
  private readonly directMessageMap: Record<string, string> = {
    'Internal server error': 'Serverda kutilmagan xatolik yuz berdi.',
    'Forbidden resource': "Ushbu amalni bajarishga ruxsat yo'q.",
    'Validation failed': "Yuborilgan ma'lumotlarda xatolik bor.",
    'Payment not found': "To'lov topilmadi.",
    'Group not found': 'Guruh topilmadi.',
    'Teacher not found': "O'qituvchi topilmadi.",
    'Monthly exam not found': "Oylik imtihon topilmadi.",
    'Exam result not found': 'Imtihon natijasi topilmadi.',
    'Course is not active or not found': 'Kurs faol emas yoki topilmadi.',
    'Group must be ACTIVE': "Guruh faol bo'lishi kerak.",
    'Student must be ACTIVE': "O'quvchi faol bo'lishi kerak.",
    'Student must belong to the group': "O'quvchi tanlangan guruhga a'zo bo'lishi kerak.",
    'Student and Group branch mismatch': "O'quvchi va guruh branchlari mos emas.",
    'billingType is required': "To'lov turi (billingType) majburiy.",
    'Student billing not found for this group': "Ushbu guruh bo'yicha o'quvchi billing ma'lumoti topilmadi.",
    'Active group membership not found': "Ushbu guruh uchun faol a'zolik topilmadi.",
    'Student already active in this group': "Bu o'quvchi ushbu guruhda allaqachon faol.",
    'Amount must be greater than 0': "To'lov summasi 0 dan katta bo'lishi kerak.",
    "Tanlangan oy billing boshlanish oyidan oldin bo'lishi mumkin emas":
      "Tanlangan oy billing boshlanish oyidan oldin bo'lishi mumkin emas.",
  };

  constructor(private readonly prisma: PrismaService) {}

  private extractMessages(responseBody: unknown): string[] {
    if (typeof responseBody === 'string') {
      return [responseBody];
    }

    if (typeof responseBody === 'object' && responseBody !== null && 'message' in responseBody) {
      const message = (responseBody as { message?: string | string[] }).message;
      if (Array.isArray(message)) {
        return message.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
      }
      if (typeof message === 'string' && message.trim().length > 0) {
        return [message];
      }
    }

    return [];
  }

  private isPrismaKnownError(exception: unknown): exception is { code: string; meta?: Record<string, unknown>; clientVersion: string } {
    return (
      typeof exception === 'object' &&
      exception !== null &&
      'code' in exception &&
      typeof (exception as { code?: unknown }).code === 'string' &&
      'clientVersion' in exception
    );
  }

  private mapPrismaError(exception: { code: string; meta?: Record<string, unknown> }): { status: number; message: string } {
    if (exception.code === 'P2002') {
      const target = exception.meta?.target;
      const targetLabel = Array.isArray(target) ? target.join(', ') : 'unique maydon';
      return {
        status: HttpStatus.CONFLICT,
        message: `Bu ma'lumot allaqachon mavjud (${targetLabel}).`,
      };
    }

    if (exception.code === 'P2003') {
      return {
        status: HttpStatus.BAD_REQUEST,
        message: "Bog'liq ma'lumot topilmadi yoki noto'g'ri yuborildi.",
      };
    }

    if (exception.code === 'P2025') {
      return {
        status: HttpStatus.NOT_FOUND,
        message: "So'ralgan ma'lumot topilmadi.",
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Serverda kutilmagan xatolik yuz berdi.',
    };
  }

  private translateValidationMessage(message: string): string {
    const noQuotes = (value: string) => value.replace(/^"|"$/g, '');
    const normalized = message.trim();

    const disallowedProperty = normalized.match(/^property\s+(.+)\s+should not exist$/i);
    if (disallowedProperty) {
      return `${noQuotes(disallowedProperty[1])} maydoni ruxsat etilmagan.`;
    }

    const shouldNotBeEmpty = normalized.match(/^(.+)\s+should not be empty$/i);
    if (shouldNotBeEmpty) {
      return `${noQuotes(shouldNotBeEmpty[1])} maydoni bo'sh bo'lishi mumkin emas.`;
    }

    const mustBeString = normalized.match(/^(.+)\s+must be a string$/i);
    if (mustBeString) {
      return `${noQuotes(mustBeString[1])} maydoni matn bo'lishi kerak.`;
    }

    const mustBeNumber = normalized.match(/^(.+)\s+must be a number(?: conforming to the specified constraints)?$/i);
    if (mustBeNumber) {
      return `${noQuotes(mustBeNumber[1])} maydoni son bo'lishi kerak.`;
    }

    const mustBeInteger = normalized.match(/^(.+)\s+must be an integer number$/i);
    if (mustBeInteger) {
      return `${noQuotes(mustBeInteger[1])} maydoni butun son bo'lishi kerak.`;
    }

    const mustBeBoolean = normalized.match(/^(.+)\s+must be a boolean value$/i);
    if (mustBeBoolean) {
      return `${noQuotes(mustBeBoolean[1])} maydoni true yoki false bo'lishi kerak.`;
    }

    const mustBeDate = normalized.match(/^(.+)\s+must be a valid ISO 8601 date string$/i);
    if (mustBeDate) {
      return `${noQuotes(mustBeDate[1])} maydoni to'g'ri sana formatida bo'lishi kerak.`;
    }

    const mustBeEnum = normalized.match(/^(.+)\s+must be one of the following values:\s+(.+)$/i);
    if (mustBeEnum) {
      return `${noQuotes(mustBeEnum[1])} maydoni quyidagi qiymatlardan biri bo'lishi kerak: ${mustBeEnum[2]}.`;
    }

    const minNumber = normalized.match(/^(.+)\s+must not be less than\s+(.+)$/i);
    if (minNumber) {
      return `${noQuotes(minNumber[1])} maydoni ${minNumber[2]} dan kichik bo'lishi mumkin emas.`;
    }

    const maxNumber = normalized.match(/^(.+)\s+must not be greater than\s+(.+)$/i);
    if (maxNumber) {
      return `${noQuotes(maxNumber[1])} maydoni ${maxNumber[2]} dan katta bo'lishi mumkin emas.`;
    }

    if (normalized === 'Validation failed (uuid is expected)') {
      return "ID noto'g'ri formatda. UUID yuborilishi kerak.";
    }

    return normalized;
  }

  private translateMessage(message: string): string {
    const trimmed = message.trim();
    const direct = this.directMessageMap[trimmed];
    if (direct) {
      return direct;
    }

    const teacherNotFound = trimmed.match(/^Teacher with id (.+) is not active or not found$/);
    if (teacherNotFound) {
      return `${teacherNotFound[1]} ID li o'qituvchi faol emas yoki topilmadi.`;
    }

    return this.translateValidationMessage(trimmed);
  }

  async catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request & { user?: { id?: string } }>();
    const response = ctx.getResponse<Response>();

    let status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const responseBody = exception instanceof HttpException ? exception.getResponse() : null;

    let messages = this.extractMessages(responseBody);

    if (!messages.length && this.isPrismaKnownError(exception)) {
      const mapped = this.mapPrismaError(exception);
      status = mapped.status;
      messages = [mapped.message];
    }

    if (!messages.length && exception instanceof Error && exception.message.trim().length > 0) {
      messages = [exception.message];
    }

    if (!messages.length) {
      messages = ['Internal server error'];
    }

    const translatedMessages = messages.map((message) => this.translateMessage(message));
    const errorMessage = translatedMessages.join(', ');

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
      message: status >= 500 ? 'Serverda kutilmagan xatolik yuz berdi.' : errorMessage,
      timestamp: new Date().toISOString(),
      path: request.originalUrl,
    });
  }
}
