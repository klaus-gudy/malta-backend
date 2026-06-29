import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import type { KycStatus } from '../../common/enums';

// A document belonging to a customer. Each customer can have many documents;
// the link is the `customerId` business id (e.g. "CUS-1001"). Documents carry a
// verification status so an officer can verify or reject them.
@Entity('customer_documents')
export class CustomerDocument {
  @PrimaryColumn()
  id: string;

  @Index()
  @Column()
  customerId: string;

  // Human-readable document name (e.g. "National ID (NIDA)").
  @Column()
  type: string;

  // Original file name.
  @Column({ default: '' })
  file: string;

  // Human-readable size label (e.g. "1.2 MB").
  @Column({ default: '' })
  size: string;

  // Upload date (YYYY-MM-DD).
  @Column()
  up: string;

  @Column({ type: 'varchar', default: 'Pending' })
  status: KycStatus;

  // The document contents (base64 / data URL). Excluded from normal queries so
  // listings stay light — fetched explicitly when a download is requested.
  @Column({ type: 'text', default: '', select: false })
  content: string;
}
