import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class DisburseDto {
  @IsString() @IsNotEmpty() applicationId: string;
  @IsString() @IsNotEmpty() channel: string;
}

export class TakePaymentDto {
  // Amount received; allocated to outstanding penalties then oldest installments.
  @IsNumber() @Min(1) amount: number;
  @IsOptional() @IsString() method?: string;
  @IsOptional() @IsString() reference?: string;
}
