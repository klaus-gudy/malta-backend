import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type InstallmentStatus = 'Due' | 'Paid' | 'Overdue' | 'Partial';

const intCol = {
  type: 'bigint' as const,
  default: 0,
  transformer: { to: (v: number) => v, from: (v: string) => Number(v) },
};

// One row of a loan's repayment schedule, generated at disbursement.
@Entity('loan_installments')
export class LoanInstallment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  loanId: string;

  @Column()
  n: number;

  @Column({ default: '' })
  dueDate: string;

  @Column(intCol)
  principal: number;

  @Column(intCol)
  interest: number;

  @Column(intCol)
  fee: number;

  @Column(intCol)
  total: number;

  @Column(intCol)
  balance: number;

  @Column({ type: 'varchar', default: 'Due' })
  status: InstallmentStatus;

  @Column(intCol)
  paidAmount: number;

  @Column({ default: '' })
  paidDate: string;
}
