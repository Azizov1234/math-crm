import { PrismaClient, UserRole, Status, PaymentMethod, ExamStatus, ExamResultStatus, GroupStudentStatus, BillingStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const SUPERADMIN_USERNAME = process.env.SUPERADMIN_USERNAME ?? 'superadmin';
const SUPERADMIN_PASSWORD = process.env.SUPERADMIN_PASSWORD ?? 'superadmin123';
const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS ?? 10);

function addOneCalendarMonth(date: Date): Date {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();

  const targetMonth = month + 1;
  const targetYear = year + Math.floor(targetMonth / 12);
  const normalizedTargetMonth = targetMonth % 12;

  const lastDayOfTargetMonth = new Date(targetYear, normalizedTargetMonth + 1, 0).getDate();
  const finalDay = Math.min(day, lastDayOfTargetMonth);
  return new Date(targetYear, normalizedTargetMonth, finalDay, date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds());
}

function addMonths(date: Date, months: number): Date {
  let result = new Date(date);
  const step = months >= 0 ? 1 : -1;
  for (let i = 0; i < Math.abs(months); i += 1) {
    result = step > 0 ? addOneCalendarMonth(result) : new Date(result.getFullYear(), result.getMonth() - 1, Math.min(result.getDate(), new Date(result.getFullYear(), result.getMonth(), 0).getDate()), result.getHours(), result.getMinutes(), result.getSeconds(), result.getMilliseconds());
  }
  return result;
}

function randomFrom<T>(values: T[]): T {
  return values[Math.floor(Math.random() * values.length)];
}

async function clearDatabase() {
  await prisma.monthlyExamResult.deleteMany();
  await prisma.monthlyExam.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.studentBilling.deleteMany();
  await prisma.groupStudent.deleteMany();
  await prisma.groupTeacher.deleteMany();
  await prisma.group.deleteMany();
  await prisma.course.deleteMany();
  await prisma.teacher.deleteMany();
  await prisma.student.deleteMany();
  await prisma.actionLog.deleteMany();
  await prisma.errorLog.deleteMany();
  await prisma.uploadedFile.deleteMany();
  await prisma.systemSettings.deleteMany();
  await prisma.user.deleteMany();
  await prisma.branch.deleteMany();
}

async function main() {
  await clearDatabase();

  const [superadminHash, adminHash] = await Promise.all([
    bcrypt.hash(SUPERADMIN_PASSWORD, SALT_ROUNDS),
    bcrypt.hash('admin12345', SALT_ROUNDS),
  ]);

  const branchMain = await prisma.branch.create({
    data: {
      name: 'Main Academy',
      address: 'Tashkent, Chilonzor',
      phone: '+998900001001',
      status: Status.ACTIVE,
    },
  });

  const superadmin = await prisma.user.create({
    data: {
      fullName: 'System Superadmin',
      username: SUPERADMIN_USERNAME,
      email: 'superadmin@academy.local',
      phone: '+998900000001',
      password: superadminHash,
      role: UserRole.SUPERADMIN,
      status: Status.ACTIVE,
    },
  });

  const adminMain = await prisma.user.create({
    data: {
      fullName: 'Main Branch Admin',
      username: 'admin_main',
      email: 'admin_main@academy.local',
      phone: '+998900000002',
      password: adminHash,
      role: UserRole.ADMIN,
      status: Status.ACTIVE,
      branchId: branchMain.id,
    },
  });

  const teachers: Array<{ id: string; branchId: string; fullName: string }> = [];
  for (let i = 1; i <= 10; i += 1) {
    const branchId = branchMain.id;
    const teacher = await prisma.teacher.create({
      data: {
        branchId,
        fullName: `Teacher ${i}`,
        phone: `+998901100${String(i).padStart(2, '0')}`,
        subject: randomFrom(['Math', 'English', 'Physics', 'Chemistry', 'Biology']),
        salary: 2000 + i * 100,
        status: Status.ACTIVE,
      },
    });

    teachers.push({ id: teacher.id, branchId: teacher.branchId, fullName: teacher.fullName });
  }

  const courses: Array<{ id: string; branchId: string; name: string; monthlyPrice: number }> = [];
  for (let i = 1; i <= 8; i += 1) {
    const branchId = branchMain.id;
    const course = await prisma.course.create({
      data: {
        branchId,
        name: `Course ${i}`,
        description: `Program for Course ${i}`,
        monthlyPrice: 350000 + i * 25000,
        durationMonths: 6 + (i % 6),
        status: Status.ACTIVE,
      },
    });

    courses.push({ id: course.id, branchId: course.branchId, name: course.name, monthlyPrice: Number(course.monthlyPrice) });
  }

  const groups: Array<{ id: string; branchId: string; courseId: string; monthlyFee: number; name: string }> = [];
  for (let i = 1; i <= 15; i += 1) {
    const branchId = branchMain.id;
    const branchCourses = courses.filter((item) => item.branchId === branchId);
    const branchTeachers = teachers.filter((item) => item.branchId === branchId);
    const course = randomFrom(branchCourses);
    const teacher = randomFrom(branchTeachers);

    const group = await prisma.group.create({
      data: {
        branchId,
        courseId: course.id,
        name: `Group-${i}`,
        lessonDays: randomFrom(['Mon/Wed/Fri', 'Tue/Thu/Sat', 'Mon/Thu']),
        lessonTime: randomFrom(['09:00', '11:00', '14:00', '16:00']),
        startDate: addMonths(new Date(), -2),
        endDate: addMonths(new Date(), 6),
        monthlyFee: course.monthlyPrice,
        status: Status.ACTIVE,
      },
    });

    await prisma.groupTeacher.create({
      data: {
        groupId: group.id,
        teacherId: teacher.id,
      },
    });

    groups.push({
      id: group.id,
      branchId: group.branchId,
      courseId: group.courseId,
      monthlyFee: Number(group.monthlyFee),
      name: group.name,
    });
  }

  const students: Array<{ id: string; branchId: string; status: Status; fullName: string }> = [];
  for (let i = 1; i <= 50; i += 1) {
    const branchId = branchMain.id;
    const status = i <= 40 ? Status.ACTIVE : Status.INACTIVE;
    const student = await prisma.student.create({
      data: {
        branchId,
        fullName: `Student ${i}`,
        phone: `+998902200${String(i).padStart(2, '0')}`,
        parentPhone: `+998903300${String(i).padStart(2, '0')}`,
        birthDate: new Date(2008, (i % 12), (i % 28) + 1),
        status,
        deactivatedAt: status === Status.INACTIVE ? addMonths(new Date(), -1) : null,
      },
    });

    students.push({ id: student.id, branchId: student.branchId, status: student.status, fullName: student.fullName });
  }

  const activeStudents = students.filter((item) => item.status === Status.ACTIVE);
  const memberships: Array<{ studentId: string; groupId: string; branchId: string; monthlyFee: number }> = [];

  for (const student of activeStudents) {
    const branchGroups = groups.filter((group) => group.branchId === student.branchId);
    const group = randomFrom(branchGroups);

    await prisma.groupStudent.create({
      data: {
        groupId: group.id,
        studentId: student.id,
        status: GroupStudentStatus.ACTIVE,
      },
    });

    memberships.push({
      studentId: student.id,
      groupId: group.id,
      branchId: group.branchId,
      monthlyFee: group.monthlyFee,
    });
  }

  const now = new Date();
  const overdueStudentIds = new Set(activeStudents.slice(0, 12).map((item) => item.id));

  for (const membership of memberships) {
    const isOverdue = overdueStudentIds.has(membership.studentId);

    const paymentMonthsAgo = isOverdue ? randomFrom([2, 3, 4]) : randomFrom([0, 0, 1]);
    const paidAt = addMonths(now, -paymentMonthsAgo);
    const nextPaymentDate = addOneCalendarMonth(paidAt);

    await prisma.studentBilling.create({
      data: {
        studentId: membership.studentId,
        groupId: membership.groupId,
        branchId: membership.branchId,
        monthlyFee: membership.monthlyFee,
        status: BillingStatus.ACTIVE,
        lastPaymentDate: paidAt,
        nextPaymentDate,
      },
    });

    await prisma.payment.create({
      data: {
        studentId: membership.studentId,
        groupId: membership.groupId,
        branchId: membership.branchId,
        amount: membership.monthlyFee,
        method: randomFrom([PaymentMethod.CASH, PaymentMethod.CARD, PaymentMethod.TRANSFER]),
        paidAt,
        paymentForMonth: paidAt.getMonth() + 1,
        paymentForYear: paidAt.getFullYear(),
        note: isOverdue ? 'Historical payment' : 'Regular payment',
        createdById: adminMain.id,
      },
    });

    if (!isOverdue && Math.random() > 0.6) {
      const secondPaidAt = addMonths(paidAt, 1);
      await prisma.payment.create({
        data: {
          studentId: membership.studentId,
          groupId: membership.groupId,
          branchId: membership.branchId,
          amount: membership.monthlyFee,
          method: randomFrom([PaymentMethod.CASH, PaymentMethod.CARD, PaymentMethod.TRANSFER]),
          paidAt: secondPaidAt,
          paymentForMonth: secondPaidAt.getMonth() + 1,
          paymentForYear: secondPaidAt.getFullYear(),
          note: 'Additional payment',
          createdById: adminMain.id,
        },
      });

      await prisma.studentBilling.update({
        where: { studentId_groupId: { studentId: membership.studentId, groupId: membership.groupId } },
        data: {
          lastPaymentDate: secondPaidAt,
          nextPaymentDate: addOneCalendarMonth(secondPaidAt),
        },
      });
    }
  }

  const exams: Array<{ id: string; groupId: string; branchId: string }> = [];
  for (let i = 1; i <= 12; i += 1) {
    const group = randomFrom(groups);
    const exam = await prisma.monthlyExam.create({
      data: {
        branchId: group.branchId,
        courseId: group.courseId,
        groupId: group.id,
        title: `Monthly Exam ${i}`,
        examDate: addMonths(new Date(), -((i % 4) + 1)),
        status: randomFrom([ExamStatus.SCHEDULED, ExamStatus.FINISHED, ExamStatus.CANCELLED]),
      },
    });

    exams.push({ id: exam.id, groupId: exam.groupId, branchId: exam.branchId });
  }

  for (const exam of exams) {
    const groupStudents = memberships.filter((item) => item.groupId === exam.groupId).slice(0, 8);
    for (const membership of groupStudents) {
      await prisma.monthlyExamResult.create({
        data: {
          examId: exam.id,
          studentId: membership.studentId,
          result: randomFrom([
            ExamResultStatus.PASSED,
            ExamResultStatus.FAILED,
            ExamResultStatus.SKIPPED,
            ExamResultStatus.SENT_TO_RETAKE,
          ]),
          comment: 'Seeded monthly exam result',
          checkedAt: new Date(),
          createdById: adminMain.id,
        },
      });
    }
  }

  await prisma.systemSettings.create({
    data: {
      academyName: 'Academy CRM Premium',
      phone: '+998900000010',
      address: 'Tashkent, Uzbekistan',
      description: 'Seeded settings for Academy CRM backend',
      updatedById: superadmin.id,
    },
  });

  const baseLogs = [
    { action: 'LOGIN', module: 'AUTH', description: 'Superadmin logged in', userId: superadmin.id, role: UserRole.SUPERADMIN },
    { action: 'ADMIN_CREATED', module: 'ADMINS', description: 'Admin account created', userId: superadmin.id, role: UserRole.SUPERADMIN },
    { action: 'STUDENT_CREATED', module: 'STUDENTS', description: 'Student records created by seed', userId: adminMain.id, role: UserRole.ADMIN },
    { action: 'PAYMENT_CREATED', module: 'PAYMENTS', description: 'Payments created by seed', userId: adminMain.id, role: UserRole.ADMIN },
    { action: 'MONTHLY_EXAM_CREATED', module: 'MONTHLY_EXAMS', description: 'Monthly exams created by seed', userId: adminMain.id, role: UserRole.ADMIN },
    { action: 'SETTINGS_UPDATED', module: 'SETTINGS', description: 'Settings initialized by seed', userId: superadmin.id, role: UserRole.SUPERADMIN },
  ];

  await prisma.actionLog.createMany({
    data: baseLogs.map((log, index) => ({
      ...log,
      ipAddress: '127.0.0.1',
      userAgent: 'seed-script',
      createdAt: addMonths(new Date(), -(index % 3)),
    })),
  });

  console.log('Seed completed successfully.');
  console.log('Login credentials:');
  console.log(`- superadmin / ${SUPERADMIN_PASSWORD}`);
  console.log('- admin_main / admin12345');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
