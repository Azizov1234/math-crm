import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ExamResultStatus, ExamStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateExamResultDto } from './dto/create-exam-result.dto';
import { CreateMonthlyExamDto } from './dto/create-monthly-exam.dto';
import { FilterMonthlyExamDto } from './dto/filter-monthly-exam.dto';
import { UpdateExamResultDto } from './dto/update-exam-result.dto';
import { UpdateMonthlyExamDto } from './dto/update-monthly-exam.dto';
import { MonthlyExamsRepository } from './monthly-exams.repository';

@Injectable()
export class MonthlyExamsService {
  constructor(
    private readonly monthlyExamsRepository: MonthlyExamsRepository,
    private readonly prisma: PrismaService,
  ) {}

  findAll(filter: FilterMonthlyExamDto, user: { role: UserRole; branchId?: string | null }) {
    return this.monthlyExamsRepository.findAll(filter, user);
  }

  private async syncExamStatusByResults(examId: string) {
    const exam = await this.monthlyExamsRepository.findById(examId);
    if (!exam || exam.deletedAt || exam.status === ExamStatus.CANCELLED) {
      return;
    }

    const [totalStudents, passedCount] = await Promise.all([
      this.monthlyExamsRepository.countActiveStudentsInGroup(exam.groupId),
      this.monthlyExamsRepository.countPassedResults(examId),
    ]);

    const shouldFinish = totalStudents > 0 && passedCount >= totalStudents;

    if (shouldFinish && exam.status !== ExamStatus.FINISHED) {
      await this.monthlyExamsRepository.setExamStatus(examId, ExamStatus.FINISHED);
      return;
    }

    if (!shouldFinish && exam.status === ExamStatus.FINISHED) {
      await this.monthlyExamsRepository.setExamStatus(examId, ExamStatus.SCHEDULED);
    }
  }

  async findOne(id: string, user: { role: UserRole; branchId?: string | null }) {
    const exam = await this.monthlyExamsRepository.findById(id);
    if (!exam || exam.deletedAt) {
      throw new NotFoundException('Monthly exam not found');
    }

    if (user.role === UserRole.ADMIN && user.branchId !== exam.branchId) {
      throw new ForbiddenException('Admin can only access own branch exams');
    }

    return exam;
  }

  async create(dto: CreateMonthlyExamDto, user: { id: string; role: UserRole; branchId?: string | null }) {
    let branchId = user.role === UserRole.ADMIN ? user.branchId : dto.branchId;
    if (!branchId && user.role === UserRole.SUPERADMIN) {
      const defaultBranch = await this.prisma.branch.findFirst({
        where: { deletedAt: null, status: { not: 'DELETED' } },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      });
      branchId = defaultBranch?.id;
    }

    if (!branchId) {
      throw new BadRequestException('No active branch configured');
    }

    if (user.role === UserRole.ADMIN && dto.branchId && dto.branchId !== user.branchId) {
      throw new ForbiddenException('Admin can only create own branch exam');
    }

    const [course, group] = await Promise.all([
      this.monthlyExamsRepository.findActiveCourse(dto.courseId),
      this.monthlyExamsRepository.findActiveGroup(dto.groupId),
    ]);

    if (!course) {
      throw new BadRequestException('Course must be ACTIVE');
    }

    if (!group) {
      throw new BadRequestException('Group must be ACTIVE');
    }

    if (course.branchId !== branchId || group.branchId !== branchId) {
      throw new BadRequestException('Course and Group must belong to selected branch');
    }

    if (group.courseId !== course.id) {
      throw new BadRequestException('Group does not belong to selected course');
    }

    const created = await this.monthlyExamsRepository.create({
      branch: { connect: { id: branchId } },
      course: { connect: { id: dto.courseId } },
      group: { connect: { id: dto.groupId } },
      title: dto.title,
      examDate: new Date(dto.examDate),
      status: dto.status ?? ExamStatus.SCHEDULED,
    });

    if (created.status !== ExamStatus.CANCELLED) {
      const activeStudentIds = await this.monthlyExamsRepository.listActiveStudentIdsInGroup(dto.groupId);
      await this.monthlyExamsRepository.createManyDefaultResults(created.id, activeStudentIds, user.id);
    }

    await this.monthlyExamsRepository.createActionLog({
      userId: user.id,
      role: user.role,
      action: 'MONTHLY_EXAM_CREATED',
      module: 'MONTHLY_EXAMS',
      description: `Monthly exam created ${created.id}`,
    });

    return created;
  }

  async update(
    id: string,
    dto: UpdateMonthlyExamDto,
    user: { id: string; role: UserRole; branchId?: string | null },
  ) {
    const existing = await this.findOne(id, user);

    if (user.role === UserRole.ADMIN && dto.branchId && dto.branchId !== user.branchId) {
      throw new ForbiddenException('Admin cannot reassign branch');
    }

    const targetBranchId = user.role === UserRole.ADMIN ? user.branchId ?? existing.branchId : dto.branchId ?? existing.branchId;
    const nextCourseId = dto.courseId ?? existing.courseId;
    const nextGroupId = dto.groupId ?? existing.groupId;

    if (dto.courseId || dto.groupId || dto.branchId) {
      const [course, group] = await Promise.all([
        this.monthlyExamsRepository.findActiveCourse(nextCourseId),
        this.monthlyExamsRepository.findActiveGroup(nextGroupId),
      ]);

      if (!course) {
        throw new BadRequestException('Course must be ACTIVE');
      }

      if (!group) {
        throw new BadRequestException('Group must be ACTIVE');
      }

      if (course.branchId !== targetBranchId || group.branchId !== targetBranchId) {
        throw new BadRequestException('Course and Group must belong to selected branch');
      }

      if (group.courseId !== course.id) {
        throw new BadRequestException('Group does not belong to selected course');
      }
    }

    const updated = await this.monthlyExamsRepository.update(id, {
      ...(dto.branchId && user.role === UserRole.SUPERADMIN ? { branch: { connect: { id: dto.branchId } } } : {}),
      ...(dto.courseId ? { course: { connect: { id: dto.courseId } } } : {}),
      ...(dto.groupId ? { group: { connect: { id: dto.groupId } } } : {}),
      ...(dto.title !== undefined ? { title: dto.title } : {}),
      ...(dto.examDate !== undefined ? { examDate: new Date(dto.examDate) } : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
    });

    await this.monthlyExamsRepository.createActionLog({
      userId: user.id,
      role: user.role,
      action: 'MONTHLY_EXAM_UPDATED',
      module: 'MONTHLY_EXAMS',
      description: `Monthly exam updated ${id}`,
    });

    return updated;
  }

  async remove(id: string, user: { id: string; role: UserRole; branchId?: string | null }) {
    await this.findOne(id, user);

    const removed = await this.monthlyExamsRepository.update(id, {
      deletedAt: new Date(),
      status: ExamStatus.CANCELLED,
    });

    await this.monthlyExamsRepository.createActionLog({
      userId: user.id,
      role: user.role,
      action: 'MONTHLY_EXAM_DELETED',
      module: 'MONTHLY_EXAMS',
      description: `Monthly exam soft deleted ${id}`,
    });

    return removed;
  }

  async createResult(
    examId: string,
    dto: CreateExamResultDto,
    user: { id: string; role: UserRole; branchId?: string | null },
  ) {
    const exam = await this.findOne(examId, user);

    const inGroup = await this.monthlyExamsRepository.findActiveStudentInGroup(dto.studentId, exam.groupId);
    if (!inGroup) {
      throw new BadRequestException('Student must be active in exam group');
    }

    const existing = await this.monthlyExamsRepository.findResultByExamStudent(examId, dto.studentId);
    if (existing && existing.result !== ExamResultStatus.NOT_SUBMITTED) {
      throw new ConflictException('Exam result for this student already exists');
    }

    const wasAutoNotSubmitted = Boolean(existing);
    const result = existing
      ? await this.monthlyExamsRepository.updateResult(existing.id, {
          result: dto.result,
          comment: dto.comment,
          checkedAt: new Date(),
          createdBy: { connect: { id: user.id } },
        })
      : await this.monthlyExamsRepository.createResult({
          exam: { connect: { id: examId } },
          student: { connect: { id: dto.studentId } },
          result: dto.result,
          comment: dto.comment,
          checkedAt: new Date(),
          createdBy: { connect: { id: user.id } },
        });

    await this.syncExamStatusByResults(examId);

    await this.monthlyExamsRepository.createActionLog({
      userId: user.id,
      role: user.role,
      action: wasAutoNotSubmitted ? 'EXAM_RESULT_UPDATED' : 'EXAM_RESULT_CREATED',
      module: 'MONTHLY_EXAMS',
      description: wasAutoNotSubmitted
        ? `Auto exam result updated exam=${examId} student=${dto.studentId}`
        : `Exam result created exam=${examId} student=${dto.studentId}`,
    });

    return result;
  }

  async updateResult(
    examId: string,
    resultId: string,
    dto: UpdateExamResultDto,
    user: { id: string; role: UserRole; branchId?: string | null },
  ) {
    const exam = await this.findOne(examId, user);
    const existing = await this.monthlyExamsRepository.findResultById(resultId);

    if (!existing || existing.examId !== examId) {
      throw new NotFoundException('Exam result not found');
    }

    const targetStudentId = dto.studentId ?? existing.studentId;
    if (dto.studentId) {
      const inGroup = await this.monthlyExamsRepository.findActiveStudentInGroup(dto.studentId, exam.groupId);
      if (!inGroup) {
        throw new BadRequestException('Student must be active in exam group');
      }

      const duplicate = await this.monthlyExamsRepository.findResultByExamStudent(examId, dto.studentId);
      if (duplicate && duplicate.id !== resultId) {
        throw new ConflictException('Exam result for this student already exists');
      }
    }

    const updated = await this.monthlyExamsRepository.updateResult(resultId, {
      ...(dto.studentId ? { student: { connect: { id: dto.studentId } } } : {}),
      ...(dto.result !== undefined ? { result: dto.result } : {}),
      ...(dto.comment !== undefined ? { comment: dto.comment } : {}),
      checkedAt: new Date(),
      createdBy: { connect: { id: user.id } },
    });

    await this.syncExamStatusByResults(examId);

    await this.monthlyExamsRepository.createActionLog({
      userId: user.id,
      role: user.role,
      action: 'EXAM_RESULT_UPDATED',
      module: 'MONTHLY_EXAMS',
      description: `Exam result updated exam=${examId} student=${targetStudentId}`,
    });

    return updated;
  }

  async deleteResult(examId: string, resultId: string, user: { id: string; role: UserRole; branchId?: string | null }) {
    await this.findOne(examId, user);
    const existing = await this.monthlyExamsRepository.findResultById(resultId);
    if (!existing || existing.examId !== examId) {
      throw new NotFoundException('Exam result not found');
    }

    const deleted = await this.monthlyExamsRepository.deleteResult(resultId);

    await this.syncExamStatusByResults(examId);

    await this.monthlyExamsRepository.createActionLog({
      userId: user.id,
      role: user.role,
      action: 'EXAM_RESULT_DELETED',
      module: 'MONTHLY_EXAMS',
      description: `Exam result deleted exam=${examId} student=${existing.studentId}`,
    });

    return deleted;
  }

  async listResults(examId: string, user: { role: UserRole; branchId?: string | null }) {
    await this.findOne(examId, user);
    return this.monthlyExamsRepository.listResults(examId, user);
  }

  async statistics(examId: string, user: { role: UserRole; branchId?: string | null }) {
    await this.findOne(examId, user);
    return this.monthlyExamsRepository.statistics(examId, user);
  }
}
