import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

// Append-only audit trail. Entries are grouped by the entity they describe
// (e.g. an application id) via `entityId`, matching the frontend's
// `audit: Record<string, AuditEntry[]>` shape.
@Entity('audit_entries')
export class AuditEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  entityId: string;

  @Column()
  actor: string;

  @Column()
  role: string;

  @Column()
  action: string;

  @Column({ default: '' })
  detail: string;

  @Column()
  time: string;
}
