import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Malta LMS API — see /api/health and the module routes (e.g. /api/customers).';
  }
}
