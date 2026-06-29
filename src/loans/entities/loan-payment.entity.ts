import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

// A repayment transaction (receipt) recorded against a loan.
@Entity('loan_payments')
export class LoanPayment {
  // Receipt number, e.g. "RCP-0177-4".
  @PrimaryColumn()
  id: string;

  @Index()
  @Column()
  loanId: string;

  @Column({ default: '' })
  date: string;

  @Column({
    type: 'bigint',
    default: 0,
    transformer: { to: (v: number) => v, from: (v: string) => Number(v) },
  })
  amount: number;

  @Column({ default: 'Cash' })
  method: string;

  @Column({ default: '' })
  reference: string;
}
