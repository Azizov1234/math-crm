import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Status } from '@prisma/client';
import { IsArray, IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min, ArrayMinSize } from 'class-validator';

export class CreateGroupDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiProperty()
  @IsString()
  courseId: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  teacherIds: string[];

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  lessonDays: string;

  @ApiProperty()
  @IsString()
  lessonTime: string;

  @ApiProperty()
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  monthlyFee: number;

  @ApiPropertyOptional({ enum: Status, default: Status.ACTIVE })
  @IsOptional()
  @IsEnum(Status)
  status?: Status;
}
