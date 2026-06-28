import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateCustomerDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsNotEmpty()
  nida: string;

  @IsOptional() @IsString() gender?: string;
  @IsOptional() @IsString() dob?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() region?: string;
  @IsOptional() @IsString() ward?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() occupation?: string;
  @IsOptional() @IsString() business?: string;
  @IsOptional() @IsNumber() @Min(0) monthlyIncome?: number;
  @IsOptional() @IsString() nokName?: string;
  @IsOptional() @IsString() nokRelation?: string;
  @IsOptional() @IsString() nokPhone?: string;
}
