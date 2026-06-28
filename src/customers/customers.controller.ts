import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { SetDocStatusDto, SetKycDto } from './dto/set-kyc.dto';

@Controller('customers')
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  findAll() {
    return this.customers.findAll();
  }

  @Post()
  create(@Body() dto: CreateCustomerDto) {
    return this.customers.create(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.customers.findOne(id);
  }

  @Get(':id/documents')
  documents(@Param('id') id: string) {
    return this.customers.documentsFor(id);
  }

  @Patch(':id/kyc')
  setKyc(@Param('id') id: string, @Body() dto: SetKycDto) {
    return this.customers.setKyc(id, dto.status);
  }

  // Document ids are synthetic (e.g. "CUS-1003-D3"); the customer routes own them.
  @Patch('documents/:docId/status')
  setDocStatus(@Param('docId') docId: string, @Body() dto: SetDocStatusDto) {
    return this.customers.setDocStatus(docId, dto.status);
  }
}
