import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { BranchAccessGuard } from '../../common/guards/branch-access.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';
import { FilterInvoiceDto } from './dto/filter-invoice.dto';
import { GenerateMonthlyInvoicesDto } from './dto/generate-monthly-invoices.dto';
import { InvoicesService } from './invoices.service';

@ApiTags('Invoices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, BranchAccessGuard)
@Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  @ApiOperation({ summary: 'List invoices' })
  listInvoices(
    @Query() filter: FilterInvoiceDto,
    @CurrentUser() user: { id: string; role: UserRole; branchId?: string | null },
  ) {
    return this.invoicesService.listInvoices(filter, user);
  }

  @Get('student/:studentId')
  @ApiOperation({ summary: 'List invoices by student' })
  getStudentInvoices(
    @Param('studentId', ParseUuidPipe) studentId: string,
    @CurrentUser() user: { id: string; role: UserRole; branchId?: string | null },
  ) {
    return this.invoicesService.getStudentInvoices(studentId, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get invoice by id' })
  getInvoice(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: UserRole; branchId?: string | null },
  ) {
    return this.invoicesService.getInvoice(id, user);
  }

  @Post('generate-monthly')
  @ApiOperation({ summary: 'Generate monthly invoices from StudentBilling' })
  generateMonthlyInvoices(
    @Body() dto: GenerateMonthlyInvoicesDto,
    @CurrentUser() user: { id: string; role: UserRole; branchId?: string | null },
  ) {
    return this.invoicesService.generateMonthlyInvoices(dto, user);
  }
}
