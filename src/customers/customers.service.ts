import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from './entities/customer.entity';
import { DocumentOverride } from './entities/document-override.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import type { KycStatus } from '../common/enums';

export interface CustomerDocument {
  id: string;
  type: string;
  file: string;
  size: string;
  up: string;
  status: KycStatus;
}

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly customers: Repository<Customer>,
    @InjectRepository(DocumentOverride)
    private readonly overrides: Repository<DocumentOverride>,
  ) {}

  findAll(): Promise<Customer[]> {
    return this.customers.find({ order: { id: 'DESC' } });
  }

  async findOne(id: string): Promise<Customer> {
    const customer = await this.customers.findOne({ where: { id } });
    if (!customer) throw new NotFoundException(`Customer ${id} not found`);
    return customer;
  }

  async create(dto: CreateCustomerDto): Promise<Customer> {
    // Mirror the frontend's id scheme: "CUS-10" + zero-padded sequence.
    const count = await this.customers.count();
    const id = 'CUS-10' + String(count + 1).padStart(2, '0');
    const customer = this.customers.create({
      id,
      name: dto.name,
      gender: dto.gender || 'Female',
      dob: dto.dob || '1990-01-01',
      phone: dto.phone,
      email: dto.email || '',
      nida: dto.nida,
      region: dto.region || 'Dar es Salaam',
      ward: dto.ward || '',
      address: dto.address || '',
      occupation: dto.occupation || '',
      business: dto.business || '',
      monthlyIncome: Number(dto.monthlyIncome || 0),
      nokName: dto.nokName || '',
      nokRelation: dto.nokRelation || '',
      nokPhone: dto.nokPhone || '',
      status: 'Active',
      kyc: 'Pending',
      joined: new Date().toISOString().slice(0, 10),
      photo: '#9a8b6f',
    });
    return this.customers.save(customer);
  }

  async setKyc(id: string, status: KycStatus): Promise<Customer> {
    const customer = await this.findOne(id);
    customer.kyc = status;
    return this.customers.save(customer);
  }

  async documentsFor(custId: string): Promise<CustomerDocument[]> {
    const customer = await this.findOne(custId);
    const base: CustomerDocument[] = [
      { id: custId + '-D1', type: 'National ID (NIDA)', file: 'nida_front.jpg', size: '1.2 MB', up: '2026-05-28', status: 'Verified' },
      { id: custId + '-D2', type: 'Passport photo', file: 'passport_photo.jpg', size: '0.4 MB', up: '2026-05-28', status: 'Verified' },
      { id: custId + '-D3', type: 'Proof of residence', file: 'residence_letter.pdf', size: '0.8 MB', up: '2026-05-29', status: 'Pending' },
      { id: custId + '-D4', type: 'Business licence', file: 'business_licence.pdf', size: '1.1 MB', up: '2026-05-29', status: 'Pending' },
    ];
    if (customer.kyc === 'Rejected') base[2].status = 'Rejected';

    const stored = await this.overrides.find();
    const map = new Map(stored.map((o) => [o.docId, o.status]));
    return base.map((d) => ({ ...d, status: map.get(d.id) ?? d.status }));
  }

  async setDocStatus(
    docId: string,
    status: Extract<KycStatus, 'Verified' | 'Rejected'>,
  ): Promise<CustomerDocument> {
    await this.overrides.save({ docId, status });
    // Return the affected document with the override applied.
    const custId = docId.replace(/-D\d+$/, '');
    const docs = await this.documentsFor(custId);
    const doc = docs.find((d) => d.id === docId);
    if (!doc) throw new NotFoundException(`Document ${docId} not found`);
    return doc;
  }
}
