import { Column, Entity, PrimaryColumn } from 'typeorm';
import type { KycStatus } from '../../common/enums';

// KYC documents are synthesised per-customer (see CustomersService.documentsFor).
// Only manual status changes are persisted, keyed by the synthetic document id.
@Entity('document_overrides')
export class DocumentOverride {
  @PrimaryColumn()
  docId: string;

  @Column({ type: 'varchar' })
  status: KycStatus;
}
