import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Loan } from './entities/loan.entity';
import { ApplicationsService } from '../applications/applications.service';
import { ProductsService } from '../products/products.service';

@Injectable()
export class LoansService {
  constructor(
    @InjectRepository(Loan)
    private readonly loans: Repository<Loan>,
    private readonly applications: ApplicationsService,
    private readonly products: ProductsService,
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
    return this.loans.save(loan);
  }

  // Record a repayment: advance one instalment, clearing an Overdue flag.
  async takePayment(loanId: string, _amount?: number): Promise<Loan> {
    const loan = await this.findOne(loanId);
    loan.paid = Math.min(loan.term, loan.paid + 1);
    if (loan.status === 'Overdue') loan.status = 'Active';
    return this.loans.save(loan);
  }
}
