import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '../customers/entities/customer.entity';
import { Product } from '../products/entities/product.entity';
import { Application } from '../applications/entities/application.entity';
import { Loan } from '../loans/entities/loan.entity';
import { User } from '../users/entities/user.entity';
import { AuditEntry } from '../audit/entities/audit-entry.entity';
import { UsersService } from '../users/users.service';
import { CustomersService } from '../customers/customers.service';
import type { ApplicationStatus, LoanStatus, RoleId } from '../common/enums';

// Faithful port of the frontend's lib/seed.ts deterministic generator, so the
// API serves the exact demo dataset the UI was built against. Runs once on
// boot when the tables are empty (DB_SEED=true).
@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(Customer) private readonly customers: Repository<Customer>,
    @InjectRepository(Product) private readonly products: Repository<Product>,
    @InjectRepository(Application)
    private readonly applications: Repository<Application>,
    @InjectRepository(Loan) private readonly loans: Repository<Loan>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(AuditEntry)
    private readonly audit: Repository<AuditEntry>,
    private readonly usersService: UsersService,
    private readonly customersService: CustomersService,
  ) {}

  async onApplicationBootstrap() {
    if (this.config.get('DB_SEED') !== 'true') return;
    const existing = await this.customers.count();
    if (existing > 0) {
      this.logger.log('Database already seeded — skipping.');
    } else {
      this.logger.log('Seeding demo dataset…');
      const data = buildSeed();
      await this.products.save(data.products);
      await this.customers.save(data.customers);
      await this.applications.save(data.applications);
      await this.loans.save(data.loans);
      await this.users.save(data.users);
      await this.audit.save(data.audit);
      this.logger.log(
        `Seeded ${data.customers.length} customers, ${data.products.length} products, ` +
          `${data.applications.length} applications, ${data.loans.length} loans, ${data.users.length} users.`,
      );
    }

    // Ensure every user has a password (assigns the shared demo password to any
    // rows without one — incl. data seeded before passwords existed).
    const filled = await this.usersService.ensurePasswords();
    if (filled > 0) {
      this.logger.log(`Assigned demo password to ${filled} user(s).`);
    }

    // Give existing customers the standard KYC document set (one-time, when no
    // documents exist yet). New customers start empty and upload their own.
    const docCustomers = await this.customersService.ensureStandardDocuments();
    if (docCustomers > 0) {
      this.logger.log(
        `Created standard documents for ${docCustomers} customer(s).`,
      );
    }
  }
}

interface SeedData {
  customers: Customer[];
  products: Product[];
  applications: Application[];
  loans: Loan[];
  users: User[];
  audit: Partial<AuditEntry>[];
}

function buildSeed(): SeedData {
  const customers: Customer[] = [
    { id: 'CUS-1001', name: 'Amina Hassan Mwinyi', gender: 'Female', dob: '1989-03-12', phone: '+255 712 884 220', email: 'amina.h@gmail.com', nida: '19890312-14101-00012-23', region: 'Dar es Salaam', ward: 'Kinondoni', address: 'Plot 24, Mwenge, Kinondoni', occupation: 'Retail trader — kitenge & fabrics', business: 'Amina Fabrics, Kariakoo', monthlyIncome: 1850000, nokName: 'Hassan Mwinyi', nokRelation: 'Spouse', nokPhone: '+255 754 110 922', status: 'Active', kyc: 'Verified', joined: '2024-08-14', photo: '#caa472' },
    { id: 'CUS-1002', name: 'Juma Said Mwakalinga', gender: 'Male', dob: '1985-11-02', phone: '+255 754 221 765', email: 'juma.mwk@gmail.com', nida: '19851102-20203-00045-11', region: 'Mwanza', ward: 'Nyamagana', address: 'Buzuruga Rd, Nyamagana', occupation: 'Boda-boda operator & spares', business: 'JM Spares', monthlyIncome: 1200000, nokName: 'Rehema Said', nokRelation: 'Sister', nokPhone: '+255 715 330 118', status: 'Active', kyc: 'Verified', joined: '2024-09-03', photo: '#7d9b8a' },
    { id: 'CUS-1003', name: 'Neema Elia Kessy', gender: 'Female', dob: '1992-06-21', phone: '+255 689 442 100', email: 'neema.kessy@gmail.com', nida: '19920621-13301-00078-04', region: 'Arusha', ward: 'Themi', address: 'Sekei, Arusha', occupation: 'Salon owner', business: 'Neema Beauty Lounge', monthlyIncome: 2100000, nokName: 'Elia Kessy', nokRelation: 'Father', nokPhone: '+255 786 220 451', status: 'Active', kyc: 'Pending', joined: '2026-05-28', photo: '#b48a9c' },
    { id: 'CUS-1004', name: 'Baraka Joseph Mlay', gender: 'Male', dob: '1990-01-18', phone: '+255 765 998 003', email: 'baraka.mlay@gmail.com', nida: '19900118-11102-00031-07', region: 'Kilimanjaro', ward: 'Moshi Urban', address: 'Kiusa St, Moshi', occupation: 'Coffee farmer', business: 'Mlay Family Farm', monthlyIncome: 1650000, nokName: 'Grace Mlay', nokRelation: 'Spouse', nokPhone: '+255 753 661 220', status: 'Active', kyc: 'Verified', joined: '2025-02-11', photo: '#9a8b6f' },
    { id: 'CUS-1005', name: 'Zainabu Omary Kihwelo', gender: 'Female', dob: '1994-09-30', phone: '+255 719 005 661', email: 'zainabu.k@gmail.com', nida: '19940930-15401-00099-12', region: 'Dodoma', ward: 'Makole', address: 'Area C, Dodoma', occupation: 'Mobile money agent', business: 'Zee Vodacom Agent', monthlyIncome: 980000, nokName: 'Omary Kihwelo', nokRelation: 'Father', nokPhone: '+255 742 880 117', status: 'Inactive', kyc: 'Rejected', joined: '2026-01-19', photo: '#a89070' },
    { id: 'CUS-1006', name: 'Frank Peter Mushi', gender: 'Male', dob: '1987-04-25', phone: '+255 786 334 552', email: 'frank.mushi@gmail.com', nida: '19870425-12201-00056-09', region: 'Dar es Salaam', ward: 'Ilala', address: 'Buguruni, Ilala', occupation: 'Hardware shop owner', business: 'Mushi Hardware', monthlyIncome: 2750000, nokName: 'Lucy Mushi', nokRelation: 'Spouse', nokPhone: '+255 713 442 889', status: 'Active', kyc: 'Verified', joined: '2024-11-22', photo: '#8c9bad' },
  ] as Customer[];

  const products: Product[] = [
    { id: 'PRD-01', name: 'Biashara Boost', category: 'Business / SME', min: 200000, max: 5000000, minTerm: 3, maxTerm: 12, freq: 'Monthly', rate: 18, method: 'Flat', fee: 2.5, penalty: 0.5, grace: 3, status: 'Active', desc: 'Working-capital loan for micro & small traders.' },
    { id: 'PRD-02', name: 'Kilimo Loan', category: 'Agriculture', min: 300000, max: 8000000, minTerm: 4, maxTerm: 18, freq: 'Monthly', rate: 16, method: 'Reducing balance', fee: 2.0, penalty: 0.5, grace: 7, status: 'Active', desc: 'Seasonal financing for smallholder farmers.' },
    { id: 'PRD-03', name: 'Salary Advance', category: 'Consumer', min: 100000, max: 3000000, minTerm: 1, maxTerm: 6, freq: 'Monthly', rate: 12, method: 'Flat', fee: 1.5, penalty: 1.0, grace: 0, status: 'Active', desc: 'Short-term advance for salaried employees.' },
    { id: 'PRD-04', name: 'Group Solidarity', category: 'Group lending', min: 150000, max: 2000000, minTerm: 3, maxTerm: 12, freq: 'Weekly', rate: 20, method: 'Flat', fee: 3.0, penalty: 0.5, grace: 0, status: 'Active', desc: 'Joint-liability lending for VICOBA groups.' },
    { id: 'PRD-05', name: 'Asset Finance', category: 'Asset / Equipment', min: 500000, max: 12000000, minTerm: 6, maxTerm: 24, freq: 'Monthly', rate: 15, method: 'Reducing balance', fee: 2.5, penalty: 0.5, grace: 14, status: 'Inactive', desc: 'Financing for productive equipment & vehicles.' },
  ] as Product[];

  const applications: Application[] = [
    { id: 'LAP-2026-0042', customer: 'CUS-1003', product: 'PRD-01', amount: 1500000, term: 9, purpose: 'Restock salon inventory and add two dryers', status: 'Under Review', officer: 'Amina Hassan', created: '2026-06-18', docs: 3 },
    { id: 'LAP-2026-0041', customer: 'CUS-1002', product: 'PRD-01', amount: 900000, term: 6, purpose: 'Buy spare parts for resale', status: 'Submitted', officer: 'Amina Hassan', created: '2026-06-20', docs: 2 },
    { id: 'LAP-2026-0040', customer: 'CUS-1004', product: 'PRD-02', amount: 3000000, term: 12, purpose: 'Coffee season inputs — fertiliser & labour', status: 'Approved', officer: 'Daudi Mtwara', created: '2026-06-12', docs: 4 },
    { id: 'LAP-2026-0039', customer: 'CUS-1006', product: 'PRD-05', amount: 6000000, term: 18, purpose: 'Delivery vehicle for hardware shop', status: 'Draft', officer: 'Amina Hassan', created: '2026-06-21', docs: 1 },
    { id: 'LAP-2026-0038', customer: 'CUS-1001', product: 'PRD-01', amount: 1200000, term: 9, purpose: 'Bulk fabric purchase ahead of festive season', status: 'Rejected', officer: 'Daudi Mtwara', created: '2026-06-05', docs: 3 },
  ] as Application[];

  const loans: Loan[] = [
    { id: 'LN-2026-0188', customer: 'CUS-1001', product: 'PRD-01', principal: 1000000, rate: 18, term: 9, method: 'Flat', disbursed: '2026-02-10', channel: 'M-Pesa', status: 'Active', paid: 5 },
    { id: 'LN-2026-0177', customer: 'CUS-1002', product: 'PRD-01', principal: 800000, rate: 18, term: 6, method: 'Flat', disbursed: '2026-01-15', channel: 'Tigo Pesa', status: 'Overdue', paid: 3 },
    { id: 'LN-2026-0165', customer: 'CUS-1006', product: 'PRD-05', principal: 5000000, rate: 15, term: 18, method: 'Reducing balance', disbursed: '2025-12-01', channel: 'Bank transfer — CRDB', status: 'Active', paid: 6 },
    { id: 'LN-2025-0142', customer: 'CUS-1004', product: 'PRD-02', principal: 2000000, rate: 16, term: 12, method: 'Reducing balance', disbursed: '2025-09-20', channel: 'Bank transfer — NMB', status: 'Closed', paid: 12 },
  ] as Loan[];

  const users: User[] = [
    { id: 'U-001', name: 'Amina Hassan', email: 'amina.officer@maltamfi.co.tz', role: 'officer', branch: 'Kariakoo', status: 'Active', last: '2026-06-23 08:14' },
    { id: 'U-002', name: 'Daudi Mtwara', email: 'daudi.officer@maltamfi.co.tz', role: 'officer', branch: 'Mwanza', status: 'Active', last: '2026-06-23 07:50' },
    { id: 'U-003', name: 'Grace Lyimo', email: 'grace.manager@maltamfi.co.tz', role: 'manager', branch: 'Kariakoo', status: 'Active', last: '2026-06-22 17:32' },
    { id: 'U-004', name: 'Said Juma', email: 'said.ops@maltamfi.co.tz', role: 'operations', branch: 'HQ', status: 'Active', last: '2026-06-23 08:01' },
    { id: 'U-005', name: 'Halima Ngowi', email: 'halima.cashier@maltamfi.co.tz', role: 'cashier', branch: 'Kariakoo', status: 'Active', last: '2026-06-23 08:22' },
    { id: 'U-006', name: 'Joseph Kimaro', email: 'joseph.admin@maltamfi.co.tz', role: 'admin', branch: 'HQ', status: 'Active', last: '2026-06-23 06:40' },
    { id: 'U-007', name: 'Neema Shirima', email: 'neema.officer@maltamfi.co.tz', role: 'officer', branch: 'Arusha', status: 'Inactive', last: '2026-04-11 12:09' },
  ] as User[];

  const audit: Partial<AuditEntry>[] = [
    { entityId: 'LAP-2026-0042', actor: 'Amina Hassan', role: 'Loan Officer', action: 'Application submitted', detail: 'Submitted for review', time: '2026-06-18 09:12' },
    { entityId: 'LAP-2026-0042', actor: 'System', role: 'System', action: 'Affordability check', detail: 'DSR computed at 38% — within policy', time: '2026-06-18 09:12' },
    { entityId: 'LAP-2026-0042', actor: 'Grace Lyimo', role: 'Branch Manager', action: 'Moved to Under Review', detail: 'Assigned to assessment', time: '2026-06-18 14:30' },
  ];

  // ---- generated bulk records (deterministic) ----
  const fnames = ['Asha', 'Emmanuel', 'Mwajuma', 'Hamisi', 'Esther', 'Salma', 'Mariamu', 'Godfrey', 'Anna', 'Lucy', 'Joyce', 'Editha', 'Bakari', 'Rajabu', 'Tatu', 'Yusuf', 'Doto', 'Kulwa', 'Furaha', 'Pendo', 'Nuru', 'Issa', 'Saidi', 'Maria', 'Paulo', 'Veronica', 'Aziza', 'Mussa'];
  const lnames = ['Massawe', 'Mrema', 'Kweka', 'Maganga', 'Chenga', 'Mhando', 'Komba', 'Sanga', 'Ndossi', 'Mwasota', 'Lema', 'Mallya', 'Swai', 'Temba', 'Kabula', 'Mwita', 'Bushiri', 'Nyoni', 'Mlowe', 'Kibona'];
  const occs = [['Vegetable vendor', 'Green Market Stall'], ['Tailor', 'Stitch & Style'], ['Carpenter', 'Mango Furniture'], ['Fishmonger', 'Lake Fresh Fish'], ['Charcoal trader', 'Moto Supplies'], ['Pharmacy owner', 'Afya Chemist'], ['Poultry farmer', 'Kuku Bora Farm'], ['Welder', 'Imara Metal Works'], ['Grocer', 'Duka la Mwanga'], ['Tour guide', 'Safari Routes']];
  const regions = [['Dar es Salaam', 'Temeke'], ['Mbeya', 'Iyunga'], ['Tanga', 'Chumbageni'], ['Morogoro', 'Kihonda'], ['Arusha', 'Sekei'], ['Mwanza', 'Pamba'], ['Dodoma', 'Makole'], ['Kilimanjaro', 'Moshi Urban']];
  const photos = ['#caa472', '#7d9b8a', '#b48a9c', '#9a8b6f', '#a89070', '#8c9bad', '#9f8aa6', '#7f9a76', '#b09a6a'];

  let sd = 987654321;
  const rnd = () => {
    sd = (sd * 1103515245 + 12345) & 0x7fffffff;
    return sd / 0x7fffffff;
  };
  const pick = <T>(a: T[]): T => a[Math.floor(rnd() * a.length)];
  const pad = (n: number, l: number) => String(n).padStart(l, '0');

  for (let i = 7; i <= 26; i++) {
    const fn = pick(fnames), ln = pick(lnames), oc = pick(occs), rg = pick(regions);
    const kyc = (rnd() < 0.68 ? 'Verified' : rnd() < 0.6 ? 'Pending' : 'Rejected') as Customer['kyc'];
    const status = (rnd() < 0.85 ? 'Active' : 'Inactive') as Customer['status'];
    const yr = pick(['2024', '2025', '2026']);
    customers.push({ id: 'CUS-10' + pad(i, 2), name: fn + ' ' + ln, gender: rnd() > 0.5 ? 'Female' : 'Male', dob: 1980 + Math.floor(rnd() * 20) + '-' + pad(1 + Math.floor(rnd() * 12), 2) + '-' + pad(1 + Math.floor(rnd() * 27), 2), phone: '+255 7' + (10 + Math.floor(rnd() * 80)) + ' ' + pad(Math.floor(rnd() * 1000), 3) + ' ' + pad(Math.floor(rnd() * 1000), 3), email: fn.toLowerCase() + '.' + ln.toLowerCase() + '@gmail.com', nida: 1980 + Math.floor(rnd() * 20) + pad(1 + Math.floor(rnd() * 12), 2) + pad(1 + Math.floor(rnd() * 27), 2) + '-' + (10000 + Math.floor(rnd() * 90000)) + '-' + pad(Math.floor(rnd() * 100000), 5) + '-' + pad(Math.floor(rnd() * 100), 2), region: rg[0], ward: rg[1], address: rg[1] + ', ' + rg[0], occupation: oc[0], business: oc[1], monthlyIncome: 600000 + Math.floor(rnd() * 30) * 100000, nokName: pick(fnames) + ' ' + ln, nokRelation: pick(['Spouse', 'Sibling', 'Parent', 'Cousin']), nokPhone: '+255 7' + (10 + Math.floor(rnd() * 80)) + ' ' + pad(Math.floor(rnd() * 1000), 3) + ' ' + pad(Math.floor(rnd() * 1000), 3), status, kyc, joined: yr + '-' + pad(1 + Math.floor(rnd() * 12), 2) + '-' + pad(1 + Math.floor(rnd() * 27), 2), photo: pick(photos) } as Customer);
  }

  const appStatuses: ApplicationStatus[] = ['Draft', 'Submitted', 'Submitted', 'Under Review', 'Under Review', 'Approved', 'Rejected', 'Cancelled'];
  const officers = ['Amina Hassan', 'Daudi Mtwara', 'Neema Shirima'];
  for (let i = 43; i <= 58; i++) {
    const c = pick(customers), p = pick(products);
    const amount = p.min + Math.floor(rnd() * ((p.max - p.min) / 100000 + 1)) * 100000;
    applications.push({ id: 'LAP-2026-00' + i, customer: c.id, product: p.id, amount, term: p.minTerm + Math.floor(rnd() * (p.maxTerm - p.minTerm + 1)), purpose: pick(['Working capital top-up', 'Stock purchase', 'Equipment financing', 'Business expansion', 'Seasonal inputs & supplies']), status: pick(appStatuses), officer: pick(officers), created: '2026-' + pad(5 + Math.floor(rnd() * 2), 2) + '-' + pad(1 + Math.floor(rnd() * 27), 2), docs: 1 + Math.floor(rnd() * 4) } as Application);
  }

  const loanStatuses: LoanStatus[] = ['Active', 'Active', 'Active', 'Overdue', 'Closed'];
  const channels = ['M-Pesa', 'Tigo Pesa', 'Airtel Money', 'Bank transfer — CRDB', 'Bank transfer — NMB'];
  for (let i = 200; i <= 216; i++) {
    const c = pick(customers), p = pick(products);
    const term = p.minTerm + Math.floor(rnd() * (p.maxTerm - p.minTerm + 1));
    const st = pick(loanStatuses);
    loans.push({ id: 'LN-2026-0' + i, customer: c.id, product: p.id, principal: p.min + Math.floor(rnd() * ((p.max - p.min) / 100000 + 1)) * 100000, rate: p.rate, term, method: p.method, disbursed: pick(['2025', '2026']) + '-' + pad(1 + Math.floor(rnd() * 12), 2) + '-' + pad(1 + Math.floor(rnd() * 27), 2), channel: pick(channels), status: st, paid: st === 'Closed' ? term : Math.floor(rnd() * Math.max(1, term - 1)) } as Loan);
  }

  const uroles: RoleId[] = ['officer', 'officer', 'manager', 'cashier', 'operations'];
  const ubranches = ['Kariakoo', 'Mwanza', 'Arusha', 'Dodoma', 'Moshi', 'HQ'];
  for (let i = 8; i <= 15; i++) {
    const fn = pick(fnames), ln = pick(lnames), role = pick(uroles);
    users.push({ id: 'U-0' + pad(i, 2), name: fn + ' ' + ln, email: fn.toLowerCase() + '.' + role + '@maltamfi.co.tz', role, branch: pick(ubranches), status: rnd() < 0.85 ? 'Active' : 'Inactive', last: '2026-06-' + pad(10 + Math.floor(rnd() * 13), 2) + ' ' + pad(7 + Math.floor(rnd() * 10), 2) + ':' + pad(Math.floor(rnd() * 60), 2) } as User);
  }

  return { customers, products, applications, loans, users, audit };
}
