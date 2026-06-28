import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Customer } from './entities/customer.entity';
import { DocumentOverride } from './entities/document-override.entity';
import { CustomersService } from './customers.service';
import { CustomersController } from './customers.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Customer, DocumentOverride])],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}
