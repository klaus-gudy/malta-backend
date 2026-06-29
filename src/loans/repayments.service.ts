import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Loan } from './entities/loan.entity';
import { LoanInstallment } from './entities/loan-installment.entity';
import { LoanPayment } from './entities/loan-payment.entity';
import { LoanCharge } from './entities/loan-charge.entity';
import { ProductsService } from '../products/products.service';

// The app's "today" — matches the seeded 2026 demo timeline.
const today = () => new Date().toISOString().slice(0, 10);

const addMonths = (iso: string, n: number): string => {
  const d = new Date(iso);
  d.setMonth(d.getMonth() + n);
  return d.toISOString().slice(0, 10);
};

// How many penalty periods an overdue installment has accrued: 1 the moment it
// is missed, then +1 for each completed monthly period it stays unpaid.
const overduePeriods = (dueDate: string, now: string): number => {
  if (dueDate >= now) return 0;
  let periods = 1;
  while (addMonths(dueDate, periods) <= now) periods++;
  return periods;
};

@Injectable()
export class RepaymentsService {
  constructor(
    @InjectRepository(Loan)
    private readonly loans: Repository<Loan>,
    @InjectRepository(LoanInstallment)
    private readonly installments: Repository<LoanInstallment>,
    @InjectRepository(LoanPayment)
    private readonly payments: Repository<LoanPayment>,
    @InjectRepository(LoanCharge)
    private readonly charges: Repository<LoanCharge>,
    private readonly products: ProductsService,
  ) {}

  // ---- schedule generation (flat / reducing balance) ----
  // Faithful port of the frontend's lib/format.ts schedule().
  private buildRows(
    principal: number,
    ratePct: number,
    term: number,
    method: string,
    startDate: string,
  ): Omit<LoanInstallment, 'id' | 'loanId' | 'status' | 'paidAmount' | 'paidDate'>[] {
    const rows: Array<{
      n: number;
      dueDate: string;
      principal: number;
      interest: number;
      fee: number;
      total: number;
      balance: number;
    }> = [];
    const start = startDate ? new Date(startDate) : new Date('2026-06-10');

    if (method && method.indexOf('Reducing') >= 0) {
      const mr = ratePct / 100 / 12;
      let bal = principal;
      const pay = Math.round((principal * mr) / (1 - Math.pow(1 + mr, -term)));
      for (let i = 1; i <= term; i++) {
        const interest = Math.round(bal * mr);
        let prin = pay - interest;
        if (i === term) prin = bal;
        bal = Math.max(0, bal - prin);
        const due = new Date(start);
        due.setMonth(start.getMonth() + i);
        rows.push({
          n: i,
          dueDate: due.toISOString().slice(0, 10),
          principal: prin,
          interest,
          fee: 0,
          total: prin + interest,
          balance: bal,
        });
      }
    } else {
      const totalInt = Math.round(principal * (ratePct / 100) * (term / 12));
      const perInt = Math.round(totalInt / term);
      const perPrin = Math.round(principal / term);
      let bal = principal;
      for (let i = 1; i <= term; i++) {
        let prin = perPrin;
        if (i === term) prin = bal;
        bal = Math.max(0, bal - prin);
        const due = new Date(start);
        due.setMonth(start.getMonth() + i);
        rows.push({
          n: i,
          dueDate: due.toISOString().slice(0, 10),
          principal: prin,
          interest: perInt,
          fee: 0,
          total: prin + perInt,
          balance: bal,
        });
      }
    }
    return rows;
  }

  // Create + persist the schedule for a loan. `paidCount` marks the first N
  // installments as already paid (used for seeded loans).
  async buildSchedule(loan: Loan, paidCount = 0): Promise<void> {
    const rows = this.buildRows(
      loan.principal,
      loan.rate,
      loan.term,
      loan.method,
      loan.disbursed,
    );
    const entities = rows.map((r, i) =>
      this.installments.create({
        ...r,
        loanId: loan.id,
        status: i < paidCount ? 'Paid' : 'Due',
        paidAmount: i < paidCount ? r.total : 0,
        paidDate: i < paidCount ? r.dueDate : '',
      }),
    );
    await this.installments.save(entities);

    // Record a payment receipt for each pre-paid installment.
    if (paidCount > 0) {
      const num = loan.id.slice(-4);
      const receipts = entities
        .filter((e) => e.status === 'Paid')
        .map((e) =>
          this.payments.create({
            id: `RCP-${num}-${e.n}`,
            loanId: loan.id,
            date: e.dueDate,
            amount: e.total,
            method: loan.channel.includes('Bank') ? 'Bank deposit' : 'Mobile money',
            reference: '',
          }),
        );
      await this.payments.save(receipts);
    }
  }

  // Boot backfill: build schedules for any loans that have none yet.
  async ensureSchedules(): Promise<number> {
    const loans = await this.loans.find();
    let built = 0;
    for (const loan of loans) {
      const has = await this.installments.count({ where: { loanId: loan.id } });
      if (has === 0) {
        await this.buildSchedule(loan, loan.paid);
        await this.accrue(loan.id);
        built++;
      }
    }
    return built;
  }

  // Accrue penalties for missed installments and recompute the loan's derived
  // status / paid count. Idempotent — one penalty per overdue installment.
  async accrue(loanId: string): Promise<void> {
    const loan = await this.loans.findOne({ where: { id: loanId } });
    if (!loan) return;
    const rows = await this.installments.find({ where: { loanId } });
    if (rows.length === 0) return;

    const product = await this.products.findOne(loan.product).catch(() => null);
    const penaltyPct = product?.penalty ?? 0;
    const now = today();

    const existing = await this.charges.find({ where: { loanId } });
    // Idempotency key: which (installment, period) penalties already exist.
    const hasPenalty = new Set(
      existing
        .filter((c) => c.type === 'Late payment penalty')
        .map((c) => `${c.installmentN}:${c.period}`),
    );

    for (const inst of rows) {
      const overdue = inst.status !== 'Paid' && inst.dueDate < now;
      if (overdue) {
        if (inst.status !== 'Partial') inst.status = 'Overdue';
        // Accrue one penalty per overdue period (penalty grows the longer it
        // stays unpaid). Penalty per period = installment total × penalty%.
        const periods = overduePeriods(inst.dueDate, now);
        for (let p = 1; p <= periods; p++) {
          if (!hasPenalty.has(`${inst.n}:${p}`)) {
            await this.charges.save(
              this.charges.create({
                loanId,
                installmentN: inst.n,
                period: p,
                type: 'Late payment penalty',
                amount: Math.round((inst.total * penaltyPct) / 100),
                date: addMonths(inst.dueDate, p - 1),
                status: 'Outstanding',
              }),
            );
            hasPenalty.add(`${inst.n}:${p}`);
          }
        }
      } else if (inst.status === 'Overdue') {
        // No longer overdue (date moved or paid) — reset to Due.
        inst.status = inst.dueDate < now ? 'Overdue' : 'Due';
      }
    }
    await this.installments.save(rows);

    // Derive loan status + paid count from the schedule.
    const paid = rows.filter((r) => r.status === 'Paid').length;
    const anyOverdue = rows.some((r) => r.status === 'Overdue');
    loan.paid = paid;
    if (loan.status !== 'Written Off') {
      loan.status = paid === rows.length ? 'Closed' : anyOverdue ? 'Overdue' : 'Active';
    }
    await this.loans.save(loan);
  }

  async getSchedule(loanId: string): Promise<LoanInstallment[]> {
    await this.accrue(loanId);
    return this.installments.find({ where: { loanId }, order: { n: 'ASC' } });
  }

  async getPayments(loanId: string): Promise<LoanPayment[]> {
    return this.payments.find({ where: { loanId }, order: { date: 'DESC' } });
  }

  async getCharges(loanId: string): Promise<LoanCharge[]> {
    await this.accrue(loanId);
    return this.charges.find({ where: { loanId }, order: { date: 'DESC' } });
  }

  // Repayment metrics for the loan account header — derived entirely from the
  // schedule, payments and charges. `progress` exceeds 100% on overpayment.
  async getSummary(loanId: string) {
    await this.accrue(loanId);
    const loan = await this.loans.findOne({ where: { id: loanId } });
    const rows = await this.installments.find({ where: { loanId } });
    const pays = await this.payments.find({ where: { loanId } });
    const chgs = await this.charges.find({ where: { loanId } });

    const sum = (arr: number[]) => arr.reduce((s, n) => s + n, 0);
    const scheduledTotal = sum(rows.map((r) => r.total));
    const penaltyTotal = sum(chgs.map((c) => c.amount));
    const totalBilled = scheduledTotal + penaltyTotal;
    const totalPaid = sum(pays.map((p) => p.amount));
    const repaid = sum(rows.map((r) => r.paidAmount));
    const outstandingInstal = sum(rows.map((r) => r.total - r.paidAmount));
    const outstandingCharges = sum(
      chgs.filter((c) => c.status === 'Outstanding').map((c) => c.amount),
    );
    const outstanding = outstandingInstal + outstandingCharges;
    const overpaid = Math.max(0, totalPaid - totalBilled);
    const paidInstallments = rows.filter((r) => r.status === 'Paid').length;
    // Progress is paid vs. everything billed; > 100% when the borrower overpays.
    const progress = totalBilled > 0
      ? Math.round((totalPaid / totalBilled) * 100)
      : 0;

    return {
      loanId,
      principal: loan?.principal ?? 0,
      term: loan?.term ?? rows.length,
      status: loan?.status ?? 'Active',
      scheduledTotal,
      penaltyTotal,
      totalBilled,
      totalPaid,
      repaid,
      outstanding,
      overpaid,
      paidInstallments,
      progress,
    };
  }

  // Record a repayment: settle outstanding penalties first, then the oldest
  // unpaid installments, then refresh the loan's derived state.
  async recordPayment(
    loanId: string,
    amount: number,
    method = 'Cash',
    reference = '',
  ): Promise<{ payment: LoanPayment; loan: Loan }> {
    await this.accrue(loanId);
    const loan = await this.loans.findOne({ where: { id: loanId } });
    if (!loan) throw new Error(`Loan ${loanId} not found`);

    let remaining = Math.max(0, Math.round(amount));

    // 1) Outstanding charges (oldest first).
    const openCharges = await this.charges.find({
      where: { loanId, status: 'Outstanding' },
      order: { date: 'ASC' },
    });
    for (const ch of openCharges) {
      if (remaining >= ch.amount) {
        remaining -= ch.amount;
        ch.status = 'Paid';
        await this.charges.save(ch);
      }
    }

    // 2) Installments (oldest unpaid first).
    const rows = await this.installments.find({
      where: { loanId },
      order: { n: 'ASC' },
    });
    for (const inst of rows) {
      if (inst.status === 'Paid') continue;
      const due = inst.total - inst.paidAmount;
      if (remaining <= 0) break;
      if (remaining >= due) {
        remaining -= due;
        inst.paidAmount = inst.total;
        inst.status = 'Paid';
        inst.paidDate = today();
      } else {
        inst.paidAmount += remaining;
        inst.status = 'Partial';
        remaining = 0;
      }
      await this.installments.save(inst);
    }

    // Receipt.
    const num = loanId.slice(-4);
    const seq = (await this.payments.count({ where: { loanId } })) + 1;
    const payment = await this.payments.save(
      this.payments.create({
        id: `RCP-${num}-${seq}`,
        loanId,
        date: today(),
        amount: Math.round(amount),
        method,
        reference,
      }),
    );

    await this.accrue(loanId);
    const fresh = await this.loans.findOne({ where: { id: loanId } });
    return { payment, loan: fresh ?? loan };
  }
}
