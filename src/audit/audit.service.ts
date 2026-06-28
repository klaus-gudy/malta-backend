import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditEntry } from './entities/audit-entry.entity';

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

  log(
    entityId: string,
    entry: Omit<AuditEntry, 'id' | 'entityId'>,
  ): Promise<AuditEntry> {
    return this.entries.save(this.entries.create({ entityId, ...entry }));
  }
}
