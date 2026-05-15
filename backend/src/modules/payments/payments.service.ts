import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { FilterPaymentDto } from './dto/filter-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { PaymentsRepository } from './payments.repository';

@Injectable()
export class PaymentsService {
  constructor(private readonly paymentsRepository: PaymentsRepository) {}

  private validateAmountAgainstMonthlyFee(amount: number, monthlyFee: number) {
    if (amount > monthlyFee) {
      throw new BadRequestException(`To'lov miqdori oylik summadan oshmasligi kerak (${monthlyFee})`);
    }
  }

  private validateMonthlyPaidTotal(
    alreadyPaidAmount: number,
    currentAmount: number,
    monthlyFee: number,
    isUpdate: boolean = false,
  ) {
    if (alreadyPaidAmount >= monthlyFee) {
      throw new BadRequestException("Bu oy uchun to'lov allaqachon to'liq amalga oshirilgan");
    }

    const nextTotal = alreadyPaidAmount + currentAmount;
    if (nextTotal > monthlyFee) {
      const remaining = Math.max(0, monthlyFee - alreadyPaidAmount);
      if (isUpdate) {
        throw new BadRequestException(`Yangi miqdor oy limitidan oshib ketadi. Qolgan summa: ${remaining}`);
      }
      throw new BadRequestException(`Ushbu oy uchun maksimal qolgan summa: ${remaining}`);
    }
  }

  private validatePaymentPeriodNotBeforeBillingStart(
    paymentForMonth: number | undefined,
    paymentForYear: number | undefined,
    billingStartDate: Date | null | undefined,
  ) {
    if (!paymentForMonth || !paymentForYear || !billingStartDate) {
      return;
    }

    const selectedPeriodStart = new Date(paymentForYear, paymentForMonth - 1, 1).getTime();
    const billingPeriodStart = new Date(billingStartDate.getFullYear(), billingStartDate.getMonth(), 1).getTime();

    if (selectedPeriodStart < billingPeriodStart) {
      throw new BadRequestException("Tanlangan oy billing boshlanish oyidan oldin bo'lishi mumkin emas");
    }
  }

  listPayments(filter: FilterPaymentDto, user: { role: UserRole; branchId?: string | null }) {
    return this.paymentsRepository.findAll(filter, user);
  }

  async getPayment(id: string, user: { role: UserRole; branchId?: string | null }) {
    const payment = await this.paymentsRepository.findById(id);
    if (!payment) {
      throw new NotFoundException("To'lov topilmadi.");
    }

    if (user.role === UserRole.ADMIN && user.branchId !== payment.branchId) {
      throw new ForbiddenException("Admin faqat o'z branchidagi to'lovlarni ko'ra oladi.");
    }

    return payment;
  }

  async createPayment(dto: CreatePaymentDto, user: { id: string; role: UserRole; branchId?: string | null }) {
    if (dto.amount <= 0) {
      throw new BadRequestException("To'lov summasi 0 dan katta bo'lishi kerak.");
    }

    const paymentForMonth = dto.paymentForMonth ?? dto.month;
    const paymentForYear = dto.paymentForYear ?? dto.year;

    const [student, group, membership] = await Promise.all([
      this.paymentsRepository.findActiveStudent(dto.studentId),
      this.paymentsRepository.findActiveGroup(dto.groupId),
      this.paymentsRepository.findActiveMembership(dto.groupId, dto.studentId),
    ]);

    if (!student) {
      throw new BadRequestException("O'quvchi faol bo'lishi kerak.");
    }

    if (!group) {
      throw new BadRequestException("Guruh faol bo'lishi kerak.");
    }

    if (!membership) {
      throw new BadRequestException("O'quvchi tanlangan guruhga a'zo bo'lishi kerak.");
    }

    if (user.role === UserRole.ADMIN && user.branchId !== group.branchId) {
      throw new ForbiddenException("Admin faqat o'z branchida to'lov yarata oladi.");
    }

    if (student.branchId !== group.branchId) {
      throw new BadRequestException("O'quvchi va guruh branchlari mos emas.");
    }

    const paidAt = dto.paidAt ? new Date(dto.paidAt) : new Date();
    const activeBilling = await this.paymentsRepository.findActiveBilling(dto.groupId, dto.studentId);
    const effectiveMonthlyFee = Number(activeBilling?.monthlyFee ?? group.monthlyFee);
    this.validatePaymentPeriodNotBeforeBillingStart(paymentForMonth, paymentForYear, activeBilling?.nextPaymentDate);
    this.validateAmountAgainstMonthlyFee(dto.amount, effectiveMonthlyFee);

    if (paymentForMonth && paymentForYear) {
      const alreadyPaidAmount = await this.paymentsRepository.getPaidAmountForMonth(
        dto.studentId,
        dto.groupId,
        paymentForMonth,
        paymentForYear,
      );
      this.validateMonthlyPaidTotal(alreadyPaidAmount, dto.amount, effectiveMonthlyFee);
    }

    return this.paymentsRepository.createPaymentWithBilling({
      payload: {
        student: { connect: { id: dto.studentId } },
        group: { connect: { id: dto.groupId } },
        branch: { connect: { id: group.branchId } },
        amount: dto.amount,
        method: dto.method,
        paidAt,
        paymentForMonth,
        paymentForYear,
        note: dto.note,
        createdBy: { connect: { id: user.id } },
      },
      studentId: dto.studentId,
      groupId: dto.groupId,
      branchId: group.branchId,
      monthlyFee: effectiveMonthlyFee,
      billingType: activeBilling?.billingType,
      discountReason: activeBilling?.discountReason ?? null,
      note: activeBilling?.note ?? null,
      paidAt,
      actionLog: {
        userId: user.id,
        role: user.role,
        action: 'PAYMENT_CREATED',
        module: 'PAYMENTS',
        description: `Payment created for student ${dto.studentId}`,
      },
    });
  }

  async updatePayment(id: string, dto: UpdatePaymentDto, user: { id: string; role: UserRole; branchId?: string | null }) {
    const payment = await this.getPayment(id, user);

    if (dto.amount !== undefined && dto.amount <= 0) {
      throw new BadRequestException("To'lov summasi 0 dan katta bo'lishi kerak.");
    }

    if (
      dto.amount !== undefined ||
      dto.paymentForMonth !== undefined ||
      dto.paymentForYear !== undefined
    ) {
      const [activeBilling, activeGroup] = await Promise.all([
        this.paymentsRepository.findActiveBilling(payment.groupId, payment.studentId),
        this.paymentsRepository.findActiveGroup(payment.groupId),
      ]);
      const fallbackMonthlyFee = Number(payment.group?.monthlyFee ?? 0);
      const effectiveMonthlyFee = Number(activeBilling?.monthlyFee ?? activeGroup?.monthlyFee ?? fallbackMonthlyFee);
      const nextAmount = dto.amount ?? Number(payment.amount ?? 0);
      const nextPaymentForMonth = dto.paymentForMonth ?? payment.paymentForMonth ?? undefined;
      const nextPaymentForYear = dto.paymentForYear ?? payment.paymentForYear ?? undefined;

      this.validateAmountAgainstMonthlyFee(nextAmount, effectiveMonthlyFee);
      this.validatePaymentPeriodNotBeforeBillingStart(nextPaymentForMonth, nextPaymentForYear, activeBilling?.nextPaymentDate);

      if (nextPaymentForMonth && nextPaymentForYear) {
        const alreadyPaidAmount = await this.paymentsRepository.getPaidAmountForMonth(
          payment.studentId,
          payment.groupId,
          nextPaymentForMonth,
          nextPaymentForYear,
          id,
        );
        this.validateMonthlyPaidTotal(alreadyPaidAmount, nextAmount, effectiveMonthlyFee, true);
      }
    }

    return this.paymentsRepository.updatePaymentWithBilling({
      paymentId: id,
      updateData: {
        ...(dto.amount !== undefined ? { amount: dto.amount } : {}),
        ...(dto.method !== undefined ? { method: dto.method } : {}),
        ...(dto.paidAt !== undefined ? { paidAt: new Date(dto.paidAt) } : {}),
        ...(dto.paymentForMonth !== undefined ? { paymentForMonth: dto.paymentForMonth } : {}),
        ...(dto.paymentForYear !== undefined ? { paymentForYear: dto.paymentForYear } : {}),
        ...(dto.note !== undefined ? { note: dto.note } : {}),
      },
      studentId: payment.studentId,
      groupId: payment.groupId,
      actionLog: {
        userId: user.id,
        role: user.role,
        action: 'PAYMENT_UPDATED',
        module: 'PAYMENTS',
        description: `Payment updated ${id}`,
      },
    });
  }

  async removePayment(id: string, user: { id: string; role: UserRole; branchId?: string | null }) {
    const payment = await this.getPayment(id, user);

    return this.paymentsRepository.softDeletePaymentWithBilling({
      paymentId: id,
      studentId: payment.studentId,
      groupId: payment.groupId,
      actionLog: {
        userId: user.id,
        role: user.role,
        action: 'PAYMENT_DELETED',
        module: 'PAYMENTS',
        description: `Payment deleted ${id}`,
      },
    });
  }

  getStudentPayments(studentId: string, user: { role: UserRole; branchId?: string | null }) {
    return this.paymentsRepository.listByStudent(studentId, user);
  }

  summary(user: { role: UserRole; branchId?: string | null }) {
    return this.paymentsRepository.summary(user);
  }
}
