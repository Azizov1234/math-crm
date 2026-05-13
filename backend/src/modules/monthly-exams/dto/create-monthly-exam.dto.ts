import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExamStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateMonthlyExamDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiProperty()
  @IsString()
  courseId: string;

  @ApiProperty()
  @IsString()
  groupId: string;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsDateString()
  examDate: string;

  @ApiPropertyOptional({ enum: ExamStatus, default: ExamStatus.SCHEDULED })
  @IsOptional()
  @IsEnum(ExamStatus)
  status?: ExamStatus;
}
