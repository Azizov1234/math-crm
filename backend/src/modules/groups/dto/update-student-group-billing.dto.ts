import { ApiPropertyOptional } from '@nestjs/swagger';
import { BillingType } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateStudentGroupBillingDto {
  @ApiPropertyOptional({ enum: BillingType, default: BillingType.DEFAULT, description: 'DEFAULT | DISCOUNTED | FREE' })
  @IsOptional()
  @IsEnum(BillingType)
  billingType?: BillingType;

  @ApiPropertyOptional({ description: "Student's monthly fee for this group" })
  @IsOptional()
  @Transform(({ value }) => (value === null || value === undefined || value === '' ? undefined : Number(value)))
  @IsNumber()
  @Min(0)
  monthlyFee?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  discountReason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}
