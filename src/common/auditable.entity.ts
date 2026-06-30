import { Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

// Shared audit columns for every domain table. Entities extend this to get a
// consistent "who/when" trail at the row level:
//   - createdAt / updatedAt are maintained automatically by TypeORM
//   - createdBy / updatedBy are stamped by the services with the acting actor
// This complements the append-only AuditEntry timeline (per-action history).
export abstract class AuditableEntity {
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @Column({ default: 'system' })
  createdBy: string;

  @Column({ default: 'system' })
  updatedBy: string;
}
