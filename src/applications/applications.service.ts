import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Application } from './entities/application.entity';
import {
  CreateApplicationDto,
  PatchApplicationDto,
} from './dto/application.dto';
import { roleMeta } from '../common/role-meta';

@Injectable()
export class ApplicationsService {
  constructor(
    @InjectRepository(Application)
    private readonly applications: Repository<Application>,
  ) {}

  findAll(): Promise<Application[]> {
    return this.applications.find({ order: { id: 'DESC' } });
  }

  async findOne(id: string): Promise<Application> {
    const app = await this.applications.findOne({ where: { id } });
    if (!app) throw new NotFoundException(`Application ${id} not found`);
    return app;
  }

  async create(dto: CreateApplicationDto): Promise<Application> {
    // Id scheme from the frontend: "LAP-2026-00" + (count + 43).
    const count = await this.applications.count();
    const n = count + 43;
    const id = 'LAP-2026-00' + n;
    const role = dto.role ?? 'officer';
    const app = this.applications.create({
      id,
      customer: dto.customer,
      product: dto.product,
      amount: Number(dto.amount),
      term: Number(dto.term || 9),
      purpose: dto.purpose || '—',
      status: dto.status,
      officer: roleMeta[role].name,
      created: new Date().toISOString().slice(0, 10),
      docs: Number(dto.docs ?? (dto.status === 'Draft' ? 1 : 2)),
    });
    return this.applications.save(app);
  }

  async patch(id: string, patch: PatchApplicationDto): Promise<Application> {
    const app = await this.findOne(id);
    Object.assign(app, patch);
    return this.applications.save(app);
  }
}
