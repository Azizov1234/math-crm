import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

const INVOICE_STATUS_VALUES = ['PAID', 'PARTIAL', 'UNPAID', 'OVERDUE'] as const;
const INVOICE_SORT_VALUES = ['dueDate', 'amountDue', 'amountPaid', 'debtAmount', 'studentName', 'groupName', 'status'] as const;

export class FilterInvoiceDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  studentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  groupId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 12 })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(1)
  @Max(12)
  month?: number;

  @ApiPropertyOptional({ minimum: 2000 })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(2000)
  year?: number;

  @ApiPropertyOptional({ enum: INVOICE_STATUS_VALUES })
  @IsOptional()
  @IsIn(INVOICE_STATUS_VALUES)
  status?: (typeof INVOICE_STATUS_VALUES)[number];

  @ApiPropertyOptional({ enum: INVOICE_SORT_VALUES, default: 'dueDate' })
  @IsOptional()
  @IsIn(INVOICE_SORT_VALUES)
  sortBy?: (typeof INVOICE_SORT_VALUES)[number] = 'dueDate';
}
