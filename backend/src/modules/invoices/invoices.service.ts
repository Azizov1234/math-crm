import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { FilterInvoiceDto } from './dto/filter-invoice.dto';
import { GenerateMonthlyInvoicesDto } from './dto/generate-monthly-invoices.dto';
import { InvoicesRepository } from './invoices.repository';

type UserCtx = { id: string; role: UserRole; branchId?: string | null };

@Injectable()
export class InvoicesService {
  constructor(private readonly invoicesRepository: InvoicesRepository) {}

  listInvoices(filter: FilterInvoiceDto, user: UserCtx) {
    return this.invoicesRepository.list(filter, user);
  }

  async getInvoice(id: string, user: UserCtx) {
    const invoice = await this.invoicesRepository.findById(id, user);
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }
    return invoice;
  }

  getStudentInvoices(studentId: string, user: UserCtx) {
    return this.invoicesRepository.listByStudent(studentId, user);
  }

  async generateMonthlyInvoices(dto: GenerateMonthlyInvoicesDto, user: UserCtx) {
    if (user.role === UserRole.ADMIN && dto.branchId && user.branchId !== dto.branchId) {
      throw new ForbiddenException('Admin can only generate invoices for own branch');
    }

    const result = await this.invoicesRepository.generateMonthly(dto, user);

    await this.invoicesRepository.createActionLog({
      userId: user.id,
      role: user.role,
      action: 'INVOICES_GENERATED',
      module: 'INVOICES',
      description: `Generated monthly invoices for ${result.month}/${result.year} (${result.totalInvoices} rows)`,
    });

    return result;
  }
}
