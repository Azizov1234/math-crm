import { PartialType } from '@nestjs/swagger';
import { CreateMonthlyExamDto } from './create-monthly-exam.dto';

export class UpdateMonthlyExamDto extends PartialType(CreateMonthlyExamDto) {}
