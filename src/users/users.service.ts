import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from './entities/user.entity';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { BCRYPT_ROUNDS, DEMO_PASSWORD } from '../common/auth.constants';
import { AuditService } from '../audit/audit.service';
import { roleMeta } from '../common/role-meta';

// A created user plus the one-time plaintext temp password (never persisted
// or returned again) so the admin can share it / test sign-in.
export type CreatedUser = User & { tempPassword: string };

// Human labels for the user fields tracked in the change log.
const USER_FIELD_LABELS: Record<string, string> = {
  name: 'Name',
  email: 'Email',
  role: 'Role',
  branch: 'Branch',
  status: 'Status',
};

// User management is admin-gated, so events are attributed to the admin actor.
const ADMIN_ACTOR = AuditService.actorFor('admin');

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly audit: AuditService,
  ) {}

  findAll(): Promise<User[]> {
    return this.users.find({ order: { id: 'ASC' } });
  }

  async findOne(id: string): Promise<User> {
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  async create(dto: CreateUserDto): Promise<CreatedUser> {
    const count = await this.users.count();
    const id = 'U-' + String(count + 1).padStart(3, '0');
    const tempPassword = generateTempPassword();
    const user = this.users.create({
      ...dto,
      id,
      status: dto.status || 'Active',
      last: new Date().toISOString().slice(0, 16).replace('T', ' '),
      password: await bcrypt.hash(tempPassword, BCRYPT_ROUNDS),
    });
    user.createdBy = ADMIN_ACTOR.actor;
    user.updatedBy = ADMIN_ACTOR.actor;
    const saved = await this.users.save(user);
    await this.audit.log(saved.id, {
      ...ADMIN_ACTOR,
      action: 'User created',
      detail: `${roleMeta[saved.role].label} · ${saved.branch}`,
    });
    delete saved.password; // never expose the hash
    return { ...saved, tempPassword };
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);
    const changes = this.diff(user, dto);
    Object.assign(user, dto);
    user.updatedBy = ADMIN_ACTOR.actor;
    const saved = await this.users.save(user);
    if (changes.length) {
      await this.audit.log(id, {
        ...ADMIN_ACTOR,
        action: 'User updated',
        detail: changes.join('; '),
      });
    }
    return saved;
  }

  async toggle(id: string): Promise<User> {
    const user = await this.findOne(id);
    user.status = user.status === 'Active' ? 'Inactive' : 'Active';
    user.updatedBy = ADMIN_ACTOR.actor;
    const saved = await this.users.save(user);
    await this.audit.log(id, {
      ...ADMIN_ACTOR,
      action: saved.status === 'Active' ? 'User activated' : 'User deactivated',
      detail: `Account ${saved.status === 'Active' ? 'enabled' : 'disabled'}`,
    });
    return saved;
  }

  // Build a "Field: old → new" list for the user fields that changed.
  private diff(current: User, incoming: Partial<User>): string[] {
    const out: string[] = [];
    for (const [key, next] of Object.entries(incoming)) {
      if (next === undefined || !(key in USER_FIELD_LABELS)) continue;
      const prev = (current as unknown as Record<string, unknown>)[key];
      const label = USER_FIELD_LABELS[key];
      const fmtVal = (v: unknown) =>
        key === 'role' ? roleMeta[v as keyof typeof roleMeta]?.label ?? String(v) : String(v);
      if (String(prev) === String(next)) continue;
      out.push(`${label}: ${fmtVal(prev)} → ${fmtVal(next)}`);
    }
    return out;
  }

  // Used by auth: look up by full email or its local-part (e.g. "joseph.admin"
  // matches "joseph.admin@maltamfi.co.tz"), explicitly re-selecting the hash.
  async findForAuth(username: string): Promise<User | null> {
    const term = username.trim();
    return this.users
      .createQueryBuilder('u')
      .addSelect('u.password')
      .where('LOWER(u.email) = LOWER(:full)', { full: term })
      .orWhere('LOWER(u.email) LIKE LOWER(:prefix)', { prefix: `${term}@%` })
      .getOne();
  }

  async touchLastLogin(id: string): Promise<void> {
    await this.users.update(id, {
      last: new Date().toISOString().slice(0, 16).replace('T', ' '),
    });
  }

  // Backfill: assign the shared demo password to any user lacking a hash (e.g.
  // rows seeded before passwords existed). Idempotent — safe to run every boot.
  async ensurePasswords(): Promise<number> {
    const missing = await this.users
      .createQueryBuilder('u')
      .addSelect('u.password')
      .where('u.password IS NULL')
      .getMany();
    if (!missing.length) return 0;
    const hash = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_ROUNDS);
    await this.users.update({ password: IsNull() }, { password: hash });
    return missing.length;
  }
}

function generateTempPassword(): string {
  // Readable temp password, e.g. "Malta-7F3K".
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 4; i++)
    s += chars[Math.floor(Math.random() * chars.length)];
  return `Malta-${s}`;
}
