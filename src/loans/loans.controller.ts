import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { LoansService } from './loans.service';
import { RepaymentsService } from './repayments.service';
import { DisburseDto, TakePaymentDto } from './dto/loan.dto';

// Exposed as "loans" — these are the Loan Accounts shown in the frontend.
@Controller('loans')
export class LoansController {
  constructor(
    private readonly loans: LoansService,
    private readonly repayments: RepaymentsService,
  ) {}

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

  // Repayment schedule (installments), transactions and accrued charges.
  @Get(':id/schedule')
  schedule(@Param('id') id: string) {
    return this.repayments.getSchedule(id);
  }

  @Get(':id/payments')
  payments(@Param('id') id: string) {
    return this.repayments.getPayments(id);
  }

  @Get(':id/charges')
  charges(@Param('id') id: string) {
    return this.repayments.getCharges(id);
  }

  // Repayment metrics (repaid, outstanding, overpaid, progress).
  @Get(':id/summary')
  summary(@Param('id') id: string) {
    return this.repayments.getSummary(id);
  }

  // Collections module: record a repayment against a loan.
  @Post(':id/payments')
  takePayment(@Param('id') id: string, @Body() dto: TakePaymentDto) {
    return this.loans.takePayment(id, dto.amount, dto.method, dto.reference);
  }
}
