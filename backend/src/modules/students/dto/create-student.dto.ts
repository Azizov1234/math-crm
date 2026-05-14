import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Status } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID, Matches } from 'class-validator';
import { normalizeUzPhone, UZ_PHONE_REGEX } from '../../../common/utils/phone.util';

export class CreateStudentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  branchId?: string;

  @ApiProperty()
  @IsString()
  fullName: string;

  @ApiProperty()
  @IsString()
  @Transform(({ value }) => normalizeUzPhone(value))
  @Matches(UZ_PHONE_REGEX, { message: "Telefon formati +998901234567 ko'rinishida bo'lishi kerak" })
  phone: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => normalizeUzPhone(value))
  @IsOptional()
  @IsString()
  @Matches(UZ_PHONE_REGEX, { message: "Ota-ona telefoni +998901234567 ko'rinishida bo'lishi kerak" })
  parentPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiPropertyOptional({ enum: Status, default: Status.ACTIVE })
  @IsOptional()
  @IsEnum(Status)
  status?: Status;
}
