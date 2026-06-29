import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Loan } from './entities/loan.entity';
import { LoanInstallment } from './entities/loan-installment.entity';
import { LoanPayment } from './entities/loan-payment.entity';
import { LoanCharge } from './entities/loan-charge.entity';
import { LoansService } from './loans.service';
import { RepaymentsService } from './repayments.service';
import { LoansController } from './loans.controller';
import { ApplicationsModule } from '../applications/applications.module';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Loan, LoanInstallment, LoanPayment, LoanCharge]),
    ApplicationsModule,
    ProductsModule,
  ],
  controllers: [LoansController],
  providers: [LoansService, RepaymentsService],
  exports: [LoansService, RepaymentsService],
})
export class LoansModule {}
