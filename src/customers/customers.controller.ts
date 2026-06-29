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
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { UploadDocumentDto } from './dto/upload-document.dto';
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

  // Edit customer profile details.
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.customers.update(id, dto);
  }

  @Get(':id/documents')
  documents(@Param('id') id: string) {
    return this.customers.documentsFor(id);
  }

  // Upload a new document (name + base64 contents) for a customer.
  @Post(':id/documents')
  uploadDocument(@Param('id') id: string, @Body() dto: UploadDocumentDto) {
    return this.customers.addDocument(id, dto);
  }

  @Patch(':id/kyc')
  setKyc(@Param('id') id: string, @Body() dto: SetKycDto) {
    return this.customers.setKyc(id, dto.status);
  }

  // Verify or reject a document.
  @Patch('documents/:docId/status')
  setDocStatus(@Param('docId') docId: string, @Body() dto: SetDocStatusDto) {
    return this.customers.setDocStatus(docId, dto.status);
  }

  // Download/preview a document's contents.
  @Get('documents/:docId/content')
  documentContent(@Param('docId') docId: string) {
    return this.customers.documentContent(docId);
  }
}
