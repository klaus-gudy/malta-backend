import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditEntry } from './entities/audit-entry.entity';
import { roleMeta } from '../common/role-meta';
import type { RoleId } from '../common/enums';

// A single timeline entry to record, without the auto-managed fields.
export interface LogInput {
  actor: string;
  role: string;
  action: string;
  detail?: string;
  // Optional explicit timestamp ("YYYY-MM-DD HH:mm"); defaults to now.
  time?: string;
}

function now(): string {
  // "YYYY-MM-DD HH:mm" — readable and sortable, matching seeded entries.
  return new Date().toISOString().slice(0, 16).replace('T', ' ');
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditEntry)
    private readonly entries: Repository<AuditEntry>,
  ) {}

  // Returns the trail for an entity, or null to match the frontend's api.audit().
  async forEntity(entityId: string): Promise<AuditEntry[] | null> {
    const rows = await this.entries.find({
      where: { entityId },
      order: { time: 'ASC' },
    });
    return rows.length ? rows : null;
  }

  // The most recent activity across all entities (newest first) — powers the
  // dashboard's live activity feed. Entries dated in the future (possible with
  // seeded loans disbursed on a future date) are excluded so the feed reflects
  // what has actually happened up to now.
  async recent(limit = 5): Promise<AuditEntry[]> {
    const nowTs = now();
    return this.entries
      .createQueryBuilder('e')
      .where('e.time <= :nowTs', { nowTs })
      .orderBy('e.time', 'DESC')
      .take(limit)
      .getMany();
  }

  // Returns a merged, chronologically-sorted trail spanning several entities
  // (e.g. an application id + the loan it became). Always an array.
  async forEntities(entityIds: string[]): Promise<AuditEntry[]> {
    const ids = entityIds.filter(Boolean);
    if (ids.length === 0) return [];
    const rows = await this.entries.find({
      where: ids.map((entityId) => ({ entityId })),
    });
    return rows.sort((a, b) => a.time.localeCompare(b.time));
  }

  // Append a timeline entry. `time` defaults to now.
  log(entityId: string, entry: LogInput): Promise<AuditEntry> {
    return this.entries.save(
      this.entries.create({
        entityId,
        actor: entry.actor,
        role: entry.role,
        action: entry.action,
        detail: entry.detail ?? '',
        time: entry.time ?? now(),
      }),
    );
  }

  // Resolve a role id to the actor name + display label used in the timeline.
  static actorFor(role?: RoleId): { actor: string; role: string } {
    const meta = role ? roleMeta[role] : undefined;
    return meta
      ? { actor: meta.name, role: meta.label }
      : { actor: 'System', role: 'System' };
  }
}
