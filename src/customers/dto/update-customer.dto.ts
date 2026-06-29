import { PartialType } from '@nestjs/mapped-types';
import { IsIn, IsOptional } from 'class-validator';
import { CreateCustomerDto } from './create-customer.dto';
import type { CustomerStatus } from '../../common/enums';

// All profile fields are editable and optional on update. KYC status has its own
// dedicated endpoint, so it is intentionally not part of this DTO.
export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {
  @IsOptional()
  @IsIn(['Active', 'Inactive'], {
    message: 'Status must be either Active or Inactive.',
  })
  status?: CustomerStatus;
}
