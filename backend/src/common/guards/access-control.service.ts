import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AccessControlService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveBranchIdFromRequest(request: Record<string, any>): Promise<string | null> {
    const directBranchId =
      request.params?.branchId ??
      request.body?.branchId ??
      request.query?.branchId ??
      request.body?.data?.branchId ??
      null;

    if (typeof directBranchId === 'string' && directBranchId.trim().length > 0) {
      return directBranchId;
    }

    const studentId = request.params?.studentId ?? request.body?.studentId ?? request.query?.studentId;
    if (studentId) {
      const student = await this.prisma.student.findUnique({
        where: { id: String(studentId) },
        select: { branchId: true },
      });
      return student?.branchId ?? null;
    }

    const teacherId = request.params?.teacherId ?? request.body?.teacherId ?? request.query?.teacherId;
    if (teacherId) {
      const teacher = await this.prisma.teacher.findUnique({
        where: { id: String(teacherId) },
        select: { branchId: true },
      });
      return teacher?.branchId ?? null;
    }

    const groupId = request.params?.groupId ?? request.body?.groupId ?? request.query?.groupId;
    if (groupId) {
      const group = await this.prisma.group.findUnique({
        where: { id: String(groupId) },
        select: { branchId: true },
      });
      return group?.branchId ?? null;
    }

    const courseId = request.params?.courseId ?? request.body?.courseId ?? request.query?.courseId;
    if (courseId) {
      const course = await this.prisma.course.findUnique({
        where: { id: String(courseId) },
        select: { branchId: true },
      });
      return course?.branchId ?? null;
    }

    const paymentId = request.params?.paymentId ?? request.body?.paymentId;
    if (paymentId) {
      const payment = await this.prisma.payment.findUnique({
        where: { id: String(paymentId) },
        select: { branchId: true },
      });
      return payment?.branchId ?? null;
    }

    const billingId = request.params?.billingId ?? request.body?.billingId;
    if (billingId) {
      const billing = await this.prisma.studentBilling.findUnique({
        where: { id: String(billingId) },
        select: { branchId: true },
      });
      return billing?.branchId ?? null;
    }

    const examId = request.params?.examId ?? request.body?.examId;
    if (examId) {
      const exam = await this.prisma.monthlyExam.findUnique({
        where: { id: String(examId) },
        select: { branchId: true },
      });
      return exam?.branchId ?? null;
    }

    const examResultId = request.params?.resultId ?? request.body?.resultId;
    if (examResultId) {
      const result = await this.prisma.monthlyExamResult.findUnique({
        where: { id: String(examResultId) },
        select: { exam: { select: { branchId: true } } },
      });
      return result?.exam.branchId ?? null;
    }

    const commonId = request.params?.id;
    if (!commonId || typeof commonId !== 'string') {
      return null;
    }

    if (request.path?.startsWith('/students/')) {
      const student = await this.prisma.student.findUnique({ where: { id: commonId }, select: { branchId: true } });
      return student?.branchId ?? null;
    }

    if (request.path?.startsWith('/teachers/')) {
      const teacher = await this.prisma.teacher.findUnique({ where: { id: commonId }, select: { branchId: true } });
      return teacher?.branchId ?? null;
    }

    if (request.path?.startsWith('/groups/')) {
      const group = await this.prisma.group.findUnique({ where: { id: commonId }, select: { branchId: true } });
      return group?.branchId ?? null;
    }

    if (request.path?.startsWith('/courses/')) {
      const course = await this.prisma.course.findUnique({ where: { id: commonId }, select: { branchId: true } });
      return course?.branchId ?? null;
    }

    if (request.path?.startsWith('/payments/')) {
      const payment = await this.prisma.payment.findUnique({ where: { id: commonId }, select: { branchId: true } });
      return payment?.branchId ?? null;
    }

    if (request.path?.startsWith('/monthly-exams/')) {
      const exam = await this.prisma.monthlyExam.findUnique({ where: { id: commonId }, select: { branchId: true } });
      return exam?.branchId ?? null;
    }

    if (request.path?.startsWith('/exam-results/')) {
      const result = await this.prisma.monthlyExamResult.findUnique({
        where: { id: commonId },
        select: { exam: { select: { branchId: true } } },
      });
      return result?.exam.branchId ?? null;
    }

    if (request.path?.startsWith('/admins/')) {
      const admin = await this.prisma.user.findUnique({ where: { id: commonId }, select: { branchId: true } });
      return admin?.branchId ?? null;
    }

    if (request.path?.startsWith('/branches/')) {
      return commonId;
    }

    return null;
  }
}
