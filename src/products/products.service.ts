import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { AuditService } from '../audit/audit.service';

// Human labels for the product fields we track in the change log.
const FIELD_LABELS: Record<string, string> = {
  name: 'Name',
  category: 'Category',
  min: 'Min amount',
  max: 'Max amount',
  minTerm: 'Min term',
  maxTerm: 'Max term',
  freq: 'Frequency',
  rate: 'Interest rate',
  method: 'Interest method',
  fee: 'Processing fee',
  penalty: 'Penalty rate',
  grace: 'Grace period',
  status: 'Status',
  desc: 'Description',
};

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly products: Repository<Product>,
    private readonly audit: AuditService,
  ) {}

  findAll(): Promise<Product[]> {
    return this.products.find({ order: { id: 'ASC' } });
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.products.findOne({ where: { id } });
    if (!product) throw new NotFoundException(`Product ${id} not found`);
    return product;
  }

  async create(dto: CreateProductDto): Promise<Product> {
    if (dto.max < dto.min) {
      throw new BadRequestException(
        'Maximum amount must be greater than or equal to the minimum amount.',
      );
    }
    if (dto.maxTerm < dto.minTerm) {
      throw new BadRequestException(
        'Maximum term must be greater than or equal to the minimum term.',
      );
    }
    const { role, ...fields } = dto;
    const actor = AuditService.actorFor(role);
    const count = await this.products.count();
    const id = 'PRD-' + String(count + 1).padStart(2, '0');
    const product = this.products.create({
      ...fields,
      id,
      status: fields.status || 'Active',
      desc: fields.desc || '',
      createdBy: actor.actor,
      updatedBy: actor.actor,
    });
    const saved = await this.products.save(product);
    await this.audit.log(id, {
      ...actor,
      action: 'Product created',
      detail: `${saved.name} · ${saved.rate}% ${saved.method} · ${saved.minTerm}–${saved.maxTerm} ${saved.freq.toLowerCase()}`,
    });
    return saved;
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    const product = await this.findOne(id);
    const { role, ...fields } = dto;
    const actor = AuditService.actorFor(role);
    // Diff the incoming fields against the current values so the timeline
    // records exactly what changed (the form may resend unchanged fields).
    const changes = this.diff(product, fields);
    Object.assign(product, fields);
    product.updatedBy = actor.actor;
    const saved = await this.products.save(product);
    if (changes.length) {
      await this.audit.log(id, {
        ...actor,
        action: 'Product updated',
        detail: changes.join('; '),
      });
    }
    return saved;
  }

  // Build a "Field: old → new" list for the fields that actually changed.
  private diff(
    current: Product,
    incoming: Partial<Product>,
  ): string[] {
    const out: string[] = [];
    for (const [key, next] of Object.entries(incoming)) {
      if (next === undefined || !(key in FIELD_LABELS)) continue;
      const prev = (current as unknown as Record<string, unknown>)[key];
      if (String(prev) === String(next)) continue;
      out.push(`${FIELD_LABELS[key]}: ${fmt(prev)} → ${fmt(next)}`);
    }
    return out;
  }
}

function fmt(v: unknown): string {
  if (v === '' || v === null || v === undefined) return '—';
  return String(v);
}
