import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import type { ApplicationStatus, RoleId } from '../../common/enums';
import { ROLE_IDS } from '../../common/enums';

export class CreateApplicationDto {
  @IsString() @IsNotEmpty() customer: string;
  @IsString() @IsNotEmpty() product: string;
  @IsNumber() @Min(0) amount: number;
  @IsNumber() @Min(0) term: number;

  @IsOptional() @IsString() purpose?: string;
  @IsOptional() @IsNumber() docs?: number;

  // Applications are created as Draft or Submitted.
  @IsIn(['Draft', 'Submitted'])
  status: Extract<ApplicationStatus, 'Draft' | 'Submitted'>;

  // Acting role — stamps officer name. Defaults to "officer".
  @IsOptional() @IsIn(ROLE_IDS) role?: RoleId;
}

const ALL_STATUSES: ApplicationStatus[] = [
  'Draft',
  'Submitted',
  'Under Review',
  'Approved',
  'Rejected',
  'Cancelled',
  'Disbursed',
];

export class PatchApplicationDto {
  @IsOptional() @IsIn(ALL_STATUSES) status?: ApplicationStatus;
  @IsOptional() @IsString() purpose?: string;
  @IsOptional() @IsNumber() amount?: number;
  @IsOptional() @IsNumber() term?: number;
  @IsOptional() @IsString() officer?: string;
  @IsOptional() @IsNumber() docs?: number;
}
