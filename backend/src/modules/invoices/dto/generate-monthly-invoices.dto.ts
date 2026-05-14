import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class GenerateMonthlyInvoicesDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 12, description: 'Default: current month' })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(1)
  @Max(12)
  month?: number;

  @ApiPropertyOptional({ minimum: 2000, description: 'Default: current year' })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(2000)
  year?: number;

  @ApiPropertyOptional({ description: 'SUPERADMIN only: generate for a specific branch' })
  @IsOptional()
  @IsString()
  branchId?: string;
}
