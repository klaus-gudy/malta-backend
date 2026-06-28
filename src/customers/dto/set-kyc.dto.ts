import { IsIn } from 'class-validator';
import type { KycStatus } from '../../common/enums';

export class SetKycDto {
  @IsIn(['Verified', 'Pending', 'Rejected'])
  status: KycStatus;
}

export class SetDocStatusDto {
  // Documents can only be manually set to Verified or Rejected.
  @IsIn(['Verified', 'Rejected'])
  status: Extract<KycStatus, 'Verified' | 'Rejected'>;
}
