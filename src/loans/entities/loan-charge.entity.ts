import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type ChargeStatus = 'Outstanding' | 'Paid' | 'Waived';

// A penalty or fee accrued on a loan (e.g. a late-payment penalty for a
// missed installment). One penalty per missed installment (idempotent).
@Entity('loan_charges')
export class LoanCharge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  loanId: string;

  // The installment number this charge relates to (0 for non-installment fees).
  @Column({ default: 0 })
  installmentN: number;

  // Which overdue period this penalty covers (1 = the miss, 2 = one period late…).
  // Together with installmentN this keeps per-period accrual idempotent.
  @Column({ default: 1 })
  period: number;

  @Column({ default: 'Late payment penalty' })
  type: string;

  @Column({
    type: 'bigint',
    default: 0,
    transformer: { to: (v: number) => v, from: (v: string) => Number(v) },
  })
  amount: number;

  @Column({ default: '' })
  date: string;

  @Column({ type: 'varchar', default: 'Outstanding' })
  status: ChargeStatus;
}
