import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from './entities/customer.entity';
import { CustomerDocument } from './entities/customer-document.entity';
import { CustomerAccount } from './entities/customer-account.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { UploadDocumentDto } from './dto/upload-document.dto';
import {
  CreateAccountDto,
  UpdateAccountDto,
} from './dto/customer-account.dto';
import type { KycStatus } from '../common/enums';

// Public document shape (no `content`/`customerId`) — matches the frontend.
export interface DocumentMeta {
  id: string;
  type: string;
  file: string;
  size: string;
  up: string;
  status: KycStatus;
}

// The standard KYC documents every customer is expected to provide.
const STANDARD_DOCS = [
  { suffix: 'D1', type: 'National ID (NIDA)', file: 'nida_front.jpg', size: '1.2 MB' },
  { suffix: 'D2', type: 'Passport photo', file: 'passport_photo.jpg', size: '0.4 MB' },
  { suffix: 'D3', type: 'Proof of residence', file: 'residence_letter.pdf', size: '0.8 MB' },
  { suffix: 'D4', type: 'Business licence', file: 'business_licence.pdf', size: '1.1 MB' },
];

function humanSize(content: string): string {
  const b64 = content.includes(',') ? content.split(',')[1] : content;
  const bytes = Math.floor((b64.length * 3) / 4);
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly customers: Repository<Customer>,
    @InjectRepository(CustomerDocument)
    private readonly documents: Repository<CustomerDocument>,
    @InjectRepository(CustomerAccount)
    private readonly accounts: Repository<CustomerAccount>,
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

  async update(id: string, dto: UpdateCustomerDto): Promise<Customer> {
    const customer = await this.findOne(id);
    // Only assign provided fields; numbers coerced for safety.
    Object.assign(customer, dto);
    if (dto.monthlyIncome !== undefined) {
      customer.monthlyIncome = Number(dto.monthlyIncome);
    }
    await this.customers.save(customer);
    // Completing the profile may satisfy KYC — recompute.
    return this.recomputeKyc(id);
  }

  async setKyc(id: string, status: KycStatus): Promise<Customer> {
    const customer = await this.findOne(id);
    customer.kyc = status;
    return this.customers.save(customer);
  }

  // The profile fields required before a customer can be KYC-verified.
  private readonly REQUIRED_PROFILE_FIELDS: (keyof Customer)[] = [
    'name',
    'phone',
    'nida',
    'region',
    'address',
    'occupation',
  ];

  private isProfileComplete(customer: Customer): boolean {
    const fieldsFilled = this.REQUIRED_PROFILE_FIELDS.every(
      (f) => String(customer[f] ?? '').trim() !== '',
    );
    return fieldsFilled && Number(customer.monthlyIncome) > 0;
  }

  /**
   * Derive and persist a customer's KYC status from the current state:
   *  - any document rejected            -> Rejected
   *  - profile complete & all docs verified (and at least one doc) -> Verified
   *  - otherwise                        -> Pending
   * Called automatically whenever documents or the profile change.
   */
  async recomputeKyc(custId: string): Promise<Customer> {
    const customer = await this.findOne(custId);
    const docs = await this.documents.find({
      where: { customerId: custId },
    });

    let next: KycStatus;
    if (docs.some((d) => d.status === 'Rejected')) {
      next = 'Rejected';
    } else if (
      this.isProfileComplete(customer) &&
      docs.length > 0 &&
      docs.every((d) => d.status === 'Verified')
    ) {
      next = 'Verified';
    } else {
      next = 'Pending';
    }

    if (customer.kyc !== next) {
      customer.kyc = next;
      await this.customers.save(customer);
    }
    return customer;
  }

  // What is still blocking KYC verification — surfaced to the UI.
  async kycRequirements(custId: string) {
    const customer = await this.findOne(custId);
    const docs = await this.documents.find({ where: { customerId: custId } });
    const missingFields = this.REQUIRED_PROFILE_FIELDS.filter(
      (f) => String(customer[f] ?? '').trim() === '',
    ) as string[];
    if (Number(customer.monthlyIncome) <= 0) missingFields.push('monthlyIncome');
    return {
      kyc: customer.kyc,
      missingFields,
      totalDocuments: docs.length,
      pendingDocuments: docs.filter((d) => d.status === 'Pending').length,
      rejectedDocuments: docs.filter((d) => d.status === 'Rejected').length,
    };
  }

  // ---------- DOCUMENTS ----------
  private toMeta(doc: CustomerDocument): DocumentMeta {
    return {
      id: doc.id,
      type: doc.type,
      file: doc.file,
      size: doc.size,
      up: doc.up,
      status: doc.status,
    };
  }

  async documentsFor(custId: string): Promise<DocumentMeta[]> {
    await this.findOne(custId);
    const docs = await this.documents.find({
      where: { customerId: custId },
      order: { id: 'ASC' },
    });
    return docs.map((d) => this.toMeta(d));
  }

  async addDocument(
    custId: string,
    dto: UploadDocumentDto,
  ): Promise<DocumentMeta> {
    await this.findOne(custId);
    const doc = this.documents.create({
      id: `${custId}-U${Date.now().toString(36).toUpperCase()}`,
      customerId: custId,
      type: dto.name,
      file: dto.fileName || dto.name,
      size: humanSize(dto.content),
      up: new Date().toISOString().slice(0, 10),
      status: 'Pending',
      content: dto.content,
    });
    await this.documents.save(doc);
    // A new (unverified) document means KYC is no longer complete.
    await this.recomputeKyc(custId);
    return this.toMeta(doc);
  }

  async setDocStatus(
    docId: string,
    status: Extract<KycStatus, 'Verified' | 'Rejected'>,
  ): Promise<DocumentMeta> {
    const doc = await this.documents.findOne({ where: { id: docId } });
    if (!doc) throw new NotFoundException(`Document ${docId} not found`);
    doc.status = status;
    await this.documents.save(doc);
    // Verifying/rejecting a document may change the customer's KYC status.
    await this.recomputeKyc(doc.customerId);
    return this.toMeta(doc);
  }

  // Fetch a document's contents for download/preview.
  async documentContent(docId: string) {
    const doc = await this.documents
      .createQueryBuilder('d')
      .addSelect('d.content')
      .where('d.id = :docId', { docId })
      .getOne();
    if (!doc) throw new NotFoundException(`Document ${docId} not found`);
    return { id: doc.id, type: doc.type, file: doc.file, content: doc.content };
  }

  // The four standard KYC documents for a customer, with the demo status pattern.
  private standardDocsFor(custId: string, kyc: KycStatus): CustomerDocument[] {
    return STANDARD_DOCS.map((def, i) => {
      let status: KycStatus = i < 2 ? 'Verified' : 'Pending';
      if (i === 2 && kyc === 'Rejected') status = 'Rejected';
      return this.documents.create({
        id: `${custId}-${def.suffix}`,
        customerId: custId,
        type: def.type,
        file: def.file,
        size: def.size,
        up: '2026-05-28',
        status,
        content: `data:text/plain;base64,${Buffer.from(
          `Standard KYC document for ${custId}: ${def.type}`,
        ).toString('base64')}`,
      });
    });
  }

  // One-time backfill: when no documents exist yet, give every customer the
  // standard KYC document set (called from the seeder on boot).
  async ensureStandardDocuments(): Promise<number> {
    const docCount = await this.documents.count();
    if (docCount > 0) return 0;
    const customers = await this.customers.find();
    const docs = customers.flatMap((c) => this.standardDocsFor(c.id, c.kyc));
    await this.documents.save(docs);
    return customers.length;
  }

  // ---------- CUSTOMER ACCOUNTS ----------
  async accountsFor(custId: string): Promise<CustomerAccount[]> {
    await this.findOne(custId);
    // Self-heal: a customer with accounts should always have one primary.
    await this.ensurePrimaryAccount(custId);
    return this.accounts.find({
      where: { customerId: custId },
      order: { isPrimary: 'DESC' },
    });
  }

  async addAccount(
    custId: string,
    dto: CreateAccountDto,
  ): Promise<CustomerAccount> {
    await this.findOne(custId);
    if (dto.isPrimary) {
      await this.accounts.update({ customerId: custId }, { isPrimary: false });
    }
    const existing = await this.accounts.count({ where: { customerId: custId } });
    const acct = this.accounts.create({
      customerId: custId,
      channel: dto.channel,
      accountNumber: dto.accountNumber,
      accountName: dto.accountName || '',
      isPrimary: dto.isPrimary ?? existing === 0,
    });
    return this.accounts.save(acct);
  }

  async updateAccount(
    acctId: string,
    dto: UpdateAccountDto,
  ): Promise<CustomerAccount> {
    const acct = await this.accounts.findOne({ where: { id: acctId } });
    if (!acct) throw new NotFoundException(`Account ${acctId} not found`);
    if (dto.isPrimary) {
      await this.accounts.update(
        { customerId: acct.customerId },
        { isPrimary: false },
      );
    }
    Object.assign(acct, dto);
    return this.accounts.save(acct);
  }

  async deleteAccount(acctId: string): Promise<void> {
    const acct = await this.accounts.findOne({ where: { id: acctId } });
    if (!acct) throw new NotFoundException(`Account ${acctId} not found`);
    const custId = acct.customerId;
    await this.accounts.remove(acct);
    // Keep exactly one primary: if the remaining accounts have no primary
    // (e.g. the primary was just deleted, or a single account is left), promote
    // the first remaining account.
    await this.ensurePrimaryAccount(custId);
  }

  // Guarantee a customer with at least one account has exactly one primary.
  private async ensurePrimaryAccount(custId: string): Promise<void> {
    const accounts = await this.accounts.find({
      where: { customerId: custId },
      order: { id: 'ASC' },
    });
    if (accounts.length === 0) return;
    if (accounts.some((a) => a.isPrimary)) return;
    accounts[0].isPrimary = true;
    await this.accounts.save(accounts[0]);
  }

  async ensureStandardAccounts(): Promise<number> {
    const count = await this.accounts.count();
    if (count > 0) return 0;
    const customers = await this.customers.find();
    const accts: CustomerAccount[] = [];
    for (const c of customers) {
      accts.push(
        this.accounts.create({
          customerId: c.id,
          channel: 'M-Pesa',
          accountNumber: c.phone || '+255 712 000 000',
          accountName: c.name,
          isPrimary: true,
        }),
      );
      accts.push(
        this.accounts.create({
          customerId: c.id,
          channel: 'Bank — CRDB',
          accountNumber: '0150' + c.id.replace(/\D/g, '') + '001',
          accountName: c.name,
          isPrimary: false,
        }),
      );
    }
    await this.accounts.save(accts);
    return customers.length;
  }
}
