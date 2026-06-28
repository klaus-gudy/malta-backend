import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { LoansService } from './loans.service';
import { DisburseDto, TakePaymentDto } from './dto/loan.dto';

// Exposed as "loans" — these are the Loan Accounts shown in the frontend.
@Controller('loans')
export class LoansController {
  constructor(private readonly loans: LoansService) {}

  @Get()
  findAll() {
    return this.loans.findAll();
  }

  // Disbursements module: create a loan from an approved application.
  @Post('disburse')
  disburse(@Body() dto: DisburseDto) {
    return this.loans.disburse(dto.applicationId, dto.channel);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.loans.findOne(id);
  }

  // Collections module: record a repayment against a loan.
  @Post(':id/payments')
  takePayment(@Param('id') id: string, @Body() dto: TakePaymentDto) {
    return this.loans.takePayment(id, dto.amount);
  }
}
