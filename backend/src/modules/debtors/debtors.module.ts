import { Module } from '@nestjs/common';
import { DebtorsController } from './debtors.controller';
import { DebtorsRepository } from './debtors.repository';
import { DebtorsService } from './debtors.service';

@Module({
  controllers: [DebtorsController],
  providers: [DebtorsService, DebtorsRepository],
  exports: [DebtorsService, DebtorsRepository],
})
export class DebtorsModule {}
