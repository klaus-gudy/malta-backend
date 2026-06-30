import { Column, Entity, PrimaryColumn } from 'typeorm';
import type { LoanStatus } from '../../common/enums';
import { AuditableEntity } from '../../common/auditable.entity';

@Entity('loans')
export class Loan extends AuditableEntity {
  @PrimaryColumn()
  id: string;

  // The application this loan was disbursed from — links the loan back to its
  // origination trail (submitted / reviewed / approved).
  @Column({ default: '' })
  applicationId: string;

  @Column()
  customer: string;

  @Column()
  product: string;

  @Column({ type: 'bigint', transformer: { to: (v: number) => v, from: (v: string) => Number(v) } })
  principal: number;

  @Column({ type: 'numeric', transformer: { to: (v: number) => v, from: (v: string) => Number(v) } })
  rate: number;

  @Column()
  term: number;

  @Column({ default: 'Flat' })
  method: string;

  @Column({ default: '' })
  disbursed: string;

  @Column({ default: '' })
  channel: string;

  @Column({ type: 'varchar', default: 'Active' })
  status: LoanStatus;

  @Column({ default: 0 })
  paid: number;
}
