import { PartialType } from '@nestjs/mapped-types';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import type { ActiveInactive, RoleId } from '../../common/enums';
import { ROLE_IDS } from '../../common/enums';

export class CreateUserDto {
  @IsString() @IsNotEmpty() name: string;
  @IsEmail() email: string;
  @IsIn(ROLE_IDS) role: RoleId;
  @IsString() @IsNotEmpty() branch: string;
  @IsOptional() @IsIn(['Active', 'Inactive']) status?: ActiveInactive;
}

export class UpdateUserDto extends PartialType(CreateUserDto) {}
