export interface User {
  id: string;
  name: string;
  email: string;
  role: 'SUPERADMIN' | 'ADMIN';
}

export interface Admin {
  id: string;
  fullName: string;
  username: string;
  email: string;
  phone: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}

export interface Student {
  id: string;
  fullName: string;
  phone: string;
  parentPhone: string;
  groupId: string;
  groupName: string;
  courseId: string;
  courseName: string;
  monthlyFee: number;
  lastPaymentDate: string;
  nextPaymentDate: string;
  paymentStatus: 'PAID' | 'DUE_SOON' | 'OVERDUE' | 'NO_PAYMENT';
  examStatus: 'PASSED' | 'FAILED' | 'SKIPPED' | 'SENT_TO_RETAKE' | 'NOT_SUBMITTED' | 'PENDING';
  status: 'ACTIVE' | 'INACTIVE';
}

export interface Teacher {
  id: string;
  fullName: string;
  phone: string;
  subject: string;
  groupsCount: number;
  studentsCount: number;
  salary: number;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface Course {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  durationMonths: number;
  groupsCount: number;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}

export interface Group {
  id: string;
  name: string;
  courseId: string;
  courseName: string;
  teacherId: string;
  teacherName: string;
  lessonDays: string;
  lessonTime: string;
  monthlyFee: number;
  studentsCount: number;
  status: 'ACTIVE' | 'INACTIVE' | 'COMPLETED';
}

export interface Payment {
  id: string;
  studentId: string;
  studentName: string;
  groupId: string;
  groupName: string;
  courseName: string;
  amount: number;
  method: 'CASH' | 'CARD' | 'TRANSFER';
  paidDate: string;
  nextPaymentDate: string;
  createdBy: string;
  note: string;
}

export interface Debtor {
  id: string;
  studentId: string;
  studentName: string;
  phone: string;
  parentPhone: string;
  groupId: string;
  groupName: string;
  courseName: string;
  teacherName: string;
  monthlyFee: number;
  lastPaymentDate: string;
  nextPaymentDate: string;
  overdueDays: number;
  overdueMonths: number;
  debtAmount: number;
}

export interface MonthlyExam {
  id: string;
  title: string;
  courseId: string;
  courseName: string;
  groupId: string;
  groupName: string;
  examDate: string;
  status: 'SCHEDULED' | 'FINISHED' | 'CANCELLED';
  totalStudents: number;
  passedCount: number;
  failedCount: number;
  skippedCount: number;
  sentToRetakeCount: number;
}

export interface ExamResult {
  id: string;
  studentId: string;
  studentName: string;
  examId: string;
  examTitle: string;
  groupId: string;
  groupName: string;
  courseName: string;
  result: 'PASSED' | 'FAILED' | 'SKIPPED' | 'SENT_TO_RETAKE' | 'NOT_SUBMITTED';
  comment: string;
  checkedDate: string;
  checkedBy: string;
}

export interface DashboardStats {
  totalStudents: number;
  activeStudents: number;
  activeTeachers: number;
  activeCourses: number;
  activeGroups: number;
  thisMonthRevenue: number;
  todayPayments: number;
  cashThisMonth: number;
  cardThisMonth: number;
  transferThisMonth: number;
  debtorsCount: number;
  totalDebt: number;
  monthlyExamsCount: number;
  passedCount: number;
  failedCount: number;
  skippedCount: number;
  sentToRetakeCount: number;
  systemLogsCount: number;
}

export type LogAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'VIEW';
export type LogModule = 'STUDENTS' | 'TEACHERS' | 'GROUPS' | 'COURSES' | 'PAYMENTS' | 'EXAMS' | 'SETTINGS' | 'ADMINS' | 'AUTH';

export interface ActionLog {
  id: string;
  date: string;
  user: string;
  role: 'SUPERADMIN' | 'ADMIN';
  action: LogAction;
  module: LogModule;
  description: string;
  ipAddress: string;
}

export interface ErrorLog {
  id: string;
  date: string;
  user: string;
  path: string;
  method: string;
  message: string;
  statusCode: number;
}
