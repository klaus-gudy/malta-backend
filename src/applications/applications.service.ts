import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Application } from './entities/application.entity';
import {
  CreateApplicationDto,
  PatchApplicationDto,
} from './dto/application.dto';
import { roleMeta } from '../common/role-meta';
import { ProductsService } from '../products/products.service';
import { CustomersService } from '../customers/customers.service';
import { AuditService } from '../audit/audit.service';
import type { ApplicationStatus, RoleId } from '../common/enums';

const tzs = (n: number) => `TZS ${Number(n).toLocaleString('en-US')}`;

// Human-readable timeline action + detail for a status transition.
const STATUS_EVENT: Partial<
  Record<ApplicationStatus, { action: string; detail: string }>
> = {
  'Under Review': { action: 'Moved to review', detail: 'Assessment started' },
  Approved: { action: 'Application approved', detail: 'Cleared for disbursement' },
  Rejected: { action: 'Application rejected', detail: 'Did not meet criteria' },
  Cancelled: { action: 'Application cancelled', detail: '' },
};

@Injectable()
export class ApplicationsService {
  constructor(
    @InjectRepository(Application)
    private readonly applications: Repository<Application>,
    private readonly products: ProductsService,
    private readonly customers: CustomersService,
    private readonly audit: AuditService,
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
    const amount = Number(dto.amount);
    const term = Number(dto.term || 9);

    // Validate amount & tenure against the chosen product's limits.
    const product = await this.products.findOne(dto.product).catch(() => {
      throw new BadRequestException(`Unknown product "${dto.product}".`);
    });
    if (amount < product.min || amount > product.max) {
      throw new BadRequestException(
        `Requested amount must be between ${tzs(product.min)} and ${tzs(product.max)} for ${product.name}.`,
      );
    }
    if (term < product.minTerm || term > product.maxTerm) {
      throw new BadRequestException(
        `Tenure must be between ${product.minTerm} and ${product.maxTerm} months for ${product.name}.`,
      );
    }

    // A submitted application requires the borrower's KYC not to be rejected.
    const customer = await this.customers.findOne(dto.customer).catch(() => {
      throw new BadRequestException(`Unknown borrower "${dto.customer}".`);
    });
    if (dto.status === 'Submitted' && customer.kyc === 'Rejected') {
      throw new BadRequestException(
        'Borrower KYC is rejected — re-evaluation is required before this application can be submitted.',
      );
    }

    // Id scheme from the frontend: "LAP-2026-00" + (count + 43).
    const count = await this.applications.count();
    const n = count + 43;
    const id = 'LAP-2026-00' + n;
    const role = dto.role ?? 'officer';
    const actor = AuditService.actorFor(role);
    const app = this.applications.create({
      id,
      customer: dto.customer,
      product: dto.product,
      amount,
      term,
      purpose: dto.purpose || '—',
      status: dto.status,
      officer: roleMeta[role].name,
      created: new Date().toISOString().slice(0, 10),
      docs: Number(dto.docs ?? (dto.status === 'Draft' ? 1 : 2)),
      createdBy: actor.actor,
      updatedBy: actor.actor,
    });
    const saved = await this.applications.save(app);
    await this.audit.log(id, {
      ...actor,
      action: dto.status === 'Draft' ? 'Application drafted' : 'Application submitted',
      detail: `${tzs(amount)} over ${term} months`,
    });
    return saved;
  }

  async patch(id: string, patch: PatchApplicationDto): Promise<Application> {
    const app = await this.findOne(id);
    const { role, ...fields } = patch;
    const statusChanged = fields.status && fields.status !== app.status;
    const actor = AuditService.actorFor(role);
    Object.assign(app, fields);
    app.updatedBy = actor.actor;
    const saved = await this.applications.save(app);
    // Record the lifecycle transition (review / approve / reject). "Disbursed"
    // is logged against the loan instead, so it's intentionally skipped here.
    if (statusChanged && fields.status && STATUS_EVENT[fields.status]) {
      await this.audit.log(id, { ...actor, ...STATUS_EVENT[fields.status]! });
    }
    return saved;
  }
}
