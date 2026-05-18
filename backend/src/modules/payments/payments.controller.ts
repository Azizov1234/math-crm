import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { BranchAccessGuard } from '../../common/guards/branch-access.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { FilterPaymentDto } from './dto/filter-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { PaymentsService } from './payments.service';

@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, BranchAccessGuard)
@Roles(UserRole.SUPERADMIN)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  @ApiOperation({ summary: 'List payments' })
  listPayments(@Query() filter: FilterPaymentDto, @CurrentUser() user: { role: UserRole; branchId?: string | null }) {
    return this.paymentsService.listPayments(filter, user);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Payments summary' })
  summary(@CurrentUser() user: { role: UserRole; branchId?: string | null }) {
    return this.paymentsService.summary(user);
  }

  @Get('student/:studentId')
  @ApiOperation({ summary: 'Get payments by student' })
  studentPayments(
    @Param('studentId', ParseUuidPipe) studentId: string,
    @CurrentUser() user: { role: UserRole; branchId?: string | null },
  ) {
    return this.paymentsService.getStudentPayments(studentId, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment by id' })
  getPayment(@Param('id', ParseUuidPipe) id: string, @CurrentUser() user: { role: UserRole; branchId?: string | null }) {
    return this.paymentsService.getPayment(id, user);
  }

  @Post()
  @ApiOperation({ summary: 'Create manual payment' })
  createPayment(@Body() dto: CreatePaymentDto, @CurrentUser() user: { id: string; role: UserRole; branchId?: string | null }) {
    return this.paymentsService.createPayment(dto, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update payment' })
  updatePayment(
    @Param('id', ParseUuidPipe) id: string,
    @Body() dto: UpdatePaymentDto,
    @CurrentUser() user: { id: string; role: UserRole; branchId?: string | null },
  ) {
    return this.paymentsService.updatePayment(id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete payment' })
  removePayment(@Param('id', ParseUuidPipe) id: string, @CurrentUser() user: { id: string; role: UserRole; branchId?: string | null }) {
    return this.paymentsService.removePayment(id, user);
  }
}
