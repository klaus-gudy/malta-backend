import { PartialType } from '@nestjs/mapped-types';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import type { ActiveInactive, RoleId } from '../../common/enums';
import { ROLE_IDS } from '../../common/enums';

export const FREQUENCIES = ['Weekly', 'Bi-weekly', 'Monthly'];
export const METHODS = ['Flat', 'Reducing balance'];

// Every parameter needed to configure a product is required. Messages tell the
// caller exactly what to provide. Decorators are ordered so the type/required
// check (closest to the property) reports first, then the range check —
// validation runs with stopAtFirstError so only one message shows per field.
export class CreateProductDto {
  @IsString({ message: 'Product name must be text.' })
  @IsNotEmpty({ message: 'Product name is required.' })
  name: string;

  @IsString({ message: 'Category must be text.' })
  @IsNotEmpty({ message: 'Category is required.' })
  category: string;

  @Min(1, { message: 'Minimum amount must be greater than 0.' })
  @IsNumber({}, { message: 'Minimum amount is required and must be a number.' })
  min: number;

  @Min(1, { message: 'Maximum amount must be greater than 0.' })
  @IsNumber({}, { message: 'Maximum amount is required and must be a number.' })
  max: number;

  @Min(1, { message: 'Minimum term must be at least 1 period.' })
  @IsInt({
    message: 'Minimum term is required and must be a whole number of periods.',
  })
  minTerm: number;

  @Min(1, { message: 'Maximum term must be at least 1 period.' })
  @IsInt({
    message: 'Maximum term is required and must be a whole number of periods.',
  })
  maxTerm: number;

  @IsIn(FREQUENCIES, {
    message: `Repayment frequency is required and must be one of: ${FREQUENCIES.join(', ')}.`,
  })
  freq: string;

  @Min(0, { message: 'Interest rate cannot be negative.' })
  @IsNumber({}, { message: 'Interest rate is required and must be a number.' })
  rate: number;

  @IsIn(METHODS, {
    message: `Interest method is required and must be one of: ${METHODS.join(', ')}.`,
  })
  method: string;

  @Min(0, { message: 'Processing fee cannot be negative.' })
  @IsNumber({}, { message: 'Processing fee is required and must be a number.' })
  fee: number;

  @Min(0, { message: 'Penalty rate cannot be negative.' })
  @IsNumber({}, { message: 'Penalty rate is required and must be a number.' })
  penalty: number;

  @Min(0, { message: 'Grace period cannot be negative.' })
  @IsInt({
    message: 'Grace period is required and must be a whole number of days.',
  })
  grace: number;

  @IsOptional()
  @IsIn(['Active', 'Inactive'], {
    message: 'Status must be either Active or Inactive.',
  })
  status?: ActiveInactive;

  @IsOptional()
  @IsString()
  desc?: string;

  // Acting role — stamps the audit timeline (who created / updated). Not a
  // product field; excluded when persisting.
  @IsOptional()
  @IsIn(ROLE_IDS)
  role?: RoleId;
}

export class UpdateProductDto extends PartialType(CreateProductDto) {}
