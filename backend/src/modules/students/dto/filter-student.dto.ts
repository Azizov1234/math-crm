import { ApiPropertyOptional } from '@nestjs/swagger';
import { ExamResultStatus, Status } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export enum StudentPaymentStatusFilter {
  CURRENT = 'CURRENT',
  OVERDUE = 'OVERDUE',
}

export enum StudentDebtStatusFilter {
  HAS_DEBT = 'HAS_DEBT',
  NO_DEBT = 'NO_DEBT',
}

export class FilterStudentDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: Status })
  @IsOptional()
  @IsEnum(Status)
  status?: Status;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  groupId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  courseId?: string;

  @ApiPropertyOptional({ enum: StudentPaymentStatusFilter })
  @IsOptional()
  @IsEnum(StudentPaymentStatusFilter)
  paymentStatus?: StudentPaymentStatusFilter;

  @ApiPropertyOptional({ enum: StudentDebtStatusFilter })
  @IsOptional()
  @IsEnum(StudentDebtStatusFilter)
  debtStatus?: StudentDebtStatusFilter;

  @ApiPropertyOptional({ enum: ExamResultStatus })
  @IsOptional()
  @IsEnum(ExamResultStatus)
  examResult?: ExamResultStatus;
}
