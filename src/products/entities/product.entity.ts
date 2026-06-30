import { Column, Entity, PrimaryColumn } from 'typeorm';
import type { ActiveInactive } from '../../common/enums';
import { AuditableEntity } from '../../common/auditable.entity';

const intTransformer = { to: (v: number) => v, from: (v: string) => Number(v) };
const floatCol = { type: 'numeric' as const, transformer: { to: (v: number) => v, from: (v: string) => Number(v) } };

@Entity('products')
export class Product extends AuditableEntity {
  @PrimaryColumn()
  id: string;

  @Column()
  name: string;

  @Column({ default: '' })
  category: string;

  @Column({ type: 'bigint', default: 0, transformer: intTransformer })
  min: number;

  @Column({ type: 'bigint', default: 0, transformer: intTransformer })
  max: number;

  @Column({ default: 0 })
  minTerm: number;

  @Column({ default: 0 })
  maxTerm: number;

  @Column({ default: 'Monthly' })
  freq: string;

  @Column(floatCol)
  rate: number;

  @Column({ default: 'Flat' })
  method: string;

  @Column(floatCol)
  fee: number;

  @Column(floatCol)
  penalty: number;

  @Column({ default: 0 })
  grace: number;

  @Column({ type: 'varchar', default: 'Active' })
  status: ActiveInactive;

  @Column({ default: '' })
  desc: string;
}
