import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Loan } from '../loans/entities/loan.entity';
import { LoanInstallment } from '../loans/entities/loan-installment.entity';
import { LoanPayment } from '../loans/entities/loan-payment.entity';
import { LoanCharge } from '../loans/entities/loan-charge.entity';
import { Application } from '../applications/entities/application.entity';
import { Product } from '../products/entities/product.entity';
import { Customer } from '../customers/entities/customer.entity';
import { AuditService } from '../audit/audit.service';

const ACTIVE_STATUSES = ['Active', 'Overdue'];
const PENDING_STATUSES = ['Submitted', 'Under Review'];

// A YYYY-MM-DD value falls within [from, to] (inclusive). ISO date strings sort
// lexicographically, so plain string comparison is correct here.
const inRange = (d: string, from: string, to: string) =>
  !!d && d >= from && d <= to;
const onOrBefore = (d: string, to: string) => !!d && d <= to;

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Loan) private readonly loans: Repository<Loan>,
    @InjectRepository(LoanInstallment)
    private readonly installments: Repository<LoanInstallment>,
    @InjectRepository(LoanPayment)
    private readonly payments: Repository<LoanPayment>,
    @InjectRepository(LoanCharge)
    private readonly charges: Repository<LoanCharge>,
    @InjectRepository(Application)
    private readonly applications: Repository<Application>,
    @InjectRepository(Product) private readonly products: Repository<Product>,
    @InjectRepository(Customer) private readonly customers: Repository<Customer>,
    private readonly audit: AuditService,
  ) {}

  // One round-trip powering the whole dashboard. Snapshot metrics (outstanding,
  // active loans, pending approvals, product performance, recent applications)
  // are computed as-of `to`; flow metrics (collected) cover the [from, to]
  // window. Recent activity is the live, global audit feed.
  async overview(from: string, to: string) {
    const [
      loans,
      installments,
      charges,
      payments,
      applications,
      products,
      customers,
    ] = await Promise.all([
      this.loans.find(),
      this.installments.find(),
      this.charges.find(),
      this.payments.find(),
      this.applications.find(),
      this.products.find(),
      this.customers.find(),
    ]);

    const custName = new Map(customers.map((c) => [c.id, c.name]));
    const prodName = new Map(products.map((p) => [p.id, p.name]));

    // ---- snapshot: loans active as of `to` ----
    const activeLoans = loans.filter(
      (l) => onOrBefore(l.disbursed, to) && ACTIVE_STATUSES.includes(l.status),
    );
    const activeIds = new Set(activeLoans.map((l) => l.id));

    let outstanding = 0;
    for (const i of installments) {
      if (activeIds.has(i.loanId)) {
        outstanding += Math.max(0, Number(i.total) - Number(i.paidAmount));
      }
    }
    for (const c of charges) {
      if (activeIds.has(c.loanId) && c.status === 'Outstanding') {
        outstanding += Number(c.amount);
      }
    }

    // ---- snapshot: pending approvals as of `to` ----
    const pendingApprovals = applications.filter(
      (a) => onOrBefore(a.created, to) && PENDING_STATUSES.includes(a.status),
    ).length;

    // ---- flow: collected within [from, to] ----
    const collectedPayments = payments.filter((p) => inRange(p.date, from, to));
    const collected = collectedPayments.reduce(
      (s, p) => s + Number(p.amount),
      0,
    );

    // ---- flow: disbursed within [from, to] ----
    const disbursedInRange = loans.filter((l) => inRange(l.disbursed, from, to));
    const disbursedAmount = disbursedInRange.reduce(
      (s, l) => s + Number(l.principal),
      0,
    );

    // ---- flow: applications submitted within [from, to] ----
    const newApplications = applications.filter((a) =>
      inRange(a.created, from, to),
    ).length;

    const metrics = {
      outstanding,
      activeLoans: activeLoans.length,
      pendingApprovals,
      collected,
      receipts: collectedPayments.length,
      newApplications,
      disbursedCount: disbursedInRange.length,
      disbursedAmount,
    };

    // ---- product performance (cumulative as of `to`) ----
    const productPerformance = products
      .map((p) => {
        const apps = applications.filter(
          (a) => a.product === p.id && onOrBefore(a.created, to),
        );
        const prodLoans = loans.filter(
          (l) => l.product === p.id && onOrBefore(l.disbursed, to),
        );
        const active = prodLoans.filter((l) =>
          ACTIVE_STATUSES.includes(l.status),
        ).length;
        const disbursed = prodLoans.reduce(
          (s, l) => s + Number(l.principal),
          0,
        );
        return {
          id: p.id,
          name: p.name,
          category: p.category,
          applications: apps.length,
          activeLoans: active,
          disbursed,
        };
      })
      // Only the top 5 products by amount disbursed.
      .sort((a, b) => b.disbursed - a.disbursed)
      .slice(0, 5);

    // ---- recent applications (as of `to`) ----
    const recentApplications = applications
      .filter((a) => onOrBefore(a.created, to))
      .sort((a, b) => b.id.localeCompare(a.id))
      .slice(0, 5)
      .map((a) => ({
        id: a.id,
        customer: custName.get(a.customer) ?? a.customer,
        product: prodName.get(a.product) ?? a.product,
        amount: Number(a.amount),
        status: a.status,
        created: a.created,
        officer: a.officer,
      }));

    // ---- recent activity (live, global) ----
    const recentActivity = await this.audit.recent(5);

    return { metrics, productPerformance, recentApplications, recentActivity };
  }
}
