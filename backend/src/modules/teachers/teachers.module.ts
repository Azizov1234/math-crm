import { Module } from '@nestjs/common';
import { TeachersController } from './teachers.controller';
import { TeachersRepository } from './teachers.repository';
import { TeachersService } from './teachers.service';

@Module({
  controllers: [TeachersController],
  providers: [TeachersService, TeachersRepository],
  exports: [TeachersService],
})
export class TeachersModule {}
