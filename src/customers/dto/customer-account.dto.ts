import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateAccountDto {
  @IsString() @IsNotEmpty() channel: string;
  @IsString() @IsNotEmpty() accountNumber: string;
  @IsOptional() @IsString() accountName?: string;
  @IsOptional() @IsBoolean() isPrimary?: boolean;
}

export class UpdateAccountDto {
  @IsOptional() @IsString() channel?: string;
  @IsOptional() @IsString() accountNumber?: string;
  @IsOptional() @IsString() accountName?: string;
  @IsOptional() @IsBoolean() isPrimary?: boolean;
}
