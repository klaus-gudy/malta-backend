import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('customer_accounts')
export class CustomerAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  customerId: string;

  @Column()
  channel: string;

  @Column()
  accountNumber: string;

  @Column({ default: '' })
  accountName: string;

  @Column({ default: false })
  isPrimary: boolean;
}
