import { PartialType } from '@nestjs/mapped-types';
import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import type { ActiveInactive } from '../../common/enums';

export class CreateProductDto {
  @IsString() @IsNotEmpty() name: string;
  @IsString() @IsNotEmpty() category: string;

  @IsNumber() @Min(0) min: number;
  @IsNumber() @Min(0) max: number;
  @IsNumber() @Min(0) minTerm: number;
  @IsNumber() @Min(0) maxTerm: number;

  @IsString() freq: string;
  @IsNumber() @Min(0) rate: number;
  @IsString() method: string;
  @IsNumber() @Min(0) fee: number;
  @IsNumber() @Min(0) penalty: number;
  @IsNumber() @Min(0) grace: number;

  @IsOptional() @IsIn(['Active', 'Inactive']) status?: ActiveInactive;
  @IsOptional() @IsString() desc?: string;
}

export class UpdateProductDto extends PartialType(CreateProductDto) {}
