import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Loan } from './entities/loan.entity';
import { ApplicationsService } from '../applications/applications.service';
import { ProductsService } from '../products/products.service';
import { RepaymentsService } from './repayments.service';

@Injectable()
export class LoansService {
  constructor(
    @InjectRepository(Loan)
    private readonly loans: Repository<Loan>,
    private readonly applications: ApplicationsService,
    private readonly products: ProductsService,
    private readonly repayments: RepaymentsService,
  ) {}

  findAll(): Promise<Loan[]> {
    return this.loans.find({ order: { id: 'DESC' } });
  }

  async findOne(id: string): Promise<Loan> {
    const loan = await this.loans.findOne({ where: { id } });
    if (!loan) throw new NotFoundException(`Loan ${id} not found`);
    return loan;
  }

  // Materialise a loan account from an approved application and mark it Disbursed.
  async disburse(applicationId: string, channel: string): Promise<Loan> {
    const app = await this.applications.findOne(applicationId);
    const product = await this.products
      .findOne(app.product)
      .catch(() => null);

    const count = await this.loans.count();
    const loan = this.loans.create({
      id: 'LN-2026-0' + (220 + count),
      customer: app.customer,
      product: app.product,
      principal: app.amount,
      rate: product?.rate ?? 0,
      term: app.term,
      method: product?.method ?? 'Flat',
      disbursed: new Date().toISOString().slice(0, 10),
      channel,
      status: 'Active',
      paid: 0,
    });

    await this.applications.patch(applicationId, { status: 'Disbursed' });
    const saved = await this.loans.save(loan);
    // Generate the repayment schedule for the new account.
    await this.repayments.buildSchedule(saved);
    return saved;
  }

  // Record a repayment — allocates across penalties + installments and returns
  // the refreshed loan.
  async takePayment(
    loanId: string,
    amount: number,
    method?: string,
    reference?: string,
  ): Promise<Loan> {
    await this.findOne(loanId); // 404 if missing
    const { loan } = await this.repayments.recordPayment(
      loanId,
      amount,
      method,
      reference,
    );
    return loan;
  }
}
