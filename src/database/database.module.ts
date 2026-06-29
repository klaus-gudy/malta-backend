import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedService } from './seed.service';
import { Customer } from '../customers/entities/customer.entity';
import { Product } from '../products/entities/product.entity';
import { Application } from '../applications/entities/application.entity';
import { Loan } from '../loans/entities/loan.entity';
import { User } from '../users/entities/user.entity';
import { AuditEntry } from '../audit/entities/audit-entry.entity';
import { UsersModule } from '../users/users.module';
import { CustomersModule } from '../customers/customers.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Customer,
      Product,
      Application,
      Loan,
      User,
      AuditEntry,
    ]),
    UsersModule,
    CustomersModule,
  ],
  providers: [SeedService],
})
export class DatabaseModule {}
