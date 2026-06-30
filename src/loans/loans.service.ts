import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Loan } from './entities/loan.entity';
import { ApplicationsService } from '../applications/applications.service';
import { ProductsService } from '../products/products.service';
import { RepaymentsService } from './repayments.service';
import { AuditService } from '../audit/audit.service';
import type { RoleId } from '../common/enums';

const tzs = (n: number) => `TZS ${Number(n).toLocaleString('en-US')}`;

@Injectable()
export class LoansService {
  constructor(
    @InjectRepository(Loan)
    private readonly loans: Repository<Loan>,
    private readonly applications: ApplicationsService,
    private readonly products: ProductsService,
    private readonly repayments: RepaymentsService,
    private readonly audit: AuditService,
  ) {}

  // Full lifecycle timeline for a loan: the originating application's trail
  // (submitted / reviewed / approved) merged with the loan's own events
  // (disbursed / payments / penalties), chronologically.
  async loanActivity(loanId: string) {
    const loan = await this.findOne(loanId);
    return this.audit.forEntities([loan.applicationId, loan.id]);
  }

  findAll(): Promise<Loan[]> {
    return this.loans.find({ order: { id: 'DESC' } });
  }

  async findOne(id: string): Promise<Loan> {
    const loan = await this.loans.findOne({ where: { id } });
    if (!loan) throw new NotFoundException(`Loan ${id} not found`);
    return loan;
  }

  // Materialise a loan account from an approved application and mark it Disbursed.
  async disburse(
    applicationId: string,
    channel: string,
    role?: RoleId,
  ): Promise<Loan> {
    const app = await this.applications.findOne(applicationId);
    const product = await this.products
      .findOne(app.product)
      .catch(() => null);

    const actor = AuditService.actorFor(role);
    const count = await this.loans.count();
    const loan = this.loans.create({
      id: 'LN-2026-0' + (220 + count),
      applicationId,
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
      createdBy: actor.actor,
      updatedBy: actor.actor,
    });

    await this.applications.patch(applicationId, { status: 'Disbursed', role });
    const saved = await this.loans.save(loan);
    // Generate the repayment schedule for the new account.
    await this.repayments.buildSchedule(saved);
    await this.audit.log(saved.id, {
      ...actor,
      action: 'Loan disbursed',
      detail: `${tzs(saved.principal)} via ${channel}`,
    });
    return saved;
  }

  // Record a repayment — allocates across penalties + installments and returns
  // the refreshed loan.
  async takePayment(
    loanId: string,
    amount: number,
    method?: string,
    reference?: string,
    role?: RoleId,
  ): Promise<Loan> {
    await this.findOne(loanId); // 404 if missing
    const { loan } = await this.repayments.recordPayment(
      loanId,
      amount,
      method,
      reference,
    );
    const actor = AuditService.actorFor(role);
    await this.audit.log(loanId, {
      ...actor,
      action: 'Payment received',
      detail: `${tzs(amount)}${method ? ` · ${method}` : ''}`,
    });
    return loan;
  }
}
