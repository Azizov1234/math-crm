import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExamResultStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateExamResultDto {
  @ApiProperty()
  @IsString()
  studentId: string;

  @ApiProperty({ enum: ExamResultStatus })
  @IsEnum(ExamResultStatus)
  result: ExamResultStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comment?: string;
}
