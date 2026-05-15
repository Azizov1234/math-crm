import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { BillingType, Status, UserRole } from '@prisma/client';
import { startOfDay } from '../../common/utils/date-billing.util';
import { AddStudentToGroupDto } from './dto/add-student-to-group.dto';
import { CreateGroupDto } from './dto/create-group.dto';
import { FilterGroupDto } from './dto/filter-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { UpdateStudentGroupBillingDto } from './dto/update-student-group-billing.dto';
import { GroupsRepository } from './groups.repository';

@Injectable()
export class GroupsService {
  constructor(private readonly groupsRepository: GroupsRepository) {}

  private normalizeOptionalText(value?: string): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }

  private resolveBillingInput(params: {
    groupMonthlyFee: number;
    billingType?: BillingType;
    monthlyFee?: number;
    discountReason?: string;
    note?: string;
  }) {
    const billingType = params.billingType ?? BillingType.DEFAULT;
    const groupMonthlyFee = Number(params.groupMonthlyFee);

    if (billingType === BillingType.DEFAULT) {
      if (params.monthlyFee !== undefined && Number(params.monthlyFee) !== groupMonthlyFee) {
        throw new BadRequestException(`DEFAULT to'lov turida oylik summa guruh narxiga teng bo'lishi kerak (${groupMonthlyFee}).`);
      }

      return {
        billingType,
        monthlyFee: groupMonthlyFee,
        discountReason: null,
        note: this.normalizeOptionalText(params.note),
      };
    }

    if (billingType === BillingType.FREE) {
      if (params.monthlyFee !== undefined && Number(params.monthlyFee) !== 0) {
        throw new BadRequestException("Bepul to'lov turida oylik summa 0 bo'lishi kerak.");
      }

      return {
        billingType,
        monthlyFee: 0,
        discountReason: null,
        note: this.normalizeOptionalText(params.note),
      };
    }

    if (params.monthlyFee === undefined) {
      throw new BadRequestException("INDIVIDUAL yoki DISCOUNTED to'lov turida oylik summa majburiy.");
    }

    if (Number(params.monthlyFee) < 0) {
      throw new BadRequestException("Oylik summa manfiy bo'lishi mumkin emas.");
    }

    return {
      billingType,
      monthlyFee: Number(params.monthlyFee),
      discountReason: this.normalizeOptionalText(params.discountReason),
      note: this.normalizeOptionalText(params.note),
    };
  }

  private mapBillingResponse(billing: {
    studentId: string;
    groupId: string;
    monthlyFee: unknown;
    billingType: BillingType;
    discountReason: string | null;
    note: string | null;
  }) {
    return {
      studentId: billing.studentId,
      groupId: billing.groupId,
      monthlyFee: Number(billing.monthlyFee),
      billingType: billing.billingType,
      discountReason: billing.discountReason,
      note: billing.note,
    };
  }

  private resolveInitialBillingDate(groupStartDate: Date): Date {
    const today = startOfDay();
    const normalizedGroupStart = startOfDay(groupStartDate);
    return normalizedGroupStart > today ? normalizedGroupStart : today;
  }

  findAll(filter: FilterGroupDto, user: { role: UserRole; branchId?: string | null }) {
    if (filter.includeDeleted && user.role !== UserRole.SUPERADMIN) {
      throw new ForbiddenException("O'chirilgan guruhlarni faqat superadmin ko'ra oladi.");
    }

    return this.groupsRepository.findAll(filter, user);
  }

  async findOne(id: string, user: { role: UserRole; branchId?: string | null }) {
    const group = await this.groupsRepository.findById(id);
    if (!group || group.deletedAt || group.status === Status.DELETED) {
      throw new NotFoundException('Guruh topilmadi.');
    }

    if (user.role === UserRole.ADMIN && user.branchId !== group.branchId) {
      throw new ForbiddenException("Admin faqat o'z branchidagi guruhlarni ko'ra oladi.");
    }

    return group;
  }

  async create(dto: CreateGroupDto, user: { id?: string; role: UserRole; branchId?: string | null }) {
    const course = await this.groupsRepository.findActiveCourse(dto.courseId);

    if (!course) {
      throw new BadRequestException('Kurs faol emas yoki topilmadi.');
    }

    let targetBranchId: string | null | undefined;
    if (user.role === UserRole.ADMIN) {
      if (dto.branchId && dto.branchId !== user.branchId) {
        throw new ForbiddenException("Admin faqat o'z branchida guruh ocha oladi.");
      }
      targetBranchId = user.branchId;
      if (!targetBranchId) {
        throw new BadRequestException('Admin uchun branch biriktirilmagan.');
      }
    } else {
      // Single-branch style flow for superadmin: branch is auto-derived from selected course.
      targetBranchId = course.branchId;
    }

    if (course.branchId !== targetBranchId) {
      throw new BadRequestException('Tanlangan kurs ushbu branchga tegishli emas.');
    }

    const uniqueTeacherIds = [...new Set(dto.teacherIds)];
    for (const teacherId of uniqueTeacherIds) {
      const teacher = await this.groupsRepository.findActiveTeacher(teacherId);
      if (!teacher) {
        throw new BadRequestException(`${teacherId} ID li o'qituvchi faol emas yoki topilmadi.`);
      }
    }

    const created = await this.groupsRepository.create({
      branch: { connect: { id: targetBranchId } },
      course: { connect: { id: dto.courseId } },
      name: dto.name,
      lessonDays: dto.lessonDays,
      lessonTime: dto.lessonTime,
      startDate: new Date(dto.startDate),
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      monthlyFee: dto.monthlyFee,
      status: dto.status ?? Status.ACTIVE,
    });

    await this.groupsRepository.setTeachers(created.id, uniqueTeacherIds);
    const createdWithTeacher = await this.groupsRepository.findById(created.id);

    if (user.id) {
      await this.groupsRepository.createActionLog({
        userId: user.id,
        role: user.role,
        action: 'GROUP_CREATED',
        module: 'GROUPS',
        description: `Group created: ${created.name}`,
      });
    }

    return createdWithTeacher;
  }

  async update(id: string, dto: UpdateGroupDto, user: { id?: string; role: UserRole; branchId?: string | null }) {
    const existing = await this.findOne(id, user);

    if (user.role === UserRole.ADMIN && dto.branchId && dto.branchId !== user.branchId) {
      throw new ForbiddenException("Admin faqat o'z branchini belgilashi mumkin.");
    }

    const nextBranchId = user.role === UserRole.ADMIN ? user.branchId ?? existing.branchId : dto.branchId ?? existing.branchId;
    const nextCourseId = dto.courseId ?? existing.courseId;
    const nextTeacherIds = (dto.teacherIds ?? existing.teacherIds ?? []).filter(
      (teacherId): teacherId is string => typeof teacherId === 'string' && teacherId.trim().length > 0,
    );

    if (dto.courseId || dto.teacherIds || dto.branchId) {
      const course = await this.groupsRepository.findActiveCourse(nextCourseId);

      if (!course) {
        throw new BadRequestException('Kurs faol emas yoki topilmadi.');
      }

      if (course.branchId !== nextBranchId) {
        throw new BadRequestException('Tanlangan kurs ushbu branchga tegishli emas.');
      }

      if (nextTeacherIds.length > 0) {
        const uniqueTeacherIds = [...new Set(nextTeacherIds)];
        for (const teacherId of uniqueTeacherIds) {
          const teacher = await this.groupsRepository.findActiveTeacher(teacherId);
          if (!teacher) {
            throw new BadRequestException(`${teacherId} ID li o'qituvchi faol emas yoki topilmadi.`);
          }
        }
      }
    }

    const updated = await this.groupsRepository.update(id, {
      ...(dto.branchId && user.role === UserRole.SUPERADMIN ? { branch: { connect: { id: dto.branchId } } } : {}),
      ...(dto.courseId ? { course: { connect: { id: dto.courseId } } } : {}),
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.lessonDays !== undefined ? { lessonDays: dto.lessonDays } : {}),
      ...(dto.lessonTime !== undefined ? { lessonTime: dto.lessonTime } : {}),
      ...(dto.startDate !== undefined ? { startDate: new Date(dto.startDate) } : {}),
      ...(dto.endDate !== undefined ? { endDate: dto.endDate ? new Date(dto.endDate) : null } : {}),
      ...(dto.monthlyFee !== undefined ? { monthlyFee: dto.monthlyFee } : {}),
      ...(dto.status ? { status: dto.status } : {}),
      ...(dto.status === Status.DELETED ? { deletedAt: new Date() } : {}),
    });

    if (dto.teacherIds) {
      const uniqueTeacherIds = [...new Set(dto.teacherIds.filter((teacherId): teacherId is string => typeof teacherId === 'string' && teacherId.trim().length > 0))];
      await this.groupsRepository.setTeachers(id, uniqueTeacherIds);
    }

    const updatedWithTeacher = await this.groupsRepository.findById(id);

    if (user.id) {
      await this.groupsRepository.createActionLog({
        userId: user.id,
        role: user.role,
        action: 'GROUP_UPDATED',
        module: 'GROUPS',
        description: `Group updated: ${updated.name}`,
      });
    }

    return updatedWithTeacher ?? updated;
  }

  async remove(id: string, user: { id?: string; role: UserRole; branchId?: string | null }) {
    const existing = await this.findOne(id, user);

    const removed = await this.groupsRepository.update(id, {
      status: Status.DELETED,
      deletedAt: new Date(),
    });

    if (user.id) {
      await this.groupsRepository.createActionLog({
        userId: user.id,
        role: user.role,
        action: 'GROUP_DELETED',
        module: 'GROUPS',
        description: `Group deleted: ${existing.name}`,
      });
    }

    return removed;
  }

  async addStudent(id: string, dto: AddStudentToGroupDto, user: { id?: string; role: UserRole; branchId?: string | null }) {
    const group = await this.findOne(id, user);
    if (group.status !== Status.ACTIVE) {
      throw new BadRequestException("Guruh faol holatda bo'lishi kerak.");
    }

    const student = await this.groupsRepository.findActiveStudent(dto.studentId);

    if (!student) {
      throw new NotFoundException("O'quvchi faol emas yoki topilmadi.");
    }

    if (student.branchId !== group.branchId) {
      await this.groupsRepository.updateStudentBranch(student.id, group.branchId);
    }

    const existingMembership = await this.groupsRepository.findMembership(id, dto.studentId);
    if (existingMembership) {
      throw new ConflictException("Bu o'quvchi ushbu guruhda allaqachon faol.");
    }

    const billingInput = this.resolveBillingInput({
      groupMonthlyFee: Number(group.monthlyFee),
      billingType: dto.billingType,
      monthlyFee: dto.monthlyFee,
      discountReason: dto.discountReason,
      note: dto.note,
    });

    const membership = await this.groupsRepository.addOrActivateStudent(id, dto.studentId);
    const billing = await this.groupsRepository.upsertStudentBilling({
      studentId: dto.studentId,
      groupId: id,
      branchId: group.branchId,
      monthlyFee: billingInput.monthlyFee,
      billingType: billingInput.billingType,
      discountReason: billingInput.discountReason,
      note: billingInput.note,
      nextPaymentDate: this.resolveInitialBillingDate(new Date(group.startDate)),
    });

    if (user.id) {
      await this.groupsRepository.createActionLog({
        userId: user.id,
        role: user.role,
        action: 'GROUP_STUDENT_ADDED',
        module: 'GROUPS',
        description: `Student ${dto.studentId} added to group ${id} with ${billingInput.monthlyFee} fee (${billingInput.billingType})`,
      });
    }

    return {
      groupStudent: membership,
      billing: this.mapBillingResponse(billing),
    };
  }

  async updateStudentBilling(
    groupId: string,
    studentId: string,
    dto: UpdateStudentGroupBillingDto,
    user: { id?: string; role: UserRole; branchId?: string | null },
  ) {
    if (!dto.billingType) {
      throw new BadRequestException("To'lov turi (billingType) majburiy.");
    }

    const group = await this.findOne(groupId, user);
    if (group.status !== Status.ACTIVE) {
      throw new BadRequestException("Guruh faol holatda bo'lishi kerak.");
    }

    const membership = await this.groupsRepository.findMembership(groupId, studentId);
    if (!membership) {
      throw new NotFoundException("Ushbu guruh uchun faol a'zolik topilmadi.");
    }

    const existingBilling = await this.groupsRepository.findStudentBilling(studentId, groupId);
    if (!existingBilling) {
      throw new NotFoundException("Ushbu guruh bo'yicha o'quvchi billing ma'lumoti topilmadi.");
    }

    const billingInput = this.resolveBillingInput({
      groupMonthlyFee: Number(group.monthlyFee),
      billingType: dto.billingType,
      monthlyFee: dto.monthlyFee,
      discountReason: dto.discountReason,
      note: dto.note,
    });

    const updatedBilling = await this.groupsRepository.updateStudentBilling({
      studentId,
      groupId,
      branchId: group.branchId,
      monthlyFee: billingInput.monthlyFee,
      billingType: billingInput.billingType,
      discountReason: billingInput.discountReason,
      note: billingInput.note,
    });

    if (user.id) {
      await this.groupsRepository.createActionLog({
        userId: user.id,
        role: user.role,
        action: 'GROUP_STUDENT_BILLING_UPDATED',
        module: 'GROUPS',
        description: `Student ${studentId} billing updated in group ${groupId}: ${billingInput.monthlyFee} (${billingInput.billingType})`,
      });
    }

    return this.mapBillingResponse(updatedBilling);
  }

  async removeStudent(id: string, studentId: string, user: { id?: string; role: UserRole; branchId?: string | null }) {
    await this.findOne(id, user);

    const result = await this.groupsRepository.deactivateMembership(id, studentId);
    if (result.count === 0) {
      throw new NotFoundException("Ushbu guruh uchun faol a'zolik topilmadi.");
    }

    await this.groupsRepository.deactivateStudentBilling(studentId, id);

    if (user.id) {
      await this.groupsRepository.createActionLog({
        userId: user.id,
        role: user.role,
        action: 'GROUP_STUDENT_REMOVED',
        module: 'GROUPS',
        description: `Student ${studentId} removed from group ${id}`,
      });
    }

    return { success: true };
  }

  async listStudents(id: string, user: { role: UserRole; branchId?: string | null }) {
    await this.findOne(id, user);
    return this.groupsRepository.listStudents(id);
  }

  async listPayments(id: string, user: { role: UserRole; branchId?: string | null }) {
    await this.findOne(id, user);
    return this.groupsRepository.listPayments(id, user);
  }

  async listDebtors(id: string, user: { role: UserRole; branchId?: string | null }) {
    await this.findOne(id, user);
    return this.groupsRepository.listDebtors(id, user);
  }

  async listExams(id: string, user: { role: UserRole; branchId?: string | null }) {
    await this.findOne(id, user);
    return this.groupsRepository.listExams(id, user);
  }
}
