import { Column, Entity, PrimaryColumn } from 'typeorm';
import type { ApplicationStatus } from '../../common/enums';

@Entity('applications')
export class Application {
  @PrimaryColumn()
  id: string;

  // FK-style reference by business id (e.g. "CUS-1001"); kept loose to match
  // the frontend shape where these are plain string references.
  @Column()
  customer: string;

  @Column()
  product: string;

  @Column({ type: 'bigint', transformer: { to: (v: number) => v, from: (v: string) => Number(v) } })
  amount: number;

  @Column()
  term: number;

  @Column({ default: '—' })
  purpose: string;

  @Column({ type: 'varchar', default: 'Draft' })
  status: ApplicationStatus;

  @Column({ default: '' })
  officer: string;

  @Column({ default: '' })
  created: string;

  @Column({ default: 0 })
  docs: number;
}
