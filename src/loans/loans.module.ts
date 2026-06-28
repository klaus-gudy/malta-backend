import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Loan } from './entities/loan.entity';
import { LoansService } from './loans.service';
import { LoansController } from './loans.controller';
import { ApplicationsModule } from '../applications/applications.module';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Loan]),
    ApplicationsModule,
    ProductsModule,
  ],
  controllers: [LoansController],
  providers: [LoansService],
  exports: [LoansService],
})
export class LoansModule {}
