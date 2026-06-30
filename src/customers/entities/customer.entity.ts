import { Column, Entity, PrimaryColumn } from 'typeorm';
import type { CustomerStatus, KycStatus } from '../../common/enums';
import { AuditableEntity } from '../../common/auditable.entity';

@Entity('customers')
export class Customer extends AuditableEntity {
  // Business id e.g. "CUS-1001" — kept as the PK to match the frontend contract.
  @PrimaryColumn()
  id: string;

  @Column()
  name: string;

  @Column({ default: '' })
  gender: string;

  @Column({ default: '' })
  dob: string;

  @Column()
  phone: string;

  @Column({ default: '' })
  email: string;

  @Column()
  nida: string;

  @Column({ default: '' })
  region: string;

  @Column({ default: '' })
  ward: string;

  @Column({ default: '' })
  address: string;

  @Column({ default: '' })
  occupation: string;

  @Column({ default: '' })
  business: string;

  @Column({ type: 'bigint', default: 0, transformer: { to: (v: number) => v, from: (v: string) => Number(v) } })
  monthlyIncome: number;

  @Column({ default: '' })
  nokName: string;

  @Column({ default: '' })
  nokRelation: string;

  @Column({ default: '' })
  nokPhone: string;

  @Column({ type: 'varchar', default: 'Active' })
  status: CustomerStatus;

  @Column({ type: 'varchar', default: 'Pending' })
  kyc: KycStatus;

  @Column({ default: '' })
  joined: string;

  @Column({ default: '#9a8b6f' })
  photo: string;
}
