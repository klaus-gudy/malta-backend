import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import type { RoleId } from '../../common/enums';
import { ROLE_IDS } from '../../common/enums';

export class DisburseDto {
  @IsString() @IsNotEmpty() applicationId: string;
  @IsString() @IsNotEmpty() channel: string;
  // Acting role — stamps the timeline (who disbursed).
  @IsOptional() @IsIn(ROLE_IDS) role?: RoleId;
}

export class TakePaymentDto {
  // Amount received; allocated to outstanding penalties then oldest installments.
  @IsNumber() @Min(1) amount: number;
  @IsOptional() @IsString() method?: string;
  @IsOptional() @IsString() reference?: string;
  // Acting role — stamps the timeline (who received the payment).
  @IsOptional() @IsIn(ROLE_IDS) role?: RoleId;
}
