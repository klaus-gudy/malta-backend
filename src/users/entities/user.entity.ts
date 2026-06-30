import { Column, Entity, PrimaryColumn } from 'typeorm';
import type { ActiveInactive, RoleId } from '../../common/enums';
import { AuditableEntity } from '../../common/auditable.entity';

@Entity('users')
export class User extends AuditableEntity {
  @PrimaryColumn()
  id: string;

  @Column()
  name: string;

  @Column()
  email: string;

  @Column({ type: 'varchar' })
  role: RoleId;

  @Column({ default: '' })
  branch: string;

  @Column({ type: 'varchar', default: 'Active' })
  status: ActiveInactive;

  @Column({ default: '' })
  last: string;

  // Bcrypt hash. select:false keeps it out of normal query results so it never
  // leaks through the API; auth explicitly re-selects it.
  @Column({ type: 'varchar', nullable: true, select: false })
  password?: string | null;
}
