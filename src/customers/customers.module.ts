import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Customer } from './entities/customer.entity';
import { CustomerDocument } from './entities/customer-document.entity';
import { CustomerAccount } from './entities/customer-account.entity';
import { CustomersService } from './customers.service';
import { CustomersController } from './customers.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Customer, CustomerDocument, CustomerAccount]),
    AuditModule,
  ],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}
