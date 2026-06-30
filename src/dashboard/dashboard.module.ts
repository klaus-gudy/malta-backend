import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Loan } from '../loans/entities/loan.entity';
import { LoanInstallment } from '../loans/entities/loan-installment.entity';
import { LoanPayment } from '../loans/entities/loan-payment.entity';
import { LoanCharge } from '../loans/entities/loan-charge.entity';
import { Application } from '../applications/entities/application.entity';
import { Product } from '../products/entities/product.entity';
import { Customer } from '../customers/entities/customer.entity';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Loan,
      LoanInstallment,
      LoanPayment,
      LoanCharge,
      Application,
      Product,
      Customer,
    ]),
    AuditModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
