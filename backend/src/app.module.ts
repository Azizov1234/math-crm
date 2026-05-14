import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import appConfig from './config/app.config';
import jwtConfig from './config/jwt.config';
import uploadConfig from './config/upload.config';
import { CommonModule } from './common/common.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { BranchesModule } from './modules/branches/branches.module';
import { CoursesModule } from './modules/courses/courses.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { DebtorsModule } from './modules/debtors/debtors.module';
import { ExamResultsModule } from './modules/exam-results/exam-results.module';
import { GroupsModule } from './modules/groups/groups.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { MonthlyExamsModule } from './modules/monthly-exams/monthly-exams.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { SettingsModule } from './modules/settings/settings.module';
import { StudentsModule } from './modules/students/students.module';
import { SystemLogsModule } from './modules/system-logs/system-logs.module';
import { SystemModule } from './modules/system/system.module';
import { TeachersModule } from './modules/teachers/teachers.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, jwtConfig, uploadConfig],
      envFilePath: ['.env'],
    }),
    CommonModule,
    JwtModule.register({ global: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    BranchesModule,
    TeachersModule,
    StudentsModule,
    CoursesModule,
    GroupsModule,
    PaymentsModule,
    InvoicesModule,
    DebtorsModule,
    MonthlyExamsModule,
    ExamResultsModule,
    DashboardModule,
    SettingsModule,
    SystemLogsModule,
    SystemModule,
  ],
  controllers: [],
  providers: [
    HttpExceptionFilter,
  ],
}) 
export class AppModule {}
 
